/**
 * Story 4.1 — ClinicalDocsService critical-path coverage.
 *
 * Verifies acceptance criteria from ticket 4.1-C:
 *  - assertAssessmentAndPlanPresent enforces SOAP A/P fields.
 *  - validateKonsultaCompleteness enforces FPE / Konsulta field presence and formats.
 *  - signNote rejects double-signing (immutability).
 *  - updateNote rejects non-author editors (author-only guard).
 *  - assertNoteTargetCanBeSaved enforces exactly-one of encounterId / preEncounterId.
 */

import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common"

import { db } from "@/common/database/database.client"

import { ClinicalDocsService } from "./clinical-docs.service"

jest.mock("@/common/database/database.client", () => ({
	db: {
		select: jest.fn(),
		insert: jest.fn(),
		update: jest.fn(),
		delete: jest.fn(),
		execute: jest.fn(),
		transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
	},
}))

jest.mock("@repo/db/schema", () => ({
	allergies: {},
	clinicalNotes: {},
	consentRecords: {},
	encounters: {},
	icd10Codes: { code: "icd10.code", isActive: "icd10.isActive" },
	konsultaActivities: {},
	labOrders: {},
	noteAddenda: {},
	noteTemplates: {},
	patients: {},
	preEncounters: {},
	staffProfiles: {},
	users: {},
	vitalSigns: {},
}))

function makeService() {
	const audit = { log: jest.fn().mockResolvedValue(undefined) }
	const chartAccess = {
		ensureEncounterChartReadAccess: jest.fn().mockResolvedValue(undefined),
		ensurePatientChartReadAccess: jest.fn().mockResolvedValue(undefined),
	}
	const service = new ClinicalDocsService(audit as never, chartAccess as never)
	return { service, audit, chartAccess }
}

type Privates = {
	assertAssessmentAndPlanPresent: (input: {
		content?: string | null
		structuredData?: unknown
		template: unknown
	}) => void
	validateKonsultaCompleteness: (data: unknown) => { valid: boolean; missingFields: string[] }
	assertNoteTargetCanBeSaved: (input: {
		facilityId: string
		encounterId?: string | null
		preEncounterId?: string | null
	}) => Promise<void>
	assertIcd10DiagnosisPresentForSigning: (input: {
		noteType: string
		structuredData?: unknown
		template: unknown
	}) => Promise<void>
}

function asPrivates(service: ClinicalDocsService): Privates {
	return service as unknown as Privates
}

const soapTemplate = {
	id: "tpl-1",
	facilityId: "fac-1",
	category: "progress",
	sections: [
		{ key: "subjective", label: "Subjective", type: "structured" },
		{ key: "objective", label: "Objective", type: "structured" },
		{ key: "assessment", label: "Assessment", type: "structured" },
		{ key: "plan", label: "Plan", type: "structured" },
	],
}

const validKonsultaData = {
	chiefComplaint: "Cough",
	historyOfPresentIllness: "Two days of productive cough.",
	socialHistory: "Non-smoker.",
	mentalHealthScreening: "Negative PHQ-2.",
	physicalExamGeneral: "Awake, alert, no distress.",
	vitalSigns: {
		bloodPressure: "120/80",
		heartRate: "78",
		respiratoryRate: "18",
		temperature: "36.8",
		oxygenSaturation: "98",
		weight: "65",
		height: "165",
	},
	primaryDiagnosis: {
		code: "J18.9",
		description: "Pneumonia, unspecified",
	},
}

beforeEach(() => {
	jest.clearAllMocks()
})

function mockActiveIcd10Codes(codes: string[]) {
	;(db.select as jest.Mock).mockReturnValueOnce({
		from: () => ({
			where: () => Promise.resolve(codes.map(code => ({ code }))),
		}),
	})
}

