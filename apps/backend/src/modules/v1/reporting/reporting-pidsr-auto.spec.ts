/**
 * PIDSR Auto-Transmission Tests (INTREG-013)
 * Integration Sync Writeback Tests (INTREG-014)
 *
 * Covers:
 *
 * INTREG-013 — generateWeeklyReport auto-transmission
 *   1. No PIDSR integration configured → returns "generated", fetch never called
 *   2. Integration exists, HTTP 200 → returns "submitted"
 *   3. Integration exists, HTTP 500 → returns "failed"
 *   4. Integration exists, fetch throws → returns "failed"
 *
 * INTREG-013 — _autoTransmitPidsrCase (Category 1 immediate auto-send)
 *   5. No integration → returns early, no fetch, no DB writes
 *   6. Integration exists, HTTP 200 → case updated to "submitted"
 *   7. Integration exists, HTTP 500 → case updated to "rejected"
 *
 * INTREG-014 — sync writeback to integrations row
 *   8.  generateWeeklyReport HTTP success → integrations.lastSyncStatus = "ok"
 *   9.  generateWeeklyReport HTTP failure → integrations.lastSyncStatus = "error"
 *   10. generateWeeklyReport fetch error → integrations.lastSyncStatus = "error"
 *   11. submitPidsrCase HTTP success → integrations.lastSyncStatus = "ok"
 *   12. submitPidsrCase HTTP failure → integrations.lastSyncStatus = "error"
 *   13. _autoTransmitPidsrCase HTTP success → integrations.lastSyncStatus = "ok"
 *   14. _autoTransmitPidsrCase HTTP failure → integrations.lastSyncStatus = "error"
 */

import { db } from "@/common/database/database.client"

import { ReportingService } from "./reporting.service"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/common/database/database.client", () => ({
	db: {
		select: jest.fn(),
		update: jest.fn(),
		insert: jest.fn(),
	},
}))

// Proxy-based schema mock — every property resolves to its own name string
jest.mock("@repo/db/schema", () => {
	const proxy = () => new Proxy({}, { get: (_t, p) => String(p) })
	return {
		pidsrCases: proxy(),
		integrations: proxy(),
		encounters: proxy(),
		surveillanceFlags: proxy(),
		patients: proxy(),
		staffProfiles: proxy(),
		problems: proxy(),
		notifications: proxy(),
		ahsrSnapshots: proxy(),
		beds: proxy(),
		bedCensusSnapshots: proxy(),
		clinicalNotes: proxy(),
		haiTags: proxy(),
	}
})

// ---------------------------------------------------------------------------
// DB chain builder helpers
// ---------------------------------------------------------------------------

type MockDb = {
	select: jest.Mock
	update: jest.Mock
	insert: jest.Mock
}

/**
 * Builds a select chain that terminates at `.where()`.
 * Used for multi-row queries: select().from().where()
 */
function selectTerminalAtWhere(result: unknown[]) {
	return {
		from: jest.fn().mockReturnValue({
			where: jest.fn().mockResolvedValue(result),
		}),
	}
}

/**
 * Builds a select chain that terminates at `.limit()`.
 * Used for single-row lookups: select().from().where().limit(1)
 */
function selectTerminalAtLimit(result: unknown[]) {
	return {
		from: jest.fn().mockReturnValue({
			where: jest.fn().mockReturnValue({
				limit: jest.fn().mockResolvedValue(result),
			}),
		}),
	}
}

/**
 * Builds an update chain: update().set().where()
 * Records what was passed to .set() for assertion.
 */
