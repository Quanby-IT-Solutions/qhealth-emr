import { oc } from "@orpc/contract"

import { fhirContract } from "./fhir.contract.js"

/**
 * FHIR router with /fhir prefix
 */
export const v1Fhir = oc.prefix("/fhir").router(fhirContract)
