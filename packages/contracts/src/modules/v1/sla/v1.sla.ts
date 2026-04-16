import { oc } from "@orpc/contract"

import { slaContract } from "./sla.contract.js"

/**
 * SLA router with /sla prefix
 */
export const v1Sla = oc.prefix("/sla").router(slaContract)
