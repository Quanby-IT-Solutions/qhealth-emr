import type { FpeData } from "./fpe-template"

export type FpeFieldKey =
	| keyof Omit<FpeData, "vitalSigns" | "primaryDiagnosis" | "secondaryDiagnoses">
	| `vitalSigns.${keyof FpeData["vitalSigns"]}`
	| `primaryDiagnosis.${keyof FpeData["primaryDiagnosis"]}`

export interface FpeValidationResult {
	draftMissingFields: string[]
	submitMissingFields: string[]
	fieldErrors: Partial<Record<FpeFieldKey, string>>
	formatErrorFields: string[]
	allBlockingMessages: string[]
	canSaveDraft: boolean
	canReview: boolean
}

const TEXT_MAX_LENGTHS: Partial<Record<FpeFieldKey, number>> = {
	chiefComplaint: 250,
	historyOfPresentIllness: 2000,
	pastMedicalHistory: 1500,
	familyHistory: 1000,
	socialHistory: 1000,
	mentalHealthScreening: 1000,
	reviewOfSystems: 2000,
	physicalExamGeneral: 1000,
	physicalExamHeent: 1000,
	physicalExamChestLungs: 1000,
	physicalExamCardiovascular: 1000,
	physicalExamAbdomen: 1000,
	physicalExamExtremities: 1000,
	physicalExamNeurological: 1000,
	"primaryDiagnosis.code": 8,
	"primaryDiagnosis.description": 160,
	medications: 1500,
	referrals: 1000,
	followUp: 1000,
	otherRemarks: 1000,
}

