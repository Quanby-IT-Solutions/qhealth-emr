import { describe, expect, it } from "vitest"

import {
	CdsAlertSchema,
	CdsAlertTypeEnum,
	CdsEvaluateInputSchema,
	CdsEvaluateResponseSchema,
	CreateMedOrderSchema,
	CreateTranchedOrdersSchema,
	HighAlertVerificationSchema,
	MedOrderSchema,
	PrescriptionSchema,
} from "./orders.schema.js"

const FACILITY_ID = "550e8400-e29b-41d4-a716-446655440000"
const PATIENT_ID = "550e8400-e29b-41d4-a716-446655440001"
const ENCOUNTER_ID = "550e8400-e29b-41d4-a716-446655440002"
const STAFF_ID = "550e8400-e29b-41d4-a716-446655440003"
const ORDER_ID = "550e8400-e29b-41d4-a716-446655440004"
const PRESCRIPTION_ID = "550e8400-e29b-41d4-a716-446655440005"
const VERIFICATION_ID = "550e8400-e29b-41d4-a716-446655440006"
const VERIFYING_STAFF_ID = "550e8400-e29b-41d4-a716-446655440007"
const PARENT_ORDER_ID = "550e8400-e29b-41d4-a716-446655440008"
const FORMULARY_ITEM_ID = "550e8400-e29b-41d4-a716-446655440009"

describe("CreateMedOrderSchema", () => {
	const baseValid = {
		facilityId: FACILITY_ID,
		genericName: "Amoxicillin",
		dose: "500",
		doseUnit: "mg",
		doseForm: "capsule",
		route: "PO",
		frequency: "tid" as const,
	}

	it("accepts a valid order", () => {
		const result = CreateMedOrderSchema.safeParse(baseValid)
		expect(result.success).toBe(true)
	})

	it("rejects an empty genericName", () => {
		const result = CreateMedOrderSchema.safeParse({
			...baseValid,
			genericName: "",
		})

		expect(result.success).toBe(false)
	})

	it("rejects an invalid frequency enum value", () => {
		const result = CreateMedOrderSchema.safeParse({
			...baseValid,
			frequency: "hourly",
		})

		expect(result.success).toBe(false)
	})

	it("accepts optional fields when provided", () => {
		const result = CreateMedOrderSchema.safeParse({
			...baseValid,
			encounterId: ENCOUNTER_ID,
			patientId: PATIENT_ID,
			formularyItemId: FORMULARY_ITEM_ID,
			brandName: "Amoxil",
			rxnormCode: "723",
			firstDoseAt: "2024-01-01T08:00:00.000Z",
			durationDays: 7,
			specialInstructions: "Take with food",
			isPrn: false,
			isControlledSubstance: false,
		})

		expect(result.success).toBe(true)
	})

	it("accepts formularyItemId as the only optional field", () => {
		const result = CreateMedOrderSchema.safeParse({
			...baseValid,
			formularyItemId: FORMULARY_ITEM_ID,
		})

		expect(result.success).toBe(true)
	})
})

describe("CdsEvaluateInputSchema", () => {
	it("accepts a valid input", () => {
		const result = CdsEvaluateInputSchema.safeParse({
			patientId: PATIENT_ID,
			genericName: "Amoxicillin",
			orderingStaffId: STAFF_ID,
			facilityId: FACILITY_ID,
		})

		expect(result.success).toBe(true)
	})

	it("rejects missing patientId", () => {
		const result = CdsEvaluateInputSchema.safeParse({
			genericName: "Amoxicillin",
			orderingStaffId: STAFF_ID,
			facilityId: FACILITY_ID,
		})

		expect(result.success).toBe(false)
		expect(result.error?.issues.some(issue => issue.path.includes("patientId"))).toBe(true)
	})

	it("rejects a blank genericName", () => {
		const result = CdsEvaluateInputSchema.safeParse({
			patientId: PATIENT_ID,
			genericName: "   ",
			orderingStaffId: STAFF_ID,
			facilityId: FACILITY_ID,
		})

		expect(result.success).toBe(false)
	})
})

describe("CreateTranchedOrdersSchema", () => {
	const baseValid = {
		facilityId: FACILITY_ID,
		patientId: PATIENT_ID,
		genericName: "Morphine",
		dose: "10",
		doseUnit: "mg",
		doseForm: "tablet",
		route: "PO",
		frequency: "bid" as const,
		durationDays: 30,
		pdeaSchedule: "S2",
	}

	it("accepts a valid tranched medication order", () => {
		const result = CreateTranchedOrdersSchema.safeParse(baseValid)
		expect(result.success).toBe(true)
	})

	it("rejects a whitespace-only genericName", () => {
		const result = CreateTranchedOrdersSchema.safeParse({
			...baseValid,
			genericName: "   ",
		})

		expect(result.success).toBe(false)
	})
})

