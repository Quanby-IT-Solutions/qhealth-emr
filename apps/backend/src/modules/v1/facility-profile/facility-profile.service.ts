import { Injectable } from "@nestjs/common"
import { eq } from "drizzle-orm"

import { facilities, facilityProfiles } from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import { AUDIT_ENTITY_TYPES } from "@/modules/v1/audit/audit-entity-types"
import { AuditService, type DBTransaction } from "@/modules/v1/audit/audit.service"

type FacilityProfileRow = typeof facilityProfiles.$inferSelect
type FacilityRow = typeof facilities.$inferSelect

export interface FacilityProfileFull extends FacilityProfileRow {
	name: string
	facilityType: "community" | "district" | "tertiary"
	dohLicenseNumber: string | null
	philhealthAccreditationId: string | null
}

interface FieldChange {
	path: string
	before: unknown
	after: unknown
}

// Auxiliary fields stored in facility_profiles table
const PROFILE_COLS = [
	"facilityCode",
	"governingAuthority",
	"addressLine1",
	"addressLine2",
	"city",
	"province",
	"zipCode",
	"telephone",
	"email",
	"adminContactName",
	"adminContactEmail",
] as const

// Canonical identity fields stored in facilities table
const FACILITY_COLS = [
	"name",
	"facilityType",
	"dohLicenseNumber",
	"philhealthAccreditationId",
] as const

type UpdateableProfileField = (typeof PROFILE_COLS)[number]
type UpdateableFacilityField = (typeof FACILITY_COLS)[number]

function diffProfileFields(
	before: FacilityProfileRow,
	after: Partial<FacilityProfileRow>
): FieldChange[] {
	const changes: FieldChange[] = []
	for (const col of PROFILE_COLS) {
		if (!(col in after)) continue
		const oldVal = before[col]
		const newVal = after[col]
		if (oldVal !== newVal) {
			changes.push({ path: col, before: oldVal, after: newVal })
		}
	}
	return changes
}

function diffFacilityFields(before: FacilityRow, after: Partial<FacilityRow>): FieldChange[] {
	const changes: FieldChange[] = []
	for (const col of FACILITY_COLS) {
		if (!(col in after)) continue
		const oldVal = before[col]
		const newVal = after[col]
		if (oldVal !== newVal) {
			changes.push({ path: col, before: oldVal, after: newVal })
		}
	}
	return changes
}

@Injectable()
export class FacilityProfileService {
	constructor(private readonly auditService: AuditService) {}

	/**
	 * Get the facility profile for a facility.
	 * Auto-provisions the auxiliary row on first access via ON CONFLICT DO NOTHING.
	 * Returns a merged object with canonical fields (name, facilityType, dohLicenseNumber,
	 * philhealthAccreditationId) from the facilities table plus all auxiliary fields.
	 */
	async get(facilityId: string): Promise<FacilityProfileFull> {
		// Auto-provision — idempotent, no triggers needed
		await db
			.insert(facilityProfiles)
			.values({ facilityId })
			.onConflictDoNothing({ target: facilityProfiles.facilityId })

		const result = await db
			.select({
				// Auxiliary profile fields
				facilityId: facilityProfiles.facilityId,
				facilityCode: facilityProfiles.facilityCode,
				governingAuthority: facilityProfiles.governingAuthority,
				addressLine1: facilityProfiles.addressLine1,
				addressLine2: facilityProfiles.addressLine2,
				city: facilityProfiles.city,
				province: facilityProfiles.province,
				zipCode: facilityProfiles.zipCode,
				telephone: facilityProfiles.telephone,
				email: facilityProfiles.email,
				adminContactName: facilityProfiles.adminContactName,
				adminContactEmail: facilityProfiles.adminContactEmail,
				updatedAt: facilityProfiles.updatedAt,
				// Canonical identity fields
				name: facilities.name,
				facilityType: facilities.facilityType,
				dohLicenseNumber: facilities.dohLicenseNumber,
				philhealthAccreditationId: facilities.philhealthAccreditationId,
			})
			.from(facilityProfiles)
			.innerJoin(facilities, eq(facilityProfiles.facilityId, facilities.id))
			.where(eq(facilityProfiles.facilityId, facilityId))

		return result[0]! as FacilityProfileFull
	}

