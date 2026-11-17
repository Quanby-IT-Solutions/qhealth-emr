export type FaceScanGender = "male" | "female"

export interface FaceScanDemographics {
	age?: number
	gender?: FaceScanGender
	smoking?: boolean
}

export function calculateAgeYears(dateOfBirth: string, at: Date = new Date()): number | null {
	const dob = new Date(dateOfBirth)
	if (Number.isNaN(dob.getTime())) return null

	let age = at.getFullYear() - dob.getFullYear()
	const birthdayThisYear = new Date(at.getFullYear(), dob.getMonth(), dob.getDate())
	if (at < birthdayThisYear) age -= 1
	return age >= 0 && age <= 150 ? age : null
}

export function mapPatientSexToFaceScanGender(
	sex: string | null | undefined
): FaceScanGender | undefined {
	if (sex === "male" || sex === "female") return sex
	return undefined
}

export function mergeFaceScanDemographics(
	...sources: Array<FaceScanDemographics | undefined>
): FaceScanDemographics {
	const merged: FaceScanDemographics = {}
	for (const source of sources) {
		if (!source) continue
		if (source.age !== undefined) merged.age = source.age
		if (source.gender !== undefined) merged.gender = source.gender
		if (source.smoking !== undefined) merged.smoking = source.smoking
	}
	return merged
}
