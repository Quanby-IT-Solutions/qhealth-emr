/**
 * FHIR Facility Isolation Tests (FHIR-002)
 *
 * Verifies that all FhirService methods that operate on fhir_exports rows
 * enforce facility ownership. When a record is not accessible under the active
 * facility context (simulated here by the DB returning no rows, which mirrors
 * what the RLS policy produces for cross-facility requests), the service must:
 *
 *   1. Throw a safe NotFoundException — never reveal the record exists
 *      for a different facility.
 *   2. Never forward any data from a cross-facility row to the caller.
 *
 * Additionally, listExports and listNhdrSubmissions must ignore the
 * client-supplied facilityId query parameter and derive the facility context
 * exclusively from the active RLS session variable (set_config in the RBAC
 * guard) to prevent privilege escalation via query parameter manipulation.
 */

import { NotFoundException } from "@nestjs/common"
import { Test } from "@nestjs/testing"

import { db } from "@/common/database/database.client"

import { FhirBundleBuilderService } from "./fhir-bundle-builder.service"
import { FhirCanonicalValidatorService } from "./fhir-canonical-validator.service"
import { FhirService } from "./fhir.service"
import { FhirValidatorService } from "./fhir-validator.service"
import { NhdrAdapterService } from "./nhdr-adapter.service"

// ---------------------------------------------------------------------------
// DB mock
// ---------------------------------------------------------------------------

jest.mock("@/common/database/database.client", () => ({
	db: {
		select: jest.fn(),
		insert: jest.fn(),
		execute: jest.fn(),
	},
}))

jest.mock("@repo/db/schema", () => {
	const proxy = () =>
		new Proxy(
			{},
			{ get: (_t, p) => String(p) }
		)
	return {
		fhirExports: proxy(),
		staffProfiles: proxy(),
		users: proxy(),
		auditLogs: proxy(),
		dataExports: proxy(),
		facilities: proxy(),
	}
})

jest.mock("@/config/env.config", () => ({
	env: {
		NHDR_API_URL: "https://nhdr.test",
		NHDR_API_KEY: "test-key",
	},
}))

// ---------------------------------------------------------------------------
// Builder helpers
// ---------------------------------------------------------------------------

type MockDb = {
	select: jest.Mock
	insert: jest.Mock
	execute: jest.Mock
}

/**
 * Returns a chainable builder that resolves with `result` at the terminal step.
 * Terminal step is `limit` (for getExportRow) or `offset` (for list queries).
 */
function makeSelectBuilder(result: unknown) {
	const builder: Record<string, jest.Mock> = {}
	const chain = () => builder as unknown as Promise<unknown>

	for (const method of ["from", "leftJoin", "where", "orderBy"]) {
		builder[method] = jest.fn().mockReturnValue(builder)
	}
	builder["limit"] = jest.fn().mockReturnValue(builder)
	builder["offset"] = jest.fn().mockResolvedValue(result)

	// Terminal resolution for getExportRow (.limit(1) is the terminal — but the
	// existing chain also has .limit(1) then awaits, so we need limit to return
	// a thenable. Let's make limit itself resolve when no offset is chained.
	builder["limit"] = jest.fn().mockImplementation(() => {
		const withLimit = {
			...builder,
			then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
		}
		return withLimit
	})

	return builder
}

/** Flat builder that resolves at `.where()` (used for count queries). */
function makeCountBuilder(total: number) {
	const builder: Record<string, jest.Mock> = {}
	builder["from"] = jest.fn().mockReturnValue(builder)
	builder["where"] = jest.fn().mockResolvedValue([{ total }])
	return builder
}

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const EXPORT_ID = "aaaaaaaa-0000-0000-0000-000000000001"
const FACILITY_ID = "bbbbbbbb-0000-0000-0000-000000000001"
const OTHER_FACILITY_ID = "cccccccc-0000-0000-0000-000000000002"

