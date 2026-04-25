import { Injectable } from "@nestjs/common"

import type { FhirBundle } from "./fhir-bundle-builder.service"

// ============================================================================
// Validation result types
// ============================================================================

export interface ValidationError {
	resourceType: string
	resourceId: string
	field: string
	error: string
	severity: "error" | "warning"
}

export interface ResourceValidationSummary {
	total: number
	valid: number
	invalid: number
}

export interface FhirValidationResult {
	errors: Array<{ resourceType: string; resourceId: string; error: string }>
	warnings: Array<{ resourceType: string; resourceId: string; warning: string }>
	summary: Record<string, ResourceValidationSummary>
	totalErrors: number
	totalWarnings: number
	isValid: boolean
}

// ============================================================================
// Terminology format validators (structural, not value-set lookups)
// ============================================================================

// ICD-10-CM: Letter + 2 digits + optional dot + 1-4 alphanumeric chars
const ICD10_PATTERN = /^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$/i

// LOINC: 1-5 digits + hyphen + 1 check digit
const LOINC_PATTERN = /^\d{1,5}-\d$/

// RxNorm: 1-7 digit string (NDC/RxCUI)
const RXNORM_PATTERN = /^\d{1,7}$/

// RVS: Philippine Relative Value Scale codes are alphanumeric
const RVS_PATTERN = /^[A-Z0-9]{3,12}$/i

// SNOMED CT: 6-18 digit numeric concept ID
const SNOMED_CT_PATTERN = /^\d{6,18}$/

// ============================================================================
// Resource-specific validators
// ============================================================================

function validatePatient(resource: Record<string, unknown>, id: string): ValidationError[] {
	const errs: ValidationError[] = []
	if (!resource["identifier"]) {
		errs.push({ resourceType: "Patient", resourceId: id, field: "identifier", error: "Patient.identifier is required for NHDR submission", severity: "error" })
	}
	if (!resource["name"]) {
		errs.push({ resourceType: "Patient", resourceId: id, field: "name", error: "Patient.name is required", severity: "error" })
	}
	if (!resource["birthDate"]) {
		errs.push({ resourceType: "Patient", resourceId: id, field: "birthDate", error: "Patient.birthDate is required", severity: "error" })
	}
	if (!resource["gender"]) {
		errs.push({ resourceType: "Patient", resourceId: id, field: "gender", error: "Patient.gender is required", severity: "error" })
	}
	return errs
}

function validateEncounter(resource: Record<string, unknown>, id: string): ValidationError[] {
	const errs: ValidationError[] = []
	if (!resource["status"]) {
		errs.push({ resourceType: "Encounter", resourceId: id, field: "status", error: "Encounter.status is required", severity: "error" })
	}
	if (!resource["class"]) {
		errs.push({ resourceType: "Encounter", resourceId: id, field: "class", error: "Encounter.class is required", severity: "error" })
	}
	const subject = resource["subject"] as Record<string, unknown> | undefined
	if (!subject?.["reference"]) {
		errs.push({ resourceType: "Encounter", resourceId: id, field: "subject", error: "Encounter.subject.reference is required", severity: "error" })
	}
	return errs
}

function validateMedicationRequest(resource: Record<string, unknown>, id: string): ValidationError[] {
	const errs: ValidationError[] = []
	const med = resource["medicationCodeableConcept"] as Record<string, unknown> | undefined
	if (med) {
		const codings = (med["coding"] as Array<Record<string, unknown>> | undefined) ?? []
		const hasRxNorm = codings.some(c => (c["system"] as string | undefined)?.includes("rxnorm"))
		if (!hasRxNorm) {
			errs.push({ resourceType: "MedicationRequest", resourceId: id, field: "medicationCodeableConcept.coding", error: "MedicationRequest must include at least one RxNorm coding (system containing 'rxnorm') per TOR §4.1", severity: "error" })
		}
		for (const coding of codings) {
			const system = coding["system"] as string | undefined
			const code = coding["code"] as string | undefined
			if (system?.includes("rxnorm") && code && !RXNORM_PATTERN.test(code)) {
				errs.push({ resourceType: "MedicationRequest", resourceId: id, field: "medicationCodeableConcept.coding.code", error: `RxNorm code '${code}' does not match expected format (1-7 digits)`, severity: "error" })
			}
		}
	} else {
		errs.push({ resourceType: "MedicationRequest", resourceId: id, field: "medicationCodeableConcept", error: "MedicationRequest.medicationCodeableConcept is required and must contain an RxNorm coding per TOR §4.1", severity: "error" })
	}
	if (!resource["subject"]) {
		errs.push({ resourceType: "MedicationRequest", resourceId: id, field: "subject", error: "MedicationRequest.subject is required", severity: "error" })
	}
	return errs
}

