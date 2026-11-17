import { describe, expect, it } from "vitest"

import {
	CreateAppointmentInputSchema,
	CreateEncounterInputSchema,
	EndLiveKitSessionInputSchema,
	EPrescriptionSchema,
	JoinLiveKitRoomInputSchema,
	JoinPatientLiveKitRoomInputSchema,
	LiveKitSessionEndResponseSchema,
	LiveKitTokenResponseSchema,
	PatientInviteActionInputSchema,
	PatientInvitePreviewSchema,
	PatientInviteResponseSchema,
	SignPrescriptionInputSchema,
	UpdateAppointmentInputSchema,
} from "./telemedicine.schema.js"

const ID = "550e8400-e29b-41d4-a716-446655440000"

describe("telemedicine appointment schema", () => {
	it("defaults new appointments to LiveKit during appointment creation", () => {
		expect(
			CreateAppointmentInputSchema.safeParse({
				facilityId: ID,
				patientId: "550e8400-e29b-41d4-a716-446655440001",
				clinicianId: "550e8400-e29b-41d4-a716-446655440002",
				scheduledDate: "2026-05-19",
				scheduledTime: "10:00",
				durationMinutes: 30,
			}).success
		).toBe(true)
	})

	it("rejects non-LiveKit platforms for new appointments", () => {
		expect(
			CreateAppointmentInputSchema.safeParse({
				facilityId: ID,
				patientId: "550e8400-e29b-41d4-a716-446655440001",
				clinicianId: "550e8400-e29b-41d4-a716-446655440002",
				scheduledDate: "2026-05-19",
				scheduledTime: "10:00",
				durationMinutes: 30,
				platform: "zoom",
			}).success
		).toBe(false)
	})

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

	it("validates LiveKit room join input and unconfigured response", () => {
		expect(JoinLiveKitRoomInputSchema.safeParse({ id: ID }).success).toBe(true)
		expect(LiveKitTokenResponseSchema.safeParse({ isConfigured: false }).success).toBe(true)
		expect(EndLiveKitSessionInputSchema.safeParse({ id: ID }).success).toBe(true)
		expect(
			LiveKitSessionEndResponseSchema.safeParse({
				appointmentId: ID,
				livekitSessionEndedAt: "2026-05-19T04:00:00.000Z",
			}).success
		).toBe(true)
	})

	it("validates configured LiveKit token responses", () => {
		expect(
			LiveKitTokenResponseSchema.safeParse({
				isConfigured: true,
				token: "token",
				wsUrl: "wss://livekit.example.test",
				roomName: `telemed-${ID}`,
			}).success
		).toBe(true)
	})

	it("validates patient invite responses and preview payloads", () => {
		expect(PatientInviteActionInputSchema.safeParse({ id: ID }).success).toBe(true)
		expect(
			PatientInviteResponseSchema.safeParse({
				appointmentId: ID,
				patientInviteToken: "a".repeat(43),
				patientInviteExpiresAt: "2026-05-19T04:00:00.000Z",
				patientInviteRevokedAt: null,
			}).success
		).toBe(true)
		expect(
			PatientInvitePreviewSchema.safeParse({
				isValid: true,
				isRevoked: false,
				isExpired: false,
				canJoinNow: true,
				appointmentStatus: "confirmed",
				scheduledDate: "2026-05-19",
				scheduledTime: "10:00:00",
				durationMinutes: 30,
				clinicianName: "Dr. Reyes",
				facilityName: "JuanMeds General Hospital",
				joinWindowStartsAt: "2026-05-19T01:30:00.000Z",
				joinWindowEndsAt: "2026-05-19T04:30:00.000Z",
			}).success
		).toBe(true)
	})

	it("requires DOB or MRN before a patient can request a LiveKit token", () => {
		expect(
			JoinPatientLiveKitRoomInputSchema.safeParse({
				token: "a".repeat(43),
				dateOfBirth: "1985-01-15",
			}).success
		).toBe(true)
		expect(
			JoinPatientLiveKitRoomInputSchema.safeParse({
				token: "a".repeat(43),
				mrn: "MRN-001",
			}).success
		).toBe(true)
		expect(JoinPatientLiveKitRoomInputSchema.safeParse({ token: "a".repeat(43) }).success).toBe(
			false
		)
	})
})

describe("telemedicine encounter schema", () => {
	it("accepts standalone encounters without a linked encounter", () => {
		expect(
			CreateEncounterInputSchema.safeParse({
				appointmentId: ID,
				encounterType: "standalone",
				chiefComplaint: "Cough",
				diagnosis: "Upper respiratory tract infection",
			}).success
		).toBe(true)
	})

	it("accepts linked encounters only when linkedEncounterId is present", () => {
		expect(
			CreateEncounterInputSchema.safeParse({
				appointmentId: ID,
				encounterType: "linked",
				linkedEncounterId: "550e8400-e29b-41d4-a716-446655440001",
				chiefComplaint: "Follow-up",
				diagnosis: "Improving",
			}).success
		).toBe(true)

		expect(
			CreateEncounterInputSchema.safeParse({
				appointmentId: ID,
				encounterType: "linked",
				chiefComplaint: "Follow-up",
				diagnosis: "Improving",
			}).success
		).toBe(false)
	})

	it("rejects standalone encounters with linkedEncounterId", () => {
		expect(
			CreateEncounterInputSchema.safeParse({
				appointmentId: ID,
				encounterType: "standalone",
				linkedEncounterId: "550e8400-e29b-41d4-a716-446655440001",
				chiefComplaint: "Cough",
				diagnosis: "Upper respiratory tract infection",
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
			facilityName: "JuanMeds General Hospital",
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
