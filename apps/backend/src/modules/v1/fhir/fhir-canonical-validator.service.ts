import { Injectable } from "@nestjs/common"
import { and, eq, inArray } from "drizzle-orm"

import { icd10Codes, loincCodes, rvsCodes, rxnormCodes, snomedCtCodes } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

import type { FhirBundle } from "./fhir-bundle-builder.service"
import type { ValidationError } from "./fhir-validator.service"

// ============================================================================
// Terminology system URL substrings (matches the system URIs written by the
// bundle builder — kept consistent with the structural validator patterns)
// ============================================================================

const ICD10_SYSTEM = "icd-10"
const LOINC_SYSTEM = "loinc"
const RXNORM_SYSTEM = "rxnorm"
const RVS_SYSTEM = "rvs"
const SNOMED_SYSTEM = "snomed"

// ============================================================================
// FhirCanonicalValidatorService
// ============================================================================

/**
 * Validates that every terminology code present in a FHIR R4 bundle is a
 * member of the canonical (authoritative) code set stored in the facility's
 * reference data tables. Format-only checks belong in FhirValidatorService;
 * this service handles value-set membership (TOR §4.1 canonical enforcement).
 *
 * Design: keeps FhirValidatorService pure/sync; this service owns async DB
 * lookups and is injected separately into FhirService.
 */
@Injectable()
export class FhirCanonicalValidatorService {
	async validateCanonical(bundle: FhirBundle): Promise<ValidationError[]> {
		// ── Collect every code from every entry in one pass ──────────────────
		const collectedIcd10 = new Map<string, { resourceType: string; resourceId: string }>()
		const collectedLoinc = new Map<string, { resourceType: string; resourceId: string }>()
		const collectedRxnorm = new Map<string, { resourceType: string; resourceId: string }>()
		const collectedRvs = new Map<string, { resourceType: string; resourceId: string }>()
		const collectedSnomed = new Map<string, { resourceType: string; resourceId: string }>()

		for (const entry of bundle.entry) {
			const resource = entry.resource as unknown as Record<string, unknown>
			const resourceType = resource["resourceType"] as string
			const id = (resource["id"] as string | undefined) ?? "unknown"

			collectCodingsFromResource(resource, resourceType, id, {
				icd10: collectedIcd10,
				loinc: collectedLoinc,
				rxnorm: collectedRxnorm,
				rvs: collectedRvs,
				snomed: collectedSnomed,
			})
		}

		// ── Batch DB lookups in parallel ─────────────────────────────────────
		const [validIcd10, validLoinc, validRxnorm, validRvs, validSnomed] = await Promise.all([
			collectedIcd10.size > 0
				? db
						.select({ code: icd10Codes.code })
						.from(icd10Codes)
						.where(
							and(
								inArray(icd10Codes.code, [...collectedIcd10.keys()]),
								eq(icd10Codes.isActive, true)
							)
						)
				: Promise.resolve([]),
			collectedLoinc.size > 0
				? db
						.select({ loincNum: loincCodes.loincNum })
						.from(loincCodes)
						.where(
							and(
								inArray(loincCodes.loincNum, [...collectedLoinc.keys()]),
								eq(loincCodes.isActive, true)
							)
						)
				: Promise.resolve([]),
			collectedRxnorm.size > 0
				? db
						.select({ rxcui: rxnormCodes.rxcui })
						.from(rxnormCodes)
						.where(
							and(
								inArray(rxnormCodes.rxcui, [...collectedRxnorm.keys()]),
								eq(rxnormCodes.isActive, true)
							)
						)
				: Promise.resolve([]),
			collectedRvs.size > 0
				? db
						.select({ rvsCode: rvsCodes.rvsCode })
						.from(rvsCodes)
						.where(
							and(inArray(rvsCodes.rvsCode, [...collectedRvs.keys()]), eq(rvsCodes.isActive, true))
						)
				: Promise.resolve([]),
			collectedSnomed.size > 0
				? db
						.select({ conceptId: snomedCtCodes.conceptId })
						.from(snomedCtCodes)
						.where(
							and(
								inArray(snomedCtCodes.conceptId, [...collectedSnomed.keys()]),
								eq(snomedCtCodes.isActive, true)
							)
						)
				: Promise.resolve([]),
		])

		// ── Build sets of valid (canonical + active) codes ────────────────────
		const validIcd10Set = new Set(validIcd10.map(r => r.code))
		const validLoincSet = new Set(validLoinc.map(r => r.loincNum))
		const validRxnormSet = new Set(validRxnorm.map(r => r.rxcui))
		const validRvsSet = new Set(validRvs.map(r => r.rvsCode))
		const validSnomedSet = new Set(validSnomed.map(r => r.conceptId))

		// ── Emit canonical errors for any code NOT found in the valid sets ────
		const issues: ValidationError[] = []

		for (const [code, loc] of collectedIcd10) {
			if (!validIcd10Set.has(code)) {
				issues.push({
					resourceType: loc.resourceType,
					resourceId: loc.resourceId,
					field: "code.coding[icd-10]",
					error: `ICD-10 code '${code}' is not a member of the canonical ICD-10 code set or is inactive (TOR §4.1)`,
					severity: "error",
				})
			}
		}

		for (const [code, loc] of collectedLoinc) {
			if (!validLoincSet.has(code)) {
				issues.push({
					resourceType: loc.resourceType,
					resourceId: loc.resourceId,
					field: "code.coding[loinc]",
					error: `LOINC code '${code}' is not a member of the canonical LOINC code set or is inactive (TOR §4.1)`,
					severity: "error",
				})
			}
		}

		for (const [code, loc] of collectedRxnorm) {
			if (!validRxnormSet.has(code)) {
				issues.push({
					resourceType: loc.resourceType,
					resourceId: loc.resourceId,
					field: "medicationCodeableConcept.coding[rxnorm]",
					error: `RxNorm code '${code}' is not a member of the canonical RxNorm code set or is inactive (TOR §4.1)`,
					severity: "error",
				})
			}
		}

		for (const [code, loc] of collectedRvs) {
			if (!validRvsSet.has(code)) {
				issues.push({
					resourceType: loc.resourceType,
					resourceId: loc.resourceId,
					field: "code.coding[rvs]",
					error: `RVS code '${code}' is not a member of the canonical Philippine RVS code set or is inactive (TOR §4.1)`,
					severity: "error",
				})
			}
		}

		for (const [code, loc] of collectedSnomed) {
			if (!validSnomedSet.has(code)) {
				issues.push({
					resourceType: loc.resourceType,
					resourceId: loc.resourceId,
					field: "code.coding[snomed]",
					error: `SNOMED CT concept '${code}' is not a member of the canonical SNOMED CT code set or is inactive (TOR §4.1)`,
					severity: "error",
				})
			}
		}

		return issues
	}
}

