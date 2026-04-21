/**
 * Feature flag resolution algorithm tests.
 *
 * The resolution logic is the most critical correctness requirement:
 *  - Highest specificity wins
 *  - Within a tier, any disabled entry disables the flag (most-restrictive)
 *  - No match → defaultEnabled
 *
 * We extract the pure algorithm by referencing the service's internal logic
 * through the service's public evaluateByKey method, mocking the DB calls.
 */

import { NotFoundException } from "@nestjs/common"

import { db } from "@/common/database/database.client"

import { FeatureFlagsService } from "./feature-flags.service"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/common/database/database.client", () => ({
	db: {
		select: jest.fn(),
		insert: jest.fn(),
		delete: jest.fn(),
		transaction: jest.fn(),
		execute: jest.fn(),
	},
}))

jest.mock("@repo/db/schema", () => ({
	featureFlags: { key: "key", id: "id" },
	featureFlagTargets: { flagId: "flagId", id: "id" },
}))

const mockAuditService = {
	log: jest.fn().mockResolvedValue(undefined),
}

// ---------------------------------------------------------------------------
// Builder helpers
// ---------------------------------------------------------------------------

function makeFlag(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: "flag-1",
		key: "my-flag",
		name: "My Flag",
		description: null,
		group: "platform-control",
		riskLevel: "low",
		ownerTeam: null,
		defaultEnabled: false,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	}
}

function makeTarget(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: `target-${Math.random()}`,
		flagId: "flag-1",
		environment: null,
		facilityId: null,
		roleId: null,
		enabled: true,
		createdAt: new Date(),
		...overrides,
	}
}

function mockSelectChain(rows: unknown[]) {
	const chain: Record<string, jest.Mock> = {}
	chain.where = jest.fn().mockResolvedValue(rows)
	chain.from = jest.fn().mockReturnValue(chain)
	;(db.select as jest.Mock).mockReturnValue(chain)
	return chain
}

