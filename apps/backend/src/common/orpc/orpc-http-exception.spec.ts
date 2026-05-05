import { BadRequestException, ForbiddenException } from "@nestjs/common"

import { toORPCError } from "./orpc-http-exception"

jest.mock("@orpc/server", () => {
	class MockORPCError extends Error {
		readonly code: string
		readonly status: number
		readonly data: unknown

		constructor(code: string, options?: { status?: number; message?: string; data?: unknown }) {
			super(options?.message ?? code)
			this.code = code
			this.status = options?.status ?? 500
			this.data = options?.data
		}
	}

	return { ORPCError: MockORPCError }
})

describe("toORPCError", () => {
	it("maps Nest forbidden exceptions to ORPC forbidden errors", () => {
		const error = toORPCError(
			new ForbiddenException("Break-glass required for this patient chart.")
		)

		expect(error.code).toBe("FORBIDDEN")
		expect(error.status).toBe(403)
		expect(error.message).toBe("Break-glass required for this patient chart.")
		expect(error.data).toEqual({
			backendCode: "ForbiddenException",
			details: null,
		})
	})

	it("preserves structured Nest error details", () => {
		const error = toORPCError(
			new BadRequestException({
				message: ["A", "B"],
				field: "dateOfBirth",
			})
		)

		expect(error.code).toBe("BAD_REQUEST")
		expect(error.status).toBe(400)
		expect(error.message).toBe("A; B")
		expect(error.data).toEqual({
			backendCode: "BadRequestException",
			details: {
				field: "dateOfBirth",
			},
		})
	})
})
