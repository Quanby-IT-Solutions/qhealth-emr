export function todayIsoInManila() {
	const parts = new Intl.DateTimeFormat("en-PH", {
		timeZone: "Asia/Manila",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(new Date())
	const getPart = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find(part => part.type === type)?.value ?? ""
	return `${getPart("year")}-${getPart("month")}-${getPart("day")}`
}