describe("CdsEvaluateResponseSchema", () => {
	it("accepts canProceed false with alerts", () => {
		const result = CdsEvaluateResponseSchema.safeParse({
			alerts: [
				{
					type: "allergy_hard_block",
					severity: "hard_block",
					message: "Patient is allergic to penicillin class",
				},
			],
			canProceed: false,
			requiresOverride: false,
			requiresDoubleVerification: false,
		})

		expect(result.success).toBe(true)
	})

	it("accepts canProceed true with empty alerts", () => {
		const result = CdsEvaluateResponseSchema.safeParse({
			alerts: [],
			canProceed: true,
			requiresOverride: false,
			requiresDoubleVerification: false,
		})

		expect(result.success).toBe(true)
	})
})

describe("CdsAlertSchema", () => {
	it("accepts every CdsAlertTypeEnum value", () => {
		for (const type of CdsAlertTypeEnum.options) {
			const result = CdsAlertSchema.safeParse({
				type,
				severity: "warning",
				message: `Alert of type ${type}`,
			})

			expect(result.success).toBe(true)
		}
	})

	it("rejects an unknown alert type", () => {
		const result = CdsAlertSchema.safeParse({
			type: "unknown_alert",
			severity: "warning",
			message: "Should not parse",
		})

		expect(result.success).toBe(false)
	})
})

describe("HighAlertVerificationSchema", () => {
	it("accepts a valid dual-sign record", () => {
		const result = HighAlertVerificationSchema.safeParse({
			id: VERIFICATION_ID,
			medicationOrderId: ORDER_ID,
			requestingStaffId: STAFF_ID,
			verifyingStaffId: VERIFYING_STAFF_ID,
			verifiedAt: "2024-01-01T08:00:00.000Z",
			notes: "Dose double-checked by second nurse",
			createdAt: "2024-01-01T08:00:00.000Z",
		})

		expect(result.success).toBe(true)
	})
})

describe("PrescriptionSchema", () => {
	const baseValid = {
		id: PRESCRIPTION_ID,
		facilityId: FACILITY_ID,
		encounterId: ENCOUNTER_ID,
		medicationOrderId: ORDER_ID,
		patientId: PATIENT_ID,
		prescriberStaffId: STAFF_ID,
		prescriberStaffName: "Dr. Smith",
		prcLicenseNumber: "PRC-12345",
		ptrNumber: "PTR-67890",
		pdeaS2License: "PDEA-S2-001",
		prescriptionContent: { items: [] },
		status: "signed" as const,
		signedAt: "2024-01-01T08:00:00.000Z",
		createdAt: "2024-01-01T08:00:00.000Z",
	}

	it("accepts a record with prcLicenseNumber and ptrNumber set", () => {
		const result = PrescriptionSchema.safeParse(baseValid)
		expect(result.success).toBe(true)
	})

	it("accepts pdeaS2License as null", () => {
		const result = PrescriptionSchema.safeParse({
			...baseValid,
			pdeaS2License: null,
		})

		expect(result.success).toBe(true)
	})
})

describe("MedOrderSchema", () => {
	const baseValid = {
		id: ORDER_ID,
		facilityId: FACILITY_ID,
		encounterId: ENCOUNTER_ID,
		preEncounterId: null,
		formularyItemId: null,
		genericName: "Morphine",
		brandName: null,
		rxnormCode: null,
		dose: "10",
		doseUnit: "mg",
		doseForm: "tablet",
		route: "PO",
		frequency: "q6h",
		firstDoseAt: null,
		durationDays: null,
		specialInstructions: null,
		isPrn: false,
		prnReason: null,
		isControlledSubstance: true,
		pdeaSchedule: null,
		pdeaTrancheNumber: null,
		pdeaTrancheTotal: null,
		parentOrderId: null,
		isTranche: false,
		status: "pending_verification" as const,
		orderingStaffId: STAFF_ID,
		orderingStaffName: "Dr. Smith",
		cdsAlerts: null,
		cdsOverrides: null,
		createdAt: "2024-01-01T08:00:00.000Z",
		updatedAt: "2024-01-01T08:00:00.000Z",
	}

	it("accepts a full shape with nullable PDEA tranche fields", () => {
		const result = MedOrderSchema.safeParse(baseValid)
		expect(result.success).toBe(true)
	})

	it("accepts isTranche true with parentOrderId set", () => {
		const result = MedOrderSchema.safeParse({
			...baseValid,
			isTranche: true,
			parentOrderId: PARENT_ORDER_ID,
			pdeaSchedule: "II",
			pdeaTrancheNumber: 1,
			pdeaTrancheTotal: 3,
		})

		expect(result.success).toBe(true)
	})
})
