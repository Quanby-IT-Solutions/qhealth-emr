import { oc } from "@orpc/contract"

import { dischargeClearanceContract } from "./discharge-clearances.contract.js"

export const v1DischargeClearances = oc.prefix("/discharge-clearances").router(oc.router(dischargeClearanceContract))
