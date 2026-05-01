import { index } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { facilities } from "./rbac.js"

export type FhirAuthMethod = "none" | "basic" | "bearer" | "oauth2_client_credentials"
export type FhirExchangeStatus = "success" | "partial" | "failed"
export type FhirExchangeDirection = "push" | "pull"

// FHIR endpoint configuration — distinct from fhir_exports (which tracks export jobs to NHDR)
export const fhirEndpoints = createTable(
	"fhir_endpoints",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "cascade" }),
		name: t.text("name").notNull(),
		endpointUrl: t.text("endpoint_url").notNull(),
		fhirVersion: t
			.text("fhir_version")
			.notNull()
			.default("R4")
			.$type<"DSTU2" | "STU3" | "R4" | "R5">(),
		authMethod: t
			.text("auth_method")
			.notNull()
			.default("none")
			.$type<FhirAuthMethod>(),
		// Stored as encrypted env-var reference or JSON blob (never plaintext secrets)
		authCredentialsRef: t.text("auth_credentials_ref"),
		// FHIR resource types included in sync (jsonb array of strings)
		resourceTypes: t.jsonb("resource_types").notNull().default([]),
		cronSchedule: t.text("cron_schedule"),
		enabled: t.boolean("enabled").notNull().default(false),
		lastTestedAt: t.timestamp("last_tested_at"),
		lastTestStatus: t.text("last_test_status").$type<"ok" | "error">(),
		lastTestLatencyMs: t.integer("last_test_latency_ms"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("fhir_endpoints_facility_id_idx").on(t.facilityId),
	]
)

export type FhirEndpointRow = typeof fhirEndpoints.$inferSelect

export const fhirExchangeLog = createTable(
	"fhir_exchange_log",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		endpointId: t
			.uuid("endpoint_id")
			.notNull()
			.references(() => fhirEndpoints.id, { onDelete: "cascade" }),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "cascade" }),
		direction: t.text("direction").notNull().$type<FhirExchangeDirection>(),
		resourceType: t.text("resource_type").notNull(),
		resourceId: t.text("resource_id"),
		status: t.text("status").notNull().$type<FhirExchangeStatus>(),
		httpStatus: t.integer("http_status"),
		errorMessage: t.text("error_message"),
		durationMs: t.integer("duration_ms"),
		// versionId for idempotency checks
		fhirVersionId: t.text("fhir_version_id"),
		occurredAt: t.timestamp("occurred_at").notNull().defaultNow(),
	}),
	t => [
		index("fhir_exchange_log_endpoint_id_idx").on(t.endpointId),
		index("fhir_exchange_log_facility_id_idx").on(t.facilityId),
		index("fhir_exchange_log_status_idx").on(t.status),
		index("fhir_exchange_log_occurred_at_idx").on(t.occurredAt),
	]
)

export type FhirExchangeLogRow = typeof fhirExchangeLog.$inferSelect
