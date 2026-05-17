export type DeathReportType = "fmdrf" | "fndrf"
export type DeathReportWorkflowStatus = "draft" | "completed" | "submitted"

const MS_PER_DAY = 1000 * 60 * 60 * 24

function toDate(value: Date | string | null | undefined): Date | null {
	if (!value) return null
	const parsed = value instanceof Date ? value : new Date(value)
	return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function calculateAgeYears(
	dateOfBirth: Date | string | null | undefined,
	at: Date | string = new Date()
) {
	const dob = toDate(dateOfBirth)
	const reference = toDate(at)
	if (!dob || !reference) return null

	let age = reference.getFullYear() - dob.getFullYear()
	const birthdayThisYear = new Date(reference.getFullYear(), dob.getMonth(), dob.getDate())
	if (reference < birthdayThisYear) age -= 1

	return age
}

export function calculateAgeDays(
	dateOfBirth: Date | string | null | undefined,
	at: Date | string = new Date()
) {
	const dob = toDate(dateOfBirth)
	const reference = toDate(at)
	if (!dob || !reference) return null
	return Math.floor((reference.getTime() - dob.getTime()) / MS_PER_DAY)
}

export function isMaternalDeathCandidate(
	sex: string | null | undefined,
	dateOfBirth: Date | string | null | undefined,
	at: Date | string = new Date()
) {
	if ((sex ?? "").toLowerCase() !== "female") return false
	const ageYears = calculateAgeYears(dateOfBirth, at)
	return ageYears !== null && ageYears >= 10 && ageYears < 50
}

export function isNeonatalDeathCandidate(
	dateOfBirth: Date | string | null | undefined,
	at: Date | string = new Date()
) {
	const ageDays = calculateAgeDays(dateOfBirth, at)
	return ageDays !== null && ageDays >= 0 && ageDays < 28
}

export function getRequiredDeathReportTypes(
	sex: string | null | undefined,
	dateOfBirth: Date | string | null | undefined,
	at: Date | string = new Date()
): DeathReportType[] {
	const required: DeathReportType[] = []
	if (isMaternalDeathCandidate(sex, dateOfBirth, at)) required.push("fmdrf")
	if (isNeonatalDeathCandidate(dateOfBirth, at)) required.push("fndrf")
	return required
}

export function isSubmittedDeathReportStatus(status: string | null | undefined) {
	return status === "submitted" || status === "completed"
}

export function formatDeathReportLabels(types: DeathReportType[]) {
	return types.map(type => (type === "fmdrf" ? "FMDRF" : "FNDRF")).join(" and ")
}
