import { Injectable, Logger } from "@nestjs/common"
import { eq, sql } from "drizzle-orm"

import { systemSettings } from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import { AUDIT_ENTITY_TYPES } from "@/modules/v1/audit/audit-entity-types"
import { type DBTransaction, AuditService } from "@/modules/v1/audit/audit.service"

type SystemSettingsRow = typeof systemSettings.$inferSelect

interface FieldChange {
	path: string
	before: unknown
	after: unknown
}

/** Compute per-field diff for typed columns */
function diffTypedFields(
	before: SystemSettingsRow,
	after: Partial<SystemSettingsRow>
): FieldChange[] {
	const TYPED_COLS = [
		"timezone",
		"chartRetentionYears",
		"supportMailbox",
		"serviceDeskHotline",
		"breakGlassRequiresReason",
		"autoFreezeChargesOnDischarge",
		"requireDpaConsentBeforeExport",
		"enableOfflineSummaryCache",
	] as const

	const changes: FieldChange[] = []

	for (const col of TYPED_COLS) {
		if (!(col in after)) continue
		const oldVal = before[col]
		const newVal = after[col]
		if (oldVal !== newVal) {
			changes.push({ path: col, before: oldVal, after: newVal })
		}
	}

	return changes
}

/** Compute per-field diff for policySections JSONB */
function diffPolicySections(
	before: Record<string, unknown>,
	after: Record<string, unknown>
): FieldChange[] {
	const changes: FieldChange[] = []

	for (const section of Object.keys(after) as string[]) {
		const beforeSection = (before[section] ?? {}) as Record<string, unknown>
		const afterSection = after[section] as Record<string, unknown>

		for (const field of Object.keys(afterSection)) {
			const beforeVal = beforeSection[field]
			const afterVal = afterSection[field]
			if (beforeVal !== afterVal) {
				changes.push({
					path: `policySections.${section}.${field}`,
					before: beforeVal ?? null,
					after: afterVal,
				})
			}
		}
	}

	return changes
}

@Injectable()
export class SystemSettingsService {
	private readonly logger = new Logger(SystemSettingsService.name)

	constructor(private readonly auditService: AuditService) {}

	/**
	 * Get system settings for a facility.
	 * Auto-provisions the row on first access via ON CONFLICT DO NOTHING.
	 */
	async get(facilityId: string): Promise<SystemSettingsRow> {
		// Auto-provision — idempotent, no triggers needed
		await db
			.insert(systemSettings)
			.values({ facilityId })
			.onConflictDoNothing({ target: systemSettings.facilityId })

		const [row] = await db
			.select()
			.from(systemSettings)
			.where(eq(systemSettings.facilityId, facilityId))

		return row!
	}

	/**
	 * Update system settings for a facility.
	 * Computes per-field diff (typed columns + policySections.*) and persists
	 * the audit row atomically in the same transaction.
	 */
	async update(
		facilityId: string,
		input: {
			timezone?: string
			chartRetentionYears?: number
			supportMailbox?: string | null
			serviceDeskHotline?: string | null
			breakGlassRequiresReason?: boolean
			autoFreezeChargesOnDischarge?: boolean
			requireDpaConsentBeforeExport?: boolean
			enableOfflineSummaryCache?: boolean
			policySections?: Record<string, unknown>
		},
		actor: { userId: string; facilityId: string; staffProfileId: string | null }
	): Promise<SystemSettingsRow> {
		return db.transaction(async (tx: DBTransaction) => {
			// 1. Auto-provision if missing, then fetch current state
			await tx
				.insert(systemSettings)
				.values({ facilityId })
				.onConflictDoNothing({ target: systemSettings.facilityId })

			const [current] = await tx
				.select()
				.from(systemSettings)
				.where(eq(systemSettings.facilityId, facilityId))

			const currentRow = current!

			// 2. Compute diff
			const changes: FieldChange[] = []

			// Typed columns diff
			changes.push(...diffTypedFields(currentRow, input as Partial<SystemSettingsRow>))

			// policySections diff (per-field within each section)
			if (input.policySections) {
				const beforeSections = (currentRow.policySections as Record<string, unknown>) ?? {}
				changes.push(...diffPolicySections(beforeSections, input.policySections))
			}

			// 3. Build update payload
			const updatePayload: Partial<SystemSettingsRow> = {
				updatedAt: new Date(),
			}

			const TYPED_COL_KEYS = [
				"timezone",
				"chartRetentionYears",
				"supportMailbox",
				"serviceDeskHotline",
				"breakGlassRequiresReason",
				"autoFreezeChargesOnDischarge",
				"requireDpaConsentBeforeExport",
				"enableOfflineSummaryCache",
			] as const

			for (const key of TYPED_COL_KEYS) {
				if (key in input) {
					;(updatePayload as Record<string, unknown>)[key] = input[key]
				}
			}

			if (input.policySections) {
				// Merge JSONB sections rather than overwriting the entire blob
				updatePayload.policySections = {
					...((currentRow.policySections as Record<string, unknown>) ?? {}),
					...input.policySections,
				}
			}

			const [updated] = await tx
				.update(systemSettings)
				.set(updatePayload)
				.where(eq(systemSettings.facilityId, facilityId))
				.returning()

			// 4. Write audit atomically (uses same tx)
			if (changes.length > 0) {
				await this.auditService.log(
					{
						facilityId: actor.facilityId,
						userId: actor.userId,
						staffProfileId: actor.staffProfileId,
						action: "update",
						entityType: AUDIT_ENTITY_TYPES.SYSTEM_SETTING,
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
