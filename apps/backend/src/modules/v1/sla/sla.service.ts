import { Injectable, Logger, NotFoundException, OnModuleInit } from "@nestjs/common"
import { and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, lte, ne, sql } from "drizzle-orm"

import { birthRegistrations, deathReports, encounterStatusEvents, encounters, facilities, imagingOrders, invoices, labOrders, medicalRecordsRequests, operationRecords, patients, slaConfigs, slaStepConfigs, workflowStatusLog } from "@repo/db/schema"
import type { SlaStepType, SlaWorkflowType } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

import type {
	SlaEventsQuery,
	SlaEventsResponse,
	SlaConfigsQuery,
	SlaConfigsResponse,
	CreateSlaConfig,
	UpdateSlaConfig,
	SlaComplianceQuery,
	SlaComplianceReport,
	SlaConfig,
	SlaEvent,
	SlaStepMetric,
	SlaStepConfigsQuery,
	SlaStepConfigsResponse,
	CreateSlaStepConfig,
	UpdateSlaStepConfig,
	SlaStepConfig,
} from "@repo/contracts"

import { resolveStepTargetByType } from "@/utils/sla-step-target"

// Map encounter types to SLA workflow types
const ENCOUNTER_TYPE_TO_WORKFLOW: Record<string, SlaWorkflowType> = {
	outpatient: "opd_consultation",
	telemedicine: "opd_consultation",
	emergency: "emergency_triage",
	inpatient: "admission",
}

// Map SLA workflow types back to encounter types (for filtering)
const WORKFLOW_TO_ENCOUNTER_TYPES: Partial<Record<SlaWorkflowType, string[]>> = {
	opd_consultation: ["outpatient", "telemedicine"],
	emergency_triage: ["emergency"],
	admission: ["inpatient"],
	discharge: ["inpatient"],
}

// Non-encounter workflows that have a supported data source for SLA event detail listing
const NON_ENCOUNTER_WORKFLOW_SOURCES = new Set<SlaWorkflowType>([
	"lab_result",
	"radiology_result",
	"medical_records",
	"discharge",
	"billing_processing",
	"medication_dispensing",
	"surgical_scheduling",
	"certificate_issuance",
])

// Mapping from encounterStatusEvents.workflowType → SLA workflow type
// Used for step-level compliance metrics in getComplianceReport
const EVENT_TO_SLA_WORKFLOW: Record<string, SlaWorkflowType | undefined> = {
	opd: "opd_consultation",
	ed: "emergency_triage",
	admission: "admission",
	discharge: "discharge",
	ancillary: "lab_result",
	pharmacy: "medication_dispensing",
	billing: "billing_processing",
}

function computeSlaStatus(
	elapsedMinutes: number,
	targetMinutes: number,
	warningThresholdPct: number
): "on_time" | "approaching" | "exceeded" {
	if (elapsedMinutes >= targetMinutes) return "exceeded"
	if (elapsedMinutes >= (targetMinutes * warningThresholdPct) / 100) return "approaching"
	return "on_time"
}

// Module-level type shared by listEvents/getComplianceReport helpers
type WorkflowMetrics = {
	total: number
	onTime: number
	approaching: number
	exceeded: number
	totalElapsed: number
	targetMinutes: number
	// SLA-005: number of records with an authoritative checkpoint timestamp (vs proxy createdAt)
	checkpointCount: number
	// SLA-007: step-level metrics for Flow 7 (medical_records / certificate_issuance)
	stepMetrics?: SlaStepMetric[]
}

// ARTA default SLA workflow configs (Philippine DOH ARTA requirements)
const ARTA_DEFAULT_CONFIGS: Array<{ workflowType: SlaWorkflowType; targetMinutes: number; hardCapMinutes: number; description: string }> = [
	{ workflowType: "opd_consultation", targetMinutes: 30, hardCapMinutes: 60, description: "ARTA Flow 1: OPD Consultation" },
	{ workflowType: "admission", targetMinutes: 60, hardCapMinutes: 120, description: "ARTA Flow 4: Admission Routing" },
	{ workflowType: "lab_result", targetMinutes: 60, hardCapMinutes: 120, description: "ARTA Flow 3: Laboratory Result" },
	{ workflowType: "radiology_result", targetMinutes: 60, hardCapMinutes: 120, description: "ARTA Flow 3: Radiology Result" },
	{ workflowType: "medication_dispensing", targetMinutes: 15, hardCapMinutes: 30, description: "ARTA Flow 6: Pharmacy Dispensing" },
	{ workflowType: "medical_records", targetMinutes: 1440, hardCapMinutes: 2880, description: "ARTA Flow 7: Medical Records Release" },
	{ workflowType: "emergency_triage", targetMinutes: 5, hardCapMinutes: 10, description: "ARTA Flow 2: Emergency Triage" },
]

@Injectable()
export class SlaService implements OnModuleInit {
	private readonly logger = new Logger(SlaService.name)

	async onModuleInit() {
		// ADM-BE-09 AC1: Seed ARTA default SLA configs for all existing facilities
		try {
			const allFacilities = await db.select({ id: facilities.id }).from(facilities)
			for (const facility of allFacilities) {
				await db
					.insert(slaConfigs)
					.values(
						ARTA_DEFAULT_CONFIGS.map(cfg => ({
							facilityId: facility.id,
							workflowType: cfg.workflowType,
							targetMinutes: cfg.targetMinutes,
							hardCapMinutes: cfg.hardCapMinutes,
							warningThresholdPct: 80,
							description: cfg.description,
						}))
					)
					.onConflictDoNothing()
			}
		} catch (err) {
			this.logger.warn("ARTA default SLA config seed failed (non-fatal)", err)
		}
	}

	// ========================================================================
	// SLA Events
	// ========================================================================

	async listEvents(query: SlaEventsQuery): Promise<SlaEventsResponse> {
		const page = query.page ?? 1
		const limit = Math.min(query.limit ?? 50, 200)
		const offset = (page - 1) * limit

		// SLA-001: no workflow filter → unified active-work view across all sources
		if (!query.workflowType) {
			return this.listAllActiveEvents(query, page, limit, offset)
		}

		// Non-encounter workflows have their own query path
		if (NON_ENCOUNTER_WORKFLOW_SOURCES.has(query.workflowType)) {
			return this.listNonEncounterEvents(query, page, limit, offset)
		}

		// Specific encounter workflow type
		const encounterTypeFilter = WORKFLOW_TO_ENCOUNTER_TYPES[query.workflowType] ?? []
		if (encounterTypeFilter.length === 0) {
			return { data: [], total: 0, page, limit, totalPages: 0 }
		}

		// Load SLA configs for the facility
		const facilityConfigs = query.facilityId
			? await db
					.select()
					.from(slaConfigs)
					.where(and(eq(slaConfigs.facilityId, query.facilityId), eq(slaConfigs.isActive, true)))
			: []
		const configByWorkflow = new Map(facilityConfigs.map(c => [c.workflowType, c]))

		// SLA-002: restrict to active encounters only (exclude completed/discharged)
		const conditions = [
			eq(encounters.status, "active"),
			inArray(
				encounters.encounterType,
				encounterTypeFilter as Array<"inpatient" | "outpatient" | "emergency" | "telemedicine">
			),
		]
		if (query.facilityId) {
			conditions.push(eq(encounters.facilityId, query.facilityId))
		}
		const where = and(...conditions)

		// Fetch active encounters (paginated) — admin-safe, no patient identifiers
		const encounterRows = await db
			.select({
				id: encounters.id,
				facilityId: encounters.facilityId,
				encounterType: encounters.encounterType,
				admissionDatetime: encounters.admissionDatetime,
				dischargeDatetime: encounters.dischargeDatetime,
			})
			.from(encounters)
			.where(where)
			.orderBy(desc(encounters.admissionDatetime))
			.limit(limit)
			.offset(offset)

		const [countRow] = await db.select({ total: count() }).from(encounters).where(where)

		// SLA-002: batch-fetch the latest open step event per encounter for step-level timing
		const encounterIds = encounterRows.map(r => r.id)
		const latestStepRows =
			encounterIds.length > 0
				? await db
						.select({
							encounterId: encounterStatusEvents.encounterId,
							occurredAt: encounterStatusEvents.occurredAt,
							escalatedAt: encounterStatusEvents.escalatedAt,
							toStatus: encounterStatusEvents.toStatus,
						})
						.from(encounterStatusEvents)
						.where(
							and(
								inArray(encounterStatusEvents.encounterId, encounterIds),
								isNull(encounterStatusEvents.actualMinutes)
							)
						)
						.orderBy(desc(encounterStatusEvents.occurredAt))
				: []

		const latestStepByEncounter = new Map<string, { occurredAt: Date; escalatedAt: Date | null; toStatus: string | null }>()
		for (const evt of latestStepRows) {
			if (!latestStepByEncounter.has(evt.encounterId)) {
				latestStepByEncounter.set(evt.encounterId, {
					occurredAt: evt.occurredAt,
					escalatedAt: evt.escalatedAt ?? null,
					toStatus: evt.toStatus ?? null,
				})
			}
		}

		const now = new Date()
		const events: SlaEvent[] = []

		for (const row of encounterRows) {
			const workflowType = ENCOUNTER_TYPE_TO_WORKFLOW[row.encounterType] ?? "opd_consultation"
			const config = configByWorkflow.get(workflowType)
			if (!config) continue

			// SLA-002: prefer step-level timing from status events when available
			const stepEvent = latestStepByEncounter.get(row.id)

			// SLA-011: admission uses Flow 4 routing step events only — not full encounter duration.
			// Skip inpatient encounters that haven't started formal admission routing yet.
			if (workflowType === "admission" && !stepEvent) continue

			const startedAt = stepEvent?.occurredAt ?? row.admissionDatetime
			const completedAt = row.dischargeDatetime
			const elapsed = Math.floor(((completedAt ?? now).getTime() - startedAt.getTime()) / 60000)
			const status = computeSlaStatus(elapsed, config.targetMinutes, config.warningThresholdPct)

			if (query.status && query.status !== "all" && status !== query.status) continue

			events.push({
				id: row.id,
				facilityId: row.facilityId,
				encounterId: row.id,
				patientId: null,
				patientName: null,
				workflowType,
				startedAt,
				completedAt: completedAt ?? null,
				targetMinutes: config.targetMinutes,
				elapsedMinutes: elapsed,
				status,
				escalatedAt: stepEvent?.escalatedAt ?? null,
				escalatedToStaffId: null,
				notes: null,
				createdAt: row.admissionDatetime,
				currentStep: stepEvent?.toStatus ?? null,
			})
		}

		const total = countRow?.total ?? 0
		const totalPages = Math.ceil(total / limit)

		return { data: events, total, page, limit, totalPages }
	}

	// SLA-001: unified active-work view across encounter + all non-encounter workflow sources
	private async listAllActiveEvents(
		query: SlaEventsQuery,
		page: number,
		limit: number,
		offset: number,
	): Promise<SlaEventsResponse> {
		if (!query.facilityId) {
			return { data: [], total: 0, page, limit, totalPages: 0 }
		}

		// Load all active SLA configs for this facility
		const facilityConfigs = await db
			.select()
			.from(slaConfigs)
			.where(and(eq(slaConfigs.facilityId, query.facilityId), eq(slaConfigs.isActive, true)))
		const configByWorkflow = new Map(facilityConfigs.map(c => [c.workflowType, c]))

		// ── Encounter-backed workflows (active encounters only, SLA-002) ────────
		const encounterRows = await db
			.select({
				id: encounters.id,
				facilityId: encounters.facilityId,
				encounterType: encounters.encounterType,
				admissionDatetime: encounters.admissionDatetime,
				dischargeDatetime: encounters.dischargeDatetime,
			})
			.from(encounters)
			.where(
				and(
					eq(encounters.facilityId, query.facilityId),
					eq(encounters.status, "active"),
					inArray(encounters.encounterType, ["outpatient", "telemedicine", "emergency", "inpatient"])
				)
			)
			.orderBy(desc(encounters.admissionDatetime))
			.limit(200)

		// Batch step timing for encounter rows (SLA-002)
		const encounterIds = encounterRows.map(r => r.id)
		const latestStepRows =
			encounterIds.length > 0
				? await db
						.select({
							encounterId: encounterStatusEvents.encounterId,
							occurredAt: encounterStatusEvents.occurredAt,
							escalatedAt: encounterStatusEvents.escalatedAt,
							toStatus: encounterStatusEvents.toStatus,
						})
						.from(encounterStatusEvents)
						.where(
							and(
								inArray(encounterStatusEvents.encounterId, encounterIds),
								isNull(encounterStatusEvents.actualMinutes)
							)
						)
						.orderBy(desc(encounterStatusEvents.occurredAt))
				: []

		const latestStepByEncounter = new Map<string, { occurredAt: Date; escalatedAt: Date | null; toStatus: string | null }>()
		for (const evt of latestStepRows) {
			if (!latestStepByEncounter.has(evt.encounterId)) {
				latestStepByEncounter.set(evt.encounterId, {
					occurredAt: evt.occurredAt,
					escalatedAt: evt.escalatedAt ?? null,
					toStatus: evt.toStatus ?? null,
				})
			}
		}

		const now = new Date()
		const encounterEvents: SlaEvent[] = []
		for (const row of encounterRows) {
			const workflowType = ENCOUNTER_TYPE_TO_WORKFLOW[row.encounterType] ?? "opd_consultation"
			const config = configByWorkflow.get(workflowType)
			if (!config) continue

			const stepEvent = latestStepByEncounter.get(row.id)

			// SLA-011: admission uses Flow 4 routing step events only — not full encounter duration.
			if (workflowType === "admission" && !stepEvent) continue

			const startedAt = stepEvent?.occurredAt ?? row.admissionDatetime
			const elapsed = Math.floor((now.getTime() - startedAt.getTime()) / 60000)
			const status = computeSlaStatus(elapsed, config.targetMinutes, config.warningThresholdPct)

			encounterEvents.push({
				id: row.id,
				facilityId: row.facilityId,
				encounterId: row.id,
				patientId: null,
				patientName: null,
				workflowType,
				startedAt,
				completedAt: null,
				targetMinutes: config.targetMinutes,
				elapsedMinutes: elapsed,
				status,
				escalatedAt: stepEvent?.escalatedAt ?? null,
				escalatedToStaffId: null,
				notes: null,
				createdAt: row.admissionDatetime,
				currentStep: stepEvent?.toStatus ?? null,
			})
		}

		// ── Non-encounter workflows (SLA-001: fetch active items from each source) ─
		const PER_SOURCE_LIMIT = 200
		const nonEncounterPromises = ([...NON_ENCOUNTER_WORKFLOW_SOURCES] as SlaWorkflowType[]).map(wt => {
			if (!configByWorkflow.has(wt)) return Promise.resolve<SlaEvent[]>([])
			return this.listNonEncounterEvents({ ...query, workflowType: wt }, 1, PER_SOURCE_LIMIT, 0)
				.then(r => r.data)
				.catch(() => [] as SlaEvent[])
		})
		const nonEncounterEvents = (await Promise.all(nonEncounterPromises)).flat()

		// ── Merge, filter by status, sort by urgency, paginate ──────────────────
		let allEvents = [...encounterEvents, ...nonEncounterEvents]
		if (query.status && query.status !== "all") {
			allEvents = allEvents.filter(e => e.status === query.status)
		}

		// Sort: most-urgent first (exceeded → approaching → on_time), then most recent
		const severityRank: Record<string, number> = { exceeded: 0, approaching: 1, on_time: 2 }
		allEvents.sort((a, b) => {
			const diff = (severityRank[a.status] ?? 3) - (severityRank[b.status] ?? 3)
			if (diff !== 0) return diff
			return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
		})

		const total = allEvents.length
		const data = allEvents.slice(offset, offset + limit)
		return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
	}

