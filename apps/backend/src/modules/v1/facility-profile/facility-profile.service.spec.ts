/**
 * FacilityProfileService tests.
 *
 * Covers:
 * 1. get() auto-provisions the row via ON CONFLICT DO NOTHING (idempotent)
 * 2. update() computes per-field diff and writes audit atomically
 * 3. update() does NOT write audit when no fields changed
 */

import { db } from "@/common/database/database.client"

import { FacilityProfileService } from "./facility-profile.service"

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
	facilityProfiles: {
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

const FACILITY_ID = "550e8400-e29b-41d4-a716-446655440000"

function makeRow(overrides: Record<string, unknown> = {}) {
	return {
		facilityId: FACILITY_ID,
		facilityCode: null,
		governingAuthority: null,
		addressLine1: null,
		addressLine2: null,
		city: null,
		province: null,
		zipCode: null,
		telephone: null,
		email: null,
		adminContactName: null,
		adminContactEmail: null,
		updatedAt: null,
		...overrides,
	}
}

function mockInsertChain() {
	return {
		values: jest.fn().mockReturnValue({
			onConflictDoNothing: jest.fn().mockResolvedValue(undefined),
		}),
	}
}

function mockSelectChain(rows: unknown[]) {
	return {
		from: jest.fn().mockReturnValue({
			where: jest.fn().mockResolvedValue(rows),
		}),
	}
}

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

describe("FacilityProfileService", () => {
	let service: FacilityProfileService

	beforeEach(() => {
		jest.clearAllMocks()
		service = new FacilityProfileService(mockAuditService as never)
	})

	// ── Auto-provision idempotency ────────────────────────────────────────────

	describe("get()", () => {
		it("inserts on first call (auto-provision) then returns the row", async () => {
			const row = makeRow()
			;(db.insert as jest.Mock).mockReturnValue(mockInsertChain())
			;(db.select as jest.Mock).mockReturnValue(mockSelectChain([row]))

			const result = await service.get(FACILITY_ID)

			expect(db.insert).toHaveBeenCalledTimes(1)
			expect(db.select).toHaveBeenCalledTimes(1)
			expect(result.facilityId).toBe(FACILITY_ID)
		})

		it("is idempotent — second get returns same row without error", async () => {
			const row = makeRow()
			;(db.insert as jest.Mock).mockReturnValue(mockInsertChain())
			;(db.select as jest.Mock).mockReturnValue(mockSelectChain([row]))

			await service.get(FACILITY_ID)

			;(db.insert as jest.Mock).mockReturnValue(mockInsertChain())
			;(db.select as jest.Mock).mockReturnValue(mockSelectChain([row]))
			const result2 = await service.get(FACILITY_ID)

			expect(result2.facilityId).toBe(FACILITY_ID)
			expect(db.insert).toHaveBeenCalledTimes(2)
		})
	})

	// ── Update — per-field diff ───────────────────────────────────────────────

	describe("update()", () => {
		const actor = {
			userId: "550e8400-e29b-41d4-a716-446655440001",
			facilityId: FACILITY_ID,
			staffProfileId: "550e8400-e29b-41d4-a716-446655440002",
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

		it("computes diff for changed field and writes audit atomically", async () => {
			const current = makeRow({ telephone: null })
			const updated = makeRow({ telephone: "+63 2 8123 0000" })
			setupTransaction(current, updated)

			await service.update(FACILITY_ID, { telephone: "+63 2 8123 0000" }, actor)

			expect(mockAuditService.log).toHaveBeenCalledTimes(1)
			const auditCall = mockAuditService.log.mock.calls[0]![0]
			expect(auditCall.action).toBe("update")
			expect(auditCall.entityType).toBe("facility_profile")
			expect(auditCall.entityId).toBe(FACILITY_ID)

			const changes: Array<{ path: string; before: unknown; after: unknown }> =
				auditCall.metadata.changes
			const change = changes.find(c => c.path === "telephone")
			expect(change).toBeDefined()
			expect(change!.before).toBeNull()
			expect(change!.after).toBe("+63 2 8123 0000")
		})

		it("computes diff for multiple fields at once", async () => {
			const current = makeRow({ addressLine1: "Old St", city: "Old City" })
			const updated = makeRow({ addressLine1: "123 Health St", city: "Makati" })
			setupTransaction(current, updated)

			await service.update(
				FACILITY_ID,
				{ addressLine1: "123 Health St", city: "Makati" },
				actor
			)

			expect(mockAuditService.log).toHaveBeenCalledTimes(1)
			const changes: Array<{ path: string; before: unknown; after: unknown }> =
				mockAuditService.log.mock.calls[0]![0].metadata.changes
			expect(changes.length).toBe(2)
			expect(changes.some(c => c.path === "addressLine1")).toBe(true)
			expect(changes.some(c => c.path === "city")).toBe(true)
		})

		it("does NOT write audit when no fields changed", async () => {
			const current = makeRow({ facilityCode: "QH-MAIN" })
			const updated = makeRow({ facilityCode: "QH-MAIN" })
			setupTransaction(current, updated)

			await service.update(FACILITY_ID, { facilityCode: "QH-MAIN" }, actor)

			expect(mockAuditService.log).not.toHaveBeenCalled()
		})
	})
})
