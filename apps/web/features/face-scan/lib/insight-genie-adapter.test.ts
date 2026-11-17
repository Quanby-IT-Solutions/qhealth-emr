import { describe, expect, it } from "vitest"

import { mapInsightGenieToFaceScanVitals } from "./insight-genie-adapter"

describe("mapInsightGenieToFaceScanVitals", () => {
	it("maps nested Insight-Genie completion payload", () => {
		const result = mapInsightGenieToFaceScanVitals({
			action: "onHealthAnalysisFinished",
			vital_signs: {
				heart_rate: 72,
				respiratory_rate: 16,
				spo2: 98,
				systolic: 118,
				diastolic: 76,
			},
		})

		expect(result).toEqual({
			heartRate: 72,
			respiratoryRate: 16,
			spo2: 98,
			bpSystolic: 118,
			bpDiastolic: 76,
		})
	})

	it("returns nulls for empty payload", () => {
		expect(mapInsightGenieToFaceScanVitals(null)).toEqual({
			heartRate: null,
			respiratoryRate: null,
			spo2: null,
			bpSystolic: null,
			bpDiastolic: null,
		})
	})
})