	private async listNonEncounterEvents(
		query: SlaEventsQuery,
		page: number,
		limit: number,
		offset: number,
	): Promise<SlaEventsResponse> {
		const facilityId = query.facilityId
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const workflowType = query.workflowType!
		if (!facilityId) {
			return { data: [], total: 0, page, limit, totalPages: 0 }
		}

		const [slaConfig] = await db
			.select()
			.from(slaConfigs)
			.where(and(eq(slaConfigs.facilityId, facilityId), eq(slaConfigs.workflowType, workflowType), eq(slaConfigs.isActive, true)))
		if (!slaConfig) {
			return { data: [], total: 0, page, limit, totalPages: 0 }
		}

		const now = new Date()
		const events: SlaEvent[] = []
		const statusFilter = query.status && query.status !== "all" ? query.status : null

		if (workflowType === "lab_result") {
			// SLA-014: resolve targets for all 4 Flow 3 ancillary steps
			const [orderReceiptTgt, paymentTgt, procedureTgt, releaseTgt] = await Promise.all([
				resolveStepTargetByType(facilityId, "ancillary_order_receipt"),
				resolveStepTargetByType(facilityId, "ancillary_payment_clearance"),
				resolveStepTargetByType(facilityId, "ancillary_procedure"),
				resolveStepTargetByType(facilityId, "ancillary_release"),
			])
			const where = and(
				eq(labOrders.facilityId, facilityId),
				inArray(labOrders.status, ["pending", "ordered", "collected", "in_progress"]),
			)
			const rows = await db
				.select({
					id: labOrders.id,
					facilityId: labOrders.facilityId,
					encounterId: labOrders.encounterId,
					createdAt: labOrders.createdAt,
					collectionDatetime: labOrders.collectionDatetime,
					specimenReceivedAt: labOrders.specimenReceivedAt,
					// SLA-014: payment clearance checkpoint
					billingClearedAt: labOrders.billingClearedAt,
				})
				.from(labOrders)
				.where(where)
				.orderBy(desc(labOrders.createdAt))
				.limit(limit)
				.offset(offset)
			const [countRow] = await db.select({ total: count() }).from(labOrders).where(where)
			for (const row of rows) {
				// SLA-014: determine current step from 4-step checkpoint progression
				let currentStep: string
				let startedAt: Date
				let stepTarget: number
				let stepNote: string
				if (row.collectionDatetime !== null) {
					currentStep = "ancillary_release"
					startedAt = row.collectionDatetime
					stepTarget = releaseTgt
					stepNote = "Timing source: specimen collection datetime (TOR Flow 3 Step 3->4 checkpoint)"
				} else if (row.billingClearedAt !== null) {
					currentStep = "ancillary_procedure"
					startedAt = row.billingClearedAt
					stepTarget = procedureTgt
					stepNote = "Timing source: billing cleared datetime (TOR Flow 3 Step 2->3 authoritative checkpoint)"
				} else if (row.specimenReceivedAt !== null) {
					currentStep = "ancillary_payment_clearance"
					startedAt = row.specimenReceivedAt
					stepTarget = paymentTgt
					stepNote = "Timing source: specimen received at lab (TOR Flow 3 Step 1->2 authoritative checkpoint)"
				} else {
					currentStep = "ancillary_order_receipt"
					startedAt = row.createdAt
					stepTarget = orderReceiptTgt
					stepNote = "Timing source: lab order creation (TOR Flow 3 Step 1 - awaiting specimen receipt)"
				}
				const elapsed = Math.floor((now.getTime() - startedAt.getTime()) / 60000)
				const status = computeSlaStatus(elapsed, stepTarget, slaConfig.warningThresholdPct)
				if (statusFilter && status !== statusFilter) continue
				// SLA-014: currentStep reflects which of the 4 Flow 3 steps is currently in progress
				events.push({
					id: row.id, facilityId: row.facilityId, encounterId: row.encounterId,
					patientId: null, patientName: null,
					workflowType, startedAt, completedAt: null,
					targetMinutes: stepTarget, elapsedMinutes: elapsed, status,
					escalatedAt: null, escalatedToStaffId: null,
					notes: stepNote,
					createdAt: row.createdAt,
					currentStep,
				})
			}
			const total = countRow?.total ?? 0
			return { data: events, total, page, limit, totalPages: Math.ceil(total / limit) }
		}

		if (workflowType === "radiology_result") {
			// SLA-014: resolve targets for all 4 Flow 3 ancillary steps
			const [orderReceiptTgt, paymentTgt, procedureTgt, releaseTgt] = await Promise.all([
				resolveStepTargetByType(facilityId, "ancillary_order_receipt"),
				resolveStepTargetByType(facilityId, "ancillary_payment_clearance"),
				resolveStepTargetByType(facilityId, "ancillary_procedure"),
				resolveStepTargetByType(facilityId, "ancillary_release"),
			])
			const where = and(
				eq(imagingOrders.facilityId, facilityId),
				inArray(imagingOrders.status, ["ordered", "scheduled", "in_progress"]),
			)
			const rows = await db
				.select({
					id: imagingOrders.id,
					facilityId: imagingOrders.facilityId,
					encounterId: imagingOrders.encounterId,
					createdAt: imagingOrders.createdAt,
					scheduledDatetime: imagingOrders.scheduledDatetime,
					// SLA-019: authoritative receipt checkpoint (replaces scheduledDatetime proxy for Step 1)
					imagingOrderReceivedAt: imagingOrders.imagingOrderReceivedAt,
					studyStartedAt: imagingOrders.studyStartedAt,
					// SLA-014: payment clearance checkpoint
					billingClearedAt: imagingOrders.billingClearedAt,
				})
				.from(imagingOrders)
				.where(where)
				.orderBy(desc(imagingOrders.createdAt))
				.limit(limit)
				.offset(offset)
			const [countRow] = await db.select({ total: count() }).from(imagingOrders).where(where)
			for (const row of rows) {
				// SLA-014: determine current step from 4-step checkpoint progression
				let currentStep: string
				let startedAt: Date
				let stepTarget: number
				let stepNote: string
				if (row.studyStartedAt !== null) {
					currentStep = "ancillary_release"
					startedAt = row.studyStartedAt
					stepTarget = releaseTgt
					stepNote = "Timing source: study started datetime (TOR Flow 3 Step 3->4 authoritative checkpoint)"
				} else if (row.billingClearedAt !== null) {
					currentStep = "ancillary_procedure"
					startedAt = row.billingClearedAt
					stepTarget = procedureTgt
					stepNote = "Timing source: billing cleared datetime (TOR Flow 3 Step 2->3 authoritative checkpoint)"
				} else if (row.imagingOrderReceivedAt !== null) {
					// SLA-019: use authoritative receipt timestamp (radiology acknowledged receipt)
					currentStep = "ancillary_payment_clearance"
					startedAt = row.imagingOrderReceivedAt
					stepTarget = paymentTgt
					stepNote = "Timing source: imaging order received at radiology (TOR Flow 3 Step 1->2 authoritative checkpoint)"
				} else if (row.scheduledDatetime !== null) {
					// Proxy fallback when imagingOrderReceivedAt not yet captured
					currentStep = "ancillary_payment_clearance"
					startedAt = row.scheduledDatetime
					stepTarget = paymentTgt
					stepNote = "Timing source: procedure scheduled datetime (TOR Flow 3 Step 1->2 proxy — imagingOrderReceivedAt not set)"
				} else {
					currentStep = "ancillary_order_receipt"
					startedAt = row.createdAt
					stepTarget = orderReceiptTgt
					stepNote = "Timing source: imaging order creation (TOR Flow 3 Step 1 - awaiting radiology receipt acknowledgment)"
				}
				const elapsed = Math.floor((now.getTime() - startedAt.getTime()) / 60000)
				const status = computeSlaStatus(elapsed, stepTarget, slaConfig.warningThresholdPct)
				if (statusFilter && status !== statusFilter) continue
				// SLA-014: currentStep reflects which of the 4 Flow 3 steps is currently in progress
				events.push({
					id: row.id, facilityId: row.facilityId, encounterId: row.encounterId,
					patientId: null, patientName: null,
					workflowType, startedAt, completedAt: null,
					targetMinutes: stepTarget, elapsedMinutes: elapsed, status,
					escalatedAt: null, escalatedToStaffId: null,
					notes: stepNote,
					createdAt: row.createdAt,
					currentStep,
				})
			}
			const total = countRow?.total ?? 0
			return { data: events, total, page, limit, totalPages: Math.ceil(total / limit) }
		}
		if (workflowType === "medical_records") {
			// SLA-006: resolve effective step target (facility override > TOR default for records_processing_release)
			const effectiveTarget = await resolveStepTargetByType(facilityId, "records_processing_release")
			const where = and(
				eq(medicalRecordsRequests.facilityId, facilityId),
				inArray(medicalRecordsRequests.status, ["pending", "processing"]),
				// SLA-022: exclude medical_certificate requests — they are tracked under certificate_issuance
				// to prevent double-counting the same Flow 7 request across two admin SLA workflows
				ne(medicalRecordsRequests.requestType, "medical_certificate"),
			)
			const rows = await db
				.select({
					id: medicalRecordsRequests.id,
					facilityId: medicalRecordsRequests.facilityId,
					encounterId: medicalRecordsRequests.encounterId,
					createdAt: medicalRecordsRequests.createdAt,
					status: medicalRecordsRequests.status,
					// SLA-020: evidence fields for authoritative classification
					identityVerified: medicalRecordsRequests.identityVerified,
					dpaConsentObtained: medicalRecordsRequests.dpaConsentObtained,
					// SLA-022: payment checkpoint — drives records_payment live step
					paidAt: medicalRecordsRequests.paidAt,
					// SLA-022: release audit — drives records_processing_release live step
					releasedAt: medicalRecordsRequests.releasedAt,
				})
				.from(medicalRecordsRequests)
				.where(where)
				.orderBy(desc(medicalRecordsRequests.createdAt))
				.limit(limit)
				.offset(offset)
			const [countRow] = await db.select({ total: count() }).from(medicalRecordsRequests).where(where)
			for (const row of rows) {
				const elapsed = Math.floor((now.getTime() - row.createdAt.getTime()) / 60000)
				const status = computeSlaStatus(elapsed, effectiveTarget, slaConfig.warningThresholdPct)
				if (statusFilter && status !== statusFilter) continue
				// SLA-022: derive current step from releasedAt > processing > paidAt > default
				const currentStep = row.releasedAt
					? "records_processing_release"
					: (row.status === "processing" ? "records_processing_release" : (row.paidAt ? "records_payment" : "records_request"))
				// SLA-020: annotate note with evidence state so monitoring staff can see gaps
				const evidenceNote = row.identityVerified && row.dpaConsentObtained
					? "Evidence: identity verified ✓, DPA consent ✓ — authoritative Step 1 checkpoint"
					: `Evidence gaps: ${!row.identityVerified ? "identity not verified" : ""}${!row.identityVerified && !row.dpaConsentObtained ? ", " : ""}${!row.dpaConsentObtained ? "DPA consent not captured" : ""} — Step 1 proxy until resolved`
				events.push({
					id: row.id, facilityId: row.facilityId, encounterId: row.encounterId,
					patientId: null, patientName: null,
					workflowType, startedAt: row.createdAt, completedAt: null,
					targetMinutes: effectiveTarget, elapsedMinutes: elapsed, status,
					escalatedAt: null, escalatedToStaffId: null,
					notes: evidenceNote,
					createdAt: row.createdAt,
					currentStep,
				})
			}
			const total = countRow?.total ?? 0
			return { data: events, total, page, limit, totalPages: Math.ceil(total / limit) }
		}

		if (workflowType === "discharge" || workflowType === "medication_dispensing") {
			const evtWorkflow = workflowType === "discharge" ? "discharge" : "pharmacy"
			const where = and(
				eq(encounterStatusEvents.facilityId, facilityId),
				eq(encounterStatusEvents.workflowType, evtWorkflow as "discharge" | "pharmacy"),
				isNull(encounterStatusEvents.actualMinutes),
			)
			const rows = await db
				.select({
					id: encounterStatusEvents.id,
					facilityId: encounterStatusEvents.facilityId,
					encounterId: encounterStatusEvents.encounterId,
					occurredAt: encounterStatusEvents.occurredAt,
					escalatedAt: encounterStatusEvents.escalatedAt,
					escalatedToStaffId: encounterStatusEvents.staffId,
					notes: encounterStatusEvents.notes,
				})
				.from(encounterStatusEvents)
				.where(where)
				.orderBy(desc(encounterStatusEvents.occurredAt))
				.limit(limit)
				.offset(offset)
			const [countRow] = await db
				.select({ total: count() })
				.from(encounterStatusEvents)
				.where(where)
			for (const row of rows) {
				const elapsed = Math.floor((now.getTime() - row.occurredAt.getTime()) / 60000)
				const status = computeSlaStatus(elapsed, slaConfig.targetMinutes, slaConfig.warningThresholdPct)
				if (statusFilter && status !== statusFilter) continue
				events.push({
					id: row.id, facilityId: row.facilityId, encounterId: row.encounterId,
					patientId: null, patientName: null,
					workflowType, startedAt: row.occurredAt, completedAt: null,
					targetMinutes: slaConfig.targetMinutes, elapsedMinutes: elapsed, status,
					escalatedAt: row.escalatedAt, escalatedToStaffId: row.escalatedToStaffId,
					notes: row.notes ?? "Timing source: workflow step event occurrence (checkpoint-accurate)",
					createdAt: row.occurredAt,
				})
			}
			const total = countRow?.total ?? 0
			return { data: events, total, page, limit, totalPages: Math.ceil(total / limit) }
		}

		if (workflowType === "billing_processing") {
			// SLA-005: Read active billing workflows from the event stream
			// (populated by generateInvoice, finalizeInvoice, recordPayment).
			// Open steps (actualMinutes IS NULL) represent in-progress billing.
			const where = and(
				eq(encounterStatusEvents.facilityId, facilityId),
				eq(encounterStatusEvents.workflowType, "billing"),
				isNull(encounterStatusEvents.actualMinutes),
			)
			const rows = await db
				.select({
					id: encounterStatusEvents.id,
					facilityId: encounterStatusEvents.facilityId,
					encounterId: encounterStatusEvents.encounterId,
					occurredAt: encounterStatusEvents.occurredAt,
					escalatedAt: encounterStatusEvents.escalatedAt,
					staffId: encounterStatusEvents.staffId,
					notes: encounterStatusEvents.notes,
				})
				.from(encounterStatusEvents)
				.where(where)
				.orderBy(desc(encounterStatusEvents.occurredAt))
				.limit(limit)
				.offset(offset)
			const [countRow] = await db.select({ total: count() }).from(encounterStatusEvents).where(where)
			for (const row of rows) {
				const elapsed = Math.floor((now.getTime() - row.occurredAt.getTime()) / 60000)
				const status = computeSlaStatus(elapsed, slaConfig.targetMinutes, slaConfig.warningThresholdPct)
				if (statusFilter && status !== statusFilter) continue
				events.push({
					id: row.id, facilityId: row.facilityId, encounterId: row.encounterId,
					patientId: null, patientName: null,
					workflowType, startedAt: row.occurredAt, completedAt: null,
					targetMinutes: slaConfig.targetMinutes, elapsedMinutes: elapsed, status,
					escalatedAt: row.escalatedAt, escalatedToStaffId: row.staffId,
					notes: row.notes ?? "Timing source: billing workflow event occurrence (checkpoint-accurate)",
					createdAt: row.occurredAt,
				})
			}
			const total = countRow?.total ?? 0
			return { data: events, total, page, limit, totalPages: Math.ceil(total / limit) }
		}

		if (workflowType === "surgical_scheduling") {
			// SLA-002: Surgical scheduling — operation records still in draft measure elapsed
			// time from OR record creation (proxy) since no dedicated scheduling-request
			// checkpoint exists in the current schema. This workflow is tagged as proxy timing
			// in the compliance report and should NOT be cited as authoritative ARTA evidence
			// until a surgical-scheduling-request event stream is instrumented.
			const where = and(
				eq(operationRecords.facilityId, facilityId),
				eq(operationRecords.status, "draft"),
			)
			const rows = await db
				.select({
					id: operationRecords.id,
					facilityId: operationRecords.facilityId,
					encounterId: operationRecords.encounterId,
					createdAt: operationRecords.createdAt,
					// SLA-005: authoritative checkpoint when surgery is formally requested
					schedulingRequestedAt: operationRecords.schedulingRequestedAt,
				})
				.from(operationRecords)
				.where(where)
				.orderBy(desc(operationRecords.createdAt))
				.limit(limit)
				.offset(offset)
			const [countRow] = await db
				.select({ total: count() })
				.from(operationRecords)
				.where(where)
				for (const row of rows) {
				// SLA-005: prefer schedulingRequestedAt as start when available
				const startedAt = row.schedulingRequestedAt ?? row.createdAt
				const isCheckpoint = row.schedulingRequestedAt !== null
				const elapsed = Math.floor((now.getTime() - startedAt.getTime()) / 60000)
				const status = computeSlaStatus(elapsed, slaConfig.targetMinutes, slaConfig.warningThresholdPct)
				if (statusFilter && status !== statusFilter) continue
				events.push({
					id: row.id, facilityId: row.facilityId, encounterId: row.encounterId,
					patientId: null, patientName: null,
					workflowType, startedAt, completedAt: null,
					targetMinutes: slaConfig.targetMinutes, elapsedMinutes: elapsed, status,
					escalatedAt: null, escalatedToStaffId: null,
					notes: isCheckpoint
						? "Timing source: scheduling request datetime (TOR Flow 5 Step 1 authoritative checkpoint — accurate)"
						: "Timing source: OR record creation (proxy — schedulingRequestedAt not yet set)",
					createdAt: row.createdAt,
				})
			}
			const total = countRow?.total ?? 0
			return { data: events, total, page, limit, totalPages: Math.ceil(total / limit) }
		}

		if (workflowType === "certificate_issuance") {
			// SLA-001 / Flow 7: Certificate Issuance includes:
			//   1. Medical certificates from medicalRecordsRequests (requestType = "medical_certificate")
			//   2. Birth registration certificates (draft/completed)
			//   3. Death report certificates (draft/completed)
			// SLA-006: resolve effective step target (facility override > TOR default for records_processing_release)
			const effectiveTarget = await resolveStepTargetByType(facilityId, "records_processing_release")
			const medCertWhere = and(
				eq(medicalRecordsRequests.facilityId, facilityId),
				eq(medicalRecordsRequests.requestType, "medical_certificate"),
				inArray(medicalRecordsRequests.status, ["pending", "processing"]),
			)
			const medCertRows = await db
				.select({
					id: medicalRecordsRequests.id,
					facilityId: medicalRecordsRequests.facilityId,
					encounterId: medicalRecordsRequests.encounterId,
					createdAt: medicalRecordsRequests.createdAt,
					status: medicalRecordsRequests.status,
					paidAt: medicalRecordsRequests.paidAt,
					// SLA-022: evidence fields for truthful certificate step notes
					identityVerified: medicalRecordsRequests.identityVerified,
					dpaConsentObtained: medicalRecordsRequests.dpaConsentObtained,
					// SLA-022: release audit checkpoint for Flow 7 Step 3
					releasedAt: medicalRecordsRequests.releasedAt,
				})
				.from(medicalRecordsRequests)
				.where(medCertWhere)

			const birthWhere = and(
				eq(birthRegistrations.facilityId, facilityId),
				// SLA-021: only show birth registrations that are genuinely in-progress (draft).
				// "completed" means the certificate was issued and there is no open SLA window.
				inArray(birthRegistrations.status, ["draft"]),
			)
			const birthRows = await db
				.select({
					id: birthRegistrations.id,
					facilityId: birthRegistrations.facilityId,
					encounterId: birthRegistrations.encounterId,
					createdAt: birthRegistrations.createdAt,
					// SLA-005: authoritative checkpoint when the family submits the registration request
					requestedAt: birthRegistrations.requestedAt,
					// SLA-015: authoritative checkpoint when payment is received for the birth certificate
					paidAt: birthRegistrations.paidAt,
					// SLA-021: authoritative checkpoint when the certificate is released to the family
					releasedAt: birthRegistrations.releasedAt,
					status: birthRegistrations.status,
				})
				.from(birthRegistrations)
				.where(birthWhere)

			const deathWhere = and(
				eq(deathReports.facilityId, facilityId),
				// SLA-018: only show death reports that are genuinely in-progress (draft).
				// "completed" status means the certificate was issued in a single write
				// and there is no open SLA window to monitor — exclude them from active monitoring.
				inArray(deathReports.status, ["draft"]),
			)
			const deathRows = await db
				.select({
					id: deathReports.id,
					facilityId: deathReports.facilityId,
					encounterId: deathReports.encounterId,
					createdAt: deathReports.createdAt,
					// SLA-005: authoritative checkpoint when the family submits the certificate request
					requestedAt: deathReports.requestedAt,
					// SLA-015: authoritative checkpoint when payment is received for the death certificate
					paidAt: deathReports.paidAt,
					// SLA-021: authoritative checkpoint when the certificate is released to the family
					releasedAt: deathReports.releasedAt,
					status: deathReports.status,
				})
				.from(deathReports)
				.where(deathWhere)

			const allCertRows = [
				...medCertRows.map(r => ({
					...r,
					requestedAt: null as Date | null,
					releasedAt: r.releasedAt ?? null,
					identityVerified: r.identityVerified,
					dpaConsentObtained: r.dpaConsentObtained,
					source: "medical_certificate" as const,
				})),
				...birthRows.map(r => ({
					...r,
					encounterId: r.encounterId ?? null,
					releasedAt: r.releasedAt ?? null,
					identityVerified: false,
					dpaConsentObtained: false,
					source: "birth_registration" as const,
				})),
				...deathRows.map(r => ({
					...r,
					encounterId: r.encounterId ?? null,
					releasedAt: r.releasedAt ?? null,
					identityVerified: false,
					dpaConsentObtained: false,
					source: "death_report" as const,
				})),
			].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

			const total = allCertRows.length
			const pageRows = allCertRows.slice(offset, offset + limit)
			for (const row of pageRows) {
				// SLA-005: use requestedAt as start when available
				const startedAt = row.requestedAt ?? row.createdAt
				const isCheckpoint = row.requestedAt !== null
				const elapsed = Math.floor((now.getTime() - startedAt.getTime()) / 60000)
				const status = computeSlaStatus(elapsed, effectiveTarget, slaConfig.warningThresholdPct)
				if (statusFilter && status !== statusFilter) continue
				// SLA-022: medical certificate notes derived from stored identity/DPA evidence
				// SLA-021: birth/death cert notes reflect requestedAt checkpoint availability
				const certNote =
					row.source === "medical_certificate"
						? (row.identityVerified && row.dpaConsentObtained
							? "Evidence: identity verified ✓, DPA consent ✓ — TOR Flow 7 Step 1 authoritative checkpoint"
							: `Evidence gaps: ${!row.identityVerified ? "identity not verified" : ""}${!row.identityVerified && !row.dpaConsentObtained ? ", " : ""}${!row.dpaConsentObtained ? "DPA consent not captured" : ""} — Step 1 proxy until resolved`)
						: isCheckpoint
							? `Timing source: ${row.source === "birth_registration" ? "birth" : "death"} cert request receipt (TOR Flow 7, Step 1 checkpoint — accurate)`
							: `Timing source: ${row.source === "birth_registration" ? "birth registration" : "death report"} creation (proxy — requestedAt not yet set)`
				// SLA-021/SLA-022: derive current step from releasedAt > paidAt > default
				const certStep: string = row.releasedAt
					? "records_processing_release"
					: (row.paidAt ? "records_payment" : "records_request")
				events.push({
					id: row.id, facilityId: row.facilityId, encounterId: row.encounterId ?? null,
					patientId: null, patientName: null,
					workflowType, startedAt, completedAt: null,
					targetMinutes: effectiveTarget, elapsedMinutes: elapsed, status,
					escalatedAt: null, escalatedToStaffId: null, notes: certNote, createdAt: row.createdAt,
					currentStep: certStep,
				})
			}
			return { data: events, total, page, limit, totalPages: Math.ceil(total / limit) }
		}

		// Fallback: no handler for this workflow type
		return { data: [], total: 0, page, limit, totalPages: 0 }
	}

