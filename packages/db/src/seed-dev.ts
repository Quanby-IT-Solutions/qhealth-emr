import "dotenv/config"

import { and, eq } from "drizzle-orm"

import { createDBClient } from "./client.js"
import {
	allergies,
	ahsrSnapshots,
	auditLogs,
	beds,
	breakGlassEvents,
	chargeMasterItems,
	charges,
	clinicalNotes,
	drugBrands,
	drugGenerics,
	encounters,
	facilityProfiles,
	facilities,
	featureFlags,
	featureFlagTargets,
	formularyItems,
	imagingOrders,
	integrations,
	invoiceLineItems,
	invoices,
	ioEntries,
	labOrders,
	marEntries,
	medicationOrders,
	noteTemplates,
	patients,
	payments,
	pidsrCases,
	preEncounters,
	problems,
	rolePermissions,
	roles,
	staffProfiles,
	surveillanceFlags,
	systemSettings,
	tarEntries,
	userRoles,
	users,
	vitalSigns,
	wards,
} from "./schema/index.js"

const DATABASE_URL = process.env.DATABASE_URL
const AUTH_API = process.env.SEED_AUTH_API_URL ?? "http://localhost:3000/api/v1/auth/"
const WEB_ORIGIN = process.env.SEED_WEB_ORIGIN ?? "http://localhost:3001"
const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "Password123"

if (!DATABASE_URL) {
	console.error("DATABASE_URL is required")
	process.exit(1)
}

const db = createDBClient(DATABASE_URL)

type ModuleName =
	| "adt"
	| "clinical_docs"
	| "orders"
	| "nursing"
	| "billing"
	| "formulary"
	| "reporting"
	| "audit"
	| "admin"
	| "surgical"
	| "opd"
	| "nutrition"
	| "laboratory"
	| "radiology"
	| "scheduling"
	| "feature_flags"
	| "system_settings"
	| "facility_profile"
	| "integration_registry"
	| "patients"
	| "telemedicine"
	| "ed"
	| "nbs"
	| "msw"
	| "death_reporting"
	| "fhir"
	| "civil_registry"
	| "medical_records"
	| "notifications"

type ActionName = "view" | "create" | "edit" | "sign" | "delete" | "verify" | "export"

interface DemoUser {
	email: string
	name: string
	roleName: string
	department: string
	employeeNumber: string
	prcLicenseNumber?: string
	ptrNumber?: string
	pdeaS2License?: string
}

const demoUsers: DemoUser[] = [
	{
		email: "admin@qhealth.local",
		name: "QHealth Admin",
		roleName: "Administrator",
		department: "Administration",
		employeeNumber: "ADM-001",
	},
	{
		email: "doctor@qhealth.local",
		name: "Dr. Miguel Santos",
		roleName: "Physician",
		department: "Emergency Department",
		employeeNumber: "MD-001",
		prcLicenseNumber: "PRC-100001",
		ptrNumber: "PTR-100001",
		pdeaS2License: "S2-100001",
	},
	{
		email: "nurse@qhealth.local",
		name: "Nurse Ana Reyes",
		roleName: "Nurse",
		department: "Ward Nursing",
		employeeNumber: "RN-001",
		prcLicenseNumber: "PRC-200001",
		ptrNumber: "PTR-200001",
	},
	{
		email: "pharmacist@qhealth.local",
		name: "Pharm. Carlo Dizon",
		roleName: "Pharmacist",
		department: "Pharmacy",
		employeeNumber: "RPH-001",
		prcLicenseNumber: "PRC-300001",
		ptrNumber: "PTR-300001",
		pdeaS2License: "S2-300001",
	},
	{
		email: "billing@qhealth.local",
		name: "Bella Cruz",
		roleName: "Billing Officer",
		department: "Billing",
		employeeNumber: "BIL-001",
	},
	{
		email: "pidsr@qhealth.local",
		name: "Liza Mendoza",
		roleName: "PIDSR Officer",
		department: "Epidemiology",
		employeeNumber: "SUR-001",
		prcLicenseNumber: "PRC-400001",
		ptrNumber: "PTR-400001",
	},
	{
		email: "registrar@qhealth.local",
		name: "Maria Garcia",
		roleName: "Registrar",
		department: "Admissions",
		employeeNumber: "REG-001",
	},
	{
		email: "triage@qhealth.local",
		name: "Jose Cruz",
		roleName: "Triage Officer",
		department: "Emergency Department",
		employeeNumber: "TRG-001",
		prcLicenseNumber: "PRC-500001",
		ptrNumber: "PTR-500001",
	},
	{
		email: "surgeon@qhealth.local",
		name: "Dr. Eduardo Lim",
		roleName: "Surgeon",
		department: "Surgery",
		employeeNumber: "SRG-001",
		prcLicenseNumber: "PRC-600001",
		ptrNumber: "PTR-600001",
		pdeaS2License: "S2-600001",
	},
	{
		email: "anesthesiologist@qhealth.local",
		name: "Dr. Rosario Tan",
		roleName: "Anesthesiologist",
		department: "Anesthesiology",
		employeeNumber: "ANE-001",
		prcLicenseNumber: "PRC-700001",
		ptrNumber: "PTR-700001",
		pdeaS2License: "S2-700001",
	},
	{
		email: "labtech@qhealth.local",
		name: "Ramon Bautista",
		roleName: "Lab Technologist",
		department: "Laboratory",
		employeeNumber: "LAB-001",
		prcLicenseNumber: "PRC-800001",
		ptrNumber: "PTR-800001",
	},
	{
		email: "radiologist@qhealth.local",
		name: "Dr. Nilda Gomez",
		roleName: "Radiologist",
		department: "Radiology",
		employeeNumber: "RAD-001",
		prcLicenseNumber: "PRC-900001",
		ptrNumber: "PTR-900001",
	},
	{
		email: "bloodbank@qhealth.local",
		name: "Sofia Ramos",
		roleName: "Blood Bank Technician",
		department: "Blood Bank",
		employeeNumber: "BBK-001",
		prcLicenseNumber: "PRC-110001",
		ptrNumber: "PTR-110001",
	},
	{
		email: "him@qhealth.local",
		name: "Teresa Villanueva",
		roleName: "HIM Coder",
		department: "Health Information Management",
		employeeNumber: "HIM-001",
	},
	{
		email: "msw@qhealth.local",
		name: "Gloria Aguilar",
		roleName: "Medical Social Worker",
		department: "Social Work",
		employeeNumber: "MSW-001",
	},
	{
		email: "dietitian@qhealth.local",
		name: "Carla Navarro",
		roleName: "Clinical Dietitian",
		department: "Nutrition and Dietetics",
		employeeNumber: "NDT-001",
		prcLicenseNumber: "PRC-120001",
		ptrNumber: "PTR-120001",
	},
	{
		email: "scheduler@qhealth.local",
		name: "Benigno Aquino",
		roleName: "Scheduler",
		department: "Admissions and Scheduling",
		employeeNumber: "SCH-001",
	},
	{
		email: "auditor@qhealth.local",
		name: "Ramon Santos",
		roleName: "Auditor",
		department: "Compliance and Privacy",
		employeeNumber: "AUD-001",
	},
]

