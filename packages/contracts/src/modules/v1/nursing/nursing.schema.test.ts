import { describe, expect, it } from "vitest"

import {
	CompleteFaceScanPhoneSessionSchema,
	CreateFaceScanPhoneSessionSchema,
	CreateFaceScanPhoneTokenSchema,
	CreateVitalSignSchema,
	FaceScanPhoneSessionPreviewSchema,
	FaceScanPhoneSessionResponseSchema,
	FaceScanPhoneSessionStatusEnum,
	VitalSignSchema,
} from "./nursing.schema.js"

const ID = "550e8400-e29b-41d4-a716-446655440000"
const TOKEN = "a".repeat(43)

describe("nursing vital sign schemas", () => {
	it("defaults NEWS2-specific create fields", () => {
		const parsed = CreateVitalSignSchema.parse({
			facilityId: ID,
			encounterId: "550e8400-e29b-41d4-a716-446655440001",
			spo2: "98",
		})

		expect(parsed.spo2Scale).toBe("scale1")
		expect(parsed.oxygenTherapy).toBe(false)
		expect(parsed.consciousnessLevel).toBe("A")
	})

	it("accepts persisted NEWS2 oxygen and ACVPU fields", () => {
		expect(
			VitalSignSchema.safeParse({
				id: ID,
				facilityId: ID,
				encounterId: "550e8400-e29b-41d4-a716-446655440001",
				preEncounterId: null,
				temperature: "36.5",
				bpSystolic: 120,
				bpDiastolic: 80,
				heartRate: 72,
				respiratoryRate: 16,
				spo2: "93",
				spo2Scale: "scale2",
				oxygenTherapy: true,
				oxygenDeliveryDevice: "Nasal cannula",
				oxygenFlowRate: "2.5",
				weight: "70.0",
				height: "170.0",
				consciousnessLevel: "C",
				newsScore: 5,
				newsRiskLevel: "medium",
				recordedByStaffId: "550e8400-e29b-41d4-a716-446655440002",
				recordedAt: "2026-06-29T08:00:00.000Z",
				createdAt: "2026-06-29T08:00:00.000Z",
			}).success
		).toBe(true)
	})
})

describe("nursing face scan phone session schemas", () => {
	it("accepts staff-created phone sessions with optional clinical context", () => {
		expect(
			CreateFaceScanPhoneSessionSchema.safeParse({
				facilityId: ID,
				encounterId: "550e8400-e29b-41d4-a716-446655440001",
				patientId: "550e8400-e29b-41d4-a716-446655440002",
				age: "42",
				gender: "female",
				smoking: false,
			}).success
		).toBe(true)
	})

	it("validates public token creation and completion payloads", () => {
		expect(
			CreateFaceScanPhoneTokenSchema.safeParse({
				token: TOKEN,
				clientId: ID,
				age: "42",
				gender: "female",
				smoking: true,
				heightCm: "170.5",
				weightKg: "68.2",
			}).success
		).toBe(true)

		expect(
			CompleteFaceScanPhoneSessionSchema.safeParse({
				token: TOKEN,
				vitals: {
					bpSystolic: 120,
					bpDiastolic: 80,
					heartRate: 72,
					respiratoryRate: 16,
					spo2: 98,
					heightCm: 170.5,
					weightKg: 68.2,
				},
			}).success
		).toBe(true)
	})

	it("documents the session status states and response shape", () => {
		expect(FaceScanPhoneSessionStatusEnum.options).toEqual(["pending", "complete", "expired"])
		expect(
			FaceScanPhoneSessionResponseSchema.safeParse({
				id: ID,
				token: TOKEN,
				status: "complete",
				expiresAt: "2026-06-29T08:00:00.000Z",
				completedAt: "2026-06-29T07:55:00.000Z",
				vitals: {
					bpSystolic: 120,
					bpDiastolic: 80,
					heartRate: 72,
					respiratoryRate: 16,
					spo2: 98,
				},
			}).success
		).toBe(true)
		expect(
			FaceScanPhoneSessionPreviewSchema.safeParse({
				enabled: true,
				status: "pending",
				expiresAt: "2026-06-29T08:00:00.000Z",
				requiresAge: false,
				requiresGender: false,
				requiresSmoking: true,
			}).success
		).toBe(true)
	})

	it("rejects invalid public tokens and out-of-range setup measurements", () => {
		expect(CreateFaceScanPhoneTokenSchema.safeParse({ token: "short", clientId: ID }).success).toBe(
			false
		)
		expect(
			CreateFaceScanPhoneTokenSchema.safeParse({
				token: TOKEN,
				clientId: ID,
				heightCm: 30,
				weightKg: 600,
			}).success
		).toBe(false)
	})
})
