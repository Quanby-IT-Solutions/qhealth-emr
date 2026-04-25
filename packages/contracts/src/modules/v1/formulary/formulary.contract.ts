import { oc } from "@orpc/contract"

import {
	CreateDrugBrandSchema,
	CreateDrugGenericSchema,
	CreateFormularyItemSchema,
	DrugBrandListResponseSchema,
	DrugBrandSchema,
	DrugBrandSearchSchema,
	DrugGenericListResponseSchema,
	DrugGenericSchema,
	DrugGenericSearchSchema,
	FormularyItemFilterSchema,
	FormularyItemIdSchema,
	FormularyItemListResponseSchema,
	FormularyItemSchema,
	Icd10ListResponseSchema,
	Icd10SearchSchema,
	LoincListResponseSchema,
	LoincSearchSchema,
	RxnormListResponseSchema,
	RxnormSearchSchema,
	RvsListResponseSchema,
	RvsSearchSchema,
	SnomedCtListResponseSchema,
	SnomedCtSearchSchema,
	UpdateDrugBrandSchema,
	UpdateDrugGenericSchema,
	UpdateFormularyItemSchema,
} from "./formulary.schema.js"

// ============================================================================
// Drug Generics
// ============================================================================

export const drugGenericContract = {
	list: oc
		.route({
			method: "GET",
			path: "/drug-generics",
			summary: "List drug generics with search",
			tags: ["Formulary"],
		})
		.input(DrugGenericSearchSchema)
		.output(DrugGenericListResponseSchema),

	create: oc
		.route({
			method: "POST",
			path: "/drug-generics",
			summary: "Create a drug generic",
			tags: ["Formulary"],
		})
		.input(CreateDrugGenericSchema)
		.output(DrugGenericSchema),

	update: oc
		.route({
			method: "PUT",
			path: "/drug-generics/{id}",
			summary: "Update a drug generic",
			tags: ["Formulary"],
		})
		.input(UpdateDrugGenericSchema)
		.output(DrugGenericSchema),
}

// ============================================================================
// Drug Brands
// ============================================================================

export const drugBrandContract = {
	list: oc
		.route({
			method: "GET",
			path: "/drug-brands",
			summary: "List drug brands with search",
			tags: ["Formulary"],
		})
		.input(DrugBrandSearchSchema)
		.output(DrugBrandListResponseSchema),

	create: oc
		.route({
			method: "POST",
			path: "/drug-brands",
			summary: "Create a drug brand",
			tags: ["Formulary"],
		})
		.input(CreateDrugBrandSchema)
		.output(DrugBrandSchema),

	update: oc
		.route({
			method: "PUT",
			path: "/drug-brands/{id}",
			summary: "Update a drug brand",
			tags: ["Formulary"],
		})
		.input(UpdateDrugBrandSchema)
		.output(DrugBrandSchema),
}

// ============================================================================
// Formulary Items
// ============================================================================

export const formularyItemContract = {
	list: oc
		.route({
			method: "GET",
			path: "/formulary-items",
			summary: "List formulary items for a facility",
			tags: ["Formulary"],
		})
		.input(FormularyItemFilterSchema)
		.output(FormularyItemListResponseSchema),

	get: oc
		.route({
			method: "GET",
			path: "/formulary-items/{id}",
			summary: "Get a formulary item",
			tags: ["Formulary"],
		})
		.input(FormularyItemIdSchema)
		.output(FormularyItemSchema),

	create: oc
		.route({
			method: "POST",
			path: "/formulary-items",
			summary: "Add a drug to a facility formulary",
			tags: ["Formulary"],
		})
		.input(CreateFormularyItemSchema)
		.output(FormularyItemSchema),

	update: oc
		.route({
			method: "PUT",
			path: "/formulary-items/{id}",
			summary: "Update a formulary item",
			tags: ["Formulary"],
		})
		.input(UpdateFormularyItemSchema)
		.output(FormularyItemSchema),

	delete: oc
		.route({
			method: "DELETE",
			path: "/formulary-items/{id}",
			summary: "Remove a drug from facility formulary",
			tags: ["Formulary"],
		})
		.input(FormularyItemIdSchema)
		.output(FormularyItemSchema),
}

// ============================================================================
// Clinical Code Sets
// ============================================================================

export const icd10Contract = {
	search: oc
		.route({
			method: "GET",
			path: "/code-sets/icd10",
			summary: "Search ICD-10 codes",
			tags: ["Code Sets"],
		})
		.input(Icd10SearchSchema)
		.output(Icd10ListResponseSchema),
}

export const loincContract = {
	search: oc
		.route({
			method: "GET",
			path: "/code-sets/loinc",
			summary: "Search LOINC codes",
			tags: ["Code Sets"],
		})
		.input(LoincSearchSchema)
		.output(LoincListResponseSchema),
}

export const rxnormContract = {
	search: oc
		.route({
			method: "GET",
			path: "/code-sets/rxnorm",
			summary: "Search RxNorm codes",
			tags: ["Code Sets"],
		})
		.input(RxnormSearchSchema)
		.output(RxnormListResponseSchema),
}

export const rvsContract = {
	search: oc
		.route({
			method: "GET",
			path: "/code-sets/rvs",
			summary: "Search RVS codes",
			tags: ["Code Sets"],
		})
		.input(RvsSearchSchema)
		.output(RvsListResponseSchema),
}

export const snomedCtContract = {
	search: oc
		.route({
			method: "GET",
			path: "/code-sets/snomed-ct",
			summary: "Search SNOMED CT concepts",
			tags: ["Code Sets"],
		})
		.input(SnomedCtSearchSchema)
		.output(SnomedCtListResponseSchema),
}