const roleBundles: Record<string, Array<[ModuleName, ActionName[]]>> = {
	// TOR: System Admin manages configuration, users, roles, and feature flags.
	// Has NO clinical write access (no create/edit/sign/verify/delete on clinical modules).
	Administrator: [
		["admin", ["view", "create", "edit", "delete", "export"]], // User/role management
		["feature_flags", ["view", "create", "edit", "delete"]], // Feature flag management
		["system_settings", ["view", "create", "edit"]], // System configuration
		["facility_profile", ["view", "create", "edit"]], // Facility profile management
		["integration_registry", ["view", "create", "edit", "delete"]], // Integration oversight
		["reporting", ["view", "export"]], // Reporting access (view only)
		["adt", ["view"]], // Census visibility (no clinical write)
		["formulary", ["view"]], // Formulary visibility (no create/edit)
		["fhir", ["view", "export"]], // FHIR export management
		["notifications", ["view"]], // All staff receive system notifications
	],
	Physician: [
		// Physicians view patients and create encounters, but don't manage scheduling/beds (Registrar's job)
		["adt", ["view", "create"]],
		["patients", ["view"]], // Patient record access (search, profile)
		["clinical_docs", ["view", "create", "edit", "sign"]],
		["orders", ["view", "create", "edit", "sign"]],
		["nursing", ["view"]],
		["billing", ["view"]],
		["formulary", ["view"]],
		["reporting", ["view", "create"]],
		["opd", ["view"]], // OPD dashboard access
		["telemedicine", ["view", "create", "edit"]], // Virtual consultation access
		["ed", ["view"]], // Emergency department patient viewing
		["death_reporting", ["view", "create", "edit"]], // Physician authors FMDRF/FNDRF forms
		["audit", ["create"]], // Break-glass emergency access invocation
		["notifications", ["view"]], // All staff receive system notifications
	],
	Nurse: [
		["adt", ["view", "edit"]], // edit for bed management access
		["patients", ["view"]], // Patient record access (search, profile)
		["clinical_docs", ["view"]],
		["orders", ["view"]],
		["nursing", ["view", "create", "edit", "sign"]],
		["formulary", ["view"]],
		["ed", ["view"]], // Emergency department access
		["nbs", ["view", "create", "edit"]], // Newborn screening workflows
		["opd", ["view"]], // TOR: Nurses participate in OPD triage and vital-sign capture
		["notifications", ["view"]], // All staff receive system notifications
	],
	Pharmacist: [
		["orders", ["view", "edit", "verify"]],
		["formulary", ["view", "create", "edit"]],
		["clinical_docs", ["view"]],
		["patients", ["view"]], // Patient record access for dispensing verification
		["notifications", ["view"]], // All staff receive system notifications
	],
	"Billing Officer": [
		["adt", ["view"]],
		["patients", ["view"]], // Patient record access for billing reconciliation
		["billing", ["view", "create", "edit", "export"]],
		["clinical_docs", ["view"]],
		["reporting", ["view", "export"]],
		["notifications", ["view"]], // All staff receive system notifications
	],
	"PIDSR Officer": [
		["patients", ["view"]], // Patient record access for disease surveillance
		["clinical_docs", ["view"]],
		["reporting", ["view", "create", "edit", "verify", "export"]],
		["notifications", ["view"]], // All staff receive system notifications
	],
	Registrar: [
		["adt", ["view", "create", "edit"]],
		["patients", ["view", "create", "edit"]], // TOR: Registrar views, creates and updates patient records
		["opd", ["view"]], // OPD dashboard access for patient routing
		["death_reporting", ["view"]], // TOR: Registrar issues and tracks death certificates (FMDRF/FNDRF)
		["civil_registry", ["view", "create", "edit"]], // TOR: Registrar registers births/deaths via civil registry forms
		["medical_records", ["view"]], // TOR: Registrar processes medical certificate requests
		["notifications", ["view"]], // All staff receive system notifications
	],
	"Triage Officer": [
		["adt", ["view", "create"]],
		["patients", ["view"]], // Patient record access for triage intake lookup
		["clinical_docs", ["view"]], // TOR: Triage needs allergy/problem history for patient safety
		["nursing", ["view", "create"]],
		["ed", ["view", "create"]], // Emergency department triage workflows
		["opd", ["view"]], // TOR: Triage Officers staff the OPD triage desk
		["notifications", ["view"]], // All staff receive system notifications
	],
	Surgeon: [
		["adt", ["view"]],
		["patients", ["view"]], // Patient record access (search, profile)
		["clinical_docs", ["view", "create", "edit", "sign"]],
		["orders", ["view", "create", "sign"]],
		["surgical", ["view", "create", "edit"]], // Surgical tab visibility + create/save operation/anesthesia records
		["formulary", ["view"]],
		["opd", ["view"]], // OPD dashboard access (per TOR)
		["death_reporting", ["view", "create", "edit"]], // Surgeon may author FMDRF/FNDRF for surgical cases
		["audit", ["create"]], // Break-glass emergency access invocation
		["notifications", ["view"]], // All staff receive system notifications
	],
	Anesthesiologist: [
		["adt", ["view"]],
		["patients", ["view"]], // Patient record access (search, profile)
		["clinical_docs", ["view", "create", "edit", "sign"]],
		["orders", ["view", "create"]],
		["surgical", ["view", "edit"]], // Surgical tab visibility + save anesthesia records
		["formulary", ["view"]],
		["audit", ["create"]], // Break-glass emergency access invocation
		["notifications", ["view"]], // All staff receive system notifications
	],
	"Lab Technologist": [
		["adt", ["view"]],
		["patients", ["view"]], // Patient record access for order lookup
		["orders", ["view", "edit"]],
		["laboratory", ["view", "edit"]],
		["notifications", ["view"]], // All staff receive system notifications
	],
	Radiologist: [
		["adt", ["view"]],
		["patients", ["view"]], // Patient record access for imaging lookup
		["radiology", ["view", "edit"]],
		["notifications", ["view"]], // All staff receive system notifications
	],
	"Blood Bank Technician": [
		["adt", ["view"]],
		["patients", ["view"]], // Patient record access for blood bank orders
		["orders", ["view", "edit"]],
		["laboratory", ["view", "create", "edit"]], // Blood Bank nav + submit cross-match + approve/bedside verify
		["notifications", ["view"]], // All staff receive system notifications
	],
	"HIM Coder": [
		["adt", ["view"]],
		["patients", ["view"]], // Patient record access for coding and HIM
		["clinical_docs", ["view", "edit"]],
		["reporting", ["view"]], // HAI tracking and report access
		["medical_records", ["view", "create", "edit"]], // TOR: HIM manages medical records release and chart completion
		["notifications", ["view"]], // All staff receive system notifications
	],
	"Medical Social Worker": [
		["adt", ["view"]],
		["patients", ["view"]], // Patient record access for social work assessment
		["billing", ["view"]],
		["clinical_docs", ["view"]],
		["msw", ["view", "create", "edit"]], // MSW assessment and COE workflows
		["notifications", ["view"]], // All staff receive system notifications
	],
	"Clinical Dietitian": [
		["adt", ["view"]],
		["patients", ["view"]], // Patient record access for dietary assessment
		// Dietitians use nutrition module, not nursing (avoids unintended nav visibility)
		["nutrition", ["view", "edit"]],
		["clinical_docs", ["view"]],
		["notifications", ["view"]], // All staff receive system notifications
	],
	Scheduler: [
		["adt", ["view", "create"]],
		["patients", ["view"]], // Patient record access for appointment scheduling
		["scheduling", ["view", "create", "edit"]],
		["notifications", ["view"]], // All staff receive system notifications
	],
	Auditor: [
		["adt", ["view"]],
		["patients", ["view"]], // TOR: Auditor/Privacy Officer has read-all access
		["clinical_docs", ["view"]], // TOR: clinical documentation audit
		["nursing", ["view"]], // TOR: nursing records audit
		["orders", ["view"]], // TOR: medication order audit trail
		["billing", ["view"]], // TOR: billing and charge audit
		["formulary", ["view"]], // TOR: formulary compliance audit
		["laboratory", ["view"]], // TOR: lab result audit
		["radiology", ["view"]], // TOR: imaging order audit
		["audit", ["view", "export"]],
		["reporting", ["view"]],
		["telemedicine", ["view"]], // TOR: telemedicine encounter audit
		["msw", ["view"]], // TOR: social work assessment audit
		["nutrition", ["view"]], // TOR: nutrition assessment audit
		["nbs", ["view"]], // TOR: newborn screening audit
		["surgical", ["view"]], // TOR: surgical record audit
		["ed", ["view"]], // TOR: emergency department audit
		["death_reporting", ["view"]], // TOR: death certificate audit
		["scheduling", ["view"]], // TOR: scheduling audit
		["civil_registry", ["view"]], // TOR: civil registry audit
		["medical_records", ["view"]], // TOR: medical records release audit
		["opd", ["view"]], // TOR: OPD encounter audit
		["notifications", ["view"]], // All staff receive system notifications
	],
}

