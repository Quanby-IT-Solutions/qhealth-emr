import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	InternalServerErrorException,
	Logger,
	NotFoundException,
} from "@nestjs/common"
import type { UserSession } from "@thallesp/nestjs-better-auth"
import { and, count, desc, eq, gte, ilike, lt, ne, or, sql } from "drizzle-orm"

import {
	anesthesiaRecords,
	operationRecords,
	patients,
	rvsCodes,
	staffProfiles,
	surgicalCases,
	surgicalChecklists,
	surgicalRvsAssignments,
	users,
} from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import type { V1Inputs, V1Outputs } from "@/config/contract-types"
import { NotificationService } from "@/modules/v1/notifications/notification.service"

import { detectProcedureLabels, resolveProcedureLabel } from "./surgical-procedure-utils"

type ListCasesInput = V1Inputs["surgical"]["listCases"]
type CreateCaseInput = V1Inputs["surgical"]["createCase"]
type UpdateCaseInput = V1Inputs["surgical"]["updateCase"]
type SaveOperationRecordInput = V1Inputs["surgical"]["saveOperationRecord"]
type SignOperationRecordInput = V1Inputs["surgical"]["signOperationRecord"]
type SaveAnesthesiaRecordInput = V1Inputs["surgical"]["saveAnesthesiaRecord"]
type SignAnesthesiaRecordInput = V1Inputs["surgical"]["signAnesthesiaRecord"]
type SavePreOpChecklistInput = V1Inputs["surgical"]["savePreOpChecklist"]
type SearchRvsCodesInput = V1Inputs["surgical"]["searchRvsCodes"]
type SuggestRvsCodeInput = V1Inputs["surgical"]["suggestRvsCode"]
type UpdateRvsStatusInput = V1Inputs["surgical"]["updateRvsStatus"]
type RemoveRvsAssignmentInput = V1Inputs["surgical"]["removeRvsAssignment"]
type OrSlotsInput = V1Inputs["surgical"]["listOrSlots"]
type OrConflictCheckInput = V1Inputs["surgical"]["checkOrConflicts"]
type SurgicalCaseOutput = V1Outputs["surgical"]["getCase"]
type SurgicalCaseListOutput = V1Outputs["surgical"]["listCases"]
type OrConflictCheckOutput = V1Outputs["surgical"]["checkOrConflicts"]
type SurgicalStatus = SurgicalCaseOutput["status"]
type AsaClass = SurgicalCaseOutput["asaClass"]
type BillingPermissionContext = {
	staffProfileId: string | null
	canEditBilling: boolean
	canSignBilling: boolean
}

@Injectable()
export class SurgicalService {
	private readonly logger = new Logger(SurgicalService.name)

	constructor(private readonly notificationService: NotificationService) {}

	// ========================================================================
	// Private helpers
	// ========================================================================

	private mapCaseRow(row: {
		id: string
		facilityId: string
		encounterId: string | null
		patientId: string
		patientName: string | null
		procedureName: string
		orSuite: string | null
		surgeonName: string | null
		surgeonStaffId: string | null
		anesthesiologistName: string | null
		anesthesiologistStaffId: string | null
		scheduledDatetime: Date | null
		actualStartDatetime: Date | null
		actualEndDatetime: Date | null
		status: SurgicalStatus
		surgicalType: string
		asaClass: AsaClass
		estimatedDurationMinutes: number | null
		requiredEquipment: string[] | null
		notes: string | null
		createdAt: Date
		updatedAt: Date
	}): SurgicalCaseOutput {
		return {
			...row,
			patientName: row.patientName ?? null,
			surgeonName: row.surgeonName ?? null,
			anesthesiologistName: row.anesthesiologistName ?? null,
			scheduledDatetime: row.scheduledDatetime?.toISOString() ?? null,
			actualStartDatetime: row.actualStartDatetime?.toISOString() ?? null,
			actualEndDatetime: row.actualEndDatetime?.toISOString() ?? null,
			estimatedDurationMinutes: row.estimatedDurationMinutes ?? null,
			requiredEquipment: row.requiredEquipment ?? null,
		}
	}

	private async fetchCaseFull(id: string) {
		const surgeonSq = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("surgeon_sq")

		const anesthSq = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("anesth_sq")

		const [row] = await db
			.select({
				id: surgicalCases.id,
				facilityId: surgicalCases.facilityId,
				encounterId: surgicalCases.encounterId,
				patientId: surgicalCases.patientId,
				patientName: sql<
					string | null
				>`CASE WHEN ${patients.id} IS NOT NULL THEN (${patients.firstName} || ' ' || ${patients.lastName}) ELSE NULL END`,
				procedureName: surgicalCases.procedureName,
				orSuite: surgicalCases.orSuite,
				surgeonName: surgeonSq.name,
				surgeonStaffId: surgicalCases.surgeonStaffId,
				anesthesiologistName: anesthSq.name,
				anesthesiologistStaffId: surgicalCases.anesthesiologistStaffId,
				scheduledDatetime: surgicalCases.scheduledDatetime,
				actualStartDatetime: surgicalCases.actualStartDatetime,
				actualEndDatetime: surgicalCases.actualEndDatetime,
				status: surgicalCases.status,
				surgicalType: surgicalCases.surgicalType,
				asaClass: surgicalCases.asaClass,
				estimatedDurationMinutes: surgicalCases.estimatedDurationMinutes,
				requiredEquipment: surgicalCases.requiredEquipment,
				notes: surgicalCases.notes,
				createdAt: surgicalCases.createdAt,
				updatedAt: surgicalCases.updatedAt,
			})
			.from(surgicalCases)
			.leftJoin(patients, eq(surgicalCases.patientId, patients.id))
			.leftJoin(surgeonSq, eq(surgicalCases.surgeonStaffId, surgeonSq.id))
			.leftJoin(anesthSq, eq(surgicalCases.anesthesiologistStaffId, anesthSq.id))
			.where(eq(surgicalCases.id, id))

		return row ?? null
	}

	private requireSavedRecord<T>(record: T | null, message: string): T {
		if (!record) {
			throw new InternalServerErrorException(message)
		}

		return record
	}

	private async resolveStaffProfile(userId: string) {
		const [staff] = await db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.where(eq(staffProfiles.userId, userId))
			.limit(1)
		return staff ?? null
	}

	private async getOperationRecordRow(caseId: string) {
		const [record] = await db
			.select()
			.from(operationRecords)
			.where(eq(operationRecords.surgicalCaseId, caseId))
			.limit(1)

		return record ?? null
	}

