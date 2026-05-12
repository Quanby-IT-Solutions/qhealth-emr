import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	DeprecateItemSchema,
	ImportItemsSchema,
	ImportResultSchema,
	ItemIdSchema,
	ItemsResponseSchema,
	ListCatalogsSchema,
	ListItemsSchema,
	MasterDataCatalogSchema,
	MasterDataItemSchema,
	UpsertItemSchema,
} from "./master-data.schema.js"

export const masterDataContract = {
	listCatalogs: oc
		.route({
			method: "GET",
			path: "/catalogs",
			summary: "List master data catalogs for a facility",
			tags: ["Master Data"],
		})
		.input(ListCatalogsSchema)
		.output(z.array(MasterDataCatalogSchema)),

	listItems: oc
		.route({
			method: "GET",
			path: "/catalogs/{catalogId}/items",
			summary: "List items in a master data catalog",
			tags: ["Master Data"],
		})
		.input(ListItemsSchema)
		.output(ItemsResponseSchema),

	getItem: oc
		.route({
			method: "GET",
			path: "/items/{id}",
			summary: "Get a master data item by ID",
			tags: ["Master Data"],
		})
		.input(ItemIdSchema)
		.output(MasterDataItemSchema),

	upsertItem: oc
		.route({
			method: "PUT",
			path: "/items",
			summary: "Create or update a master data item",
			tags: ["Master Data"],
		})
		.input(UpsertItemSchema)
		.output(MasterDataItemSchema),

	deprecateItem: oc
		.route({
			method: "PATCH",
			path: "/items/{id}/deprecate",
			summary: "Deprecate a master data item with a replacement",
			tags: ["Master Data"],
		})
		.input(DeprecateItemSchema)
		.output(MasterDataItemSchema),

	importItems: oc
		.route({
			method: "POST",
			path: "/catalogs/{catalogId}/import",
			summary: "Import master data items from CSV",
			tags: ["Master Data"],
		})
		.input(ImportItemsSchema)
		.output(ImportResultSchema),
}
