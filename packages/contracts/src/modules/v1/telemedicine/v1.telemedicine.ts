import { oc } from "@orpc/contract"

import { telemedicineContract } from "./telemedicine.contract.js"

export const v1Telemedicine = oc.prefix("/telemedicine").router(oc.router(telemedicineContract))
