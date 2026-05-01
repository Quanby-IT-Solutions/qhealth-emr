import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core"
import { ScheduleModule } from "@nestjs/schedule"
import { ThrottlerModule } from "@nestjs/throttler"
import { AuthModule } from "@thallesp/nestjs-better-auth"
import { ZodSerializerInterceptor, ZodValidationPipe } from "nestjs-zod"

import { getAuth } from "@repo/auth"

import { CommonAuditModule } from "@/common/audit/audit.module"
import { HttpExceptionFilter } from "@/common/filters/http-exception.filter"
import { RbacGuard } from "@/modules/v1/rbac/rbac.guard"
import { V1Module } from "@/modules/v1/v1.module"

import { ORPCCommonModule } from "./common/orpc/orpc.module"
import { env } from "./config/env.config"

@Module({
	imports: [
		// Core configuration
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: ".env",
			load: [() => env],
		}),
		// Scheduler (cron jobs)
		ScheduleModule.forRoot(),
		// Rate limiting — 60 req/min globally; auth endpoints are further restricted per-route
		ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
		// Authentication (controllers disabled - we register versioned routes in setupBetterAuth)
		AuthModule.forRoot({ auth: getAuth(), disableControllers: true }),
		// Shared write-side audit module (global)
		CommonAuditModule,
		// oRPC setup
		ORPCCommonModule,
		// Versioned modules
		V1Module,
	],
	providers: [
		// Global providers
		{
			provide: APP_PIPE,
			useClass: ZodValidationPipe,
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: ZodSerializerInterceptor,
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
