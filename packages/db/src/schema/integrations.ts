import { index, uniqueIndex } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { facilities } from "./rbac.js"

export type IntegrationKind = "fhir" | "civil_registry" | "hai" | "philhealth" | "erp" | "lis" | "pacs" | "telemedicine" | "nhdr" | "pidsr" | "custom"
export type SyncStatus = "ok" | "error"
export type TestReadinessLevel = "activation" | "transport" | "none"

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

		// Webhook URL for push-based integrations (optional)
		webhookUrl: t.text("webhook_url"),

		enabled: t.boolean("enabled").notNull().default(false),
		notes: t.text("notes"),

		// Written by integration consumers (sync jobs), not this Epic
		lastSyncAt: t.timestamp("last_sync_at"),
		lastSyncStatus: t.text("last_sync_status").$type<SyncStatus>(),

		// Written by testConnectivity — used to gate activation
		lastTestedAt: t.timestamp("last_tested_at"),
		lastTestStatus: t.text("last_test_status").$type<"ok" | "error">(),
		lastTestReadinessLevel: t.text("last_test_readiness_level").$type<TestReadinessLevel>(),

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

// ---------------------------------------------------------------------------
// integration_api_keys — managed API keys for integrations
// The full key value is shown once at generation and never stored.
// Only the first 8 characters (prefix) and SHA-256 hash are persisted.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// webhook_endpoints — outbound webhook delivery targets for integrations
// ---------------------------------------------------------------------------

export type WebhookEventType =
	| "patient.created"
	| "patient.updated"
	| "encounter.admitted"
	| "encounter.discharged"
	| "lab.result_ready"
	| "medication.dispensed"
	| "billing.invoice_created"

export const webhookEndpoints = createTable(
	"webhook_endpoints",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		integrationId: t
			.uuid("integration_id")
			.notNull()
			.references(() => integrations.id, { onDelete: "cascade" }),
		targetUrl: t.text("target_url").notNull(),
		// Stored as SHA-256 hash reference — plaintext secret never persisted
		signingSecretHash: t.text("signing_secret_hash").notNull(),
		// JSONB array of WebhookEventType strings
		subscribedEvents: t.jsonb("subscribed_events").notNull().default([]),
		isActive: t.boolean("is_active").notNull().default(true),
		// Retry state
		consecutiveFailures: t.integer("consecutive_failures").notNull().default(0),
		lastDeliveryAt: t.timestamp("last_delivery_at"),
		lastDeliveryStatus: t.text("last_delivery_status").$type<"success" | "failed">(),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("webhook_endpoints_integration_id_idx").on(t.integrationId),
	]
)

export type WebhookEndpointRow = typeof webhookEndpoints.$inferSelect

export const integrationApiKeys = createTable(
	"integration_api_keys",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		integrationId: t
			.uuid("integration_id")
			.notNull()
			.references(() => integrations.id, { onDelete: "cascade" }),
		label: t.text("label").notNull(),
		keyPrefix: t.text("key_prefix").notNull(),
		keyHash: t.text("key_hash").notNull(),
		createdBy: t.text("created_by").notNull(),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		revokedAt: t.timestamp("revoked_at"),
	}),
	t => [
		index("integration_api_keys_integration_id_idx").on(t.integrationId),
	]
)
