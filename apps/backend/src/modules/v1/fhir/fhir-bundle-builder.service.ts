import { Injectable } from "@nestjs/common"
import { and, between, eq, inArray } from "drizzle-orm"

import {
	allergies,
	encounters,
	imagingOrders,
	labOrders,
	medicationOrders,
	nutritionAssessments,
	operationRecords,
	patients,
	problems,
	staffProfiles,
	surgicalRvsAssignments,
	users,
} from "@repo/db/schema"
import { facilities } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

import type { FhirResourceType } from "@repo/contracts"

// ============================================================================
// FHIR R4 resource shape types (minimal but structurally valid)
// ============================================================================

interface FhirCoding {
	system?: string
	code?: string
	display?: string
}

interface FhirCodeableConcept {
	coding?: FhirCoding[]
	text?: string
}

interface FhirReference {
	reference: string
	display?: string
}

interface FhirPeriod {
	start?: string
	end?: string
}

interface FhirHumanName {
	use?: string
	family?: string
	given?: string[]
	text?: string
}

interface FhirAddress {
	text?: string
	city?: string
	state?: string
	postalCode?: string
	country?: string
}

interface FhirIdentifier {
	use?: string
	system?: string
	value?: string
}

interface FhirPatient {
	resourceType: "Patient"
	id: string
	identifier: FhirIdentifier[]
	name: FhirHumanName[]
	gender: "male" | "female" | "other" | "unknown"
	birthDate: string
	address?: FhirAddress[]
	telecom?: Array<{ system: string; value: string; use?: string }>
}

interface FhirEncounter {
	resourceType: "Encounter"
	id: string
	status: string
	class: FhirCoding
	type?: FhirCodeableConcept[]
	subject: FhirReference
	participant?: Array<{ individual?: FhirReference }>
	period?: FhirPeriod
	reasonCode?: FhirCodeableConcept[]
	serviceProvider?: FhirReference
}

interface FhirPractitioner {
	resourceType: "Practitioner"
	id: string
	identifier?: FhirIdentifier[]
	name?: FhirHumanName[]
	qualification?: Array<{
		identifier?: FhirIdentifier[]
		code?: FhirCodeableConcept
	}>
}

interface FhirOrganization {
	resourceType: "Organization"
	id: string
	identifier?: FhirIdentifier[]
	name?: string
	type?: FhirCodeableConcept[]
}

interface FhirLocation {
	resourceType: "Location"
	id: string
	name?: string
	managingOrganization?: FhirReference
}

interface FhirMedicationRequest {
	resourceType: "MedicationRequest"
	id: string
	status: string
	intent: "order"
	medicationCodeableConcept: FhirCodeableConcept
	subject: FhirReference
	encounter?: FhirReference
	requester?: FhirReference
	dosageInstruction?: Array<{
		text?: string
		route?: FhirCodeableConcept
		doseAndRate?: Array<{
			doseQuantity?: { value?: number; unit?: string }
		}>
	}>
}

interface FhirObservation {
	resourceType: "Observation"
	id: string
	status: "final" | "preliminary" | "registered" | "amended"
	code: FhirCodeableConcept
	subject: FhirReference
	encounter?: FhirReference
	effectiveDateTime?: string
	valueString?: string
	valueQuantity?: { value?: number; unit?: string; system?: string; code?: string }
	interpretation?: FhirCodeableConcept[]
	component?: Array<{ code: FhirCodeableConcept; valueString?: string; valueQuantity?: { value?: number; unit?: string } }>
}

interface FhirDiagnosticReport {
	resourceType: "DiagnosticReport"
	id: string
	status: "final" | "preliminary" | "partial" | "amended"
	code: FhirCodeableConcept
	subject: FhirReference
	encounter?: FhirReference
	effectiveDateTime?: string
	issued?: string
	conclusion?: string
	result?: FhirReference[]
}

interface FhirNutritionOrder {
	resourceType: "NutritionOrder"
	id: string
	status: "active" | "on-hold" | "completed" | "cancelled"
	intent: "order"
	patient: FhirReference
	encounter?: FhirReference
	dateTime: string
	orderer?: FhirReference
	oralDiet?: {
		type?: FhirCodeableConcept[]
		texture?: Array<{ modifier?: FhirCodeableConcept }>
		nutrient?: Array<{
			modifier?: FhirCodeableConcept
			amount?: { value?: number; unit?: string; system?: string; code?: string }
		}>
	}
}