// We need two sequential select calls (flags, then targets).
function mockTwoSelects(flagRow: unknown, targets: unknown[]) {
	let callCount = 0
	;(db.select as jest.Mock).mockImplementation(() => {
		callCount++
		const chain: Record<string, jest.Mock> = {}
		if (callCount === 1) {
			// flags query
			chain.from = jest.fn().mockReturnValue({
				where: jest.fn().mockResolvedValue([flagRow]),
			})
		} else {
			// targets query
			chain.from = jest.fn().mockReturnValue({
				where: jest.fn().mockResolvedValue(targets),
			})
		}
		return chain
	})
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FeatureFlagsService — resolution algorithm", () => {
	let service: FeatureFlagsService

	beforeEach(() => {
		jest.clearAllMocks()
		service = new FeatureFlagsService(mockAuditService as never)
		// Freeze env so tests are stable
		process.env.APP_ENVIRONMENT = "prod"
	})

	afterEach(() => {
		delete process.env.APP_ENVIRONMENT
	})

	// ── No targets ───────────────────────────────────────────────────────────

	it("returns defaultEnabled when there are no matching targets", async () => {
		mockTwoSelects(makeFlag({ defaultEnabled: true }), [])

		const result = await service.evaluateByKey("my-flag", {
			activeFacilityId: "fac-a",
			activeRoleId: "role-a",
		})

		expect(result.enabled).toBe(true)
	})

	it("returns defaultEnabled=false when no targets and default is false", async () => {
		mockTwoSelects(makeFlag({ defaultEnabled: false }), [])

		const result = await service.evaluateByKey("my-flag", {
			activeFacilityId: "fac-a",
			activeRoleId: "role-a",
		})

		expect(result.enabled).toBe(false)
	})

	// ── Wildcard (specificity=0) ──────────────────────────────────────────────

	it("wildcard target (all null) always matches and overrides default", async () => {
		const target = makeTarget({ environment: null, facilityId: null, roleId: null, enabled: true })
		mockTwoSelects(makeFlag({ defaultEnabled: false }), [target])

		const result = await service.evaluateByKey("my-flag", {
			activeFacilityId: "fac-a",
			activeRoleId: "role-a",
		})

		expect(result.enabled).toBe(true)
	})

	// ── Environment mismatch ──────────────────────────────────────────────────

	it("ignores targets where environment does not match", async () => {
		// Target for 'dev', but we're in 'prod' (set by APP_ENVIRONMENT above)
		const target = makeTarget({ environment: "dev", enabled: true })
		mockTwoSelects(makeFlag({ defaultEnabled: false }), [target])

		const result = await service.evaluateByKey("my-flag", {
			activeFacilityId: "fac-a",
			activeRoleId: null,
		})

		expect(result.enabled).toBe(false)
	})

	// ── Specificity — higher tier wins ────────────────────────────────────────

	it("higher specificity target wins over lower specificity", async () => {
		// spec=1 (env only): disabled
		const lowSpec = makeTarget({ environment: "prod", facilityId: null, roleId: null, enabled: false })
		// spec=2 (env + facility): enabled — should win
		const highSpec = makeTarget({ environment: "prod", facilityId: "fac-a", roleId: null, enabled: true })

		mockTwoSelects(makeFlag({ defaultEnabled: false }), [lowSpec, highSpec])

		const result = await service.evaluateByKey("my-flag", {
			activeFacilityId: "fac-a",
			activeRoleId: null,
		})

		expect(result.enabled).toBe(true)
	})

	// ── Most-restrictive within tier ──────────────────────────────────────────

	it("most-restrictive wins within the same specificity tier", async () => {
		// Two spec=1 targets (env only): one enabled, one disabled → disabled wins
		const t1 = makeTarget({ id: "t1", environment: "prod", enabled: true })
		const t2 = makeTarget({ id: "t2", environment: "prod", enabled: false })

		mockTwoSelects(makeFlag({ defaultEnabled: true }), [t1, t2])

		const result = await service.evaluateByKey("my-flag", {
			activeFacilityId: "fac-b",
			activeRoleId: null,
		})

		expect(result.enabled).toBe(false)
	})

	it("all targets in top tier enabled → enabled", async () => {
		const t1 = makeTarget({ id: "t1", environment: "prod", enabled: true })
		const t2 = makeTarget({ id: "t2", environment: "prod", enabled: true })

		mockTwoSelects(makeFlag({ defaultEnabled: false }), [t1, t2])

		const result = await service.evaluateByKey("my-flag", {
			activeFacilityId: "fac-b",
			activeRoleId: null,
		})

		expect(result.enabled).toBe(true)
	})

	// ── Facility & role mismatch ──────────────────────────────────────────────

	it("ignores target whose facilityId does not match context", async () => {
		const target = makeTarget({ facilityId: "fac-other", enabled: true })
		mockTwoSelects(makeFlag({ defaultEnabled: false }), [target])

		const result = await service.evaluateByKey("my-flag", {
			activeFacilityId: "fac-a",
			activeRoleId: null,
		})

		// No matching target → falls back to defaultEnabled=false
		expect(result.enabled).toBe(false)
	})

	it("ignores target whose roleId does not match context", async () => {
		const target = makeTarget({ roleId: "role-other", enabled: true })
		mockTwoSelects(makeFlag({ defaultEnabled: false }), [target])

		const result = await service.evaluateByKey("my-flag", {
			activeFacilityId: "fac-a",
			activeRoleId: "role-a",
		})

		expect(result.enabled).toBe(false)
	})

	// ── Not found ─────────────────────────────────────────────────────────────

	it("throws NotFoundException when key does not exist", async () => {
		;(db.select as jest.Mock).mockImplementation(() => ({
			from: jest.fn().mockReturnValue({
				where: jest.fn().mockResolvedValue([]),
			}),
		}))

		await expect(
			service.evaluateByKey("nonexistent-key", {
				activeFacilityId: "fac-a",
				activeRoleId: null,
			})
		).rejects.toThrow(NotFoundException)
	})
})
