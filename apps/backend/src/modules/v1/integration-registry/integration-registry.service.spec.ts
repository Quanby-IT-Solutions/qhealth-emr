/**
 * IntegrationRegistryService tests.
 *
 * Covers:
 * 1. credentialStatus derivation matrix — all 4 states
 * 2. Whitelist enforcement on write — create/update throw when credentialsRef not in whitelist
 * 3. Atomic audit on mutations — create/update/delete all write audit; update with no changes skips
 */

import { BadRequestException, NotFoundException } from "@nestjs/common"

import { db } from "@/common/database/database.client"

import { IntegrationRegistryService } from "./integration-registry.service"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/common/database/database.client", () => ({
	db: {
		select: jest.fn(),
		insert: jest.fn(),
		update: jest.fn(),
		delete: jest.fn(),
		transaction: jest.fn(),
	},
}))

jest.mock("@repo/db/schema", () => ({
	integrations: {
		id: "id",
		facilityId: "facilityId",
		kind: "kind",
		name: "name",
		endpointUrl: "endpointUrl",
		credentialsRef: "credentialsRef",
		enabled: "enabled",
		notes: "notes",
		updatedAt: "updatedAt",
	},
}))

jest.mock("@/config/app.config", () => ({
	INTEGRATION_CREDENTIAL_ENV_VARS: ["FHIR_API_KEY", "HAI_API_KEY", "PHILHEALTH_CEWS_API_KEY"],
}))