	async getEventsByEncounter(encounterId: string): Promise<SlaEvent[]> {
		const [encounterRow] = await db
			.select({
				id: encounters.id,
				facilityId: encounters.facilityId,
				patientId: encounters.patientId,
				firstName: patients.firstName,
				lastName: patients.lastName,
				encounterType: encounters.encounterType,
				admissionDatetime: encounters.admissionDatetime,
				dischargeDatetime: encounters.dischargeDatetime,
			})
			.from(encounters)
			.innerJoin(patients, eq(encounters.patientId, patients.id))
			.where(eq(encounters.id, encounterId))
			.limit(1)

		if (!encounterRow) return []

		const workflowType = ENCOUNTER_TYPE_TO_WORKFLOW[encounterRow.encounterType] ?? "opd_consultation"
		const [config] = await db
			.select()
			.from(slaConfigs)
			.where(
				and(
					eq(slaConfigs.facilityId, encounterRow.facilityId),
					eq(slaConfigs.workflowType, workflowType),
					eq(slaConfigs.isActive, true)
				)
			)
			.limit(1)

		if (!config) return []

		const now = new Date()
		const startedAt = encounterRow.admissionDatetime
		const completedAt = encounterRow.dischargeDatetime
		const elapsed = Math.floor(((completedAt ?? now).getTime() - startedAt.getTime()) / 60000)
		const status = computeSlaStatus(elapsed, config.targetMinutes, config.warningThresholdPct)

		return [
			{
				id: encounterRow.id,
				facilityId: encounterRow.facilityId,
				encounterId: encounterRow.id,
				patientId: encounterRow.patientId,
				patientName: `${encounterRow.firstName} ${encounterRow.lastName}`,
				workflowType,
				startedAt,
				completedAt: completedAt ?? null,
				targetMinutes: config.targetMinutes,
				elapsedMinutes: elapsed,
				status,
				escalatedAt: null,
				escalatedToStaffId: null,
				notes: null,
				createdAt: startedAt,
			},
		]
	}

	// ========================================================================
	// SLA Configs
	// ========================================================================

	async listConfigs(query: SlaConfigsQuery): Promise<SlaConfigsResponse> {
		const conditions = []
		if (query.facilityId) {
			conditions.push(eq(slaConfigs.facilityId, query.facilityId))
		}

		const rows = await db
			.select()
			.from(slaConfigs)
			.where(conditions.length > 0 ? and(...conditions) : undefined)
			.orderBy(slaConfigs.workflowType)

		return {
			data: rows.map(r => ({
				id: r.id,
				facilityId: r.facilityId,
				workflowType: r.workflowType,
				targetMinutes: r.targetMinutes,
				warningThresholdPct: r.warningThresholdPct,
				isActive: r.isActive,
				description: r.description,
				createdAt: r.createdAt,
				updatedAt: r.updatedAt,
			})),
		}
	}

