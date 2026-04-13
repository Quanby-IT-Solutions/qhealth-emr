import { index, uniqueIndex } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { users } from "./auth.js"

// ============================================================================
// RBAC — Facilities, Staff Profiles, Roles, Permissions
// ============================================================================

export const facilities = createTable("facilities", t => ({
	id: t.uuid("id").primaryKey().defaultRandom(),
	name: t.text("name").notNull(),
	facilityType: t
		.text("facility_type")
		.notNull()
		.$type<"community" | "district" | "tertiary">(),
	address: t.text("address"),
	dohLicenseNumber: t.text("doh_license_number"),
	philhealthAccreditationId: t.text("philhealth_accreditation_id"),
	createdAt: t.timestamp("created_at").notNull().defaultNow(),
	updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
}))

export const staffProfiles = createTable(
	"staff_profiles",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		userId: t
			.text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "cascade" }),
		employeeNumber: t.text("employee_number"),
		department: t.text("department"),
		prcLicenseNumber: t.text("prc_license_number"),
		prcExpiry: t.date("prc_expiry"),
		ptrNumber: t.text("ptr_number"),
		ptrExpiry: t.date("ptr_expiry"),
		pdeaS2License: t.text("pdea_s2_license"),
		pdeaS2Expiry: t.date("pdea_s2_expiry"),
		isActive: t.boolean("is_active").notNull().default(true),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("staff_profiles_user_id_idx").on(t.userId),
		index("staff_profiles_facility_id_idx").on(t.facilityId),
	]
)

export const roles = createTable(
	"roles",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "cascade" }),
		name: t.text("name").notNull(),
		description: t.text("description"),
		isSystemDefault: t.boolean("is_system_default").notNull().default(false),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [index("roles_facility_id_idx").on(t.facilityId)]
)

export const rolePermissions = createTable(
	"role_permissions",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		roleId: t
			.uuid("role_id")
			.notNull()
			.references(() => roles.id, { onDelete: "cascade" }),
		module: t
			.text("module")
			.notNull()
			.$type<
				| "adt"
				| "clinical_docs"
				| "orders"
				| "nursing"
				| "billing"
				| "formulary"
				| "reporting"
				| "audit"
				| "admin"
			>(),
		action: t
			.text("action")
			.notNull()
			.$type<"view" | "create" | "edit" | "sign" | "delete" | "verify" | "export">(),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [index("role_permissions_role_id_idx").on(t.roleId), uniqueIndex("role_permissions_role_module_action_unique").on(t.roleId, t.module, t.action)]
)

export const userRoles = createTable(
	"user_roles",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		staffProfileId: t
			.uuid("staff_profile_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "cascade" }),
		roleId: t
			.uuid("role_id")
			.notNull()
			.references(() => roles.id, { onDelete: "cascade" }),
		isPrimary: t.boolean("is_primary").notNull().default(false),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("user_roles_staff_profile_id_idx").on(t.staffProfileId),
		index("user_roles_role_id_idx").on(t.roleId),
		uniqueIndex("user_roles_staff_role_unique").on(t.staffProfileId, t.roleId),
	]
)
