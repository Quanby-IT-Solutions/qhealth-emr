import { describe, expect, it } from "vitest"

import { vitalSignToFormFields } from "./vitals-entry-form"

describe("vitalSignToFormFields", () => {
	it("maps saved vitals into form field strings", () => {
		expect(
			vitalSignToFormFields({
				id: "v1",
				temperature: "36.5",
				bpSystolic: 108,
				bpDiastolic: 63,
				heartRate: 76,
				respiratoryRate: 22,
				spo2: "98",
				spo2Scale: "scale2",
				oxygenTherapy: true,
				oxygenDeliveryDevice: "Nasal cannula",
				oxygenFlowRate: "2.5",
				weight: "59",
				height: "157",
				consciousnessLevel: "C",
				recordedAt: "2026-06-29T10:00:00.000Z",
			})
		).toEqual({
			temperature: "36.5",
			bpSystolic: "108",
			bpDiastolic: "63",
			heartRate: "76",
			respiratoryRate: "22",
			spo2: "98",
			spo2Scale: "scale2",
			oxygenTherapy: true,
			oxygenDeliveryDevice: "Nasal cannula",
			oxygenFlowRate: "2.5",
			weight: "59",
			weightUnit: "kg",
			height: "157",
			heightUnit: "cm",
			heightFeet: "",
			heightInches: "",
			consciousnessLevel: "C",
		})
	})

	it("uses empty strings for missing values", () => {
		expect(
			vitalSignToFormFields({
				id: "v2",
				temperature: null,
				bpSystolic: null,
				bpDiastolic: null,
				heartRate: null,
				respiratoryRate: null,
				spo2: null,
				spo2Scale: undefined,
				oxygenTherapy: undefined,
				oxygenDeliveryDevice: null,
				oxygenFlowRate: null,
				weight: null,
				height: null,
				consciousnessLevel: undefined,
				recordedAt: "2026-06-29T10:00:00.000Z",
			})
		).toEqual({
			temperature: "",
			bpSystolic: "",
			bpDiastolic: "",
			heartRate: "",
			respiratoryRate: "",
			spo2: "",
			spo2Scale: "scale1",
			oxygenTherapy: false,
			oxygenDeliveryDevice: "",
			oxygenFlowRate: "",
			weight: "",
			weightUnit: "kg",
			height: "",
			heightUnit: "cm",
			heightFeet: "",
			heightInches: "",
			consciousnessLevel: "A",
		})
	})
})
