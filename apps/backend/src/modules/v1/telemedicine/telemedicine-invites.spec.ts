import {
	generatePatientInviteToken,
	getTelemedicineJoinWindow,
	hashPatientInviteToken,
	isTelemedicineStatusJoinable,
	isWithinTelemedicineJoinWindow,
	parseTelemedicineAppointmentDateTime,
} from "./telemedicine-invites"

describe("telemedicine invite helpers", () => {
	it("generates opaque tokens and stable SHA-256 hashes", () => {
		const token = generatePatientInviteToken()
		const hash = hashPatientInviteToken(token)

		expect(token).toHaveLength(43)
		expect(hash).toHaveLength(64)
		expect(hash).toBe(hashPatientInviteToken(token))
		expect(hash).not.toContain(token)
	})

	it("parses appointment date and time as Philippine wall time", () => {
		const scheduledAt = parseTelemedicineAppointmentDateTime("2026-05-19", "10:00:00")

		expect(scheduledAt.toISOString()).toBe("2026-05-19T02:00:00.000Z")
		expect(
			Number.isNaN(parseTelemedicineAppointmentDateTime("2026-02-30", "10:00:00").getTime())
		).toBe(true)
	})

	it("uses a 30-minute early join window and 2-hour post-appointment grace period", () => {
		const window = getTelemedicineJoinWindow({
			scheduledDate: "2026-05-19",
			scheduledTime: "10:00:00",
			durationMinutes: 30,
		})

		expect(window.startsAt.toISOString()).toBe("2026-05-19T01:30:00.000Z")
		expect(window.endsAt.toISOString()).toBe("2026-05-19T04:30:00.000Z")
		expect(isWithinTelemedicineJoinWindow(window, new Date("2026-05-19T01:29:59.000Z"))).toBe(false)
		expect(isWithinTelemedicineJoinWindow(window, new Date("2026-05-19T01:30:00.000Z"))).toBe(true)
		expect(isWithinTelemedicineJoinWindow(window, new Date("2026-05-19T04:30:01.000Z"))).toBe(false)
	})

	it("allows only active appointment states to join", () => {
		expect(isTelemedicineStatusJoinable("scheduled")).toBe(true)
		expect(isTelemedicineStatusJoinable("confirmed")).toBe(true)
		expect(isTelemedicineStatusJoinable("in-progress")).toBe(true)
		expect(isTelemedicineStatusJoinable("completed")).toBe(false)
		expect(isTelemedicineStatusJoinable("cancelled")).toBe(false)
		expect(isTelemedicineStatusJoinable("no-show")).toBe(false)
	})
})
