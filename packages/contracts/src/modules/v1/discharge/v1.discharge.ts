import { oc } from "@orpc/contract"

import { dischargeContract } from "./discharge.contract.js"

export const v1Discharge = oc.prefix("/discharge").router(oc.router(dischargeContract))
