import { oc } from "@orpc/contract"

import { surgicalContract } from "./surgical.contract.js"

/**
 * Surgical router with /surgical prefix
 */
export const v1Surgical = oc.prefix("/surgical").router(surgicalContract)
