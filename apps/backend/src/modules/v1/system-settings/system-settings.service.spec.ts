/**
 * SystemSettingsService tests.
 *
 * Covers:
 * 1. get() auto-provisions the row via ON CONFLICT DO NOTHING (idempotent)
 * 2. update() computes per-field diff for typed columns and policySections paths
 * 3. update() writes audit atomically in the same transaction
 */

import { db } from "@/common/database/database.client"

import { SystemSettingsService } from "./system-settings.service"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/common/database/database.client", () => ({
	db: {
		select: jest.fn(),
		insert: jest.fn(),
		update: jest.fn(),
		transaction: jest.fn(),
	},
}))

jest.mock("@repo/db/schema", () => ({
	systemSettings: {
		facilityId: "facilityId",
		updatedAt: "updatedAt",
	},
}))

const mockAuditService = {
	log: jest.fn().mockResolvedValue(undefined),
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRow(overrides: Record<string, unknown> = {}) {
	return {
		facilityId: "fac-1",
		timezone: "Asia/Manila",
		chartRetentionYears: 10,
		supportMailbox: null,
		serviceDeskHotline: null,
		breakGlassRequiresReason: true,
		autoFreezeChargesOnDischarge: true,
		requireDpaConsentBeforeExport: true,
		enableOfflineSummaryCache: false,
		policySections: {},
		updatedAt: null,
		...overrides,
	}
}

/** Build a mock Drizzle insert chain: insert().values().onConflictDoNothing() → resolves undefined */
function mockInsertChain() {
	return {
		values: jest.fn().mockReturnValue({
			onConflictDoNothing: jest.fn().mockResolvedValue(undefined),
		}),
	}
}

/** Build a mock Drizzle select chain: select().from().where() → resolves rows */
function mockSelectChain(rows: unknown[]) {
	return {
		from: jest.fn().mockReturnValue({
			where: jest.fn().mockResolvedValue(rows),
		}),
	}
}

/** Build a mock Drizzle update chain: update().set().where().returning() → resolves rows */
function mockUpdateChain(returnRows: unknown[]) {
	return {
		set: jest.fn().mockReturnValue({
			where: jest.fn().mockReturnValue({
				returning: jest.fn().mockResolvedValue(returnRows),
			}),
		}),
	}
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SystemSettingsService", () => {
	let service: SystemSettingsService

	beforeEach(() => {
		jest.clearAllMocks()
		service = new SystemSettingsService(mockAuditService as never)
	})

	// ── Auto-provision idempotency ────────────────────────────────────────────

	describe("get()", () => {
		it("inserts on first call (auto-provision) then returns the row", async () => {
			const row = makeRow()
			;(db.insert as jest.Mock).mockReturnValue(mockInsertChain())
			;(db.select as jest.Mock).mockReturnValue(mockSelectChain([row]))

			const result = await service.get("fac-1")

			expect(db.insert).toHaveBeenCalledTimes(1)
			expect(db.select).toHaveBeenCalledTimes(1)
			expect(result.facilityId).toBe("fac-1")
		})

		it("is idempotent — second get returns same row without error", async () => {
			const row = makeRow()
			;(db.insert as jest.Mock).mockReturnValue(mockInsertChain())
			;(db.select as jest.Mock).mockReturnValue(mockSelectChain([row]))

			// Call twice (simulates second request for same facility)
			await service.get("fac-1")
			;(db.insert as jest.Mock).mockReturnValue(mockInsertChain())
			;(db.select as jest.Mock).mockReturnValue(mockSelectChain([row]))
			const result2 = await service.get("fac-1")

			expect(result2.facilityId).toBe("fac-1")
			expect(db.insert).toHaveBeenCalledTimes(2)
		})
	})

	// ── Update — per-field diff for typed columns ─────────────────────────────

	describe("update()", () => {
		const actor = {
			userId: "user-1",
			facilityId: "fac-1",
			staffProfileId: "staff-1",
			ipAddress: null,
			userAgent: null,
		}

		function setupTransaction(
			currentRow: ReturnType<typeof makeRow>,
			updatedRow: ReturnType<typeof makeRow>
		) {
			;(db.transaction as jest.Mock).mockImplementation(
				async (fn: (tx: unknown) => Promise<unknown>) => {
					const tx = {
						insert: jest.fn().mockReturnValue(mockInsertChain()),
						select: jest.fn().mockReturnValue(mockSelectChain([currentRow])),
						update: jest.fn().mockReturnValue(mockUpdateChain([updatedRow])),
					}
					return fn(tx)
				}
			)
		}

		it("computes diff for changed typed column and writes audit", async () => {
			const current = makeRow({ timezone: "Asia/Manila" })
			const updated = makeRow({ timezone: "UTC" })
			setupTransaction(current, updated)

			await service.update("fac-1", { timezone: "UTC" }, actor)

			expect(mockAuditService.log).toHaveBeenCalledTimes(1)
			const auditCall = mockAuditService.log.mock.calls[0]![0]
			expect(auditCall.action).toBe("update")
			expect(auditCall.entityType).toBe("system_setting")
			expect(auditCall.entityId).toBe("fac-1")

			const changes: Array<{ path: string; before: unknown; after: unknown }> =
				auditCall.metadata.changes
			const tzChange = changes.find(c => c.path === "timezone")
			expect(tzChange).toBeDefined()
			expect(tzChange!.before).toBe("Asia/Manila")
			expect(tzChange!.after).toBe("UTC")
		})

		it("computes diff for policySections sub-field paths", async () => {
			const current = makeRow({ policySections: { artaSla: { targetMinutes: 20 } } })
			const updated = makeRow({ policySections: { artaSla: { targetMinutes: 30 } } })
			setupTransaction(current, updated)

			await service.update("fac-1", { policySections: { artaSla: { targetMinutes: 30 } } }, actor)

			expect(mockAuditService.log).toHaveBeenCalledTimes(1)
			const changes: Array<{ path: string; before: unknown; after: unknown }> =
				mockAuditService.log.mock.calls[0]![0].metadata.changes
			const slaChange = changes.find(c => c.path === "policySections.artaSla.targetMinutes")
			expect(slaChange).toBeDefined()
			expect(slaChange!.before).toBe(20)
			expect(slaChange!.after).toBe(30)
		})

		it("does NOT write audit when no fields changed", async () => {
			// Same values → no diff
			const current = makeRow({ timezone: "Asia/Manila" })
			const updated = makeRow({ timezone: "Asia/Manila" })
			setupTransaction(current, updated)

			await service.update("fac-1", { timezone: "Asia/Manila" }, actor)

			expect(mockAuditService.log).not.toHaveBeenCalled()
		})

		it("computes new-field diff correctly when policySections section didn't exist before", async () => {
			const current = makeRow({ policySections: {} })
			const updated = makeRow({ policySections: { artaSla: { targetMinutes: 15 } } })
			setupTransaction(current, updated)

			await service.update("fac-1", { policySections: { artaSla: { targetMinutes: 15 } } }, actor)

			const changes: Array<{ path: string; before: unknown; after: unknown }> =
				mockAuditService.log.mock.calls[0]![0].metadata.changes
			const added = changes.find(c => c.path === "policySections.artaSla.targetMinutes")
			expect(added).toBeDefined()
			expect(added!.before).toBeNull()
			expect(added!.after).toBe(15)
		})
	})
})
