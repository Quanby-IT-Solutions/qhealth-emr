import { oc } from "@orpc/contract"

import { housekeepingContract } from "./housekeeping.contract.js"

export const v1Housekeeping = oc.prefix("/housekeeping").router(oc.router(housekeepingContract))
