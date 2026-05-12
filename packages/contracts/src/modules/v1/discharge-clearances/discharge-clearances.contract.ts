import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	ClearanceItemSchema,
	ClearancesResponseSchema,
	RecordClearanceSchema,
} from "./discharge-clearances.schema.js"

export const dischargeClearanceContract = {
	list: oc
		.route({ method: "GET", path: "/encounters/{encounterId}/clearances", summary: "List clearances for an encounter", tags: ["Discharge"] })
		.input(z.object({ encounterId: z.string().uuid() }))
		.output(ClearancesResponseSchema),

	recordPharmacy: oc
		.route({ method: "POST", path: "/encounters/{encounterId}/clearances/pharmacy", summary: "Record pharmacy clearance", tags: ["Discharge"] })
		.input(RecordClearanceSchema)
		.output(ClearanceItemSchema),

	recordNurse: oc
		.route({ method: "POST", path: "/encounters/{encounterId}/clearances/nurse", summary: "Record nurse clearance", tags: ["Discharge"] })
		.input(RecordClearanceSchema)
		.output(ClearanceItemSchema),

	recordBilling: oc
		.route({ method: "POST", path: "/encounters/{encounterId}/clearances/billing", summary: "Record billing clearance", tags: ["Discharge"] })
		.input(RecordClearanceSchema)
		.output(ClearanceItemSchema),

	revokePharmacy: oc
		.route({ method: "DELETE", path: "/encounters/{encounterId}/clearances/pharmacy", summary: "Revoke pharmacy clearance", tags: ["Discharge"] })
		.input(z.object({ encounterId: z.string().uuid() }))
		.output(z.void()),

	revokeNurse: oc
		.route({ method: "DELETE", path: "/encounters/{encounterId}/clearances/nurse", summary: "Revoke nurse clearance", tags: ["Discharge"] })
		.input(z.object({ encounterId: z.string().uuid() }))
		.output(z.void()),

	revokeBilling: oc
		.route({ method: "DELETE", path: "/encounters/{encounterId}/clearances/billing", summary: "Revoke billing clearance", tags: ["Discharge"] })
		.input(z.object({ encounterId: z.string().uuid() }))
		.output(z.void()),
}
