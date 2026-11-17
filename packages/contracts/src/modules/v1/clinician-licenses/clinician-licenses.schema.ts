import { z } from "zod"

export const LicenseTypeSchema = z.string().trim().min(1)
export const LicenseTypeEnum = LicenseTypeSchema
export const LicenseStatusEnum = z.enum(["pending", "verified", "expired"])

export const ClinicianLicenseSchema = z.object({
	id: z.string().uuid(),
	staffProfileId: z.string().uuid(),
	licenseType: LicenseTypeSchema,
	licenseNumber: z.string(),
	issueDate: z.string().nullable(),
	expiryDate: z.string().nullable(),
	documentUri: z.string().nullable(),
	status: LicenseStatusEnum,
	verificationProof: z.unknown().nullable(),
	verifiedAt: z
		.union([z.date(), z.string()])
		.transform(v => (typeof v === "string" ? new Date(v) : v))
		.nullable(),
	createdAt: z
		.union([z.date(), z.string()])
		.transform(v => (typeof v === "string" ? new Date(v) : v)),
	updatedAt: z
		.union([z.date(), z.string()])
		.transform(v => (typeof v === "string" ? new Date(v) : v)),
})

export const ClinicianWithLicensesSchema = z.object({
	staffProfileId: z.string().uuid(),
	staffName: z.string(),
	facilityId: z.string().uuid(),
	licenses: z.array(ClinicianLicenseSchema),
	daysUntilNextExpiry: z.number().nullable(),
})

export const ListCliniciansQuerySchema = z.object({
	facilityId: z.string().uuid().optional(),
	search: z.string().optional(),
	status: LicenseStatusEnum.optional(),
	page: z.coerce.number().int().positive().optional().default(1),
	limit: z.coerce.number().int().min(1).max(100).optional().default(20),
})

export const AddLicenseSchema = z.object({
	staffProfileId: z.string().uuid(),
	licenseType: LicenseTypeSchema,
	licenseNumber: z.string().min(1),
	issueDate: z.string().optional(),
	expiryDate: z.string().optional(),
	documentUri: z.string().optional(),
})

export const AddMyLicenseSchema = AddLicenseSchema.omit({ staffProfileId: true })

export const LicenseIdSchema = z.object({ id: z.string().uuid() })

export const VerifyLicenseSchema = z.object({
	id: z.string().uuid(),
	verificationProof: z.string().optional(),
})

export const UpdateLicenseSchema = z.object({
	id: z.string().uuid(),
	licenseNumber: z.string().min(1).optional(),
	issueDate: z.string().nullable().optional(),
	expiryDate: z.string().nullable().optional(),
	documentUri: z.string().nullable().optional(),
})

export type LicenseType = z.infer<typeof LicenseTypeSchema>
export type LicenseStatus = z.infer<typeof LicenseStatusEnum>
export type ClinicianLicense = z.infer<typeof ClinicianLicenseSchema>
export type AddLicenseInput = z.infer<typeof AddLicenseSchema>
export type AddMyLicenseInput = z.infer<typeof AddMyLicenseSchema>
export type UpdateLicenseInput = z.infer<typeof UpdateLicenseSchema>
