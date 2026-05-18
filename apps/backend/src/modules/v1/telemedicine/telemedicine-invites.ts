import { createHash, randomBytes } from "crypto"

export const PATIENT_INVITE_TOKEN_BYTES = 32
export const PATIENT_INVITE_EARLY_MINUTES = 30
export const PATIENT_INVITE_AFTER_END_MINUTES = 120
export const PHILIPPINE_TIME_ZONE_OFFSET_MINUTES = 8 * 60

export type TelemedicineJoinableStatus = "scheduled" | "confirmed" | "in-progress"

export interface AppointmentWindowInput {
	scheduledDate: string
	scheduledTime: string
	durationMinutes: number
}

export interface AppointmentJoinWindow {
	startsAt: Date
	endsAt: Date
}

export function parseTelemedicineAppointmentDateTime(scheduledDate: string, scheduledTime: string) {
	const dateParts = scheduledDate.split("-")
	const timeParts = scheduledTime.split(":")

	if (dateParts.length !== 3 || timeParts.length < 2 || timeParts.length > 3) {
		return new Date(Number.NaN)
	}

	const [year = Number.NaN, month = Number.NaN, day = Number.NaN] = dateParts.map(Number)
	const [hour = Number.NaN, minute = Number.NaN, second = 0] = timeParts.map(Number)

	if ([year, month, day, hour, minute, second].some(value => !Number.isInteger(value))) {
		return new Date(Number.NaN)
	}
	if (
		month < 1 ||
		month > 12 ||
		hour < 0 ||
		hour > 23 ||
		minute < 0 ||
		minute > 59 ||
		second < 0 ||
		second > 59
	) {
		return new Date(Number.NaN)
	}

	const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
	if (day < 1 || day > daysInMonth) {
		return new Date(Number.NaN)
	}

	return new Date(
		Date.UTC(year, month - 1, day, hour, minute - PHILIPPINE_TIME_ZONE_OFFSET_MINUTES, second)
	)
}

export function generatePatientInviteToken() {
	return randomBytes(PATIENT_INVITE_TOKEN_BYTES).toString("base64url")
}

export function hashPatientInviteToken(token: string) {
	return createHash("sha256").update(token).digest("hex")
}

export function getTelemedicineJoinWindow(input: AppointmentWindowInput): AppointmentJoinWindow {
	const scheduledAt = parseTelemedicineAppointmentDateTime(input.scheduledDate, input.scheduledTime)
	const startsAt = new Date(scheduledAt.getTime() - PATIENT_INVITE_EARLY_MINUTES * 60_000)
	const endsAt = new Date(
		scheduledAt.getTime() + (input.durationMinutes + PATIENT_INVITE_AFTER_END_MINUTES) * 60_000
	)

	return { startsAt, endsAt }
}

export function isTelemedicineStatusJoinable(status: string): status is TelemedicineJoinableStatus {
	return status === "scheduled" || status === "confirmed" || status === "in-progress"
}

export function isWithinTelemedicineJoinWindow(window: AppointmentJoinWindow, now = new Date()) {
	return now >= window.startsAt && now <= window.endsAt
}

export function getPatientInviteExpiresAt(input: AppointmentWindowInput) {
	return getTelemedicineJoinWindow(input).endsAt
}
