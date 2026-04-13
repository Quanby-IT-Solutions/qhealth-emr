import { oc } from "@orpc/contract"

import { bedContract } from "./beds.contract.js"

export const v1Bed = oc.prefix("/bed").router(oc.router(bedContract))
