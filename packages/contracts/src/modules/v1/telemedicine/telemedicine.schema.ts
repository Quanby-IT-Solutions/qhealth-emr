import { z } from "zod"

// ============================================================================
// Helpers
// ============================================================================

const HttpsUrlSchema = z
	.string()
	.url()
	.refine(value => value.startsWith("https://"), "Video link must use HTTPS")

// ============================================================================
// Enums
// ============================================================================

export const TelemedicinePlatformEnum = z.enum(["zoom", "teams"])
export const AppointmentStatusEnum = z.enum([
	"scheduled",
	"confirmed",
	"in-progress",
	"completed",
	"cancelled",
	"no-show",
])
export const TeleEncounterTypeEnum = z.enum(["standalone", "linked"])
export const EncounterStatusEnum = z.enum(["open", "signed", "finalized"])
export const PrescriptionStatusEnum = z.enum([
	"draft",
	"active",
	"signed",
	"sent",
	"dispensed",
	"cancelled",
])

// ============================================================================
// Telemedicine Appointment
// ============================================================================

export const TelemedicineAppointmentSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	patientId: z.string().uuid(),
	patientName: z.string(),
	patientMrn: z.string(),
	patientContactNumber: z.string(),
	patientEmail: z.string().nullable(),
	clinicianId: z.string().uuid(),
	clinicianName: z.string(),
	clinicianSpecialty: z.string(),
	scheduledDate: z.string(),
	scheduledTime: z.string(),
	durationMinutes: z.number(),
	platform: TelemedicinePlatformEnum,
	status: AppointmentStatusEnum,
	videoLink: z.string().nullable(),
	meetingId: z.string().nullable(),
	meetingPassword: z.string().nullable(),
	notes: z.string().nullable(),
	encounterId: z.string().uuid().nullable(),
	createdAt: z.string(),
	createdByName: z.string(),
})

export type TelemedicineAppointment = z.infer<typeof TelemedicineAppointmentSchema>

// ============================================================================
// List Appointments
// ============================================================================

export const ListAppointmentsInputSchema = z.object({
	facilityId: z.string().uuid(),
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	status: AppointmentStatusEnum.optional(),
})

export type ListAppointmentsInput = z.infer<typeof ListAppointmentsInputSchema>

export const AppointmentListResponseSchema = z.object({
	data: z.array(TelemedicineAppointmentSchema),
	total: z.number(),
	page: z.number(),
	limit: z.number(),
})

// ============================================================================
// Get Appointment
// ============================================================================

export const GetAppointmentInputSchema = z.object({
	id: z.string().uuid(),
})

// ============================================================================
// Create Appointment
// ============================================================================

export const CreateAppointmentInputSchema = z.object({
	facilityId: z.string().uuid(),
	patientId: z.string().uuid(),
	clinicianId: z.string().uuid(),
	scheduledDate: z.string(),
	scheduledTime: z.string(),
	durationMinutes: z.number().int().positive().default(30),
	platform: TelemedicinePlatformEnum,
	videoLink: HttpsUrlSchema.optional(),
	meetingId: z.string().optional(),
	meetingPassword: z.string().optional(),
	notes: z.string().optional(),
})

export type CreateAppointmentInput = z.infer<typeof CreateAppointmentInputSchema>

// ============================================================================
// Update Appointment
// ============================================================================

export const UpdateAppointmentInputSchema = z.object({
	id: z.string().uuid(),
	videoLink: HttpsUrlSchema.nullable().optional(),
	meetingId: z.string().nullable().optional(),
	meetingPassword: z.string().nullable().optional(),
})

export type UpdateAppointmentInput = z.infer<typeof UpdateAppointmentInputSchema>

// ============================================================================
// Cancel Appointment
// ============================================================================

export const CancelAppointmentInputSchema = z.object({
	id: z.string().uuid(),
	cancellationReason: z.string().optional(),
})

// ============================================================================
// Vital Signs
// ============================================================================

export const VitalSignsSchema = z.object({
	bloodPressure: z.string().optional(),
	heartRate: z.string().optional(),
	temperature: z.string().optional(),
	oxygenSaturation: z.string().optional(),
	weight: z.string().optional(),
})

// ============================================================================
// Telemedicine Encounter
// ============================================================================

export const TelemedicineEncounterSchema = z.object({
	id: z.string().uuid(),
	appointmentId: z.string().uuid(),
	encounterType: TeleEncounterTypeEnum,
	linkedEncounterId: z.string().uuid().nullable(),
	linkedEncounterNumber: z.string().nullable(),
	patientId: z.string().uuid(),
	patientName: z.string(),
	clinicianId: z.string().uuid(),
	clinicianName: z.string(),
	chiefComplaint: z.string(),
	subjectiveNotes: z.string(),
	objectiveNotes: z.string(),
	assessmentNotes: z.string(),
	planNotes: z.string(),
	diagnosis: z.string(),
	icdCode: z.string().nullable(),
	vitalSigns: VitalSignsSchema,
	status: EncounterStatusEnum,
	createdAt: z.string(),
	signedAt: z.string().nullable(),
	signedByName: z.string().nullable(),
})

export type TelemedicineEncounter = z.infer<typeof TelemedicineEncounterSchema>

// ============================================================================
// Get Encounter
// ============================================================================

export const GetEncounterInputSchema = z.object({
	id: z.string().uuid(),
})

