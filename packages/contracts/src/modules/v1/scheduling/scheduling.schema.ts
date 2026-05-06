import { z } from "zod"

// ============================================================================
// Helpers
// ============================================================================

const dateOrString = z
	.union([z.date(), z.string()])
	.transform(v => (typeof v === "string" ? new Date(v) : v))

const PaginationInputSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(25),
})

const PaginatedResponseSchema = z.object({
	total: z.number(),
	page: z.number(),
	limit: z.number(),
	totalPages: z.number(),
})

// ============================================================================
// Enums
// ============================================================================

export const AppointmentStatusEnum = z.enum([
	"booked",
	"checked_in",
	"in_progress",
	"completed",
	"cancelled",
	"no_show",
])

export const AppointmentEncounterTypeEnum = z.enum(["outpatient", "telemedicine"])
export const ClinicSlotStatusEnum = z.enum(["open", "blocked", "booked", "cancelled"])

// ============================================================================
// Clinic Template Schema
// ============================================================================

export const ClinicTemplateSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	clinicianStaffId: z.string().uuid(),
	clinicName: z.string(),
	dayOfWeek: z.number().int().min(0).max(6), // 0 = Sunday, 6 = Saturday
	startTime: z.string(), // HH:mm format
	endTime: z.string(),
	maxPatients: z.number().int().positive(),
	slotDurationMinutes: z.number().int().positive(),
	isActive: z.boolean(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type ClinicTemplate = z.infer<typeof ClinicTemplateSchema>

// ============================================================================
// Appointment Schema
// ============================================================================

export const AppointmentSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	clinicTemplateId: z.string().uuid().nullable(),
	clinicSlotId: z.string().uuid().nullable(),
	patientId: z.string().uuid(),
	clinicianStaffId: z.string().uuid(),
	appointmentDate: z.string(), // YYYY-MM-DD format
	appointmentTime: z.string(), // HH:mm format
	queueNumber: z.number().int().nullable(),
	status: AppointmentStatusEnum,
	checkedInAt: dateOrString.nullable(),
	encounterType: AppointmentEncounterTypeEnum,
	chiefComplaint: z.string().nullable(),
	notes: z.string().nullable(),
	bookedByStaffId: z.string().uuid().nullable(),
	cancelledAt: dateOrString.nullable(),
	cancellationReason: z.string().nullable(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type Appointment = z.infer<typeof AppointmentSchema>

// ============================================================================
// Clinic Slot Schema
// ============================================================================

export const ClinicSlotSchema = z.object({
	id: z.string().uuid(),
	clinicTemplateId: z.string().uuid(),
	facilityId: z.string().uuid(),
	clinicianStaffId: z.string().uuid(),
	slotDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	slotStartTime: z.string().regex(/^\d{2}:\d{2}$/),
	slotEndTime: z.string().regex(/^\d{2}:\d{2}$/),
	status: ClinicSlotStatusEnum,
	blockReason: z.string().nullable(),
	appointmentId: z.string().uuid().nullable(),
	blockedByStaffId: z.string().uuid().nullable(),
	blockedAt: dateOrString.nullable(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type ClinicSlot = z.infer<typeof ClinicSlotSchema>

// ============================================================================
// Appointment with Patient & Clinician info (for listing)
// ============================================================================

export const AppointmentDetailSchema = AppointmentSchema.extend({
	patientName: z.string().optional(),
	patientMrn: z.string().optional(),
	patientDateOfBirth: dateOrString.optional(),
	patientSex: z.string().optional(),
	clinicianName: z.string().optional(),
})

export type AppointmentDetail = z.infer<typeof AppointmentDetailSchema>

// ============================================================================
// List Clinic Templates
// ============================================================================

export const ClinicTemplateListSchema = z.object({
	facilityId: z.string().uuid().optional(),
	clinicianStaffId: z.string().uuid().optional(),
	dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
	isActive: z.coerce.boolean().optional(),
	page: z.coerce.number().int().positive().default(1).optional(),
	limit: z.coerce.number().int().positive().max(100).default(25).optional(),
})

// ============================================================================
// Create Clinic Template
// ============================================================================

export const CreateClinicTemplateSchema = z.object({
	facilityId: z.string().uuid(),
	clinicianStaffId: z.string().uuid(),
	clinicName: z.string().min(1).max(255),
	dayOfWeek: z.number().int().min(0).max(6),
	startTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm format"),
	endTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm format"),
	maxPatients: z.number().int().positive().default(20),
	slotDurationMinutes: z.number().int().positive().default(15),
})

// ============================================================================
// Update Clinic Template
// ============================================================================

export const UpdateClinicTemplateSchema = z.object({
	id: z.string().uuid(),
	clinicName: z.string().min(1).max(255).optional(),
	startTime: z
		.string()
		.regex(/^\d{2}:\d{2}$/, "Must be HH:mm format")
		.optional(),
	endTime: z
		.string()
		.regex(/^\d{2}:\d{2}$/, "Must be HH:mm format")
		.optional(),
	maxPatients: z.number().int().positive().optional(),
	slotDurationMinutes: z.number().int().positive().optional(),
	isActive: z.boolean().optional(),
})

// ============================================================================
// List Appointments
// ============================================================================

export const AppointmentListSchema = PaginationInputSchema.extend({
	facilityId: z.string().uuid(),
	date: z.string().optional(), // YYYY-MM-DD filter
	clinicianStaffId: z.string().uuid().optional(),
	patientId: z.string().uuid().optional(),
	status: AppointmentStatusEnum.optional(),
})

export const AppointmentListResponseSchema = PaginatedResponseSchema.extend({
	items: z.array(
		AppointmentSchema.extend({
			patientName: z.string().optional(),
			patientMrn: z.string().optional(),
		})
	),
})

// ============================================================================
// Create Appointment
// ============================================================================

export const CreateAppointmentSchema = z.object({
	facilityId: z.string().uuid(),
	clinicTemplateId: z.string().uuid().optional(),
	patientId: z.string().uuid(),
	clinicianStaffId: z.string().uuid(),
	appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format"),
	appointmentTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm format"),
	encounterType: AppointmentEncounterTypeEnum.default("outpatient"),
	chiefComplaint: z.string().max(1000).optional(),
	notes: z.string().max(2000).optional(),
})

// ============================================================================
// Check In Appointment
// ============================================================================

export const CheckInAppointmentSchema = z.object({
	id: z.string().uuid(),
})

export const CheckInResponseSchema = z.object({
	appointment: AppointmentSchema,
	queueNumber: z.number().int(),
})

// ============================================================================
// Update Appointment Status
// ============================================================================

export const UpdateAppointmentStatusSchema = z.object({
	id: z.string().uuid(),
	status: AppointmentStatusEnum,
	cancellationReason: z.string().max(500).optional(),
})

// ============================================================================
// Get Available Slots
// ============================================================================

export const AvailableSlotsQuerySchema = z.object({
	facilityId: z.string().uuid().optional(),
	clinicianStaffId: z.string().uuid().optional(),
	clinicId: z.string().uuid().optional(),
	clinicianId: z.string().uuid().optional(),
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format"),
})

export const TimeSlotSchema = z.object({
	time: z.string(), // HH:mm
	available: z.boolean(),
})

export const AvailableSlotsResponseSchema = z.object({
	slots: z.array(TimeSlotSchema),
	clinicName: z.string().nullable(),
})

export const ListTemplateSlotsQuerySchema = z.object({
	id: z.string().uuid(),
	fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	status: ClinicSlotStatusEnum.optional(),
})

export const UpdateSlotSchema = z.object({
	id: z.string().uuid(),
	action: z.enum(["block", "unblock"]),
	reason: z.string().max(500).optional(),
})

// ============================================================================
// Clinic Queue
// ============================================================================

export const ClinicQueueQuerySchema = z.object({
	facilityId: z.string().uuid().optional(),
	clinicId: z.string().optional(),
	clinicianStaffId: z.string().uuid().optional(),
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format"),
})

// Unified queue status — maps appointment statuses + encounter walk-in statuses
export const QueueEntryStatusEnum = z.enum(["waiting", "in_progress", "completed"])

// A single entry in the unified clinic queue — can be either a booked appointment
// (checked in) or a walk-in OPD encounter (created from /patients/search).
export const UnifiedQueueEntrySchema = z.object({
	entryType: z.enum(["appointment", "walk_in"]),
	// `appointmentId` for appointment entries, `encounterId` for walk-in entries
	id: z.string().uuid(),
	appointmentId: z.string().uuid().nullable(),
	encounterId: z.string().uuid().nullable(),
	queueNumber: z.number().int().nullable(),
	// HH:mm — appointment scheduled time (null for walk-ins)
	slotTime: z.string().nullable(),
	checkInTime: z.string().nullable(),
	status: QueueEntryStatusEnum,
	patientId: z.string().uuid(),
	patientName: z.string().optional(),
	patientMrn: z.string().optional(),
	clinicianStaffId: z.string().uuid().nullable(),
	clinicianName: z.string().optional(),
})

export type UnifiedQueueEntry = z.infer<typeof UnifiedQueueEntrySchema>

export const ClinicQueueResponseSchema = z.object({
	entries: z.array(UnifiedQueueEntrySchema),
	clinicName: z.string().nullable(),
	stats: z.object({
		waiting: z.number(),
		inProgress: z.number(),
		completed: z.number(),
		total: z.number(),
	}),
})

// PS-003: Update walk-in encounter queue status
export const UpdateEncounterQueueStatusSchema = z.object({
	id: z.string().uuid(),
	status: z.enum(["in_progress", "completed"]),
})

export const UpdateEncounterQueueStatusResponseSchema = z.object({
	id: z.string().uuid(),
	queueStatus: z.enum(["waiting", "in_progress", "completed"]),
})

// ============================================================================
// Type Exports
// ============================================================================

export type AppointmentListInput = z.infer<typeof AppointmentListSchema>
export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>
export type CheckInAppointmentInput = z.infer<typeof CheckInAppointmentSchema>
export type UpdateAppointmentStatusInput = z.infer<typeof UpdateAppointmentStatusSchema>
export type AvailableSlotsQuery = z.infer<typeof AvailableSlotsQuerySchema>
export type ClinicQueueQuery = z.infer<typeof ClinicQueueQuerySchema>
export type ListTemplateSlotsQuery = z.infer<typeof ListTemplateSlotsQuerySchema>
export type UpdateSlotInput = z.infer<typeof UpdateSlotSchema>
export type UpdateEncounterQueueStatusInput = z.infer<typeof UpdateEncounterQueueStatusSchema>