const mockAuditService = {
	log: jest.fn().mockResolvedValue(undefined),
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_FACILITY_ID = "550e8400-e29b-41d4-a716-446655440001"
const TEST_INTEGRATION_ID = "550e8400-e29b-41d4-a716-446655440000"

const actor = {
	userId: "user-1",
	facilityId: TEST_FACILITY_ID,
	staffProfileId: "staff-1",
}

function makeRow(
	overrides: Record<string, unknown> = {}
): Record<string, unknown> {
	return {
		id: TEST_INTEGRATION_ID,
		facilityId: TEST_FACILITY_ID,
		kind: "fhir",
		name: "NHDR FHIR",
		endpointUrl: "https://nhdr.gov.ph/fhir",
		credentialsRef: null,
		enabled: false,
		notes: null,
		lastSyncAt: null,
		lastSyncStatus: null,
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-01"),
		...overrides,
	}
}

function mockSelectChain(rows: unknown[]) {
	return {
		from: jest.fn().mockReturnValue({
			where: jest.fn().mockResolvedValue(rows),
		}),
	}
}

function mockInsertChain(returnRow: unknown) {
	return {
		values: jest.fn().mockReturnValue({
			returning: jest.fn().mockResolvedValue([returnRow]),
		}),
	}
}

function mockUpdateChain(returnRow: unknown) {
	return {
		set: jest.fn().mockReturnValue({
			where: jest.fn().mockReturnValue({
				returning: jest.fn().mockResolvedValue([returnRow]),
			}),
		}),
	}
}

function mockDeleteChain() {
	return {
		where: jest.fn().mockResolvedValue(undefined),
	}
}

function setupTransaction(impl: (tx: unknown) => Promise<unknown>) {
	;(db.transaction as jest.Mock).mockImplementation(impl)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("IntegrationRegistryService", () => {
	let service: IntegrationRegistryService

	beforeEach(() => {
		jest.clearAllMocks()
		// Reset env
		delete process.env.FHIR_API_KEY
		delete process.env.HAI_API_KEY
		service = new IntegrationRegistryService(mockAuditService as never)
	})

	// ── credentialStatus derivation ───────────────────────────────────────────

	describe("credentialStatus via list()", () => {
		it('returns "unset" when credentialsRef is null', async () => {
			const row = makeRow({ credentialsRef: null })
			;(db.select as jest.Mock).mockReturnValue(mockSelectChain([row]))

			const results = await service.list(TEST_FACILITY_ID)

			expect(results[0]!.credentialStatus).toBe("unset")
		})

		it('returns "not_in_whitelist" when credentialsRef is not in whitelist', async () => {
			const row = makeRow({ credentialsRef: "UNKNOWN_API_KEY" })
			;(db.select as jest.Mock).mockReturnValue(mockSelectChain([row]))

			const results = await service.list(TEST_FACILITY_ID)

			expect(results[0]!.credentialStatus).toBe("not_in_whitelist")
		})

		it('returns "missing_in_env" when ref is whitelisted but env var is not set', async () => {
			delete process.env.FHIR_API_KEY
			const row = makeRow({ credentialsRef: "FHIR_API_KEY" })
			;(db.select as jest.Mock).mockReturnValue(mockSelectChain([row]))

			const results = await service.list(TEST_FACILITY_ID)

			expect(results[0]!.credentialStatus).toBe("missing_in_env")
		})

		it('returns "ok" when ref is whitelisted and env var is set', async () => {
			process.env.FHIR_API_KEY = "secret-token"
			const row = makeRow({ credentialsRef: "FHIR_API_KEY" })
			;(db.select as jest.Mock).mockReturnValue(mockSelectChain([row]))

			const results = await service.list(TEST_FACILITY_ID)

			expect(results[0]!.credentialStatus).toBe("ok")
		})
	})

	// ── Whitelist enforcement ─────────────────────────────────────────────────

	describe("whitelist enforcement", () => {
		it("create() throws BadRequestException when credentialsRef is not in whitelist", async () => {
			await expect(
				service.create(
					TEST_FACILITY_ID,
					{
						kind: "fhir",
						name: "Test",
						endpointUrl: "https://api.example.com",
						credentialsRef: "UNLISTED_KEY",
					},
					actor
				)
			).rejects.toThrow(BadRequestException)
		})

		it("create() does not throw when credentialsRef is in whitelist", async () => {
			const row = makeRow({ credentialsRef: "FHIR_API_KEY" })
			;(db.transaction as jest.Mock).mockImplementation(
				async (fn: (tx: unknown) => Promise<unknown>) => {
					const tx = {
						insert: jest.fn().mockReturnValue(mockInsertChain(row)),
					}
					return fn(tx)
				}
			)

			// Should not throw
			await expect(
				service.create(
					TEST_FACILITY_ID,
					{
						kind: "fhir",
						name: "NHDR",
						endpointUrl: "https://nhdr.gov.ph/fhir",
						credentialsRef: "FHIR_API_KEY",
					},
					actor
				)
			).resolves.toMatchObject({ credentialsRef: "FHIR_API_KEY" })
		})

		it("create() does not throw when credentialsRef is null (unset)", async () => {
			const row = makeRow({ credentialsRef: null })
			;(db.transaction as jest.Mock).mockImplementation(
				async (fn: (tx: unknown) => Promise<unknown>) => {
					const tx = {
						insert: jest.fn().mockReturnValue(mockInsertChain(row)),
					}
					return fn(tx)
				}
			)

			await expect(
				service.create(
					TEST_FACILITY_ID,
					{
						kind: "custom",
						name: "Custom",
						endpointUrl: "https://api.example.com",
						credentialsRef: null,
					},
					actor
				)
			).resolves.toMatchObject({ credentialStatus: "unset" })
		})

		it("update() throws BadRequestException when credentialsRef is not in whitelist", async () => {
			await expect(
				service.update(
					TEST_FACILITY_ID,
					{
						id: TEST_INTEGRATION_ID,
						credentialsRef: "UNLISTED_KEY",
					},
					actor
				)
			).rejects.toThrow(BadRequestException)
		})
	})

	// ── Atomic audit on mutations ─────────────────────────────────────────────

	describe("atomic audit", () => {
		describe("create()", () => {
			it("writes audit with action=create and correct entityType", async () => {
				const row = makeRow()
				;(db.transaction as jest.Mock).mockImplementation(
					async (fn: (tx: unknown) => Promise<unknown>) => {
						const tx = {
							insert: jest.fn().mockReturnValue(mockInsertChain(row)),
						}
						return fn(tx)
					}
				)

				await service.create(
					TEST_FACILITY_ID,
					{
						kind: "fhir",
						name: "NHDR",
						endpointUrl: "https://nhdr.gov.ph/fhir",
					},
					actor
				)

				expect(mockAuditService.log).toHaveBeenCalledTimes(1)
				const call = mockAuditService.log.mock.calls[0]![0]
				expect(call.action).toBe("create")
				expect(call.entityType).toBe("integration")
				expect(call.entityId).toBe(TEST_INTEGRATION_ID)
				expect(call.beforeState).toBeNull()
				expect(call.afterState).toBeDefined()
			})
		})

		describe("update()", () => {
			function setupUpdateTransaction(currentRow: unknown, updatedRow: unknown) {
				setupTransaction(async (tx: unknown) => {
					const txTyped = tx as {
						select: jest.Mock
						update: jest.Mock
					}
					txTyped.select = jest.fn().mockReturnValue(mockSelectChain([currentRow]))
					txTyped.update = jest.fn().mockReturnValue(mockUpdateChain(updatedRow))
					// Invoke the transaction function body
					const result = await (
						db.transaction as jest.Mock
					).mock.calls[0]?.[0]?.(txTyped)
					return result
				})
			}

			it("writes audit with changes when fields differ", async () => {
				const current = makeRow({ name: "Old Name" })
				const updated = makeRow({ name: "New Name" })

				;(db.transaction as jest.Mock).mockImplementation(
					async (fn: (tx: unknown) => Promise<unknown>) => {
						const tx = {
							select: jest.fn().mockReturnValue(mockSelectChain([current])),
							update: jest.fn().mockReturnValue(mockUpdateChain(updated)),
						}
						return fn(tx)
					}
				)

				await service.update(TEST_FACILITY_ID, { id: TEST_INTEGRATION_ID, name: "New Name" }, actor)

				expect(mockAuditService.log).toHaveBeenCalledTimes(1)
				const call = mockAuditService.log.mock.calls[0]![0]
				expect(call.action).toBe("update")
				expect(call.entityType).toBe("integration")
				const changes = call.metadata.changes as Array<{ path: string; before: unknown; after: unknown }>
				const nameChange = changes.find(c => c.path === "name")
				expect(nameChange).toBeDefined()
				expect(nameChange!.before).toBe("Old Name")
				expect(nameChange!.after).toBe("New Name")
			})

			it("does NOT write audit when no fields changed", async () => {
				const current = makeRow({ name: "Same Name" })
				const updated = makeRow({ name: "Same Name" })

				;(db.transaction as jest.Mock).mockImplementation(
					async (fn: (tx: unknown) => Promise<unknown>) => {
						const tx = {
							select: jest.fn().mockReturnValue(mockSelectChain([current])),
							update: jest.fn().mockReturnValue(mockUpdateChain(updated)),
						}
						return fn(tx)
					}
				)

				await service.update(TEST_FACILITY_ID, { id: TEST_INTEGRATION_ID, name: "Same Name" }, actor)

				expect(mockAuditService.log).not.toHaveBeenCalled()
			})

			it("throws NotFoundException when integration does not exist", async () => {
				;(db.transaction as jest.Mock).mockImplementation(
					async (fn: (tx: unknown) => Promise<unknown>) => {
						const tx = {
							select: jest.fn().mockReturnValue(mockSelectChain([])),
							update: jest.fn(),
						}
						return fn(tx)
					}
				)

				await expect(
					service.update(TEST_FACILITY_ID, { id: TEST_INTEGRATION_ID, name: "x" }, actor)
				).rejects.toThrow(NotFoundException)
			})
		})

		describe("delete()", () => {
			it("writes audit with action=delete, afterState=null", async () => {
				const current = makeRow()

				;(db.transaction as jest.Mock).mockImplementation(
					async (fn: (tx: unknown) => Promise<unknown>) => {
						const tx = {
							select: jest.fn().mockReturnValue(mockSelectChain([current])),
							delete: jest.fn().mockReturnValue(mockDeleteChain()),
						}
						return fn(tx)
					}
				)

				await service.delete(TEST_FACILITY_ID, TEST_INTEGRATION_ID, actor)

				expect(mockAuditService.log).toHaveBeenCalledTimes(1)
				const call = mockAuditService.log.mock.calls[0]![0]
				expect(call.action).toBe("delete")
				expect(call.entityType).toBe("integration")
				expect(call.entityId).toBe(TEST_INTEGRATION_ID)
				expect(call.afterState).toBeNull()
				expect(call.beforeState).toBeDefined()
			})

			it("throws NotFoundException when integration does not exist", async () => {
				;(db.transaction as jest.Mock).mockImplementation(
					async (fn: (tx: unknown) => Promise<unknown>) => {
						const tx = {
							select: jest.fn().mockReturnValue(mockSelectChain([])),
							delete: jest.fn(),
						}
						return fn(tx)
					}
				)

				await expect(
					service.delete(TEST_FACILITY_ID, TEST_INTEGRATION_ID, actor)
				).rejects.toThrow(NotFoundException)
			})
		})
	})

	// ── listCredentialRefs ────────────────────────────────────────────────────

	describe("listCredentialRefs()", () => {
		it("returns the whitelist array", () => {
			const refs = service.listCredentialRefs()
			expect(refs).toContain("FHIR_API_KEY")
			expect(refs).toContain("HAI_API_KEY")
			expect(refs).toContain("PHILHEALTH_CEWS_API_KEY")
			expect(refs.length).toBe(3)
		})
	})
})
