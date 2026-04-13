import { z } from "zod"

// ============================================================================
// Pagination helpers
// ============================================================================

const PaginationInputSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(50),
})

const PaginatedResponseSchema = z.object({
	total: z.number(),
	page: z.number(),
	limit: z.number(),
	totalPages: z.number(),
})

// ============================================================================
// Timestamp helper
// ============================================================================

const dateOrString = z
	.union([z.date(), z.string()])
	.transform(v => (typeof v === "string" ? new Date(v) : v))

// ============================================================================
// Patient Schema — represents the full patient resource
// ============================================================================

export const PatientSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	mrn: z.string(),
	firstName: z.string(),
	lastName: z.string(),
	middleName: z.string().nullable(),
	dateOfBirth: z.string(), // date stored as string from DB
	sex: z.enum(["male", "female", "other"]),
	addressLine1: z.string().nullable(),
	addressLine2: z.string().nullable(),
	city: z.string().nullable(),
	province: z.string().nullable(),
	zipCode: z.string().nullable(),
	phone: z.string().nullable(),
	email: z.string().nullable(),
	philhealthMemberId: z.string().nullable(),
	emergencyContactName: z.string().nullable(),
	emergencyContactPhone: z.string().nullable(),
	nextOfKinName: z.string().nullable(),
	nextOfKinRelationship: z.string().nullable(),
	isActive: z.boolean(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type Patient = z.infer<typeof PatientSchema>

// ============================================================================
// Search Input — search by name, MRN, DOB with pagination
// ============================================================================

export const PatientSearchSchema = PaginationInputSchema.extend({
	search: z.string().optional(),
	mrn: z.string().optional(),
	dateOfBirth: z.string().optional(),
	facilityId: z.string().uuid(),
	isActive: z.boolean().optional().default(true),
})

export type PatientSearchInput = z.infer<typeof PatientSearchSchema>

// ============================================================================
// Search Response — paginated list of patients with last encounter date
// ============================================================================

export const PatientSearchResultSchema = PatientSchema.pick({
	id: true,
	mrn: true,
	firstName: true,
	lastName: true,
	middleName: true,
	dateOfBirth: true,
	sex: true,
	isActive: true,
}).extend({
	lastEncounterDate: dateOrString.nullable(),
})

export const PatientSearchResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(PatientSearchResultSchema),
})

// ============================================================================
// Create Patient Input
// ============================================================================

export const CreatePatientSchema = z.object({
	facilityId: z.string().uuid(),
	firstName: z.string().min(1, "First name is required").max(255),
	lastName: z.string().min(1, "Last name is required").max(255),
	middleName: z.string().max(255).optional(),
	dateOfBirth: z.string().min(1, "Date of birth is required"),
	sex: z.enum(["male", "female", "other"]),
	addressLine1: z.string().max(500).optional(),
	addressLine2: z.string().max(500).optional(),
	city: z.string().max(255).optional(),
	province: z.string().max(255).optional(),
	zipCode: z.string().max(20).optional(),
	phone: z.string().max(50).optional(),
	email: z.string().email().optional(),
	philhealthMemberId: z.string().max(50).optional(),
	emergencyContactName: z.string().max(255).optional(),
	emergencyContactPhone: z.string().max(50).optional(),
	nextOfKinName: z.string().max(255).optional(),
	nextOfKinRelationship: z.string().max(100).optional(),
})

export type CreatePatientInput = z.infer<typeof CreatePatientSchema>

// ============================================================================
// Update Patient Input
// ============================================================================

export const UpdatePatientSchema = z.object({
	id: z.string().uuid(),
	firstName: z.string().min(1).max(255).optional(),
	lastName: z.string().min(1).max(255).optional(),
	middleName: z.string().max(255).nullable().optional(),
	dateOfBirth: z.string().optional(),
	sex: z.enum(["male", "female", "other"]).optional(),
	addressLine1: z.string().max(500).nullable().optional(),
	addressLine2: z.string().max(500).nullable().optional(),
	city: z.string().max(255).nullable().optional(),
	province: z.string().max(255).nullable().optional(),
	zipCode: z.string().max(20).nullable().optional(),
	phone: z.string().max(50).nullable().optional(),
	email: z.string().email().nullable().optional(),
	philhealthMemberId: z.string().max(50).nullable().optional(),
	emergencyContactName: z.string().max(255).nullable().optional(),
	emergencyContactPhone: z.string().max(50).nullable().optional(),
	nextOfKinName: z.string().max(255).nullable().optional(),
	nextOfKinRelationship: z.string().max(100).nullable().optional(),
	isActive: z.boolean().optional(),
})

export type UpdatePatientInput = z.infer<typeof UpdatePatientSchema>

// ============================================================================
// Patient ID param
// ============================================================================

export const PatientIdSchema = z.object({
	id: z.string().uuid(),
})

export type PatientIdInput = z.infer<typeof PatientIdSchema>

// ============================================================================
// Encounter summary for patient profile
// ============================================================================

export const PatientEncounterSummarySchema = z.object({
	id: z.string().uuid(),
	encounterType: z.enum(["inpatient", "outpatient", "emergency"]),
	status: z.enum(["active", "discharged", "closed", "cancelled"]),
	chiefComplaint: z.string().nullable(),
	admissionDatetime: dateOrString,
	dischargeDatetime: dateOrString.nullable(),
})

export const PatientProfileResponseSchema = PatientSchema.extend({
	encounters: z.array(PatientEncounterSummarySchema),
})

export type PatientProfileResponse = z.infer<typeof PatientProfileResponseSchema>
