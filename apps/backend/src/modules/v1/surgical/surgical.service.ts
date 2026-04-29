import { Injectable, InternalServerErrorException, Logger, NotFoundException } from "@nestjs/common"
import { and, count, desc, eq, gte, ilike, lt, or, sql } from "drizzle-orm"
import type { UserSession } from "@thallesp/nestjs-better-auth"

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

type ListCasesInput = V1Inputs["surgical"]["listCases"]
type CreateCaseInput = V1Inputs["surgical"]["createCase"]
type UpdateCaseInput = V1Inputs["surgical"]["updateCase"]
type SaveOperationRecordInput = V1Inputs["surgical"]["saveOperationRecord"]
type SaveAnesthesiaRecordInput = V1Inputs["surgical"]["saveAnesthesiaRecord"]
type SavePreOpChecklistInput = V1Inputs["surgical"]["savePreOpChecklist"]
type SearchRvsCodesInput = V1Inputs["surgical"]["searchRvsCodes"]
type SuggestRvsCodeInput = V1Inputs["surgical"]["suggestRvsCode"]
type UpdateRvsStatusInput = V1Inputs["surgical"]["updateRvsStatus"]
type RemoveRvsAssignmentInput = V1Inputs["surgical"]["removeRvsAssignment"]
type OrSlotsInput = V1Inputs["surgical"]["listOrSlots"]
type SurgicalCaseOutput = V1Outputs["surgical"]["getCase"]
type SurgicalCaseListOutput = V1Outputs["surgical"]["listCases"]
type SurgicalStatus = SurgicalCaseOutput["status"]
type AsaClass = SurgicalCaseOutput["asaClass"]

@Injectable()
export class SurgicalService {
	private readonly logger = new Logger(SurgicalService.name)

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
				patientName: sql<string | null>`CASE WHEN ${patients.id} IS NOT NULL THEN (${patients.firstName} || ' ' || ${patients.lastName}) ELSE NULL END`,
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

	private mapRvsRow(row: {
		id: string
		surgicalCaseId: string | null
		rvsCodeId: string | null
		code: string | null
		description: string | null
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
	}, caseId: string) {
		return {
			id: row.id,
			surgicalCaseId: row.surgicalCaseId ?? caseId,
			rvsCodeId: row.rvsCodeId ?? "",
			code: row.code ?? "",
			description: row.description ?? "",
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
					patientName: sql<string | null>`CASE WHEN ${patients.id} IS NOT NULL THEN (${patients.firstName} || ' ' || ${patients.lastName}) ELSE NULL END`,
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

	async createCase(input: CreateCaseInput, session: UserSession) {
		this.logger.log(`Creating surgical case for patient ${input.patientId}`)
		void session

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
				asaClass: (input.asaClass as "ASA I" | "ASA II" | "ASA III" | "ASA IV" | "ASA V" | "ASA VI") ?? null,
				notes: input.notes ?? null,
			})
			.returning({ id: surgicalCases.id })

		return this.getCase(inserted!.id)
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

		const [record] = await db
			.select()
			.from(operationRecords)
			.where(eq(operationRecords.surgicalCaseId, caseId))
			.limit(1)

		if (!record) return null

		return {
			id: record.id,
			surgicalCaseId: caseId,
			preOpDiagnosis: record.preOpDiagnosis ?? record.procedureDescription ?? "",
			postOpDiagnosis: record.postOpDiagnosis ?? null,
			procedurePerformed: record.procedurePerformed ?? record.procedureDescription ?? "",
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
			instrumentCountCorrect: record.instrumentCountCorrect,
			swabCountCorrect: record.swabCountCorrect,
			complications: record.complications ?? null,
			createdAt: record.createdAt,
			updatedAt: record.updatedAt,
		}
	}

