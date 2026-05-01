/**
 * FhirEndpointsService — unit tests for ADM-BE-07
 *
 * Covers:
 * 1. testConnection — success path (HTTP 2xx → status "ok")
 * 2. testConnection — failure path (fetch throws → status "error")
 * 3. upsertEndpoint — creates new endpoint when no id given
 * 4. upsertEndpoint — updates existing endpoint when id provided
 */

import { NotFoundException } from "@nestjs/common"

import { db } from "@/common/database/database.client"

import { FhirEndpointsService } from "./fhir-endpoints.service"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/common/database/database.client", () => ({
	db: {
		select: jest.fn(),
		insert: jest.fn(),
		update: jest.fn(),
		delete: jest.fn(),
	},
}))

jest.mock("@repo/db/schema", () => ({
	fhirEndpoints: {
		id: "id",
		facilityId: "facilityId",
		name: "name",
		endpointUrl: "endpointUrl",
		enabled: "enabled",
		fhirVersion: "fhirVersion",
		authMethod: "authMethod",
		resourceTypes: "resourceTypes",
		cronSchedule: "cronSchedule",
		authCredentialsRef: "authCredentialsRef",
		lastTestedAt: "lastTestedAt",
		lastTestStatus: "lastTestStatus",
		lastTestLatencyMs: "lastTestLatencyMs",
		updatedAt: "updatedAt",
	},
	fhirExchangeLog: {
		id: "id",
		facilityId: "facilityId",
		endpointId: "endpointId",
		status: "status",
		resourceType: "resourceType",
		occurredAt: "occurredAt",
	},
}))

const mockAuditService = {
	log: jest.fn().mockResolvedValue(undefined),
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ENDPOINT_ID = "endpoint-uuid-0001"
const FACILITY_ID = "facility-uuid-0001"
const ACTOR_ID = "user-uuid-admin"

function makeEndpoint(overrides: Record<string, unknown> = {}) {
	return {
		id: ENDPOINT_ID,
		facilityId: FACILITY_ID,
		name: "Test FHIR Server",
		endpointUrl: "https://fhir.example.com",
		fhirVersion: "R4" as const,
		authMethod: "none" as const,
		authCredentialsRef: null,
		resourceTypes: [],
		cronSchedule: null,
		enabled: false,
		lastTestedAt: null,
		lastTestStatus: null,
		lastTestLatencyMs: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	}
}

function mockSelectChainSingle(rows: unknown[]) {
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

function mockUpdateReturningChain(returnRow: unknown) {
	return {
		set: jest.fn().mockReturnValue({
			where: jest.fn().mockReturnValue({
				returning: jest.fn().mockResolvedValue([returnRow]),
			}),
		}),
	}
}

function mockUpdateSetWhereChain() {
	return {
		set: jest.fn().mockReturnValue({
			where: jest.fn().mockResolvedValue(undefined),
		}),
	}
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FhirEndpointsService", () => {
	let service: FhirEndpointsService

	beforeEach(() => {
		jest.clearAllMocks()
		service = new FhirEndpointsService(mockAuditService as never)
	})

	// ── testConnection ────────────────────────────────────────────────────────

	describe("testConnection", () => {
		it("returns status 'ok' when endpoint responds with 2xx", async () => {
			const endpoint = makeEndpoint()
			;(db.select as jest.Mock).mockReturnValueOnce(mockSelectChainSingle([endpoint]))
			;(db.update as jest.Mock).mockReturnValue(mockUpdateSetWhereChain())

			global.fetch = jest.fn().mockResolvedValue({
				status: 200,
			}) as jest.Mock

			const result = await service.testConnection(ENDPOINT_ID, ACTOR_ID)

			expect(result.status).toBe("ok")
			expect(result.httpStatus).toBe(200)
			expect(result.latencyMs).toBeGreaterThanOrEqual(0)
		})

		it("returns status 'error' when fetch throws", async () => {
			const endpoint = makeEndpoint()
			;(db.select as jest.Mock).mockReturnValueOnce(mockSelectChainSingle([endpoint]))
			;(db.update as jest.Mock).mockReturnValue(mockUpdateSetWhereChain())

			global.fetch = jest.fn().mockRejectedValue(new Error("Network unreachable")) as jest.Mock

			const result = await service.testConnection(ENDPOINT_ID, ACTOR_ID)

			expect(result.status).toBe("error")
			expect(result.httpStatus).toBeNull()
			expect(result.detail).toContain("Network unreachable")
		})

		it("returns status 'error' when endpoint not found", async () => {
			;(db.select as jest.Mock).mockReturnValueOnce(mockSelectChainSingle([]))

			await expect(service.testConnection(ENDPOINT_ID, ACTOR_ID)).rejects.toThrow(NotFoundException)
		})
	})

	// ── upsert ────────────────────────────────────────────────────────────────

	describe("upsert", () => {
		const baseInput = {
			facilityId: FACILITY_ID,
			name: "My FHIR Server",
			endpointUrl: "https://fhir.test.com",
		}

		it("creates a new endpoint when no id is provided", async () => {
			const created = makeEndpoint({ name: "My FHIR Server" })
			;(db.insert as jest.Mock).mockReturnValueOnce(mockInsertChain(created))

			const result = await service.upsert(baseInput, ACTOR_ID)

			expect(result.name).toBe("My FHIR Server")
			expect(db.insert).toHaveBeenCalled()
		})

		it("updates an existing endpoint when id is provided", async () => {
			const existing = makeEndpoint()
			const updated = makeEndpoint({ name: "Updated Name" })

			;(db.select as jest.Mock).mockReturnValueOnce(mockSelectChainSingle([existing]))
			;(db.update as jest.Mock).mockReturnValueOnce(mockUpdateReturningChain(updated))

			const result = await service.upsert(
				{ ...baseInput, id: ENDPOINT_ID, name: "Updated Name" },
				ACTOR_ID
			)

			expect(result.name).toBe("Updated Name")
			expect(db.update).toHaveBeenCalled()
		})

		it("throws NotFoundException when updating a non-existent endpoint", async () => {
			;(db.select as jest.Mock).mockReturnValueOnce(mockSelectChainSingle([]))

			await expect(
				service.upsert({ ...baseInput, id: "non-existent-id" }, ACTOR_ID)
			).rejects.toThrow(NotFoundException)
		})
	})
})