	async createConfig(input: CreateSlaConfig): Promise<SlaConfig> {
		const [row] = await db
			.insert(slaConfigs)
			.values({
				facilityId: input.facilityId,
				workflowType: input.workflowType,
				targetMinutes: input.targetMinutes,
				warningThresholdPct: input.warningThresholdPct,
				description: input.description,
			})
			.returning()

		if (!row) throw new Error("Failed to create SLA config")

		return {
			id: row.id,
			facilityId: row.facilityId,
			workflowType: row.workflowType,
			targetMinutes: row.targetMinutes,
			warningThresholdPct: row.warningThresholdPct,
			isActive: row.isActive,
			description: row.description,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		}
	}

	async updateConfig(input: UpdateSlaConfig): Promise<SlaConfig> {
		const updates: Partial<typeof slaConfigs.$inferInsert> = { updatedAt: new Date() }
		if (input.workflowType !== undefined) updates.workflowType = input.workflowType
		if (input.targetMinutes !== undefined) updates.targetMinutes = input.targetMinutes
		if (input.warningThresholdPct !== undefined) updates.warningThresholdPct = input.warningThresholdPct
		if (input.description !== undefined) updates.description = input.description
		if (input.isActive !== undefined) updates.isActive = input.isActive

		const [row] = await db
			.update(slaConfigs)
			.set(updates)
			.where(eq(slaConfigs.id, input.id))
			.returning()

		if (!row) throw new NotFoundException(`SLA config with id ${input.id} not found`)

		return {
			id: row.id,
			facilityId: row.facilityId,
			workflowType: row.workflowType,
			targetMinutes: row.targetMinutes,
			warningThresholdPct: row.warningThresholdPct,
			isActive: row.isActive,
			description: row.description,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		}
	}

	async deleteConfig(id: string): Promise<{ success: boolean }> {
		const [row] = await db.delete(slaConfigs).where(eq(slaConfigs.id, id)).returning({ id: slaConfigs.id })
		if (!row) throw new NotFoundException(`SLA config with id ${id} not found`)
		return { success: true }
	}

	// ========================================================================
	// SLA Compliance Report
	// ========================================================================

	async getComplianceReport(query: SlaComplianceQuery): Promise<SlaComplianceReport> {
		const periodStart = new Date(query.periodStart)
		const periodEnd = new Date(query.periodEnd)
		const now = new Date()

		const facilityConfigs = await db
			.select()
			.from(slaConfigs)
			.where(and(eq(slaConfigs.facilityId, query.facilityId), eq(slaConfigs.isActive, true)))

		const configByWorkflow = new Map(facilityConfigs.map(c => [c.workflowType, c]))

		const metricsByWorkflow = new Map<SlaWorkflowType, WorkflowMetrics>()

		// SLA-001: Count one metric per encounter (not per status-event row) to avoid
		// double-counting multi-step workflows.  Measure total encounter duration from
		// admission to discharge (or now for still-active encounters).
		const encounterComplianceRows = await db
			.select({
				id: encounters.id,
				encounterType: encounters.encounterType,
				admissionDatetime: encounters.admissionDatetime,
				dischargeDatetime: encounters.dischargeDatetime,
			})
			.from(encounters)
			.where(
				and(
					eq(encounters.facilityId, query.facilityId),
					inArray(encounters.encounterType, ["outpatient", "telemedicine", "emergency", "inpatient"]),
					gte(encounters.admissionDatetime, periodStart),
					lte(encounters.admissionDatetime, periodEnd),
				)
			)

		for (const row of encounterComplianceRows) {
			const workflowType = ENCOUNTER_TYPE_TO_WORKFLOW[row.encounterType] ?? "opd_consultation"
			const config = configByWorkflow.get(workflowType)
			if (!config) continue

			// SLA-011: admission compliance comes from Flow 4 routing step events, not encounter duration.
			// Full inpatient stay length is not the TOR Flow 4 routing window.
			if (workflowType === "admission") continue

			const elapsed = Math.floor(
				((row.dischargeDatetime ?? now).getTime() - row.admissionDatetime.getTime()) / 60000,
			)
			const status = computeSlaStatus(elapsed, config.targetMinutes, config.warningThresholdPct)

			const existing = metricsByWorkflow.get(workflowType) ?? {
				total: 0,
				onTime: 0,
				approaching: 0,
				exceeded: 0,
				totalElapsed: 0,
				targetMinutes: config.targetMinutes,
				checkpointCount: 0,
			}
			existing.total++
			existing.totalElapsed += elapsed
			if (status === "on_time") existing.onTime++
			else if (status === "approaching") existing.approaching++
			else existing.exceeded++
			metricsByWorkflow.set(workflowType, existing)
		}

		// Extend compliance report with non-encounter workflow sources
		for (const workflowType of NON_ENCOUNTER_WORKFLOW_SOURCES) {
			const config = configByWorkflow.get(workflowType)
			if (!config) continue
			const nonEncounterMetrics = await this.complianceMetricsForNonEncounterWorkflow(
				query.facilityId, workflowType, config, periodStart, periodEnd,
			)
			if (nonEncounterMetrics.total > 0) {
				metricsByWorkflow.set(workflowType, nonEncounterMetrics)
			}
		}

		// SLA-011: admission compliance from Flow 4 routing step events (not encounter duration).
		// Uses encounterStatusEvents.workflowType = 'admission' as the authoritative timing source.
		const admissionConfig = configByWorkflow.get("admission")
		if (admissionConfig) {
			const admissionMetrics = await this.complianceMetricsForAdmissionWorkflow(
				query.facilityId, admissionConfig, periodStart, periodEnd,
			)
			if (admissionMetrics.total > 0) {
				metricsByWorkflow.set("admission", admissionMetrics)
			}
		}

		// Mapping: SLA workflow type → encounterStatusEvents.workflowType for step metrics
		// SLA-013: lab_result and radiology_result use per-order step metrics generated by
		// complianceMetricsForNonEncounterWorkflow. Removing them here prevents the shared
		// ancillary event stream from producing mixed lab+radiology drilldown rows.
		const SLA_TO_EVENT_WORKFLOW: Partial<Record<SlaWorkflowType, "opd" | "ed" | "admission" | "discharge" | "ancillary" | "pharmacy" | "billing">> = {
			opd_consultation: "opd",
			emergency_triage: "ed",
			admission: "admission",
			discharge: "discharge",
			medication_dispensing: "pharmacy",
			billing_processing: "billing",
		}

		// Build step metrics in parallel for encounter-backed workflows
		const stepMetricsByWorkflow = new Map<SlaWorkflowType, SlaStepMetric[]>()
		const stepMetricPromises = Array.from(metricsByWorkflow.keys())
			.filter(wt => SLA_TO_EVENT_WORKFLOW[wt] !== undefined)
			.map(async wt => {
				const evtWorkflow = SLA_TO_EVENT_WORKFLOW[wt]!
				const config = configByWorkflow.get(wt)
				const steps = await this.getStepComplianceForEncounterWorkflow(
					query.facilityId, evtWorkflow, periodStart, periodEnd, config?.warningThresholdPct ?? 80,
				)
				if (steps.length > 0) stepMetricsByWorkflow.set(wt, steps)
			})
		await Promise.all(stepMetricPromises)

		// SLA-007: pull step metrics embedded in non-encounter WorkflowMetrics
		// (medical_records and certificate_issuance) into the shared stepMetricsByWorkflow map
		for (const [wt, m] of metricsByWorkflow) {
			if (m.stepMetrics && m.stepMetrics.length > 0 && !stepMetricsByWorkflow.has(wt)) {
				stepMetricsByWorkflow.set(wt, m.stepMetrics)
			}
		}

		const metrics = Array.from(metricsByWorkflow.entries()).map(([workflowType, m]) => ({
			workflowType,
			totalCount: m.total,
			onTimeCount: m.onTime,
			approachingCount: m.approaching,
			exceededCount: m.exceeded,
			compliancePct: m.total > 0 ? Math.round(((m.onTime + m.approaching) / m.total) * 100) : 100,
			avgElapsedMinutes: m.total > 0 ? Math.round(m.totalElapsed / m.total) : 0,
			avgTargetMinutes: m.targetMinutes,
			stepMetrics: stepMetricsByWorkflow.get(workflowType),
			// SLA-005: dynamic timing accuracy based on how many records have authoritative
			// checkpoint timestamps vs. proxy createdAt. Encounter-backed workflows are always
			// "checkpoint" because status events are written at the real transition moment.
			timingAccuracy: (() => {
				if (m.total === 0) return "checkpoint" as const
				if (m.checkpointCount === m.total) return "checkpoint" as const
				if (m.checkpointCount > 0) return "partial" as const
				// Non-encounter workflows with no checkpoint fields fall back to "proxy"
				return "proxy" as const
			})(),
		}))

		const totalEncounters = metrics.reduce((s, m) => s + m.totalCount, 0)
		const compliantEncounters = metrics.reduce((s, m) => s + m.onTimeCount + m.approachingCount, 0)
		const overallCompliancePct =
			totalEncounters > 0 ? Math.round((compliantEncounters / totalEncounters) * 100) : 100

		// SLA-010: Separate authoritative (checkpoint-only) aggregate from the operational score.
		// Only include workflows with timingAccuracy === "checkpoint" — these are the only ones
		// backed by a real workflow-event timestamp and eligible for ARTA compliance evidence.
		const authoritativeMetrics = metrics.filter(m => m.timingAccuracy === "checkpoint")
		const authoritativeCount = authoritativeMetrics.reduce((s, m) => s + m.totalCount, 0)
		const authoritativeOnTimeCount = authoritativeMetrics.reduce((s, m) => s + m.onTimeCount + m.approachingCount, 0)
		const authoritativeCompliancePct =
			authoritativeCount > 0 ? Math.round((authoritativeOnTimeCount / authoritativeCount) * 100) : 100

		return {
			facilityId: query.facilityId,
			periodStart: query.periodStart,
			periodEnd: query.periodEnd,
			overallCompliancePct,
			authoritativeCompliancePct,
			authoritativeCount,
			authoritativeOnTimeCount,
			metrics,
		}
	}

	// ========================================================================
	// Private helper: period-bounded compliance metrics for non-encounter workflows
	// ========================================================================

