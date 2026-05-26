import { describe, expect, it } from "vitest"

import { ListCliniciansQuerySchema } from "./clinician-licenses.schema.js"

describe("clinician licenses schema", () => {
	it("coerces GET query pagination params from strings", () => {
		const parsed = ListCliniciansQuerySchema.parse({
			search: "Dr. License Validation",
			page: "2",
			limit: "50",
		})

		expect(parsed).toMatchObject({
			search: "Dr. License Validation",
			page: 2,
			limit: 50,
		})
	})
})