async function postAuth(path: string, data: unknown) {
	return fetch(new URL(path, AUTH_API), {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Origin: WEB_ORIGIN,
		},
		body: JSON.stringify(data),
	})
}

async function ensureAuthUser(user: DemoUser) {
	let response = await postAuth("sign-in/email", {
		email: user.email,
		password: DEFAULT_PASSWORD,
	})

	if (!response.ok) {
		response = await postAuth("sign-up/email", {
			email: user.email,
			password: DEFAULT_PASSWORD,
			name: user.name,
		})

		if (!response.ok) {
			const body = await response.text()
			throw new Error(`Failed to create auth user ${user.email}: ${response.status} ${body}`)
		}
	}

	const [dbUser] = await db.select().from(users).where(eq(users.email, user.email))
	if (!dbUser) {
		throw new Error(`Auth user ${user.email} was not found after sign-up/sign-in`)
	}
	return dbUser
}

async function ensureFacility() {
	const [existing] = await db.select().from(facilities).where(eq(facilities.name, "QHealth Community Hospital"))
	if (existing) return existing
	const [created] = await db
		.insert(facilities)
		.values({
			name: "QHealth Community Hospital",
			facilityType: "community",
			address: "123 Mabini Street, Quezon City",
			dohLicenseNumber: "DOH-123456",
			philhealthAccreditationId: "PH-654321",
		})
		.returning()
	return created!
}

