import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from "@nestjs/common"
import * as Sentry from "@sentry/nestjs"
import type { Request, Response } from "express"
import { ZodSerializationException } from "nestjs-zod"
import { ZodError } from "zod"

import { env } from "@/config/env.config"

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(HttpExceptionFilter.name)

	catch(exception: HttpException, host: ArgumentsHost) {
		const ctx = host.switchToHttp()
		const request = ctx.getRequest<Request>()
		const response = ctx.getResponse<Response>()
		const status = exception.getStatus()
		const exceptionResponse = exception.getResponse()

		// Ensure CORS headers are present on error responses
		// (NestJS CORS middleware may not run for exception responses)
		const origin = request.headers.origin
		if (origin) {
			const allowedOrigins = env.CORS_ORIGINS.split(",").map(o => o.trim())
			if (allowedOrigins.includes(origin)) {
				response.setHeader("Access-Control-Allow-Origin", origin)
				response.setHeader("Access-Control-Allow-Credentials", "true")
			}
		}

		// Capture 5xx only. 4xx (RBAC denials, throttler 429s, validation errors)
		// are expected outcomes of a working system, not incidents — reporting them
		// buries the real failures. This filter is the only place that sees
		// deliberate 5xx `HttpException`s, so it captures them directly rather than
		// relying on SentryExceptionFilter, which — per Nest's `@Catch(HttpException)`
		// precedence — only ever sees non-HttpException failures. That split is what
		// keeps a single error from being reported twice.
		if (status >= 500) {
			Sentry.captureException(exception)
		}

		// Log Zod serialization errors
		if (exception instanceof ZodSerializationException) {
			const zodError = exception.getZodError()
			if (zodError instanceof ZodError) {
				this.logger.error(`ZodSerializationException: ${zodError.message}`)
			}
		}

		// Extract error details
		let message: string | string[]
		let details: Record<string, unknown> | undefined

		if (typeof exceptionResponse === "string") {
			message = exceptionResponse
		} else if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
			const responseObj = exceptionResponse as Record<string, unknown>
			message = (responseObj.message as string | string[]) || exception.message

			// Only include details if there's meaningful extra info beyond message/statusCode/error
			const extraDetails = Object.fromEntries(
				Object.entries(responseObj).filter(
					([key]) => !["message", "statusCode", "error"].includes(key)
				)
			)
			if (Object.keys(extraDetails).length > 0) {
				details = extraDetails
			}
		} else {
			message = exception.message
		}

		// Consistent error response format
		const errorObject: Record<string, unknown> = {
			code: exception.constructor.name,
			message,
		}

		if (details) {
			errorObject.details = details
		}

		const errorResponse = {
			success: false,
			error: errorObject,
			timestamp: new Date().toISOString(),
		}

		response.status(status).json(errorResponse)
	}
}
