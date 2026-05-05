export type SurgicalRvsAssignmentStatus = "suggested" | "validated" | "finalized"
export type SurgicalRvsAssignmentType = "primary" | "adjunct"

const PROCEDURE_SPLIT_PATTERN = /[\n;]+/
const BULLET_PREFIX_PATTERN = /^\s*(?:[-*•]+|\d+[\.\)\-]?|[A-Za-z][\.\)\-])\s*/
const MULTISPACE_PATTERN = /\s+/g

function sanitizeProcedureLabel(value: string) {
	return value
		.trim()
		.replace(BULLET_PREFIX_PATTERN, "")
		.replace(MULTISPACE_PATTERN, " ")
		.trim()
}

export function normalizeProcedureLabel(value: string) {
	return sanitizeProcedureLabel(value).toLowerCase()
}

export function detectProcedureLabels(procedurePerformed: string | null | undefined) {
	const rawValue = procedurePerformed?.trim() ?? ""
	if (!rawValue) {
		return []
	}

	const seen = new Set<string>()
	const labels: string[] = []

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
		labels.push(label)
	}

	return labels
}

export function resolveProcedureLabel(
	inputLabel: string,
	procedurePerformed: string | null | undefined
) {
	const normalizedInput = normalizeProcedureLabel(inputLabel)
	if (!normalizedInput) {
		return null
	}

	return (
		detectProcedureLabels(procedurePerformed).find(
			label => normalizeProcedureLabel(label) === normalizedInput
		) ?? null
	)
}

export interface ProcedureCoverageAssignment {
	procedureLabel: string | null | undefined
	assignmentType: SurgicalRvsAssignmentType | null | undefined
	status: SurgicalRvsAssignmentStatus
}

export interface ProcedureCoverageSummary {
	label: string
	operationRecordSigned: boolean
	primaryCodeCount: number
	adjunctCodeCount: number
	isReady: boolean
}

export function evaluateProcedureCoverage(options: {
	procedurePerformed: string | null | undefined
	operationRecordSigned: boolean
	assignments: ProcedureCoverageAssignment[]
	acceptedStatuses?: SurgicalRvsAssignmentStatus[]
}) {
	const detectedLabels = detectProcedureLabels(options.procedurePerformed)
	const acceptedStatuses = new Set(
		options.acceptedStatuses ?? ["suggested", "validated", "finalized"]
	)

	const procedures = detectedLabels.map(label => {
		const normalizedLabel = normalizeProcedureLabel(label)
		const relatedAssignments = options.assignments.filter(assignment => {
			if (!acceptedStatuses.has(assignment.status)) {
				return false
			}

			if (assignment.procedureLabel) {
				return normalizeProcedureLabel(assignment.procedureLabel) === normalizedLabel
			}

			// Legacy rows created before explicit procedure mapping should still satisfy
			// single-procedure records.
			return detectedLabels.length === 1
		})

		const primaryCodeCount = relatedAssignments.filter(
			assignment => (assignment.assignmentType ?? "primary") === "primary"
		).length
		const adjunctCodeCount = relatedAssignments.filter(
			assignment => assignment.assignmentType === "adjunct"
		).length
		const isReady = options.operationRecordSigned && primaryCodeCount > 0

		return {
			label,
			operationRecordSigned: options.operationRecordSigned,
			primaryCodeCount,
			adjunctCodeCount,
			isReady,
		} satisfies ProcedureCoverageSummary
	})

	return {
		isReady: procedures.every(procedure => procedure.isReady),
		missingProcedureLabels: procedures
			.filter(procedure => !procedure.isReady)
			.map(procedure => procedure.label),
		procedures,
	}
}
