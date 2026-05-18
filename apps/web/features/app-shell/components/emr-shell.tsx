"use client"

import React, { useEffect, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { useTheme } from "next-themes"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/core/components/ui/dropdown-menu"
import { cn, getInitials } from "@/core/lib/utils"
import { useUnreadNotificationCount } from "@/features/app-shell/api/notification.hooks"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { filterNavItems, PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS } from "@/features/app-shell/lib/navigation"
import { useSignOutMutation } from "@/features/auth/api/session.hooks"
import { useOfflineSync } from "@/features/offline-cache/lib/use-offline-sync"

// --- Custom SVGs ---

const Icons = {
	Dashboard: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<rect x="3" y="3" width="7" height="9" rx="1" />
			<rect x="14" y="3" width="7" height="5" rx="1" />
			<rect x="14" y="12" width="7" height="9" rx="1" />
			<rect x="3" y="16" width="7" height="5" rx="1" />
		</svg>
	),
	Adt: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<path d="M2 4v16" />
			<path d="M22 4v16" />
			<path d="M2 8h20" />
			<path d="M2 17h20" />
			<path d="M6 8v9" />
			<path d="M18 8v9" />
		</svg>
	),
	Emergency: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<path d="M12 2v20" />
			<path d="M2 12h20" />
			<circle cx="12" cy="12" r="10" />
		</svg>
	),
	Surgical: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<path d="M14 2 4 12v4h4L18 6Z" />
			<path d="M12 4l4 4" />
			<path d="M2 22l6-6" />
		</svg>
	),
	Calendar: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
			<line x1="16" y1="2" x2="16" y2="6" />
			<line x1="8" y1="2" x2="8" y2="6" />
			<line x1="3" y1="10" x2="21" y2="10" />
			<circle cx="12" cy="16" r="2" />
		</svg>
	),
	DocumentPen: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
			<path d="M14 2v6h6" />
			<path d="M16 13H8" />
			<path d="M16 17H8" />
			<path d="M10 9H8" />
		</svg>
	),
	Prescription: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<path d="M10 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" />
			<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
		</svg>
	),
	Vitals: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<path d="M22 12h-4l-3 9L9 3l-3 9H2" />
		</svg>
	),
	List: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<line x1="8" y1="6" x2="21" y2="6" />
			<line x1="8" y1="12" x2="21" y2="12" />
			<line x1="8" y1="18" x2="21" y2="18" />
			<line x1="3" y1="6" x2="3.01" y2="6" />
			<line x1="3" y1="12" x2="3.01" y2="12" />
			<line x1="3" y1="18" x2="3.01" y2="18" />
		</svg>
	),
	Nursing: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
			<rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
			<path d="M9 14h6" />
			<path d="M12 11v6" />
		</svg>
	),
	Maternal: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
			<circle cx="12" cy="11" r="3" />
		</svg>
	),
	Microscope: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<path d="M6 18h8" />
			<path d="M3 22h18" />
			<path d="M14 22a7 7 0 1 0 0-14h-1" />
			<path d="M9 14h2" />
			<path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z" />
			<path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3" />
		</svg>
	),
	Radiology: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
			<circle cx="12" cy="12" r="3" />
			<path d="M12 2v2" />
			<path d="M12 20v2" />
			<path d="M2 12h2" />
			<path d="M20 12h2" />
		</svg>
	),
	Pharmacy: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<rect x="7" y="7" width="10" height="14" rx="2" />
			<path d="M5 3h14a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
			<path d="M12 11v4" />
			<path d="M10 13h4" />
		</svg>
	),
	Rcm: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<path d="M12 2v20" />
			<path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
		</svg>
	),
	Billing: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z" />
			<path d="M16 16H8" />
			<path d="M16 12H8" />
			<path d="M10 8h.01" />
		</svg>
	),
	Records: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4" />
			<polyline points="14 2 14 8 20 8" />
			<path d="M2 15h10" />
			<path d="M2 18h10" />
			<path d="M2 12h10" />
		</svg>
	),
	Telemedicine: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<rect x="2" y="4" width="20" height="12" rx="2" />
			<path d="M10 10l5-2v4l-5-2z" />
			<path d="M12 16v4" />
			<path d="M8 20h8" />
		</svg>
	),
	Reporting: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<line x1="18" y1="20" x2="18" y2="10" />
			<line x1="12" y1="20" x2="12" y2="4" />
			<line x1="6" y1="20" x2="6" y2="14" />
			<line x1="2" y1="20" x2="22" y2="20" />
		</svg>
	),
	Surveillance: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<path d="M12 2v20" />
			<path d="M2 12h20" />
			<path d="M12 7a5 5 0 0 0-5 5" />
			<path d="M12 3a9 9 0 0 0-9 9" />
		</svg>
	),
	Mndrs: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
			<polyline points="14 2 14 8 20 8" />
			<path d="M12 18v-6" />
			<path d="M9 15h6" />
		</svg>
	),
	Stopwatch: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<circle cx="12" cy="13" r="8" />
			<path d="M12 9v4l2 2" />
			<path d="M12 2v2" />
			<path d="M10 2h4" />
		</svg>
	),
	Audit: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<path d="M2 12a10 10 0 1 0 20 0 10 10 0 1 0-20 0" />
			<path d="M12 6v6l4 2" />
		</svg>
	),
	BreakGlass: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<path d="M10.55 6h2.9A2 2 0 0 1 15 8v8a2 2 0 0 1-2 2h-2.9A2 2 0 0 1 8 16V8a2 2 0 0 1 2.55-2Z" />
			<path d="M12 11v3" />
		</svg>
	),
	Users: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
			<circle cx="9" cy="7" r="4" />
			<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
			<path d="M16 3.13a4 4 0 0 1 0 7.75" />
		</svg>
	),
	Facility: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
			<path d="M9 22v-4h6v4" />
			<path d="M8 6h.01" />
			<path d="M16 6h.01" />
			<path d="M12 6h.01" />
			<path d="M12 10h.01" />
			<path d="M12 14h.01" />
			<path d="M16 10h.01" />
			<path d="M16 14h.01" />
			<path d="M8 10h.01" />
			<path d="M8 14h.01" />
		</svg>
	),
	FeatureFlags: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<rect x="2" y="6" width="20" height="12" rx="6" />
			<circle cx="16" cy="12" r="2" />
		</svg>
	),
	PatientFolder: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
			<circle cx="12" cy="13" r="2" />
			<path d="M12 15v3" />
		</svg>
	),
	ChevronLeft: (props: any) => (
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<path d="m15 18-6-6 6-6" />
		</svg>
	),
	ChevronRight: (props: any) => (
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<path d="m9 18 6-6-6-6" />
		</svg>
	),
	Search: (props: any) => (
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<circle cx="11" cy="11" r="8" />
			<path d="m21 21-4.3-4.3" />
		</svg>
	),
	Bell: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
			<path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
		</svg>
	),
	Hamburger: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<line x1="4" x2="20" y1="12" y2="12" />
			<line x1="4" x2="20" y1="6" y2="6" />
			<line x1="4" x2="20" y1="18" y2="18" />
		</svg>
	),
	CloudOff: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<path d="m2 2 20 20" />
			<path d="M22.61 16.95A5 5 0 0 0 18 10h-1.26a8 8 0 0 0-7.05-6M5 5a8 8 0 0 0 4 15h9a5 5 0 0 0 1.7-.3" />
		</svg>
	),
	Settings: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
			<circle cx="12" cy="12" r="3" />
		</svg>
	),
	Logout: (props: any) => (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
			<polyline points="16 17 21 12 16 7" />
			<line x1="21" y1="12" x2="9" y2="12" />
		</svg>
	),
}

