import { z } from "zod"

const dateOrString = z
	.union([z.date(), z.string()])
	.transform(v => (typeof v === "string" ? new Date(v) : v))

// ============================================================================
// Birth Registration Schemas (SLA-017)
// ============================================================================

export const BirthRegistrationStatusEnum = z.enum(["draft", "completed", "submitted"])

export const BirthRegistrationSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	patientId: z.string().uuid(),
	encounterId: z.string().uuid().nullable(),
	birthDatetime: dateOrString,
	registeredByStaffId: z.string().uuid().nullable(),
	certificateNumber: z.string().nullable(),
	attendantAtBirth: z.string().nullable().optional(),
	placeOfBirthBarangay: z.string().nullable().optional(),
	placeOfBirthMunicipality: z.string().nullable().optional(),
	placeOfBirthProvince: z.string().nullable().optional(),
	placeOfBirthRegion: z.string().nullable().optional(),
	fatherName: z.string().nullable().optional(),
	motherName: z.string().nullable().optional(),
	physicianName: z.string().nullable().optional(),
	physicianLicenseNo: z.string().nullable().optional(),
	physicianSignature: z.string().nullable().optional(),
	attendingStaffId: z.string().uuid().nullable().optional(),
	status: BirthRegistrationStatusEnum,
	/** SLA-017: set when the family submits the registration request */
	requestedAt: dateOrString.nullable().optional(),
	/** SLA-017: set when payment is received for the birth certificate */
	paidAt: dateOrString.nullable().optional(),
	/** SLA-021: Flow 7 Step 3 — staff member who physically issued the certificate */
	releasedByStaffId: z.string().uuid().nullable().optional(),
	/** SLA-021: Flow 7 Step 3 — when the certificate was released to the family */
	releasedAt: dateOrString.nullable().optional(),
	completedAt: dateOrString.nullable(),
	submittedAt: dateOrString.nullable(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export const BirthRegistrationIdSchema = z.object({ id: z.string().uuid() })

export const CreateBirthRegistrationSchema = z.object({
	facilityId: z.string().uuid(),
	patientId: z.string().uuid(),
	encounterId: z.string().uuid().optional(),
	birthDatetime: z.string().datetime(),
	registeredByStaffId: z.string().uuid().optional(),
	certificateNumber: z.string().optional(),
	attendantAtBirth: z.string().optional(),
	placeOfBirthBarangay: z.string().optional(),
	placeOfBirthMunicipality: z.string().optional(),
	placeOfBirthProvince: z.string().optional(),
	placeOfBirthRegion: z.string().optional(),
	fatherName: z.string().optional(),
	motherName: z.string().optional(),
	physicianName: z.string().optional(),
	physicianLicenseNo: z.string().optional(),
	physicianSignature: z.string().optional(),
	attendingStaffId: z.string().uuid().optional(),
})

export const UpdateBirthRegistrationSchema = z.object({
	id: z.string().uuid(),
	status: BirthRegistrationStatusEnum.optional(),
	certificateNumber: z.string().optional(),
	attendantAtBirth: z.string().optional(),
	placeOfBirthBarangay: z.string().optional(),
	placeOfBirthMunicipality: z.string().optional(),
	placeOfBirthProvince: z.string().optional(),
	placeOfBirthRegion: z.string().optional(),
	fatherName: z.string().optional(),
	motherName: z.string().optional(),
	physicianName: z.string().optional(),
	physicianLicenseNo: z.string().optional(),
	physicianSignature: z.string().optional(),
	attendingStaffId: z.string().uuid().optional(),
	completedAt: dateOrString.optional(),
	submittedAt: dateOrString.optional(),
})

// SLA-021: mark a birth certificate as released (Flow 7 Step 3 authoritative evidence)
export const MarkBirthRegistrationReleasedInputSchema = z.object({
	id: z.string().uuid(),
	/** ISO datetime of release; defaults to now if omitted */
	releasedAt: z.string().datetime().optional(),
})

export const MarkBirthRegistrationReleasedResponseSchema = z.object({
	id: z.string().uuid(),
	releasedByStaffId: z.string().nullable(),
	releasedAt: z.string().nullable(),
	status: z.string(),
	completedAt: z.string().nullable(),
})

// SLA-017: mark a birth registration as paid
export const MarkBirthRegistrationPaidInputSchema = z.object({
	id: z.string().uuid(),
	/** ISO datetime of payment; defaults to now if omitted */
	paidAt: z.string().datetime().optional(),
})

export const MarkBirthRegistrationPaidResponseSchema = z.object({
	id: z.string().uuid(),
	paidAt: z.string().nullable(),
})

export const ListBirthRegistrationsSchema = z.object({
	facilityId: z.string().uuid(),
	patientId: z.string().uuid().optional(),
	encounterId: z.string().uuid().optional(),
	status: BirthRegistrationStatusEnum.optional(),
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(50),
})

export const ListBirthRegistrationsResponseSchema = z.object({
	data: z.array(BirthRegistrationSchema),
	total: z.number(),
	page: z.number(),
	limit: z.number(),
	totalPages: z.number(),
})
