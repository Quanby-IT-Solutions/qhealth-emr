export interface DetectedProcedure {
	key: string
	label: string
}

const PROCEDURE_SPLIT_PATTERN = /[\n;]+/
const BULLET_PREFIX_PATTERN = /^\s*(?:[-*•]+|\d+[\.\)\-]?|[A-Za-z][\.\)\-])\s*/
const MULTISPACE_PATTERN = /\s+/g

function sanitizeProcedureLabel(value: string) {
	return value.trim().replace(BULLET_PREFIX_PATTERN, "").replace(MULTISPACE_PATTERN, " ").trim()
}

export function normalizeProcedureLabel(value: string) {
	return sanitizeProcedureLabel(value).toLowerCase()
}

export function detectProcedures(
	procedurePerformed: string | null | undefined
): DetectedProcedure[] {
	const rawValue = procedurePerformed?.trim() ?? ""
	if (!rawValue) {
		return []
	}

	const seen = new Set<string>()
	const procedures: DetectedProcedure[] = []

	for (const part of rawValue.replace(/\r\n/g, "\n").split(PROCEDURE_SPLIT_PATTERN)) {
		const label = sanitizeProcedureLabel(part)
		if (!label) {
			continue
		}

		const normalizedLabel = normalizeProcedureLabel(label)
		if (seen.has(normalizedLabel)) {
			continue
		}

		seen.add(normalizedLabel)
		procedures.push({
			key: `procedure-${procedures.length + 1}`,
			label,
		})
	}

	return procedures
}