async function ensureRole(facilityId: string, roleName: string) {
	const [existing] = await db
		.select()
		.from(roles)
		.where(and(eq(roles.facilityId, facilityId), eq(roles.name, roleName)))
	if (existing) return existing
	const [created] = await db
		.insert(roles)
		.values({
			facilityId,
			name: roleName,
			description: `${roleName} access role`,
			isSystemDefault: true,
		})
		.returning()
	return created!
}

async function ensureRolePermissions(roleId: string, roleName: string) {
	const bundles = roleBundles[roleName] ?? []
	
	// Build set of expected permissions
	const expectedPerms = new Set<string>()
	for (const [moduleName, actions] of bundles) {
		for (const action of actions) {
			expectedPerms.add(`${moduleName}:${action}`)
		}
	}
	
	// Get current permissions for this role
	const currentPerms = await db
		.select()
		.from(rolePermissions)
		.where(eq(rolePermissions.roleId, roleId))
	
	// Delete permissions that shouldn't exist
	for (const perm of currentPerms) {
		const key = `${perm.module}:${perm.action}`
		if (!expectedPerms.has(key)) {
			await db
				.delete(rolePermissions)
				.where(
					and(
						eq(rolePermissions.roleId, roleId),
						eq(rolePermissions.module, perm.module),
						eq(rolePermissions.action, perm.action)
					)
				)
		}
	}
	
	// Add missing permissions
	for (const [moduleName, actions] of bundles) {
		for (const action of actions) {
			const exists = currentPerms.some(p => p.module === moduleName && p.action === action)
			if (!exists) {
				await db.insert(rolePermissions).values({ roleId, module: moduleName, action })
			}
		}
	}
}

async function ensureStaffProfile(userId: string, facilityId: string, user: DemoUser) {
	const [existing] = await db
		.select()
		.from(staffProfiles)
		.where(and(eq(staffProfiles.userId, userId), eq(staffProfiles.facilityId, facilityId)))
	if (existing) return existing
	const [created] = await db
		.insert(staffProfiles)
		.values({
			userId,
			facilityId,
			employeeNumber: user.employeeNumber,
			department: user.department,
			prcLicenseNumber: user.prcLicenseNumber,
			prcExpiry: user.prcLicenseNumber ? "2027-12-31" : null,
			ptrNumber: user.ptrNumber,
			ptrExpiry: user.ptrNumber ? "2027-12-31" : null,
			pdeaS2License: user.pdeaS2License,
			pdeaS2Expiry: user.pdeaS2License ? "2027-12-31" : null,
			isActive: true,
		})
		.returning()
	return created!
}

async function ensureUserRole(staffProfileId: string, roleId: string) {
	const [existing] = await db
		.select()
		.from(userRoles)
		.where(and(eq(userRoles.staffProfileId, staffProfileId), eq(userRoles.roleId, roleId)))
	if (!existing) {
		await db.insert(userRoles).values({ staffProfileId, roleId, isPrimary: true })
	}
}

async function ensureWard(facilityId: string, name: string, wardType: "general" | "icu" | "er" | "or" | "nursery", totalBeds: number) {
	const [existing] = await db
		.select()
		.from(wards)
		.where(and(eq(wards.facilityId, facilityId), eq(wards.name, name)))
	if (existing) return existing
	const [created] = await db.insert(wards).values({ facilityId, name, wardType, totalBeds, isActive: true }).returning()
	return created!
}

async function ensureBed(facilityId: string, wardId: string, bedNumber: string) {
	const [existing] = await db
		.select()
		.from(beds)
		.where(and(eq(beds.facilityId, facilityId), eq(beds.bedNumber, bedNumber)))
	if (existing) return existing
	const [created] = await db
		.insert(beds)
		.values({ facilityId, wardId, bedNumber, status: "available" })
		.returning()
	return created!
}

async function ensurePatient(facilityId: string, mrn: string, firstName: string, lastName: string, dateOfBirth: string, sex: "male" | "female" | "other") {
	const [existing] = await db
		.select()
		.from(patients)
		.where(and(eq(patients.facilityId, facilityId), eq(patients.mrn, mrn)))
	if (existing) return existing
	const [created] = await db
		.insert(patients)
		.values({
			facilityId,
			mrn,
			firstName,
			lastName,
			dateOfBirth,
			sex,
			addressLine1: "123 Health Ave",
			city: "Quezon City",
			province: "Metro Manila",
			phone: "09171234567",
			emergencyContactName: "Relative Contact",
			emergencyContactPhone: "09170000000",
			isActive: true,
		})
		.returning()
	return created!
}

async function ensurePreEncounter(facilityId: string, traumaAlias: string, triageStaffId: string) {
	const [existing] = await db
		.select()
		.from(preEncounters)
		.where(and(eq(preEncounters.facilityId, facilityId), eq(preEncounters.traumaAlias, traumaAlias)))
	if (existing) return existing
	const [created] = await db
		.insert(preEncounters)
		.values({
			facilityId,
			traumaAlias,
			chiefComplaint: "Motor vehicular trauma",
			triageAcuityScale: "esi",
			triageAcuityLevel: 2,
			triageDatetime: new Date(),
			triageStaffId,
			status: "active",
		})
		.returning()
	return created!
}

async function ensureEncounter(facilityId: string, patientId: string, attendingStaffId: string, bedId: string | null, encounterType: "inpatient" | "outpatient" | "emergency", chiefComplaint: string) {
	const [existing] = await db
		.select()
		.from(encounters)
		.where(
			and(
				eq(encounters.facilityId, facilityId),
				eq(encounters.patientId, patientId),
				eq(encounters.encounterType, encounterType),
				eq(encounters.chiefComplaint, chiefComplaint)
			)
		)
	if (existing) return existing
	const [created] = await db
		.insert(encounters)
		.values({
			facilityId,
			patientId,
			encounterType,
			status: "active",
			chiefComplaint,
			admittingStaffId: attendingStaffId,
			attendingStaffId,
			bedId,
			admissionDatetime: new Date(),
		})
		.returning()
	return created!
}

