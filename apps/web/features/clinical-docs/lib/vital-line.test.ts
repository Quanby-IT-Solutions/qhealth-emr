import { describe, expect, it } from "vitest"

import { formatVitalLine, hasVitalMeasurements } from "./vital-line"

describe("formatVitalLine", () => {
	it("formats a full vital set", () => {
		const line = formatVitalLine({
			recordedAt: "2026-06-28T14:51:00.000Z",
			temperature: "37.0",
			bpSystolic: 120,
			bpDiastolic: 80,
			heartRate: 72,
			respiratoryRate: 18,
			spo2: "98",
			painScore: 0,
			weight: "65",
			height: "170",
		})

		expect(line).toContain("BP 120/80 mmHg")
		expect(line).toContain("HR 72 bpm")
		expect(line).toContain("Pain 0/10")
		expect(line).toContain("Weight 65 kg")
	})

	it("returns empty text when only a timestamp exists", () => {
		expect(
			formatVitalLine({
				recordedAt: "2026-06-28T14:51:00.000Z",
			})
		).toBe("")
		expect(hasVitalMeasurements({ recordedAt: "2026-06-28T14:51:00.000Z" })).toBe(false)
	})
})
