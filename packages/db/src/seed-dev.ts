/* eslint-disable no-console */
import "dotenv/config"

import { and, eq, sql } from "drizzle-orm"

import { createDBClient } from "./client.js"
import {
	ahsrSnapshots,
	allergies,
	auditLogs,
	beds,
	breakGlassEvents,
	chargeMasterItems,
	charges,
	clinicalNotes,
	consentRecords,
	drugBrands,
	drugGenerics,
	encounters,
	facilities,
	facilityProfiles,
	featureFlags,
	flowsheetEntries,
	formularyItems,
	haiTags,
	icd10Codes,
	imagingOrders,
	integrations,
	invoiceLineItems,
	invoices,
	ioEntries,
	labOrders,
	marEntries,
	medicationOrders,
	nbsLogEntries,
	noteTemplates,
	patients,
	payments,
	pidsrCases,
	preEncounters,
	prescriptions,
	problems,
	rolePermissions,
	roles,
	shiftHandoffs,
	snomedCtCodes,
	staffProfiles,
	surgicalCases,
	surveillanceFlags,
	systemSettings,
	tarEntries,
	telemedicineAppointments,
	telemedicineEncounters,
	userRoles,
	users,
	vitalSigns,
	wards,
} from "./schema/index.js"

const DATABASE_URL = process.env.DATABASE_URL
const AUTH_API = process.env.SEED_AUTH_API_URL
const WEB_ORIGIN = process.env.SEED_WEB_ORIGIN ?? "http://localhost:3001"
const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "Password123"

if (!DATABASE_URL) {
	console.error("DATABASE_URL is required")
	process.exit(1)
}

const db = createDBClient(DATABASE_URL)
let authModulePromise: Promise<{
	getAuth: () => { api: { signUpEmail: (input: { body: unknown }) => Promise<unknown> } }
}> | null = null

async function assertSeedSchemaReady() {
	const result = await db.execute(
		sql`SELECT to_regclass('public.facilities') AS facilities, to_regclass('public.problems') AS problems`
	)
	const row = result.rows[0] as
		| {
				facilities?: string | null
				problems?: string | null
		  }
		| undefined

	if (!row?.facilities || !row?.problems) {
		throw new Error(
			'Database schema is not initialized. Run "pnpm db:push" before running "pnpm db:seed".'
		)
	}
}

async function ensureProblemsTerminologyColumns() {
	await db.execute(sql`ALTER TABLE "problems" ADD COLUMN IF NOT EXISTS "snomed_code" text`)
	await db.execute(sql`ALTER TABLE "problems" ADD COLUMN IF NOT EXISTS "snomed_display" text`)
}

async function ensureTelemedicineLiveKitColumns() {
	await db.execute(
		sql`ALTER TABLE IF EXISTS "telemedicine_appointments" ADD COLUMN IF NOT EXISTS "livekit_room_name" text`
	)
	await db.execute(
		sql`ALTER TABLE IF EXISTS "telemedicine_appointments" ADD COLUMN IF NOT EXISTS "livekit_session_started_at" timestamptz`
	)
	await db.execute(
		sql`ALTER TABLE IF EXISTS "telemedicine_appointments" ADD COLUMN IF NOT EXISTS "livekit_session_ended_at" timestamptz`
	)
	await db.execute(
		sql`ALTER TABLE IF EXISTS "telemedicine_appointments" ADD COLUMN IF NOT EXISTS "patient_invite_token_hash" text`
	)
	await db.execute(
		sql`ALTER TABLE IF EXISTS "telemedicine_appointments" ADD COLUMN IF NOT EXISTS "patient_invite_expires_at" timestamptz`
	)
	await db.execute(
		sql`ALTER TABLE IF EXISTS "telemedicine_appointments" ADD COLUMN IF NOT EXISTS "patient_invite_revoked_at" timestamptz`
	)
	await db.execute(
		sql`ALTER TABLE IF EXISTS "telemedicine_appointments" ADD COLUMN IF NOT EXISTS "patient_invite_last_used_at" timestamptz`
	)
	await db.execute(
		sql`ALTER TABLE IF EXISTS "telemedicine_appointments" ADD COLUMN IF NOT EXISTS "patient_joined_at" timestamptz`
	)
	await db.execute(
		sql`ALTER TABLE IF EXISTS "telemedicine_appointments" ALTER COLUMN "platform" SET DEFAULT 'livekit'`
	)
	await db.execute(
		sql`CREATE UNIQUE INDEX IF NOT EXISTS "telemedicine_appts_patient_invite_hash_uniq" ON "telemedicine_appointments" ("patient_invite_token_hash")`
	)
}

async function seedProblemTerminology() {
	const icd10Data = [
		{
			code: "A09",
			description: "Infectious gastroenteritis and colitis, unspecified",
			category: "Certain infectious and parasitic diseases",
		},
		{
			code: "A15.0",
			description: "Tuberculosis of lung",
			category: "Certain infectious and parasitic diseases",
		},
		{
			code: "B20",
			description: "Human immunodeficiency virus [HIV] disease",
			category: "Certain infectious and parasitic diseases",
		},
		{
			code: "E11",
			description: "Type 2 diabetes mellitus",
			category: "Endocrine, nutritional and metabolic diseases",
		},
		{
			code: "E11.65",
			description: "Type 2 diabetes mellitus with hyperglycemia",
			category: "Endocrine, nutritional and metabolic diseases",
		},
		{
			code: "E78.5",
			description: "Dyslipidemia, unspecified",
			category: "Endocrine, nutritional and metabolic diseases",
		},
		{
			code: "I10",
			description: "Essential (primary) hypertension",
			category: "Diseases of the circulatory system",
		},
		{
			code: "I25.10",
			description: "Atherosclerotic heart disease of native coronary artery",
			category: "Diseases of the circulatory system",
		},
		{
			code: "I50.9",
			description: "Heart failure, unspecified",
			category: "Diseases of the circulatory system",
		},
		{
			code: "J06.9",
			description: "Acute upper respiratory infection, unspecified",
			category: "Diseases of the respiratory system",
		},
		{
			code: "J18.9",
			description: "Pneumonia, unspecified organism",
			category: "Diseases of the respiratory system",
		},
		{
			code: "J45.909",
			description: "Unspecified asthma, uncomplicated",
			category: "Diseases of the respiratory system",
		},
		{
			code: "K21.0",
			description: "Gastro-esophageal reflux disease with esophagitis",
			category: "Diseases of the digestive system",
		},
		{
			code: "M54.5",
			description: "Low back pain",
			category: "Diseases of the musculoskeletal system",
		},
		{
			code: "N18.3",
			description: "Chronic kidney disease, stage 3",
			category: "Diseases of the genitourinary system",
		},
		{
			code: "R50.9",
			description: "Fever, unspecified",
			category: "Symptoms, signs and abnormal clinical findings",
		},
		{
			code: "Z00.00",
			description: "Encounter for general adult medical examination without abnormal findings",
			category: "Factors influencing health status",
		},
	]

	const snomedData = [
		{
			conceptId: "38341003",
			fsn: "Hypertensive disorder, systemic arterial (disorder)",
			preferredTerm: "Hypertension",
			semanticTag: "disorder",
		},
		{
			conceptId: "44054006",
			fsn: "Diabetes mellitus type 2 (disorder)",
			preferredTerm: "Type 2 diabetes mellitus",
			semanticTag: "disorder",
		},
		{
			conceptId: "233604007",
			fsn: "Pneumonia (disorder)",
			preferredTerm: "Pneumonia",
			semanticTag: "disorder",
		},
		{
			conceptId: "195967001",
			fsn: "Asthma (disorder)",
			preferredTerm: "Asthma",
			semanticTag: "disorder",
		},
		{
			conceptId: "13645005",
			fsn: "Chronic obstructive lung disease (disorder)",
			preferredTerm: "Chronic obstructive pulmonary disease",
			semanticTag: "disorder",
		},
		{
			conceptId: "84114007",
			fsn: "Heart failure (disorder)",
			preferredTerm: "Heart failure",
			semanticTag: "disorder",
		},
		{
			conceptId: "53741008",
			fsn: "Coronary arteriosclerosis (disorder)",
			preferredTerm: "Coronary artery disease",
			semanticTag: "disorder",
		},
		{
			conceptId: "235595009",
			fsn: "Gastroesophageal reflux disease (disorder)",
			preferredTerm: "Gastroesophageal reflux disease",
			semanticTag: "disorder",
		},
		{
			conceptId: "279039007",
			fsn: "Low back pain (finding)",
			preferredTerm: "Low back pain",
			semanticTag: "finding",
		},
		{
			conceptId: "709044004",
			fsn: "Chronic kidney disease (disorder)",
			preferredTerm: "Chronic kidney disease",
			semanticTag: "disorder",
		},
		{
			conceptId: "386661006",
			fsn: "Fever (finding)",
			preferredTerm: "Fever",
			semanticTag: "finding",
		},
		{
			conceptId: "68566005",
			fsn: "Urinary tract infectious disease (disorder)",
			preferredTerm: "Urinary tract infection",
			semanticTag: "disorder",
		},
		{
			conceptId: "40930008",
			fsn: "Hypothyroidism (disorder)",
			preferredTerm: "Hypothyroidism",
			semanticTag: "disorder",
		},
		{
			conceptId: "55822004",
			fsn: "Hyperlipidemia (disorder)",
			preferredTerm: "Hyperlipidemia",
			semanticTag: "disorder",
		},
		{
			conceptId: "69896004",
			fsn: "Rheumatoid arthritis (disorder)",
			preferredTerm: "Rheumatoid arthritis",
			semanticTag: "disorder",
		},
	]

	await db.insert(icd10Codes).values(icd10Data).onConflictDoNothing()
	await db.insert(snomedCtCodes).values(snomedData).onConflictDoNothing()
	console.log(
		`  - Seeded ${icd10Data.length} ICD-10 and ${snomedData.length} SNOMED CT problem codes`
	)
}

type ModuleName =
	| "adt"
	| "clinical_docs"
	| "orders"
	| "nursing"
	| "billing"
	| "billing.charges"
	| "billing.invoices"
	| "billing.payments"
	| "billing.cf4"
	| "billing.drg"
	| "billing.cf5"
	| "billing.esoa"
	| "billing.cews"
	| "billing.konsulta"
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
	| "him.deficiencies"
	| "him.coding"
	| "him.records"
	| "him.hai"
	| "notifications"

type ActionName =
	| "view"
	| "create"
	| "edit"
	| "sign"
	| "delete"
	| "verify"
	| "export"
	| "manage_catalog"
	| "clinical_policy"
	| "terminology_admin"
	| "read"
	| "write"

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

