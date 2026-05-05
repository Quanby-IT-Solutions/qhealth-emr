import { z } from "zod"

// ============================================================================
// Facility code format
// Short alphanumeric code with hyphens, e.g. "QH-MAIN", "DOH-R4A"
// ============================================================================

const facilityCodeRegex = /^[A-Z0-9][A-Z0-9-]{1,18}[A-Z0-9]$/

// ============================================================================
// Canonical facility type enum
// ============================================================================

export const FacilityTypeEnum = z.enum(["community", "district", "tertiary"])
export type FacilityType = z.infer<typeof FacilityTypeEnum>

// ============================================================================
// Full response schema (what the API returns)
// Includes canonical fields from the facilities table plus auxiliary fields
// from the facility_profiles table.
// ============================================================================

export const FacilityProfileSchema = z.object({
	facilityId: z.string().uuid(),
	// Canonical identity (from facilities table)
	name: z.string(),
	facilityType: FacilityTypeEnum,
	dohLicenseNumber: z.string().nullable(),
	philhealthAccreditationId: z.string().nullable(),
	// Auxiliary operational fields (from facility_profiles table)
	facilityCode: z.string().nullable(),
	governingAuthority: z.string().nullable(),
	addressLine1: z.string().nullable(),
	addressLine2: z.string().nullable(),
	city: z.string().nullable(),
	province: z.string().nullable(),
	zipCode: z.string().nullable(),
	telephone: z.string().nullable(),
	email: z.string().email().nullable(),
	adminContactName: z.string().nullable(),
	adminContactEmail: z.string().email().nullable(),
	updatedAt: z
		.union([z.date(), z.string()])
		.transform(v => (typeof v === "string" ? new Date(v) : v))
		.nullable(),
})

export type FacilityProfile = z.infer<typeof FacilityProfileSchema>

// ============================================================================
// Update input schema
// All fields optional for partial updates.
// facilityCode validated against regex when present.
// ============================================================================

export const UpdateFacilityProfileSchema = z.object({
	// Canonical identity fields (written to facilities table)
	name: z.string().min(1, "Facility name is required").optional(),
	facilityType: FacilityTypeEnum.optional(),
	dohLicenseNumber: z.string().nullable().optional(),
	philhealthAccreditationId: z.string().nullable().optional(),
	// Auxiliary operational fields (written to facility_profiles table)
	facilityCode: z
		.string()
		.regex(
			facilityCodeRegex,
			"Facility code must be 3–20 uppercase alphanumeric characters with hyphens (e.g. QH-MAIN)"
		)
		.optional(),
	governingAuthority: z.string().nullable().optional(),
	addressLine1: z.string().nullable().optional(),
	addressLine2: z.string().nullable().optional(),
	city: z.string().nullable().optional(),
	province: z.string().nullable().optional(),
	zipCode: z.string().nullable().optional(),
	telephone: z.string().nullable().optional(),
	email: z.string().email().nullable().optional(),
	adminContactName: z.string().nullable().optional(),
	adminContactEmail: z.string().email().nullable().optional(),
})

export type UpdateFacilityProfileInput = z.infer<typeof UpdateFacilityProfileSchema>
