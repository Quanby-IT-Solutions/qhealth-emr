import { z } from "zod"

// ============================================================================
// Pagination helpers
// ============================================================================

const PaginationInputSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(50),
})

const PaginatedResponseSchema = z.object({
	total: z.number(),
	page: z.number(),
	limit: z.number(),
	totalPages: z.number(),
})

// ============================================================================
// Timestamp helper
// ============================================================================

const dateOrString = z
	.union([z.date(), z.string()])
	.transform(v => (typeof v === "string" ? new Date(v) : v))

// ============================================================================
// Drug Generics
// ============================================================================

export const DrugGenericSchema = z.object({
	id: z.string().uuid(),
	genericName: z.string(),
	rxnormCode: z.string().nullable(),
	atcCode: z.string().nullable(),
	isActive: z.boolean(),
	createdAt: dateOrString,
})

export type DrugGeneric = z.infer<typeof DrugGenericSchema>

export const DrugGenericSearchSchema = PaginationInputSchema.extend({
	search: z.string().optional(),
	isActive: z.union([z.boolean(), z.string().transform(v => v === "true")]).optional(),
})

export const DrugGenericListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(DrugGenericSchema),
})

export const CreateDrugGenericSchema = z.object({
	genericName: z.string().min(1).max(500),
	rxnormCode: z.string().max(50).optional(),
	atcCode: z.string().max(50).optional(),
})

export const UpdateDrugGenericSchema = z.object({
	id: z.string().uuid(),
	genericName: z.string().min(1).max(500).optional(),
	rxnormCode: z.string().max(50).nullable().optional(),
	atcCode: z.string().max(50).nullable().optional(),
	isActive: z.boolean().optional(),
})

// ============================================================================
// Drug Brands
// ============================================================================

export const DrugBrandSchema = z.object({
	id: z.string().uuid(),
	drugGenericId: z.string().uuid(),
	brandName: z.string(),
	manufacturer: z.string().nullable(),
	isActive: z.boolean(),
	createdAt: dateOrString,
})

export type DrugBrand = z.infer<typeof DrugBrandSchema>

export const DrugBrandSearchSchema = PaginationInputSchema.extend({
	search: z.string().optional(),
	drugGenericId: z.string().uuid().optional(),
	isActive: z.union([z.boolean(), z.string().transform(v => v === "true")]).optional(),
})

export const DrugBrandListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(DrugBrandSchema),
})

export const CreateDrugBrandSchema = z.object({
	drugGenericId: z.string().uuid(),
	brandName: z.string().min(1).max(500),
	manufacturer: z.string().max(500).optional(),
})

export const UpdateDrugBrandSchema = z.object({
	id: z.string().uuid(),
	brandName: z.string().min(1).max(500).optional(),
	manufacturer: z.string().max(500).nullable().optional(),
	isActive: z.boolean().optional(),
})

// ============================================================================
// Formulary Items
// ============================================================================

export const FormularyItemSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	drugGenericId: z.string().uuid(),
	drugBrandId: z.string().uuid().nullable(),
	doseForm: z.string(),
	strength: z.string(),
	route: z.string(),
	isActive: z.boolean(),
	isHighAlert: z.boolean(),
	highAlertNotes: z.string().nullable(),
	isRestricted: z.boolean(),
	restrictionNotes: z.string().nullable(),
	formularyNotes: z.string().nullable(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
	genericName: z.string(),
	brandName: z.string().nullable(),
})

export type FormularyItem = z.infer<typeof FormularyItemSchema>

export const FormularyItemFilterSchema = PaginationInputSchema.extend({
	facilityId: z.string().uuid(),
	search: z.string().optional(),
	drugGenericId: z.string().uuid().optional(),
	isActive: z.union([z.boolean(), z.string().transform(v => v === "true")]).optional(),
	isHighAlert: z.union([z.boolean(), z.string().transform(v => v === "true")]).optional(),
	isRestricted: z.union([z.boolean(), z.string().transform(v => v === "true")]).optional(),
})

export const FormularyItemListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(FormularyItemSchema),
})

// Admin-only: creates the master-data record; clinical policy fields are NOT accepted at creation.
export const CreateFormularyItemSchema = z.object({
	facilityId: z.string().uuid(),
	drugGenericId: z.string().uuid(),
	drugBrandId: z.string().uuid().optional(),
	doseForm: z.string().min(1).max(255),
	strength: z.string().min(1).max(255),
	route: z.string().min(1).max(255),
})

