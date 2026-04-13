import { oc } from "@orpc/contract"

import { patientContract } from "./patients.contract.js"

export const v1Patient = oc.prefix("/patient").router(oc.router(patientContract))
