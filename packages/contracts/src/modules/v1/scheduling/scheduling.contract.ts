import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	AppointmentDetailSchema,
	AppointmentListResponseSchema,
	AppointmentListSchema,
	AppointmentSchema,
	AvailableSlotsQuerySchema,
	AvailableSlotsResponseSchema,
	CheckInAppointmentSchema,
	CheckInResponseSchema,
	ClinicSlotSchema,
	ClinicQueueQuerySchema,
	ClinicQueueResponseSchema,
	ClinicTemplateListSchema,
	ClinicTemplateSchema,
	CreateAppointmentSchema,
	CreateClinicTemplateSchema,
	ListTemplateSlotsQuerySchema,
	UpdateAppointmentStatusSchema,
	UpdateClinicTemplateSchema,
	UpdateEncounterQueueStatusResponseSchema,
	UpdateEncounterQueueStatusSchema,
	UpdateSlotSchema,
} from "./scheduling.schema.js"

export const schedulingContract = {
	// ========================================================================
	// Clinic Templates
	// ========================================================================

	listClinicTemplates: oc
		.route({
			method: "GET",
			path: "/clinic-templates",
			summary: "List clinic templates for a facility",
			tags: ["Scheduling"],
		})
		.input(ClinicTemplateListSchema)
		.output(z.array(ClinicTemplateSchema)),

	createClinicTemplate: oc
		.route({
			method: "POST",
			path: "/clinic-templates",
			summary: "Create a new clinic template",
			tags: ["Scheduling"],
		})
		.input(CreateClinicTemplateSchema)
		.output(ClinicTemplateSchema),

	updateClinicTemplate: oc
		.route({
			method: "PUT",
			path: "/clinic-templates/{id}",
			summary: "Update a clinic template",
			tags: ["Scheduling"],
		})
		.input(UpdateClinicTemplateSchema)
		.output(ClinicTemplateSchema),

	listTemplateSlots: oc
		.route({
			method: "GET",
			path: "/clinic-templates/{id}/slots",
			summary: "List materialized slots for a clinic template",
			tags: ["Scheduling"],
		})
		.input(ListTemplateSlotsQuerySchema)
		.output(z.array(ClinicSlotSchema)),

	updateSlot: oc
		.route({
			method: "PATCH",
			path: "/slots/{id}",
			summary: "Block or unblock a materialized clinic slot",
			tags: ["Scheduling"],
		})
		.input(UpdateSlotSchema)
		.output(ClinicSlotSchema),

	// ========================================================================
	// Appointments
	// ========================================================================

	listAppointments: oc
		.route({
			method: "GET",
			path: "/appointments",
			summary: "List appointments with filtering and pagination",
			tags: ["Scheduling"],
		})
		.input(AppointmentListSchema)
		.output(AppointmentListResponseSchema),

	getAppointment: oc
		.route({
			method: "GET",
			path: "/appointments/{id}",
			summary: "Get appointment details by ID",
			tags: ["Scheduling"],
		})
		.input(z.object({ id: z.string().uuid() }))
		.output(AppointmentDetailSchema),

	createAppointment: oc
		.route({
			method: "POST",
			path: "/appointments",
			summary: "Book a new appointment",
			tags: ["Scheduling"],
		})
		.input(CreateAppointmentSchema)
		.output(AppointmentSchema),

	checkInAppointment: oc
		.route({
			method: "POST",
			path: "/appointments/{id}/check-in",
			summary: "Check in patient for appointment",
			tags: ["Scheduling"],
		})
		.input(CheckInAppointmentSchema)
		.output(CheckInResponseSchema),

	updateAppointmentStatus: oc
		.route({
			method: "PUT",
			path: "/appointments/{id}/status",
			summary: "Update appointment status (complete, cancel, no-show)",
			tags: ["Scheduling"],
		})
		.input(UpdateAppointmentStatusSchema)
		.output(AppointmentSchema),

	// ========================================================================
	// Availability & Queue
	// ========================================================================

	getAvailableSlots: oc
		.route({
			method: "GET",
			path: "/available-slots",
			summary: "Get available time slots for a clinician on a date",
			tags: ["Scheduling"],
		})
		.input(AvailableSlotsQuerySchema)
		.output(AvailableSlotsResponseSchema),

	getClinicQueue: oc
		.route({
			method: "GET",
			path: "/queue",
			summary: "Get clinic queue for a date with stats (appointments + walk-ins unified)",
			tags: ["Scheduling"],
		})
		.input(ClinicQueueQuerySchema)
		.output(ClinicQueueResponseSchema),

	// PS-003: Advance walk-in OPD encounter through the clinic queue
	updateEncounterQueueStatus: oc
		.route({
			method: "PUT",
			path: "/encounters/{id}/queue-status",
			summary: "Update walk-in OPD encounter queue status (waiting→in_progress→completed)",
			tags: ["Scheduling"],
		})
		.input(UpdateEncounterQueueStatusSchema)
		.output(UpdateEncounterQueueStatusResponseSchema),
}
