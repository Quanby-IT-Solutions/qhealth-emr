export type SourceType = "auto_medication" | "auto_lab" | "auto_imaging" | "manual"

export function formatSourceLabel(source: SourceType): string {
	switch (source) {
		case "auto_medication":
			return "Medication Order"
		case "auto_lab":
			return "Lab Order"
		case "auto_imaging":
			return "Imaging Order"
		case "manual":
			return "Manual"
	}
}

export function sourceOriginHref(
	sourceType: SourceType,
	sourceOrderId: string | null,
	encounterId: string
): string | null {
	if (!sourceOrderId) return null
	switch (sourceType) {
		case "auto_medication":
			return `/encounters/${encounterId}/orders/medications/${sourceOrderId}`
		case "auto_lab":
			return `/encounters/${encounterId}/orders/lab/${sourceOrderId}`
		case "auto_imaging":
			return `/encounters/${encounterId}/orders/imaging/${sourceOrderId}`
		default:
			return null
	}
}

export function computeTotals(items: Array<{ totalAmount: string | number }>) {
	return items.reduce((sum, item) => sum + Number(item.totalAmount), 0)
}
