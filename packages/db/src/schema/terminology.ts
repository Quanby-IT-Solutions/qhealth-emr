import { index, uniqueIndex } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"

export type CodeSystemName = "ICD-10" | "SNOMED-CT" | "LOINC" | "RxNorm" | "RVS"

export const codeSystems = createTable(
	"code_systems",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		name: t.text("name").notNull().unique().$type<CodeSystemName>(),
		oid: t.text("oid"),
		description: t.text("description"),
		currentVersionId: t.uuid("current_version_id"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	})
)

export type CodeSystemRow = typeof codeSystems.$inferSelect

export const codeSetVersions = createTable(
	"code_set_versions",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		codeSystemId: t
			.uuid("code_system_id")
			.notNull()
			.references(() => codeSystems.id, { onDelete: "cascade" }),
		version: t.text("version").notNull(),
		effectiveDate: t.date("effective_date"),
		isActive: t.boolean("is_active").notNull().default(false),
		totalCodes: t.integer("total_codes").notNull().default(0),
		deprecatedCodes: t.integer("deprecated_codes").notNull().default(0),
		importedBy: t.text("imported_by"),
		importedAt: t.timestamp("imported_at").notNull().defaultNow(),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("code_set_versions_code_system_id_idx").on(t.codeSystemId),
		uniqueIndex("code_set_versions_system_version_uniq").on(t.codeSystemId, t.version),
	]
)

export type CodeSetVersionRow = typeof codeSetVersions.$inferSelect

export const codes = createTable(
	"codes",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		codeSystemId: t
			.uuid("code_system_id")
			.notNull()
			.references(() => codeSystems.id, { onDelete: "cascade" }),
		versionId: t
			.uuid("version_id")
			.notNull()
			.references(() => codeSetVersions.id, { onDelete: "cascade" }),
		code: t.text("code").notNull(),
		displayName: t.text("display_name").notNull(),
		description: t.text("description"),
		isDeprecated: t.boolean("is_deprecated").notNull().default(false),
		replacedByCodeId: t
			.uuid("replaced_by_code_id"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("codes_code_system_id_idx").on(t.codeSystemId),
		index("codes_version_id_idx").on(t.versionId),
		uniqueIndex("codes_system_version_code_uniq").on(t.codeSystemId, t.versionId, t.code),
		index("codes_is_deprecated_idx").on(t.isDeprecated),
		index("codes_code_idx").on(t.code),
		index("codes_display_name_idx").on(t.displayName),
	]
)

export type CodeRow = typeof codes.$inferSelect

export const codeMappings = createTable(
	"code_mappings",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		sourceCodeId: t
			.uuid("source_code_id")
			.notNull()
			.references(() => codes.id, { onDelete: "cascade" }),
		targetCodeId: t
			.uuid("target_code_id")
			.notNull()
			.references(() => codes.id, { onDelete: "cascade" }),
		equivalence: t
			.text("equivalence")
			.notNull()
			.default("equivalent")
			.$type<"equivalent" | "wider" | "narrower" | "inexact" | "unmatched">(),
		comment: t.text("comment"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("code_mappings_source_code_id_idx").on(t.sourceCodeId),
		index("code_mappings_target_code_id_idx").on(t.targetCodeId),
	]
)

export type CodeMappingRow = typeof codeMappings.$inferSelect
