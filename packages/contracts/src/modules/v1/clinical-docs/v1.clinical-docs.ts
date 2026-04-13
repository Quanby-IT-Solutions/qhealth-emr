import { oc } from "@orpc/contract"

import { clinicalDocsContract } from "./clinical-docs.contract.js"

export const v1ClinicalDocs = oc
	.prefix("/clinical-docs")
	.router(oc.router(clinicalDocsContract))
