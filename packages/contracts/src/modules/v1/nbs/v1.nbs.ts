import { oc } from "@orpc/contract"

import { nbsContract } from "./nbs.contract.js"

/**
 * NBS (Newborn Screening) router with /nbs prefix
 */
export const v1Nbs = oc.prefix("/nbs").router(nbsContract)
