import { describe, expect, it } from "vitest"

import {
	formatHeightFromCm,
	formatWeightFromKg,
	heightCmToFeetInches,
	parseHeightToCm,
	parseWeightToKg,
} from "./measurement-units"

describe("measurement unit helpers", () => {
	it("converts pounds to kilograms for standard vitals storage", () => {
		expect(parseWeightToKg("154.3", "lb")).toBeCloseTo(70, 1)
		expect(formatWeightFromKg(70, "lb")).toBe("154.3")
	})

	it("converts feet and inches to centimeters for standard vitals storage", () => {
		expect(parseHeightToCm({ unit: "ft-in", feet: "5", inches: "7" })).toBeCloseTo(170.2, 1)
		expect(heightCmToFeetInches(170.2)).toEqual({ feet: "5", inches: "7" })
	})

	it("keeps metric values as metric display strings", () => {
		expect(parseWeightToKg("70", "kg")).toBe(70)
		expect(formatWeightFromKg("70.04", "kg")).toBe("70")
		expect(parseHeightToCm({ unit: "cm", cm: "170.2" })).toBe(170.2)
		expect(formatHeightFromCm("170.24")).toBe("170.2")
	})
})
