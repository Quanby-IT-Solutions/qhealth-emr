import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	AppointmentListResponseSchema,
	CancelAppointmentInputSchema,
	CreateAppointmentInputSchema,
	CreateEncounterInputSchema,
	CreatePrescriptionInputSchema,
	EndLiveKitSessionInputSchema,
	EPrescriptionSchema,
	GenerateAbstractInputSchema,
	GetAbstractInputSchema,
	GetAppointmentInputSchema,
	GetEncounterInputSchema,
	GetPrescriptionInputSchema,
	JoinLiveKitRoomInputSchema,
	JoinPatientLiveKitRoomInputSchema,
	ListAppointmentsInputSchema,
	ListEncounterAbstractsInputSchema,
	ListPrescriptionsInputSchema,
	LiveKitSessionEndResponseSchema,
	LiveKitTokenResponseSchema,
	PatientInviteActionInputSchema,
	PatientInvitePreviewSchema,
	PatientInviteResponseSchema,
	PatientInviteStatusResponseSchema,
	PatientInviteTokenInputSchema,
	SendAbstractInputSchema,
	SendPrescriptionInputSchema,
	SignAbstractInputSchema,
	SignPrescriptionInputSchema,
	TeleAbstractSchema,
	TelemedicineAppointmentSchema,
	TelemedicineEncounterSchema,
	UpdateAppointmentInputSchema,
} from "./telemedicine.schema.js"

