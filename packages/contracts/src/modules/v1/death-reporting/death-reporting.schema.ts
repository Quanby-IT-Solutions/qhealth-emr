import { z } from "zod"

// ============================================================================
// Death Report Status
// ============================================================================

export const DeathReportStatusSchema = z.object({
	hasFmdrf: z.boolean(),
	hasFndrf: z.boolean(),
	fmdrfId: z.string().uuid().nullable(),
	fndrfId: z.string().uuid().nullable(),
})

export const GetDeathReportStatusInputSchema = z.object({
	encounterId: z.string().uuid(),
})

// ============================================================================
// FMDRF (Facility Maternal Death Review Form)
// ============================================================================

export const FmdrfReportSchema = z.object({
	id: z.string().uuid(),
	encounterId: z.string().uuid(),
	patientId: z.string().uuid(),
	facilityId: z.string().uuid(),

	// Section 1 – Patient Demographics
	patientName: z.string(),
	patientMrn: z.string(),
	patientAge: z.number().int().positive(),
	patientAddress: z.string(),

	// Section 2 – Death Details
	dateOfDeath: z.string(), // ISO datetime
	causeOfDeathImmediate: z.string(),
	causeOfDeathAntecedent: z.string(),
	causeOfDeathUnderlying: z.string(),
	causeOfDeathContributing: z.string().nullable(),

	// Section 3 – Maternal History
	gravidity: z.number().int().nonnegative(),
	parity: z.number().int().nonnegative(),
	lastMenstrualPeriod: z.string().nullable(),
	gestationalAgeWeeks: z.number().int().nonnegative().nullable(),
	antenatalCare: z.boolean(),
	antenatalVisitCount: z.number().int().nonnegative().nullable(),
	complicationType: z.string().nullable(),

	// Section 4 – Contributing Factors
	factorHemorrhage: z.boolean(),
	factorSepsis: z.boolean(),
	factorEclampsia: z.boolean(),
	factorObstructedLabor: z.boolean(),
	factorUnsafeAbortion: z.boolean(),
	factorOther: z.string().nullable(),

	// Section 5 – Preventability
	avoidableFactors: z.boolean(),
	avoidableRemark: z.string().nullable(),

	// Section 6 – Physician Certification
	physicianName: z.string(),
	physicianLicenseNo: z.string(),
	physicianSignatureDataUrl: z.string(),
	certificationDate: z.string(),

	createdAt: z.string(),
	updatedAt: z.string(),
})

export const CreateFmdrfInputSchema = FmdrfReportSchema.omit({
	id: true,
	createdAt: true,
	updatedAt: true,
})

export const UpdateFmdrfInputSchema = z.object({
	id: z.string().uuid(),
}).extend(
	FmdrfReportSchema.omit({
		id: true,
		createdAt: true,
		updatedAt: true,
	}).partial().shape
)

export const GetFmdrfInputSchema = z.object({
	encounterId: z.string().uuid(),
})

export const FmdrfIdInputSchema = z.object({
	id: z.string().uuid(),
})

// ============================================================================
// FNDRF (Facility Neonatal Death Review Form)
// ============================================================================

export const FndrfReportSchema = z.object({
	id: z.string().uuid(),
	encounterId: z.string().uuid(),
	patientId: z.string().uuid(),
	facilityId: z.string().uuid(),

	// Section 1 – Newborn Info
	newbornName: z.string(),
	newbornMrn: z.string(),
	newbornDateOfBirth: z.string(),

	// Section 2 – Birth History
	gestationalAgeWeeks: z.number().int().nonnegative(),
	birthWeightGrams: z.number().int().positive(),
	deliveryType: z.enum(["svd", "cs", "forceps", "vacuum", "other"]),
	apgarScore1Min: z.number().int().min(0).max(10).nullable(),
	apgarScore5Min: z.number().int().min(0).max(10).nullable(),

	// Section 3 – Maternal Info
	motherName: z.string(),
	motherAge: z.number().int().positive(),
	motherGravidity: z.number().int().nonnegative(),
	motherParity: z.number().int().nonnegative(),
	motherAncVisits: z.number().int().nonnegative().nullable(),

	// Section 4 – Death Circumstances
	dateOfDeath: z.string(),
	ageAtDeathHours: z.number().int().nonnegative().nullable(),
	ageAtDeathDays: z.number().int().nonnegative().nullable(),
	placeOfDeath: z.string(),

	// Section 5 – Cause of Death
	causePrematurity: z.boolean(),
	causeBirthAsphyxia: z.boolean(),
	causeSepsis: z.boolean(),
	causeCongenitalAnomaly: z.boolean(),
	causeRds: z.boolean(),
	causeOther: z.string().nullable(),

	// Section 6 – Contributing Factors / Remarks
	contributingRemarks: z.string().nullable(),

	// Section 7 – Physician Certification
	physicianName: z.string(),
	physicianLicenseNo: z.string(),
	physicianSignatureDataUrl: z.string(),
	certificationDate: z.string(),

	createdAt: z.string(),
	updatedAt: z.string(),
})

export const CreateFndrfInputSchema = FndrfReportSchema.omit({
	id: true,
	createdAt: true,
	updatedAt: true,
})

export const UpdateFndrfInputSchema = z.object({
	id: z.string().uuid(),
}).extend(
	FndrfReportSchema.omit({
		id: true,
		createdAt: true,
		updatedAt: true,
	}).partial().shape
)

export const GetFndrfInputSchema = z.object({
	encounterId: z.string().uuid(),
})

export const FndrfIdInputSchema = z.object({
	id: z.string().uuid(),
})

// SLA-021: mark a death report as released (Flow 7 Step 3 authoritative evidence)
export const MarkDeathReportReleasedInputSchema = z.object({
	id: z.string().uuid(),
	/** UUID of the staff member who physically released the certificate */
	releasedByStaffId: z.string().uuid(),
	/** ISO datetime of release; defaults to now if omitted */
	releasedAt: z.string().datetime().optional(),
})

export const MarkDeathReportReleasedResponseSchema = z.object({
	id: z.string().uuid(),
	releasedByStaffId: z.string().nullable(),
	releasedAt: z.string().nullable(),
	status: z.string(),
	completedAt: z.string().nullable(),
})

// SLA-017: mark a death report as paid
export const MarkDeathReportPaidInputSchema = z.object({
	id: z.string().uuid(),
	/** ISO datetime of payment; defaults to now if omitted */
	paidAt: z.string().datetime().optional(),
})

export const MarkDeathReportPaidResponseSchema = z.object({
	id: z.string().uuid(),
	paidAt: z.string().nullable(),
})

// ============================================================================
// Inferred Types
// ============================================================================

export type DeathReportStatus = z.infer<typeof DeathReportStatusSchema>
export type FmdrfReport = z.infer<typeof FmdrfReportSchema>
export type FndrfReport = z.infer<typeof FndrfReportSchema>
export type CreateFmdrfInput = z.infer<typeof CreateFmdrfInputSchema>
export type UpdateFmdrfInput = z.infer<typeof UpdateFmdrfInputSchema>
export type CreateFndrfInput = z.infer<typeof CreateFndrfInputSchema>
export type UpdateFndrfInput = z.infer<typeof UpdateFndrfInputSchema>
