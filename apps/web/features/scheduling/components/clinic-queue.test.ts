import { describe, expect, it } from "vitest"

import {
	filterQueueEntriesByVitals,
	findQueueEntryPage,
	isQueueEntryManagedByStaff,
	type QueueVitalsFilter,
} from "./clinic-queue"

const entries = Array.from({ length: 25 }, (_, index) => ({
	id: `entry-${index + 1}`,
	encounterId: `encounter-${index + 1}`,
}))

describe("clinic queue helpers", () => {
	it("finds the one-based page for a target encounter", () => {
		expect(findQueueEntryPage(entries, "encounter-21", 10)).toBe(3)
		expect(findQueueEntryPage(entries, "missing", 10)).toBeNull()
	})

	it("filters entries by recorded vitals status", () => {
		const vitalsByEncounterId = new Map([
			["encounter-1", true],
			["encounter-2", false],
			["encounter-3", true],
		])

		expect(
			filterQueueEntriesByVitals(
				entries.slice(0, 3),
				"done" satisfies QueueVitalsFilter,
				vitalsByEncounterId
			)
		).toEqual([entries[0], entries[2]])
		expect(filterQueueEntriesByVitals(entries.slice(0, 3), "needed", vitalsByEncounterId)).toEqual([
			entries[1],
		])
		expect(filterQueueEntriesByVitals(entries.slice(0, 3), "all", vitalsByEncounterId)).toEqual(
			entries.slice(0, 3)
		)
	})

	it("only lets the staff member who called the patient manage queue completion", () => {
		expect(isQueueEntryManagedByStaff({ calledByStaffId: "doctor-1" }, "doctor-1")).toBe(true)
		expect(isQueueEntryManagedByStaff({ calledByStaffId: "doctor-1" }, "doctor-2")).toBe(false)
		expect(isQueueEntryManagedByStaff({ calledByStaffId: null }, "doctor-1")).toBe(false)
		expect(isQueueEntryManagedByStaff({ calledByStaffId: "doctor-1" }, null)).toBe(false)
	})
})