function validateObservation(resource: Record<string, unknown>, id: string): ValidationError[] {
	const errs: ValidationError[] = []
	const code = resource["code"] as Record<string, unknown> | undefined
	if (code) {
		const codings = (code["coding"] as Array<Record<string, unknown>> | undefined) ?? []
		const hasLoinc = codings.some(c => (c["system"] as string | undefined)?.includes("loinc"))
		if (!hasLoinc) {
			errs.push({ resourceType: "Observation", resourceId: id, field: "code.coding", error: "Observation must include at least one LOINC coding (system containing 'loinc') per TOR §4.1", severity: "error" })
		}
		for (const coding of codings) {
			const system = coding["system"] as string | undefined
			const c = coding["code"] as string | undefined
			if (system?.includes("loinc") && c && !LOINC_PATTERN.test(c)) {
				errs.push({ resourceType: "Observation", resourceId: id, field: "code.coding.code", error: `LOINC code '${c}' does not match expected format (#####-#)`, severity: "error" })
			}
		}
	} else {
		errs.push({ resourceType: "Observation", resourceId: id, field: "code", error: "Observation.code is required and must contain a LOINC coding per TOR §4.1", severity: "error" })
	}
	if (!resource["status"]) {
		errs.push({ resourceType: "Observation", resourceId: id, field: "status", error: "Observation.status is required", severity: "error" })
	}
	if (!resource["subject"]) {
		errs.push({ resourceType: "Observation", resourceId: id, field: "subject", error: "Observation.subject is required", severity: "error" })
	}
	return errs
}

function validateDiagnosticReport(resource: Record<string, unknown>, id: string): ValidationError[] {
	const errs: ValidationError[] = []
	if (!resource["status"]) {
		errs.push({ resourceType: "DiagnosticReport", resourceId: id, field: "status", error: "DiagnosticReport.status is required", severity: "error" })
	}
	if (!resource["code"]) {
		errs.push({ resourceType: "DiagnosticReport", resourceId: id, field: "code", error: "DiagnosticReport.code is required", severity: "error" })
	}
	if (!resource["subject"]) {
		errs.push({ resourceType: "DiagnosticReport", resourceId: id, field: "subject", error: "DiagnosticReport.subject is required", severity: "error" })
	}
	return errs
}

function validateNutritionOrder(resource: Record<string, unknown>, id: string): ValidationError[] {
	const errs: ValidationError[] = []
	if (!resource["status"]) {
		errs.push({ resourceType: "NutritionOrder", resourceId: id, field: "status", error: "NutritionOrder.status is required", severity: "error" })
	}
	if (!resource["patient"]) {
		errs.push({ resourceType: "NutritionOrder", resourceId: id, field: "patient", error: "NutritionOrder.patient is required", severity: "error" })
	}
	if (!resource["dateTime"]) {
		errs.push({ resourceType: "NutritionOrder", resourceId: id, field: "dateTime", error: "NutritionOrder.dateTime is required", severity: "error" })
	}
	return errs
}

function validatePractitioner(resource: Record<string, unknown>, id: string): ValidationError[] {
	const errs: ValidationError[] = []
	const names = resource["name"] as Array<Record<string, unknown>> | undefined
	if (!names || names.length === 0) {
		errs.push({ resourceType: "Practitioner", resourceId: id, field: "name", error: "Practitioner.name is recommended for NHDR submission", severity: "warning" })
	}
	return errs
}

