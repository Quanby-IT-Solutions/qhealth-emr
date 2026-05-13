import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	ClearanceStatusSchema,
	ConfirmClearanceInputSchema,
	GatePassSchema,
	GetClearanceStatusInputSchema,
	GetGatePassInputSchema,
	IssueGatePassInputSchema,
} from "./discharge.schema.js"

export const dischargeContract = {
	confirmPharmacyClearance: oc
		.route({
			method: "POST",
			path: "/clearances/{encounterId}/pharmacy",
			summary: "Confirm pharmacy clearance for discharge",
			tags: ["Discharge"],
		})
		.input(ConfirmClearanceInputSchema)
		.output(ClearanceStatusSchema),

	confirmNursingClearance: oc
		.route({
			method: "POST",
			path: "/clearances/{encounterId}/nursing",
			summary: "Confirm nursing ward clearance for discharge",
			tags: ["Discharge"],
		})
		.input(ConfirmClearanceInputSchema)
		.output(ClearanceStatusSchema),

	confirmBillingSignOff: oc
		.route({
			method: "POST",
			path: "/clearances/{encounterId}/billing",
			summary: "Confirm billing sign-off for discharge",
			tags: ["Discharge"],
		})
		.input(ConfirmClearanceInputSchema)
		.output(ClearanceStatusSchema),

	getClearanceStatus: oc
		.route({
			method: "GET",
			path: "/clearances/{encounterId}",
			summary: "Get clearance status for a pending-discharge encounter",
			tags: ["Discharge"],
		})
		.input(GetClearanceStatusInputSchema)
		.output(ClearanceStatusSchema),

	issueGatePass: oc
		.route({
			method: "POST",
			path: "/gate-pass/{encounterId}",
			summary: "Issue gate pass (Registrar) — requires all clearances confirmed",
			tags: ["Discharge"],
		})
		.input(IssueGatePassInputSchema)
		.output(GatePassSchema),

	getGatePass: oc
		.route({
			method: "GET",
			path: "/gate-pass/{encounterId}",
			summary: "Get issued gate pass for display or reprint",
			tags: ["Discharge"],
		})
		.input(GetGatePassInputSchema)
		.output(GatePassSchema.nullable()),
}