// Map the nav-icons.ts NavIconName to our custom inline SVGs
const NAV_ICON_MAP: Record<string, React.FC<any>> = {
	"dashboard": Icons.Dashboard,
	"patient": Icons.PatientFolder,
	"bed": Icons.Adt,
	"emergency": Icons.Emergency,
	"stethoscope": Icons.Vitals,
	"pill": Icons.Prescription,
	"nursing": Icons.Nursing,
	"billing": Icons.Billing,
	"report": Icons.Reporting,
	"audit": Icons.Audit,
	"settings": Icons.Facility,
	"formulary": Icons.Pharmacy,
	"calendar": Icons.Calendar,
	"surgical": Icons.Surgical,
	"records": Icons.Records,
	"social-work": Icons.List,
	"video": Icons.Telemedicine,
	"nutrition": Icons.List,
	"blood-bank": Icons.Microscope,
	"laboratory": Icons.Microscope,
	"radiology": Icons.Radiology,
	"nbs": Icons.Maternal,
	"sla": Icons.Stopwatch,
}

// Group mappings per the prompt's aesthetic layout
const GROUP_MAPPING: Record<string, string> = {
	"/dashboard": "PATIENT LIFECYCLE",
	"/patients/register": "PATIENT LIFECYCLE",
	"/triage": "PATIENT LIFECYCLE",
	"/patients/search": "PATIENT LIFECYCLE",
	"/scheduling/templates": "PATIENT LIFECYCLE",
	"/scheduling/slots": "PATIENT LIFECYCLE",
	"/scheduling/book": "PATIENT LIFECYCLE",
	"/scheduling/check-in": "PATIENT LIFECYCLE",
	"/scheduling/queue": "PATIENT LIFECYCLE",
	"/or/schedule": "PATIENT LIFECYCLE",
	"/beds": "PATIENT LIFECYCLE",
	"/ed": "PATIENT LIFECYCLE",
	"/surgical": "PATIENT LIFECYCLE",

	"/opd": "CLINICAL PRACTICE",
	"/registrar/chart-merge": "ADMINISTRATIVE",
	"/registrar/civil-registry": "STATUTORY & COMPLIANCE",
	"/laboratory": "DIAGNOSTICS",
	"/radiology": "DIAGNOSTICS",
	"/pharmacy": "DIAGNOSTICS",
	"/pharmacy/opd": "CLINICAL PRACTICE",
	"/pharmacy/formulary": "CLINICAL PRACTICE",
	"/nursing": "CLINICAL PRACTICE",
	"/nutrition": "CLINICAL PRACTICE",
	"/telemedicine": "ADMINISTRATIVE",
	"/billing": "ADMINISTRATIVE",

	"/records": "ADMINISTRATIVE",
	"/him": "ADMINISTRATIVE",
	"/nbs": "STATUTORY & COMPLIANCE",
	"/admin/civil-registry": "STATUTORY & COMPLIANCE",
	"/sla": "STATUTORY & COMPLIANCE",
	"/admin/users": "SECURITY & ADMIN",
	"/admin/roles": "SECURITY & ADMIN",
	"/admin/clinician-licenses": "SECURITY & ADMIN",
	"/admin/feature-flags": "SECURITY & ADMIN",
	"/admin/bor": "ADMINISTRATIVE",
	"/admin/sla": "STATUTORY & COMPLIANCE",
	"/admin/fhir": "STATUTORY & COMPLIANCE",
	"/admin/fhir-endpoints": "STATUTORY & COMPLIANCE",
	"/admin/terminology": "STATUTORY & COMPLIANCE",
	"/admin/facility-profile": "SECURITY & ADMIN",
	"/admin/settings": "SECURITY & ADMIN",
	"/admin/integration-registry": "SECURITY & ADMIN",
	"/admin/master-data": "SECURITY & ADMIN",
	"/msw": "ADMINISTRATIVE",
	"/blood-bank": "DIAGNOSTICS",
	"/admin/formulary": "CLINICAL PRACTICE",
	"/reporting": "STATUTORY & COMPLIANCE",
	"/clinical-docs": "CLINICAL PRACTICE",
	"/auditor/audit-log": "SECURITY & ADMIN",
	"/admin": "SECURITY & ADMIN",
}

