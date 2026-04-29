import { index } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { facilities } from "./rbac.js"

// ============================================================================
// FORMULARY — Drugs, Code Sets
// ============================================================================

export const drugGenerics = createTable(
	"drug_generics",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		genericName: t.text("generic_name").notNull(),
		rxnormCode: t.text("rxnorm_code"),
		atcCode: t.text("atc_code"),
		isActive: t.boolean("is_active").notNull().default(true),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("drug_generics_generic_name_idx").on(t.genericName),
		index("drug_generics_rxnorm_code_idx").on(t.rxnormCode),
	]
)

export const drugBrands = createTable(
	"drug_brands",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		drugGenericId: t
			.uuid("drug_generic_id")
			.notNull()
			.references(() => drugGenerics.id, { onDelete: "cascade" }),
		brandName: t.text("brand_name").notNull(),
		manufacturer: t.text("manufacturer"),
		isActive: t.boolean("is_active").notNull().default(true),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("drug_brands_drug_generic_id_idx").on(t.drugGenericId),
		index("drug_brands_brand_name_idx").on(t.brandName),
	]
)

export const formularyItems = createTable(
	"formulary_items",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "cascade" }),
		drugGenericId: t
			.uuid("drug_generic_id")
			.notNull()
			.references(() => drugGenerics.id, { onDelete: "restrict" }),
		drugBrandId: t
			.uuid("drug_brand_id")
			.references(() => drugBrands.id, { onDelete: "set null" }),
		doseForm: t.text("dose_form").notNull(),
		strength: t.text("strength").notNull(),
		route: t.text("route").notNull(),
		isActive: t.boolean("is_active").notNull().default(true),
		isHighAlert: t.boolean("is_high_alert").notNull().default(false),
		highAlertNotes: t.text("high_alert_notes"),
		isRestricted: t.boolean("is_restricted").notNull().default(false),
		restrictionNotes: t.text("restriction_notes"),
		formularyNotes: t.text("formulary_notes"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("formulary_items_facility_id_idx").on(t.facilityId),
		index("formulary_items_drug_generic_id_idx").on(t.drugGenericId),
	]
)

export const icd10Codes = createTable(
	"icd10_codes",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		code: t.text("code").notNull().unique(),
		description: t.text("description").notNull(),
		category: t.text("category"),
		isActive: t.boolean("is_active").notNull().default(true),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("icd10_codes_code_idx").on(t.code),
		index("icd10_codes_description_idx").on(t.description),
	]
)

export const loincCodes = createTable(
	"loinc_codes",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		loincNum: t.text("loinc_num").notNull().unique(),
		component: t.text("component"),
		property: t.text("property"),
		timeAspect: t.text("time_aspect"),
		system: t.text("system"),
		scale: t.text("scale"),
		method: t.text("method"),
		longCommonName: t.text("long_common_name"),
		isActive: t.boolean("is_active").notNull().default(true),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("loinc_codes_loinc_num_idx").on(t.loincNum),
		index("loinc_codes_long_common_name_idx").on(t.longCommonName),
	]
)

export const rxnormCodes = createTable(
	"rxnorm_codes",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		rxcui: t.text("rxcui").notNull().unique(),
		name: t.text("name").notNull(),
		tty: t.text("tty"),
		isActive: t.boolean("is_active").notNull().default(true),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("rxnorm_codes_rxcui_idx").on(t.rxcui),
		index("rxnorm_codes_name_idx").on(t.name),
	]
)

export const rvsCodes = createTable(
	"rvs_codes",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		rvsCode: t.text("rvs_code").notNull().unique(),
		procedureName: t.text("procedure_name").notNull(),
		category: t.text("category"),
		rvsValue: t.numeric("rvs_value", { precision: 10, scale: 2 }),
		effectiveDate: t.date("effective_date"),
		isActive: t.boolean("is_active").notNull().default(true),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("rvs_codes_rvs_code_idx").on(t.rvsCode),
		index("rvs_codes_procedure_name_idx").on(t.procedureName),
	]
)

export const snomedCtCodes = createTable(
	"snomed_ct_codes",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		conceptId: t.text("concept_id").notNull().unique(),   // SNOMED concept identifier (e.g. "73211009")
		fsn: t.text("fsn").notNull(),                         // Fully Specified Name
		preferredTerm: t.text("preferred_term").notNull(),    // Preferred display term
		semanticTag: t.text("semantic_tag"),                  // Semantic type extracted from FSN brackets (e.g. "disorder", "finding")
		isActive: t.boolean("is_active").notNull().default(true),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("snomed_ct_codes_concept_id_idx").on(t.conceptId),
		index("snomed_ct_codes_preferred_term_idx").on(t.preferredTerm),
		index("snomed_ct_codes_semantic_tag_idx").on(t.semanticTag),
	]
)

// ============================================================================
// TERMINOLOGY GOVERNANCE — Catalog uploads & deprecated code mappings
// ============================================================================

/**
 * Tracks admin-initiated catalog refresh events. Each row records when an
 * admin registered a terminology catalog refresh, which catalog type was
 * updated, and how many entries were affected.
 */
export const codeSetCatalogUploads = createTable(
	"code_set_catalog_uploads",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		/** One of: icd10 | loinc | rxnorm | rvs | snomed_ct */
		catalogType: t.text("catalog_type").notNull(),
		version: t.text("version"),
		notes: t.text("notes"),
		entryCount: t.integer("entry_count").notNull().default(0),
		uploadedByUserId: t.text("uploaded_by_user_id").notNull(),
		/** completed | failed */
		status: t.text("status").notNull().default("completed"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("code_set_catalog_uploads_catalog_type_idx").on(t.catalogType),
		index("code_set_catalog_uploads_created_at_idx").on(t.createdAt),
	]
)

/**
 * Deprecated-code mapping table. When a code is retired or replaced, the
 * admin registers a mapping from the old code to its replacement (or null if
 * retired with no replacement). CDS / order-entry surfaces query this table
 * to surface migration warnings.
 */
export const deprecatedCodeMappings = createTable(
	"deprecated_code_mappings",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		/** One of: icd10 | loinc | rxnorm | rvs | snomed_ct */
		catalogType: t.text("catalog_type").notNull(),
		fromCode: t.text("from_code").notNull(),
		/** null = retired with no replacement */
		toCode: t.text("to_code"),
		notes: t.text("notes"),
		isActive: t.boolean("is_active").notNull().default(true),
		createdByUserId: t.text("created_by_user_id").notNull(),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("deprecated_code_mappings_catalog_type_idx").on(t.catalogType),
		index("deprecated_code_mappings_from_code_idx").on(t.fromCode),
	]
)

/**
 * Catalog version records — each row represents an authoritative publish event
 * for a terminology catalog. Administrators tag and publish versioned snapshots
 * so downstream modules can reference a known-good baseline.
 */
export const catalogVersions = createTable(
	"catalog_versions",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		/** One of: icd10 | loinc | rxnorm | rvs | snomed_ct */
		catalogType: t.text("catalog_type").notNull(),
		versionTag: t.text("version_tag").notNull(),
		publishedByUserId: t.text("published_by_user_id").notNull(),
		publishedAt: t.timestamp("published_at").notNull().defaultNow(),
		entryCount: t.integer("entry_count").notNull().default(0),
		notes: t.text("notes"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("catalog_versions_catalog_type_idx").on(t.catalogType),
		index("catalog_versions_published_at_idx").on(t.publishedAt),
	]
)
