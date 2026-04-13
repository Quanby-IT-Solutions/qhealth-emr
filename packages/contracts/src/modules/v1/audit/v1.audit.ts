import { oc } from "@orpc/contract"

import { auditLogContract, breakGlassContract } from "./audit.contract.js"

export const v1Audit = oc.prefix("/audit").router(
	oc.router({
		log: auditLogContract,
		breakGlass: breakGlassContract,
	})
)
