import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	CodeIdSchema,
	CodeSchema,
	CodeSystemSchema,
	DeprecateCodeSchema,
	DiffVersionsResponseSchema,
	DiffVersionsSchema,
	ImportCodesSchema,
	ImportResultSchema,
	SearchCodesResponseSchema,
	SearchCodesSchema,
} from "./terminology.schema.js"

export const terminologyContract = {
	listSystems: oc
		.route({
			method: "GET",
			path: "/systems",
			summary: "List code systems",
			tags: ["Terminology"],
		})
		.output(z.array(CodeSystemSchema)),

	searchCodes: oc
		.route({
			method: "GET",
			path: "/codes",
			summary: "Search codes within a code system",
			tags: ["Terminology"],
		})
		.input(SearchCodesSchema)
		.output(SearchCodesResponseSchema),

	getCode: oc
		.route({
			method: "GET",
			path: "/codes/{id}",
			summary: "Get a code by ID",
			tags: ["Terminology"],
		})
		.input(CodeIdSchema)
		.output(CodeSchema),

	deprecate: oc
		.route({
			method: "PATCH",
			path: "/codes/{id}/deprecate",
			summary: "Deprecate a code with a replacement",
			tags: ["Terminology"],
		})
		.input(DeprecateCodeSchema)
		.output(CodeSchema),

	import: oc
		.route({
			method: "POST",
			path: "/systems/{codeSystemId}/import",
			summary: "Import codes from CSV into a code system version",
			tags: ["Terminology"],
		})
		.input(ImportCodesSchema)
		.output(ImportResultSchema),

	diffVersions: oc
		.route({
			method: "GET",
			path: "/versions/diff",
			summary: "Compute diff between two code system versions",
			tags: ["Terminology"],
		})
		.input(DiffVersionsSchema)
		.output(DiffVersionsResponseSchema),
}
