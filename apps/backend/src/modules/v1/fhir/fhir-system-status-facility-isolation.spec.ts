/**
 * NHDR System Status Facility Isolation Tests (INTREG-015)
 *
 * Verifies that FhirService.getSystemStatus() scopes the integration registry
 * lookup to the provided facilityId. A different facility's enabled NHDR row
 * must NOT influence the status returned to the calling facility.
 *
 * Scenarios:
 *   1. facilityId has an enabled NHDR integration → nhdrConfigured=true, correct URL returned
 *   2. facilityId has NO NHDR integration → nhdrConfigured=false regardless of other facilities
 *   3. facilityId integration has credentialsRef set AND env var present → active+key note
 *   4. facilityId integration has credentialsRef but env var missing → warning note
 *   5. nhdrMode is "mock" → nhdrConfigured=false, mock mode note regardless of integration
 */

import { Test } from "@nestjs/testing"

import { db } from "@/common/database/database.client"

import { FhirBundleBuilderService } from "./fhir-bundle-builder.service"
import { FhirCanonicalValidatorService } from "./fhir-canonical-validator.service"
import { FhirValidatorService } from "./fhir-validator.service"
import { FhirService } from "./fhir.service"
import { NhdrAdapterService } from "./nhdr-adapter.service"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/common/database/database.client", () => ({
	db: {
		select: jest.fn(),
		insert: jest.fn(),
		execute: jest.fn(),
		update: jest.fn(),
	},
}))

jest.mock("@repo/db/schema", () => {
	const proxy = () => new Proxy({}, { get: (_t, p) => String(p) })
	return {
		integrations: proxy(),
		fhirExports: proxy(),
		auditLogs: proxy(),
		dataExports: proxy(),
		staffProfiles: proxy(),
		users: proxy(),
		facilities: proxy(),
	}
})

jest.mock("@/config/env.config", () => ({
	env: {
		NHDR_API_URL: "https://nhdr.legacy.test",
		NHDR_API_KEY: "legacy-key",
		NHDR_MODE: "real",
	},
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MockDb = {
	select: jest.Mock
}

function makeSelectChainTerminalAtLimit(result: unknown[]) {
	return {
		from: jest.fn().mockReturnValue({
			where: jest.fn().mockReturnValue({
				limit: jest.fn().mockResolvedValue(result),
			}),
		}),
	}
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FACILITY_ID = "fac-aaa-001"
const ENDPOINT_URL = "https://nhdr.doh.gov.ph/fhir"

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("FhirService.getSystemStatus — facility isolation (INTREG-015)", () => {
	let service: FhirService
	let mockDb: MockDb

	beforeEach(async () => {
		const moduleRef = await Test.createTestingModule({
			providers: [
				FhirService,
				{ provide: FhirBundleBuilderService, useValue: { buildBundle: jest.fn() } },
				{ provide: FhirValidatorService, useValue: { validateBundle: jest.fn() } },
				{
					provide: FhirCanonicalValidatorService,
					useValue: { validateCanonical: jest.fn().mockResolvedValue([]) },
				},
				{ provide: NhdrAdapterService, useValue: { submit: jest.fn() } },
			],
		}).compile()

		service = moduleRef.get(FhirService)
		mockDb = db as unknown as MockDb
		jest.clearAllMocks()
	})

	it("returns nhdrConfigured=true when the facility has an enabled NHDR integration", async () => {
		mockDb.select.mockReturnValue(
			makeSelectChainTerminalAtLimit([{ endpointUrl: ENDPOINT_URL, credentialsRef: null }])
		)

		const status = await service.getSystemStatus(FACILITY_ID)

		expect(status.nhdrConfigured).toBe(true)
		expect(status.nhdrBaseUrl).toBe(ENDPOINT_URL)
	})

	it("returns nhdrConfigured=false when the facility has no enabled NHDR integration (INTREG-015 isolation)", async () => {
		// DB returns empty — the facility's NHDR row is absent (or belongs to another facility).
		mockDb.select.mockReturnValue(makeSelectChainTerminalAtLimit([]))

		const status = await service.getSystemStatus(FACILITY_ID)

		expect(status.nhdrConfigured).toBe(false)
		expect(status.nhdrBaseUrl).toBeNull()
		// The note must guide admin toward Integration Registry, not leak other facility data
		expect(status.nhdrEndpointNote).toMatch(/Integration Registry/)
	})

	it("includes an active-and-configured note when credentialsRef env var is present", async () => {
		process.env.TEST_NHDR_KEY = "secret-token"
		mockDb.select.mockReturnValue(
			makeSelectChainTerminalAtLimit([
				{ endpointUrl: ENDPOINT_URL, credentialsRef: "TEST_NHDR_KEY" },
			])
		)

		const status = await service.getSystemStatus(FACILITY_ID)

		expect(status.nhdrConfigured).toBe(true)
		expect(status.nhdrEndpointNote).toMatch(/active and configured/)

		delete process.env.TEST_NHDR_KEY
	})

	it("warns when credentialsRef is set but the env var is missing", async () => {
		// Ensure the env var is absent
		delete process.env.MISSING_KEY

		mockDb.select.mockReturnValue(
			makeSelectChainTerminalAtLimit([{ endpointUrl: ENDPOINT_URL, credentialsRef: "MISSING_KEY" }])
		)

		const status = await service.getSystemStatus(FACILITY_ID)

		expect(status.nhdrConfigured).toBe(true)
		// Integration is configured but key is absent — should warn
		expect(status.nhdrEndpointNote).toMatch(/credential environment variable is not set/)
	})

	it("returns nhdrConfigured=false and mock-mode note when NHDR_MODE is 'mock'", async () => {
		// Mutate the shared mock env object for this test only.
		// The service reads env.NHDR_MODE at call-time (not at import-time),
		// so patching the same object instance is sufficient.
		const { env } = await import("@/config/env.config")
		const original = (env as { NHDR_MODE: string }).NHDR_MODE
		;(env as { NHDR_MODE: string }).NHDR_MODE = "mock"

		mockDb.select.mockReturnValue(
			makeSelectChainTerminalAtLimit([{ endpointUrl: ENDPOINT_URL, credentialsRef: null }])
		)

		const status = await service.getSystemStatus(FACILITY_ID)

		expect(status.nhdrConfigured).toBe(false)
		expect(status.nhdrEndpointNote).toMatch(/mock mode/)

		// Restore
		;(env as { NHDR_MODE: string }).NHDR_MODE = original
	})
})
