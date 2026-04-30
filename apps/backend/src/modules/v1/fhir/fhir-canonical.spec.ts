/**
 * FHIR Canonical Terminology Validation Tests (FHIR-004)
 *
 * Verifies that FhirCanonicalValidatorService.validateCanonical() rejects
 * bundle entries that carry terminology codes NOT present in the canonical
 * reference tables (icd10Codes, loincCodes, rxnormCodes, rvsCodes,
 * snomedCtCodes).  These are DB-backed value-set membership checks that go
 * beyond the format checks in FhirValidatorService.
 *
 * Test strategy:
 *   • Mock the DB select chain so that we control exactly which codes are
 *     returned as "canonical and active".
 *   • Codes present in the mock result → no error expected.
 *   • Codes absent from the mock result → error expected (not canonical / inactive).
 *
 * Terminology families covered (TOR §4.1):
 *   1. ICD-10   — Condition resources
 *   2. SNOMED CT — Condition resources
 *   3. LOINC    — Observation resources
 *   4. RxNorm   — MedicationRequest resources
 *   5. RVS      — Procedure resources
 */

import { Test } from "@nestjs/testing"

import { db } from "@/common/database/database.client"

import { FhirCanonicalValidatorService } from "./fhir-canonical-validator.service"
import type { FhirBundle } from "./fhir-bundle-builder.service"

// ---------------------------------------------------------------------------
// DB mock
// ---------------------------------------------------------------------------

jest.mock("@/common/database/database.client", () => ({
	db: {
		select: jest.fn(),
	},
}))

jest.mock("@repo/db/schema", () => {
	const proxy = () =>
		new Proxy({}, { get: (_t, p) => String(p) })
	return {
		icd10Codes: proxy(),
		loincCodes: proxy(),
		rxnormCodes: proxy(),
		rvsCodes: proxy(),
		snomedCtCodes: proxy(),
	}
})

// ---------------------------------------------------------------------------
// DB query chain helper
// ---------------------------------------------------------------------------

const mockDb = db as jest.Mocked<typeof db>

/**
 * Sets up db.select() to return rows in the given sequence, one per call.
 * Only provide as many result sets as actual DB calls that will happen:
 *   - Condition bundle (icd10 + snomed): 2 calls → [icd10_result, snomed_result]
 *   - Observation bundle (loinc only):   1 call  → [loinc_result]
 *   - MedicationRequest (rxnorm only):   1 call  → [rxnorm_result]
 *   - Procedure (rvs only):              1 call  → [rvs_result]
 * The Promise.all skips DB calls for empty collections entirely.
 */
function setupDbSequence(...results: Record<string, string>[][]): void {
	let callCount = 0
	mockDb.select.mockImplementation(() => {
		const rows = results[callCount++] ?? []
		return {
			from: jest.fn().mockReturnThis(),
			where: jest.fn().mockResolvedValue(rows),
		} as unknown as ReturnType<typeof db.select>
	})
}

// ---------------------------------------------------------------------------
// Bundle builders
// ---------------------------------------------------------------------------

function makeConditionBundle(icd10Code: string, snomedCode: string): FhirBundle {
	return {
		resourceType: "Bundle",
		id: "test-bundle",
		type: "collection",
		timestamp: new Date().toISOString(),
		total: 1,
		entry: [
			{
				fullUrl: "Condition/cond-1",
				resource: {
					resourceType: "Condition",
					id: "cond-1",
					code: {
						coding: [
							{ system: "http://hl7.org/fhir/sid/icd-10", code: icd10Code, display: "Test" },
							{ system: "http://snomed.info/sct", code: snomedCode, display: "Test (disorder)" },
						],
					},
				},
			},
		],
	} as unknown as FhirBundle
}

function makeObservationBundle(loincCode: string): FhirBundle {
	return {
		resourceType: "Bundle",
		id: "test-bundle",
		type: "collection",
		timestamp: new Date().toISOString(),
		total: 1,
		entry: [
			{
				fullUrl: "Observation/obs-1",
				resource: {
					resourceType: "Observation",
					id: "obs-1",
					code: {
						coding: [
							{ system: "http://loinc.org", code: loincCode, display: "Test obs" },
						],
					},
				},
			},
		],
	} as unknown as FhirBundle
}

function makeMedicationRequestBundle(rxcui: string): FhirBundle {
	return {
		resourceType: "Bundle",
		id: "test-bundle",
		type: "collection",
		timestamp: new Date().toISOString(),
		total: 1,
		entry: [
			{
				fullUrl: "MedicationRequest/med-1",
				resource: {
					resourceType: "MedicationRequest",
					id: "med-1",
					medicationCodeableConcept: {
						coding: [
							{ system: "http://www.nlm.nih.gov/research/umls/rxnorm", code: rxcui, display: "Test med" },
						],
					},
				},
			},
		],
	} as unknown as FhirBundle
}

