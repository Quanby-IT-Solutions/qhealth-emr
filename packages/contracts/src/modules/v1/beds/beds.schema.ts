import { z } from "zod"

// ============================================================================
// Helpers
// ============================================================================

const dateOrString = z
	.union([z.date(), z.string()])
	.transform(v => (typeof v === "string" ? new Date(v) : v))

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
// Ward & Bed types
// ============================================================================

export const WardTypeEnum = z.enum(["general", "icu", "er", "or", "nursery"])
export const BedStatusEnum = z.enum(["available", "occupied", "reserved", "cleaning", "out_of_service"])

// ============================================================================
// Ward Schema
// ============================================================================

export const WardSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	name: z.string(),
	wardType: WardTypeEnum,
	totalBeds: z.number(),
	isActive: z.boolean(),
	createdAt: dateOrString,
})

export type Ward = z.infer<typeof WardSchema>

// ============================================================================
// Bed Schema
// ============================================================================

export const BedSchema = z.object({
	id: z.string().uuid(),
	wardId: z.string().uuid(),
	facilityId: z.string().uuid(),
	bedNumber: z.string(),
	status: BedStatusEnum,
	currentEncounterId: z.string().uuid().nullable(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type Bed = z.infer<typeof BedSchema>

// ============================================================================
// Bed with Ward & Patient info (for bed management grid)
// ============================================================================

export const BedDetailSchema = BedSchema.extend({
	wardName: z.string(),
	wardType: WardTypeEnum,
	patientName: z.string().nullable(),
	patientMrn: z.string().nullable(),
})

export type BedDetail = z.infer<typeof BedDetailSchema>

// ============================================================================
// Ward with Beds (for ward-by-ward view)
// ============================================================================

export const WardWithBedsSchema = WardSchema.extend({
	beds: z.array(BedDetailSchema),
	occupiedCount: z.number(),
	availableCount: z.number(),
	outOfServiceCount: z.number(),
})

// ============================================================================
// List Wards
// ============================================================================

export const WardListSchema = z.object({
	facilityId: z.string().uuid(),
})

// ============================================================================
// Create Ward
// ============================================================================

export const CreateWardSchema = z.object({
	facilityId: z.string().uuid(),
	name: z.string().min(1).max(255),
	wardType: WardTypeEnum,
	totalBeds: z.number().int().min(0).default(0),
})

export type CreateWardInput = z.infer<typeof CreateWardSchema>

// ============================================================================
// Create Bed
// ============================================================================

export const CreateBedSchema = z.object({
	wardId: z.string().uuid(),
	facilityId: z.string().uuid(),
	bedNumber: z.string().min(1).max(50),
})

export type CreateBedInput = z.infer<typeof CreateBedSchema>

// ============================================================================
// Update Bed Status
// ============================================================================

export const UpdateBedStatusSchema = z.object({
	id: z.string().uuid(),
	status: BedStatusEnum,
})

// ============================================================================
// Bed Census / BOR
// ============================================================================

export const BedCensusQuerySchema = z.object({
	facilityId: z.string().uuid(),
	date: z.string().optional(),
})

export const BedCensusSnapshotSchema = z.object({
	wardId: z.string().uuid(),
	wardName: z.string(),
	snapshotDate: z.string(),
	totalBeds: z.number(),
	occupiedBeds: z.number(),
	borPercentage: z.string().nullable(),
})

export const BedCensusResponseSchema = z.object({
	facilityId: z.string().uuid(),
	date: z.string(),
	overall: z.object({
		totalBeds: z.number(),
		occupiedBeds: z.number(),
		borPercentage: z.string(),
	}),
	byWard: z.array(BedCensusSnapshotSchema),
})

// ============================================================================
// Bed Management — list beds by facility
// ============================================================================

export const BedListSchema = z.object({
	facilityId: z.string().uuid(),
	wardId: z.string().uuid().optional(),
	status: BedStatusEnum.optional(),
})

export const BedListResponseSchema = z.object({
	wards: z.array(WardWithBedsSchema),
})

// ============================================================================
// Bed Suggestion (ranked available beds based on criteria)
// ============================================================================

export const BedIsolationTypeEnum = z.enum(["none", "contact", "droplet", "airborne"])
export type BedIsolationType = z.infer<typeof BedIsolationTypeEnum>

export const GenderPreferenceEnum = z.enum(["any", "male_only", "female_only"])
export type GenderPreference = z.infer<typeof GenderPreferenceEnum>

export const BedSuggestionQuerySchema = z.object({
	facilityId: z.string().uuid(),
	patientId: z.string().uuid(),
	preferredWardType: WardTypeEnum.optional(),
	isolationRequired: BedIsolationTypeEnum.optional(),
	genderPreference: GenderPreferenceEnum.optional(),
	// e.g., "near_nursing_station", "private_room"
	specialRequirements: z.array(z.string()).optional(),
})

export type BedSuggestionQuery = z.infer<typeof BedSuggestionQuerySchema>

export const SuggestedBedSchema = z.object({
	bedId: z.string().uuid(),
	wardId: z.string().uuid(),
	wardName: z.string(),
	wardType: WardTypeEnum,
	bedNumber: z.string(),
	// Higher score = better match
	matchScore: z.number(),
	// Why this bed was suggested
	matchReasons: z.array(z.string()),
	// Warnings (e.g., "gender mix in ward")
	warnings: z.array(z.string()),
})

export const BedSuggestionResponseSchema = z.object({
	suggestedBeds: z.array(SuggestedBedSchema),
	totalAvailable: z.number(),
})

// ============================================================================
// Real-time Census Dashboard
// ============================================================================

export const CensusDashboardQuerySchema = z.object({
	facilityId: z.string().uuid(),
})

export const CensusDashboardResponseSchema = z.object({
	facilityId: z.string().uuid(),
	timestamp: dateOrString,
	overall: z.object({
		totalBeds: z.number(),
		occupiedBeds: z.number(),
		availableBeds: z.number(),
		reservedBeds: z.number(),
		cleaningBeds: z.number(),
		outOfServiceBeds: z.number(),
		borPercentage: z.number(),
	}),
	byWardType: z.array(
		z.object({
			wardType: WardTypeEnum,
			totalBeds: z.number(),
			occupiedBeds: z.number(),
			availableBeds: z.number(),
			borPercentage: z.number(),
		})
	),
	byWard: z.array(
		z.object({
			wardId: z.string().uuid(),
			wardName: z.string(),
			wardType: WardTypeEnum,
			totalBeds: z.number(),
			occupiedBeds: z.number(),
			availableBeds: z.number(),
			borPercentage: z.number(),
		})
	),
	// Active admissions/discharges in last 24h
	recentActivity: z.object({
		admissionsLast24h: z.number(),
		dischargesLast24h: z.number(),
		transfersLast24h: z.number(),
	}),
})
