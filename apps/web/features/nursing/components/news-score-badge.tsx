import { Badge } from "@/core/components/ui/badge"

interface NewsScoreBadgeProps {
	score: number | null | undefined
	riskLevel: "low" | "medium" | "high" | null | undefined
	showScore?: boolean
}

export function NewsScoreBadge({ score, riskLevel, showScore = true }: NewsScoreBadgeProps) {
	if (score == null && !riskLevel) {
		return <Badge variant="outline">—</Badge>
	}

	const label = (() => {
		if (showScore && score != null) return `NEWS ${score}`
		if (showScore && score !== null) return `NEWS ${score}`
		if (riskLevel) return riskLevel.toUpperCase()
		return "—"
	})()

	if (!riskLevel) {
		return <Badge variant="outline">{label}</Badge>
	}

	if (riskLevel === "high") {
		return <Badge variant="destructive">{label}</Badge>
	}

	if (riskLevel === "medium") {
		return (
			<Badge className="bg-orange-500 text-white hover:bg-orange-600">{label}</Badge>
		)
	}

	// low
	return (
		<Badge className="bg-green-600 text-white hover:bg-green-700">{label}</Badge>
	)
}

export function computeNewsScore(params: {
	respiratoryRate?: number | null
	spo2?: number | null
	temperature?: number | null
	bpSystolic?: number | null
	heartRate?: number | null
	consciousnessAlert?: boolean
}): { score: number; riskLevel: "low" | "medium" | "high" } {
	let total = 0

	// Respiratory rate
	if (params.respiratoryRate != null) {
		const rr = params.respiratoryRate
		if (rr <= 8) total += 3
		else if (rr <= 11) total += 1
		else if (rr <= 20) total += 0
		else if (rr <= 24) total += 2
		else total += 3
	}

	// SpO2
	if (params.spo2 != null) {
		const s = params.spo2
		if (s <= 91) total += 3
		else if (s <= 93) total += 2
		else if (s <= 95) total += 1
		else total += 0
	}

	// Temperature
	if (params.temperature != null) {
		const t = params.temperature
		if (t <= 35) total += 3
		else if (t <= 36) total += 1
		else if (t <= 38) total += 0
		else if (t <= 39) total += 1
		else total += 2
	}

	// Systolic BP
	if (params.bpSystolic != null) {
		const sbp = params.bpSystolic
		if (sbp <= 90) total += 3
		else if (sbp <= 100) total += 2
		else if (sbp <= 110) total += 1
		else if (sbp <= 219) total += 0
		else total += 3
	}

	// Heart rate
	if (params.heartRate != null) {
		const hr = params.heartRate
		if (hr <= 40) total += 3
		else if (hr <= 50) total += 1
		else if (hr <= 90) total += 0
		else if (hr <= 110) total += 1
		else if (hr <= 130) total += 2
		else total += 3
	}

	// Consciousness (AVPU: true = Alert = 0, false = any other = 3)
	if (params.consciousnessAlert === false) {
		total += 3
	}

	const riskLevel: "low" | "medium" | "high" =
		total <= 4 ? "low" : total <= 6 ? "medium" : "high"

	return { score: total, riskLevel }
}
