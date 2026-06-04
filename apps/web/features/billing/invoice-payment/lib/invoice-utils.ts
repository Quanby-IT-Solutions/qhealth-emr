export function computeInvoiceTotals(params: {
	subtotal: number
	discountAmount?: number
	philhealthCoverage?: number
	vatAmount?: number
}): {
	subtotal: number
	discountAmount: number
	philhealthCoverage: number
	vatAmount: number
	total: number
} {
	const { subtotal, discountAmount = 0, philhealthCoverage = 0, vatAmount = 0 } = params
	const total = Math.max(0, subtotal - discountAmount - philhealthCoverage + vatAmount)
	return { subtotal, discountAmount, philhealthCoverage, vatAmount, total }
}

export function paymentMethodLabel(method: string): string {
	const map: Record<string, string> = {
		cash: "Cash",
		card: "Card",
		gcash: "GCash",
		hmo: "HMO",
		malasakit: "Malasakit",
		philhealth: "PhilHealth",
		coe: "COE",
	}
	return map[method] ?? method
}

export function computeChange(tendered: number, total: number): number {
	return Math.max(0, tendered - total)
}