interface FhirCondition {
	resourceType: "Condition"
	id: string
	clinicalStatus: FhirCodeableConcept
	verificationStatus: FhirCodeableConcept
	code: FhirCodeableConcept
	subject: FhirReference
	encounter?: FhirReference
	onsetDateTime?: string
	abatementDateTime?: string
	recordedDate?: string
	recorder?: FhirReference
}

interface FhirAllergyIntolerance {
	resourceType: "AllergyIntolerance"
	id: string
	clinicalStatus: FhirCodeableConcept
	verificationStatus: FhirCodeableConcept
	type?: "allergy" | "intolerance"
	category?: ("food" | "medication" | "environment" | "biologic")[]
	criticality?: "low" | "high" | "unable-to-assess"
	code: FhirCodeableConcept
	patient: FhirReference
	onsetDateTime?: string
	recordedDate?: string
	recorder?: FhirReference
	reaction?: Array<{
		substance?: FhirCodeableConcept
		manifestation: FhirCodeableConcept[]
		severity?: "mild" | "moderate" | "severe"
	}>
}

interface FhirProcedure {
	resourceType: "Procedure"
	id: string
	status: "preparation" | "in-progress" | "not-done" | "on-hold" | "stopped" | "completed" | "entered-in-error" | "unknown"
	code: FhirCodeableConcept
	subject: FhirReference
	encounter?: FhirReference
	performedPeriod?: FhirPeriod
	performer?: Array<{ actor: FhirReference; function?: FhirCodeableConcept }>
	note?: Array<{ text: string }>
}

type FhirResource =
	| FhirPatient
	| FhirEncounter
	| FhirPractitioner
	| FhirOrganization
	| FhirLocation
	| FhirMedicationRequest
	| FhirObservation
	| FhirDiagnosticReport
	| FhirNutritionOrder
	| FhirCondition
	| FhirAllergyIntolerance
	| FhirProcedure

export interface FhirBundle {
	resourceType: "Bundle"
	id: string
	type: "collection"
	timestamp: string
	total: number
	entry: Array<{ fullUrl: string; resource: FhirResource }>
}

export interface BundleBuildResult {
	bundle: FhirBundle
	countByType: Record<string, number>
	totalResources: number
	ndjson: string
}

// ============================================================================
// Helpers
// ============================================================================

function fhirDate(d: Date | string | null | undefined): string | undefined {
	if (!d) return undefined
	const dt = typeof d === "string" ? new Date(d) : d
	if (isNaN(dt.getTime())) return undefined
	return dt.toISOString()
}

function ref(resourceType: string, id: string, display?: string): FhirReference {
	return { reference: `${resourceType}/${id}`, ...(display ? { display } : {}) }
}

function mapEncounterStatus(status: string): string {
	switch (status) {
		case "active": return "in-progress"
		case "discharged": return "finished"
		case "closed": return "finished"
		case "cancelled": return "cancelled"
		default: return "unknown"
	}
}

function mapEncounterClass(type: string): FhirCoding {
	switch (type) {
		case "inpatient": return { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "IMP", display: "inpatient encounter" }
		case "outpatient": return { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "AMB", display: "ambulatory" }
		case "emergency": return { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "EMER", display: "emergency" }
		case "telemedicine": return { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "VR", display: "virtual" }
		default: return { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "AMB", display: "ambulatory" }
	}
}

function mapGender(sex: string): "male" | "female" | "other" | "unknown" {
	if (sex === "male") return "male"
	if (sex === "female") return "female"
	if (sex === "other") return "other"
	return "unknown"
}

function mapMedOrderStatus(status: string): string {
	switch (status) {
		case "active": return "active"
		case "completed": return "completed"
		case "discontinued":
		case "cancelled": return "cancelled"
		case "rejected": return "stopped"
		default: return "draft"
	}
}

function mapLabOrderStatus(status: string): FhirObservation["status"] {
	switch (status) {
		case "pending":
		case "ordered":
			return "registered"
		case "collected":
		case "in_progress":
			return "preliminary"
		case "resulted":
		case "completed":
			return "final"
		case "cancelled":
			return "amended"
		default:
			return "preliminary"
	}
}

function mapNutritionOrderStatus(status: string): FhirNutritionOrder["status"] {
	switch (status) {
		case "active": return "active"
		case "on-hold": return "on-hold"
		case "completed": return "completed"
		case "cancelled": return "cancelled"
		default: return "active"
	}
}

