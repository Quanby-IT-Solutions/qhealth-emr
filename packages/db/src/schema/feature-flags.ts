import { index, uniqueIndex } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { facilities, roles } from "./rbac.js"

// ============================================================================
// Feature Flags — definitions and per-dimension targeting overrides
// ============================================================================

export const featureFlags = createTable(
	"feature_flags",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		key: t.text("key").notNull().unique(),
		name: t.text("name").notNull(),
		description: t.text("description"),
		group: t
			.text("group")
			.notNull()
			.$type<"platform-control" | "compliance" | "integration">(),
		riskLevel: t
			.text("risk_level")
			.notNull()
			.$type<"low" | "moderate" | "high">(),
		ownerTeam: t.text("owner_team"),
		defaultEnabled: t.boolean("default_enabled").notNull().default(false),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [index("feature_flags_key_idx").on(t.key)]
)

export const featureFlagTargets = createTable(
	"feature_flag_targets",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		flagId: t
			.uuid("flag_id")
			.notNull()
			.references(() => featureFlags.id, { onDelete: "cascade" }),
		// NULL = wildcard (applies to all values of this dimension)
		environment: t
			.text("environment")
			.$type<"dev" | "staging" | "prod">(),
		facilityId: t
			.uuid("facility_id")
			.references(() => facilities.id, { onDelete: "cascade" }),
		roleId: t
			.uuid("role_id")
			.references(() => roles.id, { onDelete: "cascade" }),
		enabled: t.boolean("enabled").notNull(),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("fft_flag_id_idx").on(t.flagId),
		index("fft_environment_idx").on(t.environment),
		index("fft_facility_id_idx").on(t.facilityId),
		index("fft_role_id_idx").on(t.roleId),
		// Prevent duplicate scope combinations
		uniqueIndex("fft_flag_env_facility_role_unique").on(
			t.flagId,
			t.environment,
			t.facilityId,
			t.roleId
		),
	]
)
