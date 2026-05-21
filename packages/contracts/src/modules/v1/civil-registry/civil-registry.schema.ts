import { z } from "zod"

const dateOrString = z
	.union([z.date(), z.string()])
	.transform(v => (typeof v === "string" ? new Date(v) : v))

// ============================================================================
// Birth Registration Schemas (SLA-017)
// ============================================================================

export const BirthRegistrationStatusEnum = z.enum(["draft", "completed", "submitted"])
export const LcrCertificateTypeEnum = z.enum(["birth", "death"])
export const LcrArtifactTypeEnum = z.enum(["pdf", "xml"])
export const LcrArtifactStatusEnum = z.enum(["pending", "generated", "failed"])
export const LcrSubmissionStatusEnum = z.enum([
	"not_submitted",
	"ready",
	"submitted",
	"acknowledged",
	"rejected",
	"error",
])

export const LcrTrackingSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	certificateType: LcrCertificateTypeEnum,
	sourceRecordId: z.string().uuid(),
	pdfStatus: LcrArtifactStatusEnum,
	pdfGeneratedAt: dateOrString.nullable(),
	pdfUrl: z.string().nullable(),
	xmlStatus: LcrArtifactStatusEnum,
	xmlGeneratedAt: dateOrString.nullable(),
	xmlUrl: z.string().nullable(),
	submissionStatus: LcrSubmissionStatusEnum,
	submittedAt: dateOrString.nullable(),
	acknowledgementNumber: z.string().nullable(),
	referenceNumber: z.string().nullable(),
	lastSubmissionError: z.string().nullable(),
	lastSubmissionErrorAt: dateOrString.nullable(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export const LcrTrackingCertificateSourceSchema = z.object({
	certificateType: LcrCertificateTypeEnum,
	sourceRecordId: z.string().uuid(),
})

const LcrArtifactReferenceSchema = z.string().trim().min(1).url()

export const GenerateLcrArtifactInputSchema = LcrTrackingCertificateSourceSchema.extend({
	artifactType: LcrArtifactTypeEnum,
	artifactUrl: LcrArtifactReferenceSchema.optional(),
	error: z.string().trim().min(1),
})
	.partial({ error: true })
	.superRefine((input, ctx) => {
		if (!input.error && !input.artifactUrl) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "artifactUrl is required when recording a generated artifact",
				path: ["artifactUrl"],
			})
		}
	})

export const MarkLcrSubmittedInputSchema = LcrTrackingCertificateSourceSchema.extend({
	submissionStatus: LcrSubmissionStatusEnum.exclude(["not_submitted", "ready"]).default(
		"submitted"
	),
	submittedAt: z.string().datetime().optional(),
	acknowledgementNumber: z.string().optional(),
	referenceNumber: z.string().optional(),
	error: z.string().optional(),
})

export const ListLcrTrackingSchema = z.object({
	facilityId: z.string().uuid(),
	certificateType: LcrCertificateTypeEnum.optional(),
	submissionStatus: LcrSubmissionStatusEnum.optional(),
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(50),
})

export const LcrTrackingTableRecordSchema = z.object({
	certificateType: LcrCertificateTypeEnum,
	sourceRecordId: z.string().uuid(),
	facilityId: z.string().uuid(),
	patientId: z.string().uuid(),
	encounterId: z.string().uuid().nullable(),
	certificateNumber: z.string().nullable(),
	eventDatetime: dateOrString,
	status: BirthRegistrationStatusEnum,
	requestedAt: dateOrString.nullable().optional(),
	paidAt: dateOrString.nullable().optional(),
	releasedAt: dateOrString.nullable().optional(),
	completedAt: dateOrString.nullable(),
	submittedAt: dateOrString.nullable(),
	tracking: LcrTrackingSchema.nullable(),
})

export const ListLcrTrackingResponseSchema = z.object({
	data: z.array(LcrTrackingTableRecordSchema),
	total: z.number(),
	page: z.number(),
	limit: z.number(),
	totalPages: z.number(),
})

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
	tracking: LcrTrackingSchema.nullable().optional(),
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

// ============================================================================
// Death Certificate Registration Schemas (Civil Registry)
// ============================================================================

export const DeathCertificateRegistrationStatusEnum = BirthRegistrationStatusEnum

export const DeathCertificateRegistrationSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	patientId: z.string().uuid(),
	encounterId: z.string().uuid().nullable(),
	deathDatetime: dateOrString,
	registeredByStaffId: z.string().uuid().nullable(),
	certificateNumber: z.string().nullable(),
	deceasedName: z.string().nullable().optional(),
	deceasedMrn: z.string().nullable().optional(),
	ageAtDeathYears: z.number().int().nullable().optional(),
	deceasedAddress: z.string().nullable().optional(),
	placeOfDeath: z.string().nullable().optional(),
	causeOfDeathImmediate: z.string().nullable().optional(),
	causeOfDeathAntecedent: z.string().nullable().optional(),
	causeOfDeathUnderlying: z.string().nullable().optional(),
	causeOfDeathContributing: z.string().nullable().optional(),
	informantName: z.string().nullable().optional(),
	informantRelationship: z.string().nullable().optional(),
	physicianName: z.string().nullable().optional(),
	physicianLicenseNo: z.string().nullable().optional(),
	physicianSignature: z.string().nullable().optional(),
	certificationDate: dateOrString.nullable().optional(),
	status: DeathCertificateRegistrationStatusEnum,
	requestedAt: dateOrString.nullable().optional(),
	paidAt: dateOrString.nullable().optional(),
	releasedByStaffId: z.string().uuid().nullable().optional(),
	releasedAt: dateOrString.nullable().optional(),
	completedAt: dateOrString.nullable(),
	submittedAt: dateOrString.nullable(),
	tracking: LcrTrackingSchema.nullable().optional(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export const DeathCertificateRegistrationIdSchema = z.object({ id: z.string().uuid() })

export const CreateDeathCertificateRegistrationSchema = z.object({
	facilityId: z.string().uuid(),
	patientId: z.string().uuid(),
	encounterId: z.string().uuid().optional(),
	deathDatetime: z.string().datetime(),
	registeredByStaffId: z.string().uuid().optional(),
	certificateNumber: z.string().optional(),
	deceasedName: z.string().optional(),
	deceasedMrn: z.string().optional(),
	ageAtDeathYears: z.number().int().min(0).optional(),
	deceasedAddress: z.string().optional(),
	placeOfDeath: z.string().optional(),
	causeOfDeathImmediate: z.string().optional(),
	causeOfDeathAntecedent: z.string().optional(),
	causeOfDeathUnderlying: z.string().optional(),
	causeOfDeathContributing: z.string().optional(),
	informantName: z.string().optional(),
	informantRelationship: z.string().optional(),
	physicianName: z.string().optional(),
	physicianLicenseNo: z.string().optional(),
	physicianSignature: z.string().optional(),
	certificationDate: z.string().date().optional(),
})

export const UpdateDeathCertificateRegistrationSchema =
	CreateDeathCertificateRegistrationSchema.omit({
		facilityId: true,
		patientId: true,
		deathDatetime: true,
	}).extend({
		id: z.string().uuid(),
		deathDatetime: z.string().datetime().optional(),
		status: DeathCertificateRegistrationStatusEnum.optional(),
		completedAt: dateOrString.optional(),
		submittedAt: dateOrString.optional(),
	})

export const MarkDeathCertificateRegistrationReleasedInputSchema = z.object({
	id: z.string().uuid(),
	releasedAt: z.string().datetime().optional(),
})

export const MarkDeathCertificateRegistrationReleasedResponseSchema = z.object({
	id: z.string().uuid(),
	releasedByStaffId: z.string().nullable(),
	releasedAt: z.string().nullable(),
	status: z.string(),
	completedAt: z.string().nullable(),
})

export const MarkDeathCertificateRegistrationPaidInputSchema = z.object({
	id: z.string().uuid(),
	paidAt: z.string().datetime().optional(),
})

export const MarkDeathCertificateRegistrationPaidResponseSchema = z.object({
	id: z.string().uuid(),
	paidAt: z.string().nullable(),
})

export const ListDeathCertificateRegistrationsSchema = z.object({
	facilityId: z.string().uuid(),
	patientId: z.string().uuid().optional(),
	encounterId: z.string().uuid().optional(),
	status: DeathCertificateRegistrationStatusEnum.optional(),
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(50),
})

export const ListDeathCertificateRegistrationsResponseSchema = z.object({
	data: z.array(DeathCertificateRegistrationSchema),
	total: z.number(),
	page: z.number(),
	limit: z.number(),
	totalPages: z.number(),
})
