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
		lastTestedAt: "lastTestedAt",
		lastTestStatus: "lastTestStatus",
		lastTestReadinessLevel: "lastTestReadinessLevel",
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
	ipAddress: null,
	userAgent: null,
}

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
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

			const results = await service.list(TEST_FACILITY_ID, actor)

			expect(results[0]!.credentialStatus).toBe("unset")
		})

		it('returns "not_in_whitelist" when credentialsRef is not in whitelist', async () => {
			const row = makeRow({ credentialsRef: "UNKNOWN_API_KEY" })
			;(db.select as jest.Mock).mockReturnValue(mockSelectChain([row]))

			const results = await service.list(TEST_FACILITY_ID, actor)

			expect(results[0]!.credentialStatus).toBe("not_in_whitelist")
		})

		it('returns "missing_in_env" when ref is whitelisted but env var is not set', async () => {
			delete process.env.FHIR_API_KEY
			const row = makeRow({ credentialsRef: "FHIR_API_KEY" })
			;(db.select as jest.Mock).mockReturnValue(mockSelectChain([row]))

			const results = await service.list(TEST_FACILITY_ID, actor)

			expect(results[0]!.credentialStatus).toBe("missing_in_env")
		})

		it('returns "ok" when ref is whitelisted and env var is set', async () => {
			process.env.FHIR_API_KEY = "secret-token"
			const row = makeRow({ credentialsRef: "FHIR_API_KEY" })
			;(db.select as jest.Mock).mockReturnValue(mockSelectChain([row]))

			const results = await service.list(TEST_FACILITY_ID, actor)

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
					const result = await (db.transaction as jest.Mock).mock.calls[0]?.[0]?.(txTyped)
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
				const changes = call.metadata.changes as Array<{
					path: string
					before: unknown
					after: unknown
				}>
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

				await service.update(
					TEST_FACILITY_ID,
					{ id: TEST_INTEGRATION_ID, name: "Same Name" },
					actor
				)

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

			it("throws BadRequestException when connection-critical field changes on enabled integration", async () => {
				const current = makeRow({
					enabled: true,
					endpointUrl: "https://old.endpoint.ph/fhir",
					lastTestedAt: new Date(),
					lastTestStatus: "ok",
					lastTestReadinessLevel: "activation",
				})

				;(db.transaction as jest.Mock).mockImplementation(
					async (fn: (tx: unknown) => Promise<unknown>) => {
						const tx = {
							select: jest.fn().mockReturnValue(mockSelectChain([current])),
							update: jest.fn().mockReturnValue(mockUpdateChain(current)),
						}
						return fn(tx)
					}
				)

				await expect(
					service.update(
						TEST_FACILITY_ID,
						{ id: TEST_INTEGRATION_ID, endpointUrl: "https://new.endpoint.ph/fhir" },
						actor
					)
				).rejects.toThrow(BadRequestException)
			})

			it("nulls readiness proof when connection field changes on disabled integration", async () => {
				const current = makeRow({
					enabled: false,
					endpointUrl: "https://old.endpoint.ph/fhir",
					lastTestedAt: new Date(),
					lastTestStatus: "ok",
					lastTestReadinessLevel: "activation",
				})
				const updatedRow = {
					...current,
					endpointUrl: "https://new.endpoint.ph/fhir",
					lastTestedAt: null,
					lastTestStatus: null,
					lastTestReadinessLevel: null,
				}

				let capturedSetPayload: unknown
				;(db.transaction as jest.Mock).mockImplementation(
					async (fn: (tx: unknown) => Promise<unknown>) => {
						const tx = {
							select: jest.fn().mockReturnValue(mockSelectChain([current])),
							update: jest.fn().mockReturnValue({
								set: jest.fn().mockImplementation((payload: unknown) => {
									capturedSetPayload = payload
									return {
										where: jest.fn().mockReturnValue({
											returning: jest.fn().mockResolvedValue([updatedRow]),
										}),
									}
								}),
							}),
						}
						return fn(tx)
					}
				)

				await service.update(
					TEST_FACILITY_ID,
					{ id: TEST_INTEGRATION_ID, endpointUrl: "https://new.endpoint.ph/fhir" },
					actor
				)

				expect(capturedSetPayload).toMatchObject({
					lastTestedAt: null,
					lastTestStatus: null,
					lastTestReadinessLevel: null,
				})
			})

			it("throws BadRequestException when enabling FHIR/NHDR with transport-grade readiness (activation required for these kinds)", async () => {
				// FHIR and NHDR require activation-grade proof (CapabilityStatement / /submissions 2xx).
				// A credentialed transport probe returns status=ok + readinessLevel=transport —
				// this should NOT be sufficient to enable a FHIR integration.
				const current = makeRow({
					kind: "fhir",
					enabled: false,
					lastTestedAt: new Date(),
					lastTestStatus: "ok",
					lastTestReadinessLevel: "transport",
				})

				;(db.transaction as jest.Mock).mockImplementation(
					async (fn: (tx: unknown) => Promise<unknown>) => {
						const tx = {
							select: jest.fn().mockReturnValue(mockSelectChain([current])),
							update: jest.fn().mockReturnValue(mockUpdateChain(current)),
						}
						return fn(tx)
					}
				)

				await expect(
					service.update(TEST_FACILITY_ID, { id: TEST_INTEGRATION_ID, enabled: true }, actor)
				).rejects.toThrow(BadRequestException)
			})

			it("allows enabling PIDSR with transport-grade readiness (transport is the honest ceiling for submission-based kinds)", async () => {
				// For submission-based kinds (pidsr, hai, erp, etc.) the strongest automated proof
				// is a credentialed transport 2xx. Allow enabling when status=ok regardless of level.
				const updatedRow = makeRow({
					kind: "pidsr",
					enabled: true,
					lastTestedAt: new Date(),
					lastTestStatus: "ok",
					lastTestReadinessLevel: "transport",
				})
				const current = { ...updatedRow, enabled: false }

				;(db.transaction as jest.Mock).mockImplementation(
					async (fn: (tx: unknown) => Promise<unknown>) => {
						const tx = {
							select: jest.fn().mockReturnValue(mockSelectChain([current])),
							update: jest.fn().mockReturnValue(mockUpdateChain(updatedRow)),
						}
						return fn(tx)
					}
				)

				const result = await service.update(
					TEST_FACILITY_ID,
					{ id: TEST_INTEGRATION_ID, enabled: true },
					actor
				)

				expect(result.enabled).toBe(true)
			})

			it("allows enabling HAI with transport-grade readiness (non-FHIR transport-grade suffices)", async () => {
				const updatedRow = makeRow({
					kind: "hai",
					enabled: true,
					lastTestedAt: new Date(),
					lastTestStatus: "ok",
					lastTestReadinessLevel: "transport",
				})
				const current = { ...updatedRow, enabled: false }

				;(db.transaction as jest.Mock).mockImplementation(
					async (fn: (tx: unknown) => Promise<unknown>) => {
						const tx = {
							select: jest.fn().mockReturnValue(mockSelectChain([current])),
							update: jest.fn().mockReturnValue(mockUpdateChain(updatedRow)),
						}
						return fn(tx)
					}
				)

				const result = await service.update(
					TEST_FACILITY_ID,
					{ id: TEST_INTEGRATION_ID, enabled: true },
					actor
				)

				expect(result.enabled).toBe(true)
			})

			it("still blocks enabling NHDR with transport-grade readiness (activation required for NHDR)", async () => {
				const current = makeRow({
					kind: "nhdr",
					enabled: false,
					lastTestedAt: new Date(),
					lastTestStatus: "ok",
					lastTestReadinessLevel: "transport",
				})

				;(db.transaction as jest.Mock).mockImplementation(
					async (fn: (tx: unknown) => Promise<unknown>) => {
						const tx = {
							select: jest.fn().mockReturnValue(mockSelectChain([current])),
							update: jest.fn().mockReturnValue(mockUpdateChain(current)),
						}
						return fn(tx)
					}
				)

				await expect(
					service.update(TEST_FACILITY_ID, { id: TEST_INTEGRATION_ID, enabled: true }, actor)
				).rejects.toThrow(BadRequestException)
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

				await expect(service.delete(TEST_FACILITY_ID, TEST_INTEGRATION_ID, actor)).rejects.toThrow(
					NotFoundException
				)
			})
		})
	})

	// ── listCredentialRefs ────────────────────────────────────────────────────

	describe("listCredentialRefs()", () => {
		it("returns the whitelist array", async () => {
			const refs = await service.listCredentialRefs(actor)
			expect(refs).toContain("FHIR_API_KEY")
			expect(refs).toContain("HAI_API_KEY")
			expect(refs).toContain("PHILHEALTH_CEWS_API_KEY")
			expect(refs.length).toBe(3)
		})
	})

	// ── Audit logging for sensitive reads ─────────────────────────────────

	describe("audit logging for reads", () => {
		it("list() writes audit with event=integration_list_viewed", async () => {
			const row = makeRow()
			;(db.select as jest.Mock).mockReturnValue(mockSelectChain([row]))

			await service.list(TEST_FACILITY_ID, actor)

			expect(mockAuditService.log).toHaveBeenCalledTimes(1)
			const call = mockAuditService.log.mock.calls[0]![0]
			expect(call.action).toBe("read")
			expect(call.entityType).toBe("integration")
			expect(call.entityId).toBe(TEST_FACILITY_ID)
			expect(call.metadata.event).toBe("integration_list_viewed")
			expect(call.metadata.count).toBe(1)
		})

		it("get() writes audit with event=integration_viewed when actor provided", async () => {
			const row = makeRow()
			;(db.select as jest.Mock).mockReturnValue(mockSelectChain([row]))

			await service.get(TEST_FACILITY_ID, TEST_INTEGRATION_ID, actor)

			expect(mockAuditService.log).toHaveBeenCalledTimes(1)
			const call = mockAuditService.log.mock.calls[0]![0]
			expect(call.action).toBe("read")
			expect(call.entityType).toBe("integration")
			expect(call.entityId).toBe(TEST_INTEGRATION_ID)
			expect(call.metadata.event).toBe("integration_viewed")
		})

		it("get() does NOT write audit when called without actor (internal guard use)", async () => {
			const row = makeRow()
			;(db.select as jest.Mock).mockReturnValue(mockSelectChain([row]))

			await service.get(TEST_FACILITY_ID, TEST_INTEGRATION_ID)

			expect(mockAuditService.log).not.toHaveBeenCalled()
		})

		it("listCredentialRefs() writes audit with event=credential_refs_enumerated", async () => {
			await service.listCredentialRefs(actor)

			expect(mockAuditService.log).toHaveBeenCalledTimes(1)
			const call = mockAuditService.log.mock.calls[0]![0]
			expect(call.action).toBe("read")
			expect(call.entityType).toBe("integration")
			expect(call.entityId).toBe(actor.facilityId)
			expect(call.metadata.event).toBe("credential_refs_enumerated")
		})
	})

	// ── testConnectivity — activation-grade validation ────────────────────────

	describe("testConnectivity()", () => {
		const mockIntegrationRow = {
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
			lastTestedAt: null,
			lastTestStatus: null,
			lastTestReadinessLevel: null,
			webhookUrl: null,
			createdAt: new Date("2024-01-01"),
			updatedAt: new Date("2024-01-01"),
		}

		function mockGetRow(overrides: Record<string, unknown> = {}) {
			;(db.select as jest.Mock).mockReturnValue(
				mockSelectChain([{ ...mockIntegrationRow, ...overrides }])
			)
		}

		function mockUpdateChainForTest() {
			;(db.transaction as jest.Mock).mockImplementation(
				async (fn: (tx: unknown) => Promise<unknown>) => {
					const tx = {
						update: jest.fn().mockReturnValue({
							set: jest.fn().mockReturnValue({
								where: jest.fn().mockResolvedValue(undefined),
							}),
						}),
					}
					return fn(tx)
				}
			)
		}

		function mockFetch(responses: Array<Response | Error>) {
			let call = 0
			global.fetch = jest.fn().mockImplementation(() => {
				const r = responses[call++]
				if (r instanceof Error) return Promise.reject(r)
				return Promise.resolve(r)
			})
		}

		function fakeResponse(status: number, body: unknown = null): Response {
			return {
				status,
				ok: status >= 200 && status < 300,
				json: () => Promise.resolve(body),
				text: () => Promise.resolve(JSON.stringify(body)),
			} as unknown as Response
		}

		afterEach(() => {
			jest.restoreAllMocks()
		})

		it("FHIR: returns readinessLevel=activation when /metadata returns CapabilityStatement", async () => {
			mockGetRow({ kind: "fhir", credentialsRef: null })
			mockUpdateChainForTest()
			mockFetch([fakeResponse(200, { resourceType: "CapabilityStatement", fhirVersion: "4.0.1" })])

			const result = await service.testConnectivity(TEST_FACILITY_ID, TEST_INTEGRATION_ID, actor)

			expect(result.status).toBe("ok")
			expect(result.readinessLevel).toBe("activation")
			expect(result.credentialProbed).toBe(false)
			const capCheck = result.checks.find(c => c.name === "fhir-capability-statement")
			expect(capCheck?.status).toBe("pass")
		})

		it("FHIR: returns readinessLevel=transport when /metadata is 2xx but not CapabilityStatement", async () => {
			mockGetRow({ kind: "fhir", credentialsRef: null })
			mockUpdateChainForTest()
			mockFetch([fakeResponse(200, { resourceType: "OperationOutcome" })])

			const result = await service.testConnectivity(TEST_FACILITY_ID, TEST_INTEGRATION_ID, actor)

			expect(result.status).toBe("error")
			expect(result.readinessLevel).toBe("transport")
			const capCheck = result.checks.find(c => c.name === "fhir-capability-statement")
			expect(capCheck?.status).toBe("fail")
		})

		it("NHDR: returns readinessLevel=activation when /submissions returns 2xx (X-API-Key probe)", async () => {
			process.env.FHIR_API_KEY = "test-nhdr-token"
			mockGetRow({ kind: "nhdr", credentialsRef: "FHIR_API_KEY" })
			mockUpdateChainForTest()
			mockFetch([fakeResponse(200)])

			const result = await service.testConnectivity(TEST_FACILITY_ID, TEST_INTEGRATION_ID, actor)

			expect(result.status).toBe("ok")
			expect(result.readinessLevel).toBe("activation")
			expect(result.credentialProbed).toBe(true)
			const check = result.checks.find(c => c.name === "nhdr-submissions-endpoint")
			expect(check?.status).toBe("pass")
		})

		it("NHDR: probes /submissions path (not root URL) with X-API-Key header", async () => {
			process.env.FHIR_API_KEY = "test-nhdr-token"
			mockGetRow({
				kind: "nhdr",
				credentialsRef: "FHIR_API_KEY",
				endpointUrl: "https://nhdr.gov.ph/fhir",
			})
			mockUpdateChainForTest()
			mockFetch([fakeResponse(200)])

			await service.testConnectivity(TEST_FACILITY_ID, TEST_INTEGRATION_ID, actor)

			const fetchCalls = (global.fetch as jest.Mock).mock.calls
			expect(fetchCalls.length).toBeGreaterThan(0)
			const firstCallUrl = fetchCalls[0]?.[0] as string
			const firstCallHeaders = fetchCalls[0]?.[1]?.headers as Record<string, string>
			expect(firstCallUrl).toBe("https://nhdr.gov.ph/fhir/submissions")
			expect(firstCallHeaders["X-API-Key"]).toBe("test-nhdr-token")
			expect(firstCallHeaders["Authorization"]).toBeUndefined()

			delete process.env.FHIR_API_KEY
		})

		it("NHDR: returns readinessLevel=transport when /submissions returns 401 (credentials rejected)", async () => {
			process.env.FHIR_API_KEY = "wrong-nhdr-token"
			mockGetRow({ kind: "nhdr", credentialsRef: "FHIR_API_KEY" })
			mockUpdateChainForTest()
			mockFetch([fakeResponse(401)])

			const result = await service.testConnectivity(TEST_FACILITY_ID, TEST_INTEGRATION_ID, actor)

			expect(result.readinessLevel).toBe("transport")
			const authCheck = result.checks.find(c => c.name === "auth-acceptance")
			expect(authCheck?.status).toBe("fail")
			expect(authCheck?.detail).toContain("rejected")

			delete process.env.FHIR_API_KEY
		})

		it("NHDR: returns readinessLevel=transport when /submissions returns non-auth 4xx (422 — format rejected)", async () => {
			process.env.FHIR_API_KEY = "test-nhdr-token"
			mockGetRow({ kind: "nhdr", credentialsRef: "FHIR_API_KEY" })
			mockUpdateChainForTest()
			mockFetch([fakeResponse(422)])

			const result = await service.testConnectivity(TEST_FACILITY_ID, TEST_INTEGRATION_ID, actor)

			// 422 means the endpoint exists and responded, but the probe payload was unacceptable.
			// This is NOT activation-grade: the real submission workflow is not proven to work.
			expect(result.status).toBe("error")
			expect(result.readinessLevel).toBe("transport")
			const submissionsCheck = result.checks.find(c => c.name === "nhdr-submissions-endpoint")
			expect(submissionsCheck?.status).toBe("pass") // endpoint reached
			const authCheck = result.checks.find(c => c.name === "auth-acceptance")
			expect(authCheck?.status).toBe("skipped") // credential status indeterminate

			delete process.env.FHIR_API_KEY
		})

		it("NHDR: returns readinessLevel=transport when /submissions returns 5xx (server error)", async () => {
			process.env.FHIR_API_KEY = "test-nhdr-token"
			mockGetRow({ kind: "nhdr", credentialsRef: "FHIR_API_KEY" })
			mockUpdateChainForTest()
			mockFetch([fakeResponse(503)])

			const result = await service.testConnectivity(TEST_FACILITY_ID, TEST_INTEGRATION_ID, actor)

			expect(result.status).toBe("error")
			expect(result.readinessLevel).toBe("transport")
			const check = result.checks.find(c => c.name === "nhdr-submissions-endpoint")
			expect(check?.status).toBe("fail")

			delete process.env.FHIR_API_KEY
		})

		it("NHDR: returns readinessLevel=none when /submissions is unreachable", async () => {
			process.env.FHIR_API_KEY = "test-nhdr-token"
			mockGetRow({ kind: "nhdr", credentialsRef: "FHIR_API_KEY" })
			mockUpdateChainForTest()
			mockFetch([new Error("ECONNREFUSED")])

			const result = await service.testConnectivity(TEST_FACILITY_ID, TEST_INTEGRATION_ID, actor)

			expect(result.status).toBe("error")
			expect(result.readinessLevel).toBe("none")
			expect(result.credentialProbed).toBe(true)

			delete process.env.FHIR_API_KEY
		})

		it("credentialed non-FHIR: returns readinessLevel=transport when 2xx with credentials (transport-grade only; submission contract unproven)", async () => {
			process.env.HAI_API_KEY = "test-hai-token"
			mockGetRow({ kind: "hai", credentialsRef: "HAI_API_KEY" })
			mockUpdateChainForTest()
			// HEAD returns 200
			mockFetch([fakeResponse(200)])

			const result = await service.testConnectivity(TEST_FACILITY_ID, TEST_INTEGRATION_ID, actor)

			// 2xx confirms transport is reachable and credentials appear valid at transport layer,
			// but a HEAD probe cannot prove POST submission payload acceptance — transport-grade only.
			expect(result.status).toBe("ok")
			expect(result.readinessLevel).toBe("transport")
			expect(result.credentialProbed).toBe(true)
			const authCheck = result.checks.find(c => c.name === "auth-acceptance")
			expect(authCheck?.status).toBe("pass")
		})

		it("credentialed non-FHIR: returns readinessLevel=transport when credentials rejected (401)", async () => {
			process.env.HAI_API_KEY = "wrong-token"
			mockGetRow({ kind: "hai", credentialsRef: "HAI_API_KEY" })
			mockUpdateChainForTest()
			// HEAD 401 (rejected)
			mockFetch([fakeResponse(401)])

			const result = await service.testConnectivity(TEST_FACILITY_ID, TEST_INTEGRATION_ID, actor)

			expect(result.status).toBe("error")
			expect(result.readinessLevel).toBe("transport")
			expect(result.credentialProbed).toBe(true)
			const authCheck = result.checks.find(c => c.name === "auth-acceptance")
			expect(authCheck?.status).toBe("fail")
			expect(authCheck?.detail).toContain("rejected")
		})

		it("uncredentialed non-FHIR: returns readinessLevel=transport (cannot prove activation without creds)", async () => {
			mockGetRow({ kind: "erp", credentialsRef: null })
			mockUpdateChainForTest()
			// HEAD returns 200 but no credentials
			mockFetch([fakeResponse(200)])

			const result = await service.testConnectivity(TEST_FACILITY_ID, TEST_INTEGRATION_ID, actor)

			expect(result.status).toBe("error")
			expect(result.readinessLevel).toBe("transport")
			expect(result.credentialProbed).toBe(false)
			const authCheck = result.checks.find(c => c.name === "auth-acceptance")
			expect(authCheck?.status).toBe("skipped")
		})

		it("returns readinessLevel=none when endpoint is unreachable", async () => {
			mockGetRow({ kind: "hai", credentialsRef: null })
			mockUpdateChainForTest()
			// Both HEAD and GET fail with network error
			mockFetch([new Error("ECONNREFUSED"), new Error("ECONNREFUSED")])

			const result = await service.testConnectivity(TEST_FACILITY_ID, TEST_INTEGRATION_ID, actor)

			expect(result.status).toBe("error")
			expect(result.readinessLevel).toBe("none")
			expect(result.latencyMs).toBeDefined()
		})

		it("returns readinessLevel=none when credential env var is missing", async () => {
			delete process.env.HAI_API_KEY
			mockGetRow({ kind: "hai", credentialsRef: "HAI_API_KEY" })
			mockUpdateChainForTest()

			const result = await service.testConnectivity(TEST_FACILITY_ID, TEST_INTEGRATION_ID, actor)

			expect(result.status).toBe("error")
			expect(result.readinessLevel).toBe("none")
			expect(result.credentialProbed).toBe(false)
			expect(result.detail).toContain("HAI_API_KEY")
		})

		it("PIDSR (credentialed): returns readinessLevel=transport when endpoint accepts credential (transport-grade only; POST submission contract unproven)", async () => {
			process.env.PIDSR_API_KEY = "test-pidsr-token"
			mockGetRow({ kind: "pidsr", credentialsRef: "PIDSR_API_KEY" })
			mockUpdateChainForTest()
			// HEAD returns 200 — endpoint reachable, credentials appear valid at transport layer
			mockFetch([fakeResponse(200)])

			const result = await service.testConnectivity(TEST_FACILITY_ID, TEST_INTEGRATION_ID, actor)

			// A transport probe cannot prove PIDSR’s POST submission contract is accepted.
			// status=ok (HTTP 2xx was received) but readinessLevel=transport (not activation).
			expect(result.status).toBe("ok")
			expect(result.readinessLevel).toBe("transport")
			expect(result.credentialProbed).toBe(true)
			const authCheck = result.checks.find(c => c.name === "auth-acceptance")
			expect(authCheck?.status).toBe("pass")

			delete process.env.PIDSR_API_KEY
		})

		it("PIDSR (credentialed): probes with X-API-Key header (not Bearer)", async () => {
			process.env.PIDSR_API_KEY = "test-pidsr-token"
			mockGetRow({
				kind: "pidsr",
				credentialsRef: "PIDSR_API_KEY",
				endpointUrl: "https://pidsr.doh.gov.ph/api",
			})
			mockUpdateChainForTest()
			mockFetch([fakeResponse(200)])

			await service.testConnectivity(TEST_FACILITY_ID, TEST_INTEGRATION_ID, actor)

			const fetchCalls = (global.fetch as jest.Mock).mock.calls
			expect(fetchCalls.length).toBeGreaterThan(0)
			const firstCallHeaders = fetchCalls[0]?.[1]?.headers as Record<string, string>
			expect(firstCallHeaders["X-API-Key"]).toBe("test-pidsr-token")
			expect(firstCallHeaders["Authorization"]).toBeUndefined()

			delete process.env.PIDSR_API_KEY
		})
	})
})
