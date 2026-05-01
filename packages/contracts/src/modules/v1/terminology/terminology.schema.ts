import { z } from "zod"

const dateOrString = z
	.union([z.date(), z.string()])
	.transform(v => (typeof v === "string" ? new Date(v) : v))

export const CodeSystemSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	oid: z.string().nullable(),
	description: z.string().nullable(),
	currentVersionId: z.string().uuid().nullable(),
	// derived from codeSetVersions totals
	totalCodes: z.number().int(),
	deprecatedCount: z.number().int(),
	activeVersionId: z.string().uuid().nullable(),
	activeVersion: z.string().nullable(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type CodeSystem = z.infer<typeof CodeSystemSchema>

export const CodeSchema = z.object({
	id: z.string().uuid(),
	codeSystemId: z.string().uuid(),
	versionId: z.string().uuid(),
	code: z.string(),
	displayName: z.string(),
	description: z.string().nullable(),
	isDeprecated: z.boolean(),
	replacedByCodeId: z.string().uuid().nullable(),
	createdAt: dateOrString,
})

export type Code = z.infer<typeof CodeSchema>

export const SearchCodesSchema = z.object({
	codeSystemId: z.string().uuid(),
	query: z.string().min(1),
	includeDeprecated: z.boolean().default(false),
	page: z.number().int().positive().default(1),
	limit: z.number().int().min(1).max(200).default(50),
})

export type SearchCodesInput = z.infer<typeof SearchCodesSchema>

export const SearchCodesResponseSchema = z.object({
	data: z.array(CodeSchema),
	total: z.number(),
	page: z.number(),
	limit: z.number(),
})

export type SearchCodesResponse = z.infer<typeof SearchCodesResponseSchema>

export const CodeIdSchema = z.object({ id: z.string().uuid() })

export const DeprecateCodeSchema = z.object({
	id: z.string().uuid(),
	replacedByCodeId: z.string().uuid(),
})

export type DeprecateCodeInput = z.infer<typeof DeprecateCodeSchema>

export const ImportCodesSchema = z.object({
	codeSystemId: z.string().uuid(),
	versionId: z.string().uuid(),
	csv: z.string().min(1),
})

export type ImportCodesInput = z.infer<typeof ImportCodesSchema>

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

export const DiffVersionsSchema = z.object({
	codeSystemId: z.string().uuid(),
	fromVersionId: z.string().uuid(),
	toVersionId: z.string().uuid(),
})

export type DiffVersionsInput = z.infer<typeof DiffVersionsSchema>

export const DiffVersionsResponseSchema = z.object({
	added: z.number().int().nonnegative(),
	removed: z.number().int().nonnegative(),
	displayChanged: z.number().int().nonnegative(),
	deprecationAdded: z.number().int().nonnegative(),
})
