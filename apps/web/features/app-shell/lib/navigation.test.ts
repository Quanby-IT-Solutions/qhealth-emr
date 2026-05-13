import { describe, expect, it } from "vitest"

import {
	filterNavItems,
	getDefaultPatientsHref,
	PRIMARY_NAV_ITEMS,
	SECONDARY_NAV_ITEMS,
} from "./navigation"

const triagePermissions = [
	{ module: "adt", action: "view" },
	{ module: "adt", action: "create" },
	{ module: "patients", action: "view" },
	{ module: "clinical_docs", action: "view" },
	{ module: "nursing", action: "view" },
	{ module: "nursing", action: "create" },
	{ module: "ed", action: "view" },
	{ module: "ed", action: "create" },
	{ module: "opd", action: "view" },
]

const registrarPermissions = [
	{ module: "adt", action: "view" },
	{ module: "adt", action: "create" },
	{ module: "adt", action: "edit" },
	{ module: "patients", action: "view" },
	{ module: "patients", action: "create" },
	{ module: "patients", action: "edit" },
	{ module: "opd", action: "view" },
	{ module: "death_reporting", action: "view" },
	{ module: "civil_registry", action: "view" },
	{ module: "civil_registry", action: "create" },
	{ module: "civil_registry", action: "edit" },
	{ module: "medical_records", action: "view" },
]

const schedulerPermissions = [
	{ module: "adt", action: "view" },
	{ module: "adt", action: "create" },
	{ module: "patients", action: "view" },
	{ module: "scheduling", action: "view" },
	{ module: "scheduling", action: "create" },
	{ module: "scheduling", action: "edit" },
]

describe("filterNavItems", () => {
	it("keeps the Triage Officer sidebar scoped to triage-owned workflows", () => {
		const primaryTitles = filterNavItems(PRIMARY_NAV_ITEMS, triagePermissions).map(
			item => item.title
		)
		const secondaryTitles = filterNavItems(SECONDARY_NAV_ITEMS, triagePermissions).map(
			item => item.title
		)

		expect(primaryTitles).toEqual(["Dashboard", "Triage"])
		expect(secondaryTitles).toEqual([])
	})

	it("keeps the Registrar sidebar scoped to registrar-owned workflows", () => {
		const primaryTitles = filterNavItems(PRIMARY_NAV_ITEMS, registrarPermissions).map(
			item => item.title
		)
		const secondaryTitles = filterNavItems(SECONDARY_NAV_ITEMS, registrarPermissions).map(
			item => item.title
		)

		expect(primaryTitles).toEqual([
			"Dashboard",
			"Patient Management",
			"Bed Management",
			"Housekeeping",
			"OPD",
			"Chart Merge",
			"Civil Registry",
			"Patient Transfers",
			"Discharge Processing"
		])
		expect(secondaryTitles).toEqual([])
	})

	it("keeps the Scheduler sidebar scoped to scheduling-owned workflows", () => {
		const primaryTitles = filterNavItems(PRIMARY_NAV_ITEMS, schedulerPermissions).map(
			item => item.title
		)
		const secondaryTitles = filterNavItems(SECONDARY_NAV_ITEMS, schedulerPermissions).map(
			item => item.title
		)

		expect(primaryTitles).toEqual([
			"Dashboard",
			"Clinic Templates",
			"Slot Management",
			"Appointment Booking",
			"Check-In",
			"OPD Queue",
			"OR Schedule",
		])
		expect(secondaryTitles).toEqual([])
	})
})

describe("getDefaultPatientsHref", () => {
	it("routes the Triage Officer bundle away from registrar registration", () => {
		expect(getDefaultPatientsHref(triagePermissions)).toBe("/triage")
	})
})