	private async complianceMetricsForNonEncounterWorkflow(
		facilityId: string,
		workflowType: SlaWorkflowType,
		config: typeof slaConfigs.$inferSelect,
		periodStart: Date,
		periodEnd: Date,
	): Promise<WorkflowMetrics> {
		const now = new Date()
		const metrics: WorkflowMetrics = {
			total: 0, onTime: 0, approaching: 0, exceeded: 0, totalElapsed: 0,
			targetMinutes: config.targetMinutes,
			checkpointCount: 0,
		}

		// SLA-006: resolvedTarget may be overridden per-branch by resolveStepTargetByType.
		// accumulateStatus closes over this variable so the override takes effect immediately.
		let resolvedTarget = config.targetMinutes
		const accumulateStatus = (elapsed: number) => {
			const status = computeSlaStatus(elapsed, resolvedTarget, config.warningThresholdPct)
			metrics.total++
			metrics.totalElapsed += elapsed
			if (status === "on_time") metrics.onTime++
			else if (status === "approaching") metrics.approaching++
			else metrics.exceeded++
		}

		if (workflowType === "lab_result") {
			// SLA-014: resolve targets for all 4 Flow 3 ancillary steps
			const [receiptTgt, paymentTgt, procedureTgt, releaseTgt] = await Promise.all([
				resolveStepTargetByType(facilityId, "ancillary_order_receipt"),
				resolveStepTargetByType(facilityId, "ancillary_payment_clearance"),
				resolveStepTargetByType(facilityId, "ancillary_procedure"),
				resolveStepTargetByType(facilityId, "ancillary_release"),
			])
			resolvedTarget = releaseTgt
			metrics.targetMinutes = releaseTgt
			const rows = await db
				.select({
					createdAt: labOrders.createdAt,
					specimenReceivedAt: labOrders.specimenReceivedAt,
					billingClearedAt: labOrders.billingClearedAt,
					collectionDatetime: labOrders.collectionDatetime,
					resultedDatetime: labOrders.resultedDatetime,
				})
				.from(labOrders)
				.where(and(eq(labOrders.facilityId, facilityId), gte(labOrders.createdAt, periodStart), lte(labOrders.createdAt, periodEnd)))
			// SLA-014: step accumulators for all 4 ancillary steps
			const receiptStep = { n: 0, onTime: 0, approaching: 0, exceeded: 0, totalElapsed: 0 }
			const paymentStep = { n: 0, onTime: 0, approaching: 0, exceeded: 0, totalElapsed: 0 }
			const procedureStep = { n: 0, onTime: 0, approaching: 0, exceeded: 0, totalElapsed: 0 }
			const releaseStep = { n: 0, onTime: 0, approaching: 0, exceeded: 0, totalElapsed: 0 }
			const accumAncStep = (acc: typeof receiptStep, elapsed: number, tgt: number) => {
				const s = computeSlaStatus(elapsed, tgt, config.warningThresholdPct)
				acc.n++; acc.totalElapsed += elapsed
				if (s === "on_time") acc.onTime++
				else if (s === "approaching") acc.approaching++
				else acc.exceeded++
			}
			// SLA-005: prefer specimenReceivedAt (lab confirms receipt) > collectionDatetime > createdAt
			for (const row of rows) {
				const startedAt = row.specimenReceivedAt ?? row.collectionDatetime ?? row.createdAt
				if (row.specimenReceivedAt !== null) metrics.checkpointCount++
				// Overall end-to-end metric (existing behaviour)
				accumulateStatus(Math.floor(((row.resultedDatetime ?? now).getTime() - startedAt.getTime()) / 60000))
				// SLA-014: Step 1 — order created -> specimen received at lab
				if (row.specimenReceivedAt) {
					accumAncStep(receiptStep, Math.floor((row.specimenReceivedAt.getTime() - row.createdAt.getTime()) / 60000), receiptTgt)
				}
				// SLA-014: Step 2 — specimen received -> billing cleared
				if (row.specimenReceivedAt && row.billingClearedAt) {
					accumAncStep(paymentStep, Math.floor((row.billingClearedAt.getTime() - row.specimenReceivedAt.getTime()) / 60000), paymentTgt)
				}
				// SLA-014: Step 3 — billing cleared -> specimen collected
				if (row.billingClearedAt && row.collectionDatetime) {
					accumAncStep(procedureStep, Math.floor((row.collectionDatetime.getTime() - row.billingClearedAt.getTime()) / 60000), procedureTgt)
				}
				// SLA-014: Step 4 — overall release timing (all orders)
				accumAncStep(releaseStep, Math.floor(((row.resultedDatetime ?? now).getTime() - startedAt.getTime()) / 60000), releaseTgt)
			}
			const makeLabStep = (stepStatus: string, stepLabel: string, acc: typeof receiptStep, tgt: number): SlaStepMetric => ({
				stepStatus,
				stepLabel,
				totalCount: acc.n,
				onTimeCount: acc.onTime,
				approachingCount: acc.approaching,
				exceededCount: acc.exceeded,
				compliancePct: acc.n > 0 ? Math.round(((acc.onTime + acc.approaching) / acc.n) * 100) : 100,
				avgElapsedMinutes: acc.n > 0 ? Math.round(acc.totalElapsed / acc.n) : 0,
				avgTargetMinutes: tgt,
			})
			const labStepMetrics: SlaStepMetric[] = []
			if (receiptStep.n > 0) labStepMetrics.push(makeLabStep("ancillary_order_receipt", "Lab Order Receipt (Flow 3, Step 1 - Lab)", receiptStep, receiptTgt))
			if (paymentStep.n > 0) labStepMetrics.push(makeLabStep("ancillary_payment_clearance", "Lab Payment Clearance (Flow 3, Step 2 - Lab)", paymentStep, paymentTgt))
			if (procedureStep.n > 0) labStepMetrics.push(makeLabStep("ancillary_procedure", "Lab Specimen Procedure (Flow 3, Step 3 - Lab)", procedureStep, procedureTgt))
			// SLA-013: always emit release step (overall lab result timing)
			if (metrics.total > 0) labStepMetrics.push(makeLabStep("ancillary_release", "Lab Result Release (Flow 3, Step 4 - Lab)", releaseStep, releaseTgt))
			if (labStepMetrics.length > 0) metrics.stepMetrics = labStepMetrics
			return metrics
		}
		if (workflowType === "radiology_result") {
			// SLA-014: resolve targets for all 4 Flow 3 ancillary steps
			const [receiptTgt, paymentTgt, procedureTgt, releaseTgt] = await Promise.all([
				resolveStepTargetByType(facilityId, "ancillary_order_receipt"),
				resolveStepTargetByType(facilityId, "ancillary_payment_clearance"),
				resolveStepTargetByType(facilityId, "ancillary_procedure"),
				resolveStepTargetByType(facilityId, "ancillary_release"),
			])
			resolvedTarget = releaseTgt
			metrics.targetMinutes = releaseTgt
			const rows = await db
				.select({
					createdAt: imagingOrders.createdAt,
					scheduledDatetime: imagingOrders.scheduledDatetime,
					// SLA-019: authoritative receipt checkpoint (replaces scheduledDatetime proxy for Step 1)
					imagingOrderReceivedAt: imagingOrders.imagingOrderReceivedAt,
					studyStartedAt: imagingOrders.studyStartedAt,
					billingClearedAt: imagingOrders.billingClearedAt,
					completedDatetime: imagingOrders.completedDatetime,
				})
				.from(imagingOrders)
				.where(and(eq(imagingOrders.facilityId, facilityId), gte(imagingOrders.createdAt, periodStart), lte(imagingOrders.createdAt, periodEnd)))
			// SLA-014: step accumulators for all 4 ancillary steps
			const receiptStep = { n: 0, onTime: 0, approaching: 0, exceeded: 0, totalElapsed: 0 }
			const paymentStep = { n: 0, onTime: 0, approaching: 0, exceeded: 0, totalElapsed: 0 }
			const procedureStep = { n: 0, onTime: 0, approaching: 0, exceeded: 0, totalElapsed: 0 }
			const releaseStep = { n: 0, onTime: 0, approaching: 0, exceeded: 0, totalElapsed: 0 }
			const accumAncStep = (acc: typeof receiptStep, elapsed: number, tgt: number) => {
				const s = computeSlaStatus(elapsed, tgt, config.warningThresholdPct)
				acc.n++; acc.totalElapsed += elapsed
				if (s === "on_time") acc.onTime++
				else if (s === "approaching") acc.approaching++
				else acc.exceeded++
			}
			// SLA-019: prefer imagingOrderReceivedAt (radiology acknowledges receipt) > studyStartedAt > scheduledDatetime > createdAt
			for (const row of rows) {
				const startedAt = row.imagingOrderReceivedAt ?? row.studyStartedAt ?? row.scheduledDatetime ?? row.createdAt
				// SLA-019: checkpointCount requires imagingOrderReceivedAt to be authoritative for ARTA Step 1 classification
				if (row.imagingOrderReceivedAt !== null) metrics.checkpointCount++
				// Overall end-to-end metric (existing behaviour)
				accumulateStatus(Math.floor(((row.completedDatetime ?? now).getTime() - startedAt.getTime()) / 60000))
				// SLA-014/SLA-019: Step 1 — order created -> received at radiology (authoritative) or scheduled (proxy)
				if (row.imagingOrderReceivedAt) {
					accumAncStep(receiptStep, Math.floor((row.imagingOrderReceivedAt.getTime() - row.createdAt.getTime()) / 60000), receiptTgt)
				} else if (row.scheduledDatetime) {
					// Proxy fallback for orders without imagingOrderReceivedAt
					accumAncStep(receiptStep, Math.floor((row.scheduledDatetime.getTime() - row.createdAt.getTime()) / 60000), receiptTgt)
				}
				// SLA-014: Step 2 — received/scheduled -> billing cleared
				const step1Ts = row.imagingOrderReceivedAt ?? row.scheduledDatetime
				if (step1Ts && row.billingClearedAt) {
					accumAncStep(paymentStep, Math.floor((row.billingClearedAt.getTime() - step1Ts.getTime()) / 60000), paymentTgt)
				}
				// SLA-014: Step 3 — billing cleared -> study started
				if (row.billingClearedAt && row.studyStartedAt) {
					accumAncStep(procedureStep, Math.floor((row.studyStartedAt.getTime() - row.billingClearedAt.getTime()) / 60000), procedureTgt)
				}
				// SLA-014: Step 4 — overall release timing (all orders)
				accumAncStep(releaseStep, Math.floor(((row.completedDatetime ?? now).getTime() - startedAt.getTime()) / 60000), releaseTgt)
			}
			const makeRadStep = (stepStatus: string, stepLabel: string, acc: typeof receiptStep, tgt: number): SlaStepMetric => ({
				stepStatus,
				stepLabel,
				totalCount: acc.n,
				onTimeCount: acc.onTime,
				approachingCount: acc.approaching,
				exceededCount: acc.exceeded,
				compliancePct: acc.n > 0 ? Math.round(((acc.onTime + acc.approaching) / acc.n) * 100) : 100,
				avgElapsedMinutes: acc.n > 0 ? Math.round(acc.totalElapsed / acc.n) : 0,
				avgTargetMinutes: tgt,
			})
			const radStepMetrics: SlaStepMetric[] = []
			if (receiptStep.n > 0) radStepMetrics.push(makeRadStep("ancillary_order_receipt", "Radiology Order Receipt (Flow 3, Step 1 - Radiology)", receiptStep, receiptTgt))
			if (paymentStep.n > 0) radStepMetrics.push(makeRadStep("ancillary_payment_clearance", "Radiology Payment Clearance (Flow 3, Step 2 - Radiology)", paymentStep, paymentTgt))
			if (procedureStep.n > 0) radStepMetrics.push(makeRadStep("ancillary_procedure", "Radiology Study Procedure (Flow 3, Step 3 - Radiology)", procedureStep, procedureTgt))
			// SLA-013: always emit release step (overall radiology result timing)
			if (metrics.total > 0) radStepMetrics.push(makeRadStep("ancillary_release", "Radiology Result Release (Flow 3, Step 4 - Radiology)", releaseStep, releaseTgt))
			if (radStepMetrics.length > 0) metrics.stepMetrics = radStepMetrics
			return metrics
		}

		if (workflowType === "medical_records") {
			// SLA-006: resolve effective step targets
			const releaseTgt = await resolveStepTargetByType(facilityId, "records_processing_release")
			const paymentTgt = await resolveStepTargetByType(facilityId, "records_payment")
			resolvedTarget = releaseTgt
			metrics.targetMinutes = releaseTgt
			const rows = await db
				.select({
					createdAt: medicalRecordsRequests.createdAt,
					completedAt: medicalRecordsRequests.completedAt,
					paidAt: medicalRecordsRequests.paidAt,
					// SLA-020: evidence fields for authoritative checkpoint classification
					identityVerified: medicalRecordsRequests.identityVerified,
					dpaConsentObtained: medicalRecordsRequests.dpaConsentObtained,
					// SLA-022: release audit for authoritative Step 3 timing
					releasedAt: medicalRecordsRequests.releasedAt,
					releasedByStaffId: medicalRecordsRequests.releasedByStaffId,
				})
				.from(medicalRecordsRequests)
				.where(and(
					eq(medicalRecordsRequests.facilityId, facilityId),
					gte(medicalRecordsRequests.createdAt, periodStart),
					lte(medicalRecordsRequests.createdAt, periodEnd),
					// SLA-022: exclude medical_certificate to prevent double-counting
					// (those are tracked exclusively under certificate_issuance)
					ne(medicalRecordsRequests.requestType, "medical_certificate"),
				))
			// SLA-007/SLA-012: step metric accumulators for payment and release steps
			const payStep = { n: 0, onTime: 0, approaching: 0, exceeded: 0, totalElapsed: 0 }
			const relStep = { n: 0, onTime: 0, approaching: 0, exceeded: 0, totalElapsed: 0 }
			for (const row of rows) {
				// SLA-022: use releasedAt (authoritative) > completedAt > now for Step 3 end timestamp
				const releaseEnd = row.releasedAt ?? row.completedAt ?? now
				const elapsed = Math.floor((releaseEnd.getTime() - row.createdAt.getTime()) / 60000)
				accumulateStatus(elapsed)
				// SLA-020/SLA-022: checkpoint only when Step 1 evidence (identity/DPA) AND
				// Step 3 release audit (releasedAt) are both present — required for ARTA-authoritative classification
				if (row.identityVerified && row.dpaConsentObtained && row.releasedAt !== null) metrics.checkpointCount++
				const rs = computeSlaStatus(elapsed, releaseTgt, config.warningThresholdPct)
				relStep.n++; relStep.totalElapsed += elapsed
				if (rs === "on_time") relStep.onTime++
				else if (rs === "approaching") relStep.approaching++
				else relStep.exceeded++
				// SLA-012: payment step — request receipt → payment timestamp
				if (row.paidAt) {
					const payElapsed = Math.floor((row.paidAt.getTime() - row.createdAt.getTime()) / 60000)
					const ps = computeSlaStatus(payElapsed, paymentTgt, config.warningThresholdPct)
					payStep.n++; payStep.totalElapsed += payElapsed
					if (ps === "on_time") payStep.onTime++
					else if (ps === "approaching") payStep.approaching++
					else payStep.exceeded++
				}
			}
			const stepMetrics: SlaStepMetric[] = []
			if (payStep.n > 0) {
				stepMetrics.push({
					stepStatus: "records_payment",
					stepLabel: "Records Payment (Flow 7, Step 2)",
					totalCount: payStep.n,
					onTimeCount: payStep.onTime,
					approachingCount: payStep.approaching,
					exceededCount: payStep.exceeded,
					compliancePct: Math.round(((payStep.onTime + payStep.approaching) / payStep.n) * 100),
					avgElapsedMinutes: Math.round(payStep.totalElapsed / payStep.n),
					avgTargetMinutes: paymentTgt,
				})
			}
			if (relStep.n > 0) {
				stepMetrics.push({
					stepStatus: "records_processing_release",
					stepLabel: "Processing & Release (Flow 7, Step 3)",
					totalCount: relStep.n,
					onTimeCount: relStep.onTime,
					approachingCount: relStep.approaching,
					exceededCount: relStep.exceeded,
					compliancePct: Math.round(((relStep.onTime + relStep.approaching) / relStep.n) * 100),
					avgElapsedMinutes: Math.round(relStep.totalElapsed / relStep.n),
					avgTargetMinutes: releaseTgt,
				})
			}
			if (stepMetrics.length > 0) metrics.stepMetrics = stepMetrics
			return metrics
		}

		if (workflowType === "discharge" || workflowType === "medication_dispensing") {
			const evtWorkflow = workflowType === "discharge" ? "discharge" : "pharmacy"
			const rows = await db
				.select({ occurredAt: encounterStatusEvents.occurredAt, actualMinutes: encounterStatusEvents.actualMinutes })
				.from(encounterStatusEvents)
				.where(and(
					eq(encounterStatusEvents.facilityId, facilityId),
					eq(encounterStatusEvents.workflowType, evtWorkflow as "discharge" | "pharmacy"),
					gte(encounterStatusEvents.occurredAt, periodStart),
					lte(encounterStatusEvents.occurredAt, periodEnd),
				))
			for (const row of rows) {
				const elapsed = row.actualMinutes !== null
					? row.actualMinutes
					: Math.floor((now.getTime() - row.occurredAt.getTime()) / 60000)
				accumulateStatus(elapsed)
			}
			return metrics
		}

		if (workflowType === "billing_processing") {
			const rows = await db
				.select({ createdAt: invoices.createdAt, finalizedAt: invoices.finalizedAt, status: invoices.status })
				.from(invoices)
				.where(and(eq(invoices.facilityId, facilityId), gte(invoices.createdAt, periodStart), lte(invoices.createdAt, periodEnd)))
			for (const row of rows) {
				const isFinalized = row.status === "finalized" || row.status === "paid" || row.status === "partially_paid"
				const end = isFinalized && row.finalizedAt ? row.finalizedAt : now
				accumulateStatus(Math.floor((end.getTime() - row.createdAt.getTime()) / 60000))
			}
			return metrics
		}

		if (workflowType === "surgical_scheduling") {
			const rows = await db
				.select({ createdAt: operationRecords.createdAt, schedulingRequestedAt: operationRecords.schedulingRequestedAt, signedAt: operationRecords.signedAt })
				.from(operationRecords)
				.where(and(eq(operationRecords.facilityId, facilityId), gte(operationRecords.createdAt, periodStart), lte(operationRecords.createdAt, periodEnd)))
			// SLA-005: prefer schedulingRequestedAt (formal scheduling request) as start checkpoint
			for (const row of rows) {
				const startedAt = row.schedulingRequestedAt ?? row.createdAt
				if (row.schedulingRequestedAt !== null) metrics.checkpointCount++
				accumulateStatus(Math.floor(((row.signedAt ?? now).getTime() - startedAt.getTime()) / 60000))
			}
			return metrics
		}

		if (workflowType === "certificate_issuance") {
			// SLA-006: resolve effective step targets (facility override > TOR defaults)
			const releaseTgt = await resolveStepTargetByType(facilityId, "records_processing_release")
			const requestTgt = await resolveStepTargetByType(facilityId, "records_request")
			const paymentTgt = await resolveStepTargetByType(facilityId, "records_payment")
			resolvedTarget = releaseTgt
			metrics.targetMinutes = releaseTgt

			// SLA-007/SLA-012: step metric accumulators (request + payment + release)
			type StepAcc = { n: number; onTime: number; approaching: number; exceeded: number; totalElapsed: number }
			const reqStep: StepAcc = { n: 0, onTime: 0, approaching: 0, exceeded: 0, totalElapsed: 0 }
			const payStep: StepAcc = { n: 0, onTime: 0, approaching: 0, exceeded: 0, totalElapsed: 0 }
			const relStep: StepAcc = { n: 0, onTime: 0, approaching: 0, exceeded: 0, totalElapsed: 0 }
			const accumStep = (acc: StepAcc, elapsed: number, tgt: number) => {
				const s = computeSlaStatus(elapsed, tgt, config.warningThresholdPct)
				acc.n++; acc.totalElapsed += elapsed
				if (s === "on_time") acc.onTime++
				else if (s === "approaching") acc.approaching++
				else acc.exceeded++
			}

			// Medical certificates — paidAt available for SLA-012 payment step
			const medCerts = await db
				.select({
					createdAt: medicalRecordsRequests.createdAt,
					completedAt: medicalRecordsRequests.completedAt,
					paidAt: medicalRecordsRequests.paidAt,
					// SLA-022: release audit + Step 1 evidence for authoritative classification
					releasedAt: medicalRecordsRequests.releasedAt,
					identityVerified: medicalRecordsRequests.identityVerified,
					dpaConsentObtained: medicalRecordsRequests.dpaConsentObtained,
				})
				.from(medicalRecordsRequests)
				.where(and(
					eq(medicalRecordsRequests.facilityId, facilityId),
					eq(medicalRecordsRequests.requestType, "medical_certificate"),
					gte(medicalRecordsRequests.createdAt, periodStart),
					lte(medicalRecordsRequests.createdAt, periodEnd),
				))
			for (const row of medCerts) {
				// SLA-022: use releasedAt (authoritative) > completedAt > now for Step 3 end
				const releaseEnd = row.releasedAt ?? row.completedAt ?? now
				const elapsed = Math.floor((releaseEnd.getTime() - row.createdAt.getTime()) / 60000)
				accumulateStatus(elapsed)
				// SLA-022: checkpoint only when identity/DPA evidence AND release audit are both present
				if (row.identityVerified && row.dpaConsentObtained && row.releasedAt !== null) metrics.checkpointCount++
				accumStep(relStep, elapsed, releaseTgt)
				// SLA-012: payment step for medical certificates
				if (row.paidAt) {
					accumStep(payStep, Math.floor((row.paidAt.getTime() - row.createdAt.getTime()) / 60000), paymentTgt)
				}
			}

			// Birth registrations (requestedAt + paidAt checkpoints available)
			const birthRows = await db
				.select({
					createdAt: birthRegistrations.createdAt,
					requestedAt: birthRegistrations.requestedAt,
					paidAt: birthRegistrations.paidAt,
					completedAt: birthRegistrations.completedAt,
					// SLA-021: release audit for authoritative Step 3 timing
					releasedAt: birthRegistrations.releasedAt,
				})
				.from(birthRegistrations)
				.where(and(
					eq(birthRegistrations.facilityId, facilityId),
					gte(birthRegistrations.createdAt, periodStart),
					lte(birthRegistrations.createdAt, periodEnd),
				))
			// SLA-005: prefer requestedAt (family submits request) as start checkpoint for birth registrations
			for (const row of birthRows) {
				const startedAt = row.requestedAt ?? row.createdAt
				// SLA-021: checkpoint only when both requestedAt (Step 1) and releasedAt (Step 3) are present
				if (row.requestedAt !== null && row.releasedAt !== null) metrics.checkpointCount++
				// SLA-021: use releasedAt (authoritative) > completedAt > now for Step 3 end timestamp
				const releaseEnd = row.releasedAt ?? row.completedAt ?? now
				const totalElapsed = Math.floor((releaseEnd.getTime() - startedAt.getTime()) / 60000)
				accumulateStatus(totalElapsed)
				// SLA-007: step 1 - createdAt -> requestedAt
				if (row.requestedAt) {
					accumStep(reqStep, Math.floor((row.requestedAt.getTime() - row.createdAt.getTime()) / 60000), requestTgt)
				}
				// SLA-015: payment step - requestedAt|createdAt -> paidAt
				if (row.paidAt) {
					accumStep(payStep, Math.floor((row.paidAt.getTime() - startedAt.getTime()) / 60000), paymentTgt)
				}
				// SLA-021: release step - requestedAt|createdAt -> releasedAt|completedAt
				accumStep(relStep, totalElapsed, releaseTgt)
			}

			// Death reports (requestedAt + paidAt checkpoints available)
			const deathRows = await db
				.select({
					createdAt: deathReports.createdAt,
					requestedAt: deathReports.requestedAt,
					paidAt: deathReports.paidAt,
					completedAt: deathReports.completedAt,
					// SLA-021: release audit for authoritative Step 3 timing (fixes collapsed lifecycle)
					releasedAt: deathReports.releasedAt,
				})
				.from(deathReports)
				.where(and(
					eq(deathReports.facilityId, facilityId),
					gte(deathReports.createdAt, periodStart),
					lte(deathReports.createdAt, periodEnd),
				))
			// SLA-005: prefer requestedAt (family submits certificate request) as start checkpoint for death reports
			for (const row of deathRows) {
				const startedAt = row.requestedAt ?? row.createdAt
				// SLA-021: checkpoint only when both requestedAt (Step 1) and releasedAt (Step 3) are present.
				// This prevents the old collapsed-lifecycle records (requestedAt ≈ completedAt) from
				// appearing as authoritative in the ARTA compliance score.
				if (row.requestedAt !== null && row.releasedAt !== null) metrics.checkpointCount++
				// SLA-021: use releasedAt (authoritative) > completedAt > now to avoid benefiting from
				// the collapsed single-write lifecycle where completedAt === requestedAt
				const releaseEnd = row.releasedAt ?? row.completedAt ?? now
				const totalElapsed = Math.floor((releaseEnd.getTime() - startedAt.getTime()) / 60000)
				accumulateStatus(totalElapsed)
				// SLA-007: step 1 - createdAt -> requestedAt
				if (row.requestedAt) {
					accumStep(reqStep, Math.floor((row.requestedAt.getTime() - row.createdAt.getTime()) / 60000), requestTgt)
				}
				// SLA-015: payment step - requestedAt|createdAt -> paidAt
				if (row.paidAt) {
					accumStep(payStep, Math.floor((row.paidAt.getTime() - startedAt.getTime()) / 60000), paymentTgt)
				}
				// SLA-021: release step - requestedAt|createdAt -> releasedAt|completedAt
				accumStep(relStep, totalElapsed, releaseTgt)
			}

			// SLA-007/SLA-012: emit step metrics for compliance report expansion
			const makeStep = (stepStatus: string, acc: StepAcc, tgt: number): SlaStepMetric => {
				const labelMap: Record<string, string> = {
					records_request: "Records Request (Flow 7, Step 1)",
					records_payment: "Records Payment (Flow 7, Step 2)",
					records_processing_release: "Processing & Release (Flow 7, Step 3)",
				}
				return {
					stepStatus,
					stepLabel: labelMap[stepStatus],
					totalCount: acc.n,
					onTimeCount: acc.onTime,
					approachingCount: acc.approaching,
					exceededCount: acc.exceeded,
					compliancePct: acc.n > 0 ? Math.round(((acc.onTime + acc.approaching) / acc.n) * 100) : 100,
					avgElapsedMinutes: acc.n > 0 ? Math.round(acc.totalElapsed / acc.n) : 0,
					avgTargetMinutes: tgt,
				}
			}
			const stepMetrics: SlaStepMetric[] = []
			if (reqStep.n > 0) stepMetrics.push(makeStep("records_request", reqStep, requestTgt))
			if (payStep.n > 0) stepMetrics.push(makeStep("records_payment", payStep, paymentTgt))
			if (relStep.n > 0) stepMetrics.push(makeStep("records_processing_release", relStep, releaseTgt))
			if (stepMetrics.length > 0) metrics.stepMetrics = stepMetrics

			return metrics
		}

		return metrics
	}

