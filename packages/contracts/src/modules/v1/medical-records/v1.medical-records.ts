import { oc } from "@orpc/contract"

import { medicalRecordsContract } from "./medical-records.contract.js"

export const v1MedicalRecords = oc.router(medicalRecordsContract)