async function ensureReferenceData(facilityId: string) {
	let [generic] = await db.select().from(drugGenerics).where(eq(drugGenerics.genericName, "Paracetamol"))
	if (!generic) {
		;[generic] = await db.insert(drugGenerics).values({ genericName: "Paracetamol", rxnormCode: "161", atcCode: "N02BE01" }).returning()
	}

	let [brand] = await db
		.select()
		.from(drugBrands)
		.where(and(eq(drugBrands.drugGenericId, generic!.id), eq(drugBrands.brandName, "Biogesic")))
	if (!brand) {
		;[brand] = await db.insert(drugBrands).values({ drugGenericId: generic!.id, brandName: "Biogesic", manufacturer: "Unilab" }).returning()
	}

	let [formulary] = await db
		.select()
		.from(formularyItems)
		.where(and(eq(formularyItems.facilityId, facilityId), eq(formularyItems.drugGenericId, generic!.id), eq(formularyItems.strength, "500 mg")))
	if (!formulary) {
		;[formulary] = await db
			.insert(formularyItems)
			.values({
				facilityId,
				drugGenericId: generic!.id,
				drugBrandId: brand!.id,
				doseForm: "tablet",
				strength: "500 mg",
				route: "oral",
				isActive: true,
			})
			.returning()
	}

	let [chargeItem] = await db
		.select()
		.from(chargeMasterItems)
		.where(and(eq(chargeMasterItems.facilityId, facilityId), eq(chargeMasterItems.itemCode, "ER-CONSULT")))
	if (!chargeItem) {
		;[chargeItem] = await db
			.insert(chargeMasterItems)
			.values({
				facilityId,
				itemCode: "ER-CONSULT",
				description: "Emergency Room Consultation",
				category: "procedure",
				unitPrice: "1500.00",
				isActive: true,
			})
			.returning()
	}

	return { formulary: formulary!, chargeItem: chargeItem! }
}

async function ensureClinicalData(params: {
	facilityId: string
	encounterId: string
	patientId: string
	staffId: string
}) {
	let [template] = await db
		.select()
		.from(noteTemplates)
		.where(and(eq(noteTemplates.facilityId, params.facilityId), eq(noteTemplates.name, "General Progress Note")))
	if (!template) {
		;[template] = await db
			.insert(noteTemplates)
			.values({
				facilityId: params.facilityId,
				name: "General Progress Note",
				category: "progress",
				sections: ["Subjective", "Objective", "Assessment", "Plan"],
				isActive: true,
				createdByStaffId: params.staffId,
			})
			.returning()
	}

	// PS-003: Seed a dedicated OPD Consultation SOAP template so consultation notes are structured
	const [consultTemplate] = await db
		.select()
		.from(noteTemplates)
		.where(and(eq(noteTemplates.facilityId, params.facilityId), eq(noteTemplates.name, "Outpatient Consultation (SOAP)")))
	if (!consultTemplate) {
		await db
			.insert(noteTemplates)
			.values({
				facilityId: params.facilityId,
				name: "Outpatient Consultation (SOAP)",
				category: "consultation",
				sections: ["Subjective", "Objective", "Assessment", "Plan"],
				isActive: true,
				createdByStaffId: params.staffId,
			})
	}

	const [note] = await db
		.select()
		.from(clinicalNotes)
		.where(and(eq(clinicalNotes.encounterId, params.encounterId), eq(clinicalNotes.noteType, "progress")))
	if (!note) {
		await db.insert(clinicalNotes).values({
			facilityId: params.facilityId,
			encounterId: params.encounterId,
			templateId: template!.id,
			noteType: "progress",
			content: "Patient seen and examined. Stable vital signs. Continue current management.",
			status: "signed",
			authorStaffId: params.staffId,
			signedAt: new Date(),
		})
	}

	const [problem] = await db
		.select()
		.from(problems)
		.where(and(eq(problems.patientId, params.patientId), eq(problems.description, "Community acquired pneumonia")))
	if (!problem) {
		await db.insert(problems).values({
			facilityId: params.facilityId,
			patientId: params.patientId,
			icd10Code: "J18.9",
			icd10Display: "Pneumonia, unspecified organism",
			description: "Community acquired pneumonia",
			status: "active",
			documentingStaffId: params.staffId,
		})
	}

	const [allergy] = await db
		.select()
		.from(allergies)
		.where(and(eq(allergies.patientId, params.patientId), eq(allergies.allergenName, "Penicillin")))
	if (!allergy) {
		await db.insert(allergies).values({
			facilityId: params.facilityId,
			patientId: params.patientId,
			allergenName: "Penicillin",
			allergenType: "medication",
			reactionType: "Rash",
			severity: "moderate",
			isActive: true,
			documentingStaffId: params.staffId,
		})
	}
}

