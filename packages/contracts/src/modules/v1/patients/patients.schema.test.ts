import { describe, expect, it } from "vitest"

import { PatientSearchSchema } from "./patients.schema"

describe("PatientSearchSchema", () => {
	it("coerces isActive from GET query params", () => {
		const result = PatientSearchSchema.parse({
			facilityId: "550e8400-e29b-41d4-a716-446655440000",
			isActive: "true",
			page: "1",
			limit: "100",
		})

		expect(result.isActive).toBe(true)
		expect(result.page).toBe(1)
		expect(result.limit).toBe(100)
	})
})
