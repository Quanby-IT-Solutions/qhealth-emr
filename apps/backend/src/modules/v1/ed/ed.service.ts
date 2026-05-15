import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common"
import { and, asc, count, desc, eq, isNull, like } from "drizzle-orm"

import {
	beds,
	clinicalNotes,
	encounters,
	encounterStatusEvents,
	imagingOrders,
	inboundTriageRecords,
	ioEntries,
	labOrders,
	marEntries,
	medicationOrders,
	patients,
	preEncounters,
	staffProfiles,
	tarEntries,
	users,
	vitalSigns,
	wards,
} from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import type { V1Inputs } from "@/config/contract-types"
import { closeOpenSlaStep } from "@/utils/sla-events"
import { resolveStepTarget } from "@/utils/sla-step-target"

import { NotificationService } from "../notifications/notification.service"

type CreatePreEncounterInput = V1Inputs["ed"]["createPreEncounter"]
type UpdatePreEncounterInput = V1Inputs["ed"]["updatePreEncounter"]
type PreEncounterListInput = V1Inputs["ed"]["listPreEncounters"]
type MergePreviewInput = { preEncounterId: string; patientId: string }
type MergeInput = V1Inputs["ed"]["merge"]
type EdQueueInput = V1Inputs["ed"]["getQueue"]
type UpdateQueueStatusInput = V1Inputs["ed"]["updateQueueStatus"]
type EdDispositionInput = V1Inputs["ed"]["dispose"]
type CreateInboundTriageInput = V1Inputs["ed"]["createInboundTriage"]
type InboundTriageListInput = V1Inputs["ed"]["listInboundTriage"]
type InboundTriageIdInput = V1Inputs["ed"]["markInboundArrived"]
type DBTransaction = Parameters<Parameters<(typeof db)["transaction"]>[0]>[0]
type InboundArrivalRecord = typeof inboundTriageRecords.$inferSelect
type ResourceNeeds = {
	bed: boolean
	codeTeam: boolean
	equipment: string[]
}

@Injectable()
export class EdService {
	private readonly logger = new Logger(EdService.name)

	constructor(
		@Inject(NotificationService)
		private readonly notificationService: NotificationService
	) {}

	// ========================================================================
	// Pre-Encounter CRUD
	// ========================================================================

	async createPreEncounter(input: CreatePreEncounterInput) {
		// Generate trauma alias: TRAUMA-YYYY-NNNN
		// Use year-scoped count + retry loop to handle race conditions on unique alias
		const year = new Date().getFullYear()

		for (let attempt = 0; attempt < 3; attempt++) {
			const [countResult] = await db
				.select({ count: count() })
				.from(preEncounters)
				.where(
					and(
						eq(preEncounters.facilityId, input.facilityId),
						like(preEncounters.traumaAlias, `TRAUMA-${year}-%`)
					)
				)

			const seq = (countResult?.count ?? 0) + 1
			const traumaAlias = `TRAUMA-${year}-${String(seq).padStart(4, "0")}`

			try {
				const [created] = await db
					.insert(preEncounters)
					.values({
						facilityId: input.facilityId,
						traumaAlias,
						chiefComplaint: input.chiefComplaint ?? null,
						triageAcuityScale: input.triageAcuityScale,
						triageAcuityLevel: input.triageAcuityLevel,
						triageDatetime: new Date(),
						triageStaffId: input.triageStaffId,
						status: "active",
					})
					.returning()

				if (this.hasVitalSigns(input)) {
					await db.insert(vitalSigns).values({
						facilityId: input.facilityId,
						preEncounterId: created!.id,
						encounterId: null,
						temperature: input.temperature?.toString(),
						bpSystolic: input.bpSystolic,
						bpDiastolic: input.bpDiastolic,
						heartRate: input.heartRate,
						respiratoryRate: input.respiratoryRate,
						spo2: input.spo2?.toString(),
						painScore: input.painScore,
						weight: input.weight?.toString(),
						height: input.height?.toString(),
						newsScore: null,
						newsRiskLevel: null,
						recordedByStaffId: input.triageStaffId,
						recordedAt: new Date(),
					})
				}

				this.logger.log(`Created pre-encounter ${created!.id} with alias ${traumaAlias}`)
				this.notificationService.broadcast(
					"ed_queue",
					"ED Queue Updated",
					"New triage pre-encounter created"
				)

				return created!
			} catch (err: unknown) {
				// Retry on unique constraint violation (pg error 23505 = unique_violation)
				if ((err as { code?: string }).code === "23505" && attempt < 2) {
					continue
				}
				throw err
			}
		}

		throw new Error("Failed to generate a unique trauma alias after 3 attempts")
	}

	private hasVitalSigns(input: CreatePreEncounterInput) {
		return (
			input.temperature !== undefined ||
			input.bpSystolic !== undefined ||
			input.bpDiastolic !== undefined ||
			input.heartRate !== undefined ||
			input.respiratoryRate !== undefined ||
			input.spo2 !== undefined ||
			input.painScore !== undefined ||
			input.weight !== undefined ||
			input.height !== undefined
		)
	}

