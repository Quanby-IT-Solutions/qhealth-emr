export const STATUS_COLORS: Record<string, string> = {
	pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
	appropriate: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
	flagged: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

export const SLA_HOURS = 24

export function isSlaBreached(accessWindowEnd: unknown): boolean {
	if (!accessWindowEnd) return false
	try {
		const end = new Date(accessWindowEnd as string)
		const diffMs = Date.now() - end.getTime()
		return diffMs > SLA_HOURS * 60 * 60 * 1000
	} catch {
		return false
	}
}

export function formatDateTime(val: unknown): string {
	if (!val) return "—"
	try {
		return new Date(val as string).toLocaleString("en-PH", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		})
	} catch {
		return String(val)
	}
}
