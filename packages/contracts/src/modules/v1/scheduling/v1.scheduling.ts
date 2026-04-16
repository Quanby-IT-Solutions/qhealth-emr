import { oc } from "@orpc/contract"

import { schedulingContract } from "./scheduling.contract.js"

/**
 * Scheduling router with /scheduling prefix
 */
export const v1Scheduling = oc.prefix("/scheduling").router(schedulingContract)
