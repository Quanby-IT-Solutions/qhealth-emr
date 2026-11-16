import { Module, RequestMethod } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core"
import { EventEmitterModule } from "@nestjs/event-emitter"
import { ScheduleModule } from "@nestjs/schedule"
import { ThrottlerModule } from "@nestjs/throttler"
import { SentryModule } from "@sentry/nestjs/setup"
import { AuthModule } from "@thallesp/nestjs-better-auth"
import { LoggerModule } from "nestjs-pino"
import { ZodSerializerInterceptor, ZodValidationPipe } from "nestjs-zod"

import { getAuth } from "@repo/auth"

import { CommonAuditModule } from "@/common/audit/audit.module"
import { HttpExceptionFilter } from "@/common/filters/http-exception.filter"
import { SentryExceptionFilter } from "@/common/filters/sentry-exception.filter"
import { buildPinoHttpOptions } from "@/config/pino-logger.config"
import { RbacGuard } from "@/modules/v1/rbac/rbac.guard"
import { V1Module } from "@/modules/v1/v1.module"
import { TelemetryLifecycle } from "@/telemetry/telemetry.lifecycle"

import { AnalyticsModule } from "./common/analytics/analytics.module"
import { ORPCCommonModule } from "./common/orpc/orpc.module"
import { env } from "./config/env.config"

@Module({
	imports: [
		// Sentry request/span instrumentation for Nest (controllers, guards,
		// interceptors, pipes). The SDK itself is initialised much earlier, in
		// `src/instrument.ts` — this only wires the Nest-specific tracing. It is a
		// no-op when `Sentry.init` never ran.
		SentryModule.forRoot(),
		// Core configuration
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: ".env",
			load: [() => env],
		}),
		// Structured logging (provides the injectable pino-backed Logger).
		// autoLogging is disabled here so this LoggerModule pino-http middleware
		// emits NO request/response log lines: the standalone pino-http middleware
		// registered before Better Auth (bootstrap.ts) is the authoritative
		// request/response logger for all routes. This middleware still runs, but
		// its genReqId reuses the `req.id` already assigned by the pre-auth
		// middleware (see buildPinoHttpOptions), so both agree on one correlation
		// id and the response header is never overwritten with a fresh one.
		//
		// forRoutes is set explicitly. nestjs-pino's default is `{ path: "*" }`.
		// Under the global `api` prefix, Nest 11 rewrites that legacy wildcard
		// and logs a LegacyRouteConverter warning. `{*path}` is the v8 form Nest
		// rewrites `*` into, so coverage stays the same and the warning is not
		// emitted.
		LoggerModule.forRoot({
			pinoHttp: buildPinoHttpOptions({ autoLogging: false }),
			forRoutes: [{ path: "{*path}", method: RequestMethod.ALL }],
		}),
		// Scheduler (cron jobs)
		ScheduleModule.forRoot(),
		// Event bus (in-process pub/sub for cross-module signals like coding.signed, records.released)
		EventEmitterModule.forRoot({ wildcard: true }),
		// Rate limiting — 60 req/min globally; auth endpoints are further restricted per-route
		ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
		// Authentication (controllers disabled - we register versioned routes in setupBetterAuth)
		AuthModule.forRoot({ auth: getAuth(), disableControllers: true }),
		// PostHog: one shared client, or none when analytics is off.
		AnalyticsModule,
		// Shared write-side audit module (global)
		CommonAuditModule,
		// oRPC setup
		ORPCCommonModule,
		// Versioned modules
		V1Module,
	],
	providers: [
		// Flushes OpenTelemetry spans and metrics on shutdown (a no-op when off).
		TelemetryLifecycle,
		// Global providers
		{
			provide: APP_PIPE,
			useClass: ZodValidationPipe,
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: ZodSerializerInterceptor,
		},
		// Two filters, one contract. Nest routes an exception to the most specific
		// matching filter, so the split is by exception type, not by ordering luck:
		//   - HttpException (deliberate, typed)  -> HttpExceptionFilter, which
		//     renders the real status/message and captures only 5xx.
		//   - anything else (bugs, driver faults) -> SentryExceptionFilter, which
		//     captures it and renders a generic 500 in the same shape. A client
		//     request-parsing error is returned as that 4xx and is not captured.
		// Neither can see the other's exceptions, so nothing is reported twice.
		// The catch-all is registered first, per Sentry's Nest setup guidance.
		{
			provide: APP_FILTER,
			useClass: SentryExceptionFilter,
		},
		{
			provide: APP_FILTER,
			useClass: HttpExceptionFilter,
		},
		{
			provide: APP_GUARD,
			useClass: RbacGuard,
		},
	],
})
export class AppModule {}