	// ========================================================================
	// Private helper: compliance metrics for admission routing (SLA-011)
	// Uses encounterStatusEvents.workflowType = 'admission' as the authoritative
	// timing source for TOR Flow 4 (order → bed → orientation → transfer).
	// ========================================================================

	private async complianceMetricsForAdmissionWorkflow(
		facilityId: string,
		config: typeof slaConfigs.$inferSelect,
		periodStart: Date,
		periodEnd: Date,
	): Promise<WorkflowMetrics> {
		const now = new Date()
		const metrics: WorkflowMetrics = {
			total: 0, onTime: 0, approaching: 0, exceeded: 0, totalElapsed: 0,
			targetMinutes: config.targetMinutes,
			checkpointCount: 0,
		}

		// Find all encounters that started admission routing in the period.
		// Each distinct encounterId with workflowType='admission' events = one routing sequence.
		const admissionRows = await db
			.select({
				encounterId: encounterStatusEvents.encounterId,
				// MIN gives the start of the routing sequence (admission_order event)
				firstStepAt: sql<Date>`MIN(${encounterStatusEvents.occurredAt})`,
				// MAX over completed physical-transfer events gives the routing end
				transferredAt: sql<Date | null>`MAX(CASE WHEN ${encounterStatusEvents.toStatus} = 'transferred_to_ward' AND ${encounterStatusEvents.actualMinutes} IS NOT NULL THEN ${encounterStatusEvents.occurredAt} ELSE NULL END)`,
			})
			.from(encounterStatusEvents)
			.where(and(
				eq(encounterStatusEvents.facilityId, facilityId),
				eq(encounterStatusEvents.workflowType, "admission" as const),
				gte(encounterStatusEvents.occurredAt, periodStart),
				lte(encounterStatusEvents.occurredAt, periodEnd),
			))
			.groupBy(encounterStatusEvents.encounterId)

		for (const row of admissionRows) {
			const startedAt = new Date(row.firstStepAt as unknown as string | Date)
			const endAt = row.transferredAt
				? new Date(row.transferredAt as unknown as string | Date)
				: now
			const elapsed = Math.floor((endAt.getTime() - startedAt.getTime()) / 60000)
			const status = computeSlaStatus(elapsed, config.targetMinutes, config.warningThresholdPct)
			metrics.total++
			metrics.totalElapsed += elapsed
			metrics.checkpointCount++ // Real event timestamps — authoritative for ARTA
			if (status === "on_time") metrics.onTime++
			else if (status === "approaching") metrics.approaching++
			else metrics.exceeded++
		}

		return metrics
	}

	// ========================================================================
	// Private helper: step-level compliance metrics for encounter workflows
	// ========================================================================

	private async getStepComplianceForEncounterWorkflow(
		facilityId: string,
		eventWorkflowType: "opd" | "ed" | "admission" | "discharge" | "ancillary" | "pharmacy" | "billing",
		periodStart: Date,
		periodEnd: Date,
		warningThresholdPct: number,
	): Promise<Array<{ stepStatus: string; totalCount: number; onTimeCount: number; approachingCount: number; exceededCount: number; compliancePct: number; avgElapsedMinutes: number; avgTargetMinutes: number }>> {
		// Query closed step events (actualMinutes IS NOT NULL) grouped by toStatus
		const rows = await db
			.select({
				toStatus: encounterStatusEvents.toStatus,
				totalCount: count(),
				avgElapsedMinutes: sql<number>`ROUND(AVG(${encounterStatusEvents.actualMinutes}))`,
				avgTargetMinutes: sql<number>`ROUND(AVG(${encounterStatusEvents.slaTargetMinutes}))`,
				onTimeCount: sql<number>`SUM(CASE WHEN ${encounterStatusEvents.actualMinutes} < ${encounterStatusEvents.slaTargetMinutes} THEN 1 ELSE 0 END)`,
				approachingCount: sql<number>`SUM(CASE WHEN ${encounterStatusEvents.actualMinutes} >= ${encounterStatusEvents.slaTargetMinutes} * ${warningThresholdPct} / 100.0 AND ${encounterStatusEvents.actualMinutes} < ${encounterStatusEvents.slaTargetMinutes} THEN 1 ELSE 0 END)`,
				exceededCount: sql<number>`SUM(CASE WHEN ${encounterStatusEvents.actualMinutes} >= ${encounterStatusEvents.slaTargetMinutes} THEN 1 ELSE 0 END)`,
			})
			.from(encounterStatusEvents)
			.where(and(
				eq(encounterStatusEvents.facilityId, facilityId),
				eq(encounterStatusEvents.workflowType, eventWorkflowType),
				isNotNull(encounterStatusEvents.actualMinutes),
				isNotNull(encounterStatusEvents.slaTargetMinutes),
				gte(encounterStatusEvents.occurredAt, periodStart),
				lte(encounterStatusEvents.occurredAt, periodEnd),
			))
			.groupBy(encounterStatusEvents.toStatus)
			.orderBy(asc(encounterStatusEvents.toStatus))

		return rows.map(r => {
			const total = Number(r.totalCount)
			const onTime = Number(r.onTimeCount)
			const approaching = Number(r.approachingCount)
			const exceeded = Number(r.exceededCount)
			return {
				stepStatus: r.toStatus,
				totalCount: total,
				onTimeCount: onTime,
				approachingCount: approaching,
				exceededCount: exceeded,
				compliancePct: total > 0 ? Math.round(((onTime + approaching) / total) * 100) : 100,
				avgElapsedMinutes: Number(r.avgElapsedMinutes) || 0,
				avgTargetMinutes: Number(r.avgTargetMinutes) || 0,
			}
		})
	}

	// ========================================================================
	// Public helper for admin-dashboard integration
	// ========================================================================