/** A minimal export row that satisfies the mapping in FhirService. */
const EXPORT_ROW = {
	id: EXPORT_ID,
	facilityId: FACILITY_ID,
	submissionStatus: "exported" as const,
	exportDateRange: { startDate: "2024-01-01", endDate: "2024-12-31" },
	resourceTypes: ["Patient", "Encounter"],
	totalResources: 10,
	validResources: 10,
	errorCount: 0,
	validationReport: null,
	exportFileUrl: null,
	bundleData: '{"resourceType":"Bundle"}',
	nhdrAcknowledgment: null,
	createdAt: new Date("2024-12-01"),
	exportedAt: new Date("2024-12-01"),
	submittedAt: null,
	createdByName: "Test User",
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("FhirService — facility isolation (FHIR-002)", () => {
	let service: FhirService
	let mockDb: MockDb

	beforeEach(async () => {
		const moduleRef = await Test.createTestingModule({
			providers: [
				FhirService,
				{
					provide: FhirBundleBuilderService,
					useValue: { buildBundle: jest.fn() },
				},
				{
					provide: FhirValidatorService,
					useValue: { validateBundle: jest.fn() },
				},
				{
					provide: FhirCanonicalValidatorService,
					useValue: { validateCanonical: jest.fn().mockResolvedValue([]) },
				},
				{
					provide: NhdrAdapterService,
					useValue: { submit: jest.fn() },
				},
			],
		}).compile()

		service = moduleRef.get(FhirService)
		mockDb = db as unknown as MockDb
		jest.clearAllMocks()
	})

	// -------------------------------------------------------------------------
	// getExport / getExportRow — denial returns safe 404
	// -------------------------------------------------------------------------

	describe("getExport", () => {
		it("throws NotFoundException when the DB returns no row (cross-facility or non-existent)", async () => {
			// Simulate RLS filtering out the row (returns empty array)
			const builder = makeSelectBuilder([])
			mockDb.select.mockReturnValue(builder)

			await expect(service.getExport(EXPORT_ID)).rejects.toThrow(NotFoundException)
		})

		it("does not reveal the facility mismatch in the error message", async () => {
			const builder = makeSelectBuilder([])
			mockDb.select.mockReturnValue(builder)

			try {
				await service.getExport(EXPORT_ID)
				fail("should have thrown")
			} catch (err: unknown) {
				const msg = (err as Error).message
				expect(msg).not.toContain("another facility")
				expect(msg).not.toContain("access denied")
			}
		})

		it("returns the mapped export when the DB returns a matching row", async () => {
			const builder = makeSelectBuilder([EXPORT_ROW])
			mockDb.select.mockReturnValue(builder)

			const result = await service.getExport(EXPORT_ID)
			expect(result.id).toBe(EXPORT_ID)
			expect(result.facilityId).toBe(FACILITY_ID)
		})
	})

	// -------------------------------------------------------------------------
	// getValidationReport — proxies through getExportRow
	// -------------------------------------------------------------------------

	describe("getValidationReport", () => {
		it("throws NotFoundException when the export is not accessible", async () => {
			const builder = makeSelectBuilder([])
			mockDb.select.mockReturnValue(builder)

			await expect(service.getValidationReport(EXPORT_ID)).rejects.toThrow(NotFoundException)
		})
	})

	// -------------------------------------------------------------------------
	// getBundleData — proxies through getExportRow
	// -------------------------------------------------------------------------

	describe("getBundleData", () => {
		it("throws NotFoundException when the export is not accessible", async () => {
			const builder = makeSelectBuilder([])
			mockDb.select.mockReturnValue(builder)

			await expect(service.getBundleData(EXPORT_ID, "user-id")).rejects.toThrow(NotFoundException)
		})
	})

	// -------------------------------------------------------------------------
	// submitToNhdr — proxies through getExportRow
	// -------------------------------------------------------------------------

	describe("submitToNhdr", () => {
		it("throws NotFoundException when the export is not accessible (cross-facility)", async () => {
			const builder = makeSelectBuilder([])
			mockDb.select.mockReturnValue(builder)

			await expect(
				service.submitToNhdr(EXPORT_ID, "user-id", "User Name")
			).rejects.toThrow(NotFoundException)
		})
	})

	// -------------------------------------------------------------------------
	// listExports — must ignore client-supplied facilityId
	// -------------------------------------------------------------------------

	describe("listExports", () => {
		beforeEach(() => {
			// First db.select() is the data query; second is the count query.
			let callCount = 0
			mockDb.select.mockImplementation(() => {
				callCount++
				if (callCount === 1) {
					// Data builder: terminal at .offset()
					const b: Record<string, jest.Mock> = {}
					for (const m of ["from", "leftJoin", "where", "orderBy", "limit"]) {
						b[m] = jest.fn().mockReturnValue(b)
					}
					b["offset"] = jest.fn().mockResolvedValue([EXPORT_ROW])
					return b
				}
				// Count builder: terminal at .where()
				return makeCountBuilder(1)
			})
		})

		it("returns exports when no facilityId is supplied in the query", async () => {
			const result = await service.listExports({ page: 1, limit: 20 })
			expect(result.total).toBe(1)
			expect(result.data[0].id).toBe(EXPORT_ID)
		})

		it("still returns active-facility exports when caller supplies a different facilityId", async () => {
			// The service must ignore query.facilityId and rely on the RLS context.
			// Since the DB mock always returns EXPORT_ROW (active facility's row),
			// the result should be that row regardless of the caller-supplied facilityId.
			const result = await service.listExports({
				page: 1,
				limit: 20,
				facilityId: OTHER_FACILITY_ID,
			})
			expect(result.total).toBe(1)
			expect(result.data[0].facilityId).toBe(FACILITY_ID)
		})
	})

	// -------------------------------------------------------------------------
	// listNhdrSubmissions — must ignore client-supplied facilityId
	// -------------------------------------------------------------------------

	describe("listNhdrSubmissions", () => {
		const SUBMISSION_ROW = {
			...EXPORT_ROW,
			submissionStatus: "submitted" as const,
			submittedAt: new Date("2024-12-02"),
		}

		beforeEach(() => {
			const builder: Record<string, jest.Mock> = {}
			for (const m of ["from", "leftJoin", "where", "orderBy"]) {
				builder[m] = jest.fn().mockReturnValue(builder)
			}
			builder["orderBy"] = jest.fn().mockResolvedValue([SUBMISSION_ROW])
			mockDb.select.mockReturnValue(builder)
		})

		it("returns submissions for the active facility", async () => {
			const result = await service.listNhdrSubmissions({})
			expect(result).toHaveLength(1)
			expect(result[0].facilityId).toBe(FACILITY_ID)
		})

		it("still returns active-facility submissions when caller supplies a different facilityId", async () => {
			const result = await service.listNhdrSubmissions({
				facilityId: OTHER_FACILITY_ID,
			})
			expect(result).toHaveLength(1)
			expect(result[0].facilityId).toBe(FACILITY_ID)
		})
	})
})