describe("ClinicalDocsService.assertAssessmentAndPlanPresent", () => {
	it("throws BadRequestException when Assessment is empty but Plan is present", () => {
		const { service } = makeService()
		expect(() =>
			asPrivates(service).assertAssessmentAndPlanPresent({
				content: "",
				structuredData: { assessment: "", plan: "Follow up in 1 week" },
				template: soapTemplate,
			})
		).toThrow(BadRequestException)
	})

	it("throws BadRequestException when Plan is empty but Assessment is present", () => {
		const { service } = makeService()
		expect(() =>
			asPrivates(service).assertAssessmentAndPlanPresent({
				content: "",
				structuredData: { assessment: "Stable", plan: "" },
				template: soapTemplate,
			})
		).toThrow(BadRequestException)
	})

	it("does not throw when both Assessment and Plan are non-empty strings", () => {
		const { service } = makeService()
		expect(() =>
			asPrivates(service).assertAssessmentAndPlanPresent({
				content: "",
				structuredData: { assessment: "Stable", plan: "Follow up in 1 week" },
				template: soapTemplate,
			})
		).not.toThrow()
	})

	it("reads Assessment and Plan from structuredData keys (not just markdown content)", () => {
		const { service } = makeService()
		expect(() =>
			asPrivates(service).assertAssessmentAndPlanPresent({
				content: "",
				structuredData: { assessment: "Stable", plan: "Follow up" },
				template: soapTemplate,
			})
		).not.toThrow()

		expect(() =>
			asPrivates(service).assertAssessmentAndPlanPresent({
				content: "",
				structuredData: { assessment: "Stable" },
				template: soapTemplate,
			})
		).toThrow(BadRequestException)
	})
})

describe("ClinicalDocsService.validateKonsultaCompleteness", () => {
	it("returns valid:false with 'Primary Diagnosis Code' missing when primaryDiagnosis.code is absent", () => {
		const { service } = makeService()
		const data = { ...validKonsultaData, primaryDiagnosis: { description: "Pneumonia" } }
		const result = asPrivates(service).validateKonsultaCompleteness(data)
		expect(result.valid).toBe(false)
		expect(result.missingFields).toContain("Primary Diagnosis Code")
	})

	it("returns valid:false with ICD-10 format error when primaryDiagnosis.code is 'J1'", () => {
		const { service } = makeService()
		const data = {
			...validKonsultaData,
			primaryDiagnosis: { code: "J1", description: "Pneumonia" },
		}
		const result = asPrivates(service).validateKonsultaCompleteness(data)
		expect(result.valid).toBe(false)
		expect(result.missingFields).toContain("Primary Diagnosis Code must use ICD-10 format")
	})

	it("returns valid:false with BP format error when bloodPressure is '12080' (no slash)", () => {
		const { service } = makeService()
		const data = {
			...validKonsultaData,
			vitalSigns: { ...validKonsultaData.vitalSigns, bloodPressure: "12080" },
		}
		const result = asPrivates(service).validateKonsultaCompleteness(data)
		expect(result.valid).toBe(false)
		expect(result.missingFields).toContain("Blood Pressure must use systolic/diastolic format")
	})

	it("returns valid:true when all required fields are present and correctly formatted", () => {
		const { service } = makeService()
		const result = asPrivates(service).validateKonsultaCompleteness(validKonsultaData)
		expect(result.valid).toBe(true)
		expect(result.missingFields).toEqual([])
	})
})

describe("ClinicalDocsService.signNote immutability", () => {
	it("throws BadRequestException when attempting to sign an already-signed note", async () => {
		const { service } = makeService()
		;(db.select as jest.Mock).mockReturnValueOnce({
			from: () => ({
				where: () =>
					Promise.resolve([
						{
							id: "note-1",
							facilityId: "fac-1",
							templateId: null,
							noteType: "consultation",
							structuredData: null,
							status: "signed",
							authorStaffId: "staff-1",
						},
					]),
			}),
		})

		await expect(
			service.signNote({ id: "note-1" } as never, "127.0.0.1", "user-1")
		).rejects.toThrow(BadRequestException)
	})
})

