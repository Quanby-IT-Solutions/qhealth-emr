import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { and, eq } from "drizzle-orm"

import { integrations } from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import { INTEGRATION_CREDENTIAL_ENV_VARS } from "@/config/app.config"
import { AUDIT_ENTITY_TYPES } from "@/modules/v1/audit/audit-entity-types"
import { type DBTransaction, AuditService } from "@/modules/v1/audit/audit.service"

type IntegrationRow = typeof integrations.$inferSelect
type CredentialStatus = "ok" | "missing_in_env" | "not_in_whitelist" | "unset"

type IntegrationWithStatus = IntegrationRow & { credentialStatus: CredentialStatus }

interface FieldChange {
	path: string
	before: unknown
	after: unknown
}

/**
 * Derive the credentialStatus for an integration row.
 * No credential values are exposed — only the status is computed.
 */
function deriveCredentialStatus(credentialsRef: string | null): CredentialStatus {
	if (!credentialsRef) return "unset"
	const whitelist: readonly string[] = INTEGRATION_CREDENTIAL_ENV_VARS
	if (!whitelist.includes(credentialsRef)) return "not_in_whitelist"
	const val = process.env[credentialsRef]
	if (!val) return "missing_in_env"
	return "ok"
}

function withStatus(row: IntegrationRow): IntegrationWithStatus {
	return { ...row, credentialStatus: deriveCredentialStatus(row.credentialsRef) }
}

const UPDATE_COLS = [
	"kind",
	"name",
	"endpointUrl",
	"credentialsRef",
	"enabled",
	"notes",
] as const

type UpdateableField = (typeof UPDATE_COLS)[number]

