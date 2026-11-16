import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

import { booleanFromEnv, exactlyTrueFromEnv } from "@/config/api-docs.config"

const emptyStringToUndefined = (value: unknown) => (value === "" ? undefined : value)

const optionalString = z.preprocess(emptyStringToUndefined, z.string().optional())
const optionalUrl = z.preprocess(emptyStringToUndefined, z.string().url().optional())

/**
 * Type-safe environment variable validation for Backend API
 *
 * Validates at module load time (fail-fast). Access all env vars through this object.
 */
export const env = createEnv({
	server: {
		// Server
		NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
		PORT: z.coerce.number().int().positive().default(3000),
		CORS_ORIGINS: z.string(),
		LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

		// Error monitoring (Sentry).
		//
		// Declared here so the rest of the app sees the same typed, defaulted,
		// validated values as every other setting. `src/instrument.ts` deliberately
		// does NOT import this module — it runs before AppModule to install the SDK
		// ahead of the libraries it instruments, and pulling fail-fast validation
		// onto that path would let one unrelated bad variable kill the crash
		// reporter right when it is most needed. It reads these same keys off
		// `process.env` instead.
		//
		// Reporting stays OFF unless BOTH the flag and a DSN are supplied: a flag
		// with no DSN is an unfinished deployment, a DSN with no flag is a value
		// parked for later, and neither is consent to start shipping events.
		SENTRY_ENABLED: exactlyTrueFromEnv,
		SENTRY_DSN: z.string().optional(),
		/** Falls back to NODE_ENV when unset, so environments are never merged by accident. */
		SENTRY_ENVIRONMENT: z.string().optional(),
		/** 0 = errors only. Tracing costs quota, so it is opt-in per environment. */
		SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).optional().default(0),

		// PostHog: feature flags (and any server-side events). Same two-part gate
		// as Sentry: nothing is constructed unless BOTH the flag and a token are
		// set. See docs/posthog.md.
		POSTHOG_ENABLED: booleanFromEnv.optional().default(false),
		POSTHOG_TOKEN: z.string().optional(),
		POSTHOG_HOST: z.string().default("https://us.i.posthog.com"),
		/** Project secret key (phs_...). Turns on local flag evaluation; remote evaluation without it. */
		POSTHOG_FEATURE_FLAGS_SECRET_KEY: z.string().optional(),

		// OpenTelemetry: OTLP export of traces and HTTP metrics (docs/opentelemetry.md).
		// Read raw by `src/telemetry.ts` before this module runs (same exemption as
		// Sentry); declared here so the rest of the app sees typed values. Export
		// starts only when BOTH the flag and an endpoint are set.
		OTEL_ENABLED: exactlyTrueFromEnv,
		OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
		OTEL_SERVICE_NAME: z.string().default("qhealth-emr-api"),
		/** Deploy image tag, injected by the deploy compose file / env; reported as the Sentry release. */
		IMAGE_TAG: z.string().optional(),

		// Database
		DATABASE_URL: z.string(),

		// Supabase (used by modules migrated off Drizzle to the Supabase JS client).
		// Optional at validation time so non-migrated contexts (tests, lint) don't
		// fail; the Supabase client factory throws a clear error if they're missing
		// when actually needed.
		SUPABASE_URL: optionalUrl,
		SUPABASE_SERVICE_ROLE_KEY: optionalString,

		// Authentication
		BETTER_AUTH_SECRET: z.string(),
		BETTER_AUTH_TRUSTED_ORIGINS: z.string(),

		// OAuth (optional)
		GOOGLE_CLIENT_ID: z.string().optional(),
		GOOGLE_CLIENT_SECRET: z.string().optional(),

		// PhilHealth integration
		PHILHEALTH_MODE: z.enum(["mock", "real"]).default("mock"),
		PHILHEALTH_CEWS_BASE_URL: z.string().url().optional(),
		PHILHEALTH_CEWS_API_KEY: z.string().optional(),
		PHILHEALTH_MOCK_ELIGIBILITY_STATUS: z
			.enum(["eligible", "ineligible", "pending", "error"])
			.default("eligible"),
		PHILHEALTH_MOCK_ELIGIBLE: z.coerce.boolean().default(true),
		PHILHEALTH_MOCK_MEMBER_NAME: z.string().default("Mock PhilHealth Member"),
		PHILHEALTH_MOCK_MEMBER_TYPE: z
			.enum([
				"employed",
				"self_employed",
				"voluntary",
				"indigent",
				"sponsored",
				"senior_citizen",
				"pwd",
				"ofw",
				"kasambahay",
			])
			.default("sponsored"),
		PHILHEALTH_MOCK_PATIENT_RELATION: z
			.enum(["member", "spouse", "child", "parent", "dependent"])
			.default("member"),
		PHILHEALTH_MOCK_EFFECTIVITY_DATE: z.string().default("2025-01-01"),
		PHILHEALTH_MOCK_EXPIRY_DATE: z.string().default("2026-12-31"),
		PHILHEALTH_MOCK_REMAINING_BENEFIT: z.coerce.number().default(45000),
		PHILHEALTH_MOCK_ERROR_MESSAGE: z.string().default("Mock PhilHealth error response."),

		// LiveKit video conferencing
		LIVEKIT_MODE: z.enum(["mock", "real"]).default("mock"),
		LIVEKIT_API_KEY: optionalString,
		LIVEKIT_API_SECRET: optionalString,
		LIVEKIT_WS_URL: optionalUrl,

		// ElevenLabs speech-to-text
		ELEVENLABS_API_KEY: optionalString,

		// File storage for generated artifacts
		FILE_STORAGE_TYPE: z.enum(["local", "s3"]).default("local"),
		FILE_STORAGE_PATH: z.string().default("./storage"),
		FILE_STORAGE_BASE_URL: z.string().default("/storage"),
		AWS_S3_BUCKET: optionalString,
		AWS_REGION: z.string().default("ap-southeast-1"),
		AWS_ACCESS_KEY_ID: optionalString,
		AWS_SECRET_ACCESS_KEY: optionalString,

		// Outbound SMTP for clinical document delivery (abstract, e-Rx).
		// When MAILER_MODE=smtp and host/user/pass/from are set, NodemailerMailer
		// is used. Otherwise LogOnlyMailer logs the send and the document is still
		// marked sent with a warning audit entry (mailerConfigured: false).
		MAILER_MODE: z.enum(["log", "smtp"]).default("log"),
		SMTP_HOST: optionalString,
		SMTP_PORT: z.coerce.number().int().positive().optional(),
		SMTP_USER: optionalString,
		SMTP_PASS: optionalString,
		SMTP_FROM: optionalString,
		SMTP_SECURE: z.coerce.boolean().default(false),

		// NHDR (National Health Data Repository) integration
		NHDR_MODE: z.enum(["mock", "real"]).default("mock"),
		NHDR_BASE_URL: z.string().url().optional(),
		NHDR_API_KEY: z.string().optional(),

		// Additional integration credential env-vars
		FHIR_API_KEY: z.string().optional(),
		CIVIL_REGISTRY_API_KEY: z.string().optional(),
		LCR_API_ENABLED: z.coerce.boolean().default(false),
		LCR_API_BASE_URL: optionalUrl,
		LCR_API_KEY: optionalString,
		LCR_API_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
		HAI_API_KEY: z.string().optional(),
		ERP_API_KEY: z.string().optional(),
		LIS_API_KEY: z.string().optional(),
		PACS_API_KEY: z.string().optional(),
		TELEMEDICINE_API_KEY: z.string().optional(),
		PIDSR_API_KEY: z.string().optional(),
		CUSTOM_INTEGRATION_API_KEY: z.string().optional(),

		// Scheduling
		SCHEDULER_SLOT_WINDOW_DAYS: z.coerce.number().int().positive().default(60),
	},
	runtimeEnv: process.env,
	skipValidation: !!process.env.CI || process.env.npm_lifecycle_event === "lint",
})

export type Env = typeof env
