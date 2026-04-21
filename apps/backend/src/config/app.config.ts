import { Logger, type INestApplication } from "@nestjs/common"
import * as express from "express"

import { env } from "@/config/env.config"

const logger = new Logger("AppConfig")

/**
 * Whitelist of environment variable names that integrations may reference as
 * credential stores. Only the variable *name* is exposed via the
 * `listCredentialRefs` endpoint — values are never transmitted.
 *
 * Add new entries here when onboarding a new integration type.
 */
export const INTEGRATION_CREDENTIAL_ENV_VARS = [
	"FHIR_API_KEY",
	"NHDR_FHIR_API_KEY",
	"CIVIL_REGISTRY_API_KEY",
	"HAI_API_KEY",
	"PHILHEALTH_CEWS_API_KEY",
	"CUSTOM_INTEGRATION_API_KEY",
] as const satisfies readonly string[]

export type IntegrationCredentialRef = (typeof INTEGRATION_CREDENTIAL_ENV_VARS)[number]

/**
 * Configure body parser middleware for non-auth routes
 * Note: bodyParser is disabled in bootstrap.ts to allow Better Auth to handle its own body parsing.
 * We need to manually add JSON parsing for all other routes.
 */
function configureBodyParser(app: INestApplication): void {
	const httpAdapter = app.getHttpAdapter()
	httpAdapter.use(express.json())
	httpAdapter.use(express.urlencoded({ extended: true }))
	logger.log("Body parser middleware configured")
}

/**
 * Configure CORS for the application
 */
function configureCors(app: INestApplication): void {
	const origins = env.CORS_ORIGINS.split(",").map(origin => origin.trim())
	app.enableCors({ origin: origins, credentials: true })
	logger.log(`CORS enabled for origins: ${origins.join(", ")}`)
}

/**
 * Enable graceful shutdown handlers for SIGTERM and SIGINT signals
 */
function enableGracefulShutdown(app: INestApplication): void {
	const shutdown = async (signal: string): Promise<void> => {
		logger.log(`Received ${signal}, starting graceful shutdown...`)
		try {
			await app.close()
			logger.log("Application closed successfully")
			process.exit(0)
		} catch (error) {
			logger.error("Error during graceful shutdown", error)
			process.exit(1)
		}
	}

	process.on("SIGTERM", () => void shutdown("SIGTERM"))
	process.on("SIGINT", () => void shutdown("SIGINT"))
	logger.log("Graceful shutdown handlers registered")
}

/**
 * Configure all application-level settings
 * Note: Global pipes/interceptors/filters are registered via APP_* providers in app.module.ts
 */
export function configureApp(app: INestApplication): void {
	configureBodyParser(app)
	configureCors(app)
	enableGracefulShutdown(app)
}