function mapOperationRecordStatus(status: string): FhirProcedure["status"] {
	switch (status) {
		case "draft": return "preparation"
		case "signed": return "completed"
		default: return "unknown"
	}
}

function mapAllergyCategory(
	allergenType: string,
): FhirAllergyIntolerance["category"] {
	switch (allergenType) {
		case "medication": return ["medication"]
		case "food": return ["food"]
		case "environmental": return ["environment"]
		default: return undefined
	}
}

function mapAllergyCriticality(
	severity: string,
): FhirAllergyIntolerance["criticality"] {
	switch (severity) {
		case "mild": return "low"
		case "moderate": return "low"
		case "severe": return "high"
		default: return "unable-to-assess"
	}
}

// ============================================================================
// FhirBundleBuilderService
// ============================================================================

@Injectable()
export class FhirBundleBuilderService {
	/**
	 * Build a FHIR R4 bundle (Collection type) from clinical data within the
	 * specified facility and date range.  Only resource types listed in
	 * {@link resourceTypes} are included in the output.
	 */
	async build(
		facilityId: string,
		exportId: string,
		dateRangeStart: string,
		dateRangeEnd: string,
		resourceTypes: FhirResourceType[],
	): Promise<BundleBuildResult> {
		const typeSet = new Set<FhirResourceType>(resourceTypes)
		const startDate = new Date(dateRangeStart)
		const endDate = new Date(`${dateRangeEnd}T23:59:59.999Z`)

		const entries: Array<{ fullUrl: string; resource: FhirResource }> = []
		const countByType: Record<string, number> = {}

		// ── Infrastructure (always included when referenced) ─────────────────
		let facilityRow: { id: string; name: string; facilityType: string; address: string | null } | null = null
		if (typeSet.has("Organization") || typeSet.has("Location")) {
			const rows = await db
				.select({ id: facilities.id, name: facilities.name, facilityType: facilities.facilityType, address: facilities.address })
				.from(facilities)
				.where(eq(facilities.id, facilityId))
				.limit(1)
			facilityRow = rows[0] ?? null
		}

		if (facilityRow && typeSet.has("Organization")) {
			const org: FhirOrganization = {
				resourceType: "Organization",
				id: facilityRow.id,
				name: facilityRow.name,
				type: [{
					coding: [{
						system: "http://terminology.hl7.org/CodeSystem/organization-type",
						code: "prov",
						display: "Healthcare Provider",
					}],
				}],
			}
			entries.push({ fullUrl: `Organization/${org.id}`, resource: org })
			countByType["Organization"] = 1
		}

		if (facilityRow && typeSet.has("Location")) {
			const loc: FhirLocation = {
				resourceType: "Location",
				id: facilityRow.id,
				name: facilityRow.name,
				managingOrganization: ref("Organization", facilityRow.id, facilityRow.name),
			}
			entries.push({ fullUrl: `Location/${loc.id}`, resource: loc })
			countByType["Location"] = 1
		}

		// ── Practitioners ─────────────────────────────────────────────────────
		if (typeSet.has("Practitioner")) {
			const staffRows = await db
				.select({
					id: staffProfiles.id,
					prcLicenseNumber: staffProfiles.prcLicenseNumber,
					name: users.name,
					email: users.email,
				})
				.from(staffProfiles)
				.leftJoin(users, eq(staffProfiles.userId, users.id))
				.where(eq(staffProfiles.facilityId, facilityId))

			const practitionerCount = staffRows.length
			for (const s of staffRows) {
				const nameParts = (s.name ?? "").split(" ")
				const prac: FhirPractitioner = {
					resourceType: "Practitioner",
					id: s.id,
					name: [{
						use: "official",
						family: nameParts.slice(-1)[0] ?? "",
						given: nameParts.slice(0, -1),
						text: s.name ?? undefined,
					}],
					qualification: s.prcLicenseNumber
						? [{
							identifier: [{ system: "https://www.prc.gov.ph", value: s.prcLicenseNumber }],
							code: { text: "Professional License" },
						}]
						: undefined,
				}
				entries.push({ fullUrl: `Practitioner/${prac.id}`, resource: prac })
			}
			countByType["Practitioner"] = practitionerCount
		}

		// ── Patients ──────────────────────────────────────────────────────────
		if (typeSet.has("Patient")) {
			const patientRows = await db
				.select()
				.from(patients)
				.where(
					and(
						eq(patients.facilityId, facilityId),
						between(patients.createdAt, startDate, endDate),
					),
				)

			countByType["Patient"] = patientRows.length
			for (const p of patientRows) {
				const patient: FhirPatient = {
					resourceType: "Patient",
					id: p.id,
					identifier: [
						{ use: "usual", system: "urn:oid:2.16.840.1.113883.2.33.1", value: p.mrn },
						...(p.philhealthMemberId
							? [{ use: "secondary", system: "https://www.philhealth.gov.ph/member", value: p.philhealthMemberId }]
							: []),
					],
					name: [{
						use: "official",
						family: p.lastName,
						given: [p.firstName, ...(p.middleName ? [p.middleName] : [])],
						text: `${p.firstName}${p.middleName ? ` ${p.middleName}` : ""} ${p.lastName}`,
					}],
					gender: mapGender(p.sex),
					birthDate: p.dateOfBirth,
					address: (p.addressLine1 || p.city) ? [{
						text: [p.addressLine1, p.addressLine2, p.city, p.province].filter(Boolean).join(", "),
						city: p.city ?? undefined,
						state: p.province ?? undefined,
						postalCode: p.zipCode ?? undefined,
						country: "PH",
					}] : undefined,
					telecom: [
						...(p.phone ? [{ system: "phone", value: p.phone, use: "mobile" }] : []),
						...(p.email ? [{ system: "email", value: p.email }] : []),
					],
				}
				entries.push({ fullUrl: `Patient/${patient.id}`, resource: patient })
			}
		}

		// ── Encounters ────────────────────────────────────────────────────────
		if (typeSet.has("Encounter")) {
			const encounterRows = await db
				.select({
					id: encounters.id,
					patientId: encounters.patientId,
					encounterType: encounters.encounterType,
					status: encounters.status,
					chiefComplaint: encounters.chiefComplaint,
					admittingStaffId: encounters.admittingStaffId,
					attendingStaffId: encounters.attendingStaffId,
					admissionDatetime: encounters.admissionDatetime,
					dischargeDatetime: encounters.dischargeDatetime,
				})
				.from(encounters)
				.where(
					and(
						eq(encounters.facilityId, facilityId),
						between(encounters.admissionDatetime, startDate, endDate),
					),
				)

			countByType["Encounter"] = encounterRows.length
			for (const e of encounterRows) {
				const enc: FhirEncounter = {
					resourceType: "Encounter",
					id: e.id,
					status: mapEncounterStatus(e.status),
					class: mapEncounterClass(e.encounterType),
					subject: ref("Patient", e.patientId),
					period: {
						start: fhirDate(e.admissionDatetime),
						...(e.dischargeDatetime ? { end: fhirDate(e.dischargeDatetime) } : {}),
					},
					...(e.chiefComplaint ? {
						reasonCode: [{ text: e.chiefComplaint }],
					} : {}),
					participant: [
						...(e.attendingStaffId ? [{ individual: ref("Practitioner", e.attendingStaffId) }] : []),
						...(e.admittingStaffId && e.admittingStaffId !== e.attendingStaffId
							? [{ individual: ref("Practitioner", e.admittingStaffId) }]
							: []),
					],
					serviceProvider: facilityRow ? ref("Organization", facilityId, facilityRow.name) : undefined,
				}
				entries.push({ fullUrl: `Encounter/${enc.id}`, resource: enc })
			}
		}

		// ── MedicationRequest ─────────────────────────────────────────────────
		if (typeSet.has("MedicationRequest")) {
			const medRows = await db
				.select({
					id: medicationOrders.id,
					encounterId: medicationOrders.encounterId,
					patientId: encounters.patientId,
					genericName: medicationOrders.genericName,
					brandName: medicationOrders.brandName,
					rxnormCode: medicationOrders.rxnormCode,
					dose: medicationOrders.dose,
					doseUnit: medicationOrders.doseUnit,
					route: medicationOrders.route,
					frequency: medicationOrders.frequency,
					status: medicationOrders.status,
					orderingStaffId: medicationOrders.orderingStaffId,
					createdAt: medicationOrders.createdAt,
				})
				.from(medicationOrders)
				.leftJoin(encounters, eq(medicationOrders.encounterId, encounters.id))
				.where(
					and(
						eq(medicationOrders.facilityId, facilityId),
						between(medicationOrders.createdAt, startDate, endDate),
					),
				)

			countByType["MedicationRequest"] = medRows.length
			for (const m of medRows) {
				const patId = m.patientId ?? ""
				const medReq: FhirMedicationRequest = {
					resourceType: "MedicationRequest",
					id: m.id,
					status: mapMedOrderStatus(m.status),
					intent: "order",
					medicationCodeableConcept: {
						coding: m.rxnormCode
							? [{ system: "http://www.nlm.nih.gov/research/umls/rxnorm", code: m.rxnormCode, display: m.genericName }]
							: [],
						text: m.brandName ? `${m.genericName} (${m.brandName})` : m.genericName,
					},
					subject: ref("Patient", patId),
					...(m.encounterId ? { encounter: ref("Encounter", m.encounterId) } : {}),
					requester: ref("Practitioner", m.orderingStaffId),
					dosageInstruction: [{
						text: `${m.dose} ${m.doseUnit} ${m.route} ${m.frequency}`,
						route: { text: m.route },
						doseAndRate: [{ doseQuantity: { value: parseFloat(m.dose) || undefined, unit: m.doseUnit } }],
					}],
				}
				entries.push({ fullUrl: `MedicationRequest/${medReq.id}`, resource: medReq })
			}
		}

		// ── Observation (Lab Results) ─────────────────────────────────────────
		if (typeSet.has("Observation")) {
			const labRows = await db
				.select({
					id: labOrders.id,
					encounterId: labOrders.encounterId,
					loincCode: labOrders.loincCode,
					testName: labOrders.testName,
					panelName: labOrders.panelName,
					status: labOrders.status,
					resultedDatetime: labOrders.resultedDatetime,
					results: labOrders.results,
					createdAt: labOrders.createdAt,
				})
				.from(labOrders)
				.where(
					and(
						eq(labOrders.facilityId, facilityId),
						between(labOrders.createdAt, startDate, endDate),
						inArray(labOrders.status, ["resulted", "completed"]),
					),
				)

			const encPatientMap = new Map<string, string>()
			const uniqueEncIds = [...new Set(labRows.map(l => l.encounterId).filter((id): id is string => id !== null))]
			if (uniqueEncIds.length > 0) {
				const encRows = await db
					.select({ id: encounters.id, patientId: encounters.patientId })
					.from(encounters)
					.where(inArray(encounters.id, uniqueEncIds))
				for (const e of encRows) encPatientMap.set(e.id, e.patientId)
			}

			countByType["Observation"] = labRows.length
			for (const l of labRows) {
				const patientId = l.encounterId ? (encPatientMap.get(l.encounterId) ?? "") : ""
				const resultsData = l.results as Record<string, unknown> | null
				const obs: FhirObservation = {
					resourceType: "Observation",
					id: l.id,
					status: mapLabOrderStatus(l.status),
					code: {
						coding: l.loincCode
							? [{ system: "http://loinc.org", code: l.loincCode, display: l.testName }]
							: [],
						text: l.panelName ?? l.testName,
					},
					subject: ref("Patient", patientId),
					...(l.encounterId ? { encounter: ref("Encounter", l.encounterId) } : {}),
					...(l.resultedDatetime ? { effectiveDateTime: fhirDate(l.resultedDatetime) } : {}),
					...(resultsData
						? { valueString: JSON.stringify(resultsData) }
						: {}),
				}
				entries.push({ fullUrl: `Observation/${obs.id}`, resource: obs })
			}
		}

		// ── DiagnosticReport (Imaging) ────────────────────────────────────────
		if (typeSet.has("DiagnosticReport")) {
			const imagingRows = await db
				.select({
					id: imagingOrders.id,
					encounterId: imagingOrders.encounterId,
					modality: imagingOrders.modality,
					bodyPart: imagingOrders.bodyPart,
					status: imagingOrders.status,
					completedDatetime: imagingOrders.completedDatetime,
					report: imagingOrders.report,
					createdAt: imagingOrders.createdAt,
				})
				.from(imagingOrders)
				.where(
					and(
						eq(imagingOrders.facilityId, facilityId),
						between(imagingOrders.createdAt, startDate, endDate),
					),
				)

			const encPatientMap2 = new Map<string, string>()
			const uniqueEncIds2 = [...new Set(imagingRows.map(i => i.encounterId).filter((id): id is string => id !== null))]
			if (uniqueEncIds2.length > 0) {
				const encRows = await db
					.select({ id: encounters.id, patientId: encounters.patientId })
					.from(encounters)
					.where(inArray(encounters.id, uniqueEncIds2))
				for (const e of encRows) encPatientMap2.set(e.id, e.patientId)
			}

			countByType["DiagnosticReport"] = imagingRows.length
			for (const i of imagingRows) {
				const patientId = i.encounterId ? (encPatientMap2.get(i.encounterId) ?? "") : ""
				const isCompleted = i.status === "completed"
				const diag: FhirDiagnosticReport = {
					resourceType: "DiagnosticReport",
					id: i.id,
					status: isCompleted ? "final" : "preliminary",
					code: {
						coding: [{
							system: "http://loinc.org",
							code: i.modality === "xray" ? "24627-2"
								: i.modality === "ct" ? "24558-9"
								: i.modality === "mri" ? "24591-0"
								: i.modality === "ultrasound" ? "24542-3"
								: "18748-4",
							display: `${i.modality.toUpperCase()} ${i.bodyPart}`,
						}],
						text: `${i.modality.toUpperCase()} ${i.bodyPart}`,
					},
					subject: ref("Patient", patientId),
					...(i.encounterId ? { encounter: ref("Encounter", i.encounterId) } : {}),
					...(i.completedDatetime ? { effectiveDateTime: fhirDate(i.completedDatetime) } : {}),
					...(i.completedDatetime ? { issued: fhirDate(i.completedDatetime) } : {}),
					...(i.report ? { conclusion: i.report } : {}),
				}
				entries.push({ fullUrl: `DiagnosticReport/${diag.id}`, resource: diag })
			}
		}

		// ── NutritionOrder ────────────────────────────────────────────────────
		if (typeSet.has("NutritionOrder")) {
			const nutritionRows = await db
				.select({
					id: nutritionAssessments.id,
					encounterId: nutritionAssessments.encounterId,
					patientId: nutritionAssessments.patientId,
					mealPlan: nutritionAssessments.mealPlan,
					assessedByStaffId: nutritionAssessments.assessedByStaffId,
					createdAt: nutritionAssessments.createdAt,
				})
				.from(nutritionAssessments)
				.where(
					and(
						eq(nutritionAssessments.facilityId, facilityId),
						between(nutritionAssessments.createdAt, startDate, endDate),
					),
				)

			countByType["NutritionOrder"] = nutritionRows.length
			for (const n of nutritionRows) {
				const plan = n.mealPlan ?? {}
				const nutrientList: FhirNutritionOrder["oralDiet"] = {
					type: plan.feedingRoute ? [{
						coding: [{
							system: "http://snomed.info/sct",
							code: plan.feedingRoute === "oral" ? "229898009"
								: plan.feedingRoute === "enteral" ? "11214006"
								: "82014003",
							display: plan.feedingRoute,
						}],
					}] : undefined,
					texture: plan.texture ? [{ modifier: { text: plan.texture } }] : undefined,
					nutrient: [
						...(plan.caloricTarget ? [{
							modifier: { coding: [{ system: "http://loinc.org", code: "9052-2", display: "Caloric intake" }] },
							amount: { value: plan.caloricTarget, unit: "kcal/d", system: "http://unitsofmeasure.org", code: "kcal/d" },
						}] : []),
						...(plan.proteinTarget ? [{
							modifier: { coding: [{ system: "http://loinc.org", code: "55284-4", display: "Protein intake" }] },
							amount: { value: plan.proteinTarget, unit: "g/d", system: "http://unitsofmeasure.org", code: "g/d" },
						}] : []),
					],
				}

				const nutritionOrder: FhirNutritionOrder = {
					resourceType: "NutritionOrder",
					id: n.id,
					status: "active",
					intent: "order",
					patient: ref("Patient", n.patientId),
					...(n.encounterId ? { encounter: ref("Encounter", n.encounterId) } : {}),
					dateTime: fhirDate(n.createdAt) ?? new Date().toISOString(),
					orderer: ref("Practitioner", n.assessedByStaffId),
					...(Object.keys(nutrientList).length > 0 ? { oralDiet: nutrientList } : {}),
				}
				entries.push({ fullUrl: `NutritionOrder/${nutritionOrder.id}`, resource: nutritionOrder })
			}
		}

		// ── Condition (Problems) ──────────────────────────────────────────────
		if (typeSet.has("Condition")) {
			const problemRows = await db
				.select({
					id: problems.id,
					patientId: problems.patientId,
					encounterId: problems.encounterId,
					icd10Code: problems.icd10Code,
					icd10Display: problems.icd10Display,
					snomedCode: problems.snomedCode,
					snomedDisplay: problems.snomedDisplay,
					description: problems.description,
					onsetDate: problems.onsetDate,
					resolutionDate: problems.resolutionDate,
					status: problems.status,
					documentingStaffId: problems.documentingStaffId,
					createdAt: problems.createdAt,
				})
				.from(problems)
				.where(
					and(
						eq(problems.facilityId, facilityId),
						between(problems.createdAt, startDate, endDate),
					),
				)

			countByType["Condition"] = problemRows.length
			for (const p of problemRows) {
				const isResolved = p.status === "resolved"
				const cond: FhirCondition = {
					resourceType: "Condition",
					id: p.id,
					clinicalStatus: {
						coding: [{
							system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
							code: isResolved ? "resolved" : "active",
							display: isResolved ? "Resolved" : "Active",
						}],
					},
					verificationStatus: {
						coding: [{
							system: "http://terminology.hl7.org/CodeSystem/condition-ver-status",
							code: "confirmed",
							display: "Confirmed",
						}],
					},
					code: {
						coding: [
							...(p.icd10Code ? [{ system: "http://hl7.org/fhir/sid/icd-10", code: p.icd10Code, display: p.icd10Display ?? undefined }] : []),
							...(p.snomedCode ? [{ system: "http://snomed.info/sct", code: p.snomedCode, display: p.snomedDisplay ?? undefined }] : []),
						],
						text: p.description,
					},
					subject: ref("Patient", p.patientId),
					...(p.encounterId ? { encounter: ref("Encounter", p.encounterId) } : {}),
					...(p.onsetDate ? { onsetDateTime: p.onsetDate } : {}),
					...(p.resolutionDate ? { abatementDateTime: p.resolutionDate } : {}),
					recordedDate: fhirDate(p.createdAt),
					...(p.documentingStaffId ? { recorder: ref("Practitioner", p.documentingStaffId) } : {}),
				}
				entries.push({ fullUrl: `Condition/${cond.id}`, resource: cond })
			}
		}

		// ── AllergyIntolerance ────────────────────────────────────────────────
		if (typeSet.has("AllergyIntolerance")) {
			const allergyRows = await db
				.select({
					id: allergies.id,
					patientId: allergies.patientId,
					allergenName: allergies.allergenName,
					allergenType: allergies.allergenType,
					reactionType: allergies.reactionType,
					severity: allergies.severity,
					onsetDate: allergies.onsetDate,
					isActive: allergies.isActive,
					documentingStaffId: allergies.documentingStaffId,
					createdAt: allergies.createdAt,
				})
				.from(allergies)
				.where(
					and(
						eq(allergies.facilityId, facilityId),
						between(allergies.createdAt, startDate, endDate),
					),
				)

			countByType["AllergyIntolerance"] = allergyRows.length
			for (const a of allergyRows) {
				const allergy: FhirAllergyIntolerance = {
					resourceType: "AllergyIntolerance",
					id: a.id,
					clinicalStatus: {
						coding: [{
							system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
							code: a.isActive ? "active" : "inactive",
							display: a.isActive ? "Active" : "Inactive",
						}],
					},
					verificationStatus: {
						coding: [{
							system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification",
							code: "confirmed",
							display: "Confirmed",
						}],
					},
					type: a.allergenType === "medication" ? "allergy" : "intolerance",
					category: mapAllergyCategory(a.allergenType),
					criticality: mapAllergyCriticality(a.severity),
					code: { text: a.allergenName },
					patient: ref("Patient", a.patientId),
					...(a.onsetDate ? { onsetDateTime: a.onsetDate } : {}),
					recordedDate: fhirDate(a.createdAt),
					...(a.documentingStaffId ? { recorder: ref("Practitioner", a.documentingStaffId) } : {}),
					reaction: a.reactionType ? [{
						manifestation: [{ text: a.reactionType }],
						severity: a.severity as "mild" | "moderate" | "severe",
					}] : undefined,
				}
				entries.push({ fullUrl: `AllergyIntolerance/${allergy.id}`, resource: allergy })
			}
		}

		// ── Procedure (Surgical Operations) ───────────────────────────────────
		if (typeSet.has("Procedure")) {
			const opRows = await db
				.select({
					id: operationRecords.id,
					encounterId: operationRecords.encounterId,
					procedureDescription: operationRecords.procedureDescription,
					incisionTime: operationRecords.incisionTime,
					closureTime: operationRecords.closureTime,
					surgeonStaffId: operationRecords.surgeonStaffId,
					status: operationRecords.status,
					findings: operationRecords.findings,
					createdAt: operationRecords.createdAt,
				})
				.from(operationRecords)
				.where(
					and(
						eq(operationRecords.facilityId, facilityId),
						between(operationRecords.createdAt, startDate, endDate),
					),
				)

			// Batch-load patient IDs for all operation encounters
			const opEncIds = [...new Set(opRows.map(r => r.encounterId).filter((id): id is string => !!id))]
			const opEncPatientMap = new Map<string, string>()
			if (opEncIds.length > 0) {
				const encRows = await db
					.select({ id: encounters.id, patientId: encounters.patientId })
					.from(encounters)
					.where(inArray(encounters.id, opEncIds))
				for (const e of encRows) opEncPatientMap.set(e.id, e.patientId)
			}

			// Batch-load RVS assignments for all operation records
			const opIds = opRows.map(r => r.id)
			const rvsMap = new Map<string, { rvsCode: string | null; rvsDescription: string | null }>()
			if (opIds.length > 0) {
				const rvsRows = await db
					.select({
						operationRecordId: surgicalRvsAssignments.operationRecordId,
						rvsCode: surgicalRvsAssignments.rvsCode,
						rvsDescription: surgicalRvsAssignments.rvsDescription,
						status: surgicalRvsAssignments.status,
					})
					.from(surgicalRvsAssignments)
					.where(
						and(
							inArray(surgicalRvsAssignments.operationRecordId, opIds),
							inArray(surgicalRvsAssignments.status, ["validated", "finalized"]),
						),
					)
				// Keep the first validated/finalized RVS per operation record
				for (const r of rvsRows) {
					if (!r.operationRecordId || rvsMap.has(r.operationRecordId)) {
						continue
					}

					rvsMap.set(r.operationRecordId, { rvsCode: r.rvsCode, rvsDescription: r.rvsDescription })
				}
			}

			countByType["Procedure"] = opRows.length
			for (const op of opRows) {
				const patientId = op.encounterId ? (opEncPatientMap.get(op.encounterId) ?? "") : ""
				const rvs = rvsMap.get(op.id)
				const proc: FhirProcedure = {
					resourceType: "Procedure",
					id: op.id,
					status: mapOperationRecordStatus(op.status),
					code: {
						coding: rvs?.rvsCode
							? [{ system: "https://www.philhealth.gov.ph/rvs", code: rvs.rvsCode, display: rvs.rvsDescription ?? undefined }]
							: [],
						...(op.procedureDescription ? { text: op.procedureDescription } : {}),
					},
					subject: ref("Patient", patientId),
					...(op.encounterId ? { encounter: ref("Encounter", op.encounterId) } : {}),
					performedPeriod: {
						...(op.incisionTime ? { start: fhirDate(op.incisionTime) } : {}),
						...(op.closureTime ? { end: fhirDate(op.closureTime) } : {}),
					},
					performer: [{ actor: ref("Practitioner", op.surgeonStaffId) }],
					...(op.findings ? { note: [{ text: op.findings }] } : {}),
				}
				entries.push({ fullUrl: `Procedure/${proc.id}`, resource: proc })
			}
		}

		// ── Remaining requested types with no dedicated query yet ─────────────
		// Coverage, ClaimResponse, Immunization: include empty counts to show
		// in validation report; disabled in the export UI until implemented
		const noDataTypes: FhirResourceType[] = ["Coverage", "ClaimResponse", "Immunization"]
		for (const t of noDataTypes) {
			if (typeSet.has(t) && !(t in countByType)) {
				countByType[t] = 0
			}
		}

		const totalResources = entries.length
		const bundle: FhirBundle = {
			resourceType: "Bundle",
			id: exportId,
			type: "collection",
			timestamp: new Date().toISOString(),
			total: totalResources,
			entry: entries,
		}

		// NDJSON: one JSON line per resource entry
		const ndjson = entries.map(e => JSON.stringify(e.resource)).join("\n")

		return { bundle, countByType, totalResources, ndjson }
	}
}
