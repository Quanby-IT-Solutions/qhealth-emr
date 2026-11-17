export type WeightUnit = "kg" | "lb"
export type HeightUnit = "cm" | "ft-in"

const LB_PER_KG = 2.2046226218
const CM_PER_INCH = 2.54

function parseInputNumber(value: string): number | undefined {
	if (!value.trim()) return undefined
	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : undefined
}

function formatNumber(value: number, fractionDigits = 1): string {
	return Number(value.toFixed(fractionDigits)).toString()
}

export function parseWeightToKg(value: string, unit: WeightUnit): number | undefined {
	const parsed = parseInputNumber(value)
	if (parsed === undefined) return undefined
	return unit === "lb" ? parsed / LB_PER_KG : parsed
}

export function formatWeightFromKg(weightKg: number | string | null | undefined, unit: WeightUnit) {
	const parsed = typeof weightKg === "string" ? parseInputNumber(weightKg) : weightKg
	if (parsed == null || !Number.isFinite(parsed)) return ""
	return unit === "lb" ? formatNumber(parsed * LB_PER_KG) : formatNumber(parsed)
}

export function parseHeightToCm(input: {
	unit: HeightUnit
	cm?: string
	feet?: string
	inches?: string
}): number | undefined {
	if (input.unit === "cm") return parseInputNumber(input.cm ?? "")

	const feet = parseInputNumber(input.feet ?? "") ?? 0
	const inches = parseInputNumber(input.inches ?? "") ?? 0
	if (!input.feet?.trim() && !input.inches?.trim()) return undefined
	return (feet * 12 + inches) * CM_PER_INCH
}

export function formatHeightFromCm(heightCm: number | string | null | undefined) {
	const parsed = typeof heightCm === "string" ? parseInputNumber(heightCm) : heightCm
	if (parsed == null || !Number.isFinite(parsed)) return ""
	return formatNumber(parsed)
}

export function heightCmToFeetInches(heightCm: number | string | null | undefined): {
	feet: string
	inches: string
} {
	const parsed = typeof heightCm === "string" ? parseInputNumber(heightCm) : heightCm
	if (parsed == null || !Number.isFinite(parsed)) return { feet: "", inches: "" }

	const totalInches = Math.round(parsed / CM_PER_INCH)
	const feet = Math.floor(totalInches / 12)
	const inches = totalInches % 12
	return { feet: String(feet), inches: String(inches) }
}

export function isValidHeightCm(value: number | undefined): boolean {
	return value !== undefined && value >= 50 && value <= 300
}

export function isValidWeightKg(value: number | undefined): boolean {
	return value !== undefined && value >= 10 && value <= 500
}
