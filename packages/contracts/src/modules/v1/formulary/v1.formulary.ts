import { oc } from "@orpc/contract"

import {
	drugBrandContract,
	drugGenericContract,
	formularyItemContract,
	icd10Contract,
	loincContract,
	rvsContract,
	rxnormContract,
	snomedCtContract,
} from "./formulary.contract.js"

export const v1Formulary = oc.prefix("/formulary").router(
	oc.router({
		drugGeneric: drugGenericContract,
		drugBrand: drugBrandContract,
		item: formularyItemContract,
		icd10: icd10Contract,
		loinc: loincContract,
		rxnorm: rxnormContract,
		rvs: rvsContract,
		snomedCt: snomedCtContract,
	})
)
