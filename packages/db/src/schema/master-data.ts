import { index, uniqueIndex } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { facilities } from "./rbac.js"

export type MasterDataCatalogType = "drug_formulary" | "lab_catalog" | "rvs_catalog" | "icd10_sets"

export const masterDataCatalogs = createTable(
	"master_data_catalogs",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "cascade" }),
		catalogType: t.text("catalog_type").notNull().$type<MasterDataCatalogType>(),
		name: t.text("name").notNull(),
		description: t.text("description"),
		isActive: t.boolean("is_active").notNull().default(true),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("master_data_catalogs_facility_id_idx").on(t.facilityId),
		uniqueIndex("master_data_catalogs_facility_type_uniq").on(t.facilityId, t.catalogType),
	]
)

export type MasterDataCatalogRow = typeof masterDataCatalogs.$inferSelect

export const masterDataItems = createTable(
	"master_data_items",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		catalogId: t
			.uuid("catalog_id")
			.notNull()
			.references(() => masterDataCatalogs.id, { onDelete: "cascade" }),
		code: t.text("code").notNull(),
		name: t.text("name").notNull(),
		description: t.text("description"),
		// Flexible metadata storage for catalog-specific fields
		attributes: t.jsonb("attributes").default({}),
		isDeprecated: t.boolean("is_deprecated").notNull().default(false),
		// For deprecation replacement enforcement
		replacedByItemId: t.uuid("replaced_by_item_id"),
		isActive: t.boolean("is_active").notNull().default(true),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("master_data_items_catalog_id_idx").on(t.catalogId),
		uniqueIndex("master_data_items_catalog_code_uniq").on(t.catalogId, t.code),
		index("master_data_items_is_deprecated_idx").on(t.isDeprecated),
	]
)

export type MasterDataItemRow = typeof masterDataItems.$inferSelect
