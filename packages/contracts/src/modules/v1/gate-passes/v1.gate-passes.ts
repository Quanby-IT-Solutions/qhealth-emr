import { oc } from "@orpc/contract"

import { gatePassContract } from "./gate-passes.contract.js"

export const v1GatePasses = oc.prefix("/gate-passes").router(oc.router(gatePassContract))
