import { and, eq } from "drizzle-orm"

import { SLA_STEP_DEFAULT_TARGETS, type SlaStepType } from "@repo/contracts"
import { slaStepConfigs } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

// ---------------------------------------------------------------------------
// Mapping from (eventWorkflowType, toStatus) → TOR SlaStepType
//
// Derived from SLA_STEP_TO_EVENT_STATUS in @repo/contracts (inverted for
// lookup at event-write time). When an event writer calls resolveStepTarget
// the system looks up the facility override from slaStepConfigs first, then
// falls back to the TOR default from SLA_STEP_DEFAULT_TARGETS.
// ---------------------------------------------------------------------------

const EVENT_STATUS_TO_STEP_TYPE: Record<string, Record<string, SlaStepType>> = {
	opd: {
		arrived: "opd_triage",
		triaged: "opd_triage",
		waiting: "opd_registration",
		registered: "opd_registration",
		vitals_recorded: "opd_vitals",
		in_consultation: "opd_consultation",
		in_progress: "opd_consultation",
		completed: "opd_disposition",
		discharged: "opd_disposition",
	},
	ed: {
		triaged: "ed_rapid_triage",
		registered: "ed_registration",
		// Merge-path pre-encounter → patient chart uses "ed_registered" toStatus
		ed_registered: "ed_registration",
		discharged: "ed_disposition",
		admitted: "ed_disposition",
	},
	admission: {
		admitted: "admission_order",
		bed_reserved: "admission_bed_assignment",
		bed_assigned: "admission_bed_assignment",
		oriented: "admission_financial_orientation",
		transferred_to_ward: "admission_physical_transfer",
	},
	discharge: {
		may_go_home: "discharge_may_go_home",
		discharge_ordered: "discharge_may_go_home",
		chart_completed: "discharge_chart_completion",
		cleared: "discharge_clearance",
		billed: "discharge_bill_generation",
		gate_pass_issued: "discharge_gate_pass",
		discharged: "discharge_gate_pass",
		// ED disposition "discharge" = patient is sent home — equivalent to gate-pass release
		discharge: "discharge_gate_pass",
	},
	pharmacy: {
		rx_verified: "pharmacy_rx_verification",
		// verifyOrder emits "active" when the pharmacist approves — this IS the Rx verification step
		active: "pharmacy_rx_verification",
		cleared_for_dispensing: "pharmacy_clearance",
		dispensed: "pharmacy_dispensing",
		completed: "pharmacy_dispensing",
	},
	ancillary: {
		lab_ordered: "ancillary_order_receipt",
		imaging_ordered: "ancillary_order_receipt",
		cleared_for_procedure: "ancillary_payment_clearance",
		in_progress: "ancillary_procedure",
		resulted: "ancillary_release",
		released: "ancillary_release",
	},
	// ---------------------------------------------------------------------------
	// Billing — discharge_bill_generation step (Flow 5, Step 4) is satisfied when
	// the invoice transitions to a finalised or paid state.
	// ---------------------------------------------------------------------------
	billing: {
		finalized: "discharge_bill_generation",
		paid: "discharge_bill_generation",
		partially_paid: "discharge_bill_generation",
	},
}

/**
 * Resolves the effective SLA target minutes for a workflow step event.
 *
 * Resolution order:
 *   1. Active facility-specific override from `slaStepConfigs`
 *   2. TOR default from `SLA_STEP_DEFAULT_TARGETS`
 *   3. null — when the (workflowType, toStatus) pair has no known step mapping
 *
 * @param facilityId  UUID of the facility whose overrides should be checked
 * @param workflowType  encounterStatusEvents.workflowType value (e.g. "opd", "ed")
 * @param toStatus  encounterStatusEvents.toStatus value (e.g. "arrived", "waiting")
 */
export async function resolveStepTarget(
	facilityId: string,
	workflowType: string,
	toStatus: string
): Promise<number | null> {
	const stepType = EVENT_STATUS_TO_STEP_TYPE[workflowType]?.[toStatus]
	if (!stepType) return null

	const [override] = await db
		.select({ targetMinutes: slaStepConfigs.targetMinutes })
		.from(slaStepConfigs)
		.where(
			and(
				eq(slaStepConfigs.facilityId, facilityId),
				eq(slaStepConfigs.stepType, stepType),
				eq(slaStepConfigs.isActive, true)
			)
		)
		.limit(1)

	if (override) return override.targetMinutes
	return SLA_STEP_DEFAULT_TARGETS[stepType]
}

/**
 * Resolves effective SLA target minutes for a TOR step type directly.
 *
 * Used for non-encounter workflows (Flow 3 lab/radiology, Flow 7 medical records /
 * certificate issuance) that map to a specific TOR SlaStepType but do NOT write
 * rows to encounterStatusEvents and therefore cannot go through resolveStepTarget().
 *
 * Resolution order:
 *   1. Active facility-specific override from `slaStepConfigs`
 *   2. TOR default from `SLA_STEP_DEFAULT_TARGETS`
 */
export async function resolveStepTargetByType(
	facilityId: string,
	stepType: SlaStepType
): Promise<number> {
	const [override] = await db
		.select({ targetMinutes: slaStepConfigs.targetMinutes })
		.from(slaStepConfigs)
		.where(
			and(
				eq(slaStepConfigs.facilityId, facilityId),
				eq(slaStepConfigs.stepType, stepType),
				eq(slaStepConfigs.isActive, true)
			)
		)
		.limit(1)

	if (override) return override.targetMinutes
	return SLA_STEP_DEFAULT_TARGETS[stepType]
}
