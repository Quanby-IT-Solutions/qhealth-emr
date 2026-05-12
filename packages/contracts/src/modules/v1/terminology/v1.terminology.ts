import { oc } from "@orpc/contract"

import { terminologyContract } from "./terminology.contract.js"

export const v1Terminology = oc.prefix("/terminology").router(oc.router(terminologyContract))
