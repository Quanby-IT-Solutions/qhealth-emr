import { describe, expect, it } from "vitest"

import {
	calculateAgeYears,
	mapPatientSexToFaceScanGender,
	mergeFaceScanDemographics,
} from "./face-scan-demographics"

describe("face-scan-demographics", () => {
	it("calculates age from date of birth", () => {
		expect(calculateAgeYears("1990-06-15", new Date("2020-06-14"))).toBe(29)
		expect(calculateAgeYears("1990-06-15", new Date("2020-06-15"))).toBe(30)
	})

	it("maps patient sex to scan gender", () => {
		expect(mapPatientSexToFaceScanGender("male")).toBe("male")
		expect(mapPatientSexToFaceScanGender("female")).toBe("female")
		expect(mapPatientSexToFaceScanGender("other")).toBeUndefined()
	})

	it("merges demographics with explicit props winning last", () => {
		expect(
			mergeFaceScanDemographics({ age: 40, gender: "female" }, { age: 30, gender: "male" })
		).toEqual({ age: 30, gender: "male" })
	})
})
