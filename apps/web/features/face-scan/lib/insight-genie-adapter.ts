import type { FaceScanVitals } from "./face-scan-vitals"

interface HarvestedValue {
	key: string
	keyLower: string
	value: number
	path: string
	pathLower: string
}

function harvestNumericValues(
	obj: unknown,
	prefix: string,
	out: HarvestedValue[],
	seen: WeakSet<object>
) {
	if (!obj || typeof obj !== "object") return
	if (seen.has(obj)) return
	seen.add(obj)

	for (const [key, value] of Object.entries(obj)) {
		const path = prefix ? `${prefix}.${key}` : key

		if (typeof value === "number" && !Number.isNaN(value)) {
			out.push({
				key,
				keyLower: key.toLowerCase(),
				value,
				path,
				pathLower: path.toLowerCase(),
			})
		} else if (typeof value === "string") {
			const parsed = parseFloat(value)
			if (!Number.isNaN(parsed) && /^-?[0-9.,]+%?$/.test(value.trim())) {
				out.push({
					key,
					keyLower: key.toLowerCase(),
					value: parsed,
					path,
					pathLower: path.toLowerCase(),
				})
			}
		} else if (value && typeof value === "object" && !Array.isArray(value)) {
			harvestNumericValues(value, path, out, seen)
		}
	}
}

interface DeepMetrics {
	heartRate: number | null
	respiratoryRate: number | null
	spo2: number | null
	systolic: number | null
	diastolic: number | null
}

function findResultRoot(message: unknown): unknown {
	if (!message || typeof message !== "object") return message
	const record = message as Record<string, unknown>
	const candidates = [
		record.analysisData,
		record.healthData,
		record.healthAnalysis,
		record.results,
		record.analysis,
		record.scanResults,
		record.payload,
		record.response,
		record.data,
		message,
	]
	for (const candidate of candidates) {
		if (
			candidate &&
			typeof candidate === "object" &&
			COMPLETION_INDICATOR_KEYS.some(
				key =>
					key in (candidate as Record<string, unknown>) &&
					(candidate as Record<string, unknown>)[key]
			)
		) {
			return candidate
		}
	}
	return message
}

function extractDeepMetrics(message: unknown): DeepMetrics {
	const harvest: HarvestedValue[] = []
	const root = findResultRoot(message)
	if (root && typeof root === "object") {
		harvestNumericValues(root, "", harvest, new WeakSet())
	}
	if (message && typeof message === "object" && root !== message) {
		harvestNumericValues(message, "", harvest, new WeakSet())
	}

	const has = (m: HarvestedValue, ...needles: string[]) =>
		needles.some(n => m.keyLower === n || m.pathLower.endsWith(`.${n}`))
	const keyContains = (m: HarvestedValue, ...needles: string[]) =>
		needles.some(n => m.keyLower.includes(n))

	const out: DeepMetrics = {
		heartRate: null,
		respiratoryRate: null,
		spo2: null,
		systolic: null,
		diastolic: null,
	}

	for (const m of harvest) {
		if (
			out.heartRate === null &&
			has(m, "heart_rate", "heartrate", "pulse_rate", "pulserate", "bpm", "hr")
		) {
			out.heartRate = m.value
			continue
		}
		if (
			out.respiratoryRate === null &&
			has(m, "respiratory_rate", "respiratoryrate", "respiration_rate", "respirationrate")
		) {
			out.respiratoryRate = m.value
			continue
		}
		if (out.spo2 === null && has(m, "spo2", "oxygen_saturation", "oxygensaturation", "spo_2")) {
			out.spo2 = m.value
			continue
		}
		if (
			out.systolic === null &&
			(has(
				m,
				"systolic_bp",
				"systolicbp",
				"bp_systolic",
				"bpsystolic",
				"systolic",
				"systolicpressure",
				"systolic_pressure",
				"systolic_blood_pressure",
				"systolicbloodpressure"
			) ||
				(keyContains(m, "systolic") && !keyContains(m, "diastolic")))
		) {
			out.systolic = m.value
			continue
		}
		if (
			out.diastolic === null &&
			(has(
				m,
				"diastolic_bp",
				"diastolicbp",
				"bp_diastolic",
				"bpdiastolic",
				"diastolic",
				"diastolicpressure",
				"diastolic_pressure",
				"diastolic_blood_pressure",
				"diastolicbloodpressure"
			) ||
				keyContains(m, "diastolic"))
		) {
			out.diastolic = m.value
			continue
		}
	}

	return out
}

export function mapInsightGenieToFaceScanVitals(message: unknown): FaceScanVitals {
	const m = extractDeepMetrics(message)
	return {
		heartRate: m.heartRate,
		respiratoryRate: m.respiratoryRate,
		spo2: m.spo2,
		bpSystolic: m.systolic,
		bpDiastolic: m.diastolic,
	}
}

const COMPLETION_INDICATOR_KEYS = [
	"vital_signs",
	"vitalSigns",
	"holistic_health",
	"holisticHealth",
	"health_risks",
	"healthRisks",
	"scores",
]

export function looksLikeCompletionPayload(data: unknown): boolean {
	if (!data || typeof data !== "object") return false
	const record = data as Record<string, unknown>
	for (const key of COMPLETION_INDICATOR_KEYS) {
		if (key in record && record[key]) return true
	}
	const nested =
		record.analysisData ||
		record.healthData ||
		record.healthAnalysis ||
		record.results ||
		record.analysis ||
		record.scanResults ||
		record.payload ||
		record.response ||
		record.data
	if (nested && typeof nested === "object") {
		for (const key of COMPLETION_INDICATOR_KEYS) {
			if (key in nested && (nested as Record<string, unknown>)[key]) return true
		}
	}
	return false
}

export type ScanState =
	"idle" | "authenticating" | "positioning" | "analyzing" | "complete" | "error"
