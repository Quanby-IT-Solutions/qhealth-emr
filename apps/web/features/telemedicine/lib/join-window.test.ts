import { describe, expect, it } from "vitest"

import {
	formatJoinWindowRange,
	getJoinWindowState,
	parseTelemedicineDateTime,
} from "./join-window"

const appointment = {
	scheduledDate: "2026-05-24",
	scheduledTime: "14:00:00",
	durationMinutes: 30,
	status: "scheduled" as const,
}

describe("telemedicine join window", () => {
	it("parses appointment date and time as Philippine time", () => {
		expect(parseTelemedicineDateTime("2026-05-24", "14:00:00")?.toISOString()).toBe(
			"2026-05-24T06:00:00.000Z"
		)
	})

	it("marks an appointment as upcoming before the early join window", () => {
		const state = getJoinWindowState(appointment, new Date("2026-05-24T05:29:00.000Z"))

		expect(state.kind).toBe("upcoming")
	})

	it("marks an appointment as open during the join window", () => {
		const state = getJoinWindowState(appointment, new Date("2026-05-24T05:30:00.000Z"))

		expect(state.kind).toBe("open")
	})

	it("marks an appointment as closed after the join window has passed", () => {
		const state = getJoinWindowState(appointment, new Date("2026-05-24T08:31:00.000Z"))

		expect(state.kind).toBe("closed")
	})

	it("formats the video access window in friendly text", () => {
		const state = getJoinWindowState(appointment, new Date("2026-05-24T05:30:00.000Z"))

		expect(state.startsAt && state.endsAt ? formatJoinWindowRange(state.startsAt, state.endsAt) : "").toBe(
			"May 24, 2026, 1:30 PM to 4:30 PM"
		)
	})
})
