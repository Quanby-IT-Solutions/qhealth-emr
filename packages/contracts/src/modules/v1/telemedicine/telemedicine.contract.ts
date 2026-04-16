import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	AppointmentListResponseSchema,
	CancelAppointmentInputSchema,
	CreateAppointmentInputSchema,
	CreateEncounterInputSchema,
	CreatePrescriptionInputSchema,
	EPrescriptionSchema,
	GetAppointmentInputSchema,
	GetEncounterInputSchema,
	GetPrescriptionInputSchema,
	ListAppointmentsInputSchema,
	ListPrescriptionsInputSchema,
	TelemedicineAppointmentSchema,
	TelemedicineEncounterSchema,
} from "./telemedicine.schema.js"

export const telemedicineContract = {
	// ─── Appointments ──────────────────────────────────────────────────────────

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

	cancelAppointment: oc
		.route({
			method: "POST",
			path: "/appointments/{id}/cancel",
			summary: "Cancel a telemedicine appointment",
			tags: ["Telemedicine"],
		})
		.input(CancelAppointmentInputSchema)
		.output(z.void()),

	// ─── Encounters ────────────────────────────────────────────────────────────

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

	// ─── Prescriptions ─────────────────────────────────────────────────────────

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
}