// Admin-only: updates master-data fields only. Clinical policy is NOT accepted.
export const AdminUpdateFormularyItemSchema = z.object({
	id: z.string().uuid(),
	drugBrandId: z.string().uuid().nullable().optional(),
	doseForm: z.string().min(1).max(255).optional(),
	strength: z.string().min(1).max(255).optional(),
	route: z.string().min(1).max(255).optional(),
	isActive: z.boolean().optional(),
})

// Pharmacist-only: updates clinical formulary policy. Master-data is NOT accepted.
export const UpdateFormularyClinicalPolicySchema = z.object({
	id: z.string().uuid(),
	isHighAlert: z.boolean().optional(),
	highAlertNotes: z.string().max(1000).nullable().optional(),
	isRestricted: z.boolean().optional(),
	restrictionNotes: z.string().max(1000).nullable().optional(),
	formularyNotes: z.string().max(2000).nullable().optional(),
})

export type AdminUpdateFormularyItem = z.infer<typeof AdminUpdateFormularyItemSchema>
export type UpdateFormularyClinicalPolicy = z.infer<typeof UpdateFormularyClinicalPolicySchema>

export const FormularyItemIdSchema = z.object({ id: z.string().uuid() })

// ============================================================================
// ICD-10 Codes
// ============================================================================

export const Icd10CodeSchema = z.object({
	id: z.string().uuid(),
	code: z.string(),
	description: z.string(),
	category: z.string().nullable(),
	isActive: z.boolean(),
	createdAt: dateOrString,
})

export type Icd10Code = z.infer<typeof Icd10CodeSchema>

export const Icd10SearchSchema = PaginationInputSchema.extend({
	search: z.string().optional(),
	category: z.string().optional(),
})

export const Icd10ListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(Icd10CodeSchema),
})

// ============================================================================
// LOINC Codes
// ============================================================================

export const LoincCodeSchema = z.object({
	id: z.string().uuid(),
	loincNum: z.string(),
	component: z.string().nullable(),
	property: z.string().nullable(),
	timeAspect: z.string().nullable(),
	system: z.string().nullable(),
	scale: z.string().nullable(),
	method: z.string().nullable(),
	longCommonName: z.string().nullable(),
	isActive: z.boolean(),
	createdAt: dateOrString,
})

export type LoincCode = z.infer<typeof LoincCodeSchema>

export const LoincSearchSchema = PaginationInputSchema.extend({
	search: z.string().optional(),
})

export const LoincListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(LoincCodeSchema),
})

// ============================================================================
// RxNorm Codes
// ============================================================================

export const RxnormCodeSchema = z.object({
	id: z.string().uuid(),
	rxcui: z.string(),
	name: z.string(),
	tty: z.string().nullable(),
	isActive: z.boolean(),
	createdAt: dateOrString,
})

export type RxnormCode = z.infer<typeof RxnormCodeSchema>

export const RxnormSearchSchema = PaginationInputSchema.extend({
	search: z.string().optional(),
})

export const RxnormListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(RxnormCodeSchema),
})

// ============================================================================
// RVS Codes
// ============================================================================

export const RvsCodeSchema = z.object({
	id: z.string().uuid(),
	rvsCode: z.string(),
	procedureName: z.string(),
	category: z.string().nullable(),
	rvsValue: z.string().nullable(),
	effectiveDate: z.string().nullable(),
	isActive: z.boolean(),
	createdAt: dateOrString,
})

export type RvsCode = z.infer<typeof RvsCodeSchema>

export const RvsSearchSchema = PaginationInputSchema.extend({
	search: z.string().optional(),
	category: z.string().optional(),
})

export const RvsListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(RvsCodeSchema),
})

// ============================================================================
// SNOMED CT Codes
// ============================================================================

export const SnomedCtCodeSchema = z.object({
	id: z.string().uuid(),
	conceptId: z.string(),
	fsn: z.string(),
	preferredTerm: z.string(),
	semanticTag: z.string().nullable(),
	isActive: z.boolean(),
	createdAt: dateOrString,
})

export type SnomedCtCode = z.infer<typeof SnomedCtCodeSchema>

export const SnomedCtSearchSchema = PaginationInputSchema.extend({
	search: z.string().optional(),
	semanticTag: z.string().optional(),
})

export const SnomedCtListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(SnomedCtCodeSchema),
})

// ============================================================================
// Code Set Catalog Uploads (FORM-001 — terminology governance)
// ============================================================================

export const CatalogTypeSchema = z.enum(["icd10", "loinc", "rxnorm", "rvs", "snomed_ct"])
export type CatalogType = z.infer<typeof CatalogTypeSchema>

