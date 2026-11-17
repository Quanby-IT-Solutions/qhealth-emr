const ORDER_TIME_ZONE = "Asia/Manila"
const DAY_MS = 24 * 60 * 60 * 1000

function parseOrderLocalDate(value: Date | string | null | undefined): Date | null {
	if (!value) return null

	const source = value instanceof Date ? value.toISOString() : value.trim()
	const timestampParts = source.match(
		/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/
	)
	if (timestampParts) {
		const [, year, month, day, hour = "00", minute = "00", second = "00"] = timestampParts
		return new Date(
			Date.UTC(
				Number(year),
				Number(month) - 1,
				Number(day),
				Number(hour),
				Number(minute),
				Number(second)
			)
		)
	}

	const parsed = new Date(value)
	return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function getOrderLocalDateTimeMs(value: Date | string | null | undefined): number | null {
	return parseOrderLocalDate(value)?.getTime() ?? null
}

export function getCurrentOrderLocalDayRangeMs() {
	const parts = new Intl.DateTimeFormat("en-CA", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		timeZone: ORDER_TIME_ZONE,
	}).formatToParts(new Date())
	const getPart = (type: Intl.DateTimeFormatPartTypes) =>
		Number(parts.find(part => part.type === type)?.value)
	const startMs = Date.UTC(getPart("year"), getPart("month") - 1, getPart("day"))

	return {
		startMs,
		endMs: startMs + DAY_MS - 1,
	}
}

export function formatOrderDateTime(value: Date | string | null | undefined): string {
	const date = parseOrderLocalDate(value)
	if (!date) return "--"

	return date.toLocaleString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "UTC",
	})
}

export function formatCurrentOrderDateTime(value: Date | string | null | undefined): string {
	if (!value) return "--"

	return new Date(value).toLocaleString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		timeZone: ORDER_TIME_ZONE,
	})
}