async function ensureNursingAndOrders(params: {
	facilityId: string
	encounterId: string
	preEncounterId: string
	patientId: string
	doctorStaffId: string
	nurseStaffId: string
	pharmacistStaffId: string
	formularyItemId: string
	chargeItemId: string
	billingStaffId: string
	reportingStaffId: string
}) {
	const [vitalsForEncounter] = await db.select().from(vitalSigns).where(eq(vitalSigns.encounterId, params.encounterId))
	if (!vitalsForEncounter) {
		await db.insert(vitalSigns).values({
			facilityId: params.facilityId,
			encounterId: params.encounterId,
			temperature: "37.2",
			bpSystolic: 120,
			bpDiastolic: 80,
			heartRate: 88,
			respiratoryRate: 18,
			spo2: "98.0",
			painScore: 2,
			newsScore: 1,
			newsRiskLevel: "low",
			recordedByStaffId: params.nurseStaffId,
		})
	}

	const [vitalsForPreEncounter] = await db.select().from(vitalSigns).where(eq(vitalSigns.preEncounterId, params.preEncounterId))
	if (!vitalsForPreEncounter) {
		await db.insert(vitalSigns).values({
			facilityId: params.facilityId,
			preEncounterId: params.preEncounterId,
			temperature: "38.1",
			bpSystolic: 90,
			bpDiastolic: 60,
			heartRate: 112,
			respiratoryRate: 24,
			spo2: "95.0",
			painScore: 7,
			newsScore: 6,
			newsRiskLevel: "high",
			recordedByStaffId: params.nurseStaffId,
		})
	}

	let [medOrder] = await db
		.select()
		.from(medicationOrders)
		.where(and(eq(medicationOrders.encounterId, params.encounterId), eq(medicationOrders.genericName, "Paracetamol")))
	if (!medOrder) {
		;[medOrder] = await db
			.insert(medicationOrders)
			.values({
				facilityId: params.facilityId,
				encounterId: params.encounterId,
				formularyItemId: params.formularyItemId,
				genericName: "Paracetamol",
				brandName: "Biogesic",
				rxnormCode: "161",
				dose: "500",
				doseUnit: "mg",
				doseForm: "tablet",
				route: "oral",
				frequency: "q6h",
				durationDays: 3,
				status: "active",
				orderingStaffId: params.doctorStaffId,
			})
			.returning()
	}

	const [lab] = await db.select().from(labOrders).where(and(eq(labOrders.encounterId, params.encounterId), eq(labOrders.testName, "Complete Blood Count")))
	if (!lab) {
		await db.insert(labOrders).values({
			facilityId: params.facilityId,
			encounterId: params.encounterId,
			loincCode: "6690-2",
			testName: "Complete Blood Count",
			priority: "routine",
			status: "ordered",
			specimenType: "Blood",
			orderingStaffId: params.doctorStaffId,
		})
	}

	const [imaging] = await db.select().from(imagingOrders).where(and(eq(imagingOrders.encounterId, params.encounterId), eq(imagingOrders.bodyPart, "Chest")))
	if (!imaging) {
		await db.insert(imagingOrders).values({
			facilityId: params.facilityId,
			encounterId: params.encounterId,
			modality: "xray",
			bodyPart: "Chest",
			clinicalIndication: "Persistent cough and fever",
			priority: "routine",
			status: "ordered",
			orderingStaffId: params.doctorStaffId,
		})
	}

	const [mar] = await db.select().from(marEntries).where(and(eq(marEntries.encounterId, params.encounterId), eq(marEntries.medicationOrderId, medOrder!.id)))
	if (!mar) {
		await db.insert(marEntries).values({
			facilityId: params.facilityId,
			encounterId: params.encounterId,
			medicationOrderId: medOrder!.id,
			scheduledTime: new Date(),
			status: "given",
			administeredDose: "500 mg",
			administeredRoute: "oral",
			administeredByStaffId: params.nurseStaffId,
			administeredAt: new Date(),
			notes: "Administered after meals",
		})
	}

	const [tar] = await db.select().from(tarEntries).where(and(eq(tarEntries.encounterId, params.encounterId), eq(tarEntries.treatmentDescription, "Nebulization treatment")))
	if (!tar) {
		await db.insert(tarEntries).values({
			facilityId: params.facilityId,
			encounterId: params.encounterId,
			treatmentDescription: "Nebulization treatment",
			scheduledTime: new Date(),
			status: "given",
			administeredByStaffId: params.nurseStaffId,
			administeredAt: new Date(),
			notes: "Patient tolerated treatment well",
		})
	}

	const [io] = await db.select().from(ioEntries).where(and(eq(ioEntries.encounterId, params.encounterId), eq(ioEntries.description, "Oral fluids")))
	if (!io) {
		await db.insert(ioEntries).values({
			facilityId: params.facilityId,
			encounterId: params.encounterId,
			ioType: "intake",
			route: "oral",
			description: "Oral fluids",
			amountMl: "500.0",
			recordedByStaffId: params.nurseStaffId,
		})
	}

	let [charge] = await db.select().from(charges).where(and(eq(charges.encounterId, params.encounterId), eq(charges.description, "Emergency Room Consultation")))
	if (!charge) {
		;[charge] = await db
			.insert(charges)
			.values({
				facilityId: params.facilityId,
				encounterId: params.encounterId,
				chargeMasterItemId: params.chargeItemId,
				description: "Emergency Room Consultation",
				quantity: "1.00",
				unitPrice: "1500.00",
				totalAmount: "1500.00",
				sourceType: "manual",
				createdByStaffId: params.billingStaffId,
			})
			.returning()
	}

	let [invoice] = await db.select().from(invoices).where(and(eq(invoices.encounterId, params.encounterId), eq(invoices.invoiceNumber, "INV-0001")))
	if (!invoice) {
		;[invoice] = await db
			.insert(invoices)
			.values({
				facilityId: params.facilityId,
				encounterId: params.encounterId,
				patientId: params.patientId,
				invoiceNumber: "INV-0001",
				subtotal: "1500.00",
				philhealthCoverage: "500.00",
				patientResponsibility: "1000.00",
				status: "finalized",
				finalizedAt: new Date(),
				createdByStaffId: params.billingStaffId,
			})
			.returning()
	}

	const [lineItem] = await db.select().from(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, invoice!.id))
	if (!lineItem) {
		await db.insert(invoiceLineItems).values({
			invoiceId: invoice!.id,
			chargeId: charge!.id,
			description: "Emergency Room Consultation",
			quantity: "1.00",
			unitPrice: "1500.00",
			totalAmount: "1500.00",
		})
	}

	const [payment] = await db.select().from(payments).where(eq(payments.invoiceId, invoice!.id))
	if (!payment) {
		await db.insert(payments).values({
			facilityId: params.facilityId,
			invoiceId: invoice!.id,
			amount: "1000.00",
			paymentMethod: "cash",
			referenceNumber: "OR-0001",
			receivedByStaffId: params.billingStaffId,
			paymentDate: "2026-04-13",
		})
	}

	const [pidsr] = await db.select().from(pidsrCases).where(and(eq(pidsrCases.patientId, params.patientId), eq(pidsrCases.diseaseCode, "A90")))
	if (!pidsr) {
		await db.insert(pidsrCases).values({
			facilityId: params.facilityId,
			encounterId: params.encounterId,
			patientId: params.patientId,
			diseaseCode: "A90",
			diseaseName: "Dengue fever",
			caseClassification: "suspected",
			diagnosisDate: "2026-04-13",
			reportingStaffId: params.reportingStaffId,
			reportStatus: "draft",
		})
	}

	const [noteForFlag] = await db.select().from(clinicalNotes).where(eq(clinicalNotes.encounterId, params.encounterId))
	const [flag] = await db.select().from(surveillanceFlags).where(and(eq(surveillanceFlags.encounterId, params.encounterId), eq(surveillanceFlags.flagType, "dengue_watch")))
	if (!flag) {
		await db.insert(surveillanceFlags).values({
			facilityId: params.facilityId,
			encounterId: params.encounterId,
			noteId: noteForFlag?.id,
			flagType: "dengue_watch",
			triggeredBy: "symptom_keyword",
			triggerValue: "fever",
			isReviewed: false,
		})
	}

	const [snapshot] = await db.select().from(ahsrSnapshots).where(and(eq(ahsrSnapshots.facilityId, params.facilityId), eq(ahsrSnapshots.reportYear, 2026), eq(ahsrSnapshots.reportMonth, 4)))
	if (!snapshot) {
		await db.insert(ahsrSnapshots).values({
			facilityId: params.facilityId,
			reportYear: 2026,
			reportMonth: 4,
			snapshotData: {
				admissions: 12,
				discharges: 9,
				averageLengthOfStay: 2.3,
				erVisits: 27,
			},
			generatedByStaffId: params.reportingStaffId,
		})
	}
}

