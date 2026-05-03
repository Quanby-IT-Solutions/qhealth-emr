interface CapitationBenefit {
	consultationsUsed: number
	consultationsAllowed: number
	status: string
}

export function getCapitationTag(benefit: CapitationBenefit): "Eligible" | "Pending" | "Lapsed" {
	if (benefit.status === "inactive") return "Lapsed"
	if (benefit.status === "exhausted") return "Lapsed"
	if (benefit.consultationsUsed < benefit.consultationsAllowed) return "Eligible"
	return "Pending"
}

export function getCapitationTooltip(tag: string): string {
	if (tag === "Eligible") return "Patient has remaining Konsulta consultations for this benefit year."
	if (tag === "Pending") return "Patient has used all allowed consultations; additional visits are pending approval."
	return "Patient's Konsulta benefit is lapsed or inactive for this period."
}