	async saveOperationRecord(input: SaveOperationRecordInput, session: UserSession) {
		this.logger.log(`Saving operation record for case: ${input.caseId}`)
		void session

		const [surgCase] = await db
			.select({ facilityId: surgicalCases.facilityId, encounterId: surgicalCases.encounterId })
			.from(surgicalCases)
			.where(eq(surgicalCases.id, input.caseId))
			.limit(1)

		if (!surgCase) throw new NotFoundException(`Surgical case ${input.caseId} not found`)

		const values = {
			facilityId: surgCase.facilityId,
			surgicalCaseId: input.caseId,
			encounterId: surgCase.encounterId ?? null,
			preOpDiagnosis: input.preOpDiagnosis,
			postOpDiagnosis: input.postOpDiagnosis ?? null,
			procedurePerformed: input.procedurePerformed,
			procedureDescription: input.procedurePerformed,
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
			instrumentCountCorrect: input.instrumentCountCorrect,
			swabCountCorrect: input.swabCountCorrect,
			complications: input.complications ?? null,
			updatedAt: new Date(),
		}

		const [existing] = await db
			.select({ id: operationRecords.id })
			.from(operationRecords)
			.where(eq(operationRecords.surgicalCaseId, input.caseId))
			.limit(1)

		if (existing) {
			await db.update(operationRecords).set(values).where(eq(operationRecords.id, existing.id))
		} else {
			await db.insert(operationRecords).values(values)
		}

		const record = await this.getOperationRecord(input.caseId)

		return this.requireSavedRecord(record, `Operation record for case ${input.caseId} was not found after save`)
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
			asaClass: (record.asaClass ??
				"ASA I") as "ASA I" | "ASA II" | "ASA III" | "ASA IV" | "ASA V" | "ASA VI",
			airwayType: (record.airwayType ??
				"oral_ett") as "oral_ett" | "nasal_ett" | "lma" | "awake_fiber_optic" | "tracheostomy",
			intubationAttempts: record.intubationAttempts ?? 0,
			agents: (record.agents ??
				[]) as Array<{ name: string; dose: string; route: string; time: string }>,
			intraopVitals: (record.intraopVitals ?? []) as Array<{
				time: string
				bp: string
				hr: number
				spo2: number
				etco2?: number
			}>,
			reversalAgent: record.reversalAgent ?? null,
			totalAnesthesiaMinutes: record.totalAnesthesiaMinutes ?? null,
			emergenceSmooth: record.emergenceSmooth ?? false,
			complications: record.complications ?? null,
			postAnesthesiaCareNotes: record.postAnesthesiaCareNotes ?? null,
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

		const sessionStaff = await this.resolveStaffProfile(session.user.id)

		const values = {
			facilityId: surgCase.facilityId,
			surgicalCaseId: input.caseId,
			encounterId: surgCase.encounterId ?? null,
			asaClass: input.asaClass as "ASA I" | "ASA II" | "ASA III" | "ASA IV" | "ASA V" | "ASA VI",
			airwayType: input.airwayType as
				| "oral_ett"
				| "nasal_ett"
				| "lma"
				| "awake_fiber_optic"
				| "tracheostomy",
			intubationAttempts: input.intubationAttempts,
			agents: input.agents,
			intraopVitals: input.intraopVitals,
			reversalAgent: input.reversalAgent ?? null,
			totalAnesthesiaMinutes: input.totalAnesthesiaMinutes ?? null,
			emergenceSmooth: input.emergenceSmooth,
			complications: input.complications ?? null,
			postAnesthesiaCareNotes: input.postAnesthesiaCareNotes ?? null,
			anesthesiologistStaffId: sessionStaff?.id ?? null,
			updatedAt: new Date(),
		}

		const [existing] = await db
			.select({ id: anesthesiaRecords.id })
			.from(anesthesiaRecords)
			.where(eq(anesthesiaRecords.surgicalCaseId, input.caseId))
			.limit(1)

		if (existing) {
			await db.update(anesthesiaRecords).set(values).where(eq(anesthesiaRecords.id, existing.id))
		} else {
			await db.insert(anesthesiaRecords).values(values)
		}

		const record = await this.getAnesthesiaRecord(input.caseId)

		return this.requireSavedRecord(record, `Anesthesia record for case ${input.caseId} was not found after save`)
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
			label: item.key
				.replace(/_/g, " ")
				.replace(/\b\w/g, c => c.toUpperCase()),
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
			await db
				.update(surgicalChecklists)
				.set(values)
				.where(eq(surgicalChecklists.id, existing.id))
		} else {
			await db.insert(surgicalChecklists).values(values)
		}

