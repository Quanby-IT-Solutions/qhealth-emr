import { describe, expect, it } from "vitest"

import {
	CdsAlertSchema,
	CdsAlertTypeEnum,
	CdsEvaluateInputSchema,
	CdsEvaluateResponseSchema,
	CreateImagingOrderSchema,
	CreateLabOrderSchema,
	CreateMedOrderSchema,
	CreateTranchedOrdersSchema,
	HighAlertVerificationSchema,
	ImagingOrderSchema,
	LabOrderSchema,
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

	it("requires schedule and duration for controlled substance orders", () => {
		const result = CreateMedOrderSchema.safeParse({
			...baseValid,
			isControlledSubstance: true,
		})

		expect(result.success).toBe(false)
		expect(result.error?.issues.some(issue => issue.path.includes("pdeaSchedule"))).toBe(true)
		expect(result.error?.issues.some(issue => issue.path.includes("durationDays"))).toBe(true)
	})

	it("rejects controlled substance orders over 30 days on the non-tranched endpoint", () => {
		const result = CreateMedOrderSchema.safeParse({
			...baseValid,
			isControlledSubstance: true,
			pdeaSchedule: "S-2",
			durationDays: 31,
		})

		expect(result.success).toBe(false)
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
		durationDays: 60,
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

	it("rejects tranched orders beyond the 90-day PDEA cap", () => {
		const result = CreateTranchedOrdersSchema.safeParse({
			...baseValid,
			durationDays: 91,
		})

		expect(result.success).toBe(false)
	})
})

describe("CreateLabOrderSchema", () => {
	const baseValid = {
		facilityId: FACILITY_ID,
		encounterId: ENCOUNTER_ID,
		testName: "Complete Blood Count",
		clinicalIndication: "Fever and productive cough",
		indicationIcd10Code: "J18.9",
		indicationIcd10Display: "Pneumonia, unspecified organism",
		priority: "stat" as const,
	}

	it("accepts a signed lab requisition with free-text and ICD-10 indication", () => {
		const result = CreateLabOrderSchema.safeParse(baseValid)

		expect(result.success).toBe(true)
	})

	it("accepts pre-encounter lab orders for pre-arrival order sets", () => {
		const result = CreateLabOrderSchema.safeParse({
			...baseValid,
			encounterId: undefined,
			preEncounterId: ENCOUNTER_ID,
		})

		expect(result.success).toBe(true)
	})

	it("rejects lab orders without an encounter or pre-encounter context", () => {
		const result = CreateLabOrderSchema.safeParse({
			...baseValid,
			encounterId: undefined,
		})

		expect(result.success).toBe(false)
		expect(result.error?.issues.some(issue => issue.path.includes("encounterId"))).toBe(true)
	})
})

describe("LabOrderSchema", () => {
	it("accepts persisted lab orders with requisition indication fields", () => {
		const result = LabOrderSchema.safeParse({
			id: ORDER_ID,
			facilityId: FACILITY_ID,
			encounterId: ENCOUNTER_ID,
			preEncounterId: null,
			patientId: PATIENT_ID,
			patientName: "Dela Cruz, Juan",
			loincCode: "57021-8",
			panelCode: null,
			testName: "Complete Blood Count",
			panelName: "Hematology",
			clinicalIndication: "Fever and productive cough",
			indicationIcd10Code: "J18.9",
			indicationIcd10Display: "Pneumonia, unspecified organism",
			priority: "stat",
			status: "ordered",
			specimenType: "Blood",
			orderingStaffId: STAFF_ID,
			orderingStaffName: "Dr. Smith",
			collectionDatetime: null,
			resultedDatetime: null,
			results: null,
			cdsAlerts: null,
			hasCriticalValues: false,
			createdAt: "2024-01-01T08:00:00.000Z",
			updatedAt: "2024-01-01T08:00:00.000Z",
		})

		expect(result.success).toBe(true)
	})
})

describe("CreateImagingOrderSchema", () => {
	const baseValid = {
		facilityId: FACILITY_ID,
		encounterId: ENCOUNTER_ID,
		modality: "xray" as const,
		bodyPart: "Chest",
		clinicalIndication: "Fever and productive cough",
		indicationIcd10Code: "J18.9",
		indicationIcd10Display: "Pneumonia, unspecified organism",
		priority: "urgent" as const,
	}

	it("accepts a signed imaging requisition with free-text and ICD-10 indication", () => {
		const result = CreateImagingOrderSchema.safeParse(baseValid)

		expect(result.success).toBe(true)
	})

	it("accepts pre-encounter imaging orders for pre-arrival order sets", () => {
		const result = CreateImagingOrderSchema.safeParse({
			...baseValid,
			encounterId: undefined,
			preEncounterId: ENCOUNTER_ID,
		})

		expect(result.success).toBe(true)
	})

	it("rejects imaging orders without an encounter or pre-encounter context", () => {
		const result = CreateImagingOrderSchema.safeParse({
			...baseValid,
			encounterId: undefined,
		})

		expect(result.success).toBe(false)
		expect(result.error?.issues.some(issue => issue.path.includes("encounterId"))).toBe(true)
	})
})

describe("ImagingOrderSchema", () => {
	it("accepts persisted imaging orders with requisition indication fields", () => {
		const result = ImagingOrderSchema.safeParse({
			id: PRESCRIPTION_ID,
			facilityId: FACILITY_ID,
			encounterId: ENCOUNTER_ID,
			preEncounterId: null,
			patientId: PATIENT_ID,
			patientName: "Dela Cruz, Juan",
			patientMrn: "MRN-0001",
			modality: "xray",
			bodyPart: "Chest",
			clinicalIndication: "Fever and productive cough",
			indicationIcd10Code: "J18.9",
			indicationIcd10Display: "Pneumonia, unspecified organism",
			priority: "urgent",
			status: "ordered",
			orderingStaffId: STAFF_ID,
			orderingStaffName: "Dr. Smith",
			scheduledDatetime: null,
			completedDatetime: null,
			report: null,
			structuredResults: null,
			cdsAlerts: null,
			createdAt: "2024-01-01T08:00:00.000Z",
			updatedAt: "2024-01-01T08:00:00.000Z",
		})

		expect(result.success).toBe(true)
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
