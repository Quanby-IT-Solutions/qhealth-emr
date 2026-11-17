export interface FaceScanVitals {
	bpSystolic: number | null
	bpDiastolic: number | null
	heartRate: number | null
	respiratoryRate: number | null
	spo2: number | null
	/** From pre-scan setup (not measured by camera). */
	heightCm?: number
	/** From pre-scan setup (not measured by camera). */
	weightKg?: number
}

export function hasFaceScanVitals(vitals: FaceScanVitals): boolean {
	return (
		vitals.bpSystolic != null ||
		vitals.bpDiastolic != null ||
		vitals.heartRate != null ||
		vitals.respiratoryRate != null ||
		vitals.spo2 != null
	)
}

function toStringValue(value: number | null): string {
	return value != null ? String(Math.round(value)) : ""
}

function toSpo2String(value: number | null): string {
	return value != null ? String(Math.round(value)) : ""
}

function toMeasurementString(value: number | undefined): string {
	return value != null && !Number.isNaN(value) ? String(Math.round(value)) : ""
}

export function mergeSetupMeasurements(
	vitals: FaceScanVitals,
	setup?: { heightCm?: number; weightKg?: number }
): FaceScanVitals {
	if (!setup?.heightCm && !setup?.weightKg) return vitals
	return {
		...vitals,
		...(setup.heightCm !== undefined ? { heightCm: setup.heightCm } : {}),
		...(setup.weightKg !== undefined ? { weightKg: setup.weightKg } : {}),
	}
}

export function toNursingFields(vitals: FaceScanVitals) {
	return {
		bpSystolic: toStringValue(vitals.bpSystolic),
		bpDiastolic: toStringValue(vitals.bpDiastolic),
		heartRate: toStringValue(vitals.heartRate),
		respiratoryRate: toStringValue(vitals.respiratoryRate),
		spo2: toSpo2String(vitals.spo2),
		height: toMeasurementString(vitals.heightCm),
		weight: toMeasurementString(vitals.weightKg),
	}
}

export function toEdTriageFields(vitals: FaceScanVitals) {
	return toNursingFields(vitals)
}

export function toOpdTriageFields(vitals: FaceScanVitals) {
	return {
		systolicBp: toStringValue(vitals.bpSystolic),
		diastolicBp: toStringValue(vitals.bpDiastolic),
		heartRateBpm: toStringValue(vitals.heartRate),
		respiratoryRate: toStringValue(vitals.respiratoryRate),
		oxygenSatPct: toSpo2String(vitals.spo2),
		heightCm: toMeasurementString(vitals.heightCm),
		weightKg: toMeasurementString(vitals.weightKg),
	}
}

export function toTelemedicineFields(vitals: FaceScanVitals) {
	const bp =
		vitals.bpSystolic != null && vitals.bpDiastolic != null
			? `${Math.round(vitals.bpSystolic)}/${Math.round(vitals.bpDiastolic)}`
			: ""
	return {
		bloodPressure: bp,
		heartRate: toStringValue(vitals.heartRate),
		oxygenSaturation: toSpo2String(vitals.spo2),
	}
}

export function toFpeFields(vitals: FaceScanVitals) {
	const bp =
		vitals.bpSystolic != null && vitals.bpDiastolic != null
			? `${Math.round(vitals.bpSystolic)}/${Math.round(vitals.bpDiastolic)}`
			: ""
	return {
		bloodPressure: bp,
		heartRate: toStringValue(vitals.heartRate),
		respiratoryRate: toStringValue(vitals.respiratoryRate),
		oxygenSaturation: toSpo2String(vitals.spo2),
		height: toMeasurementString(vitals.heightCm),
		weight: toMeasurementString(vitals.weightKg),
	}
}

export interface FaceScanResultItem {
	id: string
	label: string
	shortLabel: string
	value: string
	unit?: string
	source: "camera" | "setup"
}

export function getFaceScanResultItems(vitals: FaceScanVitals): FaceScanResultItem[] {
	const items: FaceScanResultItem[] = []

	if (vitals.bpSystolic != null && vitals.bpDiastolic != null) {
		items.push({
			id: "bp",
			label: "Blood pressure",
			shortLabel: "BP",
			value: `${Math.round(vitals.bpSystolic)}/${Math.round(vitals.bpDiastolic)}`,
			unit: "mmHg",
			source: "camera",
		})
	}
	if (vitals.heartRate != null) {
		items.push({
			id: "hr",
			label: "Heart rate",
			shortLabel: "HR",
			value: String(Math.round(vitals.heartRate)),
			unit: "bpm",
			source: "camera",
		})
	}
	if (vitals.respiratoryRate != null) {
		items.push({
			id: "rr",
			label: "Respiratory rate",
			shortLabel: "RR",
			value: String(Math.round(vitals.respiratoryRate)),
			unit: "/min",
			source: "camera",
		})
	}
	if (vitals.spo2 != null) {
		items.push({
			id: "spo2",
			label: "Oxygen saturation",
			shortLabel: "SpO2",
			value: String(Math.round(vitals.spo2)),
			unit: "%",
			source: "camera",
		})
	}
	if (vitals.heightCm != null) {
		items.push({
			id: "height",
			label: "Height",
			shortLabel: "Height",
			value: String(Math.round(vitals.heightCm)),
			unit: "cm",
			source: "setup",
		})
	}
	if (vitals.weightKg != null) {
		items.push({
			id: "weight",
			label: "Weight",
			shortLabel: "Weight",
			value: String(Math.round(vitals.weightKg)),
			unit: "kg",
			source: "setup",
		})
	}

	return items
}

export function formatFaceScanSummary(vitals: FaceScanVitals): string {
	return getFaceScanResultItems(vitals)
		.map(item => {
			const unitSuffix =
				item.unit === "%" ? "%" : item.unit && item.unit !== "mmHg" ? ` ${item.unit}` : ""
			return `${item.shortLabel} ${item.value}${unitSuffix}`
		})
		.join(" · ")
}
