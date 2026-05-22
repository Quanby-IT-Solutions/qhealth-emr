import { z } from "zod"

const dateOrString = z
	.union([z.date(), z.string()])
	.transform(v => (typeof v === "string" ? new Date(v) : v))

// ============================================================================
// OPD Triage Intake — full resource
// ============================================================================

export const OpdTriageIntakeSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	// Nullable: pre-registration triage has no patient yet
	patientId: z.string().uuid().nullable(),
	arrivalTime: dateOrString,
	chiefComplaint: z.string(),
	systolicBp: z.number().int().nullable(),
	diastolicBp: z.number().int().nullable(),
	temperatureCelsius: z.number().nullable(),
	heartRateBpm: z.number().int().nullable(),
	respiratoryRate: z.number().int().nullable(),
	oxygenSatPct: z.number().nullable(),
	heightCm: z.number().positive().nullable(),
	weightKg: z.number().positive().nullable(),
	triageNurseStaffId: z.string().uuid().nullable(),
	clinicianStaffId: z.string().uuid().nullable(),
	status: z.enum(["pending_registration", "registered"]),
	encounterId: z.string().uuid().nullable(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type OpdTriageIntake = z.infer<typeof OpdTriageIntakeSchema>

// ============================================================================
// Create OPD Triage Intake
// ============================================================================

export const CreateOpdTriageIntakeSchema = z.object({
	facilityId: z.string().uuid(),
	// Optional: omit for pre-registration (walk-in) triage; provide for registered patients
	patientId: z.string().uuid().optional(),
	chiefComplaint: z.string().min(1, "Chief complaint is required").max(2000),
	systolicBp: z.number().int().positive().optional(),
	diastolicBp: z.number().int().positive().optional(),
	temperatureCelsius: z.number().min(30).max(45).optional(),
	heartRateBpm: z.number().int().positive().optional(),
	respiratoryRate: z.number().int().positive().optional(),
	oxygenSatPct: z.number().min(0).max(100).optional(),
	heightCm: z.number().positive().optional(),
	weightKg: z.number().positive().optional(),
	triageNurseStaffId: z.string().uuid().optional(),
	clinicianStaffId: z.string().uuid().optional(),
})

export type CreateOpdTriageIntakeInput = z.infer<typeof CreateOpdTriageIntakeSchema>

// ============================================================================
// Get by ID
// ============================================================================

export const OpdTriageIntakeIdSchema = z.object({
	id: z.string().uuid(),
})

export type OpdTriageIntakeIdInput = z.infer<typeof OpdTriageIntakeIdSchema>

// ============================================================================
// List pending triage intakes (for registrar queue view)
// ============================================================================

export const ListPendingTriageSchema = z.object({
	facilityId: z.string().uuid(),
	patientId: z.string().uuid().optional(),
	clinicianStaffId: z.string().uuid().optional(),
	status: z.enum(["pending_registration", "registered"]).optional(),
})

export const OpdTriageIntakeWithPatientSchema = OpdTriageIntakeSchema.extend({
	// Nullable for pre-registration intakes that have no patient yet
	patientFirstName: z.string().nullable(),
	patientLastName: z.string().nullable(),
	patientMrn: z.string().nullable(),
	patientName: z.string().nullable(),
	triageNurseName: z.string().nullable(),
	clinicianName: z.string().nullable(),
})

export type OpdTriageIntakeWithPatient = z.infer<typeof OpdTriageIntakeWithPatientSchema>

// ============================================================================
// Link pre-registration triage intake to a patient (registrar reconciliation)
// ============================================================================

export const LinkOpdTriageToPatientSchema = z.object({
	id: z.string().uuid(),
	patientId: z.string().uuid(),
})

export type LinkOpdTriageToPatientInput = z.infer<typeof LinkOpdTriageToPatientSchema>

// ============================================================================
// OPD Tele-Triage Intake — full resource
// ============================================================================

export const OpdTeleTriageChannelEnum = z.enum(["phone", "video"])
export const OpdTeleTriageCallerRelationshipEnum = z.enum(["self", "family", "caregiver", "other"])
export const OpdTeleTriageAcuityEnum = z.enum(["urgent", "routine", "scheduled"])
export const OpdTeleTriageStatusEnum = z.enum([
	"pending_arrival",
	"arrived",
	"cancelled",
	"no_show",
])

export const OpdTeleTriageIntakeSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	callerName: z.string(),
	callerRelationship: OpdTeleTriageCallerRelationshipEnum.nullable(),
	patientId: z.string().uuid().nullable(),
	patientLocation: z.string(),
	channelType: OpdTeleTriageChannelEnum,
	videoLink: z.string().nullable(),
	videoSessionId: z.string().nullable(),
	livekitSessionStartedAt: dateOrString.nullable(),
	livekitSessionEndedAt: dateOrString.nullable(),
	scheduledArrivalTime: dateOrString.nullable(),
	etaMinutes: z.number().int().nullable(),
	etaAt: dateOrString.nullable(),
	chiefComplaint: z.string(),
	assessmentNotes: z.string(),
	provisionalAcuity: OpdTeleTriageAcuityEnum,
	systolicBp: z.number().int().nullable(),
	diastolicBp: z.number().int().nullable(),
	temperatureCelsius: z.number().nullable(),
	heartRateBpm: z.number().int().nullable(),
	respiratoryRate: z.number().int().nullable(),
	oxygenSatPct: z.number().nullable(),
	status: OpdTeleTriageStatusEnum,
	arrivedAt: dateOrString.nullable(),
	linkedTriageIntakeId: z.string().uuid().nullable(),
	triageStaffId: z.string().uuid(),
	cancelReason: z.string().nullable(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type OpdTeleTriageIntake = z.infer<typeof OpdTeleTriageIntakeSchema>

export const CreateOpdTeleTriageIntakeSchema = z
	.object({
		facilityId: z.string().uuid(),
		callerName: z.string().min(1).max(500),
		callerRelationship: OpdTeleTriageCallerRelationshipEnum.optional(),
		patientId: z.string().uuid().optional(),
		patientLocation: z.string().min(1).max(1000),
		channelType: OpdTeleTriageChannelEnum,
		videoLink: z.string().url().optional(),
		videoSessionId: z.string().max(500).optional(),
		scheduledArrivalTime: dateOrString.optional(),
		etaMinutes: z.number().int().min(0).max(480).optional(),
		chiefComplaint: z.string().min(1, "Chief complaint is required").max(2000),
		assessmentNotes: z.string().max(5000).optional(),
		provisionalAcuity: OpdTeleTriageAcuityEnum,
		systolicBp: z.number().int().positive().optional(),
		diastolicBp: z.number().int().positive().optional(),
		temperatureCelsius: z.number().min(30).max(45).optional(),
		heartRateBpm: z.number().int().positive().optional(),
		respiratoryRate: z.number().int().positive().optional(),
		oxygenSatPct: z.number().min(0).max(100).optional(),
		triageStaffId: z.string().uuid(),
	})
	.refine(input => input.etaMinutes !== undefined || input.scheduledArrivalTime !== undefined, {
		message: "Provide either ETA minutes or scheduled arrival time",
		path: ["etaMinutes"],
	})

export type CreateOpdTeleTriageIntakeInput = z.infer<typeof CreateOpdTeleTriageIntakeSchema>

export const ListOpdTeleTriageIntakesSchema = z.object({
	facilityId: z.string().uuid(),
	status: OpdTeleTriageStatusEnum.optional(),
})

export type ListOpdTeleTriageIntakesInput = z.infer<typeof ListOpdTeleTriageIntakesSchema>

export const OpdTeleTriageIntakeIdSchema = z.object({
	id: z.string().uuid(),
})

export type OpdTeleTriageIntakeIdInput = z.infer<typeof OpdTeleTriageIntakeIdSchema>

export const CancelOpdTeleTriageIntakeSchema = OpdTeleTriageIntakeIdSchema.extend({
	reason: z.string().max(1000).optional(),
	status: z.enum(["cancelled", "no_show"]).default("cancelled"),
})

export type CancelOpdTeleTriageIntakeInput = z.infer<typeof CancelOpdTeleTriageIntakeSchema>

export const MarkOpdTeleTriageArrivedResultSchema = z.object({
	id: z.string().uuid(),
	triageIntakeId: z.string().uuid(),
})

export const OpdTeleTriageLiveKitTokenResponseSchema = z.object({
	isConfigured: z.boolean(),
	token: z.string().optional(),
	wsUrl: z.string().optional(),
	roomName: z.string().optional(),
})

export type OpdTeleTriageLiveKitTokenResponse = z.infer<
	typeof OpdTeleTriageLiveKitTokenResponseSchema
>

export const OpdTeleTriageLiveKitSessionEndResponseSchema = z.object({
	id: z.string().uuid(),
	livekitSessionEndedAt: z.string(),
})

export type OpdTeleTriageLiveKitSessionEndResponse = z.infer<
	typeof OpdTeleTriageLiveKitSessionEndResponseSchema
>
