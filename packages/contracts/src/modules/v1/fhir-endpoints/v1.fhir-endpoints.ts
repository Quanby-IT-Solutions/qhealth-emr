import { oc } from "@orpc/contract"

import { fhirEndpointsContract } from "./fhir-endpoints.contract.js"

export const v1FhirEndpoints = oc.prefix("/fhir-endpoints").router(oc.router(fhirEndpointsContract))
