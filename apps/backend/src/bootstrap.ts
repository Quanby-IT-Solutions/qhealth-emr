import { Logger, VersioningType, type INestApplication } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"
import type { Application } from "express"
import { Logger as PinoLogger } from "nestjs-pino"
import pinoHttp from "pino-http"

import { AppModule } from "@/app.module"
import { configureApp } from "@/config/app.config"
import { setupBetterAuth } from "@/config/auth.config"
import { env } from "@/config/env.config"
import { buildPinoHttpOptions } from "@/config/pino-logger.config"
import { tagAssignedRequestId } from "@/config/sentry-request-id"
import { setupSwagger } from "@/config/swagger.config"

const logger = new Logger("Bootstrap")

/**
 * Configure URI-based API versioning (e.g., /api/v1/*, /api/v2/*)
 */
function setupVersioning(app: INestApplication): void {
	app.setGlobalPrefix("api")
	app.enableVersioning({ type: VersioningType.URI })
	logger.log("URI-based API versioning enabled")
}

/**
 * Create and configure the NestJS application
 */
async function createApplication(): Promise<INestApplication> {
	logger.log("Creating NestJS application...")
	// bufferLogs defers early logs until the pino logger is installed below.
	const app = await NestFactory.create(AppModule, { bodyParser: false, bufferLogs: true })

	// Swap Nest's default logger for the pino-backed one from LoggerModule.
	// Every `new Logger(...)` (including the module-level Bootstrap logger in
	// this file) routes through it from here on.
	app.useLogger(app.get(PinoLogger))

	const expressApp = app.getHttpAdapter().getInstance() as Application

	// IMPORTANT: pino-http must be registered BEFORE the Better Auth middleware.
	// Better Auth short-circuits /api/v1/auth/* before they reach Nest, so this
	// raw-Express middleware is what assigns req.id + X-Request-Id and logs
	// request/response for auth routes too. autoLogging stays on here
	// (authoritative). The Nest-side LoggerModule middleware runs later with
	// autoLogging off and reuses this req.id (see buildPinoHttpOptions.genReqId),
	// so there is exactly one request log line and one correlation id per request.
	expressApp.use(pinoHttp(buildPinoHttpOptions()))
	// `req.id` now exists. Tag this request's Sentry isolation scope with it so
	// every event captured for the request carries `request_id`. No-op when
	// Sentry was not initialised.
	expressApp.use(tagAssignedRequestId)

	// IMPORTANT: Better Auth must be registered BEFORE express.json() body parser.
	// Better Auth's toNodeHandler reads the raw request stream for body parsing.
	// If express.json() runs first, it consumes the stream and Better Auth sees
	// an empty body → sign-in/sign-up return null.
	setupBetterAuth(app)
	configureApp(app)
	setupVersioning(app)
	await setupSwagger(app)

	return app
}

/**
 * Start the application listener
 */
async function startApplication(app: INestApplication): Promise<void> {
	const port = env.PORT
	await app.listen(port)

	logger.log(`Application is running on: http://localhost:${port}`)
	logger.log(`Environment: ${env.NODE_ENV}`)
}

/**
 * Bootstrap the application
 */
export async function bootstrap(): Promise<void> {
	try {
		const app = await createApplication()
		await startApplication(app)
	} catch (error) {
		logger.error("Failed to bootstrap application", error)
		process.exit(1)
	}
}