function makeUpdateChain() {
	const whereStub = jest.fn().mockResolvedValue(undefined)
	const setStub = jest.fn().mockReturnValue({ where: whereStub })
	return { setStub, whereStub, chain: { set: setStub } }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FACILITY_ID = "fac-001"
const INTEGRATION_ID = "int-001"
const CASE_ID = "case-001"
const ENDPOINT_URL = "https://pidsr.example.ph/api/submit"

const pidsrIntegrationRow = {
	id: INTEGRATION_ID,
	endpointUrl: ENDPOINT_URL,
	credentialsRef: null,
}

// A minimal PIDSR case row used by submitPidsrCase
const pidsrCaseRow = {
	id: CASE_ID,
	facilityId: FACILITY_ID,
	reportStatus: "draft",
}

/** Minimal weekly-report input */
const weeklyInput = {
	facilityId: FACILITY_ID,
	weekStartDate: "2025-01-06",
}

// ---------------------------------------------------------------------------
// Helpers to configure global.fetch mock
// ---------------------------------------------------------------------------

function mockFetchOk() {
	;(global.fetch as jest.Mock).mockResolvedValue({
		ok: true,
		status: 200,
		text: () => Promise.resolve("OK"),
	})
}

function mockFetchFail(status = 500) {
	;(global.fetch as jest.Mock).mockResolvedValue({
		ok: false,
		status,
		text: () => Promise.resolve(`Internal Server Error`),
	})
}

function mockFetchThrows(message = "ECONNREFUSED") {
	;(global.fetch as jest.Mock).mockRejectedValue(new Error(message))
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("ReportingService — INTREG-013 auto-transmission & INTREG-014 sync writeback", () => {
	let service: ReportingService
	let mockDb: MockDb

	beforeEach(() => {
		jest.clearAllMocks()
		global.fetch = jest.fn()
		service = new ReportingService()
		mockDb = db as unknown as MockDb
	})

	// =========================================================================
	// generateWeeklyReport — INTREG-013
	// =========================================================================

	describe("generateWeeklyReport", () => {
		it("returns status='generated' and skips fetch when no PIDSR integration is configured", async () => {
			// First select: pidsrCases rows for the week (empty, but that's fine)
			mockDb.select
				.mockReturnValueOnce(selectTerminalAtWhere([]))
				// Second select: integration lookup → no integration
				.mockReturnValueOnce(selectTerminalAtLimit([]))

			const result = await service.generateWeeklyReport(weeklyInput)

			expect(result.status).toBe("generated")
			expect((result as { transmissionNote?: string }).transmissionNote).toMatch(/No enabled PIDSR/)
			expect(global.fetch).not.toHaveBeenCalled()
		})

		it("returns status='submitted' when integration exists and HTTP POST succeeds (INTREG-013)", async () => {
			mockDb.select
				.mockReturnValueOnce(selectTerminalAtWhere([]))
				.mockReturnValueOnce(selectTerminalAtLimit([pidsrIntegrationRow]))

			const updateChain = makeUpdateChain()
			mockDb.update.mockReturnValue(updateChain.chain)
			mockFetchOk()

			const result = await service.generateWeeklyReport(weeklyInput)

			expect(result.status).toBe("submitted")
			expect(global.fetch).toHaveBeenCalledTimes(1)
			expect(global.fetch).toHaveBeenCalledWith(
				ENDPOINT_URL,
				expect.objectContaining({ method: "POST" })
			)
		})

		it("returns status='failed' when integration exists but HTTP POST returns error status (INTREG-013)", async () => {
			mockDb.select
				.mockReturnValueOnce(selectTerminalAtWhere([]))
				.mockReturnValueOnce(selectTerminalAtLimit([pidsrIntegrationRow]))

			const updateChain = makeUpdateChain()
			mockDb.update.mockReturnValue(updateChain.chain)
			mockFetchFail(503)

			const result = await service.generateWeeklyReport(weeklyInput)

			expect(result.status).toBe("failed")
			expect((result as { transmissionNote?: string }).transmissionNote).toMatch(
				/Transmission failed/
			)
		})

		it("returns status='failed' when fetch throws a network error (INTREG-013)", async () => {
			mockDb.select
				.mockReturnValueOnce(selectTerminalAtWhere([]))
				.mockReturnValueOnce(selectTerminalAtLimit([pidsrIntegrationRow]))

			const updateChain = makeUpdateChain()
			mockDb.update.mockReturnValue(updateChain.chain)
			mockFetchThrows("ECONNREFUSED")

			const result = await service.generateWeeklyReport(weeklyInput)

			expect(result.status).toBe("failed")
			expect((result as { transmissionNote?: string }).transmissionNote).toMatch(/ECONNREFUSED/)
		})

		// INTREG-014: sync writeback

		it("writes lastSyncStatus='ok' to the integration row after a successful transmission (INTREG-014)", async () => {
			mockDb.select
				.mockReturnValueOnce(selectTerminalAtWhere([]))
				.mockReturnValueOnce(selectTerminalAtLimit([pidsrIntegrationRow]))

			const updateChain = makeUpdateChain()
			mockDb.update.mockReturnValue(updateChain.chain)
			mockFetchOk()

			await service.generateWeeklyReport(weeklyInput)

			expect(mockDb.update).toHaveBeenCalledTimes(1)
			expect(updateChain.setStub).toHaveBeenCalledWith(
				expect.objectContaining({ lastSyncStatus: "ok" })
			)
		})

		it("writes lastSyncStatus='error' to the integration row after a failed HTTP response (INTREG-014)", async () => {
			mockDb.select
				.mockReturnValueOnce(selectTerminalAtWhere([]))
				.mockReturnValueOnce(selectTerminalAtLimit([pidsrIntegrationRow]))

			const updateChain = makeUpdateChain()
			mockDb.update.mockReturnValue(updateChain.chain)
			mockFetchFail()

			await service.generateWeeklyReport(weeklyInput)

			expect(mockDb.update).toHaveBeenCalledTimes(1)
			expect(updateChain.setStub).toHaveBeenCalledWith(
				expect.objectContaining({ lastSyncStatus: "error" })
			)
		})

		it("writes lastSyncStatus='error' to the integration row when fetch throws (INTREG-014)", async () => {
			mockDb.select
				.mockReturnValueOnce(selectTerminalAtWhere([]))
				.mockReturnValueOnce(selectTerminalAtLimit([pidsrIntegrationRow]))

			const updateChain = makeUpdateChain()
			mockDb.update.mockReturnValue(updateChain.chain)
			mockFetchThrows()

			await service.generateWeeklyReport(weeklyInput)

			expect(mockDb.update).toHaveBeenCalledTimes(1)
			expect(updateChain.setStub).toHaveBeenCalledWith(
				expect.objectContaining({ lastSyncStatus: "error" })
			)
		})
	})

	// =========================================================================
	// submitPidsrCase — INTREG-014 sync writeback
	// =========================================================================

	describe("submitPidsrCase", () => {
		it("writes lastSyncStatus='ok' to the integration row after a successful submission (INTREG-014)", async () => {
			// Select 1: existing case
			mockDb.select
				.mockReturnValueOnce(selectTerminalAtLimit([pidsrCaseRow]))
				// Select 2: integration lookup
				.mockReturnValueOnce(selectTerminalAtLimit([pidsrIntegrationRow]))

			const updateChain = makeUpdateChain()
			mockDb.update.mockReturnValue(updateChain.chain)
			mockFetchOk()

			const result = await service.submitPidsrCase({ id: CASE_ID })

			expect(result.success).toBe(true)
			// Two update calls: one for pidsrCases, one for integrations
			expect(mockDb.update).toHaveBeenCalledTimes(2)
			// The second update is the integration writeback
			expect(updateChain.setStub).toHaveBeenCalledWith(
				expect.objectContaining({ lastSyncStatus: "ok" })
			)
		})

		it("writes lastSyncStatus='error' to the integration row when HTTP submission fails (INTREG-014)", async () => {
			mockDb.select
				.mockReturnValueOnce(selectTerminalAtLimit([pidsrCaseRow]))
				.mockReturnValueOnce(selectTerminalAtLimit([pidsrIntegrationRow]))

			const updateChain = makeUpdateChain()
			mockDb.update.mockReturnValue(updateChain.chain)
			mockFetchFail(422)

			const result = await service.submitPidsrCase({ id: CASE_ID })

			expect(result.success).toBe(false)
			expect(mockDb.update).toHaveBeenCalledTimes(2)
			expect(updateChain.setStub).toHaveBeenCalledWith(
				expect.objectContaining({ lastSyncStatus: "error" })
			)
		})

		it("returns blocked result and skips integration writeback when no integration is configured", async () => {
			mockDb.select
				.mockReturnValueOnce(selectTerminalAtLimit([pidsrCaseRow]))
				// No integration
				.mockReturnValueOnce(selectTerminalAtLimit([]))

			const updateChain = makeUpdateChain()
			mockDb.update.mockReturnValue(updateChain.chain)

			const result = await service.submitPidsrCase({ id: CASE_ID })

			expect(result.success).toBe(false)
			expect(result.message).toMatch(/blocked/)
			// Only the pidsrCases update (blocked status), no integration writeback
			expect(mockDb.update).toHaveBeenCalledTimes(1)
			expect(updateChain.setStub).not.toHaveBeenCalledWith(
				expect.objectContaining({ lastSyncStatus: expect.anything() })
			)
		})
	})

	// =========================================================================
	// _autoTransmitPidsrCase — INTREG-013 + INTREG-014
	// =========================================================================

	describe("_autoTransmitPidsrCase (internal auto-transmission helper)", () => {
		// Access the private method via type cast
		type WithPrivate = {
			_autoTransmitPidsrCase: (caseId: string, facilityId: string) => Promise<void>
		}

		it("returns early without calling fetch or db.update when no integration is configured (INTREG-013)", async () => {
			mockDb.select.mockReturnValueOnce(selectTerminalAtLimit([]))

			await (service as unknown as WithPrivate)._autoTransmitPidsrCase(CASE_ID, FACILITY_ID)

			expect(global.fetch).not.toHaveBeenCalled()
			expect(mockDb.update).not.toHaveBeenCalled()
		})

		it("updates case to 'submitted' and integration to lastSyncStatus='ok' on HTTP success (INTREG-013 + INTREG-014)", async () => {
			mockDb.select.mockReturnValueOnce(selectTerminalAtLimit([pidsrIntegrationRow]))

			const updateChain = makeUpdateChain()
			mockDb.update.mockReturnValue(updateChain.chain)
			mockFetchOk()

			await (service as unknown as WithPrivate)._autoTransmitPidsrCase(CASE_ID, FACILITY_ID)

			expect(global.fetch).toHaveBeenCalledTimes(1)
			// Two updates: pidsrCases (status) and integrations (lastSyncStatus)
			expect(mockDb.update).toHaveBeenCalledTimes(2)
			// Check both update payloads
			expect(updateChain.setStub).toHaveBeenCalledWith(
				expect.objectContaining({ reportStatus: "submitted" })
			)
			expect(updateChain.setStub).toHaveBeenCalledWith(
				expect.objectContaining({ lastSyncStatus: "ok" })
			)
		})

		it("updates case to 'rejected' and integration to lastSyncStatus='error' on HTTP failure (INTREG-013 + INTREG-014)", async () => {
			mockDb.select.mockReturnValueOnce(selectTerminalAtLimit([pidsrIntegrationRow]))

			const updateChain = makeUpdateChain()
			mockDb.update.mockReturnValue(updateChain.chain)
			mockFetchFail(503)

			await (service as unknown as WithPrivate)._autoTransmitPidsrCase(CASE_ID, FACILITY_ID)

			expect(mockDb.update).toHaveBeenCalledTimes(2)
			expect(updateChain.setStub).toHaveBeenCalledWith(
				expect.objectContaining({ reportStatus: "rejected" })
			)
			expect(updateChain.setStub).toHaveBeenCalledWith(
				expect.objectContaining({ lastSyncStatus: "error" })
			)
		})

		it("updates case to 'rejected' and integration to lastSyncStatus='error' when fetch throws (INTREG-014)", async () => {
			mockDb.select.mockReturnValueOnce(selectTerminalAtLimit([pidsrIntegrationRow]))

			const updateChain = makeUpdateChain()
			mockDb.update.mockReturnValue(updateChain.chain)
			mockFetchThrows("Network error")

			await (service as unknown as WithPrivate)._autoTransmitPidsrCase(CASE_ID, FACILITY_ID)

			expect(mockDb.update).toHaveBeenCalledTimes(2)
			expect(updateChain.setStub).toHaveBeenCalledWith(
				expect.objectContaining({ lastSyncStatus: "error" })
			)
		})
	})
})
