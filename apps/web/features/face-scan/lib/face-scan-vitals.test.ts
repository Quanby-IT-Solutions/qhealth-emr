import { describe, expect, it } from "vitest"

import {
	getFaceScanResultItems,
	toEdTriageFields,
	toFpeFields,
	toNursingFields,
	toOpdTriageFields,
	toTelemedicineFields,
} from "./face-scan-vitals"

const sample = {
	bpSystolic: 118,
	bpDiastolic: 76,
	heartRate: 72,
	respiratoryRate: 16,
	spo2: 98,
}

describe("face-scan field mappers", () => {
	it("maps to nursing fields", () => {
		expect(toNursingFields(sample)).toEqual({
			bpSystolic: "118",
			bpDiastolic: "76",
			heartRate: "72",
			respiratoryRate: "16",
			spo2: "98",
			height: "",
			weight: "",
		})
	})

	it("maps setup height and weight to nursing fields", () => {
		expect(toNursingFields({ ...sample, heightCm: 170, weightKg: 65 })).toEqual({
			bpSystolic: "118",
			bpDiastolic: "76",
			heartRate: "72",
			respiratoryRate: "16",
			spo2: "98",
			height: "170",
			weight: "65",
		})
	})

	it("rounds spo2 for display", () => {
		expect(toNursingFields({ ...sample, spo2: 99.176 })).toMatchObject({ spo2: "99" })
	})

	it("maps to OPD triage fields", () => {
		expect(toOpdTriageFields(sample)).toEqual({
			systolicBp: "118",
			diastolicBp: "76",
			heartRateBpm: "72",
			respiratoryRate: "16",
			oxygenSatPct: "98",
			heightCm: "",
			weightKg: "",
		})
	})

	it("maps to telemedicine fields", () => {
		expect(toTelemedicineFields(sample)).toEqual({
			bloodPressure: "118/76",
			heartRate: "72",
			oxygenSaturation: "98",
		})
	})

	it("maps to FPE fields", () => {
		expect(toFpeFields(sample)).toEqual({
			bloodPressure: "118/76",
			heartRate: "72",
			respiratoryRate: "16",
			oxygenSaturation: "98",
			height: "",
			weight: "",
		})
	})

	it("maps to ED triage fields", () => {
		expect(toEdTriageFields(sample)).toEqual(toNursingFields(sample))
	})

	it("builds structured result items for display", () => {
		expect(getFaceScanResultItems({ ...sample, heightCm: 157, weightKg: 59 })).toEqual([
			expect.objectContaining({
				id: "bp",
				label: "Blood pressure",
				value: "118/76",
				source: "camera",
			}),
			expect.objectContaining({ id: "hr", value: "72", source: "camera" }),
			expect.objectContaining({ id: "rr", value: "16", source: "camera" }),
			expect.objectContaining({ id: "spo2", value: "98", source: "camera" }),
			expect.objectContaining({ id: "height", value: "157", source: "setup" }),
			expect.objectContaining({ id: "weight", value: "59", source: "setup" }),
		])
	})
})
