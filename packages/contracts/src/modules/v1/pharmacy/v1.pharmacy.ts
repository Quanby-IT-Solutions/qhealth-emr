import { oc } from "@orpc/contract"

import { pharmacyContract } from "./pharmacy.contract.js"

export const v1Pharmacy = oc.prefix("/pharmacy").router(oc.router(pharmacyContract))
