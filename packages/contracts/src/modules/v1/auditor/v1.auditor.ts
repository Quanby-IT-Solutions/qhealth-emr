import { oc } from "@orpc/contract"

import { auditorBreakGlassContract, auditorEventsContract } from "./auditor.contract.js"

export const v1Auditor = oc.prefix("/auditor").router(
	oc.router({
		events: oc.router(auditorEventsContract),
		breakGlass: oc.router(auditorBreakGlassContract),
	})
)
