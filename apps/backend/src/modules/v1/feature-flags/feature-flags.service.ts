import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import { count, desc, eq, inArray } from "drizzle-orm"

import { featureFlagHistory, featureFlags, featureFlagTargets } from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import { AUDIT_ENTITY_TYPES } from "@/modules/v1/audit/audit-entity-types"
import { AuditService } from "@/modules/v1/audit/audit.service"

// 30-second in-process cache for flag evaluation — invalidated on every update/delete
interface CacheEntry {
	value: boolean
	expiresAt: number
}
const EVALUATE_CACHE = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 30_000

function isTestEnvironment() {
	return process.env.NODE_ENV === "test"
}

function cacheGet(key: string): boolean | undefined {
	if (isTestEnvironment()) {
		return undefined
	}

	const entry = EVALUATE_CACHE.get(key)
	if (!entry || Date.now() > entry.expiresAt) {
		EVALUATE_CACHE.delete(key)
		return undefined
	}
	return entry.value
}

function cacheSet(key: string, value: boolean) {
	if (isTestEnvironment()) {
		return
	}

	EVALUATE_CACHE.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
}

function cacheInvalidate(flagId: string) {
	for (const k of EVALUATE_CACHE.keys()) {
		if (k.startsWith(flagId)) EVALUATE_CACHE.delete(k)
	}
}

type Environment = "dev" | "staging" | "prod"

interface ResolutionContext {
	environment: Environment
	activeFacilityId: string
	activeRoleId: string | null
}

interface TargetInput {
	environment: "dev" | "staging" | "prod" | null
	facilityId: string | null
	roleId: string | null
	enabled: boolean
}

type FeatureFlagRow = typeof featureFlags.$inferSelect
type TargetRow = typeof featureFlagTargets.$inferSelect

/**
 * Derive the resolution environment from server-side env vars only.
 * The client must never be able to influence this value.
 */
function resolveEnvironment(): Environment {
	const appEnv = process.env.APP_ENVIRONMENT
	if (appEnv === "dev" || appEnv === "staging" || appEnv === "prod") {
		return appEnv
	}
	const nodeEnv = process.env.NODE_ENV
	if (nodeEnv === "production") return "prod"
	if (nodeEnv === "test") return "dev"
	return "dev"
}

/**
 * Core resolution algorithm per Tech Plan §2.2:
 *
 * 1. Find all targets whose non-null fields all match the context (null = wildcard).
 * 2. Group by specificity (count of non-null dimensions in the target row).
 * 3. Highest specificity tier wins.
 * 4. Within the winning tier: most-restrictive wins — if any disabled target → disabled.
 * 5. No matching targets → defaultEnabled.
 */
function resolveFlag(flag: FeatureFlagRow, targets: TargetRow[], ctx: ResolutionContext): boolean {
	const matching = targets.filter(t => {
		if (t.environment !== null && t.environment !== ctx.environment) return false
		if (t.facilityId !== null && t.facilityId !== ctx.activeFacilityId) return false
		if (t.roleId !== null && t.roleId !== ctx.activeRoleId) return false
		return true
	})

	if (matching.length === 0) return flag.defaultEnabled

	// Compute specificity (number of non-null dimensions)
	const specificity = (t: TargetRow) =>
		(t.environment !== null ? 1 : 0) + (t.facilityId !== null ? 1 : 0) + (t.roleId !== null ? 1 : 0)

	const maxSpec = Math.max(...matching.map(specificity))
	const topTier = matching.filter(t => specificity(t) === maxSpec)

	// Most-restrictive wins: any disabled target in the top tier → disabled
	return topTier.every(t => t.enabled)
}

function diffTargets(
	before: TargetInput[],
	after: TargetInput[]
): Array<{ path: string; before: unknown; after: unknown }> {
	const key = (t: TargetInput) =>
		`${t.environment ?? "*"}:${t.facilityId ?? "*"}:${t.roleId ?? "*"}`
	const beforeMap = new Map(before.map(t => [key(t), t.enabled]))
	const afterMap = new Map(after.map(t => [key(t), t.enabled]))

	const changes: Array<{ path: string; before: unknown; after: unknown }> = []

	for (const [k, v] of afterMap) {
		const prev = beforeMap.get(k)
		if (prev === undefined) {
			changes.push({ path: `target.${k}`, before: null, after: v })
		} else if (prev !== v) {
			changes.push({ path: `target.${k}`, before: prev, after: v })
		}
	}
	for (const [k, v] of beforeMap) {
		if (!afterMap.has(k)) {
			changes.push({ path: `target.${k}`, before: v, after: null })
		}
	}

	return changes
}