function diffFields(
	before: IntegrationRow,
	after: Partial<IntegrationRow>
): FieldChange[] {
	const changes: FieldChange[] = []

	for (const col of UPDATE_COLS) {
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
export class IntegrationRegistryService {
	constructor(private readonly auditService: AuditService) {}

	/**
	 * List all integrations for a facility with computed credentialStatus.
	 */
	async list(facilityId: string): Promise<IntegrationWithStatus[]> {
		const rows = await db
			.select()
			.from(integrations)
			.where(eq(integrations.facilityId, facilityId))

		return rows.map(withStatus)
	}

	/**
	 * Get a single integration by ID (must belong to the facility).
	 */
	async get(facilityId: string, id: string): Promise<IntegrationWithStatus> {
		const [row] = await db
			.select()
			.from(integrations)
			.where(and(eq(integrations.id, id), eq(integrations.facilityId, facilityId)))

		if (!row) throw new NotFoundException(`Integration ${id} not found`)

		return withStatus(row)
	}

	/**
	 * Create a new integration.
	 * Validates credentialsRef against the whitelist.
	 * Writes audit atomically.
	 */
	async create(
		facilityId: string,
		input: {
			kind: IntegrationRow["kind"]
			name: string
			endpointUrl: string
			credentialsRef?: string | null
			enabled?: boolean
			notes?: string | null
		},
		actor: { userId: string; facilityId: string; staffProfileId: string | null }
	): Promise<IntegrationWithStatus> {
		this.validateCredentialsRef(input.credentialsRef)

		return db.transaction(async (tx: DBTransaction) => {
			const [created] = await tx
				.insert(integrations)
				.values({
					facilityId,
					kind: input.kind,
					name: input.name,
					endpointUrl: input.endpointUrl,
					credentialsRef: input.credentialsRef ?? null,
					enabled: input.enabled ?? false,
					notes: input.notes ?? null,
				})
				.returning()

			await this.auditService.log(
				{
					facilityId: actor.facilityId,
					userId: actor.userId,
					staffProfileId: actor.staffProfileId,
					action: "create",
					entityType: AUDIT_ENTITY_TYPES.INTEGRATION,
					entityId: created!.id,
					beforeState: null,
					afterState: created as unknown as Record<string, unknown>,
					ipAddress: null,
					userAgent: null,
					metadata: {},
				},
				{ tx }
			)

			return withStatus(created!)
		})
	}

	/**
	 * Update an integration. Computes per-field diff, writes audit atomically.
	 */
	async update(
		facilityId: string,
		input: {
			id: string
			kind?: IntegrationRow["kind"]
			name?: string
			endpointUrl?: string
			credentialsRef?: string | null
			enabled?: boolean
			notes?: string | null
		},
		actor: { userId: string; facilityId: string; staffProfileId: string | null }
	): Promise<IntegrationWithStatus> {
		this.validateCredentialsRef(input.credentialsRef)

		return db.transaction(async (tx: DBTransaction) => {
			const [current] = await tx
				.select()
				.from(integrations)
				.where(and(eq(integrations.id, input.id), eq(integrations.facilityId, facilityId)))

			if (!current) throw new NotFoundException(`Integration ${input.id} not found`)

			const changes = diffFields(current, input as Partial<IntegrationRow>)

			const updatePayload: Partial<IntegrationRow> = { updatedAt: new Date() }
			for (const col of UPDATE_COLS) {
				if (col in input) {
					;(updatePayload as Record<string, unknown>)[col] = (input as Record<string, unknown>)[col]
				}
			}

			const [updated] = await tx
				.update(integrations)
				.set(updatePayload)
				.where(and(eq(integrations.id, input.id), eq(integrations.facilityId, facilityId)))
				.returning()

			if (changes.length > 0) {
				await this.auditService.log(
					{
						facilityId: actor.facilityId,
						userId: actor.userId,
						staffProfileId: actor.staffProfileId,
						action: "update",
						entityType: AUDIT_ENTITY_TYPES.INTEGRATION,
						entityId: input.id,
						beforeState: current as unknown as Record<string, unknown>,
						afterState: updated as unknown as Record<string, unknown>,
						ipAddress: null,
						userAgent: null,
						metadata: { changes },
					},
					{ tx }
				)
			}

			return withStatus(updated!)
		})
	}

	/**
	 * Delete an integration. Writes audit atomically.
	 */
	async delete(
		facilityId: string,
		id: string,
		actor: { userId: string; facilityId: string; staffProfileId: string | null }
	): Promise<IntegrationWithStatus> {
		return db.transaction(async (tx: DBTransaction) => {
			const [current] = await tx
				.select()
				.from(integrations)
				.where(and(eq(integrations.id, id), eq(integrations.facilityId, facilityId)))

			if (!current) throw new NotFoundException(`Integration ${id} not found`)

			await tx.delete(integrations).where(eq(integrations.id, id))

			await this.auditService.log(
				{
					facilityId: actor.facilityId,
					userId: actor.userId,
					staffProfileId: actor.staffProfileId,
					action: "delete",
					entityType: AUDIT_ENTITY_TYPES.INTEGRATION,
					entityId: id,
					beforeState: current as unknown as Record<string, unknown>,
					afterState: null,
					ipAddress: null,
					userAgent: null,
					metadata: {},
				},
				{ tx }
			)

			return withStatus(current)
		})
	}

	/**
	 * Return the whitelisted credential env var names only — no values.
	 */
	listCredentialRefs(): string[] {
		return [...INTEGRATION_CREDENTIAL_ENV_VARS]
	}

	// ── Private helpers ───────────────────────────────────────────────────────

	/**
	 * If credentialsRef is provided (non-null), it must appear in the whitelist.
	 * This prevents storing arbitrary env var names that the UI couldn't have
	 * offered via the dropdown.
	 */
	private validateCredentialsRef(credentialsRef?: string | null): void {
		if (!credentialsRef) return
		const whitelist: readonly string[] = INTEGRATION_CREDENTIAL_ENV_VARS
		if (!whitelist.includes(credentialsRef)) {
			throw new BadRequestException(
				`credentialsRef "${credentialsRef}" is not in the allowed whitelist`
			)
		}
	}
}