interface DemoFacility {
	key: string
	name: string
	facilityType: "community" | "district" | "tertiary"
	address: string
	dohLicenseNumber: string
	philhealthAccreditationId: string
	facilityCode: string
	city: string
	province: string
	telephone: string
	email: string
	adminContactName: string
	adminContactEmail: string
}

const demoUsers: DemoUser[] = [
	{
		email: "demo.admin@qhealth.local",
		name: "Demo Administrator",
		roleName: "Administrator",
		department: "Administration",
		employeeNumber: "DEMO-ADM-001",
	},
	{
		email: "demo.scheduler@qhealth.local",
		name: "Demo Scheduler",
		roleName: "Scheduler",
		department: "Admissions and Scheduling",
		employeeNumber: "DEMO-SCH-001",
	},
	{
		email: "demo.registrar@qhealth.local",
		name: "Demo Registrar",
		roleName: "Registrar",
		department: "Admissions",
		employeeNumber: "DEMO-REG-001",
	},
	{
		email: "demo.doctor@qhealth.local",
		name: "Dr. Demo Physician",
		roleName: "Physician",
		department: "Emergency Department",
		employeeNumber: "DEMO-MD-001",
		prcLicenseNumber: "DEMO-PRC-100001",
		ptrNumber: "DEMO-PTR-100001",
		pdeaS2License: "DEMO-S2-100001",
	},
	{
		email: "demo.billing@qhealth.local",
		name: "Demo Billing Officer",
		roleName: "Billing Officer",
		department: "Billing",
		employeeNumber: "DEMO-BIL-001",
	},
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
	{
		email: "familymed@qhealth.local",
		name: "Dr. Isabel Navarro",
		roleName: "Physician",
		department: "Family Medicine",
		employeeNumber: "MD-002",
		prcLicenseNumber: "PRC-100002",
		ptrNumber: "PTR-100002",
		pdeaS2License: "S2-100002",
	},
	{
		email: "internist@qhealth.local",
		name: "Dr. Paolo Mendoza",
		roleName: "Physician",
		department: "Internal Medicine",
		employeeNumber: "MD-003",
		prcLicenseNumber: "PRC-100003",
		ptrNumber: "PTR-100003",
		pdeaS2License: "S2-100003",
	},
	{
		email: "pediatrician@qhealth.local",
		name: "Dr. Elena Ramos",
		roleName: "Physician",
		department: "Pediatrics",
		employeeNumber: "MD-004",
		prcLicenseNumber: "PRC-100004",
		ptrNumber: "PTR-100004",
		pdeaS2License: "S2-100004",
	},
]

const demoFacilities: DemoFacility[] = [
	{
		key: "main",
		name: "QHealth Community Hospital",
		facilityType: "community",
		address: "123 Mabini Street, Quezon City",
		dohLicenseNumber: "DOH-123456",
		philhealthAccreditationId: "PH-654321",
		facilityCode: "QH-MAIN",
		city: "Quezon City",
		province: "Metro Manila",
		telephone: "(02) 8123 4567",
		email: "main@qhealth.local",
		adminContactName: "QHealth Admin",
		adminContactEmail: "admin@qhealth.local",
	},
	{
		key: "north-clinic",
		name: "QHealth North Family Clinic",
		facilityType: "community",
		address: "45 Katipunan Avenue, Quezon City",
		dohLicenseNumber: "DOH-223456",
		philhealthAccreditationId: "PH-754321",
		facilityCode: "QH-NORTH",
		city: "Quezon City",
		province: "Metro Manila",
		telephone: "(02) 8234 1001",
		email: "north-clinic@qhealth.local",
		adminContactName: "QHealth Admin",
		adminContactEmail: "admin@qhealth.local",
	},
	{
		key: "south-clinic",
		name: "QHealth South Internal Medicine Clinic",
		facilityType: "district",
		address: "78 Alabang-Zapote Road, Muntinlupa City",
		dohLicenseNumber: "DOH-323456",
		philhealthAccreditationId: "PH-854321",
		facilityCode: "QH-SOUTH",
		city: "Muntinlupa City",
		province: "Metro Manila",
		telephone: "(02) 8345 1002",
		email: "south-clinic@qhealth.local",
		adminContactName: "QHealth Admin",
		adminContactEmail: "admin@qhealth.local",
	},
	{
		key: "east-clinic",
		name: "QHealth East Pediatric Clinic",
		facilityType: "community",
		address: "120 Marcos Highway, Pasig City",
		dohLicenseNumber: "DOH-423456",
		philhealthAccreditationId: "PH-954321",
		facilityCode: "QH-EAST",
		city: "Pasig City",
		province: "Metro Manila",
		telephone: "(02) 8456 1003",
		email: "east-clinic@qhealth.local",
		adminContactName: "QHealth Admin",
		adminContactEmail: "admin@qhealth.local",
	},
]

const staffFacilityAssignments: Record<string, string[]> = {
	"demo.admin@qhealth.local": demoFacilities.map(facility => facility.key),
	"demo.scheduler@qhealth.local": demoFacilities.map(facility => facility.key),
	"demo.registrar@qhealth.local": demoFacilities.map(facility => facility.key),
	"demo.billing@qhealth.local": demoFacilities.map(facility => facility.key),
	"admin@qhealth.local": demoFacilities.map(facility => facility.key),
	"scheduler@qhealth.local": demoFacilities.map(facility => facility.key),
	"familymed@qhealth.local": ["main", "north-clinic"],
	"internist@qhealth.local": ["main", "south-clinic"],
	"pediatrician@qhealth.local": ["main", "east-clinic"],
}

