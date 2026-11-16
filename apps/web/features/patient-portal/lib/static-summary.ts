export type PatientPortalDocument = {
	id: string
	title: string
	category: string
	releasedAt: string
	format: string
	fileName: string
	description: string
	body: string
}

export type SummaryItem = {
	label: string
	value: string
	detail?: string
	status?: "normal" | "attention" | "released"
}

export type PatientPortalIdentity = {
	mrn: string
	dateOfBirthIso: string
	patientName: string
}

export const patientPortalSnapshot = {
	patientName: "Maria Santos",
	preferredName: "Maria",
	mrn: "QH-000002",
	maskedMrn: "QH-***-002",
	dateOfBirthIso: "1992-07-03",
	dateOfBirth: "July 3, 1992",
	portalUser: "Maria Santos",
	proxyAccess: "No active proxy",
	facility: "Quanby Solutions, Inc.",
	snapshotDate: "May 28, 2026",
	generatedAt: "May 28, 2026, 06:00 AM PHT",
	releasedThrough: "Released records through May 27, 2026, 11:59 PM PHT",
	source: "Read-only daily static summary cache",
}

export const releasedPortalPatientIdentities: PatientPortalIdentity[] = [
	{
		mrn: "QH-000001",
		dateOfBirthIso: "1985-01-15",
		patientName: "Juan Dela Cruz",
	},
	{
		mrn: patientPortalSnapshot.mrn,
		dateOfBirthIso: patientPortalSnapshot.dateOfBirthIso,
		patientName: patientPortalSnapshot.patientName,
	},
	{
		mrn: "QH-000003",
		dateOfBirthIso: "1978-11-21",
		patientName: "Pedro Reyes",
	},
	{
		mrn: "QH-NBN-001",
		dateOfBirthIso: "2026-05-09",
		patientName: "Baby Santos",
	},
	{
		mrn: "QH-NBN-002",
		dateOfBirthIso: "2026-05-09",
		patientName: "Baby Boy Reyes",
	},
]

export function normalizePortalMrn(value: string) {
	return value
		.trim()
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, "")
}

