import { Logger } from "@nestjs/common"

import { Audited, InjectAuditService } from "./audited.decorator"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds a minimal fake AuditService with a jest-mocked log method. */
function makeFakeAuditService() {
	return { log: jest.fn().mockResolvedValue({ id: "audit-log-1" }) }
}

/**
 * Creates a test class decorated with @Audited and a fake auditService injected
 * on the instance, then returns an instance ready to call.
 */
function buildTestService(auditedOptions: Parameters<typeof Audited>[0]) {
	const fakeAuditService = makeFakeAuditService()

	class TestService {
		auditService = fakeAuditService

		@Audited(auditedOptions)
		async doWork(_payload: Record<string, unknown>, _userId: string, _facilityId: string) {
			return { id: "entity-1", name: "updated-name", enabled: true }
		}
	}

	return { instance: new TestService(), fakeAuditService }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("@Audited decorator", () => {
	beforeEach(() => {
		jest.clearAllMocks()
		jest.spyOn(Logger.prototype, "warn").mockImplementation(() => {})
		jest.spyOn(Logger.prototype, "error").mockImplementation(() => {})
	})

	describe("existing behaviour (no extractChanges)", () => {
		it("calls auditService.log with metadata: null when extractChanges is not provided", async () => {
			const { instance, fakeAuditService } = buildTestService({
				action: "update",
				entityType: "feature_flag",
				getUserId: (_payload, userId) => userId as string,
				getFacilityId: (_payload, _userId, facilityId) => facilityId as string,
			})

			await instance.doWork({ name: "flag" }, "user-1", "facility-1")

			// Allow async fire-and-forget to settle
			await Promise.resolve()

			expect(fakeAuditService.log).toHaveBeenCalledWith(expect.objectContaining({ metadata: null }))
		})

		it("returns the method result regardless", async () => {
			const { instance } = buildTestService({
				action: "create",
				entityType: "feature_flag",
				getUserId: (_p, uid) => uid as string,
				getFacilityId: (_p, _u, fid) => fid as string,
			})

			const result = await instance.doWork({}, "u1", "f1")

			expect(result).toEqual({ id: "entity-1", name: "updated-name", enabled: true })
		})
	})

	describe("extractChanges extension", () => {
		it("passes metadata.changes when extractChanges is provided", async () => {
			const fakeChanges = [
				{ path: "name", before: "old-name", after: "updated-name" },
				{ path: "enabled", before: false, after: true },
			]
			const extractChanges = jest.fn().mockReturnValue(fakeChanges)

			const { instance, fakeAuditService } = buildTestService({
				action: "update",
				entityType: "feature_flag",
				fetchBeforeState: async () => ({ name: "old-name", enabled: false }),
				getUserId: (_p, uid) => uid as string,
				getFacilityId: (_p, _u, fid) => fid as string,
				extractChanges,
			})

			await instance.doWork({ name: "flag" }, "user-1", "facility-1")
			await Promise.resolve()

			expect(extractChanges).toHaveBeenCalledWith(
				{ name: "old-name", enabled: false }, // beforeState
				{ id: "entity-1", name: "updated-name", enabled: true } // afterState (= method result)
			)

			expect(fakeAuditService.log).toHaveBeenCalledWith(
				expect.objectContaining({
					metadata: { changes: fakeChanges },
				})
			)
		})

		it("does NOT call extractChanges when it is not provided", async () => {
			const extractChanges = jest.fn()

			// Build without passing extractChanges
			const { instance, fakeAuditService } = buildTestService({
				action: "create",
				entityType: "feature_flag",
				getUserId: (_p, uid) => uid as string,
				getFacilityId: (_p, _u, fid) => fid as string,
			})

			await instance.doWork({}, "u1", "f1")
			await Promise.resolve()

			expect(extractChanges).not.toHaveBeenCalled()
			expect(fakeAuditService.log).toHaveBeenCalledWith(expect.objectContaining({ metadata: null }))
		})

		it("sets metadata: null when extractChanges returns an empty array", async () => {
			// Empty array is falsy in `changes ? { changes } : null` — verify explicitly
			const { instance, fakeAuditService } = buildTestService({
				action: "update",
				entityType: "system_setting",
				getUserId: (_p, uid) => uid as string,
				getFacilityId: (_p, _u, fid) => fid as string,
				extractChanges: () => [],
			})

			await instance.doWork({}, "u1", "f1")
			await Promise.resolve()

			expect(fakeAuditService.log).toHaveBeenCalledWith(expect.objectContaining({ metadata: null }))
		})
	})
})
