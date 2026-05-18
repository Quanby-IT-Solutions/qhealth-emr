import { describe, expect, it } from "vitest"

import {
	EPrescriptionSchema,
	SignPrescriptionInputSchema,
	UpdateAppointmentInputSchema,
} from "./telemedicine.schema.js"

const ID = "550e8400-e29b-41d4-a716-446655440000"

describe("telemedicine appointment schema", () => {
	it("requires manual video links to use HTTPS", () => {
		expect(
			UpdateAppointmentInputSchema.safeParse({
				id: ID,
				videoLink: "https://teams.microsoft.com/l/meetup-join/example",
			}).success
		).toBe(true)

		expect(
			UpdateAppointmentInputSchema.safeParse({
				id: ID,
				videoLink: "http://example.com/meeting",
			}).success
		).toBe(false)
	})
})

describe("telemedicine e-prescription schema", () => {
	it("accepts signed prescriptions with PRC and PTR details", () => {
		const result = EPrescriptionSchema.safeParse({
			id: ID,
			encounterId: "550e8400-e29b-41d4-a716-446655440001",
			appointmentId: "550e8400-e29b-41d4-a716-446655440002",
			patientName: "Dela Cruz, Juan",
			patientMrn: "MRN-001",
			patientAge: 42,
			patientSex: "male",
			clinicianName: "Dr. Reyes",
			clinicianPrcNumber: "PRC-100001",
			clinicianPtrNumber: "PTR-100001",
			clinicianSignature: "Dr. Reyes",
			facilityName: "QHealth General Hospital",
			facilityAddress: "Manila",
			prescriptionDate: "2026-05-18",
			validUntil: "2026-06-17",
			status: "signed",
			medications: [
				{
					id: "550e8400-e29b-41d4-a716-446655440003",
					genericName: "Paracetamol",
					brandName: null,
					dosage: "500mg",
					form: "tablet",
					quantity: 10,
					unit: "tablet(s)",
					frequency: "Every 6 hours",
					duration: "3 days",
					route: "oral",
					instructions: null,
				},
			],
			dispensingInstructions: null,
			signedAt: "2026-05-18T08:00:00.000Z",
			signedByName: "Dr. Reyes",
			sentAt: null,
			sentToEmail: null,
			createdAt: "2026-05-18T07:55:00.000Z",
		})

		expect(result.success).toBe(true)
	})

	it("validates prescription signing input", () => {
		expect(SignPrescriptionInputSchema.safeParse({ id: ID }).success).toBe(true)
	})
})
