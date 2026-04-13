"use client"

import {
	Alert02FreeIcons,
	AmbulanceFreeIcons,
	AnalyticsFreeIcons,
	DashboardSpeed02FreeIcons,
	FirstAidKitFreeIcons,
	HospitalBed01FreeIcons,
	Invoice01FreeIcons,
	MedicineSyrupFreeIcons,
	PatientFreeIcons,
	PoliceBadgeFreeIcons,
	Settings02FreeIcons,
	Stethoscope02FreeIcons,
} from "@hugeicons/core-free-icons"

import type { NavIconName } from "./navigation"

export const NAV_ICONS: Record<NavIconName, typeof DashboardSpeed02FreeIcons> = {
	dashboard: DashboardSpeed02FreeIcons,
	patient: PatientFreeIcons,
	bed: HospitalBed01FreeIcons,
	emergency: AmbulanceFreeIcons,
	stethoscope: Stethoscope02FreeIcons,
	pill: MedicineSyrupFreeIcons,
	nursing: FirstAidKitFreeIcons,
	billing: Invoice01FreeIcons,
	report: AnalyticsFreeIcons,
	audit: PoliceBadgeFreeIcons,
	settings: Settings02FreeIcons,
	formulary: MedicineSyrupFreeIcons,
}
