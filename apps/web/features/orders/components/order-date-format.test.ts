import { afterEach, describe, expect, it, vi } from "vitest"

import {
	formatOrderDateTime,
	getCurrentOrderLocalDayRangeMs,
	getOrderLocalDateTimeMs,
} from "./order-date-format"

describe("order date formatting", () => {
	afterEach(() => {
		vi.useRealTimers()
	})

	it("preserves stored order wall-clock timestamps instead of applying another timezone shift", () => {
		expect(formatOrderDateTime("2026-06-29T16:59:00.000Z")).toBe("Jun 29, 2026, 04:59 PM")
	})

	it("returns matching sort/filter timestamps for the displayed wall-clock time", () => {
		expect(getOrderLocalDateTimeMs("2026-06-29T16:59:00.000Z")).toBe(
			Date.UTC(2026, 5, 29, 16, 59, 0)
		)
	})

	it("builds day filter boundaries from Philippine hospital time", () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date("2026-06-29T16:30:00.000Z"))

		expect(getCurrentOrderLocalDayRangeMs()).toEqual({
			startMs: Date.UTC(2026, 5, 30),
			endMs: Date.UTC(2026, 5, 30, 23, 59, 59, 999),
		})
	})
})