describe("ClinicalDocsService.assertIcd10DiagnosisPresentForSigning", () => {
	it("throws when a consultation note has no ICD-10 diagnosis", async () => {
		const { service } = makeService()
		await expect(
			asPrivates(service).assertIcd10DiagnosisPresentForSigning({
				noteType: "consultation",
				structuredData: { assessment: "URI", plan: "Supportive care" },
				template: null,
			})
		).rejects.toThrow(BadRequestException)
	})

	it("accepts the structured ICD-10 diagnosis selected in the note editor", async () => {
		const { service } = makeService()
		mockActiveIcd10Codes(["J18.9"])
		await expect(
			asPrivates(service).assertIcd10DiagnosisPresentForSigning({
				noteType: "consultation",
				structuredData: {
					assessment: "Pneumonia",
					plan: "Antibiotics",
					icd10_diagnosis: {
						icd10Code: "J18.9",
						icd10Display: "Pneumonia, unspecified organism",
					},
				},
				template: null,
			})
		).resolves.toBeUndefined()
	})

	it("accepts legacy diagnosis arrays from the create-note dialog", async () => {
		const { service } = makeService()
		mockActiveIcd10Codes(["J18.9"])
		await expect(
			asPrivates(service).assertIcd10DiagnosisPresentForSigning({
				noteType: "consultation",
				structuredData: {
					diagnoses: [{ code: "J18.9", description: "Pneumonia, unspecified organism" }],
				},
				template: null,
			})
		).resolves.toBeUndefined()
	})

	it("accepts multiple ICD-10 diagnoses without a primary marker", async () => {
		const { service } = makeService()
		mockActiveIcd10Codes(["J18.9", "I10"])
		await expect(
			asPrivates(service).assertIcd10DiagnosisPresentForSigning({
				noteType: "consultation",
				structuredData: {
					diagnoses: [
						{ code: "J18.9", description: "Pneumonia, unspecified organism" },
						{ code: "I10", description: "Essential hypertension" },
					],
				},
				template: null,
			})
		).resolves.toBeUndefined()
	})

	it("throws when selected ICD-10 diagnosis is not active in the master table", async () => {
		const { service } = makeService()
		mockActiveIcd10Codes([])
		await expect(
			asPrivates(service).assertIcd10DiagnosisPresentForSigning({
				noteType: "consultation",
				structuredData: {
					diagnoses: [{ code: "BAD.1", description: "Invalid diagnosis" }],
				},
				template: null,
			})
		).rejects.toThrow("Select valid active ICD-10 code")
	})
})

describe("ClinicalDocsService.updateNote author guard", () => {
	it("throws ForbiddenException when requester's staff profile does not match authorStaffId", async () => {
		const { service } = makeService()
		;(db.select as jest.Mock)
			// updateNote: fetch existing note
			.mockReturnValueOnce({
				from: () => ({
					where: () =>
						Promise.resolve([
							{
								id: "note-1",
								facilityId: "fac-1",
								templateId: null,
								noteType: "progress",
								content: "old",
								structuredData: { assessment: "x", plan: "y" },
								status: "draft",
								authorStaffId: "staff-author",
							},
						]),
				}),
			})
			// getStaffProfileId: resolve editor staff profile (different from author)
			.mockReturnValueOnce({
				from: () => ({
					where: () => ({
						limit: () => Promise.resolve([{ id: "staff-editor" }]),
					}),
				}),
			})

		await expect(
			service.updateNote({ id: "note-1", content: "new" } as never, "user-2")
		).rejects.toThrow(ForbiddenException)
	})
})

describe("ClinicalDocsService.assertNoteTargetCanBeSaved", () => {
	it("throws BadRequestException when both encounterId and preEncounterId are provided", async () => {
		const { service } = makeService()
		await expect(
			asPrivates(service).assertNoteTargetCanBeSaved({
				facilityId: "fac-1",
				encounterId: "enc-1",
				preEncounterId: "pre-1",
			})
		).rejects.toThrow(BadRequestException)
	})

	it("throws BadRequestException when neither encounterId nor preEncounterId is provided", async () => {
		const { service } = makeService()
		await expect(
			asPrivates(service).assertNoteTargetCanBeSaved({
				facilityId: "fac-1",
				encounterId: null,
				preEncounterId: null,
			})
		).rejects.toThrow(BadRequestException)
	})

	it("does not throw when only encounterId is provided and the encounter belongs to the facility", async () => {
		const { service } = makeService()
		;(db.select as jest.Mock).mockReturnValueOnce({
			from: () => ({
				where: () => ({
					limit: () => Promise.resolve([{ id: "enc-1", facilityId: "fac-1" }]),
				}),
			}),
		})

		await expect(
			asPrivates(service).assertNoteTargetCanBeSaved({
				facilityId: "fac-1",
				encounterId: "enc-1",
				preEncounterId: null,
			})
		).resolves.toBeUndefined()
	})

	it("throws NotFoundException when the encounter cannot be located", async () => {
		const { service } = makeService()
		;(db.select as jest.Mock).mockReturnValueOnce({
			from: () => ({
				where: () => ({
					limit: () => Promise.resolve([]),
				}),
			}),
		})

		await expect(
			asPrivates(service).assertNoteTargetCanBeSaved({
				facilityId: "fac-1",
				encounterId: "enc-missing",
				preEncounterId: null,
			})
		).rejects.toThrow(NotFoundException)
	})
})