	/**
	 * Update the facility profile.
	 * Canonical fields (name, facilityType, dohLicenseNumber, philhealthAccreditationId)
	 * are written to the facilities table; auxiliary fields to facility_profiles.
	 * Computes per-field diff across both tables and persists the audit row atomically.
	 */
	async update(
		facilityId: string,
		input: Partial<
			Record<UpdateableProfileField | UpdateableFacilityField, string | null | undefined>
		>,
		actor: {
			userId: string
			facilityId: string
			staffProfileId: string | null
			ipAddress: string | null
			userAgent: string | null
		}
	): Promise<FacilityProfileFull> {
		return db.transaction(async (tx: DBTransaction) => {
			// 1. Auto-provision if missing, then fetch current state
			await tx
				.insert(facilityProfiles)
				.values({ facilityId })
				.onConflictDoNothing({ target: facilityProfiles.facilityId })

			const [currentProfile] = await tx
				.select()
				.from(facilityProfiles)
				.where(eq(facilityProfiles.facilityId, facilityId))

			const [currentFacility] = await tx
				.select()
				.from(facilities)
				.where(eq(facilities.id, facilityId))

			const profileRow = currentProfile!
			const facilityRow = currentFacility!

			// 2. Split input into profile vs. facility fields
			const profileInput: Partial<FacilityProfileRow> = {}
			for (const key of PROFILE_COLS) {
				if (key in input) {
					;(profileInput as Record<string, unknown>)[key] = input[key as UpdateableProfileField]
				}
			}

			const facilityInput: Partial<FacilityRow> = {}
			for (const key of FACILITY_COLS) {
				if (key in input) {
					;(facilityInput as Record<string, unknown>)[key] = input[key as UpdateableFacilityField]
				}
			}

			// 3. Compute diffs
			const profileChanges = diffProfileFields(profileRow, profileInput)
			const facilityChanges = diffFacilityFields(facilityRow, facilityInput)
			const allChanges = [...facilityChanges, ...profileChanges]

			// 4. Update profile table if there are auxiliary changes
			let updatedProfile = profileRow
			if (profileChanges.length > 0) {
				const [p] = await tx
					.update(facilityProfiles)
					.set({ ...profileInput, updatedAt: new Date() })
					.where(eq(facilityProfiles.facilityId, facilityId))
					.returning()
				updatedProfile = p!
			}

			// 5. Update facilities table if there are canonical changes
			let updatedFacility = facilityRow
			if (facilityChanges.length > 0) {
				const [f] = await tx
					.update(facilities)
					.set({ ...facilityInput, updatedAt: new Date() })
					.where(eq(facilities.id, facilityId))
					.returning()
				updatedFacility = f!
			}

			// 6. Write audit atomically (uses same tx)
			if (allChanges.length > 0) {
				await this.auditService.log(
					{
						facilityId: actor.facilityId,
						userId: actor.userId,
						staffProfileId: actor.staffProfileId,
						action: "update",
						entityType: AUDIT_ENTITY_TYPES.FACILITY_PROFILE,
						entityId: facilityId,
						beforeState: {
							...facilityRow,
							...profileRow,
						} as unknown as Record<string, unknown>,
						afterState: {
							...updatedFacility,
							...updatedProfile,
						} as unknown as Record<string, unknown>,
						ipAddress: actor.ipAddress,
						userAgent: actor.userAgent,
						metadata: { changes: allChanges },
					},
					{ tx }
				)
			}

			return {
				...updatedProfile,
				name: updatedFacility.name,
				facilityType: updatedFacility.facilityType as "community" | "district" | "tertiary",
				dohLicenseNumber: updatedFacility.dohLicenseNumber ?? null,
				philhealthAccreditationId: updatedFacility.philhealthAccreditationId ?? null,
			}
		})
	}
}