@Injectable()
export class FeatureFlagsService {
	private readonly logger = new Logger(FeatureFlagsService.name)

	constructor(private readonly auditService: AuditService) {}

	// ── Queries ──────────────────────────────────────────────────────────────

	async findAll() {
		const flags = await db.select().from(featureFlags)
		const targets = flags.length
			? await db
					.select()
					.from(featureFlagTargets)
					.where(
						inArray(
							featureFlagTargets.flagId,
							flags.map(f => f.id)
						)
					)
			: []

		const targetsByFlag = new Map<string, TargetRow[]>()
		for (const t of targets) {
			const list = targetsByFlag.get(t.flagId) ?? []
			list.push(t)
			targetsByFlag.set(t.flagId, list)
		}

		return {
			data: flags.map(f => ({
				...f,
				targets: targetsByFlag.get(f.id) ?? [],
			})),
			total: flags.length,
		}
	}

	async findOne(id: string) {
		const [flag] = await db.select().from(featureFlags).where(eq(featureFlags.id, id))
		if (!flag) throw new NotFoundException(`Feature flag ${id} not found`)

		const targets = await db
			.select()
			.from(featureFlagTargets)
			.where(eq(featureFlagTargets.flagId, id))

		return { ...flag, targets }
	}

	async findByKey(key: string) {
		const [flag] = await db.select().from(featureFlags).where(eq(featureFlags.key, key))
		if (!flag) throw new NotFoundException(`Feature flag key "${key}" not found`)
		return flag
	}

	// ── Mutations ─────────────────────────────────────────────────────────────

	async create(
		input: {
			key: string
			name: string
			description?: string
			group: "platform-control" | "financial" | "compliance" | "integration"
			riskLevel: "low" | "moderate" | "high"
			ownerTeam?: string
			defaultEnabled: boolean
		},
		actor: { userId: string; facilityId: string; staffProfileId: string | null }
	) {
		return db.transaction(async tx => {
			const [flag] = await tx
				.insert(featureFlags)
				.values({
					key: input.key,
					name: input.name,
					description: input.description ?? null,
					group: input.group,
					riskLevel: input.riskLevel,
					ownerTeam: input.ownerTeam ?? null,
					defaultEnabled: input.defaultEnabled,
				})
				.returning()

			await this.auditService.log(
				{
					facilityId: actor.facilityId,
					userId: actor.userId,
					staffProfileId: actor.staffProfileId,
					action: "create",
					entityType: AUDIT_ENTITY_TYPES.FEATURE_FLAG,
					entityId: flag!.id,
					beforeState: null,
					afterState: flag as unknown as Record<string, unknown>,
					ipAddress: null,
					userAgent: null,
					metadata: null,
				},
				{ tx }
			)

			return flag!
		})
	}