const ICD10_PATTERN = /^[A-Z][0-9][0-9A-Z](\.[0-9A-Z]{1,4})?$/
const BLOOD_PRESSURE_PATTERN = /^\d{2,3}\/\d{2,3}$/
const WHOLE_NUMBER_PATTERN = /^\d{1,3}$/
const DECIMAL_PATTERN = /^\d{1,3}(\.\d{1,2})?$/
const TEXT_PATTERN = /^[A-Za-z0-9 ñÑ.,;:()/'"+%#@&!?\-\r\n]*$/

export function maxLengthForFpeField(field: FpeFieldKey) {
	return TEXT_MAX_LENGTHS[field]
}

export function sanitizeFpeText(value: string, maxLength = 1000) {
	return value
		.replace(/[<>[\]{}\\|^~`]/g, "")
		.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
		.slice(0, maxLength)
}

export function sanitizeWholeNumber(value: string, maxLength = 3) {
	return value.replace(/\D/g, "").slice(0, maxLength)
}

export function sanitizeDecimal(value: string, maxIntegerDigits = 3, decimalDigits = 2) {
	const cleaned = value.replace(/[^\d.]/g, "")
	const [rawWhole = "", ...rest] = cleaned.split(".")
	const whole = rawWhole.slice(0, maxIntegerDigits)
	const decimal = rest.join("").slice(0, decimalDigits)
	return rest.length > 0 ? `${whole}.${decimal}` : whole
}

export function sanitizeBloodPressure(value: string) {
	const cleaned = value.replace(/[^\d/]/g, "")
	const [rawSystolic = "", ...rest] = cleaned.split("/")
	const systolic = rawSystolic.slice(0, 3)
	const diastolic = rest.join("").slice(0, 3)
	return rest.length > 0 ? `${systolic}/${diastolic}` : systolic
}

export function sanitizeIcd10Code(value: string) {
	const cleaned = value.toUpperCase().replace(/[^A-Z0-9.]/g, "")
	const [prefix = "", ...rest] = cleaned.split(".")
	const compactPrefix = prefix.slice(0, 3)
	const suffix = rest.join("").slice(0, 4)
	return rest.length > 0 ? `${compactPrefix}.${suffix}` : compactPrefix
}

function addLengthError(
	fieldErrors: Partial<Record<FpeFieldKey, string>>,
	field: FpeFieldKey,
	label: string,
	value: string
) {
	const maxLength = maxLengthForFpeField(field)
	if (maxLength && value.length > maxLength) {
		fieldErrors[field] = `${label} must be ${maxLength} characters or fewer.`
	}
}

function addTextFormatError(
	fieldErrors: Partial<Record<FpeFieldKey, string>>,
	field: FpeFieldKey,
	label: string,
	value: string
) {
	addLengthError(fieldErrors, field, label, value)
	if (value && !TEXT_PATTERN.test(value)) {
		fieldErrors[field] =
			`${label} can only contain letters, numbers, spaces, and standard clinical punctuation.`
	}
}

export function getFpeValidation(data: FpeData): FpeValidationResult {
	const draftMissingFields: string[] = []
	const submitMissingFields: string[] = []
	const fieldErrors: Partial<Record<FpeFieldKey, string>> = {}

	if (!data.primaryDiagnosis.code.trim()) {
		draftMissingFields.push("Primary Diagnosis Code")
		submitMissingFields.push("Primary Diagnosis Code")
	}
	if (!data.chiefComplaint.trim()) submitMissingFields.push("Chief Complaint")
	if (!data.vitalSigns.bloodPressure.trim()) submitMissingFields.push("Blood Pressure")
	if (!data.vitalSigns.weight.trim()) submitMissingFields.push("Weight")
	if (!data.vitalSigns.height.trim()) submitMissingFields.push("Height")
	if (!data.primaryDiagnosis.description.trim()) {
		submitMissingFields.push("Primary Diagnosis Description")
	}
	if (!data.socialHistory.trim()) {
		submitMissingFields.push("Lifestyle / Social History")
	}
	if (!data.mentalHealthScreening.trim()) {
		submitMissingFields.push("Mental Health Screening")
	}
	if (!data.historyOfPresentIllness.trim()) {
		submitMissingFields.push("History of Present Illness")
	}
	if (!data.physicalExamGeneral.trim()) {
		submitMissingFields.push("Physical Exam (General)")
	}

	if (data.primaryDiagnosis.code.trim() && !ICD10_PATTERN.test(data.primaryDiagnosis.code.trim())) {
		fieldErrors["primaryDiagnosis.code"] =
			"Primary Diagnosis Code must use ICD-10 format, for example J18.9."
	}
	addTextFormatError(
		fieldErrors,
		"primaryDiagnosis.description",
		"Primary Diagnosis Description",
		data.primaryDiagnosis.description
	)

	if (data.vitalSigns.bloodPressure && !BLOOD_PRESSURE_PATTERN.test(data.vitalSigns.bloodPressure)) {
		fieldErrors["vitalSigns.bloodPressure"] =
			"Blood Pressure must use systolic/diastolic format, for example 120/80."
	}
	for (const [key, label] of [
		["heartRate", "Heart Rate"],
		["respiratoryRate", "Respiratory Rate"],
		["oxygenSaturation", "O2 Saturation"],
	] as const) {
		if (data.vitalSigns[key] && !WHOLE_NUMBER_PATTERN.test(data.vitalSigns[key])) {
			fieldErrors[`vitalSigns.${key}`] = `${label} must be a whole number up to 3 digits.`
		}
	}
	for (const [key, label] of [
		["temperature", "Temperature"],
		["weight", "Weight"],
		["height", "Height"],
	] as const) {
		if (data.vitalSigns[key] && !DECIMAL_PATTERN.test(data.vitalSigns[key])) {
			fieldErrors[`vitalSigns.${key}`] =
				`${label} must be a number with up to 2 decimal places.`
		}
	}

	addTextFormatError(fieldErrors, "chiefComplaint", "Chief Complaint", data.chiefComplaint)
	addTextFormatError(
		fieldErrors,
		"historyOfPresentIllness",
		"History of Present Illness",
		data.historyOfPresentIllness
	)
	addTextFormatError(fieldErrors, "pastMedicalHistory", "Past Medical History", data.pastMedicalHistory)
	addTextFormatError(fieldErrors, "familyHistory", "Family History", data.familyHistory)
	addTextFormatError(fieldErrors, "socialHistory", "Social History", data.socialHistory)
	addTextFormatError(
		fieldErrors,
		"mentalHealthScreening",
		"Mental Health Screening",
		data.mentalHealthScreening
	)
	addTextFormatError(fieldErrors, "reviewOfSystems", "Review of Systems", data.reviewOfSystems)
	addTextFormatError(fieldErrors, "physicalExamGeneral", "Physical Exam General", data.physicalExamGeneral)
	addTextFormatError(fieldErrors, "physicalExamHeent", "Physical Exam HEENT", data.physicalExamHeent)
	addTextFormatError(
		fieldErrors,
		"physicalExamChestLungs",
		"Physical Exam Chest / Lungs",
		data.physicalExamChestLungs
	)
	addTextFormatError(
		fieldErrors,
		"physicalExamCardiovascular",
		"Physical Exam Cardiovascular",
		data.physicalExamCardiovascular
	)
	addTextFormatError(fieldErrors, "physicalExamAbdomen", "Physical Exam Abdomen", data.physicalExamAbdomen)
	addTextFormatError(
		fieldErrors,
		"physicalExamExtremities",
		"Physical Exam Extremities",
		data.physicalExamExtremities
	)
	addTextFormatError(
		fieldErrors,
		"physicalExamNeurological",
		"Physical Exam Neurological",
		data.physicalExamNeurological
	)
	addTextFormatError(fieldErrors, "medications", "Medications / Prescriptions", data.medications)
	addTextFormatError(fieldErrors, "referrals", "Referrals", data.referrals)
	addTextFormatError(fieldErrors, "followUp", "Follow-up Instructions", data.followUp)
	addTextFormatError(fieldErrors, "otherRemarks", "Other Remarks", data.otherRemarks)

	const formatErrorFields = Object.keys(fieldErrors)
	const formatErrorMessages = Object.values(fieldErrors)
	const allBlockingMessages = [...submitMissingFields, ...formatErrorMessages]
	const hasFormatErrors = formatErrorFields.length > 0

	return {
		draftMissingFields,
		submitMissingFields,
		fieldErrors,
		formatErrorFields,
		allBlockingMessages,
		canSaveDraft:
			draftMissingFields.length === 0 && !fieldErrors["primaryDiagnosis.code"],
		canReview: submitMissingFields.length === 0 && !hasFormatErrors,
	}
}