function validateCondition(resource: Record<string, unknown>, id: string): ValidationError[] {
	const errs: ValidationError[] = []
	if (!resource["clinicalStatus"]) {
		errs.push({ resourceType: "Condition", resourceId: id, field: "clinicalStatus", error: "Condition.clinicalStatus is required", severity: "error" })
	}
	if (!resource["code"]) {
		errs.push({ resourceType: "Condition", resourceId: id, field: "code", error: "Condition.code is required", severity: "error" })
	}
	if (!resource["subject"]) {
		errs.push({ resourceType: "Condition", resourceId: id, field: "subject", error: "Condition.subject is required", severity: "error" })
	}
	// Terminology enforcement: ICD-10 coding is required for NHDR submission
	const code = resource["code"] as Record<string, unknown> | undefined
	if (code) {
		const codings = (code["coding"] as Array<Record<string, unknown>> | undefined) ?? []
		const hasIcd10 = codings.some(c => (c["system"] as string | undefined)?.includes("icd-10"))
		if (!hasIcd10) {
			errs.push({ resourceType: "Condition", resourceId: id, field: "code.coding", error: "Condition.code must include at least one ICD-10 coding for NHDR submission", severity: "error" })
		}
		const hasSnomed = codings.some(c => (c["system"] as string | undefined)?.includes("snomed"))
		if (!hasSnomed) {
			errs.push({ resourceType: "Condition", resourceId: id, field: "code.coding", error: "Condition.code must include at least one SNOMED CT coding for NHDR submission (TOR §4.1)", severity: "error" })
		}
		for (const coding of codings) {
			const system = coding["system"] as string | undefined
			const c = coding["code"] as string | undefined
			if (system?.includes("icd-10") && c && !ICD10_PATTERN.test(c)) {
				errs.push({ resourceType: "Condition", resourceId: id, field: "code.coding.code", error: `ICD-10 code '${c}' does not match expected format (e.g. A00.1)`, severity: "error" })
			}
			if (system?.includes("snomed") && c && !SNOMED_CT_PATTERN.test(c)) {
				errs.push({ resourceType: "Condition", resourceId: id, field: "code.coding.code", error: `SNOMED CT concept ID '${c}' does not match expected format (6-18 digits)`, severity: "error" })
			}
		}
	}
	return errs
}

function validateAllergyIntolerance(resource: Record<string, unknown>, id: string): ValidationError[] {
	const errs: ValidationError[] = []
	if (!resource["clinicalStatus"]) {
		errs.push({ resourceType: "AllergyIntolerance", resourceId: id, field: "clinicalStatus", error: "AllergyIntolerance.clinicalStatus is required", severity: "error" })
	}
	if (!resource["code"]) {
		errs.push({ resourceType: "AllergyIntolerance", resourceId: id, field: "code", error: "AllergyIntolerance.code is required", severity: "error" })
	}
	if (!resource["patient"]) {
		errs.push({ resourceType: "AllergyIntolerance", resourceId: id, field: "patient", error: "AllergyIntolerance.patient is required", severity: "error" })
	}
	// Check SNOMED CT coding if present
	const code = resource["code"] as Record<string, unknown> | undefined
	if (code) {
		const codings = (code["coding"] as Array<Record<string, unknown>> | undefined) ?? []
		for (const coding of codings) {
			const system = coding["system"] as string | undefined
			const c = coding["code"] as string | undefined
			if (system?.includes("snomed") && c && !SNOMED_CT_PATTERN.test(c)) {
				errs.push({ resourceType: "AllergyIntolerance", resourceId: id, field: "code.coding.code", error: `SNOMED CT concept ID '${c}' does not match expected format (6-18 digits)`, severity: "error" })
			}
		}
	}
	return errs
}

function validateProcedure(resource: Record<string, unknown>, id: string): ValidationError[] {
	const errs: ValidationError[] = []
	if (!resource["status"]) {
		errs.push({ resourceType: "Procedure", resourceId: id, field: "status", error: "Procedure.status is required", severity: "error" })
	}
	if (!resource["code"]) {
		errs.push({ resourceType: "Procedure", resourceId: id, field: "code", error: "Procedure.code is required", severity: "error" })
	}
	if (!resource["subject"]) {
		errs.push({ resourceType: "Procedure", resourceId: id, field: "subject", error: "Procedure.subject is required", severity: "error" })
	}
	// Terminology enforcement: RVS coding is required for NHDR submission
	const code = resource["code"] as Record<string, unknown> | undefined
	if (code) {
		const codings = (code["coding"] as Array<Record<string, unknown>> | undefined) ?? []
		const hasRvs = codings.some(c => (c["system"] as string | undefined)?.includes("philhealth"))
		if (!hasRvs) {
			errs.push({ resourceType: "Procedure", resourceId: id, field: "code.coding", error: "Procedure.code must include at least one RVS coding for NHDR submission", severity: "error" })
		}
		for (const coding of codings) {
			const system = coding["system"] as string | undefined
			const c = coding["code"] as string | undefined
			if (system?.includes("philhealth") && c && !RVS_PATTERN.test(c)) {
				errs.push({ resourceType: "Procedure", resourceId: id, field: "code.coding.code", error: `RVS code '${c}' does not match expected format`, severity: "error" })
			}
		}
	}
	return errs
}