	async getActiveSlaBreaches(
		facilityId: string
	): Promise<{ activeBreaches: number; overdueQueues: number; topBreachedWorkflows: Array<{ workflow: string; count: number }> }> {
		const summary = await this.getActiveSlaStatusBreakdown(facilityId)
		return {
			activeBreaches: summary.activeBreaches,
			overdueQueues: summary.overdueQueues,
			topBreachedWorkflows: summary.topBreachedWorkflows,
		}
	}

	// Returns full on-time / approaching / exceeded breakdown for each workflow.
	// Used by AdminDashboardService for the ARTA queue breakdown widget (AD-004).
	async getActiveSlaStatusBreakdown(facilityId: string): Promise<{
		activeBreaches: number
		overdueQueues: number
		topBreachedWorkflows: Array<{ workflow: string; count: number }>
		workflowBreakdown: Array<{
			workflow: string
			onTime: number
			approaching: number
			exceeded: number
			targetMinutes: number
			warningThresholdPct: number
			instrumented: boolean
		}>
	}> {
		const facilityConfigRows = await db
			.select()
			.from(slaConfigs)
			.where(and(eq(slaConfigs.facilityId, facilityId), eq(slaConfigs.isActive, true)))

		if (facilityConfigRows.length === 0) {
			return { activeBreaches: 0, overdueQueues: 0, topBreachedWorkflows: [], workflowBreakdown: [] }
		}

		const configByWorkflow = new Map(facilityConfigRows.map(c => [c.workflowType, c]))

		// Fetch active encounters (not discharged/closed/cancelled)
		const activeEncounters = await db
			.select({
				encounterType: encounters.encounterType,
				admissionDatetime: encounters.admissionDatetime,
			})
			.from(encounters)
			.where(and(eq(encounters.facilityId, facilityId), eq(encounters.status, "active")))

		const now = new Date()
		type StatusCounts = { onTime: number; approaching: number; exceeded: number }
		const byWorkflow = new Map<string, StatusCounts>()

		for (const row of activeEncounters) {
			const workflowType = ENCOUNTER_TYPE_TO_WORKFLOW[row.encounterType] ?? "opd_consultation"
			const config = configByWorkflow.get(workflowType)
			if (!config) continue

			const elapsed = Math.floor((now.getTime() - row.admissionDatetime.getTime()) / 60000)
			const status = computeSlaStatus(elapsed, config.targetMinutes, config.warningThresholdPct)

			const entry = byWorkflow.get(workflowType) ?? { onTime: 0, approaching: 0, exceeded: 0 }
			if (status === "on_time") entry.onTime++
			else if (status === "approaching") entry.approaching++
			else entry.exceeded++
			byWorkflow.set(workflowType, entry)
		}

		// AD-001: Instrument non-encounter TOR service flows where data exists.
		// Lab result SLA: active lab orders (pending/ordered/collected/in_progress) measure
		// elapsed time from order creation.
		const labConfig = configByWorkflow.get("lab_result")
		if (labConfig) {
			const activeLabs = await db
				.select({ createdAt: labOrders.createdAt })
				.from(labOrders)
				.where(
					and(
						eq(labOrders.facilityId, facilityId),
						inArray(labOrders.status, ["pending", "ordered", "collected", "in_progress"])
					)
				)
			const labCounts: StatusCounts = { onTime: 0, approaching: 0, exceeded: 0 }
			for (const row of activeLabs) {
				const elapsed = Math.floor((now.getTime() - row.createdAt.getTime()) / 60000)
				const s = computeSlaStatus(elapsed, labConfig.targetMinutes, labConfig.warningThresholdPct)
				if (s === "on_time") labCounts.onTime++
				else if (s === "approaching") labCounts.approaching++
				else labCounts.exceeded++
			}
			byWorkflow.set("lab_result", labCounts)
		}

		// Radiology result SLA: active imaging orders (ordered/scheduled/in_progress).
		const radiologyConfig = configByWorkflow.get("radiology_result")
		if (radiologyConfig) {
			const activeImaging = await db
				.select({ createdAt: imagingOrders.createdAt })
				.from(imagingOrders)
				.where(
					and(
						eq(imagingOrders.facilityId, facilityId),
						inArray(imagingOrders.status, ["ordered", "scheduled", "in_progress"])
					)
				)
			const radCounts: StatusCounts = { onTime: 0, approaching: 0, exceeded: 0 }
			for (const row of activeImaging) {
				const elapsed = Math.floor((now.getTime() - row.createdAt.getTime()) / 60000)
				const s = computeSlaStatus(elapsed, radiologyConfig.targetMinutes, radiologyConfig.warningThresholdPct)
				if (s === "on_time") radCounts.onTime++
				else if (s === "approaching") radCounts.approaching++
				else radCounts.exceeded++
			}
			byWorkflow.set("radiology_result", radCounts)
		}

		// Medical records issuance SLA: open medical-records requests (pending/processing).
		const medRecordsConfig = configByWorkflow.get("medical_records")
		if (medRecordsConfig) {
			const activeRequests = await db
				.select({ createdAt: medicalRecordsRequests.createdAt })
				.from(medicalRecordsRequests)
				.where(
					and(
						eq(medicalRecordsRequests.facilityId, facilityId),
						inArray(medicalRecordsRequests.status, ["pending", "processing"])
					)
				)
			const recCounts: StatusCounts = { onTime: 0, approaching: 0, exceeded: 0 }
			for (const row of activeRequests) {
				const elapsed = Math.floor((now.getTime() - row.createdAt.getTime()) / 60000)
				const s = computeSlaStatus(elapsed, medRecordsConfig.targetMinutes, medRecordsConfig.warningThresholdPct)
				if (s === "on_time") recCounts.onTime++
				else if (s === "approaching") recCounts.approaching++
				else recCounts.exceeded++
			}
			byWorkflow.set("medical_records", recCounts)
		}

		// AD-001: Discharge SLA — encounters where a discharge workflow event was logged
		// but the patient has not yet been fully discharged (actualMinutes is populated on
		// the next status transition, so NULL means the step is still open).
		const dischargeConfig = configByWorkflow.get("discharge")
		if (dischargeConfig) {
			const activeDischargeEvents = await db
				.select({ occurredAt: encounterStatusEvents.occurredAt })
				.from(encounterStatusEvents)
				.where(
					and(
						eq(encounterStatusEvents.facilityId, facilityId),
						eq(encounterStatusEvents.workflowType, "discharge"),
						isNull(encounterStatusEvents.actualMinutes)
					)
				)
			const dischargeCounts: StatusCounts = { onTime: 0, approaching: 0, exceeded: 0 }
			for (const row of activeDischargeEvents) {
				const elapsed = Math.floor((now.getTime() - row.occurredAt.getTime()) / 60000)
				const s = computeSlaStatus(elapsed, dischargeConfig.targetMinutes, dischargeConfig.warningThresholdPct)
				if (s === "on_time") dischargeCounts.onTime++
				else if (s === "approaching") dischargeCounts.approaching++
				else dischargeCounts.exceeded++
			}
			byWorkflow.set("discharge", dischargeCounts)
		}

		// AD-001: Billing processing SLA — invoices still in draft, finalized, or
		// partially-paid state are active billing work items. Elapsed time is measured
		// from invoice creation until the invoice reaches fully-paid status.
		const billingConfig = configByWorkflow.get("billing_processing")
		if (billingConfig) {
			const activeInvoices = await db
				.select({ createdAt: invoices.createdAt })
				.from(invoices)
				.where(
					and(
						eq(invoices.facilityId, facilityId),
						inArray(invoices.status, ["draft", "finalized", "partially_paid"])
					)
				)
			const billingCounts: StatusCounts = { onTime: 0, approaching: 0, exceeded: 0 }
			for (const row of activeInvoices) {
				const elapsed = Math.floor((now.getTime() - row.createdAt.getTime()) / 60000)
				const s = computeSlaStatus(elapsed, billingConfig.targetMinutes, billingConfig.warningThresholdPct)
				if (s === "on_time") billingCounts.onTime++
				else if (s === "approaching") billingCounts.approaching++
				else billingCounts.exceeded++
			}
			byWorkflow.set("billing_processing", billingCounts)
		}

		// AD-001: Medication dispensing SLA — uses pharmacy encounterStatusEvents as the
		// most defensible available proxy. The domain model does not have a dedicated
		// dispensing-completion log table; pharmacy workflow events (workflowType='pharmacy')
		// capture the moment a medication order is sent to pharmacy, and actualMinutes IS
		// NULL while the dispensing step is still open.
		const dispensingConfig = configByWorkflow.get("medication_dispensing")
		if (dispensingConfig) {
			const activePharmacyEvents = await db
				.select({ occurredAt: encounterStatusEvents.occurredAt })
				.from(encounterStatusEvents)
				.where(
					and(
						eq(encounterStatusEvents.facilityId, facilityId),
						eq(encounterStatusEvents.workflowType, "pharmacy"),
						isNull(encounterStatusEvents.actualMinutes)
					)
				)
			const dispensingCounts: StatusCounts = { onTime: 0, approaching: 0, exceeded: 0 }
			for (const row of activePharmacyEvents) {
				const elapsed = Math.floor((now.getTime() - row.occurredAt.getTime()) / 60000)
				const s = computeSlaStatus(elapsed, dispensingConfig.targetMinutes, dispensingConfig.warningThresholdPct)
				if (s === "on_time") dispensingCounts.onTime++
				else if (s === "approaching") dispensingCounts.approaching++
				else dispensingCounts.exceeded++
			}
			byWorkflow.set("medication_dispensing", dispensingCounts)
		}

		// AD-014: Surgical scheduling SLA — draft operation records measure elapsed time
		// from record creation to sign-off. Signed records are considered complete and excluded.
		const surgicalConfig = configByWorkflow.get("surgical_scheduling")
		if (surgicalConfig) {
			const activeSurgicalOps = await db
				.select({ createdAt: operationRecords.createdAt })
				.from(operationRecords)
				.where(
					and(
						eq(operationRecords.facilityId, facilityId),
						eq(operationRecords.status, "draft")
					)
				)
			const surgicalCounts: StatusCounts = { onTime: 0, approaching: 0, exceeded: 0 }
			for (const row of activeSurgicalOps) {
				const elapsed = Math.floor((now.getTime() - row.createdAt.getTime()) / 60000)
				const s = computeSlaStatus(elapsed, surgicalConfig.targetMinutes, surgicalConfig.warningThresholdPct)
				if (s === "on_time") surgicalCounts.onTime++
				else if (s === "approaching") surgicalCounts.approaching++
				else surgicalCounts.exceeded++
			}
			byWorkflow.set("surgical_scheduling", surgicalCounts)
		}

		// Flow 7: Certificate Issuance SLA — open medical certificates, birth registrations, death reports
		const certConfig = configByWorkflow.get("certificate_issuance")
		if (certConfig) {
			const certCounts: StatusCounts = { onTime: 0, approaching: 0, exceeded: 0 }
			const activeMedCerts = await db
				.select({ createdAt: medicalRecordsRequests.createdAt })
				.from(medicalRecordsRequests)
				.where(and(
					eq(medicalRecordsRequests.facilityId, facilityId),
					eq(medicalRecordsRequests.requestType, "medical_certificate"),
					inArray(medicalRecordsRequests.status, ["pending", "processing"]),
				))
			for (const row of activeMedCerts) {
				const elapsed = Math.floor((now.getTime() - row.createdAt.getTime()) / 60000)
				const s = computeSlaStatus(elapsed, certConfig.targetMinutes, certConfig.warningThresholdPct)
				if (s === "on_time") certCounts.onTime++
				else if (s === "approaching") certCounts.approaching++
				else certCounts.exceeded++
			}
			// SLA-023: count only open (draft) birth registrations — completed rows are no longer active work.
			// This matches the definition used by the main /admin/sla monitoring queue.
			const activeBirths = await db
				.select({ createdAt: birthRegistrations.createdAt })
				.from(birthRegistrations)
				.where(and(eq(birthRegistrations.facilityId, facilityId), inArray(birthRegistrations.status, ["draft"])))
			for (const row of activeBirths) {
				const elapsed = Math.floor((now.getTime() - row.createdAt.getTime()) / 60000)
				const s = computeSlaStatus(elapsed, certConfig.targetMinutes, certConfig.warningThresholdPct)
				if (s === "on_time") certCounts.onTime++
				else if (s === "approaching") certCounts.approaching++
				else certCounts.exceeded++
			}
			// SLA-023: count only open (draft) death reports — completed rows are no longer active work.
			// This matches the definition used by the main /admin/sla monitoring queue.
			const activeDeaths = await db
				.select({ createdAt: deathReports.createdAt })
				.from(deathReports)
				.where(and(eq(deathReports.facilityId, facilityId), inArray(deathReports.status, ["draft"])))
			for (const row of activeDeaths) {
				const elapsed = Math.floor((now.getTime() - row.createdAt.getTime()) / 60000)
				const s = computeSlaStatus(elapsed, certConfig.targetMinutes, certConfig.warningThresholdPct)
				if (s === "on_time") certCounts.onTime++
				else if (s === "approaching") certCounts.approaching++
				else certCounts.exceeded++
			}
			byWorkflow.set("certificate_issuance", certCounts)
		}

		let totalBreaches = 0
		const breachesByWorkflow = new Map<string, number>()

		for (const [wf, counts] of byWorkflow) {
			if (counts.exceeded > 0) {
				totalBreaches += counts.exceeded
				breachesByWorkflow.set(wf, counts.exceeded)
			}
		}

		const overdueQueues = breachesByWorkflow.size

		const topBreachedWorkflows = Array.from(breachesByWorkflow.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5)
			.map(([workflow, count]) => ({ workflow, count }))

		const workflowBreakdown = facilityConfigRows.map(cfg => {
			const instrumented = byWorkflow.has(cfg.workflowType)
			const counts = byWorkflow.get(cfg.workflowType) ?? { onTime: 0, approaching: 0, exceeded: 0 }
			return {
				workflow: cfg.workflowType,
				onTime: counts.onTime,
				approaching: counts.approaching,
				exceeded: counts.exceeded,
				targetMinutes: cfg.targetMinutes,
				warningThresholdPct: cfg.warningThresholdPct,
				instrumented,
			}
		})

		return { activeBreaches: totalBreaches, overdueQueues, topBreachedWorkflows, workflowBreakdown }
	}

	// ========================================================================
	// SLA Step Configs (per-facility TOR step target overrides)
	// ========================================================================

