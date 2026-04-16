import { oc } from "@orpc/contract"

import { labContract } from "./lab.contract.js"

/**
 * Lab router with /lab prefix
 */
export const v1Lab = oc.prefix("/lab").router(labContract)