export const CodeSetCatalogUploadSchema = z.object({
	id: z.string().uuid(),
	catalogType: CatalogTypeSchema,
	version: z.string().nullable(),
	notes: z.string().nullable(),
	entryCount: z.number().int(),
	uploadedByUserId: z.string(),
	status: z.enum(["completed", "failed"]),
	createdAt: dateOrString,
})
export type CodeSetCatalogUpload = z.infer<typeof CodeSetCatalogUploadSchema>

export const CodeSetCatalogUploadFilterSchema = PaginationInputSchema.extend({
	catalogType: CatalogTypeSchema.optional(),
})

export const CodeSetCatalogUploadListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(CodeSetCatalogUploadSchema),
})

export const RecordCatalogUploadSchema = z.object({
	catalogType: CatalogTypeSchema,
	version: z.string().max(100).optional(),
	notes: z.string().max(2000).optional(),
	entryCount: z.number().int().min(0),
	status: z.enum(["completed", "failed"]).default("completed"),
})

// ============================================================================
// Deprecated Code Mappings (FORM-001 — terminology governance)
// ============================================================================

export const DeprecatedCodeMappingSchema = z.object({
	id: z.string().uuid(),
	catalogType: CatalogTypeSchema,
	fromCode: z.string(),
	toCode: z.string().nullable(),
	notes: z.string().nullable(),
	isActive: z.boolean(),
	createdByUserId: z.string(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})
export type DeprecatedCodeMapping = z.infer<typeof DeprecatedCodeMappingSchema>

export const DeprecatedCodeMappingFilterSchema = PaginationInputSchema.extend({
	catalogType: CatalogTypeSchema.optional(),
	fromCode: z.string().optional(),
	isActive: z.union([z.boolean(), z.string().transform(v => v === "true")]).optional(),
})

export const DeprecatedCodeMappingListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(DeprecatedCodeMappingSchema),
})

export const CreateDeprecatedCodeMappingSchema = z.object({
	catalogType: CatalogTypeSchema,
	fromCode: z.string().min(1).max(100),
	toCode: z.string().max(100).nullable().optional(),
	notes: z.string().max(2000).optional(),
})

export const UpdateDeprecatedCodeMappingSchema = z.object({
	id: z.string().uuid(),
	toCode: z.string().max(100).nullable().optional(),
	notes: z.string().max(2000).nullable().optional(),
	isActive: z.boolean().optional(),
})

export const DeprecatedCodeMappingIdSchema = z.object({ id: z.string().uuid() })

// ============================================================================
// Set Code Active (FORM-001 — mark individual codes active/inactive)
// ============================================================================

export const SetCodeActiveSchema = z.object({
	catalogType: CatalogTypeSchema,
	codeId: z.string().uuid(),
	isActive: z.boolean(),
})

// ============================================================================
// Catalog Entry Admin — add / edit individual entries (FORM-006)
// ============================================================================

/**
 * Flat response shape for catalog entries across all catalog types.
 * Populated fields depend on the catalogType discriminant.
 */
export const CatalogEntrySchema = z.object({
	id: z.string().uuid(),
	catalogType: CatalogTypeSchema,
	isActive: z.boolean(),
	createdAt: dateOrString,
	// ICD-10
	code: z.string().nullable().optional(),
	description: z.string().nullable().optional(),
	// LOINC
	loincNum: z.string().nullable().optional(),
	longCommonName: z.string().nullable().optional(),
	component: z.string().nullable().optional(),
	property: z.string().nullable().optional(),
	timeAspect: z.string().nullable().optional(),
	system: z.string().nullable().optional(),
	scale: z.string().nullable().optional(),
	method: z.string().nullable().optional(),
	// RxNorm
	rxcui: z.string().nullable().optional(),
	name: z.string().nullable().optional(),
	tty: z.string().nullable().optional(),
	// RVS
	rvsCode: z.string().nullable().optional(),
	procedureName: z.string().nullable().optional(),
	rvsValue: z.string().nullable().optional(),
	effectiveDate: z.string().nullable().optional(),
	// SNOMED CT
	conceptId: z.string().nullable().optional(),
	fsn: z.string().nullable().optional(),
	preferredTerm: z.string().nullable().optional(),
	semanticTag: z.string().nullable().optional(),
	// Shared optional
	category: z.string().nullable().optional(),
})
export type CatalogEntry = z.infer<typeof CatalogEntrySchema>

export const CatalogEntryListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(CatalogEntrySchema),
})

