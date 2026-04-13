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
	isActive: z
		.union([z.boolean(), z.string().transform(v => v === "true")])
		.optional(),
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
	isActive: z
		.union([z.boolean(), z.string().transform(v => v === "true")])
		.optional(),
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
})

export type FormularyItem = z.infer<typeof FormularyItemSchema>

export const FormularyItemFilterSchema = PaginationInputSchema.extend({
	facilityId: z.string().uuid(),
	search: z.string().optional(),
	drugGenericId: z.string().uuid().optional(),
	isActive: z
		.union([z.boolean(), z.string().transform(v => v === "true")])
		.optional(),
	isHighAlert: z
		.union([z.boolean(), z.string().transform(v => v === "true")])
		.optional(),
	isRestricted: z
		.union([z.boolean(), z.string().transform(v => v === "true")])
		.optional(),
})

export const FormularyItemListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(FormularyItemSchema),
})

export const CreateFormularyItemSchema = z.object({
	facilityId: z.string().uuid(),
	drugGenericId: z.string().uuid(),
	drugBrandId: z.string().uuid().optional(),
	doseForm: z.string().min(1).max(255),
	strength: z.string().min(1).max(255),
	route: z.string().min(1).max(255),
	isHighAlert: z.boolean().optional(),
	highAlertNotes: z.string().max(1000).optional(),
	isRestricted: z.boolean().optional(),
	restrictionNotes: z.string().max(1000).optional(),
	formularyNotes: z.string().max(2000).optional(),
})

export const UpdateFormularyItemSchema = z.object({
	id: z.string().uuid(),
	drugBrandId: z.string().uuid().nullable().optional(),
	doseForm: z.string().min(1).max(255).optional(),
	strength: z.string().min(1).max(255).optional(),
	route: z.string().min(1).max(255).optional(),
	isActive: z.boolean().optional(),
	isHighAlert: z.boolean().optional(),
	highAlertNotes: z.string().max(1000).nullable().optional(),
	isRestricted: z.boolean().optional(),
	restrictionNotes: z.string().max(1000).nullable().optional(),
	formularyNotes: z.string().max(2000).nullable().optional(),
})

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