const roleBundles: Record<string, Array<[ModuleName, ActionName[]]>> = {
	// TOR: System Admin manages configuration, users, roles, and feature flags.
	// Has NO clinical write access (no create/edit/sign/verify/delete on clinical modules).
	"Administrator": [
		["admin", ["view", "create", "edit", "delete", "export"]], // User/role management
		["feature_flags", ["view", "create", "edit", "delete"]], // Feature flag management
		["system_settings", ["view", "create", "edit"]], // System configuration
		["facility_profile", ["view", "create", "edit"]], // Facility profile management
		["integration_registry", ["view", "create", "edit", "delete"]], // Integration oversight
		["adt", ["view"]], // Census visibility (no clinical write)
		["formulary", ["view"]], // Formulary catalog read-only — TOR: System Admin has no clinical write access
		["fhir", ["view", "export"]], // FHIR export management
		["notifications", ["view"]], // All staff receive system notifications
	],
	"Physician": [
		// Physicians view encounters and document care; Registrar owns encounter creation/scheduling/beds.
		["adt", ["view"]],
		["patients", ["view"]], // Patient record access (search, profile)
		["clinical_docs", ["view", "create", "edit", "sign"]],
		["orders", ["view", "create", "edit", "sign"]],
		["nursing", ["view"]],
		["formulary", ["view"]],
		["opd", ["view"]], // OPD dashboard access
		["telemedicine", ["view", "create", "edit"]], // Virtual consultation access
		["ed", ["view", "edit"]], // Emergency department patient viewing + disposition (C2)
		["death_reporting", ["view", "create", "edit"]], // Physician authors FMDRF/FNDRF forms
		["audit", ["create"]], // Break-glass emergency access invocation
		["notifications", ["view"]], // All staff receive system notifications
	],
	"Nurse": [
		["adt", ["view", "edit"]], // edit for bed management access
		["patients", ["view"]], // Patient record access (search, profile)
		["clinical_docs", ["view"]],
		["orders", ["view"]],
		["nursing", ["view", "create", "edit", "sign"]],
		["formulary", ["view"]],
		["ed", ["view", "edit"]], // Emergency department access + ER tracker board actions (C3)
		["nbs", ["view", "create", "edit"]], // Newborn screening workflows
		["opd", ["view"]], // TOR: Nurses participate in OPD triage and vital-sign capture
		["notifications", ["view"]], // All staff receive system notifications
	],
	"Pharmacist": [
		["orders", ["view", "edit", "verify"]],
		["formulary", ["view", "create", "edit", "manage_catalog", "clinical_policy"]], // manage_catalog: drug generic/brand catalog master-data authoring
		["clinical_docs", ["view"]],
		["patients", ["view"]], // Patient record access for dispensing verification
		["notifications", ["view"]], // All staff receive system notifications
	],
	"Billing Officer": [
		["adt", ["view"]],
		["patients", ["view"]], // Patient record access for billing reconciliation
		["billing", ["view", "create", "edit", "sign", "export"]], // Legacy fallback for shell-level access and RVS finalization
		["billing.charges", ["read", "write"]],
		["billing.invoices", ["read", "write"]],
		["billing.payments", ["read", "write"]],
		["billing.cf4", ["read", "write"]],
		["billing.drg", ["read", "write"]],
		["billing.cf5", ["read", "write"]],
		["billing.esoa", ["read", "write"]],
		["billing.cews", ["read", "write"]],
		["billing.konsulta", ["read", "write"]],
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
	"Registrar": [
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
		["ed", ["view", "create", "edit"]], // Emergency department triage workflows + queue/pre-encounter updates (C1)
		["opd", ["view"]], // TOR: Triage Officers staff the OPD triage desk
		["notifications", ["view"]], // All staff receive system notifications
	],
	"Surgeon": [
		["adt", ["view"]],
		["patients", ["view"]], // Patient record access (search, profile)
		["clinical_docs", ["view", "create", "edit", "sign"]],
		["orders", ["view", "create", "edit", "sign"]],
		["surgical", ["view", "create", "edit", "sign"]], // Surgical tab visibility + create/save/sign operation records for OR workflows
		["formulary", ["view"]],
		["opd", ["view"]], // OPD dashboard access (per TOR)
		["death_reporting", ["view", "create", "edit"]], // Surgeon may author FMDRF/FNDRF for surgical cases
		["audit", ["create"]], // Break-glass emergency access invocation
		["notifications", ["view"]], // All staff receive system notifications
	],
	"Anesthesiologist": [
		["adt", ["view"]],
		["patients", ["view"]], // Patient record access (search, profile)
		["clinical_docs", ["view", "create", "edit", "sign"]],
		["orders", ["view", "create", "edit", "sign"]], // TOR: anesthesiologists place/sign orders and compliant e-prescriptions
		["surgical", ["view", "edit", "sign"]], // Surgical tab visibility + save/sign anesthesia records
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
	"Radiologist": [
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
		["him.deficiencies", ["read", "write"]], // HIM: chart deficiency worklist
		["him.coding", ["read", "write"]], // HIM: ICD-10 coding
		["him.records", ["read", "write"]], // HIM: medical records issuance
		["him.hai", ["read", "write"]], // HIM: HAI reconciliation
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
	"Scheduler": [
		["adt", ["view", "create"]],
		["patients", ["view"]], // Patient record access for appointment scheduling
		["scheduling", ["view", "create", "edit"]],
		["telemedicine", ["view", "create", "edit"]], // Book and update virtual visit appointments
		["notifications", ["view"]], // All staff receive system notifications
	],
	"Auditor": [
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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function postAuth(path: string, data: unknown) {
	if (!AUTH_API) {
		process.env.BETTER_AUTH_SECRET ??= "seed-dev-secret-not-for-production"
		process.env.BETTER_AUTH_TRUSTED_ORIGINS ??= `${WEB_ORIGIN},http://localhost:3000`
		authModulePromise ??= import(
			new URL("../../auth/src/index.ts", import.meta.url).href
		) as Promise<{
			getAuth: () => { api: { signUpEmail: (input: { body: unknown }) => Promise<unknown> } }
		}>
		const { getAuth } = await authModulePromise
		await getAuth().api.signUpEmail({ body: data })
		return { ok: true, status: 200, text: async () => "" }
	}

	return fetch(new URL(path, AUTH_API), {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Origin": WEB_ORIGIN,
		},
		body: JSON.stringify(data),
	})
}

async function ensureAuthUser(user: DemoUser) {
	const [existing] = await db.select().from(users).where(eq(users.email, user.email))
	if (existing) return existing

	const response = await postAuth("sign-up/email", {
		email: user.email,
		password: DEFAULT_PASSWORD,
		name: user.name,
	})

	if (!response.ok) {
		const body = await response.text()
		throw new Error(`Failed to create auth user ${user.email}: ${response.status} ${body}`)
	}

	const [dbUser] = await db.select().from(users).where(eq(users.email, user.email))
	if (!dbUser) {
		throw new Error(`Auth user ${user.email} was not found after sign-up`)
	}
	return dbUser
}

async function ensureFacility(seed: DemoFacility) {
	const [existing] = await db.select().from(facilities).where(eq(facilities.name, seed.name))
	if (existing) return existing
	const [created] = await db
		.insert(facilities)
		.values({
			name: seed.name,
			facilityType: seed.facilityType,
			address: seed.address,
			dohLicenseNumber: seed.dohLicenseNumber,
			philhealthAccreditationId: seed.philhealthAccreditationId,
		})
		.returning()
	return created!
}

async function ensureFacilityProfile(facilityId: string, seed: DemoFacility) {
	const [existing] = await db
		.select()
		.from(facilityProfiles)
		.where(eq(facilityProfiles.facilityId, facilityId))

	if (existing) {
		await db
			.update(facilityProfiles)
			.set({
				facilityCode: seed.facilityCode,
				governingAuthority: "DOH NCR",
				addressLine1: seed.address,
				city: seed.city,
				province: seed.province,
				zipCode: "1100",
				telephone: seed.telephone,
				email: seed.email,
				adminContactName: seed.adminContactName,
				adminContactEmail: seed.adminContactEmail,
				updatedAt: new Date(),
			})
			.where(eq(facilityProfiles.facilityId, facilityId))
		return
	}

	await db.insert(facilityProfiles).values({
		facilityId,
		facilityCode: seed.facilityCode,
		governingAuthority: "DOH NCR",
		addressLine1: seed.address,
		city: seed.city,
		province: seed.province,
		zipCode: "1100",
		telephone: seed.telephone,
		email: seed.email,
		adminContactName: seed.adminContactName,
		adminContactEmail: seed.adminContactEmail,
		updatedAt: new Date(),
	})
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

async function ensureWard(
	facilityId: string,
	name: string,
	wardType: "general" | "icu" | "er" | "or" | "nursery",
	totalBeds: number
) {
	const [existing] = await db
		.select()
		.from(wards)
		.where(and(eq(wards.facilityId, facilityId), eq(wards.name, name)))
	if (existing) return existing
	const [created] = await db
		.insert(wards)
		.values({ facilityId, name, wardType, totalBeds, isActive: true })
		.returning()
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

async function ensurePatient(
	facilityId: string,
	mrn: string,
	firstName: string,
	lastName: string,
	dateOfBirth: string,
	sex: "male" | "female" | "other"
) {
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

// Like ensurePatient but always updates dateOfBirth so the NBS tab (< 30-day rule)
// stays active on every seed run.
async function ensureNewbornPatient(
	facilityId: string,
	mrn: string,
	firstName: string,
	lastName: string,
	dateOfBirth: string,
	sex: "male" | "female" | "other"
) {
	const [existing] = await db
		.select()
		.from(patients)
		.where(and(eq(patients.facilityId, facilityId), eq(patients.mrn, mrn)))
	if (existing) {
		// Always refresh DOB so the patient stays < 30 days old across seed runs
		const [updated] = await db
			.update(patients)
			.set({ dateOfBirth, updatedAt: new Date() })
			.where(eq(patients.id, existing.id))
			.returning()
		return updated!
	}
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
			emergencyContactName: "Maria Santos (Mother)",
			emergencyContactPhone: "09171234567",
			isActive: true,
		})
		.returning()
	return created!
}

async function ensurePreEncounter(facilityId: string, traumaAlias: string, triageStaffId: string) {
	const [existing] = await db
		.select()
		.from(preEncounters)
		.where(
			and(eq(preEncounters.facilityId, facilityId), eq(preEncounters.traumaAlias, traumaAlias))
		)
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

async function ensureEncounter(
	facilityId: string,
	patientId: string,
	attendingStaffId: string,
	bedId: string | null,
	encounterType: "inpatient" | "outpatient" | "emergency",
	chiefComplaint: string
) {
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

async function ensureSurgicalCase(seed: {
	facilityId: string
	encounterId: string
	patientId: string
	procedureName: string
	orSuite: string
	surgicalType: "elective" | "emergency" | "urgent"
	surgeonStaffId: string
	anesthesiologistStaffId: string
	scheduledDatetime: Date
	estimatedDurationMinutes: number
	requiredEquipment: string[]
	notes: string
}) {
	const [existing] = await db
		.select()
		.from(surgicalCases)
		.where(
			and(
				eq(surgicalCases.facilityId, seed.facilityId),
				eq(surgicalCases.encounterId, seed.encounterId),
				eq(surgicalCases.procedureName, seed.procedureName)
			)
		)

	if (existing) {
		const [updated] = await db
			.update(surgicalCases)
			.set({
				orSuite: seed.orSuite,
				surgicalType: seed.surgicalType,
				surgeonStaffId: seed.surgeonStaffId,
				anesthesiologistStaffId: seed.anesthesiologistStaffId,
				scheduledDatetime: seed.scheduledDatetime,
				actualStartDatetime: null,
				actualEndDatetime: null,
				status: "scheduled",
				estimatedDurationMinutes: seed.estimatedDurationMinutes,
				requiredEquipment: seed.requiredEquipment,
				notes: seed.notes,
				updatedAt: new Date(),
			})
			.where(eq(surgicalCases.id, existing.id))
			.returning()
		return updated!
	}

	const [created] = await db
		.insert(surgicalCases)
		.values({
			facilityId: seed.facilityId,
			encounterId: seed.encounterId,
			patientId: seed.patientId,
			procedureName: seed.procedureName,
			orSuite: seed.orSuite,
			surgicalType: seed.surgicalType,
			surgeonStaffId: seed.surgeonStaffId,
			anesthesiologistStaffId: seed.anesthesiologistStaffId,
			scheduledDatetime: seed.scheduledDatetime,
			status: "scheduled",
			asaClass: "ASA II",
			estimatedDurationMinutes: seed.estimatedDurationMinutes,
			requiredEquipment: seed.requiredEquipment,
			notes: seed.notes,
		})
		.returning()
	return created!
}

function toSeedDate(daysFromToday: number) {
	const date = new Date()
	date.setDate(date.getDate() + daysFromToday)
	return formatSeedDate(date)
}

function formatSeedDate(date: Date) {
	const year = date.getFullYear()
	const month = `${date.getMonth() + 1}`.padStart(2, "0")
	const day = `${date.getDate()}`.padStart(2, "0")
	return `${year}-${month}-${day}`
}

function formatSeedTime(date: Date) {
	const hour = `${date.getHours()}`.padStart(2, "0")
	const minute = `${date.getMinutes()}`.padStart(2, "0")
	const second = `${date.getSeconds()}`.padStart(2, "0")
	return `${hour}:${minute}:${second}`
}

function toSeedDateTime(minutesFromNow: number) {
	const date = new Date()
	date.setMinutes(date.getMinutes() + minutesFromNow, 0, 0)
	return {
		scheduledDate: formatSeedDate(date),
		scheduledTime: formatSeedTime(date),
	}
}

async function ensureTelemedicineAppointment(seed: {
	facilityId: string
	patientId: string
	clinicianStaffId: string
	scheduledDate: string
	scheduledTime: string
	durationMinutes: number
	status: "scheduled" | "confirmed" | "in-progress" | "completed" | "cancelled" | "no-show"
	videoLink: string
	meetingId: string
	meetingPassword: string
	notes: string
	createdByStaffId: string
}) {
	const [existing] = await db
		.select({
			id: telemedicineAppointments.id,
			meetingId: telemedicineAppointments.meetingId,
		})
		.from(telemedicineAppointments)
		.where(
			and(
				eq(telemedicineAppointments.facilityId, seed.facilityId),
				eq(telemedicineAppointments.meetingId, seed.meetingId)
			)
		)
		.limit(1)

	const values = {
		facilityId: seed.facilityId,
		patientId: seed.patientId,
		clinicianStaffId: seed.clinicianStaffId,
		scheduledDate: seed.scheduledDate,
		scheduledTime: seed.scheduledTime,
		durationMinutes: seed.durationMinutes,
		platform: "livekit" as const,
		status: seed.status,
		videoLink: seed.videoLink,
		meetingId: seed.meetingId,
		meetingPassword: seed.meetingPassword,
		notes: seed.notes,
		createdByStaffId: seed.createdByStaffId,
	}

	if (existing) {
		const [updated] = await db
			.update(telemedicineAppointments)
			.set({ ...values, updatedAt: new Date() })
			.where(eq(telemedicineAppointments.id, existing.id))
			.returning({
				id: telemedicineAppointments.id,
				meetingId: telemedicineAppointments.meetingId,
			})
		return updated ?? existing
	}

	const [created] = await db.insert(telemedicineAppointments).values(values).returning({
		id: telemedicineAppointments.id,
		meetingId: telemedicineAppointments.meetingId,
	})
	return created!
}

async function ensureTelemedicineEncounter(seed: {
	appointmentId: string
	patientId: string
	clinicianStaffId: string
	chiefComplaint: string
	subjectiveNotes: string
	objectiveNotes: string
	assessmentNotes: string
	planNotes: string
	diagnosis: string
	icdCode?: string
	vitalSigns?: {
		bloodPressure?: string
		heartRate?: string
		temperature?: string
		oxygenSaturation?: string
		weight?: string
	}
	status: "open" | "signed" | "finalized"
	signedAt?: Date
}) {
	const [existing] = await db
		.select()
		.from(telemedicineEncounters)
		.where(eq(telemedicineEncounters.appointmentId, seed.appointmentId))
		.limit(1)

	const values = {
		appointmentId: seed.appointmentId,
		encounterType: "standalone" as const,
		linkedEncounterId: null,
		patientId: seed.patientId,
		clinicianStaffId: seed.clinicianStaffId,
		chiefComplaint: seed.chiefComplaint,
		subjectiveNotes: seed.subjectiveNotes,
		objectiveNotes: seed.objectiveNotes,
		assessmentNotes: seed.assessmentNotes,
		planNotes: seed.planNotes,
		diagnosis: seed.diagnosis,
		icdCode: seed.icdCode ?? null,
		vitalSigns: seed.vitalSigns ?? null,
		status: seed.status,
		signedAt: seed.status === "open" ? null : (seed.signedAt ?? new Date()),
		signedByStaffId: seed.status === "open" ? null : seed.clinicianStaffId,
	}

	if (existing) {
		const [updated] = await db
			.update(telemedicineEncounters)
			.set({ ...values, updatedAt: new Date() })
			.where(eq(telemedicineEncounters.id, existing.id))
			.returning()
		return updated ?? existing
	}

	const [created] = await db.insert(telemedicineEncounters).values(values).returning()
	return created!
}

async function ensureTelemedicineAppointments(params: {
	mainFacilityId: string
	northFacilityId: string
	doctorStaffId: string
	familyMedicineNorthStaffId: string
	schedulerMainStaffId: string
	schedulerNorthStaffId: string
	mainPatientIds: {
		scheduled: string
		inProgress: string
		confirmed: string
		completed: string
	}
	northPatientIds: {
		scheduled: string
		confirmed: string
	}
}) {
	const now = new Date()
	const completedSignedAt = new Date(now.getTime() - 2 * 24 * 3_600_000)
	const inProgressSchedule = toSeedDateTime(-15)

	const mainScheduled = await ensureTelemedicineAppointment({
		facilityId: params.mainFacilityId,
		patientId: params.mainPatientIds.scheduled,
		clinicianStaffId: params.doctorStaffId,
		scheduledDate: toSeedDate(1),
		scheduledTime: "09:00:00",
		durationMinutes: 30,
		status: "scheduled",
		videoLink: "https://zoom.us/j/910000001",
		meetingId: "QH-TM-MAIN-001",
		meetingPassword: "telemed1",
		notes: "Initial virtual consult for hypertension medication review.",
		createdByStaffId: params.schedulerMainStaffId,
	})

	const mainInProgress = await ensureTelemedicineAppointment({
		facilityId: params.mainFacilityId,
		patientId: params.mainPatientIds.inProgress,
		clinicianStaffId: params.doctorStaffId,
		scheduledDate: inProgressSchedule.scheduledDate,
		scheduledTime: inProgressSchedule.scheduledTime,
		durationMinutes: 45,
		status: "in-progress",
		videoLink: "https://zoom.us/j/910000002",
		meetingId: "QH-TM-MAIN-002",
		meetingPassword: "telemed2",
		notes: "Active virtual follow-up with partial SOAP documentation.",
		createdByStaffId: params.schedulerMainStaffId,
	})
	await ensureTelemedicineEncounter({
		appointmentId: mainInProgress.id,
		patientId: params.mainPatientIds.inProgress,
		clinicianStaffId: params.doctorStaffId,
		chiefComplaint: "Persistent cough and low-grade fever",
		subjectiveNotes:
			"Patient reports five days of productive cough, intermittent fever, and mild fatigue. No chest pain or dyspnea at rest.",
		objectiveNotes:
			"Video assessment: speaking in full sentences, no visible respiratory distress. Home temperature 37.8 C.",
		assessmentNotes:
			"Likely acute upper respiratory infection. Pneumonia risk remains low but requires monitoring.",
		planNotes:
			"Complete respiratory review, counsel on warning signs, and decide if chest imaging is needed.",
		diagnosis: "Acute upper respiratory infection",
		icdCode: "J06.9",
		vitalSigns: {
			bloodPressure: "124/78",
			heartRate: "88",
			temperature: "37.8",
			oxygenSaturation: "97",
			weight: "68",
		},
		status: "open",
	})

	const mainConfirmed = await ensureTelemedicineAppointment({
		facilityId: params.mainFacilityId,
		patientId: params.mainPatientIds.confirmed,
		clinicianStaffId: params.doctorStaffId,
		scheduledDate: toSeedDate(3),
		scheduledTime: "14:00:00",
		durationMinutes: 30,
		status: "confirmed",
		videoLink: "https://zoom.us/j/910000003",
		meetingId: "QH-TM-MAIN-003",
		meetingPassword: "telemed3",
		notes: "Confirmed diabetes follow-up and home glucose review.",
		createdByStaffId: params.schedulerMainStaffId,
	})

	const mainCompleted = await ensureTelemedicineAppointment({
		facilityId: params.mainFacilityId,
		patientId: params.mainPatientIds.completed,
		clinicianStaffId: params.doctorStaffId,
		scheduledDate: toSeedDate(-4),
		scheduledTime: "15:30:00",
		durationMinutes: 30,
		status: "completed",
		videoLink: "https://zoom.us/j/910000004",
		meetingId: "QH-TM-MAIN-004",
		meetingPassword: "telemed4",
		notes: "Completed virtual consult with finalized SOAP note.",
		createdByStaffId: params.schedulerMainStaffId,
	})
	await ensureTelemedicineEncounter({
		appointmentId: mainCompleted.id,
		patientId: params.mainPatientIds.completed,
		clinicianStaffId: params.doctorStaffId,
		chiefComplaint: "Blood pressure follow-up",
		subjectiveNotes:
			"Patient reports improved adherence to losartan, no dizziness, chest pain, or shortness of breath.",
		objectiveNotes:
			"Home blood pressure log averages 128/82 mmHg. Patient appears well on video consultation.",
		assessmentNotes: "Essential hypertension, controlled on current regimen.",
		planNotes:
			"Continue current medications, reinforce low-sodium diet, and repeat follow-up in four weeks.",
		diagnosis: "Essential hypertension",
		icdCode: "I10",
		vitalSigns: {
			bloodPressure: "128/82",
			heartRate: "76",
			temperature: "36.7",
			oxygenSaturation: "98",
			weight: "72",
		},
		status: "finalized",
		signedAt: completedSignedAt,
	})

	await ensureTelemedicineAppointment({
		facilityId: params.northFacilityId,
		patientId: params.northPatientIds.scheduled,
		clinicianStaffId: params.familyMedicineNorthStaffId,
		scheduledDate: toSeedDate(2),
		scheduledTime: "08:30:00",
		durationMinutes: 30,
		status: "scheduled",
		videoLink: "https://zoom.us/j/920000001",
		meetingId: "QH-TM-NORTH-001",
		meetingPassword: "north1",
		notes: "Family medicine virtual consult for headache and sleep hygiene review.",
		createdByStaffId: params.schedulerNorthStaffId,
	})

	await ensureTelemedicineAppointment({
		facilityId: params.northFacilityId,
		patientId: params.northPatientIds.confirmed,
		clinicianStaffId: params.familyMedicineNorthStaffId,
		scheduledDate: toSeedDate(5),
		scheduledTime: "11:00:00",
		durationMinutes: 30,
		status: "confirmed",
		videoLink: "https://zoom.us/j/920000002",
		meetingId: "QH-TM-NORTH-002",
		meetingPassword: "north2",
		notes: "Confirmed family medicine follow-up for allergic rhinitis.",
		createdByStaffId: params.schedulerNorthStaffId,
	})

	console.log("  - Seeded telemedicine appointments for physician workflows")
	console.log(
		`    - Main facility examples: ${mainScheduled.meetingId}, ${mainConfirmed.meetingId}`
	)
}

async function ensureReferenceData(facilityId: string) {
	let [generic] = await db
		.select()
		.from(drugGenerics)
		.where(
			sql`lower(regexp_replace(trim(${drugGenerics.genericName}), '\s+', ' ', 'g')) = ${"paracetamol"}`
		)
	if (!generic) {
		;[generic] = await db
			.insert(drugGenerics)
			.values({ genericName: "Paracetamol", rxnormCode: "161", atcCode: "N02BE01" })
			.returning()
	}

	let [brand] = await db
		.select()
		.from(drugBrands)
		.where(and(eq(drugBrands.drugGenericId, generic!.id), eq(drugBrands.brandName, "Biogesic")))
	if (!brand) {
		;[brand] = await db
			.insert(drugBrands)
			.values({ drugGenericId: generic!.id, brandName: "Biogesic", manufacturer: "Unilab" })
			.returning()
	}

	let [formulary] = await db
		.select()
		.from(formularyItems)
		.where(
			and(
				eq(formularyItems.facilityId, facilityId),
				eq(formularyItems.drugGenericId, generic!.id),
				eq(formularyItems.strength, "500 mg")
			)
		)
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

	const highAlertFormularySeeds = [
		{
			genericName: "Regular Insulin",
			rxnormCode: "253182",
			atcCode: "A10AB01",
			doseForm: "vial",
			strength: "100 units/mL",
			route: "subcutaneous",
			highAlertNotes:
				"High-alert medication: independent double-check required before ordering or administration.",
		},
		{
			genericName: "Heparin Sodium",
			rxnormCode: "5224",
			atcCode: "B01AB01",
			doseForm: "vial",
			strength: "5000 units/mL",
			route: "intravenous",
			highAlertNotes:
				"High-alert anticoagulant: verify indication, dose, concentration, and patient identifiers.",
		},
		{
			genericName: "Potassium Chloride",
			rxnormCode: "8591",
			atcCode: "A12BA01",
			doseForm: "vial",
			strength: "2 mEq/mL concentrate",
			route: "intravenous",
			highAlertNotes:
				"High-alert concentrated electrolyte: dilution and independent double-check required.",
		},
	]

	for (const seed of highAlertFormularySeeds) {
		const normalizedGenericName = seed.genericName.trim().replace(/\s+/g, " ").toLowerCase()
		let [highAlertGeneric] = await db
			.select()
			.from(drugGenerics)
			.where(
				sql`lower(regexp_replace(trim(${drugGenerics.genericName}), '\s+', ' ', 'g')) = ${normalizedGenericName}`
			)
		if (!highAlertGeneric) {
			;[highAlertGeneric] = await db
				.insert(drugGenerics)
				.values({
					genericName: seed.genericName.trim().replace(/\s+/g, " "),
					rxnormCode: seed.rxnormCode,
					atcCode: seed.atcCode,
				})
				.returning()
		}

		const [highAlertItem] = await db
			.select()
			.from(formularyItems)
			.where(
				and(
					eq(formularyItems.facilityId, facilityId),
					eq(formularyItems.drugGenericId, highAlertGeneric!.id),
					eq(formularyItems.strength, seed.strength),
					eq(formularyItems.route, seed.route)
				)
			)

		if (!highAlertItem) {
			await db.insert(formularyItems).values({
				facilityId,
				drugGenericId: highAlertGeneric!.id,
				doseForm: seed.doseForm,
				strength: seed.strength,
				route: seed.route,
				isActive: true,
				isHighAlert: true,
				highAlertNotes: seed.highAlertNotes,
				formularyNotes: "Baseline high-alert seed for CPOE double-verification testing.",
			})
		} else if (!highAlertItem.isHighAlert) {
			await db
				.update(formularyItems)
				.set({
					isHighAlert: true,
					highAlertNotes: highAlertItem.highAlertNotes ?? seed.highAlertNotes,
					updatedAt: new Date(),
				})
				.where(eq(formularyItems.id, highAlertItem.id))
		}
	}

	let [chargeItem] = await db
		.select()
		.from(chargeMasterItems)
		.where(
			and(
				eq(chargeMasterItems.facilityId, facilityId),
				eq(chargeMasterItems.itemCode, "ER-CONSULT")
			)
		)
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
		.where(
			and(
				eq(noteTemplates.facilityId, params.facilityId),
				eq(noteTemplates.name, "General Progress Note")
			)
		)
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
		.where(
			and(
				eq(noteTemplates.facilityId, params.facilityId),
				eq(noteTemplates.name, "Outpatient Consultation (SOAP)")
			)
		)
	if (!consultTemplate) {
		await db.insert(noteTemplates).values({
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
		.where(
			and(eq(clinicalNotes.encounterId, params.encounterId), eq(clinicalNotes.noteType, "progress"))
		)
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
		.where(
			and(
				eq(problems.patientId, params.patientId),
				eq(problems.description, "Community acquired pneumonia")
			)
		)
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
	const [vitalsForEncounter] = await db
		.select()
		.from(vitalSigns)
		.where(eq(vitalSigns.encounterId, params.encounterId))
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

	const [vitalsForPreEncounter] = await db
		.select()
		.from(vitalSigns)
		.where(eq(vitalSigns.preEncounterId, params.preEncounterId))
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
		.where(
			and(
				eq(medicationOrders.encounterId, params.encounterId),
				eq(medicationOrders.genericName, "Paracetamol")
			)
		)
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

	// OPD Dispensing seed — signed prescription tied to the Paracetamol order
	const [existingPrescription] = await db
		.select()
		.from(prescriptions)
		.where(eq(prescriptions.medicationOrderId, medOrder!.id))
	if (!existingPrescription) {
		await db.insert(prescriptions).values({
			facilityId: params.facilityId,
			encounterId: params.encounterId,
			medicationOrderId: medOrder!.id,
			patientId: params.patientId,
			prescriberStaffId: params.doctorStaffId,
			prcLicenseNumber: "PRC-100001",
			ptrNumber: "PTR-100001",
			prescriptionContent: {
				medications: [
					{
						genericName: "Paracetamol",
						brandName: "Biogesic",
						dose: "500 mg",
						doseUnit: "mg",
						doseForm: "tablet",
						route: "oral",
						frequency: "q6h",
						durationDays: 3,
						quantity: 12,
					},
				],
			},
			status: "signed",
			signedAt: new Date(),
		})
	}

	// Pending-verification order — feeds the Pharmacy Verification Queue (Story 10.1)
	const [pendingMedOrder] = await db
		.select()
		.from(medicationOrders)
		.where(
			and(
				eq(medicationOrders.encounterId, params.encounterId),
				eq(medicationOrders.genericName, "Amoxicillin"),
				eq(medicationOrders.status, "pending_verification")
			)
		)
	if (!pendingMedOrder) {
		await db.insert(medicationOrders).values({
			facilityId: params.facilityId,
			encounterId: params.encounterId,
			genericName: "Amoxicillin",
			brandName: "Amoxil",
			rxnormCode: "723",
			dose: "500",
			doseUnit: "mg",
			doseForm: "capsule",
			route: "oral",
			frequency: "q8h",
			durationDays: 7,
			status: "pending_verification",
			orderingStaffId: params.doctorStaffId,
		})
	}

	const [lab] = await db
		.select()
		.from(labOrders)
		.where(
			and(
				eq(labOrders.encounterId, params.encounterId),
				eq(labOrders.testName, "Complete Blood Count")
			)
		)
	if (!lab) {
		await db.insert(labOrders).values({
			facilityId: params.facilityId,
			encounterId: params.encounterId,
			loincCode: "6690-2",
			testName: "Complete Blood Count",
			clinicalIndication: "Fever and productive cough",
			indicationIcd10Code: "J18.9",
			indicationIcd10Display: "Pneumonia, unspecified organism",
			priority: "routine",
			status: "ordered",
			specimenType: "Blood",
			orderingStaffId: params.doctorStaffId,
		})
	}

	const [imaging] = await db
		.select()
		.from(imagingOrders)
		.where(
			and(eq(imagingOrders.encounterId, params.encounterId), eq(imagingOrders.bodyPart, "Chest"))
		)
	if (!imaging) {
		await db.insert(imagingOrders).values({
			facilityId: params.facilityId,
			encounterId: params.encounterId,
			modality: "xray",
			bodyPart: "Chest",
			clinicalIndication: "Persistent cough and fever",
			indicationIcd10Code: "J18.9",
			indicationIcd10Display: "Pneumonia, unspecified organism",
			priority: "routine",
			status: "ordered",
			orderingStaffId: params.doctorStaffId,
		})
	}

	const [mar] = await db
		.select()
		.from(marEntries)
		.where(
			and(
				eq(marEntries.encounterId, params.encounterId),
				eq(marEntries.medicationOrderId, medOrder!.id)
			)
		)
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

	const [tar] = await db
		.select()
		.from(tarEntries)
		.where(
			and(
				eq(tarEntries.encounterId, params.encounterId),
				eq(tarEntries.treatmentDescription, "Nebulization treatment")
			)
		)
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

	const [io] = await db
		.select()
		.from(ioEntries)
		.where(
			and(eq(ioEntries.encounterId, params.encounterId), eq(ioEntries.description, "Oral fluids"))
		)
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

	let [charge] = await db
		.select()
		.from(charges)
		.where(
			and(
				eq(charges.encounterId, params.encounterId),
				eq(charges.description, "Emergency Room Consultation")
			)
		)
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

	let [invoice] = await db
		.select()
		.from(invoices)
		.where(
			and(eq(invoices.encounterId, params.encounterId), eq(invoices.invoiceNumber, "INV-0001"))
		)
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

	const [lineItem] = await db
		.select()
		.from(invoiceLineItems)
		.where(eq(invoiceLineItems.invoiceId, invoice!.id))
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

	const [pidsr] = await db
		.select()
		.from(pidsrCases)
		.where(and(eq(pidsrCases.patientId, params.patientId), eq(pidsrCases.diseaseCode, "A90")))
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

	const [noteForFlag] = await db
		.select()
		.from(clinicalNotes)
		.where(eq(clinicalNotes.encounterId, params.encounterId))
	const [flag] = await db
		.select()
		.from(surveillanceFlags)
		.where(
			and(
				eq(surveillanceFlags.encounterId, params.encounterId),
				eq(surveillanceFlags.flagType, "dengue_watch")
			)
		)
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

	const [snapshot] = await db
		.select()
		.from(ahsrSnapshots)
		.where(
			and(
				eq(ahsrSnapshots.facilityId, params.facilityId),
				eq(ahsrSnapshots.reportYear, 2026),
				eq(ahsrSnapshots.reportMonth, 4)
			)
		)
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
		const [existing] = await db.select().from(featureFlags).where(eq(featureFlags.key, def.key))
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

// ============================================================================
// NURSING SCENARIOS — Rich seed data for testing all nurse-role features
// ============================================================================

async function ensureNursingScenarios(params: {
	facilityId: string
	erEncounterId: string
	inpatientEncounterId: string
	erPatientId: string
	inpatientPatientId: string
	nurseStaffId: string
	doctorStaffId: string
	paracetamolFormulaId: string
}) {
	const {
		facilityId,
		erEncounterId,
		inpatientEncounterId,
		erPatientId,
		inpatientPatientId,
		nurseStaffId,
		doctorStaffId,
		paracetamolFormulaId,
	} = params
	const now = new Date()
	const h = (hours: number) => new Date(now.getTime() + hours * 3_600_000)

	// ── Amlodipine drug → formulary (for inpatient hypertension order) ────────
	let [amlodipineGeneric] = await db
		.select()
		.from(drugGenerics)
		.where(
			sql`lower(regexp_replace(trim(${drugGenerics.genericName}), '\s+', ' ', 'g')) = ${"amlodipine"}`
		)
	if (!amlodipineGeneric) {
		;[amlodipineGeneric] = await db
			.insert(drugGenerics)
			.values({ genericName: "Amlodipine", rxnormCode: "17767", atcCode: "C08CA01" })
			.returning()
	}

	let [amlodipineBrand] = await db
		.select()
		.from(drugBrands)
		.where(
			and(eq(drugBrands.drugGenericId, amlodipineGeneric!.id), eq(drugBrands.brandName, "Norvasc"))
		)
	if (!amlodipineBrand) {
		;[amlodipineBrand] = await db
			.insert(drugBrands)
			.values({
				drugGenericId: amlodipineGeneric!.id,
				brandName: "Norvasc",
				manufacturer: "Pfizer",
			})
			.returning()
	}

	// Add more drug generics if they don't exist
	const moreGenerics = [
		{ genericName: "Amoxicillin", rxnormCode: "723", atcCode: "J01CA04" },
		{ genericName: "Metformin", rxnormCode: "6809", atcCode: "A10BA02" },
		{ genericName: "Atorvastatin", rxnormCode: "83367", atcCode: "C10AA05" },
		{ genericName: "Losartan", rxnormCode: "52242", atcCode: "C09CA01" },
		{ genericName: "Salbutamol", rxnormCode: "435", atcCode: "R03AC02" },
		{ genericName: "Omeprazole", rxnormCode: "7646", atcCode: "A02BC01" },
		{ genericName: "Metoprolol", rxnormCode: "6918", atcCode: "C07AB02" },
		{ genericName: "Azithromycin", rxnormCode: "18631", atcCode: "J01FA10" },
	]

	for (const g of moreGenerics) {
		const normalizedGenericName = g.genericName.trim().replace(/\s+/g, " ").toLowerCase()
		const [exists] = await db
			.select()
			.from(drugGenerics)
			.where(
				sql`lower(regexp_replace(trim(${drugGenerics.genericName}), '\s+', ' ', 'g')) = ${normalizedGenericName}`
			)
		if (!exists) {
			await db.insert(drugGenerics).values({
				...g,
				genericName: g.genericName.trim().replace(/\s+/g, " "),
			})
		}
	}

	let [amlodipineFormulary] = await db
		.select()
		.from(formularyItems)
		.where(
			and(
				eq(formularyItems.facilityId, facilityId),
				eq(formularyItems.drugGenericId, amlodipineGeneric!.id)
			)
		)
	if (!amlodipineFormulary) {
		;[amlodipineFormulary] = await db
			.insert(formularyItems)
			.values({
				facilityId,
				drugGenericId: amlodipineGeneric!.id,
				drugBrandId: amlodipineBrand!.id,
				doseForm: "tablet",
				strength: "5 mg",
				route: "oral",
				isActive: true,
			})
			.returning()
	}

	// ── Medication orders ─────────────────────────────────────────────────────
	// Paracetamol (ER encounter — already seeded in ensureNursingAndOrders, just retrieve it)
	let [paracetamolOrder] = await db
		.select()
		.from(medicationOrders)
		.where(
			and(
				eq(medicationOrders.encounterId, erEncounterId),
				eq(medicationOrders.genericName, "Paracetamol")
			)
		)
	if (!paracetamolOrder) {
		;[paracetamolOrder] = await db
			.insert(medicationOrders)
			.values({
				facilityId,
				encounterId: erEncounterId,
				formularyItemId: paracetamolFormulaId,
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
				orderingStaffId: doctorStaffId,
			})
			.returning()
	}

	// Amlodipine (inpatient encounter — hypertension)
	let [amlodipineOrder] = await db
		.select()
		.from(medicationOrders)
		.where(
			and(
				eq(medicationOrders.encounterId, inpatientEncounterId),
				eq(medicationOrders.genericName, "Amlodipine")
			)
		)
	if (!amlodipineOrder) {
		;[amlodipineOrder] = await db
			.insert(medicationOrders)
			.values({
				facilityId,
				encounterId: inpatientEncounterId,
				formularyItemId: amlodipineFormulary!.id,
				genericName: "Amlodipine",
				brandName: "Norvasc",
				rxnormCode: "17767",
				dose: "5",
				doseUnit: "mg",
				doseForm: "tablet",
				route: "oral",
				frequency: "OD",
				durationDays: 30,
				status: "active",
				orderingStaffId: doctorStaffId,
			})
			.returning()
	}

	// ── Vital signs — ER encounter (trend: 3 readings over last 16 hours) ─────
	// Entry at 16h ago
	const [vitals16h] = await db
		.select()
		.from(vitalSigns)
		.where(and(eq(vitalSigns.encounterId, erEncounterId), eq(vitalSigns.bpSystolic, 110)))
	if (!vitals16h) {
		await db.insert(vitalSigns).values({
			facilityId,
			encounterId: erEncounterId,
			temperature: "38.8",
			bpSystolic: 110,
			bpDiastolic: 70,
			heartRate: 102,
			respiratoryRate: 22,
			spo2: "94.0",
			painScore: 6,
			newsScore: 5,
			newsRiskLevel: "medium",
			recordedByStaffId: nurseStaffId,
			recordedAt: h(-16),
		})
	}

	// Entry at 8h ago
	const [vitals8h] = await db
		.select()
		.from(vitalSigns)
		.where(and(eq(vitalSigns.encounterId, erEncounterId), eq(vitalSigns.bpSystolic, 115)))
	if (!vitals8h) {
		await db.insert(vitalSigns).values({
			facilityId,
			encounterId: erEncounterId,
			temperature: "38.3",
			bpSystolic: 115,
			bpDiastolic: 75,
			heartRate: 96,
			respiratoryRate: 20,
			spo2: "96.0",
			painScore: 4,
			newsScore: 3,
			newsRiskLevel: "low",
			recordedByStaffId: nurseStaffId,
			recordedAt: h(-8),
		})
	}

	// ── Vital signs — Inpatient encounter (hypertension patient) ─────────────
	const [ipVitals1] = await db
		.select()
		.from(vitalSigns)
		.where(and(eq(vitalSigns.encounterId, inpatientEncounterId), eq(vitalSigns.bpSystolic, 162)))
	if (!ipVitals1) {
		await db.insert(vitalSigns).values({
			facilityId,
			encounterId: inpatientEncounterId,
			temperature: "36.7",
			bpSystolic: 162,
			bpDiastolic: 98,
			heartRate: 78,
			respiratoryRate: 16,
			spo2: "99.0",
			painScore: 2,
			newsScore: 2,
			newsRiskLevel: "low",
			recordedByStaffId: nurseStaffId,
			recordedAt: h(-12),
		})
	}

	const [ipVitals2] = await db
		.select()
		.from(vitalSigns)
		.where(and(eq(vitalSigns.encounterId, inpatientEncounterId), eq(vitalSigns.bpSystolic, 148)))
	if (!ipVitals2) {
		await db.insert(vitalSigns).values({
			facilityId,
			encounterId: inpatientEncounterId,
			temperature: "36.5",
			bpSystolic: 148,
			bpDiastolic: 92,
			heartRate: 74,
			respiratoryRate: 16,
			spo2: "99.0",
			painScore: 1,
			newsScore: 1,
			newsRiskLevel: "low",
			recordedByStaffId: nurseStaffId,
			recordedAt: h(-4),
		})
	}

	// ── Flowsheet entries ─────────────────────────────────────────────────────
	const [gcsEntry] = await db
		.select()
		.from(flowsheetEntries)
		.where(
			and(
				eq(flowsheetEntries.encounterId, inpatientEncounterId),
				eq(flowsheetEntries.parameterName, "GCS")
			)
		)
	if (!gcsEntry) {
		await db.insert(flowsheetEntries).values([
			{
				facilityId,
				encounterId: inpatientEncounterId,
				parameterName: "GCS",
				parameterValue: "15",
				unit: "points",
				recordedByStaffId: nurseStaffId,
				recordedAt: h(-12),
			},
			{
				facilityId,
				encounterId: inpatientEncounterId,
				parameterName: "GCS",
				parameterValue: "15",
				unit: "points",
				recordedByStaffId: nurseStaffId,
				recordedAt: h(-4),
			},
			{
				facilityId,
				encounterId: erEncounterId,
				parameterName: "GCS",
				parameterValue: "14",
				unit: "points",
				recordedByStaffId: nurseStaffId,
				recordedAt: h(-16),
			},
			{
				facilityId,
				encounterId: erEncounterId,
				parameterName: "Pain Scale",
				parameterValue: "6",
				unit: "/10",
				recordedByStaffId: nurseStaffId,
				recordedAt: h(-8),
			},
		])
	}

	// ── MAR entries — ER encounter (Paracetamol q6h — multiple statuses) ─────
	const [marDue] = await db
		.select()
		.from(marEntries)
		.where(and(eq(marEntries.encounterId, erEncounterId), eq(marEntries.status, "due")))
	if (!marDue) {
		await db.insert(marEntries).values({
			facilityId,
			encounterId: erEncounterId,
			medicationOrderId: paracetamolOrder!.id,
			scheduledTime: h(2),
			status: "due",
		})
	}

	const [marMissed] = await db
		.select()
		.from(marEntries)
		.where(and(eq(marEntries.encounterId, erEncounterId), eq(marEntries.status, "missed")))
	if (!marMissed) {
		await db.insert(marEntries).values({
			facilityId,
			encounterId: erEncounterId,
			medicationOrderId: paracetamolOrder!.id,
			scheduledTime: h(-12),
			status: "missed",
			notes: "Patient was away for imaging procedure",
		})
	}

	const [marHeld] = await db
		.select()
		.from(marEntries)
		.where(and(eq(marEntries.encounterId, erEncounterId), eq(marEntries.status, "held")))
	if (!marHeld) {
		await db.insert(marEntries).values({
			facilityId,
			encounterId: erEncounterId,
			medicationOrderId: paracetamolOrder!.id,
			scheduledTime: h(-18),
			status: "held",
			notes: "Held per physician order — NPO for procedure",
		})
	}

	// ── MAR entries — Inpatient encounter (Amlodipine OD) ────────────────────
	const [ipMarGiven] = await db
		.select()
		.from(marEntries)
		.where(and(eq(marEntries.encounterId, inpatientEncounterId), eq(marEntries.status, "given")))
	if (!ipMarGiven) {
		await db.insert(marEntries).values([
			{
				facilityId,
				encounterId: inpatientEncounterId,
				medicationOrderId: amlodipineOrder!.id,
				scheduledTime: h(-24),
				status: "given",
				administeredDose: "5 mg",
				administeredRoute: "oral",
				administeredByStaffId: nurseStaffId,
				administeredAt: h(-23),
				notes: "Given after breakfast",
			},
			{
				facilityId,
				encounterId: inpatientEncounterId,
				medicationOrderId: amlodipineOrder!.id,
				scheduledTime: h(0),
				status: "due",
			},
		])
	}

	// ── Additional TAR entries ────────────────────────────────────────────────
	const [tarWoundDressing] = await db
		.select()
		.from(tarEntries)
		.where(
			and(
				eq(tarEntries.encounterId, inpatientEncounterId),
				eq(tarEntries.treatmentDescription, "Wound dressing change")
			)
		)
	if (!tarWoundDressing) {
		await db.insert(tarEntries).values([
			{
				facilityId,
				encounterId: inpatientEncounterId,
				treatmentDescription: "Wound dressing change",
				scheduledTime: h(-8),
				status: "given",
				administeredByStaffId: nurseStaffId,
				administeredAt: h(-7),
				notes: "Clean wound, no signs of infection",
			},
			{
				facilityId,
				encounterId: inpatientEncounterId,
				treatmentDescription: "Wound dressing change",
				scheduledTime: h(8),
				status: "due",
			},
			{
				facilityId,
				encounterId: erEncounterId,
				treatmentDescription: "Steam inhalation",
				scheduledTime: h(1),
				status: "due",
			},
		])
	}

	// ── I/O entries — IVF intake + urine output ───────────────────────────────
	const [ivfEntry] = await db
		.select()
		.from(ioEntries)
		.where(
			and(eq(ioEntries.encounterId, erEncounterId), eq(ioEntries.description, "IVF - PNSS 1L"))
		)
	if (!ivfEntry) {
		await db.insert(ioEntries).values([
			{
				facilityId,
				encounterId: erEncounterId,
				ioType: "intake",
				route: "intravenous",
				description: "IVF - PNSS 1L",
				amountMl: "1000.0",
				recordedByStaffId: nurseStaffId,
				recordedAt: h(-10),
			},
			{
				facilityId,
				encounterId: erEncounterId,
				ioType: "output",
				route: "urinary catheter",
				description: "Urine via Foley catheter",
				amountMl: "350.0",
				recordedByStaffId: nurseStaffId,
				recordedAt: h(-6),
			},
			{
				facilityId,
				encounterId: erEncounterId,
				ioType: "output",
				route: "urinary catheter",
				description: "Urine via Foley catheter",
				amountMl: "280.0",
				recordedByStaffId: nurseStaffId,
				recordedAt: h(-2),
			},
			{
				facilityId,
				encounterId: inpatientEncounterId,
				ioType: "intake",
				route: "oral",
				description: "Water intake",
				amountMl: "400.0",
				recordedByStaffId: nurseStaffId,
				recordedAt: h(-8),
			},
			{
				facilityId,
				encounterId: inpatientEncounterId,
				ioType: "output",
				route: "urine",
				description: "Voided urine",
				amountMl: "320.0",
				recordedByStaffId: nurseStaffId,
				recordedAt: h(-6),
			},
		])
	}

	// ── Shift handoffs ────────────────────────────────────────────────────────
	// Signed handoff from night shift (ER encounter)
	const [signedHandoff] = await db
		.select()
		.from(shiftHandoffs)
		.where(and(eq(shiftHandoffs.encounterId, erEncounterId), eq(shiftHandoffs.status, "signed")))
	if (!signedHandoff) {
		await db.insert(shiftHandoffs).values({
			facilityId,
			encounterId: erEncounterId,
			outgoingStaffId: nurseStaffId,
			incomingStaffId: nurseStaffId,
			handoffNotes: `SITUATION: Maria Santos, 33F, admitted via ER with fever and productive cough. Dx: Community acquired pneumonia.\n\nBACKGROUND: Allergic to Penicillin. On Paracetamol 500mg q6h. IVF PNSS 1L running at 30 gtts/min. CBC and CXR pending.\n\nASSESSMENT: Patient is awake, febrile at 38.3°C, SpO2 96%. NEWS score 3 (Low risk). Productive cough, no hemoptysis.\n\nRECOMMENDATION: Monitor vitals q4h. Ensure next Paracetamol dose at 0600H. Follow up pending lab results with attending physician. Maintain fluid intake/output monitoring.`,
			status: "signed",
			signedAt: h(-8),
			createdAt: h(-8),
		})
	}

	// Draft handoff for current shift (Inpatient encounter)
	const [draftHandoff] = await db
		.select()
		.from(shiftHandoffs)
		.where(
			and(eq(shiftHandoffs.encounterId, inpatientEncounterId), eq(shiftHandoffs.status, "draft"))
		)
	if (!draftHandoff) {
		await db.insert(shiftHandoffs).values({
			facilityId,
			encounterId: inpatientEncounterId,
			outgoingStaffId: nurseStaffId,
			handoffNotes: `SITUATION: Juan Dela Cruz, 41M, admitted for uncontrolled hypertension. Current BP 148/92.\n\nBACKGROUND: On Amlodipine 5mg OD. No known allergies.\n\nASSESSMENT: BP improving. Patient ambulatory, tolerating oral medications well.\n\nRECOMMENDATION: Continue BP monitoring q4h. Amlodipine due at next AM shift.`,
			status: "draft",
			createdAt: h(-1),
		})
	}

	// ── HAI tags ──────────────────────────────────────────────────────────────
	// Suspected CAUTI on ER encounter (Foley catheter in situ)
	const [cautiTag] = await db
		.select()
		.from(haiTags)
		.where(and(eq(haiTags.encounterId, erEncounterId), eq(haiTags.haiType, "cauti")))
	if (!cautiTag) {
		await db.insert(haiTags).values({
			facilityId,
			encounterId: erEncounterId,
			haiType: "cauti",
			onsetDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
				.toISOString()
				.split("T")[0]!,
			status: "suspected",
			notes: "Foley catheter inserted 48h ago. Patient reports dysuria. Urine culture sent.",
			documentedByStaffId: nurseStaffId,
		})
	}

	// Confirmed CLABSI on inpatient encounter
	const [clabiTag] = await db
		.select()
		.from(haiTags)
		.where(and(eq(haiTags.encounterId, inpatientEncounterId), eq(haiTags.haiType, "clabsi")))
	if (!clabiTag) {
		await db.insert(haiTags).values({
			facilityId,
			encounterId: inpatientEncounterId,
			haiType: "clabsi",
			onsetDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2)
				.toISOString()
				.split("T")[0]!,
			status: "confirmed",
			confirmedAt: h(-6),
			notes:
				"Blood cultures positive for Staphylococcus epidermidis. Central line removed. IV antibiotics started.",
			documentedByStaffId: nurseStaffId,
		})
	}

	// ── Consent records ───────────────────────────────────────────────────────
	// General consent — ER encounter
	const [generalConsent] = await db
		.select()
		.from(consentRecords)
		.where(
			and(eq(consentRecords.encounterId, erEncounterId), eq(consentRecords.consentType, "general"))
		)
	if (!generalConsent) {
		await db.insert(consentRecords).values({
			facilityId,
			encounterId: erEncounterId,
			patientId: erPatientId,
			consentType: "general",
			signedByName: "Maria Santos",
			relationship: "self",
			consentText:
				"I, the undersigned, hereby give my consent for the medical/surgical treatment, tests, and procedures deemed necessary by the attending physician and medical staff of QHealth Community Hospital during this admission.",
			patientSignature: "Maria Santos",
			witnessSignature: "Nurse Ana Reyes",
			capturedByStaffId: nurseStaffId,
			signedAt: h(-20),
		})
	}

	// DPA consent — ER encounter
	const [dpaConsent] = await db
		.select()
		.from(consentRecords)
		.where(
			and(eq(consentRecords.encounterId, erEncounterId), eq(consentRecords.consentType, "dpa"))
		)
	if (!dpaConsent) {
		await db.insert(consentRecords).values({
			facilityId,
			encounterId: erEncounterId,
			patientId: erPatientId,
			consentType: "dpa",
			signedByName: "Maria Santos",
			relationship: "self",
			consentText:
				"In accordance with the Data Privacy Act of 2012 (RA 10173), I consent to the collection, processing, and sharing of my personal health information with authorized personnel for purposes of medical care, billing, and statutory reporting.",
			patientSignature: "Maria Santos",
			witnessSignature: "Nurse Ana Reyes",
			capturedByStaffId: nurseStaffId,
			signedAt: h(-20),
		})
	}

	// General consent — Inpatient encounter
	const [ipGeneralConsent] = await db
		.select()
		.from(consentRecords)
		.where(
			and(
				eq(consentRecords.encounterId, inpatientEncounterId),
				eq(consentRecords.consentType, "general")
			)
		)
	if (!ipGeneralConsent) {
		await db.insert(consentRecords).values({
			facilityId,
			encounterId: inpatientEncounterId,
			patientId: inpatientPatientId,
			consentType: "general",
			signedByName: "Juan Dela Cruz",
			relationship: "self",
			consentText:
				"I, the undersigned, hereby give my consent for the medical/surgical treatment, tests, and procedures deemed necessary by the attending physician and medical staff of QHealth Community Hospital during this admission.",
			patientSignature: "Juan Dela Cruz",
			witnessSignature: "Nurse Ana Reyes",
			capturedByStaffId: nurseStaffId,
			signedAt: h(-14),
		})
	}

	console.log("  ✓ Nursing scenario seed complete")
	console.log("    - Vitals: trend data for ER & inpatient encounters")
	console.log("    - MAR: given / due / missed / held entries across both encounters")
	console.log("    - TAR: wound dressing, nebulization entries")
	console.log("    - I/O: IVF intake, urine output across both encounters")
	console.log("    - Flowsheet: GCS and pain scale entries")
	console.log("    - Handoffs: 1 signed (ER) + 1 draft (inpatient)")
	console.log("    - HAI tags: CAUTI suspected (ER) + CLABSI confirmed (inpatient)")
	console.log("    - Consents: general + DPA (ER), general (inpatient)")
}

async function main() {
	console.log("Seeding qhealth-emr development data...")
	await assertSeedSchemaReady()
	await ensureProblemsTerminologyColumns()
	await ensureTelemedicineLiveKitColumns()
	await seedProblemTerminology()

	const facilityMap = new Map<string, Awaited<ReturnType<typeof ensureFacility>>>()
	for (const facilitySeed of demoFacilities) {
		const facility = await ensureFacility(facilitySeed)
		await ensureFacilityProfile(facility.id, facilitySeed)
		facilityMap.set(facilitySeed.key, facility)
	}

	const mainFacility = facilityMap.get("main")!
	const northFacility = facilityMap.get("north-clinic")!

	const roleMap = new Map<string, string>()
	for (const facilitySeed of demoFacilities) {
		const facility = facilityMap.get(facilitySeed.key)!
		for (const roleName of new Set(demoUsers.map(user => user.roleName))) {
			const role = await ensureRole(facility.id, roleName)
			await ensureRolePermissions(role.id, roleName)
			roleMap.set(`${facilitySeed.key}:${roleName}`, role.id)
		}
	}

	const authUsers = new Map<string, string>()
	for (const user of demoUsers) {
		const dbUser = await ensureAuthUser(user)
		authUsers.set(user.email, dbUser.id)
		await sleep(300)
	}

	const staffMap = new Map<string, string>()
	const staffFacilityMap = new Map<string, string>()
	for (const user of demoUsers) {
		const assignedFacilityKeys = staffFacilityAssignments[user.email] ?? ["main"]

		for (const facilityKey of assignedFacilityKeys) {
			const facility = facilityMap.get(facilityKey)!
			const staff = await ensureStaffProfile(authUsers.get(user.email)!, facility.id, user)
			await ensureUserRole(staff.id, roleMap.get(`${facilityKey}:${user.roleName}`)!)
			staffFacilityMap.set(`${facilityKey}:${user.email}`, staff.id)

			if (facilityKey === "main") {
				staffMap.set(user.email, staff.id)
			}
		}
	}

	const erWard = await ensureWard(mainFacility.id, "Emergency Room", "er", 2)
	const medWard = await ensureWard(mainFacility.id, "Medical Ward", "general", 4)
	await ensureWard(mainFacility.id, "Intensive Care Unit", "icu", 2)
	const nurseryWard = await ensureWard(mainFacility.id, "Nursery", "nursery", 4)

	const erBed1 = await ensureBed(mainFacility.id, erWard.id, "ER-01")
	await ensureBed(mainFacility.id, erWard.id, "ER-02")
	const medBed1 = await ensureBed(mainFacility.id, medWard.id, "MED-101")
	const nurseryBed1 = await ensureBed(mainFacility.id, nurseryWard.id, "NUR-01")

	const patient1 = await ensurePatient(
		mainFacility.id,
		"QH-000001",
		"Juan",
		"Dela Cruz",
		"1985-01-15",
		"male"
	)
	const patient2 = await ensurePatient(
		mainFacility.id,
		"QH-000002",
		"Maria",
		"Santos",
		"1992-07-03",
		"female"
	)
	const patient3 = await ensurePatient(
		mainFacility.id,
		"QH-000003",
		"Pedro",
		"Reyes",
		"1978-11-21",
		"male"
	)
	const patient4 = await ensurePatient(
		mainFacility.id,
		"QH-000004",
		"Lourdes",
		"Garcia",
		"1969-04-09",
		"female"
	)
	const northPatient1 = await ensurePatient(
		northFacility.id,
		"QHN-000001",
		"Elena",
		"Flores",
		"1988-03-17",
		"female"
	)
	const northPatient2 = await ensurePatient(
		northFacility.id,
		"QHN-000002",
		"Roberto",
		"Lim",
		"1975-09-12",
		"male"
	)

	await ensureTelemedicineAppointments({
		mainFacilityId: mainFacility.id,
		northFacilityId: northFacility.id,
		doctorStaffId: staffMap.get("doctor@qhealth.local")!,
		familyMedicineNorthStaffId: staffFacilityMap.get("north-clinic:familymed@qhealth.local")!,
		schedulerMainStaffId: staffMap.get("scheduler@qhealth.local")!,
		schedulerNorthStaffId: staffFacilityMap.get("north-clinic:scheduler@qhealth.local")!,
		mainPatientIds: {
			scheduled: patient1.id,
			inProgress: patient2.id,
			confirmed: patient3.id,
			completed: patient4.id,
		},
		northPatientIds: {
			scheduled: northPatient1.id,
			confirmed: northPatient2.id,
		},
	})

	// Newborn patient — DOB set to ~36 hours ago so the NBS tab (< 30 days rule) is always visible.
	// Re-run the seed if this patient's age exceeds 28 days.
	const newbornDOB = new Date(Date.now() - 36 * 3_600_000).toISOString().slice(0, 10)
	const newbornPatient = await ensureNewbornPatient(
		mainFacility.id,
		"QH-NBN-001",
		"Baby",
		"Santos",
		newbornDOB,
		"female"
	)
	const newbornReferralDOB = new Date(Date.now() - 30 * 3_600_000).toISOString().slice(0, 10)
	const newbornReferralPatient = await ensureNewbornPatient(
		mainFacility.id,
		"QH-NBN-002",
		"Baby Boy",
		"Reyes",
		newbornReferralDOB,
		"male"
	)
	const nurseryEncounter = await ensureEncounter(
		mainFacility.id,
		newbornPatient.id,
		staffMap.get("nurse@qhealth.local")!,
		nurseryBed1.id,
		"inpatient",
		"Newborn admission for routine care and newborn screening"
	)
	const nurseryReferralBed = await ensureBed(mainFacility.id, nurseryWard.id, "NUR-02")
	const nurseryReferralEncounter = await ensureEncounter(
		mainFacility.id,
		newbornReferralPatient.id,
		staffMap.get("nurse@qhealth.local")!,
		nurseryReferralBed.id,
		"inpatient",
		"Newborn admission for referral tracking test"
	)
	await db
		.update(beds)
		.set({ status: "occupied", currentEncounterId: nurseryEncounter.id, updatedAt: new Date() })
		.where(eq(beds.id, nurseryBed1.id))
	await db
		.update(beds)
		.set({
			status: "occupied",
			currentEncounterId: nurseryReferralEncounter.id,
			updatedAt: new Date(),
		})
		.where(eq(beds.id, nurseryReferralBed.id))

	// Seed one demo NBS logbook row so /nbs has visible data out-of-the-box.
	const [existingNbsRow] = await db
		.select()
		.from(nbsLogEntries)
		.where(
			and(
				eq(nbsLogEntries.facilityId, mainFacility.id),
				eq(nbsLogEntries.encounterId, nurseryEncounter.id)
			)
		)
	if (!existingNbsRow) {
		const birthAt = new Date(Date.now() - 36 * 3_600_000)
		const screenedAt = new Date(Date.now() - 30 * 3_600_000)
		await db.insert(nbsLogEntries).values({
			facilityId: mainFacility.id,
			encounterId: nurseryEncounter.id,
			patientId: newbornPatient.id,
			birthDatetime: birthAt,
			screeningDatetime: screenedAt,
			hoursElapsed: 6,
			screeningResult: {
				sampleId: "NBS-0001",
				testType: "heel_prick",
				conditions: [
					{ condition: "CH", result: "normal" },
					{ condition: "CAH", result: "normal" },
					{ condition: "G6PD", result: "normal" },
				],
				labName: "QHealth Lab",
			},
			consentStatus: "consented",
			status: "screened",
			screenedByStaffId: staffMap.get("nurse@qhealth.local")!,
		})
	}

	const [babySantosNbs] = await db
		.select()
		.from(nbsLogEntries)
		.where(
			and(
				eq(nbsLogEntries.facilityId, mainFacility.id),
				eq(nbsLogEntries.patientId, newbornPatient.id)
			)
		)

	if (babySantosNbs) {
		const [existingConsent] = await db
			.select()
			.from(consentRecords)
			.where(
				and(
					eq(consentRecords.encounterId, babySantosNbs.encounterId!),
					eq(consentRecords.consentType, "nbs")
				)
			)

		if (!existingConsent) {
			await db.insert(consentRecords).values({
				facilityId: mainFacility.id,
				encounterId: babySantosNbs.encounterId,
				patientId: babySantosNbs.patientId,
				consentType: "nbs",
				signedByName: "Baby Santos Mother",
				relationship: "parent",
				consentText: "Parental consent for newborn screening.",
				patientSignature: "Baby Santos Mother",
				witnessSignature: "Nurse Ana Reyes",
				capturedByStaffId: staffMap.get("nurse@qhealth.local")!,
				signedAt: new Date(Date.now() - 29 * 3_600_000),
			})
		}
	}

	const [babyReyesNbs] = await db
		.select()
		.from(nbsLogEntries)
		.where(
			and(
				eq(nbsLogEntries.facilityId, mainFacility.id),
				eq(nbsLogEntries.encounterId, nurseryReferralEncounter.id)
			)
		)

	if (!babyReyesNbs) {
		const birthAt = new Date(Date.now() - 30 * 3_600_000)
		const screenedAt = new Date(Date.now() - 23 * 3_600_000)
		await db.insert(nbsLogEntries).values({
			facilityId: mainFacility.id,
			encounterId: nurseryReferralEncounter.id,
			patientId: newbornReferralPatient.id,
			birthDatetime: birthAt,
			screeningDatetime: screenedAt,
			hoursElapsed: 7,
			screeningResult: {
				sampleId: "NBS-0002",
				testType: "heel_prick",
				conditions: [
					{ condition: "CH", result: "abnormal" },
					{ condition: "CAH", result: "normal" },
					{ condition: "G6PD", result: "normal" },
				],
				labName: "QHealth Lab",
			},
			consentStatus: "consented",
			referralStatus: "referred",
			referralFacility: "Regional NBS Referral Center",
			referralDate: new Date().toISOString().slice(0, 10),
			referralNotes: "Seeded positive screening follow-up referral.",
			status: "referred",
			screenedByStaffId: staffMap.get("nurse@qhealth.local")!,
		})
	}

	const preEncounter = await ensurePreEncounter(
		mainFacility.id,
		`TRAUMA-${new Date().getFullYear()}-0001`,
		staffMap.get("nurse@qhealth.local")!
	)
	const erEncounter = await ensureEncounter(
		mainFacility.id,
		patient2.id,
		staffMap.get("doctor@qhealth.local")!,
		erBed1.id,
		"emergency",
		"Fever and productive cough"
	)
	const inpatientEncounter = await ensureEncounter(
		mainFacility.id,
		patient1.id,
		staffMap.get("doctor@qhealth.local")!,
		medBed1.id,
		"inpatient",
		"Uncontrolled hypertension"
	)
	const surgicalEncounter = await ensureEncounter(
		mainFacility.id,
		patient4.id,
		staffMap.get("surgeon@qhealth.local")!,
		null,
		"inpatient",
		"Scheduled laparoscopic cholecystectomy"
	)
	const scheduledOrTime = new Date()
	scheduledOrTime.setDate(scheduledOrTime.getDate() + 1)
	scheduledOrTime.setHours(8, 0, 0, 0)
	await ensureSurgicalCase({
		facilityId: mainFacility.id,
		encounterId: surgicalEncounter.id,
		patientId: patient4.id,
		procedureName: "Laparoscopic cholecystectomy",
		orSuite: "OR-1",
		surgicalType: "elective",
		surgeonStaffId: staffMap.get("surgeon@qhealth.local")!,
		anesthesiologistStaffId: staffMap.get("anesthesiologist@qhealth.local")!,
		scheduledDatetime: scheduledOrTime,
		estimatedDurationMinutes: 120,
		requiredEquipment: ["laparoscope", "electrocautery"],
		notes: "Dev smoke case for Surgeon workflow: operation record signing and RVS mapping.",
	})

	const refs = await ensureReferenceData(mainFacility.id)
	await ensureClinicalData({
		facilityId: mainFacility.id,
		encounterId: erEncounter.id,
		patientId: patient2.id,
		staffId: staffMap.get("doctor@qhealth.local")!,
	})
	await ensureNursingAndOrders({
		facilityId: mainFacility.id,
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

	await db
		.update(beds)
		.set({ status: "occupied", currentEncounterId: erEncounter.id, updatedAt: new Date() })
		.where(eq(beds.id, erBed1.id))
	await db
		.update(beds)
		.set({ status: "occupied", currentEncounterId: inpatientEncounter.id, updatedAt: new Date() })
		.where(eq(beds.id, medBed1.id))

	await seedAdminScenarios({
		facilityId: mainFacility.id,
		adminUserId: authUsers.get("admin@qhealth.local")!,
		adminStaffId: staffMap.get("admin@qhealth.local")!,
		doctorStaffId: staffMap.get("doctor@qhealth.local")!,
		patientId: patient1.id,
	})

	await ensureNursingScenarios({
		facilityId: mainFacility.id,
		erEncounterId: erEncounter.id,
		inpatientEncounterId: inpatientEncounter.id,
		erPatientId: patient2.id,
		inpatientPatientId: patient1.id,
		nurseStaffId: staffMap.get("nurse@qhealth.local")!,
		doctorStaffId: staffMap.get("doctor@qhealth.local")!,
		paracetamolFormulaId: refs.formulary.id,
	})

	console.log("Seed complete.")
	console.log("Login credentials:")
	for (const user of demoUsers) {
		console.log(`- ${user.roleName}: ${user.email} / ${DEFAULT_PASSWORD}`)
	}
}

main()
	.then(() => process.exit(0))
	.catch(err => {
		console.error("Seed failed:", err)
		process.exit(1)
	})
