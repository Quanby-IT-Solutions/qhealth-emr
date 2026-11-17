export interface VitalLineInput {
	recordedAt?: string | Date | null
	temperature?: string | number | null
	bpSystolic?: number | null
	bpDiastolic?: number | null
	heartRate?: number | null
	respiratoryRate?: number | null
	spo2?: string | number | null
	painScore?: number | null
	weight?: string | number | null
	height?: string | number | null
}

function isPresent(value: string | number | null | undefined) {
	return value !== null && value !== undefined && value !== ""
}

export function formatDateTime(dateStr: string | Date | null | undefined) {
	if (!dateStr) return "-"
	return new Date(dateStr).toLocaleString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

export function hasVitalMeasurements(vitals: VitalLineInput) {
	return (
		isPresent(vitals.temperature) ||
		isPresent(vitals.bpSystolic) ||
		isPresent(vitals.bpDiastolic) ||
		isPresent(vitals.heartRate) ||
		isPresent(vitals.respiratoryRate) ||
		isPresent(vitals.spo2) ||
		(vitals.painScore !== null && vitals.painScore !== undefined) ||
		isPresent(vitals.weight) ||
		isPresent(vitals.height)
	)
}

export function formatVitalLine(vitals: VitalLineInput) {
	if (!hasVitalMeasurements(vitals)) return ""

	const parts = [
		isPresent(vitals.bpSystolic) && isPresent(vitals.bpDiastolic)
			? `BP ${vitals.bpSystolic}/${vitals.bpDiastolic} mmHg`
			: isPresent(vitals.bpSystolic)
				? `BP ${vitals.bpSystolic} mmHg (systolic)`
				: null,
		isPresent(vitals.heartRate) ? `HR ${vitals.heartRate} bpm` : null,
		isPresent(vitals.respiratoryRate) ? `RR ${vitals.respiratoryRate}/min` : null,
		isPresent(vitals.temperature) ? `Temp ${vitals.temperature} C` : null,
		isPresent(vitals.spo2) ? `SpO2 ${vitals.spo2}%` : null,
		vitals.painScore !== null && vitals.painScore !== undefined
			? `Pain ${vitals.painScore}/10`
			: null,
		isPresent(vitals.weight) ? `Weight ${vitals.weight} kg` : null,
		isPresent(vitals.height) ? `Height ${vitals.height} cm` : null,
	].filter((part): part is string => Boolean(part))

	return `Vitals (${formatDateTime(vitals.recordedAt)}): ${parts.join(", ")}`
}
