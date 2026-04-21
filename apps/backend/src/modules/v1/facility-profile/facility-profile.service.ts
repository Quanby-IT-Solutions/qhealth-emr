import { Injectable } from "@nestjs/common"
import { eq } from "drizzle-orm"

import { facilityProfiles } from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import { AUDIT_ENTITY_TYPES } from "@/modules/v1/audit/audit-entity-types"
import { type DBTransaction, AuditService } from "@/modules/v1/audit/audit.service"

type FacilityProfileRow = typeof facilityProfiles.$inferSelect

interface FieldChange {
	path: string
	before: unknown
	after: unknown
}

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

type UpdateableField = (typeof PROFILE_COLS)[number]

function diffFields(
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

@Injectable()
export class FacilityProfileService {
	constructor(private readonly auditService: AuditService) {}

	/**
	 * Get the facility profile for a facility.
	 * Auto-provisions the row on first access via ON CONFLICT DO NOTHING.
	 */
	async get(facilityId: string): Promise<FacilityProfileRow> {
		// Auto-provision — idempotent, no triggers needed
		await db
			.insert(facilityProfiles)
			.values({ facilityId })
			.onConflictDoNothing({ target: facilityProfiles.facilityId })

		const [row] = await db
			.select()
			.from(facilityProfiles)
			.where(eq(facilityProfiles.facilityId, facilityId))

		return row!
	}

	/**
	 * Update the facility profile.
	 * Computes per-field diff and persists the audit row atomically in the same transaction.
	 */
	async update(
		facilityId: string,
		input: Partial<Record<UpdateableField, string | null | undefined>>,
		actor: { userId: string; facilityId: string; staffProfileId: string | null }
	): Promise<FacilityProfileRow> {
		return db.transaction(async (tx: DBTransaction) => {
			// 1. Auto-provision if missing, then fetch current state
			await tx
				.insert(facilityProfiles)
				.values({ facilityId })
				.onConflictDoNothing({ target: facilityProfiles.facilityId })

			const [current] = await tx
				.select()
				.from(facilityProfiles)
				.where(eq(facilityProfiles.facilityId, facilityId))

			const currentRow = current!

			// 2. Compute diff
			const changes = diffFields(currentRow, input as Partial<FacilityProfileRow>)

			// 3. Build update payload
			const updatePayload: Partial<FacilityProfileRow> = {
				updatedAt: new Date(),
			}

			for (const key of PROFILE_COLS) {
				if (key in input) {
					;(updatePayload as Record<string, unknown>)[key] = input[key]
				}
			}

			const [updated] = await tx
				.update(facilityProfiles)
				.set(updatePayload)
				.where(eq(facilityProfiles.facilityId, facilityId))
				.returning()

			// 4. Write audit atomically (uses same tx)
			if (changes.length > 0) {
				await this.auditService.log(
					{
						facilityId: actor.facilityId,
						userId: actor.userId,
						staffProfileId: actor.staffProfileId,
						action: "update",
						entityType: AUDIT_ENTITY_TYPES.FACILITY_PROFILE,
						entityId: facilityId,
						beforeState: currentRow as unknown as Record<string, unknown>,
						afterState: updated as unknown as Record<string, unknown>,
						ipAddress: null,
						userAgent: null,
						metadata: { changes },
					},
					{ tx }
				)
			}

			return updated!
		})
	}
}
