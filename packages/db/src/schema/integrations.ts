import { index, uniqueIndex } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { facilities } from "./rbac.js"

export type IntegrationKind = "fhir" | "civil_registry" | "hai" | "philhealth" | "custom"
export type SyncStatus = "ok" | "error"

export const integrations = createTable(
	"integrations",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "cascade" }),

		// Fixed set of integration kinds
		kind: t
			.text("kind")
			.notNull()
			.$type<IntegrationKind>(),

		name: t.text("name").notNull(),
		endpointUrl: t.text("endpoint_url").notNull(),

		// Env-var reference (stores name only — value is looked up at runtime)
		credentialsRef: t.text("credentials_ref"),

		enabled: t.boolean("enabled").notNull().default(false),
		notes: t.text("notes"),

		// Written by integration consumers (sync jobs), not this Epic
		lastSyncAt: t.timestamp("last_sync_at"),
		lastSyncStatus: t.text("last_sync_status").$type<SyncStatus>(),

		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("integrations_facility_id_idx").on(t.facilityId),
		index("integrations_kind_idx").on(t.kind),
		uniqueIndex("integrations_facility_kind_name_unique").on(t.facilityId, t.kind, t.name),
	]
)

export type IntegrationRow = typeof integrations.$inferSelect