	async listStepConfigs(query: SlaStepConfigsQuery): Promise<SlaStepConfigsResponse> {
		const conditions = []
		if (query.facilityId) {
			conditions.push(eq(slaStepConfigs.facilityId, query.facilityId))
		}

		const rows = await db
			.select()
			.from(slaStepConfigs)
			.where(conditions.length > 0 ? and(...conditions) : undefined)
			.orderBy(slaStepConfigs.stepType)

		return {
			data: rows.map(r => ({
				id: r.id,
				facilityId: r.facilityId,
				stepType: r.stepType,
				targetMinutes: r.targetMinutes,
				warningThresholdPct: r.warningThresholdPct,
				isActive: r.isActive,
				description: r.description,
				createdAt: r.createdAt,
				updatedAt: r.updatedAt,
			})),
		}
	}

	async createStepConfig(input: CreateSlaStepConfig): Promise<SlaStepConfig> {
		const [row] = await db
			.insert(slaStepConfigs)
			.values({
				facilityId: input.facilityId,
				stepType: input.stepType,
				targetMinutes: input.targetMinutes,
				warningThresholdPct: input.warningThresholdPct,
				description: input.description,
			})
			.returning()

		if (!row) throw new Error("Failed to create SLA step config")

		return {
			id: row.id,
			facilityId: row.facilityId,
			stepType: row.stepType,
			targetMinutes: row.targetMinutes,
			warningThresholdPct: row.warningThresholdPct,
			isActive: row.isActive,
			description: row.description,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		}
	}

	async updateStepConfig(input: UpdateSlaStepConfig): Promise<SlaStepConfig> {
		const updates: Partial<typeof slaStepConfigs.$inferInsert> = { updatedAt: new Date() }
		if (input.targetMinutes !== undefined) updates.targetMinutes = input.targetMinutes
		if (input.warningThresholdPct !== undefined) updates.warningThresholdPct = input.warningThresholdPct
		if (input.description !== undefined) updates.description = input.description
		if (input.isActive !== undefined) updates.isActive = input.isActive

		const [row] = await db
			.update(slaStepConfigs)
			.set(updates)
			.where(eq(slaStepConfigs.id, input.id))
			.returning()

		if (!row) throw new NotFoundException(`SLA step config with id ${input.id} not found`)

		return {
			id: row.id,
			facilityId: row.facilityId,
			stepType: row.stepType,
			targetMinutes: row.targetMinutes,
			warningThresholdPct: row.warningThresholdPct,
			isActive: row.isActive,
			description: row.description,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		}
	}

	async deleteStepConfig(id: string): Promise<{ success: boolean }> {
		const [row] = await db
			.delete(slaStepConfigs)
			.where(eq(slaStepConfigs.id, id))
			.returning({ id: slaStepConfigs.id })
		if (!row) throw new NotFoundException(`SLA step config with id ${id} not found`)
		return { success: true }
	}

	// ========================================================================
	// Workflow Status Log (ADM-BE-09)
	// Idempotent on (encounterId, workflow, step, startedAt)
	// ========================================================================

	async appendStatusLog(input: {
		facilityId: string
		encounterId: string
		workflow: string
		step: string
		startedAt: string
		endedAt?: string
		durationMinutes?: number
		isBreached?: boolean
		isHardCapBreached?: boolean
	}) {
		const [existing] = await db
			.select()
			.from(workflowStatusLog)
			.where(
				and(
					eq(workflowStatusLog.encounterId, input.encounterId),
					eq(workflowStatusLog.workflow, input.workflow as SlaWorkflowType),
					eq(workflowStatusLog.step, input.step as SlaStepType),
					eq(workflowStatusLog.startedAt, new Date(input.startedAt))
				)
			)

		if (existing) return existing

		// ADM-BE-09 AC5: auto-detect breach from sla_step_configs when endedAt + durationMinutes are provided
		let isBreached = input.isBreached ?? false
		let isHardCapBreached = input.isHardCapBreached ?? false

		if (input.endedAt && input.durationMinutes != null) {
			const [stepConfig] = await db
				.select()
				.from(slaStepConfigs)
				.where(
					and(
						eq(slaStepConfigs.facilityId, input.facilityId),
						eq(slaStepConfigs.stepType, input.step as SlaStepType),
						eq(slaStepConfigs.isActive, true)
					)
				)
				.limit(1)

			if (stepConfig) {
				isBreached = input.durationMinutes > stepConfig.targetMinutes
				isHardCapBreached = stepConfig.hardCapMinutes != null && input.durationMinutes > stepConfig.hardCapMinutes

				if (isHardCapBreached) {
					this.logger.warn(
						`audit.sla.hard-cap-breach facilityId=${input.facilityId} encounterId=${input.encounterId} workflow=${input.workflow} step=${input.step} durationMinutes=${input.durationMinutes} hardCapMinutes=${stepConfig.hardCapMinutes}`
					)
				}
			}
		}

		const [row] = await db
			.insert(workflowStatusLog)
			.values({
				facilityId: input.facilityId,
				encounterId: input.encounterId,
				workflow: input.workflow as SlaWorkflowType,
				step: input.step as SlaStepType,
				startedAt: new Date(input.startedAt),
				endedAt: input.endedAt ? new Date(input.endedAt) : null,
				durationMinutes: input.durationMinutes ?? null,
				isBreached,
				isHardCapBreached,
			})
			.returning()

		return row!
	}

	// ========================================================================
	// SLA Analytics (ADM-BE-10)
	// ========================================================================

	async getSlaDashboard(facilityId: string) {
		const now = new Date()
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

		// Get all workflow types from workflowStatusLog for this facility this month
		const allRows = await db
			.select({
				workflow: workflowStatusLog.workflow,
				isBreached: workflowStatusLog.isBreached,
				durationMinutes: workflowStatusLog.durationMinutes,
			})
			.from(workflowStatusLog)
			.where(
				and(
					eq(workflowStatusLog.facilityId, facilityId),
					gte(workflowStatusLog.startedAt, monthStart),
					isNotNull(workflowStatusLog.durationMinutes)
				)
			)

		type RowStats = { total: number; breachCount: number; totalDuration: number }
		const byWorkflow: Record<string, RowStats> = {}

		for (const row of allRows) {
			if (!byWorkflow[row.workflow]) {
				byWorkflow[row.workflow] = { total: 0, breachCount: 0, totalDuration: 0 }
			}
			const stats = byWorkflow[row.workflow]!
			stats.total++
			if (row.isBreached) stats.breachCount++
			if (row.durationMinutes) stats.totalDuration += row.durationMinutes
		}

		const tiles = Object.entries(byWorkflow).map(([workflow, stats]) => {
			const withinSLAPct = stats.total > 0
				? ((stats.total - stats.breachCount) / stats.total) * 100
				: 100
			const avgTatMinutes = stats.total > 0 ? stats.totalDuration / stats.total : 0
			const statusColor: 'green' | 'amber' | 'red' =
				withinSLAPct >= 95 ? 'green' : withinSLAPct >= 85 ? 'amber' : 'red'

			return {
				workflowType: workflow,
				workflowLabel: workflow.replace(/_/g, ' ').replace(/w/g, c => c.toUpperCase()),
				totalCases: stats.total,
				withinSLAPct: Math.round(withinSLAPct * 100) / 100,
				breachCount: stats.breachCount,
				avgTatMinutes: Math.round(avgTatMinutes * 100) / 100,
				statusColor,
			}
		})

		const totalCases = tiles.reduce((s, t) => s + t.totalCases, 0)
		const totalBreaches = tiles.reduce((s, t) => s + t.breachCount, 0)
		const overallCompliancePct = totalCases > 0
			? ((totalCases - totalBreaches) / totalCases) * 100
			: 100

		return {
			tiles,
			overallCompliancePct: Math.round(overallCompliancePct * 100) / 100,
		}
	}

	async getTurnaround(input: {
		facilityId: string
		workflowType: string
		startDate: string
		endDate: string
		compareStartDate?: string
		compareEndDate?: string
	}) {
		const primary = await this.aggregateTurnaroundByDay(
			input.facilityId,
			input.workflowType,
			input.startDate,
			input.endDate
		)

		let comparison = null
		if (input.compareStartDate && input.compareEndDate) {
			comparison = await this.aggregateTurnaroundByDay(
				input.facilityId,
				input.workflowType,
				input.compareStartDate,
				input.compareEndDate
			)
		}

		return { primary, comparison }
	}

	private async aggregateTurnaroundByDay(
		facilityId: string,
		workflowType: string,
		startDate: string,
		endDate: string
	) {
		const rows = await db
			.select({
				durationMinutes: workflowStatusLog.durationMinutes,
				isBreached: workflowStatusLog.isBreached,
				startedAt: workflowStatusLog.startedAt,
			})
			.from(workflowStatusLog)
			.where(
				and(
					eq(workflowStatusLog.facilityId, facilityId),
					eq(workflowStatusLog.workflow, workflowType as SlaWorkflowType),
					gte(workflowStatusLog.startedAt, new Date(startDate)),
					lte(workflowStatusLog.startedAt, new Date(endDate + 'T23:59:59Z')),
					isNotNull(workflowStatusLog.durationMinutes)
				)
			)

		type DayAgg = { durations: number[]; breachCount: number }
		const byDay: Record<string, DayAgg> = {}

		for (const row of rows) {
			const dateKey = row.startedAt.toISOString().slice(0, 10)
			if (!byDay[dateKey]) byDay[dateKey] = { durations: [], breachCount: 0 }
			const day = byDay[dateKey]!
			if (row.durationMinutes) day.durations.push(row.durationMinutes)
			if (row.isBreached) day.breachCount++
		}

		return Object.entries(byDay)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([date, agg]) => {
				const sorted = [...agg.durations].sort((a, b) => a - b)
				const mid = Math.floor(sorted.length / 2)
				const medianTAT = sorted.length % 2 === 0
					? ((sorted[mid - 1]! + sorted[mid]!) / 2)
					: sorted[mid]!
				const p95Idx = Math.floor(sorted.length * 0.95)
				const p95TAT = sorted[Math.min(p95Idx, sorted.length - 1)]!
				const withinSLAPct = sorted.length > 0
					? ((sorted.length - agg.breachCount) / sorted.length) * 100
					: 100

				return {
					date,
					cases: sorted.length,
					medianTAT: Math.round(medianTAT * 100) / 100,
					p95TAT: Math.round(p95TAT * 100) / 100,
					withinSLAPct: Math.round(withinSLAPct * 100) / 100,
					breachCount: agg.breachCount,
				}
			})
	}

	async getBottleneck(input: {
		facilityId: string
		workflowType: string
		startDate: string
		endDate: string
	}) {
		const rows = await db
			.select({
				step: workflowStatusLog.step,
				durationMinutes: workflowStatusLog.durationMinutes,
				encounterId: workflowStatusLog.encounterId,
			})
			.from(workflowStatusLog)
			.where(
				and(
					eq(workflowStatusLog.facilityId, input.facilityId),
					eq(workflowStatusLog.workflow, input.workflowType as SlaWorkflowType),
					gte(workflowStatusLog.startedAt, new Date(input.startDate)),
					lte(workflowStatusLog.startedAt, new Date(input.endDate + 'T23:59:59Z')),
					isNotNull(workflowStatusLog.durationMinutes)
				)
			)

		type StepAgg = { durations: number[]; encounterIds: string[] }
		const byStep: Record<string, StepAgg> = {}

		for (const row of rows) {
			if (!byStep[row.step]) byStep[row.step] = { durations: [], encounterIds: [] }
			const agg = byStep[row.step]!
			if (row.durationMinutes) agg.durations.push(row.durationMinutes)
			agg.encounterIds.push(row.encounterId)
		}

		const steps = Object.entries(byStep).map(([step, agg]) => {
			const sorted = [...agg.durations].sort((a, b) => a - b)
			const mid = Math.floor(sorted.length / 2)
			const medianMinutes = sorted.length % 2 === 0
				? ((sorted[mid - 1]! + sorted[mid]!) / 2)
				: (sorted[mid] ?? 0)
			const p95Idx = Math.floor(sorted.length * 0.95)
			const p95Minutes = sorted[Math.min(p95Idx, sorted.length - 1)] ?? 0

			// Outliers: duration > p95
			const outlierEncounterIds = agg.durations
				.map((d, i) => ({ d, id: agg.encounterIds[i]! }))
				.filter(({ d }) => d > p95Minutes)
				.map(({ id }) => id)

			return {
				stepType: step,
				stepLabel: step.replace(/_/g, ' ').replace(/w/g, c => c.toUpperCase()),
				medianMinutes: Math.round(medianMinutes * 100) / 100,
				p95Minutes: Math.round(p95Minutes * 100) / 100,
				outlierEncounterIds,
			}
		})

		return { steps }
	}

	// ========================================================================
	// SLA Export (ADM-BE-09 AC3)
	// ========================================================================

	async exportCompliance(input: { workflowType: string; dateFrom: string; dateTo: string; facilityId: string }) {
		const [facilityRow] = await db
			.select({ name: facilities.name })
			.from(facilities)
			.where(eq(facilities.id, input.facilityId))
			.limit(1)

		const rows = await db
			.select({
				encounterId: workflowStatusLog.encounterId,
				workflow: workflowStatusLog.workflow,
				step: workflowStatusLog.step,
				startedAt: workflowStatusLog.startedAt,
				endedAt: workflowStatusLog.endedAt,
				durationMinutes: workflowStatusLog.durationMinutes,
				isBreached: workflowStatusLog.isBreached,
				isHardCapBreached: workflowStatusLog.isHardCapBreached,
			})
			.from(workflowStatusLog)
			.where(
				and(
					eq(workflowStatusLog.facilityId, input.facilityId),
					eq(workflowStatusLog.workflow, input.workflowType as SlaWorkflowType),
					gte(workflowStatusLog.startedAt, new Date(input.dateFrom)),
					lte(workflowStatusLog.startedAt, new Date(input.dateTo + "T23:59:59Z"))
				)
			)
			.orderBy(asc(workflowStatusLog.startedAt))

		return {
			facilityName: facilityRow?.name ?? input.facilityId,
			reportPeriod: `${input.dateFrom} to ${input.dateTo}`,
			generatedAt: new Date().toISOString(),
			rows: rows.map(r => ({
				encounterId: r.encounterId,
				workflow: r.workflow,
				step: r.step,
				startedAt: r.startedAt.toISOString(),
				endedAt: r.endedAt ? r.endedAt.toISOString() : null,
				durationMinutes: r.durationMinutes,
				isBreached: r.isBreached,
				isHardCapBreached: r.isHardCapBreached,
			})),
		}
	}
}
