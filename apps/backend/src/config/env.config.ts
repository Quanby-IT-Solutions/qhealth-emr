import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

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

		// Database
		DATABASE_URL: z.string(),

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
