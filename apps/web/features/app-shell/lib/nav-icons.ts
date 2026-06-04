"use client"

import {
	Alert02FreeIcons,
	AmbulanceFreeIcons,
	AnalyticsFreeIcons,
	BloodTypeFreeIcons,
	Calendar01FreeIcons,
	DashboardSpeed02FreeIcons,
	FirstAidKitFreeIcons,
	HospitalBed01FreeIcons,
	Invoice01FreeIcons,
	Leaf01FreeIcons,
	MedicalFileFreeIcons,
	MedicineSyrupFreeIcons,
	PatientFreeIcons,
	PoliceBadgeFreeIcons,
	Settings02FreeIcons,
	Stethoscope02FreeIcons,
	TestTubeFreeIcons,
	UserGroupFreeIcons,
	Video01FreeIcons,
	XRayFreeIcons,
} from "@hugeicons/core-free-icons"

import type { NavIconName } from "./navigation"

export const NAV_ICONS: Record<NavIconName, typeof DashboardSpeed02FreeIcons> = {
	"dashboard": DashboardSpeed02FreeIcons,
	"patient": PatientFreeIcons,
	"bed": HospitalBed01FreeIcons,
	"emergency": AmbulanceFreeIcons,
	"stethoscope": Stethoscope02FreeIcons,
	"pill": MedicineSyrupFreeIcons,
	"nursing": FirstAidKitFreeIcons,
	"billing": Invoice01FreeIcons,
	"report": AnalyticsFreeIcons,
	"audit": PoliceBadgeFreeIcons,
	"settings": Settings02FreeIcons,
	"formulary": MedicineSyrupFreeIcons,
	// New module icons
	"calendar": Calendar01FreeIcons,
	"surgical": Stethoscope02FreeIcons,
	"records": MedicalFileFreeIcons,
	"social-work": UserGroupFreeIcons,
	"video": Video01FreeIcons,
	"nutrition": Leaf01FreeIcons,
	"blood-bank": BloodTypeFreeIcons,
	"laboratory": TestTubeFreeIcons,
	"radiology": XRayFreeIcons,
	"nbs": TestTubeFreeIcons,
	"sla": Alert02FreeIcons,
}
