import { HttpException } from "@nestjs/common"
import type { ORPCModuleConfig } from "@orpc/nest"
import { ORPCError } from "@orpc/server"

type ORPCErrorCode = ConstructorParameters<typeof ORPCError>[0]

const STATUS_TO_ORPC_CODE: Partial<Record<number, ORPCErrorCode>> = {
	400: "BAD_REQUEST",
	401: "UNAUTHORIZED",
	403: "FORBIDDEN",
	404: "NOT_FOUND",
	405: "METHOD_NOT_SUPPORTED",
	406: "NOT_ACCEPTABLE",
	408: "TIMEOUT",
	409: "CONFLICT",
	412: "PRECONDITION_FAILED",
	413: "PAYLOAD_TOO_LARGE",
	415: "UNSUPPORTED_MEDIA_TYPE",
	422: "UNPROCESSABLE_CONTENT",
	429: "TOO_MANY_REQUESTS",
	499: "CLIENT_CLOSED_REQUEST",
	500: "INTERNAL_SERVER_ERROR",
	501: "NOT_IMPLEMENTED",
	502: "BAD_GATEWAY",
	503: "SERVICE_UNAVAILABLE",
	504: "GATEWAY_TIMEOUT",
}

type ExceptionResponseObject = {
	message?: string | string[]
	error?: string
	statusCode?: number
	[key: string]: unknown
}

export function toORPCError(error: unknown): ORPCError<ORPCErrorCode, unknown> {
	if (error instanceof ORPCError) {
		return error
	}

	if (!(error instanceof HttpException)) {
		return new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Internal server error",
			cause: error,
		})
	}

	const status = error.getStatus()
	const response = error.getResponse()

	let message = error.message
	let details: Record<string, unknown> | null = null

	if (typeof response === "string") {
		message = response
	} else if (response && typeof response === "object") {
		const responseObject = response as ExceptionResponseObject
		const rawMessage = responseObject.message
		message =
			typeof rawMessage === "string"
				? rawMessage
				: Array.isArray(rawMessage)
					? rawMessage.join("; ")
					: error.message

		const extraDetails = Object.fromEntries(
			Object.entries(responseObject).filter(
				([key]) => !["message", "statusCode", "error"].includes(key)
			)
		)

		if (Object.keys(extraDetails).length > 0) {
			details = extraDetails
		}
	}

	return new ORPCError(STATUS_TO_ORPC_CODE[status] ?? "INTERNAL_SERVER_ERROR", {
		status,
		message,
		data: {
			backendCode: error.constructor.name,
			details,
		},
		cause: error,
	})
}

export const nestHttpExceptionInterceptor: NonNullable<ORPCModuleConfig["interceptors"]>[number] =
	async ({ next }) => {
		try {
			return await next()
		} catch (error) {
			throw toORPCError(error)
		}
	}
