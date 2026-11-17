import { describe, expect, it } from "vitest"

import {
	canManageOwnLicenses,
	dedupeNavItems,
	excludeClinicalSignerFromEncounterTab,
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

const physicianPermissions = [
	{ module: "adt", action: "view" },
	{ module: "patients", action: "view" },
	{ module: "clinical_docs", action: "view" },
	{ module: "clinical_docs", action: "create" },
	{ module: "clinical_docs", action: "edit" },
	{ module: "clinical_docs", action: "sign" },
	{ module: "orders", action: "view" },
	{ module: "orders", action: "create" },
	{ module: "orders", action: "edit" },
	{ module: "orders", action: "sign" },
	{ module: "nursing", action: "view" },
	{ module: "formulary", action: "view" },
	{ module: "opd", action: "view" },
	{ module: "telemedicine", action: "view" },
	{ module: "telemedicine", action: "create" },
	{ module: "telemedicine", action: "edit" },
	{ module: "ed", action: "view" },
	{ module: "ed", action: "edit" },
	{ module: "death_reporting", action: "view" },
	{ module: "death_reporting", action: "create" },
	{ module: "death_reporting", action: "edit" },
	{ module: "audit", action: "create" },
]

const surgeonPermissions = [
	{ module: "adt", action: "view" },
	{ module: "patients", action: "view" },
	{ module: "clinical_docs", action: "view" },
	{ module: "clinical_docs", action: "create" },
	{ module: "clinical_docs", action: "edit" },
	{ module: "clinical_docs", action: "sign" },
	{ module: "orders", action: "view" },
	{ module: "orders", action: "create" },
	{ module: "orders", action: "edit" },
	{ module: "orders", action: "sign" },
	{ module: "surgical", action: "view" },
	{ module: "surgical", action: "create" },
	{ module: "surgical", action: "edit" },
	{ module: "surgical", action: "sign" },
	{ module: "formulary", action: "view" },
	{ module: "opd", action: "view" },
	{ module: "death_reporting", action: "view" },
	{ module: "death_reporting", action: "create" },
	{ module: "death_reporting", action: "edit" },
	{ module: "audit", action: "create" },
]

const anesthesiologistPermissions = [
	{ module: "adt", action: "view" },
	{ module: "patients", action: "view" },
	{ module: "clinical_docs", action: "view" },
	{ module: "clinical_docs", action: "create" },
	{ module: "clinical_docs", action: "edit" },
	{ module: "clinical_docs", action: "sign" },
	{ module: "orders", action: "view" },
	{ module: "orders", action: "create" },
	{ module: "orders", action: "edit" },
	{ module: "orders", action: "sign" },
	{ module: "surgical", action: "view" },
	{ module: "surgical", action: "edit" },
	{ module: "surgical", action: "sign" },
	{ module: "formulary", action: "view" },
	{ module: "audit", action: "create" },
]

const nursePermissions = [
	{ module: "adt", action: "view" },
	{ module: "adt", action: "edit" },
	{ module: "patients", action: "view" },
	{ module: "clinical_docs", action: "view" },
	{ module: "orders", action: "view" },
	{ module: "nursing", action: "view" },
	{ module: "nursing", action: "create" },
	{ module: "nursing", action: "edit" },
	{ module: "nursing", action: "sign" },
	{ module: "formulary", action: "view" },
	{ module: "ed", action: "view" },
	{ module: "ed", action: "edit" },
	{ module: "nbs", action: "view" },
	{ module: "nbs", action: "create" },
	{ module: "nbs", action: "edit" },
	{ module: "opd", action: "view" },
]

describe("filterNavItems", () => {
	it("keeps the Triage Officer sidebar scoped to triage-owned workflows", () => {
		const primaryTitles = filterNavItems(PRIMARY_NAV_ITEMS, triagePermissions).map(
			item => item.title
		)
		const secondaryTitles = filterNavItems(SECONDARY_NAV_ITEMS, triagePermissions).map(
			item => item.title
		)

		expect(primaryTitles).toEqual([
			"Dashboard",
			"Triage Queue",
			"Trauma Alias",
			"Tele-Triage",
			"OPD Tele-Triage",
		])
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
			"Discharge Processing",
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

	it("keeps the Physician sidebar scoped to physician-owned workflows", () => {
		const primaryTitles = filterNavItems(PRIMARY_NAV_ITEMS, physicianPermissions).map(
			item => item.title
		)
		const secondaryTitles = filterNavItems(SECONDARY_NAV_ITEMS, physicianPermissions).map(
			item => item.title
		)

		expect(primaryTitles).toEqual(["Dashboard", "Patients", "Emergency", "OPD", "Telemedicine"])
		expect(secondaryTitles).toEqual([])
	})

	it("keeps the Surgeon sidebar scoped to surgical workflows", () => {
		const primaryTitles = filterNavItems(PRIMARY_NAV_ITEMS, surgeonPermissions).map(
			item => item.title
		)
		const secondaryTitles = filterNavItems(SECONDARY_NAV_ITEMS, surgeonPermissions).map(
			item => item.title
		)

		expect(primaryTitles).toEqual([
			"Dashboard",
			"Patients",
			"OR Schedule",
			"Surgical Services",
			"OPD",
		])
		expect(secondaryTitles).toEqual([])
	})

	it("keeps the Anesthesiologist sidebar scoped to OR workflows", () => {
		const primaryTitles = filterNavItems(PRIMARY_NAV_ITEMS, anesthesiologistPermissions).map(
			item => item.title
		)
		const secondaryTitles = filterNavItems(SECONDARY_NAV_ITEMS, anesthesiologistPermissions).map(
			item => item.title
		)

		expect(primaryTitles).toEqual(["Dashboard", "Patients", "OR Schedule", "Surgical Services"])
		expect(secondaryTitles).toEqual([])
	})

	it("hides triage-only OPD Tele-Triage from Nurse role", () => {
		const primaryTitles = filterNavItems(PRIMARY_NAV_ITEMS, nursePermissions).map(
			item => item.title
		)

		expect(primaryTitles).not.toContain("Triage Queue")
		expect(primaryTitles).not.toContain("Trauma Alias")
		expect(primaryTitles).not.toContain("Tele-Triage")
		expect(primaryTitles).not.toContain("OPD Tele-Triage")
		expect(primaryTitles).toContain("OPD")
	})
})

const coordinatorPermissions = [
	{ module: "adt", action: "view" },
	{ module: "adt", action: "create" },
	{ module: "adt", action: "edit" },
	{ module: "patients", action: "view" },
	{ module: "patients", action: "create" },
	{ module: "patients", action: "edit" },
	{ module: "scheduling", action: "view" },
	{ module: "scheduling", action: "create" },
	{ module: "scheduling", action: "edit" },
	{ module: "opd", action: "view" },
	{ module: "nursing", action: "view" },
	{ module: "nursing", action: "create" },
	{ module: "nursing", action: "edit" },
	{ module: "clinical_docs", action: "view" },
	{ module: "clinical_docs", action: "create" },
	{ module: "clinical_docs", action: "edit" },
	{ module: "clinical_docs", action: "sign" },
	{ module: "orders", action: "view" },
	{ module: "orders", action: "create" },
	{ module: "orders", action: "edit" },
	{ module: "orders", action: "sign" },
	{ module: "formulary", action: "view" },
	{ module: "audit", action: "create" },
	{ module: "notifications", action: "view" },
]

describe("Clinic Coordinator navigation", () => {
	it("shows only dashboard, mission registration, and OPD queue entries", () => {
		const primaryItems = dedupeNavItems(
			filterNavItems(PRIMARY_NAV_ITEMS, coordinatorPermissions, "Clinic Coordinator")
		)
		const secondaryItems = dedupeNavItems(
			filterNavItems(SECONDARY_NAV_ITEMS, coordinatorPermissions, "Clinic Coordinator")
		)

		expect(primaryItems.map(item => [item.title, item.href])).toEqual([
			["Dashboard", "/dashboard"],
			["Patient Management", "/patients/register"],
			["OPD Queue", "/scheduling/queue"],
		])
		expect(secondaryItems).toEqual([])
	})

	it("routes Clinic Coordinator to patient registration by default", () => {
		expect(getDefaultPatientsHref(coordinatorPermissions)).toBe("/patients/register")
	})

	it("allows Clinic Coordinator to manage their own licenses from the account menu", () => {
		expect(
			canManageOwnLicenses(coordinatorPermissions, {
				staffProfileCount: 1,
				roleName: "Clinic Coordinator",
			})
		).toBe(true)
	})

	it("does not allow non-coordinators to manage licenses from the account menu", () => {
		expect(
			canManageOwnLicenses([{ module: "clinical_docs", action: "sign" }], {
				staffProfileCount: 1,
				roleName: "Physician",
			})
		).toBe(false)
	})
})

describe("excludeClinicalSignerFromEncounterTab", () => {
	it("blocks clinical signers from nurse/billing tabs", () => {
		expect(excludeClinicalSignerFromEncounterTab("Physician", true)).toBe(true)
	})

	it("allows Clinic Coordinator even when they can sign clinical docs", () => {
		expect(excludeClinicalSignerFromEncounterTab("Clinic Coordinator", true)).toBe(false)
	})
})

describe("dedupeNavItems", () => {
	it("keeps the first nav item for a duplicate href", () => {
		const items = dedupeNavItems([
			{
				title: "Patient Management",
				href: "/patients/register",
				iconName: "patient",
				requiredPermissions: [],
			},
			{
				title: "Patients",
				href: "/patients/register",
				iconName: "patient",
				requiredPermissions: [],
			},
		])

		expect(items).toHaveLength(1)
		expect(items[0]?.title).toBe("Patient Management")
	})
})

describe("getDefaultPatientsHref", () => {
	it("routes the Triage Officer bundle away from registrar registration", () => {
		expect(getDefaultPatientsHref(triagePermissions)).toBe("/triage")
	})
})