		const record = await this.getPreOpChecklist(input.caseId)

		return this.requireSavedRecord(record, `Pre-op checklist for case ${input.caseId} was not found after save`)
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
				code: surgicalRvsAssignments.rvsCode,
				description: surgicalRvsAssignments.rvsDescription,
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
				code: surgicalRvsAssignments.rvsCode,
				description: surgicalRvsAssignments.rvsDescription,
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
			.where(eq(surgicalRvsAssignments.id, assignmentId))
			.limit(1)

		if (!row) throw new NotFoundException(`RVS assignment ${assignmentId} not found`)
		return this.mapRvsRow(row, caseId)
	}

	async listRvsAssignments(caseId: string) {
		this.logger.debug(`Listing RVS assignments for case: ${caseId}`)

		const rows = await this.queryRvsAssignments(caseId)
		return rows.map(r => this.mapRvsRow(r, caseId))
	}

	async suggestRvsCode(input: SuggestRvsCodeInput, session: UserSession) {
		this.logger.log(`Suggesting RVS code for case: ${input.caseId}`)

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

		const sessionStaff = await this.resolveStaffProfile(session.user.id)

		const [inserted] = await db
			.insert(surgicalRvsAssignments)
			.values({
				facilityId: surgCase.facilityId,
				surgicalCaseId: input.caseId,
				rvsCodeId: input.rvsCodeId,
				rvsCode: rvsCode?.rvsCode ?? null,
				rvsDescription: rvsCode?.procedureName ?? null,
				modifier: input.modifier ?? null,
				units: input.units ?? 1,
				suggestedByStaffId: sessionStaff?.id ?? null,
				status: "suggested",
				suggestedAt: new Date(),
			})
			.returning({ id: surgicalRvsAssignments.id })

		return this.queryRvsAssignmentById(inserted!.id, input.caseId)
	}

	async updateRvsStatus(input: UpdateRvsStatusInput, session: UserSession) {
		this.logger.log(`Updating RVS status: ${input.assignmentId} -> ${input.status}`)

		const sessionStaff = await this.resolveStaffProfile(session.user.id)

		await db
			.update(surgicalRvsAssignments)
			.set({
				status: input.status,
				...(input.status === "validated" || input.status === "finalized"
					? { validatedAt: new Date(), validatedByStaffId: sessionStaff?.id ?? null }
					: {}),
				...(input.status === "finalized"
					? { finalizedAt: new Date(), finalizedByStaffId: sessionStaff?.id ?? null }
					: {}),
				updatedAt: new Date(),
			})
			.where(eq(surgicalRvsAssignments.id, input.assignmentId))

		return this.queryRvsAssignmentById(input.assignmentId, input.caseId)
	}

	async removeRvsAssignment(input: RemoveRvsAssignmentInput) {
		this.logger.log(`Removing RVS assignment: ${input.assignmentId}`)

		await db
			.delete(surgicalRvsAssignments)
			.where(eq(surgicalRvsAssignments.id, input.assignmentId))

		return { success: true }
	}

	// ========================================================================
	// OR Slots
	// ========================================================================

	async listOrSlots(input: OrSlotsInput) {
		this.logger.debug(
			`Listing OR slots for facility ${input.facilityId}, week: ${input.weekStart}`
		)

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