	async getPreEncounter(id: string) {
		const [row] = await db
			.select({
				id: preEncounters.id,
				facilityId: preEncounters.facilityId,
				traumaAlias: preEncounters.traumaAlias,
				chiefComplaint: preEncounters.chiefComplaint,
				triageAcuityScale: preEncounters.triageAcuityScale,
				triageAcuityLevel: preEncounters.triageAcuityLevel,
				triageDatetime: preEncounters.triageDatetime,
				triageStaffId: preEncounters.triageStaffId,
				status: preEncounters.status,
				mergedToEncounterId: preEncounters.mergedToEncounterId,
				mergedAt: preEncounters.mergedAt,
				createdAt: preEncounters.createdAt,
				updatedAt: preEncounters.updatedAt,
				triageStaffName: users.name,
			})
			.from(preEncounters)
			.leftJoin(staffProfiles, eq(preEncounters.triageStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.where(eq(preEncounters.id, id))

		if (!row) {
			throw new NotFoundException(`Pre-encounter ${id} not found`)
		}

		return {
			...row,
			triageStaffName: row.triageStaffName ?? null,
		}
	}

	async updatePreEncounter(input: UpdatePreEncounterInput) {
		const [existing] = await db.select().from(preEncounters).where(eq(preEncounters.id, input.id))

		if (!existing) {
			throw new NotFoundException(`Pre-encounter ${input.id} not found`)
		}

		if (existing.status !== "active") {
			throw new BadRequestException("Can only update active pre-encounters")
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() }
		if (input.chiefComplaint !== undefined) updateData.chiefComplaint = input.chiefComplaint
		if (input.triageAcuityScale !== undefined)
			updateData.triageAcuityScale = input.triageAcuityScale
		if (input.triageAcuityLevel !== undefined)
			updateData.triageAcuityLevel = input.triageAcuityLevel

		const [updated] = await db
			.update(preEncounters)
			.set(updateData)
			.where(eq(preEncounters.id, input.id))
			.returning()

		return updated!
	}

	async listPreEncounters(filter: PreEncounterListInput) {
		const page = Number(filter.page) || 1
		const limit = Number(filter.limit) || 50
		const offset = (page - 1) * limit

		const conditions = [eq(preEncounters.facilityId, filter.facilityId)]
		if (filter.status) {
			conditions.push(eq(preEncounters.status, filter.status))
		}
		const whereClause = and(...conditions)

		const staffSubquery = db
			.select({
				id: staffProfiles.id,
				name: users.name,
			})
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("triage_staff")

		const [data, totalResult] = await Promise.all([
			db
				.select({
					id: preEncounters.id,
					facilityId: preEncounters.facilityId,
					traumaAlias: preEncounters.traumaAlias,
					chiefComplaint: preEncounters.chiefComplaint,
					triageAcuityScale: preEncounters.triageAcuityScale,
					triageAcuityLevel: preEncounters.triageAcuityLevel,
					triageDatetime: preEncounters.triageDatetime,
					triageStaffId: preEncounters.triageStaffId,
					status: preEncounters.status,
					mergedToEncounterId: preEncounters.mergedToEncounterId,
					mergedAt: preEncounters.mergedAt,
					createdAt: preEncounters.createdAt,
					updatedAt: preEncounters.updatedAt,
					triageStaffName: staffSubquery.name,
				})
				.from(preEncounters)
				.leftJoin(staffSubquery, eq(preEncounters.triageStaffId, staffSubquery.id))
				.where(whereClause)
				.orderBy(desc(preEncounters.createdAt))
				.limit(limit)
				.offset(offset),
			db.select({ count: count() }).from(preEncounters).where(whereClause),
		])

		const total = totalResult[0]?.count ?? 0

		return {
			data: data.map(row => ({
				...row,
				triageStaffName: row.triageStaffName ?? null,
			})),
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	// ========================================================================
	// Chart Merge
	// ========================================================================

	async getMergePreview(input: MergePreviewInput) {
		const [preEnc] = await db
			.select({
				id: preEncounters.id,
				facilityId: preEncounters.facilityId,
				traumaAlias: preEncounters.traumaAlias,
				chiefComplaint: preEncounters.chiefComplaint,
				triageAcuityScale: preEncounters.triageAcuityScale,
				triageAcuityLevel: preEncounters.triageAcuityLevel,
				triageDatetime: preEncounters.triageDatetime,
				triageStaffId: preEncounters.triageStaffId,
				status: preEncounters.status,
				mergedToEncounterId: preEncounters.mergedToEncounterId,
				mergedAt: preEncounters.mergedAt,
				createdAt: preEncounters.createdAt,
				updatedAt: preEncounters.updatedAt,
			})
			.from(preEncounters)
			.where(eq(preEncounters.id, input.preEncounterId))

		if (!preEnc) {
			throw new NotFoundException(`Pre-encounter ${input.preEncounterId} not found`)
		}

		if (preEnc.status !== "active") {
			throw new BadRequestException("Pre-encounter is not active")
		}

		// Get triage staff name
		let triageStaffName: string | null = null
		if (preEnc.triageStaffId) {
			const [staff] = await db
				.select({ name: users.name })
				.from(staffProfiles)
				.innerJoin(users, eq(staffProfiles.userId, users.id))
				.where(eq(staffProfiles.id, preEnc.triageStaffId))
			triageStaffName = staff?.name ?? null
		}

		// Get patient info
		const [patient] = await db
			.select({
				firstName: patients.firstName,
				lastName: patients.lastName,
				mrn: patients.mrn,
			})
			.from(patients)
			.where(eq(patients.id, input.patientId))

		if (!patient) {
			throw new NotFoundException(`Patient ${input.patientId} not found`)
		}

		// Count clinical records attached to this pre-encounter
		const [vitals, notes, medOrders, mars, labs, imaging, tars, ios] = await Promise.all([
			db
				.select({ count: count() })
				.from(vitalSigns)
				.where(eq(vitalSigns.preEncounterId, input.preEncounterId))
				.then(r => r[0]?.count ?? 0),
			db
				.select({ count: count() })
				.from(clinicalNotes)
				.where(eq(clinicalNotes.preEncounterId, input.preEncounterId))
				.then(r => r[0]?.count ?? 0),
			db
				.select({ count: count() })
				.from(medicationOrders)
				.where(eq(medicationOrders.preEncounterId, input.preEncounterId))
				.then(r => r[0]?.count ?? 0),
			db
				.select({ count: count() })
				.from(marEntries)
				.where(eq(marEntries.preEncounterId, input.preEncounterId))
				.then(r => r[0]?.count ?? 0),
			db
				.select({ count: count() })
				.from(labOrders)
				.where(eq(labOrders.preEncounterId, input.preEncounterId))
				.then(r => r[0]?.count ?? 0),
			db
				.select({ count: count() })
				.from(imagingOrders)
				.where(eq(imagingOrders.preEncounterId, input.preEncounterId))
				.then(r => r[0]?.count ?? 0),
			db
				.select({ count: count() })
				.from(tarEntries)
				.where(eq(tarEntries.preEncounterId, input.preEncounterId))
				.then(r => r[0]?.count ?? 0),
			db
				.select({ count: count() })
				.from(ioEntries)
				.where(eq(ioEntries.preEncounterId, input.preEncounterId))
				.then(r => r[0]?.count ?? 0),
		])

		return {
			preEncounter: {
				...preEnc,
				triageStaffName,
			},
			patientName: `${patient.lastName}, ${patient.firstName}`,
			patientMrn: patient.mrn,
			clinicalRecordCounts: {
				vitalSigns: vitals,
				clinicalNotes: notes,
				medicationOrders: medOrders,
				marEntries: mars,
				labOrders: labs,
				imagingOrders: imaging,
				tarEntries: tars,
				ioEntries: ios,
			},
		}
	}

	async mergePreEncounter(input: MergeInput) {
		const [preEnc] = await db
			.select()
			.from(preEncounters)
			.where(eq(preEncounters.id, input.preEncounterId))

		if (!preEnc) {
			throw new NotFoundException(`Pre-encounter ${input.preEncounterId} not found`)
		}

		if (preEnc.status !== "active") {
			throw new BadRequestException("Pre-encounter is not active — already merged or cancelled")
		}

		// Verify patient exists
		const [patient] = await db
			.select({ id: patients.id })
			.from(patients)
			.where(eq(patients.id, input.patientId))

		if (!patient) {
			throw new NotFoundException(`Patient ${input.patientId} not found`)
		}

		// SLA-004: Resolve ED registration step target before the transaction (read-only)
		const edRegisteredSlaMins = await resolveStepTarget(preEnc.facilityId, "ed", "ed_registered")

		// Execute merge in transaction
		const result = await db.transaction(async tx => {
			// 1. Create a real encounter linked to the patient
			const [encounter] = await tx
				.insert(encounters)
				.values({
					facilityId: preEnc.facilityId,
					patientId: input.patientId,
					encounterType: input.encounterType ?? "emergency",
					chiefComplaint: preEnc.chiefComplaint,
					admittingStaffId: input.admittingStaffId,
					attendingStaffId: input.admittingStaffId,
					bedId: input.bedId ?? null,
					admissionDatetime: preEnc.triageDatetime ?? new Date(),
					mergedFromPreEncounterId: preEnc.id,
				})
				.returning()

			const encounterId = encounter!.id

			// 2. Re-point all clinical records from pre_encounter_id to encounter_id
			const vitalsUpdated = await tx
				.update(vitalSigns)
				.set({ encounterId, preEncounterId: null })
				.where(eq(vitalSigns.preEncounterId, preEnc.id))
				.returning({ id: vitalSigns.id })
				.then(rows => rows.length)

			const notesUpdated = await tx
				.update(clinicalNotes)
				.set({ encounterId, preEncounterId: null })
				.where(eq(clinicalNotes.preEncounterId, preEnc.id))
				.returning({ id: clinicalNotes.id })
				.then(rows => rows.length)

			const ordersUpdated = await tx
				.update(medicationOrders)
				.set({ encounterId, preEncounterId: null })
				.where(eq(medicationOrders.preEncounterId, preEnc.id))
				.returning({ id: medicationOrders.id })
				.then(rows => rows.length)

			const marsUpdated = await tx
				.update(marEntries)
				.set({ encounterId, preEncounterId: null })
				.where(eq(marEntries.preEncounterId, preEnc.id))
				.returning({ id: marEntries.id })
				.then(rows => rows.length)

			const labsUpdated = await tx
				.update(labOrders)
				.set({ encounterId, preEncounterId: null })
				.where(eq(labOrders.preEncounterId, preEnc.id))
				.returning({ id: labOrders.id })
				.then(rows => rows.length)

			const imagingUpdated = await tx
				.update(imagingOrders)
				.set({ encounterId, preEncounterId: null })
				.where(eq(imagingOrders.preEncounterId, preEnc.id))
				.returning({ id: imagingOrders.id })
				.then(rows => rows.length)

			const tarsUpdated = await tx
				.update(tarEntries)
				.set({ encounterId, preEncounterId: null })
				.where(eq(tarEntries.preEncounterId, preEnc.id))
				.returning({ id: tarEntries.id })
				.then(rows => rows.length)

			const iosUpdated = await tx
				.update(ioEntries)
				.set({ encounterId, preEncounterId: null })
				.where(eq(ioEntries.preEncounterId, preEnc.id))
				.returning({ id: ioEntries.id })
				.then(rows => rows.length)

			// 3. Store JSONB merge snapshot and mark pre-encounter as merged
			const mergeSnapshot = {
				preEncounter: preEnc,
				mergedAt: new Date().toISOString(),
				recordsMerged: {
					vitalSigns: vitalsUpdated,
					clinicalNotes: notesUpdated,
					medicationOrders: ordersUpdated,
					marEntries: marsUpdated,
					labOrders: labsUpdated,
					imagingOrders: imagingUpdated,
					tarEntries: tarsUpdated,
					ioEntries: iosUpdated,
				},
			}

			await tx
				.update(preEncounters)
				.set({
					status: "merged",
					mergedToEncounterId: encounterId,
					mergedAt: new Date(),
					mergeSnapshot,
					updatedAt: new Date(),
				})
				.where(eq(preEncounters.id, preEnc.id))

			// 4. Mark bed as occupied if assigned
			if (input.bedId) {
				await tx
					.update(beds)
					.set({
						status: "occupied",
						currentEncounterId: encounterId,
						updatedAt: new Date(),
					})
					.where(eq(beds.id, input.bedId))
			}

			// 5. SLA-002/SLA-004: Write initial ED event backdated to triage datetime so that
			// the SLA clock starts when the patient first arrived, not when charts merged.
			await tx.insert(encounterStatusEvents).values({
				facilityId: preEnc.facilityId,
				encounterId,
				fromStatus: null,
				toStatus: "ed_registered",
				workflowType: "ed" as const,
				staffId: preEnc.triageStaffId ?? null,
				slaTargetMinutes: edRegisteredSlaMins,
				notes: `Pre-encounter ${preEnc.traumaAlias} merged — triage clock preserved`,
				occurredAt: preEnc.triageDatetime ?? new Date(),
			})

			return {
				encounterId,
				preEncounterId: preEnc.id,
				patientId: input.patientId,
				mergedRecordCounts: {
					vitalSigns: vitalsUpdated,
					clinicalNotes: notesUpdated,
					medicationOrders: ordersUpdated,
					marEntries: marsUpdated,
					labOrders: labsUpdated,
					imagingOrders: imagingUpdated,
					tarEntries: tarsUpdated,
					ioEntries: iosUpdated,
				},
			}
		})

		this.logger.log(
			`Merged pre-encounter ${input.preEncounterId} → encounter ${result.encounterId} for patient ${input.patientId}`
		)
		this.notificationService.broadcast(
			"ed_queue",
			"ED Queue Updated",
			"Pre-encounter merged into patient chart"
		)

		return result
	}

	// ========================================================================
	// ED Queue
	// ========================================================================

	private mapResourceNeeds(resourceNeeds: unknown): ResourceNeeds {
		const rn = (resourceNeeds ?? {}) as {
			bed?: boolean
			codeTeam?: boolean
			equipment?: string[]
		}

		return {
			bed: rn.bed ?? false,
			codeTeam: rn.codeTeam ?? false,
			equipment: rn.equipment ?? [],
		}
	}

	async getQueue(input: EdQueueInput) {
		// Get active pre-encounters (not yet merged)
		const preEncRows = await db
			.select({
				id: preEncounters.id,
				traumaAlias: preEncounters.traumaAlias,
				chiefComplaint: preEncounters.chiefComplaint,
				acuityLevel: preEncounters.triageAcuityLevel,
				acuityScale: preEncounters.triageAcuityScale,
				arrivalTime: preEncounters.createdAt,
				inboundId: inboundTriageRecords.id,
				inboundCallerName: inboundTriageRecords.callerName,
				inboundPatientLocation: inboundTriageRecords.patientLocation,
				inboundTransportMode: inboundTriageRecords.transportMode,
				inboundChannelType: inboundTriageRecords.channelType,
				inboundEtaMinutes: inboundTriageRecords.etaMinutes,
				inboundEtaAt: inboundTriageRecords.etaAt,
				inboundArrivedAt: inboundTriageRecords.arrivedAt,
				inboundAssessmentNotes: inboundTriageRecords.assessmentNotes,
				inboundResourceNeeds: inboundTriageRecords.resourceNeeds,
			})
			.from(preEncounters)
			.leftJoin(inboundTriageRecords, eq(inboundTriageRecords.preEncounterId, preEncounters.id))
			.where(
				and(eq(preEncounters.facilityId, input.facilityId), eq(preEncounters.status, "active"))
			)
			.orderBy(preEncounters.createdAt)

		// Get active emergency encounters — single JOIN query eliminates N+1 per row
		const encRows = await db
			.select({
				id: encounters.id,
				patientFirstName: patients.firstName,
				patientLastName: patients.lastName,
				patientMrn: patients.mrn,
				chiefComplaint: encounters.chiefComplaint,
				arrivalTime: encounters.admissionDatetime,
				attendingStaffId: encounters.attendingStaffId,
				bedId: encounters.bedId,
				bedNumber: beds.bedNumber,
				wardName: wards.name,
				assignedProviderName: users.name,
				mergedAcuityLevel: preEncounters.triageAcuityLevel,
				mergedAcuityScale: preEncounters.triageAcuityScale,
				oecbEligible: encounters.oecbEligible,
			})
			.from(encounters)
			.innerJoin(patients, eq(encounters.patientId, patients.id))
			.leftJoin(beds, eq(encounters.bedId, beds.id))
			.leftJoin(wards, eq(beds.wardId, wards.id))
			.leftJoin(staffProfiles, eq(encounters.attendingStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.leftJoin(preEncounters, eq(encounters.mergedFromPreEncounterId, preEncounters.id))
			.where(
				and(
					eq(encounters.facilityId, input.facilityId),
					eq(encounters.encounterType, "emergency"),
					eq(encounters.status, "active")
				)
			)
			.orderBy(encounters.admissionDatetime)

		const now = Date.now()

		// Build queue items from pre-encounters
		const preEncItems = preEncRows.map(pe => ({
			id: pe.id,
			type: "pre_encounter" as const,
			patientName: pe.traumaAlias,
			patientMrn: null,
			traumaAlias: pe.traumaAlias,
			acuityLevel: pe.acuityLevel,
			acuityScale: pe.acuityScale,
			chiefComplaint: pe.chiefComplaint,
			arrivalTime: pe.arrivalTime,
			waitMinutes: Math.round((now - new Date(pe.arrivalTime).getTime()) / 60000),
			queueStatus: "triage" as const,
			assignedProvider: null,
			bedNumber: null,
			wardName: null,
			oecbEligible: false,
			inboundHandoff: pe.inboundId
				? {
						id: pe.inboundId,
						callerName: pe.inboundCallerName!,
						patientLocation: pe.inboundPatientLocation!,
						transportMode: pe.inboundTransportMode!,
						channelType: pe.inboundChannelType!,
						etaMinutes: pe.inboundEtaMinutes!,
						etaAt: pe.inboundEtaAt!,
						arrivedAt: pe.inboundArrivedAt,
						assessmentNotes: pe.inboundAssessmentNotes ?? "",
						resourceNeeds: this.mapResourceNeeds(pe.inboundResourceNeeds),
					}
				: null,
		}))

		// Build queue items from encounters — all data is already joined
		const encItems = encRows.map(enc => {
			// Determine queue status based on state
			const queueStatus: "waiting" | "triage" | "being_seen" | "disposition" = enc.attendingStaffId
				? "being_seen"
				: "waiting"

			const rawScale = enc.mergedAcuityScale
			const acuityScale: "esi" | "ats" | "ctas" | null =
				rawScale === "esi" || rawScale === "ats" || rawScale === "ctas" ? rawScale : null

			return {
				id: enc.id,
				type: "encounter" as const,
				patientName: `${enc.patientLastName}, ${enc.patientFirstName}`,
				patientMrn: enc.patientMrn,
				traumaAlias: null,
				acuityLevel: enc.mergedAcuityLevel,
				acuityScale,
				chiefComplaint: enc.chiefComplaint,
				arrivalTime: enc.arrivalTime,
				waitMinutes: Math.round((now - new Date(enc.arrivalTime).getTime()) / 60000),
				queueStatus,
				assignedProvider: enc.assignedProviderName ?? null,
				bedNumber: enc.bedNumber ?? null,
				wardName: enc.wardName ?? null,
				oecbEligible: enc.oecbEligible ?? false,
				inboundHandoff: null,
			}
		})

		const allItems: Array<{
			id: string
			type: "pre_encounter" | "encounter"
			patientName: string
			patientMrn: string | null
			traumaAlias: string | null
			acuityLevel: number | null
			acuityScale: "esi" | "ats" | "ctas" | null
			chiefComplaint: string | null
			arrivalTime: Date
			waitMinutes: number
			queueStatus: "waiting" | "triage" | "being_seen" | "disposition"
			assignedProvider: string | null
			bedNumber: string | null
			wardName: string | null
			oecbEligible: boolean
			inboundHandoff: {
				id: string
				callerName: string
				patientLocation: string
				transportMode: "ambulance" | "private_vehicle" | "walk_in" | "motorcycle_ambulance"
				channelType: "phone" | "video"
				etaMinutes: number
				etaAt: Date
				arrivedAt: Date | null
				assessmentNotes: string
				resourceNeeds: ResourceNeeds
			} | null
		}> = [...preEncItems, ...encItems]

		// Sort by acuity level (1 = most urgent first), then by arrival time
		allItems.sort((a, b) => {
			const aAcuity = a.acuityLevel ?? 5
			const bAcuity = b.acuityLevel ?? 5
			if (aAcuity !== bAcuity) return aAcuity - bAcuity
			return new Date(a.arrivalTime).getTime() - new Date(b.arrivalTime).getTime()
		})

		// Summary
		const summary = {
			total: allItems.length,
			waiting: allItems.filter(i => i.queueStatus === "waiting").length,
			triage: allItems.filter(i => i.queueStatus === "triage").length,
			beingSeen: allItems.filter(i => i.queueStatus === "being_seen").length,
			disposition: allItems.filter(i => i.queueStatus === "disposition").length,
			acuity1: allItems.filter(i => i.acuityLevel === 1).length,
			acuity2: allItems.filter(i => i.acuityLevel === 2).length,
		}

		return { items: allItems, summary }
	}

	async updateQueueStatus(input: UpdateQueueStatusInput) {
		// Pre-encounters have no permanent encounter ID; event writes are deferred
		// until the pre-encounter is merged into a full encounter (see ed.merge).
		if (input.type !== "encounter") {
			return input
		}

		// Fetch current encounter to capture facilityId and previous queue status
		const [current] = await db
			.select({ queueStatus: encounters.queueStatus, facilityId: encounters.facilityId })
			.from(encounters)
			.where(eq(encounters.id, input.id))

		if (!current) {
			throw new NotFoundException(`Encounter ${input.id} not found`)
		}

		const fromStatus = current.queueStatus ?? null

		// Persist the ED queue status on the encounter row. The queueStatus column
		// is plain text in the DB; the $type<> constraint is TypeScript-only, so
		// ED status values (waiting/triage/being_seen/disposition) are stored safely.
		await db
			.update(encounters)
			.set({
				queueStatus: input.queueStatus as unknown as "waiting" | "in_progress" | "completed",
				updatedAt: new Date(),
			})
			.where(eq(encounters.id, input.id))

		// SLA-001/SLA-004: Close the previous open ED step before starting a new one
		await closeOpenSlaStep(db, input.id, "ed")

		// Write durable SLA transition event for emergency-triage workflow tracking
		const queueStatusSlaMins = await resolveStepTarget(current.facilityId, "ed", input.queueStatus)
		await db.insert(encounterStatusEvents).values({
			facilityId: current.facilityId,
			encounterId: input.id,
			fromStatus,
			toStatus: input.queueStatus,
			workflowType: "ed" as const,
			staffId: null,
			slaTargetMinutes: queueStatusSlaMins,
			notes: `ED queue: ${fromStatus ?? "none"} → ${input.queueStatus}`,
			occurredAt: new Date(),
		})

		this.logger.log(`Updated ED encounter ${input.id} queue status to ${input.queueStatus}`)
		return input
	}

	// ========================================================================
	// ED Disposition
	// ========================================================================

	async dispose(input: EdDispositionInput) {
		const [encounter] = await db
			.select()
			.from(encounters)
			.where(eq(encounters.id, input.encounterId))

		if (!encounter) {
			throw new NotFoundException(`Encounter ${input.encounterId} not found`)
		}

		if (encounter.status !== "active") {
			throw new BadRequestException("Can only set disposition on active encounters")
		}

		if (encounter.encounterType !== "emergency") {
			throw new BadRequestException(
				"Disposition is only allowed on emergency department encounters"
			)
		}

		// Require at least one signed clinical note before allowing disposition
		const [signedNote] = await db
			.select({ id: clinicalNotes.id })
			.from(clinicalNotes)
			.where(
				and(eq(clinicalNotes.encounterId, input.encounterId), eq(clinicalNotes.status, "signed"))
			)
			.limit(1)

		if (!signedNote) {
			throw new BadRequestException(
				"At least one signed clinical note is required before disposition"
			)
		}

		// SLA-004: Resolve step targets before the transaction (read-only operations)
		const [dispositionSlaMins, admittedSlaMins] = await Promise.all([
			resolveStepTarget(encounter.facilityId, "discharge", input.disposition),
			resolveStepTarget(encounter.facilityId, "admission", "admitted"),
		])

		const result = await db.transaction(async tx => {
			let inpatientEncounterId: string | null = null

			if (input.disposition === "admit") {
				// Create an inpatient encounter from the ED encounter
				const [inpatientEnc] = await tx
					.insert(encounters)
					.values({
						facilityId: encounter.facilityId,
						patientId: encounter.patientId,
						encounterType: "inpatient",
						chiefComplaint: encounter.chiefComplaint,
						admittingStaffId: encounter.attendingStaffId,
						attendingStaffId: encounter.attendingStaffId,
						bedId: input.admitBedId ?? null,
						admissionDatetime: new Date(),
					})
					.returning()

				inpatientEncounterId = inpatientEnc!.id

				// Mark admit bed as occupied
				if (input.admitBedId) {
					await tx
						.update(beds)
						.set({
							status: "occupied",
							currentEncounterId: inpatientEncounterId,
							updatedAt: new Date(),
						})
						.where(eq(beds.id, input.admitBedId))
				}
			}

			// Release ED bed if assigned
			if (encounter.bedId) {
				await tx
					.update(beds)
					.set({ status: "available", currentEncounterId: null, updatedAt: new Date() })
					.where(eq(beds.id, encounter.bedId))
			}

			// Update the ED encounter — final status is always "discharged" regardless of disposition subtype
			const dispositionNow = new Date()
			await tx
				.update(encounters)
				.set({
					status: "discharged",
					disposition:
						input.disposition === "admit"
							? "transfer"
							: input.disposition === "discharge"
								? "home"
								: input.disposition === "transfer"
									? "transfer"
									: "deceased",
					oecbEligible: input.disposition === "discharge" ? (input.oecbEligible ?? false) : false,
					dischargeDatetime: dispositionNow,
					updatedAt: dispositionNow,
				})
				.where(eq(encounters.id, input.encounterId))

			// SLA-002: Close last open ED step then write disposition SLA events.
			const [openEdStep] = await tx
				.select({ id: encounterStatusEvents.id, occurredAt: encounterStatusEvents.occurredAt })
				.from(encounterStatusEvents)
				.where(
					and(
						eq(encounterStatusEvents.encounterId, input.encounterId),
						eq(encounterStatusEvents.workflowType, "ed" as const),
						isNull(encounterStatusEvents.actualMinutes)
					)
				)
				.orderBy(desc(encounterStatusEvents.occurredAt))
				.limit(1)

			if (openEdStep) {
				const mins = Math.max(
					1,
					Math.ceil((dispositionNow.getTime() - openEdStep.occurredAt.getTime()) / 60_000)
				)
				await tx
					.update(encounterStatusEvents)
					.set({ actualMinutes: mins })
					.where(eq(encounterStatusEvents.id, openEdStep.id))
			}

			// Write the disposition event for the ED encounter
			await tx.insert(encounterStatusEvents).values({
				facilityId: encounter.facilityId,
				encounterId: input.encounterId,
				fromStatus: "ed_active",
				toStatus: input.disposition,
				workflowType: "discharge" as const,
				staffId: null,
				slaTargetMinutes: dispositionSlaMins,
				notes: `ED disposition: ${input.disposition}`,
				occurredAt: dispositionNow,
			})

			// For admit: write the opening admission event on the new inpatient encounter
			if (inpatientEncounterId) {
				await tx.insert(encounterStatusEvents).values({
					facilityId: encounter.facilityId,
					encounterId: inpatientEncounterId,
					fromStatus: null,
					toStatus: "admitted",
					workflowType: "admission" as const,
					staffId: null,
					slaTargetMinutes: admittedSlaMins,
					notes: `Admitted from ED encounter ${input.encounterId}`,
					occurredAt: dispositionNow,
				})
			}

			// Emit billing routing event for OECB-tagged ED discharges
			if (input.disposition === "discharge" && (input.oecbEligible ?? false)) {
				await tx.insert(encounterStatusEvents).values({
					facilityId: encounter.facilityId,
					encounterId: input.encounterId,
					fromStatus: null,
					toStatus: "ready_for_billing",
					workflowType: "billing" as const,
					staffId: null,
					notes: "OECB-tagged ED discharge — routed to PhilHealth outpatient billing",
					occurredAt: dispositionNow,
				})
			}

			return {
				encounterId: input.encounterId,
				disposition: input.disposition,
				oecbEligible: input.disposition === "discharge" ? (input.oecbEligible ?? false) : false,
				inpatientEncounterId,
			}
		})

		this.logger.log(
			`ED Disposition: encounter ${input.encounterId} → ${input.disposition}${result.oecbEligible ? " (OECB → billing routed)" : ""}`
		)
		this.notificationService.broadcast(
			"ed_queue",
			"ED Queue Updated",
			`Patient disposition: ${input.disposition}`
		)

		return result
	}

	// ========================================================================
	// Tele-Triage — Inbound Patient Management
	// ========================================================================

	private mapInboundRecord(row: {
		id: string
		facilityId: string
		callerName: string
		patientLocation: string
		transportMode: "ambulance" | "private_vehicle" | "walk_in" | "motorcycle_ambulance"
		channelType: "phone" | "video"
		etaMinutes: number
		etaAt: Date
		provisionalAcuityLevel: number
		acuityScale: "esi" | "ats" | "ctas"
		assessmentNotes: string
		resourceNeeds: unknown
		status: "queued" | "arrived" | "cancelled"
		arrivedAt: Date | null
		preEncounterId: string | null
		triageStaffId: string | null
		createdAt: Date
		updatedAt: Date
	}) {
		return {
			...row,
			resourceNeeds: this.mapResourceNeeds(row.resourceNeeds),
		}
	}

	async createInboundTriage(input: CreateInboundTriageInput) {
		const now = new Date()
		const etaAt = new Date(now.getTime() + input.etaMinutes * 60_000)

		const [record] = await db
			.insert(inboundTriageRecords)
			.values({
				facilityId: input.facilityId,
				callerName: input.callerName,
				patientLocation: input.patientLocation,
				transportMode: input.transportMode,
				channelType: input.channelType,
				etaMinutes: input.etaMinutes,
				etaAt,
				provisionalAcuityLevel: input.provisionalAcuityLevel,
				acuityScale: input.acuityScale,
				assessmentNotes: input.assessmentNotes ?? "",
				resourceNeeds: input.resourceNeeds ?? { bed: false, codeTeam: false, equipment: [] },
				status: "queued",
				triageStaffId: input.triageStaffId,
			})
			.returning()

		this.logger.log(`Created inbound triage record ${record!.id} — ETA ${input.etaMinutes}m`)
		this.notificationService.broadcast(
			"tele_triage",
			`Inbound L${input.provisionalAcuityLevel} patient — ETA ${input.etaMinutes}m`,
			`${input.callerName} · ${input.patientLocation} via ${input.transportMode}`
		)

		return this.mapInboundRecord(record!)
	}

	async listInboundTriage(input: InboundTriageListInput) {
		const conditions = [eq(inboundTriageRecords.facilityId, input.facilityId)]
		if (input.status) {
			conditions.push(eq(inboundTriageRecords.status, input.status))
		}

		const rows = await db
			.select()
			.from(inboundTriageRecords)
			.where(and(...conditions))
			.orderBy(asc(inboundTriageRecords.etaAt))

		return rows.map(r => this.mapInboundRecord(r))
	}

	async markInboundArrived(input: InboundTriageIdInput) {
		let result: {
			record: InboundArrivalRecord
			preEncounterId: string
		} | null = null

		for (let attempt = 0; attempt < 3; attempt++) {
			try {
				result = await db.transaction(async tx => {
					const now = new Date()
					const record = await this.claimInboundArrival(tx, input.id, now)

					const preEncounter = await this.createInboundPreEncounter(tx, record)

					const [linked] = await tx
						.update(inboundTriageRecords)
						.set({
							preEncounterId: preEncounter.id,
							updatedAt: now,
						})
						.where(
							and(
								eq(inboundTriageRecords.id, input.id),
								eq(inboundTriageRecords.status, "arrived"),
								isNull(inboundTriageRecords.preEncounterId)
							)
						)
						.returning({ id: inboundTriageRecords.id })

					if (!linked) {
						throw new BadRequestException("Inbound record is already linked to a pre-encounter")
					}

					return { record, preEncounterId: preEncounter.id }
				})
				break
			} catch (err: unknown) {
				if (this.isUniqueViolation(err) && attempt < 2) {
					continue
				}
				throw err
			}
		}

		if (!result) {
			throw new Error("Failed to create a unique pre-encounter after 3 attempts")
		}

		this.logger.log(`Inbound triage ${input.id} arrived → pre-encounter ${result.preEncounterId}`)
		this.notificationService.broadcast(
			"ed_queue",
			"Inbound patient arrived",
			`${result.record.callerName} checked in — pre-encounter created`
		)

		return { id: input.id, preEncounterId: result.preEncounterId }
	}

	private async claimInboundArrival(tx: DBTransaction, id: string, now: Date) {
		const [claimed] = await tx
			.update(inboundTriageRecords)
			.set({
				status: "arrived",
				arrivedAt: now,
				updatedAt: now,
			})
			.where(
				and(
					eq(inboundTriageRecords.id, id),
					eq(inboundTriageRecords.status, "queued"),
					isNull(inboundTriageRecords.preEncounterId)
				)
			)
			.returning()

		if (claimed) {
			if (!claimed.triageStaffId) {
				throw new BadRequestException("Inbound record has no triage staff assigned")
			}
			return claimed
		}

		const [existing] = await tx
			.select()
			.from(inboundTriageRecords)
			.where(eq(inboundTriageRecords.id, id))

		if (!existing) {
			throw new NotFoundException(`Inbound triage record ${id} not found`)
		}

		if (existing.preEncounterId) {
			throw new BadRequestException("Inbound record is already linked to a pre-encounter")
		}

		throw new BadRequestException("Record is not in queued status")
	}

	private async createInboundPreEncounter(tx: DBTransaction, record: InboundArrivalRecord) {
		const year = new Date().getFullYear()
		const [countResult] = await tx
			.select({ count: count() })
			.from(preEncounters)
			.where(
				and(
					eq(preEncounters.facilityId, record.facilityId),
					like(preEncounters.traumaAlias, `TRAUMA-${year}-%`)
				)
			)

		const seq = (countResult?.count ?? 0) + 1
		const traumaAlias = `TRAUMA-${year}-${String(seq).padStart(4, "0")}`

		const [created] = await tx
			.insert(preEncounters)
			.values({
				facilityId: record.facilityId,
				traumaAlias,
				chiefComplaint: record.assessmentNotes || null,
				triageAcuityScale: record.acuityScale,
				triageAcuityLevel: record.provisionalAcuityLevel,
				triageDatetime: new Date(),
				triageStaffId: record.triageStaffId,
				status: "active",
			})
			.returning()

		return created!
	}

	private isUniqueViolation(err: unknown) {
		return (err as { code?: string }).code === "23505"
	}

	async cancelInboundTriage(input: InboundTriageIdInput) {
		const [record] = await db
			.select()
			.from(inboundTriageRecords)
			.where(eq(inboundTriageRecords.id, input.id))

		if (!record) {
			throw new NotFoundException(`Inbound triage record ${input.id} not found`)
		}

		if (record.status !== "queued") {
			throw new BadRequestException("Only queued records can be cancelled")
		}

		const [updated] = await db
			.update(inboundTriageRecords)
			.set({ status: "cancelled", updatedAt: new Date() })
			.where(eq(inboundTriageRecords.id, input.id))
			.returning()

		this.logger.log(`Inbound triage record ${input.id} cancelled`)
		return this.mapInboundRecord(updated!)
	}
}