function makeProcedureBundle(rvsCode: string): FhirBundle {
	return {
		resourceType: "Bundle",
		id: "test-bundle",
		type: "collection",
		timestamp: new Date().toISOString(),
		total: 1,
		entry: [
			{
				fullUrl: "Procedure/proc-1",
				resource: {
					resourceType: "Procedure",
					id: "proc-1",
					code: {
						coding: [
							{ system: "http://phic.gov.ph/rvs", code: rvsCode, display: "Test procedure" },
						],
					},
				},
			},
		],
	} as unknown as FhirBundle
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FhirCanonicalValidatorService — canonical membership (FHIR-004)", () => {
	let service: FhirCanonicalValidatorService

	beforeEach(async () => {
		const moduleRef = await Test.createTestingModule({
			providers: [FhirCanonicalValidatorService],
		}).compile()
		service = moduleRef.get(FhirCanonicalValidatorService)
		jest.clearAllMocks()
	})

	// ── ICD-10 ──────────────────────────────────────────────────────────────

	describe("ICD-10 (Condition resources)", () => {
		it("should pass when ICD-10 code is in the canonical table", async () => {
			// Condition bundle → 2 DB calls: [icd10_result, snomed_result]
			setupDbSequence(
				[{ code: "J18.9" }],       // icd10 → canonical
				[{ conceptId: "233604007" }], // snomed → canonical
			)
			const bundle = makeConditionBundle("J18.9", "233604007")
			const issues = await service.validateCanonical(bundle)
			const icd10Errors = issues.filter(i => i.field.includes("icd-10"))
			expect(icd10Errors).toHaveLength(0)
		})

		it("should error when ICD-10 code is NOT in the canonical table", async () => {
			// icd10 lookup empty (not canonical), snomed present
			setupDbSequence(
				[],                           // icd10 → not found
				[{ conceptId: "233604007" }], // snomed → canonical
			)
			const bundle = makeConditionBundle("Z99.999", "233604007")
			const issues = await service.validateCanonical(bundle)
			const icd10Errors = issues.filter(
				i => i.field.includes("icd-10") && i.severity === "error"
			)
			expect(icd10Errors).toHaveLength(1)
			expect(icd10Errors[0]!.error).toContain("Z99.999")
			expect(icd10Errors[0]!.error).toContain("canonical ICD-10")
		})

		it("should error when ICD-10 code exists but is inactive", async () => {
			// WHERE clause includes isActive=true so inactive codes are not returned
			setupDbSequence(
				[],                           // icd10 → inactive, not returned
				[{ conceptId: "233604007" }],
			)
			const bundle = makeConditionBundle("J18.9", "233604007")
			const issues = await service.validateCanonical(bundle)
			const icd10Errors = issues.filter(i => i.field.includes("icd-10") && i.severity === "error")
			expect(icd10Errors).toHaveLength(1)
			expect(icd10Errors[0]!.error).toContain("inactive")
		})
	})

	// ── SNOMED CT ───────────────────────────────────────────────────────────

	describe("SNOMED CT (Condition resources)", () => {
		it("should pass when SNOMED CT concept is in the canonical table", async () => {
			// Condition bundle → 2 DB calls: [icd10_result, snomed_result]
			setupDbSequence(
				[{ code: "J18.9" }],          // icd10 → canonical
				[{ conceptId: "233604007" }], // snomed → canonical
			)
			const bundle = makeConditionBundle("J18.9", "233604007")
			const issues = await service.validateCanonical(bundle)
			const snomedErrors = issues.filter(i => i.field.includes("snomed"))
			expect(snomedErrors).toHaveLength(0)
		})

		it("should error when SNOMED CT concept is NOT in the canonical table", async () => {
			setupDbSequence(
				[{ code: "J18.9" }], // icd10 → canonical
				[],                  // snomed → not found
			)
			const bundle = makeConditionBundle("J18.9", "999999999999")
			const issues = await service.validateCanonical(bundle)
			const snomedErrors = issues.filter(
				i => i.field.includes("snomed") && i.severity === "error"
			)
			expect(snomedErrors).toHaveLength(1)
			expect(snomedErrors[0]!.error).toContain("999999999999")
			expect(snomedErrors[0]!.error).toContain("SNOMED CT")
		})
	})

	// ── LOINC ───────────────────────────────────────────────────────────────

	describe("LOINC (Observation resources)", () => {
		it("should pass when LOINC code is in the canonical table", async () => {
			// Observation bundle → 1 DB call: [loinc_result]
			setupDbSequence([{ loincNum: "2160-0" }])
			const bundle = makeObservationBundle("2160-0")
			const issues = await service.validateCanonical(bundle)
			const loincErrors = issues.filter(i => i.field.includes("loinc"))
			expect(loincErrors).toHaveLength(0)
		})

		it("should error when LOINC code is NOT in the canonical table", async () => {
			setupDbSequence([]) // loinc lookup → empty
			const bundle = makeObservationBundle("99999-9")
			const issues = await service.validateCanonical(bundle)
			const loincErrors = issues.filter(
				i => i.field.includes("loinc") && i.severity === "error"
			)
			expect(loincErrors).toHaveLength(1)
			expect(loincErrors[0]!.error).toContain("99999-9")
			expect(loincErrors[0]!.error).toContain("canonical LOINC")
		})
	})

	// ── RxNorm ──────────────────────────────────────────────────────────────

	describe("RxNorm (MedicationRequest resources)", () => {
		it("should pass when RxNorm code is in the canonical table", async () => {
			// MedicationRequest → 1 DB call: [rxnorm_result]
			setupDbSequence([{ rxcui: "1049502" }])
			const bundle = makeMedicationRequestBundle("1049502")
			const issues = await service.validateCanonical(bundle)
			const rxErrors = issues.filter(i => i.field.includes("rxnorm"))
			expect(rxErrors).toHaveLength(0)
		})

		it("should error when RxNorm code is NOT in the canonical table", async () => {
			setupDbSequence([]) // rxnorm lookup → empty
			const bundle = makeMedicationRequestBundle("9999999")
			const issues = await service.validateCanonical(bundle)
			const rxErrors = issues.filter(
				i => i.field.includes("rxnorm") && i.severity === "error"
			)
			expect(rxErrors).toHaveLength(1)
			expect(rxErrors[0]!.error).toContain("9999999")
			expect(rxErrors[0]!.error).toContain("canonical RxNorm")
		})
	})

	// ── RVS ─────────────────────────────────────────────────────────────────

	describe("RVS (Procedure resources)", () => {
		it("should pass when RVS code is in the canonical table", async () => {
			// Procedure → 1 DB call: [rvs_result]
			setupDbSequence([{ rvsCode: "10021" }])
			const bundle = makeProcedureBundle("10021")
			const issues = await service.validateCanonical(bundle)
			const rvsErrors = issues.filter(i => i.field.includes("rvs"))
			expect(rvsErrors).toHaveLength(0)
		})

		it("should error when RVS code is NOT in the canonical table", async () => {
			setupDbSequence([]) // rvs lookup → empty
			const bundle = makeProcedureBundle("INVALID99")
			const issues = await service.validateCanonical(bundle)
			const rvsErrors = issues.filter(
				i => i.field.includes("rvs") && i.severity === "error"
			)
			expect(rvsErrors).toHaveLength(1)
			expect(rvsErrors[0]!.error).toContain("INVALID99")
			expect(rvsErrors[0]!.error).toContain("Philippine RVS")
		})
	})

	// ── Empty bundle edge case ───────────────────────────────────────────────

	it("should return no issues for an empty bundle", async () => {
		const bundle: FhirBundle = {
			resourceType: "Bundle",
			id: "empty",
			type: "collection",
			timestamp: new Date().toISOString(),
			total: 0,
			entry: [],
		}
		const issues = await service.validateCanonical(bundle)
		expect(issues).toHaveLength(0)
		// Should not have called db.select at all (no codes to check)
		expect(mockDb.select).not.toHaveBeenCalled()
	})

	// ── Multiple resources, mixed validity ────────────────────────────────

	it("should flag only non-canonical codes when a bundle has mixed valid/invalid entries", async () => {
		const bundle: FhirBundle = {
			resourceType: "Bundle",
			id: "mixed",
			type: "collection",
			timestamp: new Date().toISOString(),
			total: 2,
			entry: [
				{
					fullUrl: "Observation/obs-canonical",
					resource: {
						resourceType: "Observation",
						id: "obs-canonical",
						code: {
							coding: [{ system: "http://loinc.org", code: "2160-0", display: "Creatinine" }],
						},
					},
				},
				{
					fullUrl: "Observation/obs-bad",
					resource: {
						resourceType: "Observation",
						id: "obs-bad",
						code: {
							coding: [{ system: "http://loinc.org", code: "99999-0", display: "Unknown" }],
						},
					},
				},
			],
		} as unknown as FhirBundle

		// Observation-only bundle → 1 DB call: [loinc_result]
		// The loinc lookup returns only the canonical code; the unknown code is absent.
		setupDbSequence([{ loincNum: "2160-0" }])

		const issues = await service.validateCanonical(bundle)
		const loincErrors = issues.filter(i => i.field.includes("loinc") && i.severity === "error")

		expect(loincErrors).toHaveLength(1)
		expect(loincErrors[0]!.resourceId).toBe("obs-bad")
		expect(loincErrors[0]!.error).toContain("99999-0")
	})
})
