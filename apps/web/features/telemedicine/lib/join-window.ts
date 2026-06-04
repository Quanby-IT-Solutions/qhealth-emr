import type { TelemedicineAppointment } from "@/features/telemedicine/api/telemedicine.hooks"

const EARLY_JOIN_MINUTES = 30
const AFTER_END_MINUTES = 120
const PH_OFFSET_MINUTES = 8 * 60

export type JoinWindowState =
	| { kind: "upcoming"; startsAt: Date; endsAt: Date }
	| { kind: "open"; startsAt: Date; endsAt: Date }
	| { kind: "closed"; startsAt: Date; endsAt: Date }
	| { kind: "unavailable"; startsAt: Date | null; endsAt: Date | null }

export function parseTelemedicineDateTime(
	scheduledDate: string,
	scheduledTime: string
): Date | null {
	const dateParts = scheduledDate.split("-").map(Number)
	const timeParts = scheduledTime.split(":").map(Number)
	const [year = NaN, month = NaN, day = NaN] = dateParts
	const [hour = NaN, minute = NaN, second = 0] = timeParts

	if (
		dateParts.length !== 3 ||
		timeParts.length < 2 ||
		timeParts.length > 3 ||
		[year, month, day, hour, minute, second].some(v => !Number.isInteger(v))
	) {
		return null
	}

	const value = new Date(Date.UTC(year, month - 1, day, hour, minute - PH_OFFSET_MINUTES, second))
	return Number.isNaN(value.getTime()) ? null : value
}

export function getAppointmentJoinWindow(
	appt: Pick<TelemedicineAppointment, "scheduledDate" | "scheduledTime" | "durationMinutes">
) {
	const scheduledAt = parseTelemedicineDateTime(appt.scheduledDate, appt.scheduledTime)
	if (!scheduledAt) return { startsAt: null, endsAt: null }
	return {
		startsAt: new Date(scheduledAt.getTime() - EARLY_JOIN_MINUTES * 60_000),
		endsAt: new Date(scheduledAt.getTime() + (appt.durationMinutes + AFTER_END_MINUTES) * 60_000),
	}
}

export function getJoinWindowState(
	appt: Pick<
		TelemedicineAppointment,
		"scheduledDate" | "scheduledTime" | "durationMinutes" | "status"
	>,
	now = new Date()
): JoinWindowState {
	const { startsAt, endsAt } = getAppointmentJoinWindow(appt)
	if (!startsAt || !endsAt || appt.status === "cancelled" || appt.status === "no-show") {
		return { kind: "unavailable", startsAt, endsAt }
	}
	if (now < startsAt) return { kind: "upcoming", startsAt, endsAt }
	if (now > endsAt || appt.status === "completed") return { kind: "closed", startsAt, endsAt }
	return { kind: "open", startsAt, endsAt }
}

const PH_TIME_ZONE = "Asia/Manila"

export function formatJoinDate(value: Date): string {
	return value.toLocaleDateString("en-PH", {
		month: "short",
		day: "numeric",
		year: "numeric",
		timeZone: PH_TIME_ZONE,
	})
}

export function formatJoinTime(value: Date): string {
	return value.toLocaleTimeString("en-PH", {
		hour: "numeric",
		minute: "2-digit",
		timeZone: PH_TIME_ZONE,
	})
}

export function formatJoinWindowRange(startsAt: Date, endsAt: Date): string {
	const sameDate = formatJoinDate(startsAt) === formatJoinDate(endsAt)
	if (sameDate) {
		return `${formatJoinDate(startsAt)}, ${formatJoinTime(startsAt)} to ${formatJoinTime(endsAt)}`
	}
	return `${formatJoinDate(startsAt)} ${formatJoinTime(startsAt)} to ${formatJoinDate(endsAt)} ${formatJoinTime(endsAt)}`
}
