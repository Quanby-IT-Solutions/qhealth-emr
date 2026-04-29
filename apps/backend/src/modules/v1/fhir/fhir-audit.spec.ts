/**
 * FHIR Audit Trail Tests (FHIR-001)
 *
 * Verifies that FhirService writes durable audit records for the three
 * operations that produce or transmit bulk clinical data:
 *
 *   createExport  — writes auditLogs (action:"create", entityType:"fhir_export")
 *                   and dataExports (destination:"local", entityType:"bulk_report")
 *
 *   getBundleData — writes auditLogs (action:"read",   entityType:"fhir_export")
 *                   and dataExports (destination:"local_download")
 *
 *   submitToNhdr  — writes auditLogs (action:"create", entityType:"nhdr_submission")
 *                   and dataExports (destination:"nhdr")
 *
 * Failure paths (NotFoundException) must NOT trigger any audit writes.
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
		update: jest.fn(),
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
		integrations: proxy(),
	}
})

jest.mock("@/config/env.config", () => ({
	env: {
		NHDR_MODE: "mock",
		NHDR_BASE_URL: undefined,
		NHDR_API_KEY: undefined,
	},
}))

// ---------------------------------------------------------------------------
// Types & builder helpers
// ---------------------------------------------------------------------------

type MockDb = {
	select: jest.Mock
	insert: jest.Mock
	update: jest.Mock
	execute: jest.Mock
}

/** Returns a select builder that resolves at .limit() with the given rows. */
function makeLimitBuilder(rows: unknown[]) {
	const b: Record<string, unknown> = {}
	for (const m of ["from", "leftJoin", "where"]) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(b as any)[m] = jest.fn().mockReturnValue(b)
	}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	;(b as any)["limit"] = jest.fn().mockImplementation(() => ({
		then: (resolve: (v: unknown) => unknown) => Promise.resolve(rows).then(resolve),
	}))
	return b
}

/** Makes a chainable update builder that resolves at .where(). */
function makeUpdateBuilder() {
	const where = jest.fn().mockResolvedValue([])
	const set = jest.fn().mockReturnValue({ where })
	return { set }
}

