import { index } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { users } from "./auth.js"
import { patients } from "./core.js"
import { facilities, staffProfiles } from "./rbac.js"

// ============================================================================
// AUDIT — Audit Logs, Break Glass Events, Notifications
// ============================================================================

export const auditLogs = createTable(
	"audit_logs",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		userId: t
			.text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "restrict" }),
		staffProfileId: t
			.uuid("staff_profile_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		action: t
			.text("action")
			.notNull()
			.$type<"create" | "update" | "delete" | "sign" | "verify" | "override">(),
		entityType: t.text("entity_type").notNull(),
		entityId: t.uuid("entity_id").notNull(),
		beforeState: t.jsonb("before_state"),
		afterState: t.jsonb("after_state"),
		ipAddress: t.text("ip_address"),
		userAgent: t.text("user_agent"),
		metadata: t.jsonb("metadata"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("audit_logs_facility_id_idx").on(t.facilityId),
		index("audit_logs_user_id_idx").on(t.userId),
		index("audit_logs_entity_type_id_idx").on(t.entityType, t.entityId),
		index("audit_logs_created_at_idx").on(t.createdAt),
	]
)

export const breakGlassEvents = createTable(
	"break_glass_events",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		clinicianStaffId: t
			.uuid("clinician_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		patientId: t
			.uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "restrict" }),
		reasonCategory: t.text("reason_category").notNull(),
		justification: t.text("justification").notNull(),
		accessGrantedAt: t.timestamp("access_granted_at").notNull().defaultNow(),
		accessExpiresAt: t.timestamp("access_expires_at").notNull(),
		recordsAccessed: t.jsonb("records_accessed"),
		reviewStatus: t
			.text("review_status")
			.notNull()
			.default("pending")
			.$type<"pending" | "appropriate" | "flagged">(),
		reviewedByStaffId: t
			.uuid("reviewed_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		reviewNotes: t.text("review_notes"),
		reviewedAt: t.timestamp("reviewed_at"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("break_glass_events_facility_id_idx").on(t.facilityId),
		index("break_glass_events_clinician_staff_id_idx").on(t.clinicianStaffId),
		index("break_glass_events_patient_id_idx").on(t.patientId),
		index("break_glass_events_review_status_idx").on(t.reviewStatus),
	]
)

export const notifications = createTable(
	"notifications",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "cascade" }),
		recipientStaffId: t
			.uuid("recipient_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "cascade" }),
		topic: t
			.text("topic")
			.notNull()
			.$type<"pidsr" | "news" | "pharmacy" | "break_glass" | "system" | "ed_queue">(),
		title: t.text("title").notNull(),
		body: t.text("body").notNull(),
		data: t.jsonb("data"),
		isRead: t.boolean("is_read").notNull().default(false),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("notifications_facility_id_idx").on(t.facilityId),
		index("notifications_recipient_staff_id_idx").on(t.recipientStaffId),
		index("notifications_is_read_idx").on(t.isRead),
		index("notifications_created_at_idx").on(t.createdAt),
	]
)