async function seedAdminScenarios(params: {
	facilityId: string
	adminUserId: string
	adminStaffId: string
	doctorStaffId: string
	patientId: string
}) {
	const { facilityId, adminUserId, adminStaffId, doctorStaffId, patientId } = params

	// ── Facility Profile (partially complete to trigger dashboard alert) ───────
	const [existingProfile] = await db
		.select()
		.from(facilityProfiles)
		.where(eq(facilityProfiles.facilityId, facilityId))
	if (!existingProfile) {
		await db.insert(facilityProfiles).values({
			facilityId,
			facilityCode: "QH-MAIN",
			governingAuthority: "DOH Region NCR",
			addressLine1: "123 Mabini Street",
			city: "Quezon City",
			province: "Metro Manila",
			// Intentionally omitting zipCode, telephone, email, adminContactName,
			// adminContactEmail to keep profile ~60% complete for demo
		})
	}

	// ── System Settings ───────────────────────────────────────────────────────
	const [existingSettings] = await db
		.select()
		.from(systemSettings)
		.where(eq(systemSettings.facilityId, facilityId))
	if (!existingSettings) {
		await db.insert(systemSettings).values({
			facilityId,
			timezone: "Asia/Manila",
			chartRetentionYears: 10,
			// supportMailbox and serviceDeskHotline intentionally omitted
			// to trigger "missing critical settings" dashboard alert
			breakGlassRequiresReason: true,
			autoFreezeChargesOnDischarge: true,
			requireDpaConsentBeforeExport: true,
			enableOfflineSummaryCache: false,
			policySections: {
				artaSla: { targetMinutes: 30, enableBanner: true },
				exportDefaults: { defaultFormat: "ndjson" },
			},
			updatedAt: new Date(),
		})
	}

	// ── Feature Flags (include one high-risk enabled flag) ────────────────────
	const flagDefs = [
		{
			key: "break-glass-auto-expire",
			name: "Break-Glass Auto Expiry",
			description: "Automatically expire emergency access sessions after 4 hours.",
			group: "compliance" as const,
			riskLevel: "low" as const,
			defaultEnabled: true,
		},
		{
			key: "fhir-r4-export",
			name: "FHIR R4 Export",
			description: "Enable FHIR R4-compatible patient data export for NHDR submission.",
			group: "integration" as const,
			riskLevel: "moderate" as const,
			defaultEnabled: false,
		},
		{
			key: "offline-summary-cache",
			name: "Offline Summary Cache",
			description: "Cache active patient summaries for offline access in low-connectivity areas.",
			group: "platform-control" as const,
			riskLevel: "high" as const,
			defaultEnabled: true, // High-risk + enabled → triggers dashboard alert
		},
	]
	for (const def of flagDefs) {
		const [existing] = await db
			.select()
			.from(featureFlags)
			.where(eq(featureFlags.key, def.key))
		if (!existing) {
			await db.insert(featureFlags).values(def)
		}
	}

	// ── Integrations (include one failed and one with missing credentials) ────
	const integrationDefs = [
		{
			kind: "fhir" as const,
			name: "NHDR FHIR R4",
			endpointUrl: "https://nhdr.doh.gov.ph/fhir/r4",
			credentialsRef: "NHDR_API_KEY",
			enabled: true,
			lastSyncAt: new Date(Date.now() - 36 * 60 * 60 * 1000), // 36h ago → stale
			lastSyncStatus: "error" as const,
		},
		{
			kind: "philhealth" as const,
			name: "PhilHealth eClaims",
			endpointUrl: "https://eclaims.philhealth.gov.ph/api",
			credentialsRef: null, // No credentials → triggers alert
			enabled: true,
			lastSyncAt: null,
			lastSyncStatus: null,
		},
		{
			kind: "civil_registry" as const,
			name: "PSA Civil Registry",
			endpointUrl: "https://api.psa.gov.ph/civil-registry",
			credentialsRef: "PSA_API_KEY",
			enabled: false, // Disabled
			lastSyncAt: null,
			lastSyncStatus: null,
		},
	]
	for (const def of integrationDefs) {
		const [existing] = await db
			.select()
			.from(integrations)
			.where(
				and(
					eq(integrations.facilityId, facilityId),
					eq(integrations.kind, def.kind),
					eq(integrations.name, def.name)
				)
			)
		if (!existing) {
			await db.insert(integrations).values({ facilityId, ...def })
		}
	}

	// ── Audit Logs (privileged changes for dashboard visibility) ──────────────
	const auditEntries = [
		{
			entityType: "feature_flag",
			action: "update" as const,
			description: "Enabled offline-summary-cache flag",
		},
		{
			entityType: "role_permission",
			action: "create" as const,
			description: "Added admin:export to Administrator role",
		},
		{
			entityType: "integration",
			action: "create" as const,
			description: "Added NHDR FHIR R4 integration",
		},
	]
	for (const entry of auditEntries) {
		await db.insert(auditLogs).values({
			facilityId,
			userId: adminUserId,
			staffProfileId: adminStaffId,
			action: entry.action,
			entityType: entry.entityType,
			entityId: crypto.randomUUID(),
			metadata: { description: entry.description },
			createdAt: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000),
		})
	}

	// ── Break-Glass Event (for dashboard audit widget) ────────────────────────
	const [existingBg] = await db
		.select()
		.from(breakGlassEvents)
		.where(
			and(
				eq(breakGlassEvents.facilityId, facilityId),
				eq(breakGlassEvents.clinicianStaffId, doctorStaffId)
			)
		)
	if (!existingBg) {
		const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000)
		await db.insert(breakGlassEvents).values({
			facilityId,
			clinicianStaffId: doctorStaffId,
			patientId,
			reasonCategory: "emergency",
			justification: "Patient unconscious, no prior consent; emergency clinical access required.",
			accessGrantedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
			accessExpiresAt: expiresAt,
			reviewStatus: "pending",
		})
	}

	console.log("  ✓ Admin dashboard seed scenarios complete")
}