export const AdminCatalogSearchSchema = PaginationInputSchema.extend({
	catalogType: CatalogTypeSchema,
	search: z.string().optional(),
	isActive: z.union([z.boolean(), z.string().transform(v => v === "true")]).optional(),
})

// Per-type create schemas
const CreateIcd10EntrySchema = z.object({
	catalogType: z.literal("icd10"),
	code: z.string().min(1).max(20),
	description: z.string().min(1).max(1000),
	category: z.string().max(100).optional(),
})

const CreateLoincEntrySchema = z.object({
	catalogType: z.literal("loinc"),
	loincNum: z.string().min(1).max(30),
	longCommonName: z.string().max(1000).optional(),
	component: z.string().max(500).optional(),
	property: z.string().max(100).optional(),
	timeAspect: z.string().max(100).optional(),
	system: z.string().max(500).optional(),
	scale: z.string().max(100).optional(),
	method: z.string().max(100).optional(),
})

const CreateRxnormEntrySchema = z.object({
	catalogType: z.literal("rxnorm"),
	rxcui: z.string().min(1).max(20),
	name: z.string().min(1).max(500),
	tty: z.string().max(50).optional(),
})

const CreateRvsEntrySchema = z.object({
	catalogType: z.literal("rvs"),
	rvsCode: z.string().min(1).max(20),
	procedureName: z.string().min(1).max(500),
	category: z.string().max(100).optional(),
	rvsValue: z.string().max(50).optional(),
	effectiveDate: z.string().optional(),
})

const CreateSnomedCtEntrySchema = z.object({
	catalogType: z.literal("snomed_ct"),
	conceptId: z.string().min(1).max(50),
	fsn: z.string().min(1).max(1000),
	preferredTerm: z.string().min(1).max(500),
	semanticTag: z.string().max(100).optional(),
})

export const CreateCatalogEntrySchema = z.discriminatedUnion("catalogType", [
	CreateIcd10EntrySchema,
	CreateLoincEntrySchema,
	CreateRxnormEntrySchema,
	CreateRvsEntrySchema,
	CreateSnomedCtEntrySchema,
])
export type CreateCatalogEntry = z.infer<typeof CreateCatalogEntrySchema>

export const UpdateCatalogEntrySchema = z.object({
	id: z.string().uuid(),
	catalogType: CatalogTypeSchema,
	// ICD-10 updatable fields
	description: z.string().min(1).max(1000).optional(),
	category: z.string().max(100).nullable().optional(),
	// LOINC updatable fields
	longCommonName: z.string().max(1000).nullable().optional(),
	component: z.string().max(500).nullable().optional(),
	property: z.string().max(100).nullable().optional(),
	timeAspect: z.string().max(100).nullable().optional(),
	system: z.string().max(500).nullable().optional(),
	scale: z.string().max(100).nullable().optional(),
	method: z.string().max(100).nullable().optional(),
	// RxNorm updatable fields
	name: z.string().min(1).max(500).optional(),
	tty: z.string().max(50).nullable().optional(),
	// RVS updatable fields
	procedureName: z.string().min(1).max(500).optional(),
	rvsValue: z.string().max(50).nullable().optional(),
	effectiveDate: z.string().nullable().optional(),
	// SNOMED CT updatable fields
	fsn: z.string().min(1).max(1000).optional(),
	preferredTerm: z.string().min(1).max(500).optional(),
	semanticTag: z.string().max(100).nullable().optional(),
	// Common
	isActive: z.boolean().optional(),
})
export type UpdateCatalogEntry = z.infer<typeof UpdateCatalogEntrySchema>

export const CatalogEntryIdSchema = z.object({
	id: z.string().uuid(),
	catalogType: CatalogTypeSchema,
})

// ============================================================================
// Catalog Versions — publish workflow (FORM-006)
// ============================================================================

export const CatalogVersionSchema = z.object({
	id: z.string().uuid(),
	catalogType: CatalogTypeSchema,
	versionTag: z.string(),
	publishedByUserId: z.string(),
	publishedAt: dateOrString,
	entryCount: z.number().int(),
	notes: z.string().nullable(),
	createdAt: dateOrString,
})
export type CatalogVersion = z.infer<typeof CatalogVersionSchema>

export const CatalogVersionListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(CatalogVersionSchema),
})

export const CatalogVersionFilterSchema = PaginationInputSchema.extend({
	catalogType: CatalogTypeSchema.optional(),
})

export const PublishCatalogVersionSchema = z.object({
	catalogType: CatalogTypeSchema,
	versionTag: z.string().min(1).max(100),
	notes: z.string().max(2000).optional(),
})