	async update(
		input: {
			id: string
			name?: string
			description?: string | null
			group?: "platform-control" | "financial" | "compliance" | "integration"
			riskLevel?: "low" | "moderate" | "high"
			ownerTeam?: string | null
			defaultEnabled?: boolean
		},
		actor: { userId: string; facilityId: string; staffProfileId: string | null }
	) {
		return db.transaction(async tx => {
			const [before] = await tx.select().from(featureFlags).where(eq(featureFlags.id, input.id))
			if (!before) throw new NotFoundException(`Feature flag ${input.id} not found`)

			const updates: Partial<FeatureFlagRow> = {}
			if (input.name !== undefined) updates.name = input.name
			if (input.description !== undefined) updates.description = input.description
			if (input.group !== undefined) updates.group = input.group
			if (input.riskLevel !== undefined) updates.riskLevel = input.riskLevel
			if (input.ownerTeam !== undefined) updates.ownerTeam = input.ownerTeam
			if (input.defaultEnabled !== undefined) updates.defaultEnabled = input.defaultEnabled
			updates.updatedAt = new Date()

			const [after] = await tx
				.update(featureFlags)
				.set(updates)
				.where(eq(featureFlags.id, input.id))
				.returning()

			// Write history row when defaultEnabled changes
			if (input.defaultEnabled !== undefined && input.defaultEnabled !== before.defaultEnabled) {
				await tx.insert(featureFlagHistory).values({
					flagId: input.id,
					previousValue: before.defaultEnabled,
					newValue: input.defaultEnabled,
					changedBy: actor.staffProfileId ?? null,
					reason: null,
				})
				cacheInvalidate(input.id)
			}

			const changes = Object.entries(updates)
				.filter(([k]) => k !== "updatedAt")
				.filter(([k, v]) => (before as Record<string, unknown>)[k] !== v)
				.map(([k, v]) => ({
					path: k,
					before: (before as Record<string, unknown>)[k],
					after: v,
				}))

			await this.auditService.log(
				{
					facilityId: actor.facilityId,
					userId: actor.userId,
					staffProfileId: actor.staffProfileId,
					action: "update",
					entityType: AUDIT_ENTITY_TYPES.FEATURE_FLAG,
					entityId: input.id,
					beforeState: before as unknown as Record<string, unknown>,
					afterState: after as unknown as Record<string, unknown>,
					ipAddress: null,
					userAgent: null,
					metadata: changes.length > 0 ? { changes } : null,
				},
				{ tx }
			)

			return after!
		})
	}

	async delete(
		id: string,
		actor: { userId: string; facilityId: string; staffProfileId: string | null }
	) {
		return db.transaction(async tx => {
			const [flag] = await tx.select().from(featureFlags).where(eq(featureFlags.id, id))
			if (!flag) throw new NotFoundException(`Feature flag ${id} not found`)

			await tx.delete(featureFlagTargets).where(eq(featureFlagTargets.flagId, id))
			const [deleted] = await tx.delete(featureFlags).where(eq(featureFlags.id, id)).returning()

			cacheInvalidate(id)

			await this.auditService.log(
				{
					facilityId: actor.facilityId,
					userId: actor.userId,
					staffProfileId: actor.staffProfileId,
					action: "delete",
					entityType: AUDIT_ENTITY_TYPES.FEATURE_FLAG,
					entityId: id,
					beforeState: flag as unknown as Record<string, unknown>,
					afterState: null,
					ipAddress: null,
					userAgent: null,
					metadata: null,
				},
				{ tx }
			)

			return deleted!
		})
	}

	/**
	 * Full-replace targeting for one flag.
	 * Computes before/after diff and writes one audit row inside the same transaction.
	 */
	async updateTargeting(
		input: { flagId: string; targets: TargetInput[] },
		actor: { userId: string; facilityId: string; staffProfileId: string | null }
	) {
		return db.transaction(async tx => {
			const [flag] = await tx.select().from(featureFlags).where(eq(featureFlags.id, input.flagId))
			if (!flag) throw new NotFoundException(`Feature flag ${input.flagId} not found`)

			const beforeTargets = await tx
				.select()
				.from(featureFlagTargets)
				.where(eq(featureFlagTargets.flagId, input.flagId))

			// Full replace: delete all then re-insert
			await tx.delete(featureFlagTargets).where(eq(featureFlagTargets.flagId, input.flagId))

			let afterTargets: TargetRow[] = []
			if (input.targets.length > 0) {
				afterTargets = await tx
					.insert(featureFlagTargets)
					.values(
						input.targets.map(t => ({
							flagId: input.flagId,
							environment: t.environment,
							facilityId: t.facilityId,
							roleId: t.roleId,
							enabled: t.enabled,
						}))
					)
					.returning()
			}

			const beforeInputs: TargetInput[] = beforeTargets.map(t => ({
				environment: t.environment as "dev" | "staging" | "prod" | null,
				facilityId: t.facilityId,
				roleId: t.roleId,
				enabled: t.enabled,
			}))

			const changes = diffTargets(beforeInputs, input.targets)

			await this.auditService.log(
				{
					facilityId: actor.facilityId,
					userId: actor.userId,
					staffProfileId: actor.staffProfileId,
					action: "update",
					entityType: AUDIT_ENTITY_TYPES.FEATURE_FLAG_TARGET,
					entityId: input.flagId,
					beforeState: { targets: beforeInputs } as Record<string, unknown>,
					afterState: { targets: input.targets } as Record<string, unknown>,
					ipAddress: null,
					userAgent: null,
					metadata: changes.length > 0 ? { changes } : null,
				},
				{ tx }
			)

			return { ...flag, targets: afterTargets }
		})
	}