export const telemedicineContract = {
	// Appointments

	listAppointments: oc
		.route({
			method: "GET",
			path: "/appointments",
			summary: "List telemedicine appointments for a facility",
			tags: ["Telemedicine"],
		})
		.input(ListAppointmentsInputSchema)
		.output(AppointmentListResponseSchema),

	getAppointment: oc
		.route({
			method: "GET",
			path: "/appointments/{id}",
			summary: "Get a telemedicine appointment by ID",
			tags: ["Telemedicine"],
		})
		.input(GetAppointmentInputSchema)
		.output(TelemedicineAppointmentSchema),

	createAppointment: oc
		.route({
			method: "POST",
			path: "/appointments",
			summary: "Create a telemedicine appointment",
			tags: ["Telemedicine"],
		})
		.input(CreateAppointmentInputSchema)
		.output(TelemedicineAppointmentSchema),

	updateAppointment: oc
		.route({
			method: "PATCH",
			path: "/appointments/{id}",
			summary: "Update a telemedicine appointment",
			tags: ["Telemedicine"],
		})
		.input(UpdateAppointmentInputSchema)
		.output(TelemedicineAppointmentSchema),

	cancelAppointment: oc
		.route({
			method: "POST",
			path: "/appointments/{id}/cancel",
			summary: "Cancel a telemedicine appointment",
			tags: ["Telemedicine"],
		})
		.input(CancelAppointmentInputSchema)
		.output(z.void()),

	joinLiveKitRoom: oc
		.route({
			method: "POST",
			path: "/appointments/{id}/livekit-token",
			summary: "Get a LiveKit access token for a telemedicine appointment",
			tags: ["Telemedicine"],
		})
		.input(JoinLiveKitRoomInputSchema)
		.output(LiveKitTokenResponseSchema),

	endLiveKitSession: oc
		.route({
			method: "POST",
			path: "/appointments/{id}/livekit-session/end",
			summary: "Mark a LiveKit session as ended for a telemedicine appointment",
			tags: ["Telemedicine"],
		})
		.input(EndLiveKitSessionInputSchema)
		.output(LiveKitSessionEndResponseSchema),

	regeneratePatientInvite: oc
		.route({
			method: "POST",
			path: "/appointments/{id}/patient-invite/regenerate",
			summary: "Regenerate the patient LiveKit invite for a telemedicine appointment",
			tags: ["Telemedicine"],
		})
		.input(PatientInviteActionInputSchema)
		.output(PatientInviteResponseSchema),

	revokePatientInvite: oc
		.route({
			method: "POST",
			path: "/appointments/{id}/patient-invite/revoke",
			summary: "Revoke the patient LiveKit invite for a telemedicine appointment",
			tags: ["Telemedicine"],
		})
		.input(PatientInviteActionInputSchema)
		.output(PatientInviteStatusResponseSchema),

	getPatientInvitePreview: oc
		.route({
			method: "GET",
			path: "/patient-invites/{token}",
			summary: "Get public appointment preview for a patient LiveKit invite",
			tags: ["Telemedicine"],
		})
		.input(PatientInviteTokenInputSchema)
		.output(PatientInvitePreviewSchema),

	joinPatientLiveKitRoom: oc
		.route({
			method: "POST",
			path: "/patient-invites/{token}/livekit-token",
			summary: "Get a patient LiveKit access token for a telemedicine invite",
			tags: ["Telemedicine"],
		})
		.input(JoinPatientLiveKitRoomInputSchema)
		.output(LiveKitTokenResponseSchema),

	// Encounters

	getEncounter: oc
		.route({
			method: "GET",
			path: "/encounters/{id}",
			summary: "Get a telemedicine encounter by ID",
			tags: ["Telemedicine"],
		})
		.input(GetEncounterInputSchema)
		.output(TelemedicineEncounterSchema),

	createEncounter: oc
		.route({
			method: "POST",
			path: "/encounters",
			summary: "Create a telemedicine encounter",
			tags: ["Telemedicine"],
		})
		.input(CreateEncounterInputSchema)
		.output(TelemedicineEncounterSchema),

	// Prescriptions

	getPrescription: oc
		.route({
			method: "GET",
			path: "/prescriptions/{id}",
			summary: "Get a telemedicine prescription by ID",
			tags: ["Telemedicine"],
		})
		.input(GetPrescriptionInputSchema)
		.output(EPrescriptionSchema),

	listPrescriptions: oc
		.route({
			method: "GET",
			path: "/prescriptions",
			summary: "List prescriptions for a telemedicine encounter",
			tags: ["Telemedicine"],
		})
		.input(ListPrescriptionsInputSchema)
		.output(z.array(EPrescriptionSchema)),

	createPrescription: oc
		.route({
			method: "POST",
			path: "/prescriptions",
			summary: "Create a telemedicine e-prescription",
			tags: ["Telemedicine"],
		})
		.input(CreatePrescriptionInputSchema)
		.output(EPrescriptionSchema),

	// Prescription Actions

	signPrescription: oc
		.route({
			method: "POST",
			path: "/prescriptions/{id}/sign",
			summary: "Sign a telemedicine e-prescription",
			tags: ["Telemedicine"],
		})
		.input(SignPrescriptionInputSchema)
		.output(EPrescriptionSchema),

	sendPrescription: oc
		.route({
			method: "POST",
			path: "/prescriptions/{id}/send",
			summary: "Send a telemedicine e-prescription",
			tags: ["Telemedicine"],
		})
		.input(SendPrescriptionInputSchema)
		.output(EPrescriptionSchema),

	// Abstracts

	generateAbstract: oc
		.route({
			method: "POST",
			path: "/abstracts",
			summary: "Generate tele-encounter abstract from encounter data",
			tags: ["Telemedicine"],
		})
		.input(GenerateAbstractInputSchema)
		.output(TeleAbstractSchema),

	getAbstract: oc
		.route({
			method: "GET",
			path: "/abstracts/{id}",
			summary: "Get a tele-encounter abstract by ID",
			tags: ["Telemedicine"],
		})
		.input(GetAbstractInputSchema)
		.output(TeleAbstractSchema),

	listEncounterAbstracts: oc
		.route({
			method: "GET",
			path: "/abstracts",
			summary: "List abstracts for a telemedicine encounter",
			tags: ["Telemedicine"],
		})
		.input(ListEncounterAbstractsInputSchema)
		.output(z.array(TeleAbstractSchema)),

	signAbstract: oc
		.route({
			method: "POST",
			path: "/abstracts/{id}/sign",
			summary: "Sign a tele-encounter abstract",
			tags: ["Telemedicine"],
		})
		.input(SignAbstractInputSchema)
		.output(TeleAbstractSchema),

	sendAbstract: oc
		.route({
			method: "POST",
			path: "/abstracts/{id}/send",
			summary: "Send abstract to patient via email",
			tags: ["Telemedicine"],
		})
		.input(SendAbstractInputSchema)
		.output(TeleAbstractSchema),
}