const DESKTOP_SIDEBAR_MEDIA_QUERY = "(min-width: 1024px)"

function subscribeToHydration() {
	return () => {}
}

function getClientHydrationSnapshot() {
	return true
}

function getServerHydrationSnapshot() {
	return false
}

function subscribeToDesktopSidebarLayout(onStoreChange: () => void) {
	const mediaQuery = window.matchMedia(DESKTOP_SIDEBAR_MEDIA_QUERY)
	mediaQuery.addEventListener("change", onStoreChange)
	return () => mediaQuery.removeEventListener("change", onStoreChange)
}

function getDesktopSidebarLayoutSnapshot() {
	return window.matchMedia(DESKTOP_SIDEBAR_MEDIA_QUERY).matches
}

function getServerDesktopSidebarLayoutSnapshot() {
	return false
}

// --- Navigation Configuration ---

type NavItem = {
	title: string
	href: string
	icon: React.ComponentType<any>
	badge?: { text: string | number; variant: "destructive" | "primary" | "warning" }
}

type NavGroup = {
	label: string
	items: NavItem[]
}

// --- Components ---

function Badge({ text, variant, collapsed }: { text: string | number; variant: string; collapsed?: boolean }) {
	return (
		<motion.div animate={{ scale: [1, 1.15, 1] }} className={cn("flex items-center justify-center rounded-full text-[10px] font-bold", variant === "destructive" ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground", collapsed ? "absolute -top-1 -right-1 h-3.5 w-3.5" : "ml-auto h-4 min-w-4 px-1.5")}>
			{!collapsed && text}
		</motion.div>
	)
}

function SidebarItem({ item, isActive, isCollapsed }: { item: NavItem; isActive: boolean; isCollapsed: boolean }) {
	const [isHovered, setIsHovered] = useState(false)

	return (
		<div className="relative" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
			<Link href={item.href} className="block outline-none">
				<motion.div whileHover={{ scale: 0.98 }} transition={{ duration: 0.15, ease: "easeOut" }} className={cn("focus-visible:ring-ring group relative flex h-9 cursor-pointer items-center rounded-md px-3 transition-all duration-200 outline-none focus-visible:ring-2", isActive ? "text-sidebar-primary" : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground", isCollapsed ? "mx-auto w-9 justify-center" : "gap-3")}>
					{isActive && <motion.div layoutId="emr-sidebar-active-indicator" className="from-sidebar-primary/10 absolute inset-0 rounded-md bg-gradient-to-r to-transparent" initial={false} transition={{ type: "spring", stiffness: 300, damping: 30 }} />}
					{isActive && <motion.div layoutId="emr-sidebar-active-border" className="bg-sidebar-primary absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-r-md shadow-[0_0_8px_rgba(var(--sidebar-primary),0.6)]" initial={false} transition={{ type: "spring", stiffness: 300, damping: 30 }} />}

					<div className="relative z-10 flex shrink-0 items-center justify-center">
						<item.icon className={cn("transition-colors duration-200", isActive ? "text-sidebar-primary" : "opacity-70 group-hover:opacity-100")} />
						{item.badge && isCollapsed && <Badge text={item.badge.text} variant={item.badge.variant} collapsed />}
					</div>

					{!isCollapsed && <span className={cn("relative z-10 truncate font-sans text-[13px] tracking-tight", isActive ? "text-sidebar-primary font-semibold" : "font-medium opacity-70 transition-opacity group-hover:opacity-100")}>{item.title}</span>}

					{!isCollapsed && item.badge && (
						<div className="relative z-10 ml-auto">
							<Badge text={item.badge.text} variant={item.badge.variant} />
						</div>
					)}
				</motion.div>
			</Link>

			<AnimatePresence>
				{isCollapsed && isHovered && (
					<motion.div initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -4 }} transition={{ duration: 0.15 }} className="bg-card text-foreground border-border absolute top-1/2 left-[calc(100%+8px)] z-50 flex -translate-y-1/2 items-center gap-2 rounded-md border px-2.5 py-1.5 font-sans text-xs font-medium whitespace-nowrap shadow-md">
						{item.title}
						{item.badge && <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold", item.badge.variant === "destructive" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>{item.badge.text}</span>}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}

export function EmrShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname()
	const isNoPaddingRoute = pathname === "/patients/search" || pathname === "/opd"
	const { theme, setTheme } = useTheme()
	const { isOnline } = useOfflineSync()
	const { data: profile } = useMyProfile()
	const signOut = useSignOutMutation()

	const user = profile?.user
	const activeRole = profile?.activeRole
	const initials = user?.name ? getInitials(user.name) : "?"
	const permissions = activeRole?.permissions ?? []

	const primaryItems = filterNavItems(PRIMARY_NAV_ITEMS, permissions)
	const secondaryItems = filterNavItems(SECONDARY_NAV_ITEMS, permissions)
	const allAllowedItems = [...primaryItems, ...secondaryItems]

	// Create dynamic filtered groups based on the actual RBAC allowed items
	const groupsMap = new Map<string, NavItem[]>()

	// Ensure order of groups per the design spec
	const groupOrder = ["PATIENT LIFECYCLE", "CLINICAL PRACTICE", "DIAGNOSTICS", "ADMINISTRATIVE", "STATUTORY & COMPLIANCE", "SECURITY & ADMIN"]

	allAllowedItems.forEach(item => {
		const groupName = GROUP_MAPPING[item.href] || "ADMINISTRATIVE"
		if (!groupsMap.has(groupName)) {
			groupsMap.set(groupName, [])
		}
		groupsMap.get(groupName)!.push({
			title: item.title,
			href: item.href,
			icon: NAV_ICON_MAP[item.iconName] || Icons.List,
		})
	})

	if (!isOnline && permissions.some(permission => permission.module === "patients" && permission.action === "view")) {
		const groupName = "PATIENT LIFECYCLE"
		if (!groupsMap.has(groupName)) {
			groupsMap.set(groupName, [])
		}
		groupsMap.get(groupName)!.push({
			title: "Offline Cache",
			href: "/patients/offline",
			icon: Icons.CloudOff,
		})
	}

	const filteredGroups: NavGroup[] = groupOrder
		.map(label => ({
			label,
			items: groupsMap.get(label) || [],
		}))
		.filter(g => g.items.length > 0)

	const allNavHrefs = new Set(allAllowedItems.map(i => i.href))

	function isNavActive(href: string): boolean {
		if (pathname === href) return true
		if (!pathname.startsWith(`${href}/`)) return false
		return ![...allNavHrefs].some(other => other !== href && other.startsWith(href) && pathname.startsWith(other))
	}

	const [showSyncing, setShowSyncing] = useState(false)
	const [prevOnline, setPrevOnline] = useState(true)
	const [isCollapsed, setIsCollapsed] = useState(false)
	const [isMobileOpen, setIsMobileOpen] = useState(false)
	const mounted = useSyncExternalStore(subscribeToHydration, getClientHydrationSnapshot, getServerHydrationSnapshot)
	const isDesktopSidebarLayout = useSyncExternalStore(subscribeToDesktopSidebarLayout, getDesktopSidebarLayoutSnapshot, getServerDesktopSidebarLayoutSnapshot)

	const { data: unreadData } = useUnreadNotificationCount(profile?.staffProfiles?.[0]?.facilityId)
	const notificationCount = unreadData?.count ?? 0

	useEffect(() => {
		if (!prevOnline && isOnline) {
			setShowSyncing(true)
			const timer = setTimeout(() => setShowSyncing(false), 3000)
			setPrevOnline(isOnline)
			return () => clearTimeout(timer)
		}
		setPrevOnline(isOnline)
	}, [isOnline, prevOnline])

	const sidebarWidth = isCollapsed ? 72 : 256

	const SidebarContent = (
		<div className="bg-sidebar border-sidebar-border relative z-40 flex h-full flex-col border-r">
			{/* Institutional Identity Block */}
			<div className="flex h-16 shrink-0 items-center overflow-hidden px-4">
				<div className="flex w-full items-center gap-3">
					<div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md font-serif text-lg font-bold shadow-sm">Q</div>
					<AnimatePresence mode="wait">
						{!isCollapsed && (
							<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col whitespace-nowrap">
								<span className="text-sidebar-foreground font-serif text-[15px] leading-tight font-medium tracking-tight">Quanby EMR Platform</span>
								<span className="text-sidebar-foreground/70 font-sans text-[11px]">St. Luke&apos;s Medical Center</span>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</div>

			<div className="bg-sidebar-border h-px w-full shrink-0 opacity-50" />

			{/* Statutory Compliance Dots */}
			<div className={cn("flex shrink-0 flex-col justify-center py-3", isCollapsed ? "items-center gap-2 px-0" : "gap-1.5 px-5")}>
				<div className="flex items-center gap-2" title="FHIR · NHDR Status: Connected">
					<div className="bg-success size-1.5 shrink-0 rounded-full" />
					{!isCollapsed && <span className="text-muted-foreground font-sans text-[10px] font-medium tracking-wider uppercase">FHIR · NHDR</span>}
				</div>
				<div className="flex items-center gap-2" title="PhilHealth · CEWS Status: Connected">
					<div className="bg-success size-1.5 shrink-0 rounded-full" />
					{!isCollapsed && <span className="text-muted-foreground font-sans text-[10px] font-medium tracking-wider uppercase">PhilHealth</span>}
				</div>
				<div className="flex items-center gap-2" title="PDEA Validation Status: Connected">
					<div className="bg-success size-1.5 shrink-0 rounded-full" />
					{!isCollapsed && <span className="text-muted-foreground font-sans text-[10px] font-medium tracking-wider uppercase">PDEA Valid</span>}
				</div>
			</div>

			<div className="bg-sidebar-border h-px w-full shrink-0 opacity-50" />

			{/* Navigation */}
			<div className="custom-scrollbar flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
				{filteredGroups.map((group, idx) => (
					<div key={idx} className="flex flex-col gap-1">
						{!isCollapsed && (
							<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-1 px-3">
								<span className="text-muted-foreground font-sans text-[10px] font-semibold tracking-wider uppercase">{group.label}</span>
							</motion.div>
						)}
						<div className="flex flex-col gap-0.5">
							{group.items.map((item, i) => (
								<SidebarItem key={i} item={item} isActive={isNavActive(item.href)} isCollapsed={isCollapsed} />
							))}
						</div>
					</div>
				))}
			</div>

			{/* Footer / User Profile */}
			<div className="mt-auto shrink-0 p-3">
				<DropdownMenu>
					<DropdownMenuTrigger className="focus-visible:ring-ring w-full rounded-lg focus-visible:ring-2 focus-visible:outline-none">
						<div className={cn("bg-sidebar-accent/50 border-sidebar-border hover:bg-sidebar-accent flex cursor-pointer items-center rounded-lg border transition-colors", isCollapsed ? "justify-center p-1.5" : "gap-3 p-2")}>
							<div className="from-primary/80 to-accent/80 text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-medium shadow-inner">{initials}</div>
							{!isCollapsed && (
								<div className="flex flex-col overflow-hidden text-left">
									<span className="text-sidebar-foreground truncate font-sans text-sm font-semibold">{user?.name || "Loading..."}</span>
									<span className="text-muted-foreground truncate font-sans text-[10px] uppercase">{activeRole?.name || "System Admin"}</span>
								</div>
							)}
							{!isCollapsed && <Icons.ChevronRight className="text-sidebar-foreground ml-auto size-4 rotate-90 opacity-50" />}
						</div>
					</DropdownMenuTrigger>
					<DropdownMenuContent side="top" align="center" className="bg-sidebar border-sidebar-border w-[230px] border p-2 shadow-lg">
						<div className="mb-1 flex flex-col px-2 py-1.5 text-left">
							<span className="text-sidebar-foreground text-sm font-semibold">{user?.name}</span>
							<span className="text-muted-foreground text-xs">{user?.email}</span>
						</div>
						<DropdownMenuSeparator className="bg-sidebar-border" />
						<DropdownMenuItem className="hover:bg-sidebar-accent focus:bg-sidebar-accent cursor-pointer gap-3 p-2">
							<Icons.Settings className="size-4 opacity-70" />
							<span className="text-sm font-medium">Account Settings</span>
						</DropdownMenuItem>
						<DropdownMenuSeparator className="bg-sidebar-border" />
						<DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer gap-3 p-2" onClick={() => signOut.mutate()} disabled={signOut.isPending}>
							<Icons.Logout className="size-4 opacity-70" />
							<span className="text-sm font-medium">{signOut.isPending ? "Signing out..." : "Sign Out"}</span>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{/* Desktop Collapse Toggle */}
			<div className="absolute top-1/2 -right-3 z-50 hidden -translate-y-1/2 lg:flex">
				<button onClick={() => setIsCollapsed(!isCollapsed)} className="bg-sidebar border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent focus-visible:ring-ring flex size-6 cursor-pointer items-center justify-center rounded-full border shadow-sm focus-visible:ring-2 focus-visible:outline-none" aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!isCollapsed}>
					<motion.div animate={{ rotate: isCollapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
						<Icons.ChevronLeft className="size-3.5 opacity-70" />
					</motion.div>
				</button>
			</div>
		</div>
	)

	return (
		<div className="bg-background text-foreground selection:bg-primary/20 relative flex min-h-screen w-full overflow-hidden">
			{/* Desktop Sidebar */}
			<motion.nav initial={false} animate={{ width: sidebarWidth }} transition={{ type: "spring", stiffness: 200, damping: 28 }} className="fixed top-0 bottom-0 left-0 z-40 hidden lg:block">
				{SidebarContent}
			</motion.nav>

			{/* Mobile Sidebar Overlay */}
			<AnimatePresence>
				{isMobileOpen && (
					<>
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-background/50 fixed inset-0 z-40 backdrop-blur-sm lg:hidden" onClick={() => setIsMobileOpen(false)} />
						<motion.nav initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="fixed top-0 bottom-0 left-0 z-50 w-[260px] shadow-2xl lg:hidden">
							<button onClick={() => setIsMobileOpen(false)} className="text-foreground bg-card absolute top-4 -right-12 flex size-10 items-center justify-center rounded-full shadow-sm">
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M18 6 6 18" />
									<path d="m6 6 12 12" />
								</svg>
							</button>
							{SidebarContent}
						</motion.nav>
					</>
				)}
			</AnimatePresence>

			{/* Main Content Area */}
			<motion.div initial={false} animate={{ marginLeft: isDesktopSidebarLayout ? sidebarWidth : 0 }} transition={{ type: "spring", stiffness: 200, damping: 28 }} className="flex w-full min-w-0 flex-1 flex-col lg:w-auto">
				{/* Top Header Bar */}
				<header className="border-border bg-card/80 sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b px-4 backdrop-blur-md md:px-6">
					<button className="text-foreground flex shrink-0 items-center justify-center opacity-70 hover:opacity-100 lg:hidden" onClick={() => setIsMobileOpen(true)}>
						<Icons.Hamburger />
					</button>

					<div className="flex min-w-0 items-center gap-2">
						<span className="text-foreground truncate font-sans text-[14px] font-medium">
							{pathname === "/dashboard"
								? "Dashboard"
								: pathname
										.split("/")
										.filter(Boolean)
										.map(p => p.charAt(0).toUpperCase() + p.slice(1))
										.join(" > ")}
						</span>
					</div>

					<div className="ml-auto flex items-center gap-3 md:gap-5">
						{/* Universal Search */}
						<div className="group relative hidden md:flex">
							<div className="text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 -translate-y-1/2 transition-colors">
								<Icons.Search className="size-4" />
							</div>
							<input type="text" placeholder="Search patient, MRN..." className="border-border bg-background focus:ring-ring focus:border-ring placeholder:text-muted-foreground/70 h-9 w-[240px] rounded-md border pr-12 pl-9 font-sans text-[13px] transition-all focus:ring-1 focus:outline-none lg:w-[320px]" />
							<div className="absolute top-1/2 right-1.5 -translate-y-1/2">
								<span className="bg-secondary text-secondary-foreground flex h-6 items-center justify-center rounded px-1.5 font-mono text-[10px] font-medium opacity-70">⌘K</span>
							</div>
						</div>

						<button className="text-foreground shrink-0 opacity-70 hover:opacity-100 md:hidden">
							<Icons.Search className="size-5" />
						</button>

						{/* Offline Pill */}
						{mounted && (!isOnline || showSyncing) && (
							<motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="hidden h-7 items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 text-amber-600 sm:flex">
								<Icons.CloudOff className="size-3.5" />
								<span className="text-[11px] font-semibold tracking-wide">{showSyncing ? "Back online — Syncing…" : "Offline — Cached data"}</span>
							</motion.div>
						)}

						{/* ARTA SLA */}
						<div className="bg-secondary/50 border-border hidden h-7 items-center gap-1.5 rounded-md border px-2 sm:flex" title="ARTA SLA: Within Target">
							<Icons.Stopwatch className="text-muted-foreground size-3.5" />
							<div className="bg-success size-1.5 rounded-full" />
						</div>

						{/* Alerts */}
						<button className="text-muted-foreground hover:text-foreground focus-visible:ring-ring relative shrink-0 rounded-full p-1 transition-colors outline-none focus-visible:ring-2">
							<Icons.Bell className="size-5" />
							{notificationCount > 0 && (
								<motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-destructive text-destructive-foreground ring-card absolute top-0 right-0 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-1 text-[8px] font-bold ring-2">
									{notificationCount > 99 ? "99+" : notificationCount}
								</motion.span>
							)}
						</button>

						{/* Theme Toggle */}
						{mounted && (
							<button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="border-border bg-card hover:bg-accent/10 focus-visible:ring-ring hidden h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border p-0.5 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:flex" aria-label="Toggle Dark Mode">
								<motion.div className="bg-primary text-primary-foreground flex h-5 w-5 items-center justify-center rounded-full shadow-sm" layout transition={{ type: "spring", stiffness: 700, damping: 30 }} style={{ marginLeft: theme === "dark" ? "auto" : "0" }}>
									{theme === "dark" ? (
										<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
											<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
										</svg>
									) : (
										<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
											<circle cx="12" cy="12" r="4" />
											<path d="M12 2v2" />
											<path d="M12 20v2" />
											<path d="m4.93 4.93 1.41 1.41" />
											<path d="m17.66 17.66 1.41 1.41" />
											<path d="M2 12h2" />
											<path d="M20 12h2" />
											<path d="m6.34 17.66-1.41 1.41" />
											<path d="m19.07 4.93-1.41 1.41" />
										</svg>
									)}
								</motion.div>
							</button>
						)}
					</div>
				</header>

				{/* Page Content Area */}
				<main className="flex-1 overflow-x-hidden overflow-y-auto">
					<div className={cn("mx-auto w-full max-w-[1440px]", isNoPaddingRoute ? "p-0" : "p-4 md:p-6 lg:p-8")}>
						<AnimatePresence mode="wait">
							<motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: "easeOut" }}>
								{children}
							</motion.div>
						</AnimatePresence>
					</div>
				</main>
			</motion.div>
		</div>
	)
}