function dateIsoHoursAgo(hoursAgo: number) {
	return new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function dynamicNewbornDateCandidates(hoursAgo: number) {
	return new Set([
		dateIsoHoursAgo(hoursAgo - 24),
		dateIsoHoursAgo(hoursAgo),
		dateIsoHoursAgo(hoursAgo + 24),
	])
}

export function findReleasedPortalPatientIdentity(mrn: string, dateOfBirthIso: string) {
	const normalizedMrn = normalizePortalMrn(mrn)
	const exactIdentity = releasedPortalPatientIdentities.find(identity => {
		return (
			normalizePortalMrn(identity.mrn) === normalizedMrn &&
			identity.dateOfBirthIso === dateOfBirthIso
		)
	})

	if (exactIdentity) {
		return exactIdentity
	}

	if (
		normalizedMrn === normalizePortalMrn("QH-NBN-001") &&
		dynamicNewbornDateCandidates(36).has(dateOfBirthIso)
	) {
		return {
			mrn: "QH-NBN-001",
			dateOfBirthIso,
			patientName: "Baby Santos",
		}
	}

	if (
		normalizedMrn === normalizePortalMrn("QH-NBN-002") &&
		dynamicNewbornDateCandidates(30).has(dateOfBirthIso)
	) {
		return {
			mrn: "QH-NBN-002",
			dateOfBirthIso,
			patientName: "Baby Boy Reyes",
		}
	}

	return null
}

export const patientOverview: SummaryItem[] = [
	{
		label: "Current encounter",
		value: "Outpatient follow-up",
		detail: "Family Medicine Clinic, Room FM-03",
		status: "released",
	},
	{
		label: "Attending clinician",
		value: "Dr. Rafael Cruz",
		detail: "Released for patient portal review",
		status: "released",
	},
	{
		label: "Allergies",
		value: "Penicillin",
		detail: "Rash. Avoid beta-lactam antibiotics unless cleared.",
		status: "attention",
	},
	{
		label: "Care status",
		value: "Stable",
		detail: "No critical unreleased result in this snapshot.",
		status: "normal",
	},
]

export const medicationSummary: SummaryItem[] = [
	{
		label: "Metformin 500 mg tablet",
		value: "Take 1 tablet twice daily with meals",
		detail: "Active outpatient medication",
	},
	{
		label: "Losartan 50 mg tablet",
		value: "Take 1 tablet every morning",
		detail: "Active outpatient medication",
	},
	{
		label: "Paracetamol 500 mg tablet",
		value: "Take 1 tablet every 6 hours as needed for pain or fever",
		detail: "Do not exceed 4,000 mg per day.",
	},
]

export const labSummary: SummaryItem[] = [
	{
		label: "CBC",
		value: "Hemoglobin 13.4 g/dL",
		detail: "Released May 27, 2026, within expected range.",
		status: "normal",
	},
	{
		label: "Basic metabolic panel",
		value: "Creatinine 0.84 mg/dL",
		detail: "Released May 27, 2026, stable renal function.",
		status: "normal",
	},
	{
		label: "HbA1c",
		value: "6.9%",
		detail: "Released May 27, 2026, follow diabetes care plan.",
		status: "attention",
	},
]

export const imagingSummary: SummaryItem[] = [
	{
		label: "Chest X-ray",
		value: "No acute cardiopulmonary abnormality",
		detail: "Report signed and released May 27, 2026.",
		status: "released",
	},
	{
		label: "PACS viewer",
		value: "Released image link available to clinicians",
		detail: "Patients receive the signed report in this daily summary.",
		status: "released",
	},
]

export const carePlanSummary: SummaryItem[] = [
	{
		label: "Follow-up",
		value: "Family Medicine Clinic on June 10, 2026 at 9:30 AM",
		detail: "Bring current medications and home blood pressure log.",
	},
	{
		label: "Home monitoring",
		value: "Record blood pressure every morning for 7 days",
		detail: "Contact the clinic for persistent readings above 140/90.",
	},
	{
		label: "Lifestyle guidance",
		value: "Continue low-salt meal plan and 30-minute walks",
		detail: "As tolerated and unless symptoms worsen.",
	},
]

export const patientPortalDocuments: PatientPortalDocument[] = [
	{
		id: "daily-summary",
		title: "Daily Released Medical Summary",
		category: "Patient Summary",
		releasedAt: "May 28, 2026, 06:00 AM PHT",
		format: "TXT",
		fileName: "quanby-daily-summary-2026-05-28.txt",
		description:
			"Read-only static snapshot of released medications, allergies, results, imaging, and care instructions.",
		body: [
			"Quanby Patient Portal - Daily Released Medical Summary",
			"",
			"Patient: Maria Santos",
			"MRN: QH-***-002",
			"Snapshot date: May 28, 2026",
			"Generated: May 28, 2026, 06:00 AM PHT",
			"Released through: May 27, 2026, 11:59 PM PHT",
			"",
			"Current encounter: Outpatient follow-up, Family Medicine Clinic.",
			"Allergies: Penicillin - rash.",
			"Medications: Metformin, Losartan, Paracetamol as needed.",
			"Recent labs: CBC stable, creatinine stable, HbA1c 6.9%.",
			"Imaging: Chest X-ray report signed and released with no acute cardiopulmonary abnormality.",
			"Care plan: Follow up on June 10, 2026 at 9:30 AM.",
		].join("\n"),
	},
	{
		id: "lab-results",
		title: "Released Laboratory Results",
		category: "Diagnostics",
		releasedAt: "May 27, 2026, 05:42 PM PHT",
		format: "TXT",
		fileName: "quanby-released-lab-results-2026-05-27.txt",
		description: "Released CBC, metabolic panel, and HbA1c results from the current summary cycle.",
		body: [
			"Quanby Patient Portal - Released Laboratory Results",
			"",
			"Patient: Maria Santos",
			"MRN: QH-***-002",
			"Released: May 27, 2026, 05:42 PM PHT",
			"",
			"CBC: Hemoglobin 13.4 g/dL.",
			"Basic metabolic panel: Creatinine 0.84 mg/dL.",
			"HbA1c: 6.9%. Follow the active diabetes care plan and scheduled clinic follow-up.",
		].join("\n"),
	},
	{
		id: "radiology-report",
		title: "Released Radiology Report",
		category: "Radiology",
		releasedAt: "May 27, 2026, 03:15 PM PHT",
		format: "TXT",
		fileName: "quanby-radiology-report-2026-05-27.txt",
		description: "Signed chest X-ray report released for portal viewing and download.",
		body: [
			"Quanby Patient Portal - Released Radiology Report",
			"",
			"Patient: Maria Santos",
			"MRN: QH-***-002",
			"Study: Chest X-ray",
			"Released: May 27, 2026, 03:15 PM PHT",
			"",
			"Impression: No acute cardiopulmonary abnormality.",
			"Report status: Signed and released.",
		].join("\n"),
	},
]

export function createDocumentDownloadHref(document: PatientPortalDocument) {
	return `data:text/plain;charset=utf-8,${encodeURIComponent(document.body)}`
}