// ============================================================================
// Generic ICD-10 code checker (Condition, DiagnosticReport diagnosis codes)
// ============================================================================

export function checkIcd10Code(code: string, resourceType: string, resourceId: string, field: string): ValidationError | null {
	if (!ICD10_PATTERN.test(code)) {
		return { resourceType, resourceId, field, error: `ICD-10 code '${code}' does not match expected format (e.g. A00.1)`, severity: "error" }
	}
	return null
}

export function checkLoincCode(code: string, resourceType: string, resourceId: string, field: string): ValidationError | null {
	if (!LOINC_PATTERN.test(code)) {
		return { resourceType, resourceId, field, error: `LOINC code '${code}' does not match expected format (e.g. 12345-6)`, severity: "error" }
	}
	return null
}

export function checkRxNormCode(code: string, resourceType: string, resourceId: string, field: string): ValidationError | null {
	if (!RXNORM_PATTERN.test(code)) {
		return { resourceType, resourceId, field, error: `RxNorm code '${code}' does not match expected format (1-7 digits)`, severity: "error" }
	}
	return null
}

export function checkRvsCode(code: string, resourceType: string, resourceId: string, field: string): ValidationError | null {
	if (!RVS_PATTERN.test(code)) {
		return { resourceType, resourceId, field, error: `RVS code '${code}' does not match expected format`, severity: "error" }
	}
	return null
}

export function checkSnomedCtCode(code: string, resourceType: string, resourceId: string, field: string): ValidationError | null {
	if (!SNOMED_CT_PATTERN.test(code)) {
		return { resourceType, resourceId, field, error: `SNOMED CT concept ID '${code}' does not match expected format (6-18 digits)`, severity: "error" }
	}
	return null
}

// ============================================================================
// FhirValidatorService
// ============================================================================

@Injectable()
export class FhirValidatorService {
	/**
	 * Validate all entries in a FHIR R4 bundle against structural rules and
	 * terminology format requirements. Returns a detailed validation result.
	 */
	validate(bundle: FhirBundle): FhirValidationResult {
		const allIssues: ValidationError[] = []
		const summaryByType: Record<string, { total: number; errorIds: Set<string> }> = {}

		for (const entry of bundle.entry) {
			const resource = entry.resource as unknown as Record<string, unknown>
			const resourceType = resource["resourceType"] as string
			const id = (resource["id"] as string | undefined) ?? "unknown"

			if (!summaryByType[resourceType]) {
				summaryByType[resourceType] = { total: 0, errorIds: new Set() }
			}
			summaryByType[resourceType]!.total++

			let issues: ValidationError[] = []
			switch (resourceType) {
				case "Patient":
					issues = validatePatient(resource, id)
					break
				case "Encounter":
					issues = validateEncounter(resource, id)
					break
				case "MedicationRequest":
					issues = validateMedicationRequest(resource, id)
					break
				case "Observation":
					issues = validateObservation(resource, id)
					break
				case "DiagnosticReport":
					issues = validateDiagnosticReport(resource, id)
					break
				case "NutritionOrder":
					issues = validateNutritionOrder(resource, id)
					break
				case "Practitioner":
					issues = validatePractitioner(resource, id)
					break
				case "Condition":
					issues = validateCondition(resource, id)
					break
				case "AllergyIntolerance":
					issues = validateAllergyIntolerance(resource, id)
					break
				case "Procedure":
					issues = validateProcedure(resource, id)
					break
				// Organization, Location — minimal structure validated elsewhere
				default:
					break
			}

			for (const issue of issues) {
				allIssues.push(issue)
				if (issue.severity === "error") {
					summaryByType[resourceType]!.errorIds.add(id)
				}
			}
		}

		const errors = allIssues.filter(i => i.severity === "error").map(i => ({
			resourceType: i.resourceType,
			resourceId: i.resourceId,
			error: `[${i.field}] ${i.error}`,
		}))

		const warnings = allIssues.filter(i => i.severity === "warning").map(i => ({
			resourceType: i.resourceType,
			resourceId: i.resourceId,
			warning: `[${i.field}] ${i.error}`,
		}))

		const summary: Record<string, ResourceValidationSummary> = {}
		for (const [type, stats] of Object.entries(summaryByType)) {
			const invalid = stats.errorIds.size
			summary[type] = { total: stats.total, valid: stats.total - invalid, invalid }
		}

		return {
			errors,
			warnings,
			summary,
			totalErrors: errors.length,
			totalWarnings: warnings.length,
			isValid: errors.length === 0,
		}
	}
}
