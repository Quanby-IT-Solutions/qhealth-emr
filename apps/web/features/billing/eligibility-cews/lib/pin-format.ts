export function formatPin(raw: string): string {
	const digits = raw.replace(/\D/g, "").slice(0, 12)
	if (digits.length <= 2) return digits
	if (digits.length <= 11) return `${digits.slice(0, 2)}-${digits.slice(2)}`
	return `${digits.slice(0, 2)}-${digits.slice(2, 11)}-${digits.slice(11)}`
}

export function validatePin(raw: string): boolean {
	const digits = raw.replace(/-/g, "")
	return /^\d{12}$/.test(digits)
}