async function main() {
	console.log("Seeding qhealth-emr development data...")
	const facility = await ensureFacility()

	const roleMap = new Map<string, string>()
	for (const user of demoUsers) {
		const role = await ensureRole(facility.id, user.roleName)
		await ensureRolePermissions(role.id, user.roleName)
		roleMap.set(user.roleName, role.id)
	}

	const authUsers = new Map<string, string>()
	for (const user of demoUsers) {
		const dbUser = await ensureAuthUser(user)
		authUsers.set(user.email, dbUser.id)
	}

	const staffMap = new Map<string, string>()
	for (const user of demoUsers) {
		const staff = await ensureStaffProfile(authUsers.get(user.email)!, facility.id, user)
		await ensureUserRole(staff.id, roleMap.get(user.roleName)!)
		staffMap.set(user.email, staff.id)
	}

	const erWard = await ensureWard(facility.id, "Emergency Room", "er", 2)
	const medWard = await ensureWard(facility.id, "Medical Ward", "general", 4)
	await ensureWard(facility.id, "Intensive Care Unit", "icu", 2)

	const erBed1 = await ensureBed(facility.id, erWard.id, "ER-01")
	await ensureBed(facility.id, erWard.id, "ER-02")
	const medBed1 = await ensureBed(facility.id, medWard.id, "MED-101")

	const patient1 = await ensurePatient(facility.id, "QH-000001", "Juan", "Dela Cruz", "1985-01-15", "male")
	const patient2 = await ensurePatient(facility.id, "QH-000002", "Maria", "Santos", "1992-07-03", "female")
	await ensurePatient(facility.id, "QH-000003", "Pedro", "Reyes", "1978-11-21", "male")

	const preEncounter = await ensurePreEncounter(facility.id, `TRAUMA-${new Date().getFullYear()}-0001`, staffMap.get("nurse@qhealth.local")!)
	const erEncounter = await ensureEncounter(facility.id, patient2.id, staffMap.get("doctor@qhealth.local")!, erBed1.id, "emergency", "Fever and productive cough")
	const inpatientEncounter = await ensureEncounter(facility.id, patient1.id, staffMap.get("doctor@qhealth.local")!, medBed1.id, "inpatient", "Uncontrolled hypertension")

	const refs = await ensureReferenceData(facility.id)
	await ensureClinicalData({
		facilityId: facility.id,
		encounterId: erEncounter.id,
		patientId: patient2.id,
		staffId: staffMap.get("doctor@qhealth.local")!,
	})
	await ensureNursingAndOrders({
		facilityId: facility.id,
		encounterId: erEncounter.id,
		preEncounterId: preEncounter.id,
		patientId: patient2.id,
		doctorStaffId: staffMap.get("doctor@qhealth.local")!,
		nurseStaffId: staffMap.get("nurse@qhealth.local")!,
		pharmacistStaffId: staffMap.get("pharmacist@qhealth.local")!,
		formularyItemId: refs.formulary.id,
		chargeItemId: refs.chargeItem.id,
		billingStaffId: staffMap.get("billing@qhealth.local")!,
		reportingStaffId: staffMap.get("pidsr@qhealth.local")!,
	})

	await db.update(beds).set({ status: "occupied", currentEncounterId: erEncounter.id, updatedAt: new Date() }).where(eq(beds.id, erBed1.id))
	await db.update(beds).set({ status: "occupied", currentEncounterId: inpatientEncounter.id, updatedAt: new Date() }).where(eq(beds.id, medBed1.id))

	await seedAdminScenarios({
		facilityId: facility.id,
		adminUserId: authUsers.get("admin@qhealth.local")!,
		adminStaffId: staffMap.get("admin@qhealth.local")!,
		doctorStaffId: staffMap.get("doctor@qhealth.local")!,
		patientId: patient1.id,
	})

	console.log("Seed complete.")
	console.log("Login credentials:")
	for (const user of demoUsers) {
		console.log(`- ${user.roleName}: ${user.email} / ${DEFAULT_PASSWORD}`)
	}
}

main().then(() => process.exit(0)).catch(err => {
	console.error("Seed failed:", err)
	process.exit(1)
})