/** Makes an insert builder whose .values() resolves immediately (audit inserts). */
function makeAuditInsertBuilder() {
	const values = jest.fn().mockResolvedValue([])
	return { values, _valuesMock: values }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const EXPORT_ID = "aaaaaaaa-0000-0000-0000-000000000001"
const FACILITY_ID = "bbbbbbbb-0000-0000-0000-000000000001"
const USER_ID = "user-id-001"
const STAFF_ID = "cccccccc-0000-0000-0000-000000000001"

const EXPORT_ROW = {
	id: EXPORT_ID,
	facilityId: FACILITY_ID,
	submissionStatus: "exported" as const,
	exportDateRange: { startDate: "2024-01-01", endDate: "2024-12-31" },
	resourceTypes: ["Patient", "Encounter"],
	totalResources: 10,
	validResources: 10,
	errorCount: 0,
	validationReport: { errors: [], warnings: [], summary: {} },
	exportFileUrl: null,
	bundleData: '{"resourceType":"Bundle"}',
	nhdrAcknowledgment: null,
	createdAt: new Date("2024-12-01"),
	exportedAt: new Date("2024-12-01"),
	submittedAt: null,
	createdByName: "Test User",
}

const STAFF_ROW = { id: STAFF_ID }

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("FhirService — audit trails (FHIR-001)", () => {
	let service: FhirService
	let mockDb: MockDb
	let nhdrAdapter: { submit: jest.Mock }
	let bundleBuilder: { build: jest.Mock }
	let validator: { validate: jest.Mock }

	beforeEach(async () => {
		nhdrAdapter = { submit: jest.fn() }
		bundleBuilder = { build: jest.fn() }
		validator = { validate: jest.fn() }

		const moduleRef = await Test.createTestingModule({
			providers: [
				FhirService,
				{ provide: FhirBundleBuilderService, useValue: bundleBuilder },
				{ provide: FhirValidatorService, useValue: validator },
				{ provide: FhirCanonicalValidatorService, useValue: { validateCanonical: jest.fn().mockResolvedValue([]) } },
				{ provide: NhdrAdapterService, useValue: nhdrAdapter },
			],
		}).compile()

		service = moduleRef.get(FhirService)
		mockDb = db as unknown as MockDb
		jest.clearAllMocks()
	})

	// =========================================================================
	// getBundleData
	// =========================================================================

	describe("getBundleData", () => {
		function setupHappyPath() {
			let selectCount = 0
			mockDb.select.mockImplementation(() => {
				selectCount++
				// Call 1: getExportRow (resolves at limit)
				if (selectCount === 1) return makeLimitBuilder([EXPORT_ROW])
				// Call 2: staff profile lookup
				return makeLimitBuilder([STAFF_ROW])
			})
		}

		it("writes an auditLog with action:read when a bundle is downloaded", async () => {
			setupHappyPath()
			const valuesMock = jest.fn().mockResolvedValue([])
			mockDb.insert.mockReturnValue({ values: valuesMock })

			await service.getBundleData(EXPORT_ID, USER_ID)

			expect(valuesMock).toHaveBeenCalledWith(
				expect.objectContaining({
					action: "read",
					entityType: "fhir_export",
					entityId: EXPORT_ID,
					userId: USER_ID,
					facilityId: FACILITY_ID,
					staffProfileId: STAFF_ID,
				})
			)
		})

		it("writes a dataExport with destination:local_download when a bundle is downloaded", async () => {
			setupHappyPath()
			const valuesMock = jest.fn().mockResolvedValue([])
			mockDb.insert.mockReturnValue({ values: valuesMock })

			await service.getBundleData(EXPORT_ID, USER_ID)

			expect(valuesMock).toHaveBeenCalledWith(
				expect.objectContaining({
					destination: "local_download",
					entityType: "bulk_report",
					actorUserId: USER_ID,
					facilityId: FACILITY_ID,
					transmissionScope: "bulk",
					consentGated: false,
					status: "completed",
				})
			)
		})

		it("does not write audit records when the export is not found", async () => {
			mockDb.select.mockReturnValue(makeLimitBuilder([]))

			await expect(service.getBundleData(EXPORT_ID, USER_ID)).rejects.toThrow(NotFoundException)
			expect(mockDb.insert).not.toHaveBeenCalled()
		})
	})

	// =========================================================================
	// submitToNhdr
	// =========================================================================

	describe("submitToNhdr", () => {
		const ACK = {
			receiptNumber: "RCT-0001",
			responseMessage: "Accepted",
			submissionDate: "2024-12-01",
		}

		const NHDR_REGISTRY_ROW = {
			endpointUrl: "https://nhdr.gov.ph/fhir",
			credentialsRef: null,
		}

		function setupHappyPath() {
			let selectCount = 0
			mockDb.select.mockImplementation(() => {
				selectCount++
				// Call 1: getExportRow
				if (selectCount === 1) return makeLimitBuilder([EXPORT_ROW])
				// Call 2: Integration Registry lookup for enabled NHDR row
				if (selectCount === 2) return makeLimitBuilder([NHDR_REGISTRY_ROW])
				// Call 3: staff profile lookup for submittedByStaff
				return makeLimitBuilder([STAFF_ROW])
			})
			nhdrAdapter.submit.mockResolvedValue(ACK)
			mockDb.update.mockReturnValue(makeUpdateBuilder())
		}

		it("writes an auditLog with action:create and entityType:nhdr_submission on successful submission", async () => {
			setupHappyPath()
			const valuesMock = jest.fn().mockResolvedValue([])
			mockDb.insert.mockReturnValue({ values: valuesMock })

			await service.submitToNhdr(EXPORT_ID, USER_ID, "Test User")

			expect(valuesMock).toHaveBeenCalledWith(
				expect.objectContaining({
					action: "create",
					entityType: "nhdr_submission",
					entityId: EXPORT_ID,
					userId: USER_ID,
					facilityId: FACILITY_ID,
					staffProfileId: STAFF_ID,
				})
			)
		})

		it("writes a dataExport with destination:nhdr on successful submission", async () => {
			setupHappyPath()
			const valuesMock = jest.fn().mockResolvedValue([])
			mockDb.insert.mockReturnValue({ values: valuesMock })

			await service.submitToNhdr(EXPORT_ID, USER_ID, "Test User")

			expect(valuesMock).toHaveBeenCalledWith(
				expect.objectContaining({
					destination: "nhdr",
					entityType: "bulk_report",
					actorUserId: USER_ID,
					facilityId: FACILITY_ID,
					transmissionScope: "bulk",
					consentGated: false,
					status: "completed",
				})
			)
		})

		it("does not write audit records when the export is not found", async () => {
			mockDb.select.mockReturnValue(makeLimitBuilder([]))

			await expect(service.submitToNhdr(EXPORT_ID, USER_ID, "Test User")).rejects.toThrow(NotFoundException)
			expect(mockDb.insert).not.toHaveBeenCalled()
		})
	})

	// =========================================================================
	// createExport
	// =========================================================================

	describe("createExport", () => {
		const INPUT = {
			facilityId: FACILITY_ID,
			dateRangeStart: "2024-01-01",
			dateRangeEnd: "2024-12-31",
			resourceTypes: ["Patient", "Encounter"],
		}

		const BUNDLE_RESULT = {
			bundle: { resourceType: "Bundle", entry: [] },
			ndjson: '{"resourceType":"Bundle"}',
			totalResources: 10,
		}

		const VALIDATION_RESULT = {
			errors: [],
			warnings: [],
			summary: { Patient: { total: 10, valid: 10, invalid: 0 } },
			totalErrors: 0,
		}

		function setupHappyPath(auditValuesMock: jest.Mock) {
			// select call 1: staff profile for createdBy
			// select call 2: getExportRow after bundle build
			let selectCount = 0
			mockDb.select.mockImplementation(() => {
				selectCount++
				if (selectCount === 1) return makeLimitBuilder([STAFF_ROW])
				return makeLimitBuilder([EXPORT_ROW])
			})

			bundleBuilder.build.mockResolvedValue(BUNDLE_RESULT)
			validator.validate.mockReturnValue(VALIDATION_RESULT)

			// insert call 1: fhirExports (needs .returning())
			// insert calls 2 & 3: auditLogs and dataExports (use auditValuesMock)
			let insertCount = 0
			mockDb.insert.mockImplementation(() => {
				insertCount++
				if (insertCount === 1) {
					return {
						values: jest.fn().mockReturnValue({
							returning: jest.fn().mockResolvedValue([{ id: EXPORT_ID }]),
						}),
					}
				}
				return { values: auditValuesMock }
			})

			mockDb.update.mockReturnValue(makeUpdateBuilder())
		}

		it("writes an auditLog with action:create and entityType:fhir_export after export is created", async () => {
			const auditValuesMock = jest.fn().mockResolvedValue([])
			setupHappyPath(auditValuesMock)

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await service.createExport(INPUT as any, USER_ID, "Test User")

			expect(auditValuesMock).toHaveBeenCalledWith(
				expect.objectContaining({
					action: "create",
					entityType: "fhir_export",
					entityId: EXPORT_ID,
					userId: USER_ID,
					staffProfileId: STAFF_ID,
					facilityId: FACILITY_ID,
				})
			)
		})

		it("writes a dataExport with destination:local and entityType:bulk_report after export is created", async () => {
			const auditValuesMock = jest.fn().mockResolvedValue([])
			setupHappyPath(auditValuesMock)

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await service.createExport(INPUT as any, USER_ID, "Test User")

			expect(auditValuesMock).toHaveBeenCalledWith(
				expect.objectContaining({
					destination: "local",
					entityType: "bulk_report",
					actorUserId: USER_ID,
					actorStaffId: STAFF_ID,
					facilityId: FACILITY_ID,
					transmissionScope: "bulk",
					consentGated: false,
					status: "completed",
				})
			)
		})
	})
})
