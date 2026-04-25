import {
	BadRequestException,
	Inject,
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common"
import { and, count, desc, eq, isNull, like } from "drizzle-orm"

import {
	beds,
	clinicalNotes,
	encounterStatusEvents,
	encounters,
	imagingOrders,
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

				this.logger.log(`Created pre-encounter ${created!.id} with alias ${traumaAlias}`)
				this.notificationService.broadcast("ed_queue", "ED Queue Updated", "New triage pre-encounter created")

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
		const [existing] = await db
			.select()
			.from(preEncounters)
			.where(eq(preEncounters.id, input.id))

		if (!existing) {
			throw new NotFoundException(`Pre-encounter ${input.id} not found`)
		}

		if (existing.status !== "active") {
			throw new BadRequestException("Can only update active pre-encounters")
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() }
		if (input.chiefComplaint !== undefined) updateData.chiefComplaint = input.chiefComplaint
		if (input.triageAcuityScale !== undefined) updateData.triageAcuityScale = input.triageAcuityScale
		if (input.triageAcuityLevel !== undefined) updateData.triageAcuityLevel = input.triageAcuityLevel

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
		this.notificationService.broadcast("ed_queue", "ED Queue Updated", "Pre-encounter merged into patient chart")

		return result
	}

	// ========================================================================
	// ED Queue
	// ========================================================================

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
			})
			.from(preEncounters)
			.where(
				and(
					eq(preEncounters.facilityId, input.facilityId),
					eq(preEncounters.status, "active")
				)
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
		}))

		// Build queue items from encounters — all data is already joined
		const encItems = encRows.map(enc => {
			// Determine queue status based on state
			const queueStatus: "waiting" | "triage" | "being_seen" | "disposition" =
				enc.attendingStaffId ? "being_seen" : "waiting"

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
					oecbEligible:
						input.disposition === "discharge" ? (input.oecbEligible ?? false) : false,
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
						isNull(encounterStatusEvents.actualMinutes),
					),
				)
				.orderBy(desc(encounterStatusEvents.occurredAt))
				.limit(1)

			if (openEdStep) {
				const mins = Math.max(
					1,
					Math.ceil((dispositionNow.getTime() - openEdStep.occurredAt.getTime()) / 60_000),
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

			return {
				encounterId: input.encounterId,
				disposition: input.disposition,
				oecbEligible: input.disposition === "discharge" ? (input.oecbEligible ?? false) : false,
				inpatientEncounterId,
			}
		})

		this.logger.log(
			`ED Disposition: encounter ${input.encounterId} → ${input.disposition}${input.oecbEligible ? " (OECB tagged)" : ""}`
		)
		this.notificationService.broadcast("ed_queue", "ED Queue Updated", `Patient disposition: ${input.disposition}`)

		return result
	}
}
