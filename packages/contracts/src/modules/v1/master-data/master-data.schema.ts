import { z } from "zod"

const dateOrString = z
	.union([z.date(), z.string()])
	.transform(v => (typeof v === "string" ? new Date(v) : v))

export const MasterDataCatalogSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	catalogType: z.enum(["drug_formulary", "lab_catalog", "rvs_catalog", "icd10_sets"]),
	name: z.string(),
	description: z.string().nullable(),
	isActive: z.boolean(),
	itemCount: z.number().int(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type MasterDataCatalog = z.infer<typeof MasterDataCatalogSchema>

export const MasterDataItemSchema = z.object({
	id: z.string().uuid(),
	catalogId: z.string().uuid(),
	code: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	attributes: z.record(z.string(), z.unknown()).nullable(),
	isDeprecated: z.boolean(),
	replacedByItemId: z.string().uuid().nullable(),
	isActive: z.boolean(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type MasterDataItem = z.infer<typeof MasterDataItemSchema>

export const ListCatalogsSchema = z.object({ facilityId: z.string().uuid() })

export const ListItemsSchema = z.object({
	catalogId: z.string().uuid(),
	search: z.string().optional(),
	includeDeprecated: z.boolean().default(false),
	page: z.number().int().positive().default(1),
	limit: z.number().int().min(1).max(200).default(50),
})

export type ListItemsInput = z.infer<typeof ListItemsSchema>

export const ItemsResponseSchema = z.object({
	data: z.array(MasterDataItemSchema),
	total: z.number(),
	page: z.number(),
	limit: z.number(),
})

export type ItemsResponse = z.infer<typeof ItemsResponseSchema>

export const UpsertItemSchema = z.object({
	id: z.string().uuid().optional(),
	catalogId: z.string().uuid(),
	code: z.string().min(1),
	name: z.string().min(1),
	description: z.string().nullable().optional(),
	attributes: z.record(z.string(), z.unknown()).nullable().optional(),
	isActive: z.boolean().optional(),
})

export type UpsertItemInput = z.infer<typeof UpsertItemSchema>

export const DeprecateItemSchema = z.object({
	id: z.string().uuid(),
	replacedByItemId: z.string().uuid(),
})

export type DeprecateItemInput = z.infer<typeof DeprecateItemSchema>

export const ImportItemsSchema = z.object({
	catalogId: z.string().uuid(),
	csv: z.string().min(1),
})

export type ImportItemsInput = z.infer<typeof ImportItemsSchema>

export const ImportResultSchema = z.object({
	imported: z.number(),
	errors: z.array(
		z.object({
			row: z.number(),
			message: z.string(),
		})
	),
})

export type ImportResult = z.infer<typeof ImportResultSchema>

export const ItemIdSchema = z.object({ id: z.string().uuid() })
