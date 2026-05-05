import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	AdminCatalogSearchSchema,
	AdminUpdateFormularyItemSchema,
	CatalogEntryIdSchema,
	CatalogEntryListResponseSchema,
	CatalogEntrySchema,
	CatalogVersionFilterSchema,
	CatalogVersionListResponseSchema,
	CatalogVersionSchema,
	CodeSetCatalogUploadFilterSchema,
	CodeSetCatalogUploadListResponseSchema,
	CodeSetCatalogUploadSchema,
	CreateCatalogEntrySchema,
	CreateDeprecatedCodeMappingSchema,
	CreateDrugBrandSchema,
	CreateDrugGenericSchema,
	CreateFormularyItemSchema,
	DeprecatedCodeMappingFilterSchema,
	DeprecatedCodeMappingIdSchema,
	DeprecatedCodeMappingListResponseSchema,
	DeprecatedCodeMappingSchema,
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
	PublishCatalogVersionSchema,
	RecordCatalogUploadSchema,
	RvsListResponseSchema,
	RvsSearchSchema,
	RxnormListResponseSchema,
	RxnormSearchSchema,
	SetCodeActiveSchema,
	SnomedCtListResponseSchema,
	SnomedCtSearchSchema,
	UpdateCatalogEntrySchema,
	UpdateDeprecatedCodeMappingSchema,
	UpdateDrugBrandSchema,
	UpdateDrugGenericSchema,
	UpdateFormularyClinicalPolicySchema,
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
			summary: "Update a formulary item (admin master-data only)",
			tags: ["Formulary"],
		})
		.input(AdminUpdateFormularyItemSchema)
		.output(FormularyItemSchema),

	updateClinicalPolicy: oc
		.route({
			method: "PUT",
			path: "/formulary-items/{id}/clinical-policy",
			summary: "Update clinical formulary policy (pharmacist-owned fields)",
			tags: ["Formulary"],
		})
		.input(UpdateFormularyClinicalPolicySchema)
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

// ============================================================================
// Code Set Admin (FORM-001 — terminology governance)
// ============================================================================

export const codeSetAdminContract = {
	/** List catalog upload history for audit and governance review */
	listUploads: oc
		.route({
			method: "GET",
			path: "/code-sets/admin/uploads",
			summary: "List catalog upload history",
			tags: ["Code Sets Admin"],
		})
		.input(CodeSetCatalogUploadFilterSchema)
		.output(CodeSetCatalogUploadListResponseSchema),

	/** Record a catalog refresh event (bulk upsert performed at the DB/seed level) */
	recordUpload: oc
		.route({
			method: "POST",
			path: "/code-sets/admin/uploads",
			summary: "Record a catalog refresh event",
			tags: ["Code Sets Admin"],
		})
		.input(RecordCatalogUploadSchema)
		.output(CodeSetCatalogUploadSchema),

	/** Mark an individual code entry active or inactive */
	setCodeActive: oc
		.route({
			method: "PUT",
			path: "/code-sets/admin/code-active",
			summary: "Activate or deactivate an individual terminology code",
			tags: ["Code Sets Admin"],
		})
		.input(SetCodeActiveSchema)
		.output(z.object({ success: z.boolean(), codeId: z.string(), isActive: z.boolean() })),

	/** List deprecated code mappings */
	listDeprecations: oc
		.route({
			method: "GET",
			path: "/code-sets/admin/deprecations",
			summary: "List deprecated code mappings",
			tags: ["Code Sets Admin"],
		})
		.input(DeprecatedCodeMappingFilterSchema)
		.output(DeprecatedCodeMappingListResponseSchema),

	/** Create a deprecated code mapping */
	createDeprecation: oc
		.route({
			method: "POST",
			path: "/code-sets/admin/deprecations",
			summary: "Map a deprecated code to its replacement",
			tags: ["Code Sets Admin"],
		})
		.input(CreateDeprecatedCodeMappingSchema)
		.output(DeprecatedCodeMappingSchema),

	/** Update a deprecated code mapping */
	updateDeprecation: oc
		.route({
			method: "PUT",
			path: "/code-sets/admin/deprecations/{id}",
			summary: "Update a deprecated code mapping",
			tags: ["Code Sets Admin"],
		})
		.input(UpdateDeprecatedCodeMappingSchema)
		.output(DeprecatedCodeMappingSchema),

	/** Delete a deprecated code mapping */
	deleteDeprecation: oc
		.route({
			method: "DELETE",
			path: "/code-sets/admin/deprecations/{id}",
			summary: "Delete a deprecated code mapping",
			tags: ["Code Sets Admin"],
		})
		.input(DeprecatedCodeMappingIdSchema)
		.output(z.object({ success: z.boolean(), id: z.string() })),

	// ── Catalog Entry Editor (FORM-006) ──────────────────────────────────────

	/** Search catalog entries including inactive — for admin editing workflows */
	adminSearchEntries: oc
		.route({
			method: "GET",
			path: "/code-sets/admin/entries",
			summary: "Admin search catalog entries (includes inactive)",
			tags: ["Code Sets Admin"],
		})
		.input(AdminCatalogSearchSchema)
		.output(CatalogEntryListResponseSchema),

	/** Add a new catalog entry to a terminology catalog */
	createEntry: oc
		.route({
			method: "POST",
			path: "/code-sets/admin/entries",
			summary: "Add a new catalog entry",
			tags: ["Code Sets Admin"],
		})
		.input(CreateCatalogEntrySchema)
		.output(CatalogEntrySchema),

	/** Update an existing catalog entry (including deprecate/reactivate) */
	updateEntry: oc
		.route({
			method: "PUT",
			path: "/code-sets/admin/entries/{id}",
			summary: "Update a catalog entry",
			tags: ["Code Sets Admin"],
		})
		.input(UpdateCatalogEntrySchema)
		.output(CatalogEntrySchema),

	/** Delete a catalog entry by ID (soft-delete via isActive=false is preferred; hard delete is admin-only) */
	deleteEntry: oc
		.route({
			method: "DELETE",
			path: "/code-sets/admin/entries/{id}",
			summary: "Delete a catalog entry",
			tags: ["Code Sets Admin"],
		})
		.input(CatalogEntryIdSchema)
		.output(z.object({ success: z.boolean(), id: z.string() })),

	// ── Catalog Versions (FORM-006) ───────────────────────────────────────────

	/** List catalog version publication history */
	listVersions: oc
		.route({
			method: "GET",
			path: "/code-sets/admin/versions",
			summary: "List catalog version history",
			tags: ["Code Sets Admin"],
		})
		.input(CatalogVersionFilterSchema)
		.output(CatalogVersionListResponseSchema),

	/** Publish a new catalog version — marks the current state as an authoritative release */
	publishVersion: oc
		.route({
			method: "POST",
			path: "/code-sets/admin/versions",
			summary: "Publish a versioned catalog snapshot",
			tags: ["Code Sets Admin"],
		})
		.input(PublishCatalogVersionSchema)
		.output(CatalogVersionSchema),
}
