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
