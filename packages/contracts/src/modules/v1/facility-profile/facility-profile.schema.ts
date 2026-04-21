import { z } from "zod"

// ============================================================================
// Facility code format
// Short alphanumeric code with hyphens, e.g. "QH-MAIN", "DOH-R4A"
// ============================================================================

const facilityCodeRegex = /^[A-Z0-9][A-Z0-9-]{1,18}[A-Z0-9]$/

// ============================================================================
// Full response schema (what the API returns)
// ============================================================================

export const FacilityProfileSchema = z.object({
	facilityId: z.string().uuid(),
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
	facilityCode: z
		.string()
		.regex(facilityCodeRegex, "Facility code must be 3–20 uppercase alphanumeric characters with hyphens (e.g. QH-MAIN)")
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