// ============================================================================
// Internal: extract codings from a resource into the collection maps
// ============================================================================

interface CollectionMaps {
	icd10: Map<string, { resourceType: string; resourceId: string }>
	loinc: Map<string, { resourceType: string; resourceId: string }>
	rxnorm: Map<string, { resourceType: string; resourceId: string }>
	rvs: Map<string, { resourceType: string; resourceId: string }>
	snomed: Map<string, { resourceType: string; resourceId: string }>
}

function extractCodings(codeable: unknown): Array<{ system?: string; code?: string }> {
	const obj = codeable as Record<string, unknown> | undefined
	if (!obj) return []
	const codings = obj["coding"] as Array<Record<string, unknown>> | undefined
	if (!Array.isArray(codings)) return []
	return codings.map(c => ({
		system: c["system"] as string | undefined,
		code: c["code"] as string | undefined,
	}))
}

function storeCoding(
	system: string | undefined,
	code: string | undefined,
	systemFragment: string,
	target: Map<string, { resourceType: string; resourceId: string }>,
	resourceType: string,
	resourceId: string
): void {
	if (system?.includes(systemFragment) && code) {
		// First occurrence wins — the error message will reference the resource
		if (!target.has(code)) {
			target.set(code, { resourceType, resourceId })
		}
	}
}

function collectCodingsFromResource(
	resource: Record<string, unknown>,
	resourceType: string,
	resourceId: string,
	maps: CollectionMaps
): void {
	switch (resourceType) {
		case "Condition": {
			const codings = extractCodings(resource["code"])
			for (const { system, code } of codings) {
				storeCoding(system, code, ICD10_SYSTEM, maps.icd10, resourceType, resourceId)
				storeCoding(system, code, SNOMED_SYSTEM, maps.snomed, resourceType, resourceId)
			}
			break
		}
		case "Observation":
		case "DiagnosticReport": {
			const codings = extractCodings(resource["code"])
			for (const { system, code } of codings) {
				storeCoding(system, code, LOINC_SYSTEM, maps.loinc, resourceType, resourceId)
			}
			break
		}
		case "MedicationRequest": {
			const codings = extractCodings(resource["medicationCodeableConcept"])
			for (const { system, code } of codings) {
				storeCoding(system, code, RXNORM_SYSTEM, maps.rxnorm, resourceType, resourceId)
			}
			break
		}
		case "Procedure": {
			const codings = extractCodings(resource["code"])
			for (const { system, code } of codings) {
				storeCoding(system, code, RVS_SYSTEM, maps.rvs, resourceType, resourceId)
			}
			break
		}
		default:
			break
	}
}