	private async getStaffName(staffId: string | null | undefined) {
		if (!staffId) return null

		const [staff] = await db
			.select({ name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.where(eq(staffProfiles.id, staffId))
			.limit(1)

		return staff?.name ?? null
	}

	private async requireSignedOperationRecord(caseId: string) {
		const record = await this.getOperationRecordRow(caseId)
		if (!record || record.status !== "signed") {
			throw new BadRequestException(
				"Operation record must be signed before RVS codes can be assigned or updated."
			)
		}

		return record
	}

	private getOperationRecordSignOffGaps(
		record: Awaited<ReturnType<typeof this.getOperationRecordRow>>
	) {
		if (!record) {
			return ["operation record"]
		}

		const missingFields: string[] = []

		if (!record.preOpDiagnosis?.trim()) missingFields.push("pre-operative diagnosis")
		if (!record.procedurePerformed?.trim()) missingFields.push("procedure performed")
		if (!record.procedureDescription?.trim()) missingFields.push("procedure narrative")
		if (!record.operativeTechnique?.trim()) missingFields.push("operative technique")
		if (!record.incisionTime) missingFields.push("incision time")
		if (!record.closureTime) missingFields.push("closure time")
		if (!record.scrubNurseStaffId) missingFields.push("scrub nurse")
		if (!record.circulatingNurseStaffId) missingFields.push("circulating nurse")
		if (!record.anesthesiologistStaffId) missingFields.push("anesthesiologist")

		if (record.incisionTime && record.closureTime && record.closureTime < record.incisionTime) {
			missingFields.push("closure time after incision time")
		}

		return missingFields
	}

	private getAnesthesiaRecordSignOffGaps(
		record: Awaited<ReturnType<typeof this.getAnesthesiaRecord>>
	) {
		if (!record) {
			return ["anesthesia record"]
		}

		const missingFields: string[] = []
		const hasMedicationCharting =
			(record.agents?.length ?? 0) > 0 ||
			(record.inductionAgents?.length ?? 0) > 0 ||
			(record.maintenanceAgents?.length ?? 0) > 0 ||
			(record.muscleRelaxants?.length ?? 0) > 0 ||
			(record.intraopMedications?.length ?? 0) > 0
		const hasVitalCharting = (record.intraopVitals?.length ?? 0) > 0

		if (!record.asaClass) missingFields.push("ASA classification")
		if (!record.anesthesiaType) missingFields.push("anesthesia type")
		if (!record.anesthesiologistStaffId) missingFields.push("anesthesiologist")
		if (!hasMedicationCharting) missingFields.push("anesthetic agents or medications")
		if (!hasVitalCharting) missingFields.push("intraoperative vitals")

		return missingFields
	}

	private mapRvsRow(
		row: {
			id: string
			surgicalCaseId: string | null
			rvsCodeId: string | null
			procedureLabel: string | null
			code: string | null
			description: string | null
			assignmentType: "primary" | "adjunct"
			status: "suggested" | "validated" | "finalized"
			suggestedByName: string | null
			validatedByName: string | null
			finalizedByName: string | null
			suggestedAt: Date | null
			validatedAt: Date | null
			finalizedAt: Date | null
			modifier: string | null
			units: number
			createdAt: Date
		},
		caseId: string
	) {
		return {
			id: row.id,
			surgicalCaseId: row.surgicalCaseId ?? caseId,
			rvsCodeId: row.rvsCodeId ?? "",
			procedureLabel: row.procedureLabel ?? null,
			code: row.code ?? "",
			description: row.description ?? "",
			assignmentType: row.assignmentType,
			status: row.status,
			suggestedByName: row.suggestedByName ?? null,
			validatedByName: row.validatedByName ?? null,
			finalizedByName: row.finalizedByName ?? null,
			suggestedAt: row.suggestedAt?.toISOString() ?? null,
			validatedAt: row.validatedAt?.toISOString() ?? null,
			finalizedAt: row.finalizedAt?.toISOString() ?? null,
			modifier: row.modifier ?? null,
			units: row.units,
			createdAt: row.createdAt,
		}
	}

	private buildRvsSelect() {
		const suggestedBySq = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("suggested_by_sq")

		const validatedBySq = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("validated_by_sq")

		const finalizedBySq = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("finalized_by_sq")

		return { suggestedBySq, validatedBySq, finalizedBySq }
	}

	// ========================================================================
	// Surgical Cases
	// ========================================================================

	async listCases(input: ListCasesInput): Promise<SurgicalCaseListOutput> {
		this.logger.debug(`Listing surgical cases with filters: ${JSON.stringify(input)}`)

		const page = Number(input.page) || 1
		const limit = Number(input.limit) || 25
		const offset = (page - 1) * limit

		const where = and(
			input.facilityId ? eq(surgicalCases.facilityId, input.facilityId) : undefined,
			input.encounterId ? eq(surgicalCases.encounterId, input.encounterId) : undefined,
			input.status ? eq(surgicalCases.status, input.status) : undefined,
			input.date
				? sql`date(${surgicalCases.scheduledDatetime} AT TIME ZONE 'UTC') = ${input.date}::date`
				: undefined
		)

		const surgeonSq = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("surgeon_sq")

		const anesthSq = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("anesth_sq")

		const [rows, totalRows] = await Promise.all([
			db
				.select({
					id: surgicalCases.id,
					facilityId: surgicalCases.facilityId,
					encounterId: surgicalCases.encounterId,
					patientId: surgicalCases.patientId,
					patientName: sql<
						string | null
					>`CASE WHEN ${patients.id} IS NOT NULL THEN (${patients.firstName} || ' ' || ${patients.lastName}) ELSE NULL END`,
					procedureName: surgicalCases.procedureName,
					orSuite: surgicalCases.orSuite,
					surgeonName: surgeonSq.name,
					surgeonStaffId: surgicalCases.surgeonStaffId,
					anesthesiologistName: anesthSq.name,
					anesthesiologistStaffId: surgicalCases.anesthesiologistStaffId,
					scheduledDatetime: surgicalCases.scheduledDatetime,
					actualStartDatetime: surgicalCases.actualStartDatetime,
					actualEndDatetime: surgicalCases.actualEndDatetime,
					status: surgicalCases.status,
					surgicalType: surgicalCases.surgicalType,
					asaClass: surgicalCases.asaClass,
					estimatedDurationMinutes: surgicalCases.estimatedDurationMinutes,
					requiredEquipment: surgicalCases.requiredEquipment,
					notes: surgicalCases.notes,
					createdAt: surgicalCases.createdAt,
					updatedAt: surgicalCases.updatedAt,
				})
				.from(surgicalCases)
				.leftJoin(patients, eq(surgicalCases.patientId, patients.id))
				.leftJoin(surgeonSq, eq(surgicalCases.surgeonStaffId, surgeonSq.id))
				.leftJoin(anesthSq, eq(surgicalCases.anesthesiologistStaffId, anesthSq.id))
				.where(where)
				.orderBy(desc(surgicalCases.scheduledDatetime))
				.limit(limit)
				.offset(offset),
			db.select({ count: count() }).from(surgicalCases).where(where),
		])

		const total = totalRows[0]?.count ?? 0
		return {
			data: rows.map(r => this.mapCaseRow(r)),
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	async getCase(id: string): Promise<SurgicalCaseOutput> {
		this.logger.debug(`Getting surgical case: ${id}`)

		const row = await this.fetchCaseFull(id)
		if (!row) throw new NotFoundException(`Surgical case ${id} not found`)
		return this.mapCaseRow(row)
	}

	private async detectConflicts(
		facilityId: string,
		orSuite: string | undefined,
		scheduledDatetime: Date,
		estimatedDurationMinutes: number,
		surgeonStaffId: string | undefined,
		requiredEquipment: string[] | undefined,
		excludeCaseId: string | undefined
	): Promise<OrConflictCheckOutput["conflicts"]> {
		const endDatetime = new Date(scheduledDatetime.getTime() + estimatedDurationMinutes * 60 * 1000)

		const baseWhere = and(
			eq(surgicalCases.facilityId, facilityId),
			ne(surgicalCases.status, "cancelled"),
			ne(surgicalCases.status, "postponed"),
			excludeCaseId ? ne(surgicalCases.id, excludeCaseId) : undefined,
			// Overlap: existing.start < new.end AND existing.end > new.start
			// existing.end = scheduled_datetime + estimated_duration_minutes (or scheduled_datetime + 2h default)
			lt(surgicalCases.scheduledDatetime, endDatetime),
			gte(
				sql`${surgicalCases.scheduledDatetime} + (COALESCE(${surgicalCases.estimatedDurationMinutes}, 120) * interval '1 minute')`,
				scheduledDatetime
			)
		)

		const overlappingCases = await db
			.select({
				id: surgicalCases.id,
				procedureName: surgicalCases.procedureName,
				orSuite: surgicalCases.orSuite,
				scheduledDatetime: surgicalCases.scheduledDatetime,
				estimatedDurationMinutes: surgicalCases.estimatedDurationMinutes,
				surgeonStaffId: surgicalCases.surgeonStaffId,
				requiredEquipment: surgicalCases.requiredEquipment,
			})
			.from(surgicalCases)
			.where(baseWhere)

		const conflicts: OrConflictCheckOutput["conflicts"] = []

		for (const existing of overlappingCases) {
			if (!existing.scheduledDatetime) continue

			const existingEnd = new Date(
				existing.scheduledDatetime.getTime() +
					(existing.estimatedDurationMinutes ?? 120) * 60 * 1000
			)

			// Room conflict
			if (orSuite && existing.orSuite === orSuite) {
				conflicts.push({
					type: "room",
					conflictingCaseId: existing.id,
					conflictingProcedure: existing.procedureName,
					conflictingOrSuite: existing.orSuite,
					conflictingStart: existing.scheduledDatetime.toISOString(),
					conflictingEnd: existingEnd.toISOString(),
				})
			}

			// Surgeon conflict
			if (
				surgeonStaffId &&
				existing.surgeonStaffId === surgeonStaffId &&
				!conflicts.some(c => c.conflictingCaseId === existing.id && c.type === "surgeon")
			) {
				conflicts.push({
					type: "surgeon",
					conflictingCaseId: existing.id,
					conflictingProcedure: existing.procedureName,
					conflictingOrSuite: existing.orSuite,
					conflictingStart: existing.scheduledDatetime.toISOString(),
					conflictingEnd: existingEnd.toISOString(),
				})
			}

			// Equipment conflicts
			if (requiredEquipment && existing.requiredEquipment) {
				for (const item of requiredEquipment) {
					if (existing.requiredEquipment.includes(item)) {
						conflicts.push({
							type: "equipment",
							conflictingCaseId: existing.id,
							conflictingProcedure: existing.procedureName,
							conflictingOrSuite: existing.orSuite,
							conflictingStart: existing.scheduledDatetime.toISOString(),
							conflictingEnd: existingEnd.toISOString(),
							equipmentItem: item,
						})
					}
				}
			}
		}

		return conflicts
	}

	async createCase(input: CreateCaseInput, session: UserSession) {
		this.logger.log(`Creating surgical case for patient ${input.patientId}`)
		void session

		// Conflict detection when OR suite and scheduled datetime are provided
		if (input.orSuite && input.scheduledDatetime) {
			const scheduledDt = new Date(input.scheduledDatetime)
			const duration = input.estimatedDurationMinutes ?? 120
			const conflicts = await this.detectConflicts(
				input.facilityId,
				input.orSuite,
				scheduledDt,
				duration,
				input.surgeonStaffId,
				input.requiredEquipment,
				undefined
			)

			if (conflicts.length > 0) {
				const roomConflict = conflicts.find(c => c.type === "room")
				const surgeonConflict = conflicts.find(c => c.type === "surgeon")
				const equipConflict = conflicts.find(c => c.type === "equipment")

				let message = "Scheduling conflict detected:"
				if (roomConflict) message += ` OR room ${input.orSuite} is already booked.`
				if (surgeonConflict) message += ` Surgeon has an overlapping case.`
				if (equipConflict) message += ` Required equipment (${equipConflict.equipmentItem}) is already allocated.`

				throw new ConflictException(message)
			}
		}

		const [inserted] = await db
			.insert(surgicalCases)
			.values({
				facilityId: input.facilityId,
				encounterId: input.encounterId ?? null,
				patientId: input.patientId,
				procedureName: input.procedureName,
				orSuite: input.orSuite ?? null,
				surgicalType: input.surgicalType as "elective" | "emergency" | "urgent",
				surgeonStaffId: input.surgeonStaffId ?? null,
				anesthesiologistStaffId: input.anesthesiologistStaffId ?? null,
				scheduledDatetime: input.scheduledDatetime ? new Date(input.scheduledDatetime) : null,
				status: "scheduled",
				asaClass:
					(input.asaClass as "ASA I" | "ASA II" | "ASA III" | "ASA IV" | "ASA V" | "ASA VI") ??
					null,
				estimatedDurationMinutes: input.estimatedDurationMinutes ?? 120,
				requiredEquipment: input.requiredEquipment ?? null,
				notes: input.notes ?? null,
			})
			.returning({ id: surgicalCases.id })

		const newCase = await this.getCase(inserted!.id)

		// Notify surgeon and anesthesiologist
		await this.notifyOrTeam(newCase)

		return newCase
	}

	private async notifyOrTeam(surgicalCase: SurgicalCaseOutput) {
		const recipients: Array<{ staffId: string; role: string }> = []

		if (surgicalCase.surgeonStaffId) {
			recipients.push({ staffId: surgicalCase.surgeonStaffId, role: "Surgeon" })
		}
		if (surgicalCase.anesthesiologistStaffId) {
			recipients.push({ staffId: surgicalCase.anesthesiologistStaffId, role: "Anesthesiologist" })
		}

		const scheduledAt = surgicalCase.scheduledDatetime
			? new Date(surgicalCase.scheduledDatetime).toLocaleString("en-PH", {
					month: "short",
					day: "numeric",
					year: "numeric",
					hour: "2-digit",
					minute: "2-digit",
				})
			: "TBD"

		for (const recipient of recipients) {
			try {
				await this.notificationService.send({
					facilityId: surgicalCase.facilityId,
					recipientStaffId: recipient.staffId,
					topic: "surgical",
					title: `OR Case Booked: ${surgicalCase.procedureName}`,
					body: `You have been assigned as ${recipient.role} for ${surgicalCase.procedureName} on ${scheduledAt}${surgicalCase.orSuite ? ` in ${surgicalCase.orSuite}` : ""}.`,
					data: { surgicalCaseId: surgicalCase.id },
				})
			} catch (err) {
				this.logger.warn(`Failed to notify ${recipient.role} ${recipient.staffId}: ${err}`)
			}
		}
	}

	async updateCase(input: UpdateCaseInput) {
		this.logger.log(`Updating surgical case: ${input.id}`)

		await db
			.update(surgicalCases)
			.set({
				...(input.status !== undefined && { status: input.status }),
				...(input.orSuite !== undefined && { orSuite: input.orSuite }),
				...(input.notes !== undefined && { notes: input.notes }),
				...(input.asaClass !== undefined && { asaClass: input.asaClass }),
				...(input.actualStartDatetime !== undefined && {
					actualStartDatetime: new Date(input.actualStartDatetime),
				}),
				...(input.actualEndDatetime !== undefined && {
					actualEndDatetime: new Date(input.actualEndDatetime),
				}),
				updatedAt: new Date(),
			})
			.where(eq(surgicalCases.id, input.id))

		return this.getCase(input.id)
	}

	// ========================================================================
	// Operation Record
	// ========================================================================

	async getOperationRecord(caseId: string) {
		this.logger.debug(`Getting operation record for case: ${caseId}`)

		const record = await this.getOperationRecordRow(caseId)

		if (!record) return null

		const signedByName = await this.getStaffName(record.signedByStaffId)

		return {
			id: record.id,
			surgicalCaseId: caseId,
			preOpDiagnosis: record.preOpDiagnosis ?? "",
			postOpDiagnosis: record.postOpDiagnosis ?? null,
			procedurePerformed: record.procedurePerformed ?? record.procedureDescription ?? "",
			procedureDescription: record.procedureDescription ?? record.procedurePerformed ?? null,
			operativeTechnique: record.operativeTechnique ?? null,
			findings: record.findings ?? null,
			specimens: record.specimens ?? null,
			estimatedBloodLoss: record.estimatedBloodLoss ?? null,
			fluidIn: record.fluidIn ?? null,
			fluidOut: record.fluidOut ?? null,
			incisionDatetime: record.incisionTime?.toISOString() ?? null,
			closureDatetime: record.closureTime?.toISOString() ?? null,
			surgeonStaffId: record.surgeonStaffId,
			firstAssistantStaffId: record.firstAssistantStaffId ?? null,
			secondAssistantStaffId: record.secondAssistantStaffId ?? null,
			scrubNurseStaffId: record.scrubNurseStaffId ?? null,
			circulatingNurseStaffId: record.circulatingNurseStaffId ?? null,
			anesthesiologistStaffId: record.anesthesiologistStaffId ?? null,
			instrumentCountCorrect: record.instrumentCountCorrect,
			swabCountCorrect: record.swabCountCorrect,
			complications: record.complications ?? null,
			status: record.status,
			signedAt: record.signedAt?.toISOString() ?? null,
			signedByStaffId: record.signedByStaffId ?? null,
			signedByName,
			createdAt: record.createdAt,
			updatedAt: record.updatedAt,
		}
	}

	async saveOperationRecord(input: SaveOperationRecordInput, session: UserSession) {
		this.logger.log(`Saving operation record for case: ${input.caseId}`)
		void session

		const [surgCase] = await db
			.select({
				facilityId: surgicalCases.facilityId,
				encounterId: surgicalCases.encounterId,
				anesthesiologistStaffId: surgicalCases.anesthesiologistStaffId,
			})
			.from(surgicalCases)
			.where(eq(surgicalCases.id, input.caseId))
			.limit(1)

		if (!surgCase) throw new NotFoundException(`Surgical case ${input.caseId} not found`)

		const existing = await this.getOperationRecordRow(input.caseId)
		if (existing?.status === "signed") {
			throw new BadRequestException("Signed operation records cannot be edited.")
		}

		const values = {
			facilityId: surgCase.facilityId,
			surgicalCaseId: input.caseId,
			encounterId: surgCase.encounterId ?? null,
			preOpDiagnosis: input.preOpDiagnosis,
			postOpDiagnosis: input.postOpDiagnosis ?? null,
			procedurePerformed: input.procedurePerformed,
			procedureDescription:
				input.procedureDescription !== undefined
					? input.procedureDescription || null
					: (existing?.procedureDescription ?? null),
			operativeTechnique: input.operativeTechnique ?? null,
			findings: input.findings ?? null,
			specimens: input.specimens ?? null,
			estimatedBloodLoss: input.estimatedBloodLoss ?? null,
			fluidIn: input.fluidIn ?? null,
			fluidOut: input.fluidOut ?? null,
			incisionTime: input.incisionDatetime ? new Date(input.incisionDatetime) : null,
			closureTime: input.closureDatetime ? new Date(input.closureDatetime) : null,
			surgeonStaffId: input.surgeonStaffId,
			firstAssistantStaffId: input.firstAssistantStaffId ?? null,
			secondAssistantStaffId: input.secondAssistantStaffId ?? null,
			scrubNurseStaffId: input.scrubNurseStaffId ?? null,
			circulatingNurseStaffId: input.circulatingNurseStaffId ?? null,
			anesthesiologistStaffId:
				input.anesthesiologistStaffId !== undefined
					? input.anesthesiologistStaffId
					: (existing?.anesthesiologistStaffId ?? surgCase.anesthesiologistStaffId ?? null),
			instrumentCountCorrect: input.instrumentCountCorrect,
			swabCountCorrect: input.swabCountCorrect,
			complications: input.complications ?? null,
			updatedAt: new Date(),
		}

		if (existing) {
			await db.update(operationRecords).set(values).where(eq(operationRecords.id, existing.id))
		} else {
			await db.insert(operationRecords).values(values)
		}

		const record = await this.getOperationRecord(input.caseId)

		return this.requireSavedRecord(
			record,
			`Operation record for case ${input.caseId} was not found after save`
		)
	}

	async signOperationRecord(input: SignOperationRecordInput, signedByStaffId: string | null) {
		this.logger.log(`Signing operation record for case: ${input.caseId}`)

		if (!signedByStaffId) {
			throw new ForbiddenException("Active staff profile not found.")
		}

		const record = await this.getOperationRecordRow(input.caseId)
		if (!record) {
			throw new NotFoundException(`Operation record for case ${input.caseId} not found`)
		}
		if (record.status === "signed") {
			throw new BadRequestException("Operation record is already signed.")
		}
		const signOffGaps = this.getOperationRecordSignOffGaps(record)
		if (signOffGaps.length > 0) {
			throw new BadRequestException(
				`Operation record is incomplete. Add: ${signOffGaps.join(", ")}.`
			)
		}
		if (record.surgeonStaffId !== signedByStaffId) {
			throw new ForbiddenException("Only the assigned surgeon can sign this operation record.")
		}

		const signedAt = new Date()
		await db
			.update(operationRecords)
			.set({
				status: "signed",
				signedAt,
				signedByStaffId,
				updatedAt: signedAt,
			})
			.where(eq(operationRecords.id, record.id))

		const savedRecord = await this.getOperationRecord(input.caseId)
		return this.requireSavedRecord(
			savedRecord,
			`Operation record for case ${input.caseId} was not found after signing`
		)
	}

	// ========================================================================
	// Anesthesia Record
	// ========================================================================

	async getAnesthesiaRecord(caseId: string) {
		this.logger.debug(`Getting anesthesia record for case: ${caseId}`)

		const [record] = await db
			.select()
			.from(anesthesiaRecords)
			.where(eq(anesthesiaRecords.surgicalCaseId, caseId))
			.limit(1)

		if (!record) return null

		return {
			id: record.id,
			surgicalCaseId: caseId,
			asaClass: (record.asaClass ?? null) as
				| "ASA I"
				| "ASA II"
				| "ASA III"
				| "ASA IV"
				| "ASA V"
				| "ASA VI"
				| null,
			anesthesiaType: (record.anesthesiaType ?? null) as
				| "general"
				| "regional"
				| "local"
				| "sedation"
				| null,
			airwayType: (record.airwayType ?? null) as
				| "oral_ett"
				| "nasal_ett"
				| "lma"
				| "awake_fiber_optic"
				| "tracheostomy"
				| null,
			airwayManagement: record.airwayManagement ?? null,
			intubationAttempts: record.intubationAttempts ?? null,
			intubationGrade: (record.intubationGrade ?? null) as
				| "CL1"
				| "CL2"
				| "CL3"
				| "CL4"
				| "not_applicable"
				| null,
			difficultAirway: record.difficultAirway ?? false,
			agents: (record.agents ?? null) as Array<{
				name: string
				dose: string
				route: string
				time: string
			}> | null,
			inductionAgents: (record.inductionAgents ?? null) as Array<{
				agent: string
				dose: string
				time?: string
			}> | null,
			maintenanceAgents: (record.maintenanceAgents ?? null) as Array<{
				agent: string
				dose: string
				time?: string
			}> | null,
			muscleRelaxants: (record.muscleRelaxants ?? null) as Array<{
				agent: string
				dose: string
				time?: string
			}> | null,
			intraopMedications: (record.intraopMedications ?? null) as Array<{
				name: string
				dose: string
				route: string
				time: string
				indication?: string
			}> | null,
			intraopVitals: (record.intraopVitals ?? null) as Array<{
				time: string
				bp: string
				hr: number
				spo2: number
				etco2?: number
				temp?: number
			}> | null,
			fluidBalance: (record.fluidBalance ?? null) as {
				ivFluids?: Array<{ type: string; volumeMl: number }>
				estimatedBloodLoss?: number
				urineOutput?: number
				otherOutput?: number
			} | null,
			reversalAgent: record.reversalAgent ?? null,
			totalAnesthesiaMinutes: record.totalAnesthesiaMinutes ?? null,
			emergenceSmooth: record.emergenceSmooth ?? null,
			complications: record.complications ?? null,
			postAnesthesiaCareNotes: record.postAnesthesiaCareNotes ?? null,
			anesthesiologistStaffId: record.anesthesiologistStaffId ?? null,
			status: (record.status ?? "draft") as "draft" | "signed",
			signedAt: record.signedAt?.toISOString() ?? null,
			signedByStaffId: record.signedByStaffId ?? null,
			createdAt: record.createdAt,
			updatedAt: record.updatedAt,
		}
	}

	async saveAnesthesiaRecord(input: SaveAnesthesiaRecordInput, session: UserSession) {
		this.logger.log(`Saving anesthesia record for case: ${input.caseId}`)

		const [surgCase] = await db
			.select({ facilityId: surgicalCases.facilityId, encounterId: surgicalCases.encounterId })
			.from(surgicalCases)
			.where(eq(surgicalCases.id, input.caseId))
			.limit(1)

		if (!surgCase) throw new NotFoundException(`Surgical case ${input.caseId} not found`)

		const [existingCheck] = await db
			.select({ id: anesthesiaRecords.id, status: anesthesiaRecords.status })
			.from(anesthesiaRecords)
			.where(eq(anesthesiaRecords.surgicalCaseId, input.caseId))
			.limit(1)

		if (existingCheck?.status === "signed") {
			throw new BadRequestException("Signed anesthesia records cannot be edited.")
		}

		const sessionStaff = await this.resolveStaffProfile(session.user.id)

		const values = {
			facilityId: surgCase.facilityId,
			surgicalCaseId: input.caseId,
			encounterId: surgCase.encounterId ?? null,
			asaClass: (input.asaClass ?? null) as
				| "ASA I"
				| "ASA II"
				| "ASA III"
				| "ASA IV"
				| "ASA V"
				| "ASA VI"
				| null,
			anesthesiaType: (input.anesthesiaType ?? null) as
				| "general"
				| "regional"
				| "local"
				| "sedation"
				| null,
			airwayType: (input.airwayType ?? null) as
				| "oral_ett"
				| "nasal_ett"
				| "lma"
				| "awake_fiber_optic"
				| "tracheostomy"
				| null,
			airwayManagement: input.airwayManagement ?? null,
			intubationAttempts: input.intubationAttempts ?? null,
			intubationGrade: (input.intubationGrade ?? null) as
				| "CL1"
				| "CL2"
				| "CL3"
				| "CL4"
				| "not_applicable"
				| null,
			difficultAirway: input.difficultAirway ?? false,
			agents:
				input.agents ??
				input.intraopMedications?.map(medication => ({
					name: medication.name,
					dose: medication.dose,
					route: medication.route,
					time: medication.time,
				})) ??
				null,
			inductionAgents: input.inductionAgents ?? null,
			maintenanceAgents: input.maintenanceAgents ?? null,
			muscleRelaxants: input.muscleRelaxants ?? null,
			intraopMedications: input.intraopMedications ?? null,
			intraopVitals: input.intraopVitals ?? null,
			fluidBalance: input.fluidBalance ?? null,
			reversalAgent: input.reversalAgent ?? null,
			totalAnesthesiaMinutes: input.totalAnesthesiaMinutes ?? null,
			emergenceSmooth: input.emergenceSmooth ?? null,
			complications: input.complications ?? null,
			postAnesthesiaCareNotes: input.postAnesthesiaCareNotes ?? null,
			anesthesiologistStaffId: input.anesthesiologistStaffId ?? sessionStaff?.id ?? null,
			updatedAt: new Date(),
		}

		if (existingCheck) {
			await db
				.update(anesthesiaRecords)
				.set(values)
				.where(eq(anesthesiaRecords.id, existingCheck.id))
		} else {
			await db.insert(anesthesiaRecords).values(values)
		}

		const record = await this.getAnesthesiaRecord(input.caseId)

		return this.requireSavedRecord(
			record,
			`Anesthesia record for case ${input.caseId} was not found after save`
		)
	}

	async signAnesthesiaRecord(input: SignAnesthesiaRecordInput, staffProfileId: string | null) {
		this.logger.log(`Signing anesthesia record for case: ${input.caseId}`)

		if (!staffProfileId) {
			throw new ForbiddenException("Active staff profile not found.")
		}

		const [existing] = await db
			.select()
			.from(anesthesiaRecords)
			.where(eq(anesthesiaRecords.surgicalCaseId, input.caseId))
			.limit(1)

		if (!existing) {
			throw new NotFoundException(`Anesthesia record for case ${input.caseId} not found`)
		}
		if (existing.status === "signed") {
			throw new ConflictException("Anesthesia record is already signed")
		}
		const record = await this.getAnesthesiaRecord(input.caseId)
		const signOffGaps = this.getAnesthesiaRecordSignOffGaps(record)
		if (signOffGaps.length > 0) {
			throw new BadRequestException(
				`Anesthesia record is incomplete. Add: ${signOffGaps.join(", ")}.`
			)
		}

		const signedAt = new Date()
		await db
			.update(anesthesiaRecords)
			.set({
				status: "signed",
				signedAt,
				signedByStaffId: staffProfileId,
				updatedAt: signedAt,
			})
			.where(eq(anesthesiaRecords.id, existing.id))

		const savedRecord = await this.getAnesthesiaRecord(input.caseId)
		return this.requireSavedRecord(
			savedRecord,
			`Anesthesia record for case ${input.caseId} was not found after signing`
		)
	}

	// ========================================================================
	// Pre-Op Checklist
	// ========================================================================

	async getPreOpChecklist(caseId: string) {
		this.logger.debug(`Getting pre-op checklist for case: ${caseId}`)

		const [record] = await db
			.select()
			.from(surgicalChecklists)
			.where(eq(surgicalChecklists.surgicalCaseId, caseId))
			.limit(1)

		if (!record) return null

		let completedByName: string | null = null
		if (record.completedByStaffId) {
			const [staff] = await db
				.select({ name: users.name })
				.from(staffProfiles)
				.innerJoin(users, eq(staffProfiles.userId, users.id))
				.where(eq(staffProfiles.id, record.completedByStaffId))
				.limit(1)
			completedByName = staff?.name ?? null
		}

		return {
			id: record.id,
			surgicalCaseId: caseId,
			items: (record.items ?? []) as Array<{
				key: string
				label: string
				checked: boolean
				checkedAt: string | null
				checkedByName: string | null
			}>,
			allClear: record.allClear,
			completedAt: record.completedAt?.toISOString() ?? null,
			completedByName,
			createdAt: record.createdAt,
			updatedAt: record.updatedAt,
		}
	}

	async savePreOpChecklist(input: SavePreOpChecklistInput, session: UserSession) {
		this.logger.log(`Saving pre-op checklist for case: ${input.caseId}`)

		const [surgCase] = await db
			.select({ facilityId: surgicalCases.facilityId, encounterId: surgicalCases.encounterId })
			.from(surgicalCases)
			.where(eq(surgicalCases.id, input.caseId))
			.limit(1)

		if (!surgCase) throw new NotFoundException(`Surgical case ${input.caseId} not found`)

		const sessionStaff = await this.resolveStaffProfile(session.user.id)
		const now = new Date()

		const items = input.items.map(item => ({
			key: item.key,
			label: item.key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
			checked: item.checked,
			checkedAt: item.checked ? now.toISOString() : null,
			checkedByName: item.checked ? (sessionStaff?.name ?? null) : null,
		}))

		const allClear = items.every(item => item.checked)

		const values = {
			facilityId: surgCase.facilityId,
			surgicalCaseId: input.caseId,
			encounterId: surgCase.encounterId ?? null,
			items,
			allClear,
			completedAt: allClear ? now : null,
			completedByStaffId: allClear ? (sessionStaff?.id ?? null) : null,
			updatedAt: now,
		}

		const [existing] = await db
			.select({ id: surgicalChecklists.id })
			.from(surgicalChecklists)
			.where(eq(surgicalChecklists.surgicalCaseId, input.caseId))
			.limit(1)

		if (existing) {
			await db.update(surgicalChecklists).set(values).where(eq(surgicalChecklists.id, existing.id))
		} else {
			await db.insert(surgicalChecklists).values(values)
		}

		const record = await this.getPreOpChecklist(input.caseId)

		return this.requireSavedRecord(
			record,
			`Pre-op checklist for case ${input.caseId} was not found after save`
		)
	}

	// ========================================================================
	// RVS Codes
	// ========================================================================

	async searchRvsCodes(input: SearchRvsCodesInput) {
		this.logger.debug(`Searching RVS codes: ${input.search}`)

		const limit = Number(input.limit ?? 20)
		const search = `%${input.search}%`

		const where = and(
			eq(rvsCodes.isActive, true),
			or(ilike(rvsCodes.rvsCode, search), ilike(rvsCodes.procedureName, search))
		)

		const [rows, totalRows] = await Promise.all([
			db
				.select({
					id: rvsCodes.id,
					code: rvsCodes.rvsCode,
					description: rvsCodes.procedureName,
					baseValue: rvsCodes.rvsValue,
					category: rvsCodes.category,
				})
				.from(rvsCodes)
				.where(where)
				.limit(limit),
			db.select({ count: count() }).from(rvsCodes).where(where),
		])

		const total = totalRows[0]?.count ?? 0
		return {
			data: rows.map(r => ({
				id: r.id,
				code: r.code,
				description: r.description,
				baseValue: r.baseValue ? Number(r.baseValue) : 0,
				category: r.category ?? "",
			})),
			total,
			page: 1,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	// ========================================================================
	// RVS Assignments
	// ========================================================================

	private async queryRvsAssignments(caseId: string) {
		const { suggestedBySq, validatedBySq, finalizedBySq } = this.buildRvsSelect()

		return db
			.select({
				id: surgicalRvsAssignments.id,
				surgicalCaseId: surgicalRvsAssignments.surgicalCaseId,
				rvsCodeId: surgicalRvsAssignments.rvsCodeId,
				procedureLabel: surgicalRvsAssignments.procedureLabel,
				code: surgicalRvsAssignments.rvsCode,
				description: surgicalRvsAssignments.rvsDescription,
				assignmentType: surgicalRvsAssignments.assignmentType,
				status: surgicalRvsAssignments.status,
				suggestedByName: suggestedBySq.name,
				validatedByName: validatedBySq.name,
				finalizedByName: finalizedBySq.name,
				suggestedAt: surgicalRvsAssignments.suggestedAt,
				validatedAt: surgicalRvsAssignments.validatedAt,
				finalizedAt: surgicalRvsAssignments.finalizedAt,
				modifier: surgicalRvsAssignments.modifier,
				units: surgicalRvsAssignments.units,
				createdAt: surgicalRvsAssignments.createdAt,
			})
			.from(surgicalRvsAssignments)
			.leftJoin(suggestedBySq, eq(surgicalRvsAssignments.suggestedByStaffId, suggestedBySq.id))
			.leftJoin(validatedBySq, eq(surgicalRvsAssignments.validatedByStaffId, validatedBySq.id))
			.leftJoin(finalizedBySq, eq(surgicalRvsAssignments.finalizedByStaffId, finalizedBySq.id))
			.where(eq(surgicalRvsAssignments.surgicalCaseId, caseId))
			.orderBy(desc(surgicalRvsAssignments.createdAt))
	}

	private async queryRvsAssignmentById(assignmentId: string, caseId: string) {
		const { suggestedBySq, validatedBySq, finalizedBySq } = this.buildRvsSelect()

		const [row] = await db
			.select({
				id: surgicalRvsAssignments.id,
				surgicalCaseId: surgicalRvsAssignments.surgicalCaseId,
				rvsCodeId: surgicalRvsAssignments.rvsCodeId,
				procedureLabel: surgicalRvsAssignments.procedureLabel,
				code: surgicalRvsAssignments.rvsCode,
				description: surgicalRvsAssignments.rvsDescription,
				assignmentType: surgicalRvsAssignments.assignmentType,
				status: surgicalRvsAssignments.status,
				suggestedByName: suggestedBySq.name,
				validatedByName: validatedBySq.name,
				finalizedByName: finalizedBySq.name,
				suggestedAt: surgicalRvsAssignments.suggestedAt,
				validatedAt: surgicalRvsAssignments.validatedAt,
				finalizedAt: surgicalRvsAssignments.finalizedAt,
				modifier: surgicalRvsAssignments.modifier,
				units: surgicalRvsAssignments.units,
				createdAt: surgicalRvsAssignments.createdAt,
			})
			.from(surgicalRvsAssignments)
			.leftJoin(suggestedBySq, eq(surgicalRvsAssignments.suggestedByStaffId, suggestedBySq.id))
			.leftJoin(validatedBySq, eq(surgicalRvsAssignments.validatedByStaffId, validatedBySq.id))
			.leftJoin(finalizedBySq, eq(surgicalRvsAssignments.finalizedByStaffId, finalizedBySq.id))
			.where(
				and(
					eq(surgicalRvsAssignments.id, assignmentId),
					eq(surgicalRvsAssignments.surgicalCaseId, caseId)
				)
			)
			.limit(1)

		if (!row) {
			throw new NotFoundException(
				`RVS assignment ${assignmentId} not found for surgical case ${caseId}`
			)
		}
		return this.mapRvsRow(row, caseId)
	}

	async listRvsAssignments(caseId: string) {
		this.logger.debug(`Listing RVS assignments for case: ${caseId}`)

		const rows = await this.queryRvsAssignments(caseId)
		return rows.map(r => this.mapRvsRow(r, caseId))
	}

	async suggestRvsCode(input: SuggestRvsCodeInput, suggestedByStaffId: string | null) {
		this.logger.log(`Suggesting RVS code for case: ${input.caseId}`)

		const operationRecord = await this.requireSignedOperationRecord(input.caseId)
		const availableProcedures = detectProcedureLabels(operationRecord.procedurePerformed)
		const resolvedProcedureLabel = resolveProcedureLabel(
			input.procedureLabel,
			operationRecord.procedurePerformed
		)
		if (!resolvedProcedureLabel) {
			const availableLabelText =
				availableProcedures.length > 0
					? ` Available procedures: ${availableProcedures.join(", ")}.`
					: ""
			throw new BadRequestException(`Procedure mapping target is invalid.${availableLabelText}`)
		}

		if (input.assignmentType === "primary") {
			const existingAssignments = await this.queryRvsAssignments(input.caseId)
			const hasPrimaryForProcedure = existingAssignments.some(
				assignment =>
					assignment.assignmentType === "primary" &&
					((assignment.procedureLabel &&
						resolveProcedureLabel(assignment.procedureLabel, operationRecord.procedurePerformed) ===
							resolvedProcedureLabel) ||
						(!assignment.procedureLabel && availableProcedures.length === 1))
			)
			if (hasPrimaryForProcedure) {
				throw new BadRequestException(
					`A primary RVS code is already mapped to ${resolvedProcedureLabel}. Remove it before assigning a new primary code.`
				)
			}
		}

		const [rvsCode] = await db
			.select({ rvsCode: rvsCodes.rvsCode, procedureName: rvsCodes.procedureName })
			.from(rvsCodes)
			.where(eq(rvsCodes.id, input.rvsCodeId))
			.limit(1)

		const [surgCase] = await db
			.select({ facilityId: surgicalCases.facilityId })
			.from(surgicalCases)
			.where(eq(surgicalCases.id, input.caseId))
			.limit(1)

		if (!surgCase) throw new NotFoundException(`Surgical case ${input.caseId} not found`)

		const [inserted] = await db
			.insert(surgicalRvsAssignments)
			.values({
				facilityId: surgCase.facilityId,
				surgicalCaseId: input.caseId,
				operationRecordId: operationRecord.id,
				rvsCodeId: input.rvsCodeId,
				procedureLabel: resolvedProcedureLabel,
				rvsCode: rvsCode?.rvsCode ?? null,
				rvsDescription: rvsCode?.procedureName ?? null,
				assignmentType: input.assignmentType ?? "primary",
				modifier: input.modifier ?? null,
				units: input.units ?? 1,
				suggestedByStaffId,
				status: "suggested",
				suggestedAt: new Date(),
			})
			.returning({ id: surgicalRvsAssignments.id })

		return this.queryRvsAssignmentById(inserted!.id, input.caseId)
	}

	async updateRvsStatus(input: UpdateRvsStatusInput, permissions: BillingPermissionContext) {
		this.logger.log(`Updating RVS status: ${input.assignmentId} -> ${input.status}`)

		await this.requireSignedOperationRecord(input.caseId)
		await this.queryRvsAssignmentById(input.assignmentId, input.caseId)

		if (
			input.status === "validated" &&
			!(permissions.canEditBilling || permissions.canSignBilling)
		) {
			throw new ForbiddenException(
				"Billing edit or billing sign permission is required to validate RVS codes."
			)
		}
		if (input.status === "finalized" && !permissions.canSignBilling) {
			throw new ForbiddenException("Billing sign permission is required to finalize RVS codes.")
		}

		const actorStaffId = permissions.staffProfileId

		await db
			.update(surgicalRvsAssignments)
			.set({
				status: input.status,
				...(input.status === "validated" || input.status === "finalized"
					? { validatedAt: new Date(), validatedByStaffId: actorStaffId }
					: {}),
				...(input.status === "finalized"
					? { finalizedAt: new Date(), finalizedByStaffId: actorStaffId }
					: {}),
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(surgicalRvsAssignments.id, input.assignmentId),
					eq(surgicalRvsAssignments.surgicalCaseId, input.caseId)
				)
			)

		return this.queryRvsAssignmentById(input.assignmentId, input.caseId)
	}

	async removeRvsAssignment(input: RemoveRvsAssignmentInput) {
		this.logger.log(`Removing RVS assignment: ${input.assignmentId}`)

		await this.requireSignedOperationRecord(input.caseId)
		await this.queryRvsAssignmentById(input.assignmentId, input.caseId)

		await db
			.delete(surgicalRvsAssignments)
			.where(
				and(
					eq(surgicalRvsAssignments.id, input.assignmentId),
					eq(surgicalRvsAssignments.surgicalCaseId, input.caseId)
				)
			)

		return { success: true }
	}

	// ========================================================================
	// OR Slots
	// ========================================================================

	async checkOrConflicts(input: OrConflictCheckInput): Promise<OrConflictCheckOutput> {
		this.logger.debug(`Checking OR conflicts for facility ${input.facilityId}`)

		const scheduledDt = new Date(input.scheduledDatetime)
		const conflicts = await this.detectConflicts(
			input.facilityId,
			input.orSuite,
			scheduledDt,
			input.estimatedDurationMinutes,
			input.surgeonStaffId,
			input.requiredEquipment,
			input.excludeCaseId
		)

		return { hasConflicts: conflicts.length > 0, conflicts }
	}

	async listOrSlots(input: OrSlotsInput) {
		this.logger.debug(`Listing OR slots for facility ${input.facilityId}, week: ${input.weekStart}`)

		const weekStart = new Date(input.weekStart)
		const weekEnd = new Date(weekStart)
		weekEnd.setDate(weekEnd.getDate() + 7)

		const surgeonSq = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("surgeon_sq")

		const rows = await db
			.select({
				id: surgicalCases.id,
				facilityId: surgicalCases.facilityId,
				orSuite: surgicalCases.orSuite,
				scheduledDatetime: surgicalCases.scheduledDatetime,
				actualEndDatetime: surgicalCases.actualEndDatetime,
				procedureName: surgicalCases.procedureName,
				surgeonName: surgeonSq.name,
			})
			.from(surgicalCases)
			.leftJoin(surgeonSq, eq(surgicalCases.surgeonStaffId, surgeonSq.id))
			.where(
				and(
					eq(surgicalCases.facilityId, input.facilityId),
					gte(surgicalCases.scheduledDatetime, weekStart),
					lt(surgicalCases.scheduledDatetime, weekEnd)
				)
			)
			.orderBy(surgicalCases.scheduledDatetime)

		return rows
			.filter(r => r.scheduledDatetime !== null && r.orSuite !== null)
			.map(r => {
				const start = r.scheduledDatetime!
				const end = r.actualEndDatetime ?? new Date(start.getTime() + 2 * 60 * 60 * 1000)
				return {
					id: r.id,
					facilityId: r.facilityId,
					orSuite: r.orSuite!,
					date: start.toISOString().slice(0, 10),
					startTime: start.toISOString().slice(11, 19),
					endTime: end.toISOString().slice(11, 19),
					surgicalCaseId: r.id,
					procedureName: r.procedureName ?? null,
					surgeonName: r.surgeonName ?? null,
				}
			})
	}
}