	// ── Resolution ────────────────────────────────────────────────────────────

	/**
	 * Bulk-resolve all flags for the given session context.
	 * `environment` is always derived server-side.
	 */
	async resolveForSession(ctx: Omit<ResolutionContext, "environment">) {
		const environment = resolveEnvironment()
		const allFlags = await db.select().from(featureFlags)

		if (allFlags.length === 0) {
			return { resolvedAt: new Date().toISOString(), flags: [] }
		}

		const allTargets = await db
			.select()
			.from(featureFlagTargets)
			.where(
				inArray(
					featureFlagTargets.flagId,
					allFlags.map(f => f.id)
				)
			)

		const targetsByFlag = new Map<string, TargetRow[]>()
		for (const t of allTargets) {
			const list = targetsByFlag.get(t.flagId) ?? []
			list.push(t)
			targetsByFlag.set(t.flagId, list)
		}

		const resCtx: ResolutionContext = {
			environment,
			activeFacilityId: ctx.activeFacilityId,
			activeRoleId: ctx.activeRoleId,
		}

		return {
			resolvedAt: new Date().toISOString(),
			flags: allFlags.map(f => ({
				key: f.key,
				enabled: resolveFlag(f, targetsByFlag.get(f.id) ?? [], resCtx),
			})),
		}
	}

	/**
	 * Evaluate a single flag by key. Used for critical paths.
	 * Results are cached in-process for 30 seconds per (key × facilityId × roleId).
	 */
	async evaluateByKey(key: string, ctx: Omit<ResolutionContext, "environment">) {
		const environment = resolveEnvironment()
		const [flag] = await db.select().from(featureFlags).where(eq(featureFlags.key, key))
		if (!flag) throw new NotFoundException(`Feature flag key "${key}" not found`)

		const cacheKey = `${flag.id}:${ctx.activeFacilityId}:${ctx.activeRoleId ?? ""}:${environment}`
		const cached = cacheGet(cacheKey)
		if (cached !== undefined) {
			return { key: flag.key, enabled: cached, defaultEnabled: flag.defaultEnabled }
		}

		const targets = await db
			.select()
			.from(featureFlagTargets)
			.where(eq(featureFlagTargets.flagId, flag.id))

		const resCtx: ResolutionContext = {
			environment,
			activeFacilityId: ctx.activeFacilityId,
			activeRoleId: ctx.activeRoleId,
		}

		const enabled = resolveFlag(flag, targets, resCtx)
		cacheSet(cacheKey, enabled)

		return { key: flag.key, enabled, defaultEnabled: flag.defaultEnabled }
	}

	// ── History ───────────────────────────────────────────────────────────────

	async getHistory(flagId: string, page: number, limit: number) {
		const [flag] = await db
			.select({ id: featureFlags.id, name: featureFlags.name })
			.from(featureFlags)
			.where(eq(featureFlags.id, flagId))
		if (!flag) throw new NotFoundException(`Feature flag ${flagId} not found`)

		const offset = (page - 1) * limit

		const [totalRow, rows] = await Promise.all([
			db
				.select({ total: count() })
				.from(featureFlagHistory)
				.where(eq(featureFlagHistory.flagId, flagId)),
			db
				.select()
				.from(featureFlagHistory)
				.where(eq(featureFlagHistory.flagId, flagId))
				.orderBy(desc(featureFlagHistory.changedAt))
				.limit(limit)
				.offset(offset),
		])

		return {
			data: rows.map(r => ({ ...r, flagName: flag.name })),
			total: totalRow[0]?.total ?? 0,
			page,
			limit,
		}
	}
}