// ============================================================================
// Create Encounter
// ============================================================================

export const CreateEncounterInputSchema = z.object({
	appointmentId: z.string().uuid(),
	encounterType: TeleEncounterTypeEnum.default("standalone"),
	linkedEncounterId: z.string().uuid().optional(),
	chiefComplaint: z.string().min(1),
	subjectiveNotes: z.string().default(""),
	objectiveNotes: z.string().default(""),
	assessmentNotes: z.string().default(""),
	planNotes: z.string().default(""),
	diagnosis: z.string().default(""),
	icdCode: z.string().optional(),
	vitalSigns: VitalSignsSchema.optional(),
})

export type CreateEncounterInput = z.infer<typeof CreateEncounterInputSchema>

// ============================================================================
// E-Prescription Item
// ============================================================================

export const EPrescriptionItemSchema = z.object({
	id: z.string().uuid(),
	genericName: z.string(),
	brandName: z.string().nullable(),
	dosage: z.string(),
	form: z.string(),
	quantity: z.number(),
	unit: z.string(),
	frequency: z.string(),
	duration: z.string(),
	route: z.string(),
	instructions: z.string().nullable(),
})

export type EPrescriptionItem = z.infer<typeof EPrescriptionItemSchema>

export const CreateEPrescriptionItemSchema = z.object({
	genericName: z.string().min(1),
	brandName: z.string().optional(),
	dosage: z.string().min(1),
	form: z.string().min(1),
	quantity: z.number().int().positive(),
	unit: z.string().min(1),
	frequency: z.string().min(1),
	duration: z.string().min(1),
	route: z.string().min(1),
	instructions: z.string().optional(),
})

// ============================================================================
// E-Prescription
// ============================================================================

export const EPrescriptionSchema = z.object({
	id: z.string().uuid(),
	encounterId: z.string().uuid(),
	appointmentId: z.string().uuid(),
	patientName: z.string(),
	patientMrn: z.string(),
	patientAge: z.number(),
	patientSex: z.string(),
	clinicianName: z.string(),
	clinicianPrcNumber: z.string(),
	clinicianPtrNumber: z.string(),
	clinicianSignature: z.string().nullable(),
	facilityName: z.string(),
	facilityAddress: z.string(),
	prescriptionDate: z.string(),
	validUntil: z.string(),
	status: PrescriptionStatusEnum,
	medications: z.array(EPrescriptionItemSchema),
	dispensingInstructions: z.string().nullable(),
	signedAt: z.string().nullable(),
	signedByName: z.string().nullable(),
	sentAt: z.string().nullable(),
	sentToEmail: z.string().nullable(),
	createdAt: z.string(),
})

export type EPrescription = z.infer<typeof EPrescriptionSchema>

// ============================================================================
// Get Prescription
// ============================================================================

export const GetPrescriptionInputSchema = z.object({
	id: z.string().uuid(),
})

// ============================================================================
// List Prescriptions by Encounter
// ============================================================================

export const ListPrescriptionsInputSchema = z.object({
	encounterId: z.string().uuid(),
})

// ============================================================================
// Create Prescription
// ============================================================================

export const CreatePrescriptionInputSchema = z.object({
	encounterId: z.string().uuid(),
	medications: z.array(CreateEPrescriptionItemSchema).min(1),
	dispensingInstructions: z.string().optional(),
})

export type CreatePrescriptionInput = z.infer<typeof CreatePrescriptionInputSchema>

export const SignPrescriptionInputSchema = z.object({
	id: z.string().uuid(),
})

// ============================================================================
// Tele-Abstract
// ============================================================================

export const AbstractStatusEnum = z.enum(["draft", "signed", "sent"])

export const TeleAbstractSchema = z.object({
	id: z.string().uuid(),
	encounterId: z.string().uuid(),
	appointmentId: z.string().uuid(),
	patientName: z.string(),
	clinicianName: z.string(),
	clinicianPrcNumber: z.string(),
	facilityName: z.string(),
	chiefComplaint: z.string(),
	subjectiveNotes: z.string(),
	objectiveNotes: z.string(),
	assessmentNotes: z.string(),
	planNotes: z.string(),
	diagnosis: z.string(),
	icdCode: z.string().nullable(),
	additionalNotes: z.string().nullable(),
	status: AbstractStatusEnum,
	signedAt: z.string().nullable(),
	signedByName: z.string().nullable(),
	sentAt: z.string().nullable(),
	sentToEmail: z.string().nullable(),
	createdAt: z.string(),
})

export type TeleAbstract = z.infer<typeof TeleAbstractSchema>

export const GenerateAbstractInputSchema = z.object({
	encounterId: z.string().uuid(),
	additionalNotes: z.string().optional(),
})

export type GenerateAbstractInput = z.infer<typeof GenerateAbstractInputSchema>

export const GetAbstractInputSchema = z.object({
	id: z.string().uuid(),
})

export const ListEncounterAbstractsInputSchema = z.object({
	encounterId: z.string().uuid(),
})

export const SignAbstractInputSchema = z.object({
	id: z.string().uuid(),
})

export const SendAbstractInputSchema = z.object({
	id: z.string().uuid(),
	email: z.string().email(),
})

export const SendPrescriptionInputSchema = z.object({
	id: z.string().uuid(),
	email: z.string().email(),
})
