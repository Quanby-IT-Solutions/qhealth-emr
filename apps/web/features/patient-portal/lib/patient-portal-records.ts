import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"
import { Pool } from "pg"

import { formatImagingExamName } from "@/features/orders/lib/imaging-modality"
import type { PatientPortalDocument } from "@/features/patient-portal/lib/static-summary"
import { env } from "@/env"

export const PATIENT_PORTAL_COOKIE = "qhealth_patient_portal"

const DEFAULT_DATABASE_URL = "postgres://postgres:password@localhost:5432/qhealth-emr"
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 2

type PortalPoolGlobal = typeof globalThis & {
	__qhealthPatientPortalPool?: Pool
}

export type PortalSession = {
	patientId: string
	mrn: string
	dateOfBirth: string
	issuedAt: number
}

export type PortalStatus = "normal" | "attention" | "released"

export type PortalSummaryItem = {
	label: string
	value: string
	detail?: string
	status?: PortalStatus
}

export type PortalDetailItem = {
	label: string
	value: string
}

export type PatientPortalRecord = {
	patient: {
		id: string
		mrn: string
		name: string
		firstName: string
		middleName: string | null
		lastName: string
		dateOfBirth: string
		sex: string
		addressLine1: string | null
		addressLine2: string | null
		city: string | null
		province: string | null
		zipCode: string | null
		phone: string | null
		email: string | null
		philhealthMemberId: string | null
		emergencyContactName: string | null
		emergencyContactPhone: string | null
		nextOfKinName: string | null
		nextOfKinRelationship: string | null
		isActive: boolean
		createdAt: string
		updatedAt: string
		facilityName: string
	}
	snapshot: {
		generatedAt: string
		releasedThrough: string
		source: string
	}
	patientDetails: PortalDetailItem[]
	overview: PortalSummaryItem[]
	problems: PortalSummaryItem[]
	allergies: PortalSummaryItem[]
	medications: PortalSummaryItem[]
	labs: PortalSummaryItem[]
	imaging: PortalSummaryItem[]
	encounters: PortalSummaryItem[]
	notes: PortalSummaryItem[]
	appointments: PortalSummaryItem[]
	consents: PortalSummaryItem[]
	prescriptions: PortalSummaryItem[]
	billing: PortalSummaryItem[]
	recordsRequests: PortalSummaryItem[]
}

type PatientRow = {
	id: string
	mrn: string
	first_name: string
	middle_name: string | null
	last_name: string
	date_of_birth: string
	sex: string
	address_line1: string | null
	address_line2: string | null
	city: string | null
	province: string | null
	zip_code: string | null
	phone: string | null
	email: string | null
	philhealth_member_id: string | null
	emergency_contact_name: string | null
	emergency_contact_phone: string | null
	next_of_kin_name: string | null
	next_of_kin_relationship: string | null
	is_active: boolean
	created_at: string
	updated_at: string
	facility_name: string | null
}

type EncounterRow = {
	id: string
	encounter_type: string
	status: string
	chief_complaint: string | null
	admission_datetime: string
	discharge_datetime: string | null
	disposition: string | null
}

type ProblemRow = {
	description: string
	status: string
	onset_date: string | null
	resolution_date: string | null
	icd10_code: string | null
	icd10_display: string | null
}

type AllergyRow = {
	allergen_name: string
	allergen_type: string
	reaction_type: string | null
	severity: string
	onset_date: string | null
	is_active: boolean
}

type MedicationRow = {
	generic_name: string
	brand_name: string | null
	dose: string
	dose_unit: string
	dose_form: string
	route: string
	frequency: string
	duration_days: number | null
	status: string
	special_instructions: string | null
	created_at: string
}

type LabRow = {
	test_name: string
	panel_name: string | null
	priority: string
	status: string
	specimen_type: string | null
	collection_datetime: string | null
	resulted_datetime: string | null
	results: unknown
	created_at: string
}

type ImagingRow = {
	modality: string
	body_part: string
	clinical_indication: string | null
	priority: string
	status: string
	scheduled_datetime: string | null
	completed_datetime: string | null
	report: string | null
	created_at: string
}

type NoteRow = {
	note_type: string
	content: string
	status: string
	signed_at: string | null
	created_at: string
}

type AppointmentRow = {
	clinic_name: string | null
	appointment_date: string
	appointment_time: string
	queue_number: number | null
	status: string
	encounter_type: string
	chief_complaint: string | null
	notes: string | null
}

type ConsentRow = {
	consent_type: string
	signed_by_name: string
	relationship: string
	signed_at: string | null
	is_active: boolean
	revoked_at: string | null
	revocation_reason: string | null
}

type PrescriptionRow = {
	generic_name: string
	brand_name: string | null
	dose: string
	dose_unit: string
	dose_form: string
	route: string
	frequency: string
	status: string
	signed_at: string | null
	created_at: string
}

export type PortalPrescriptionDetail = {
	id: string
	prescriberName: string
	prcLicenseNumber: string
	ptrNumber: string
	pdeaS2License: string | null
	status: string
	signedAt: string | null
	createdAt: string
	genericName: string
	brandName: string | null
	dose: string
	doseUnit: string
	doseForm: string
	route: string
	frequency: string
	durationDays: number | null
	specialInstructions: string | null
	isPrn: boolean
	prnReason: string | null
	isControlledSubstance: boolean
	pdeaSchedule: string | null
	noRefillInscribed: boolean
	pdeaTrancheNumber: number | null
	pdeaTrancheTotal: number | null
	pdeaDispenseDate: string | null
	pdeaDispensingInstructions: string | null
}

export type PortalLabRequestDetail = {
	id: string
	patientName: string
	patientMrn: string
	patientDateOfBirth: string
	testName: string
	panelName: string | null
	loincCode: string | null
	panelCode: string | null
	clinicalIndication: string | null
	indicationIcd10Code: string | null
	indicationIcd10Display: string | null
	priority: string
	status: string
	specimenType: string | null
	orderingStaffName: string
	orderingStaffPrcLicenseNumber: string | null
	orderingStaffPtrNumber: string | null
	orderingStaffPdeaS2License: string | null
	location: string | null
	collectionDatetime: string | null
	resultedDatetime: string | null
	createdAt: string
}

export type PortalImagingRequestDetail = {
	id: string
	patientName: string
	patientMrn: string
	patientDateOfBirth: string
	modality: string
	bodyPart: string
	examName: string
	clinicalIndication: string | null
	indicationIcd10Code: string | null
	indicationIcd10Display: string | null
	priority: string
	status: string
	orderingStaffName: string
	orderingStaffPrcLicenseNumber: string | null
	orderingStaffPtrNumber: string | null
	orderingStaffPdeaS2License: string | null
	scheduledDatetime: string | null
	completedDatetime: string | null
	report: string | null
	createdAt: string
}

type PortalPrescriptionRow = {
	id: string
	prescriber_name: string | null
	prc_license_number: string
	ptr_number: string
	pdea_s2_license: string | null
	prescription_content: unknown
	status: string
	signed_at: string | null
	created_at: string
}

type PortalLabRequestRow = {
	id: string
	patient_name: string | null
	patient_mrn: string
	patient_date_of_birth: string
	test_name: string
	panel_name: string | null
	loinc_code: string | null
	panel_code: string | null
	clinical_indication: string | null
	indication_icd10_code: string | null
	indication_icd10_display: string | null
	priority: string
	status: string
	specimen_type: string | null
	ordering_staff_name: string | null
	ordering_staff_prc_license_number: string | null
	ordering_staff_ptr_number: string | null
	ordering_staff_pdea_s2_license: string | null
	location: string | null
	collection_datetime: string | null
	resulted_datetime: string | null
	created_at: string
}

type PortalImagingRequestRow = {
	id: string
	patient_name: string | null
	patient_mrn: string
	patient_date_of_birth: string
	modality: string
	body_part: string
	clinical_indication: string | null
	indication_icd10_code: string | null
	indication_icd10_display: string | null
	priority: string
	status: string
	ordering_staff_name: string | null
	ordering_staff_prc_license_number: string | null
	ordering_staff_ptr_number: string | null
	ordering_staff_pdea_s2_license: string | null
	scheduled_datetime: string | null
	completed_datetime: string | null
	report: string | null
	created_at: string
}

type PortalRequestOwnerRow = {
	patient_id: string
}

type PrescriptionContent = {
	genericName?: string
	brandName?: string | null
	dose?: string
	doseUnit?: string
	doseForm?: string
	route?: string
	frequency?: string
	durationDays?: number | null
	specialInstructions?: string | null
	isPrn?: boolean
	prnReason?: string | null
	isControlledSubstance?: boolean
	pdeaSchedule?: string | null
	noRefillInscribed?: boolean
	pdeaTrancheNumber?: number | null
	pdeaTrancheTotal?: number | null
	pdeaDispenseDate?: string | null
	pdeaDispensingInstructions?: string | null
}

type InvoiceRow = {
	invoice_number: string
	subtotal: string
	discount: string
	total_amount: string
	philhealth_coverage: string
	patient_responsibility: string
	status: string
	finalized_at: string | null
	created_at: string
}

type RecordsRequestRow = {
	request_type: string
	requested_by_name: string
	requested_by_relationship: string | null
	purpose: string | null
	status: string
	completed_at: string | null
	released_at: string | null
	rejection_reason: string | null
	created_at: string
}

function getPool() {
	const globalForPool = globalThis as PortalPoolGlobal

	if (!globalForPool.__qhealthPatientPortalPool) {
		globalForPool.__qhealthPatientPortalPool = new Pool({
			connectionString: env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
			max: 4,
		})
	}

	return globalForPool.__qhealthPatientPortalPool
}

function getSessionSecret() {
	return env.PATIENT_PORTAL_SESSION_SECRET ?? "qhealth-dev-patient-portal-secret"
}

export function normalizePortalMrn(value: string) {
	return value
		.trim()
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, "")
}

function signValue(value: string) {
	return createHmac("sha256", getSessionSecret()).update(value).digest("base64url")
}

export function createPortalSessionCookie(session: PortalSession) {
	const payload = Buffer.from(JSON.stringify(session)).toString("base64url")
	return `${payload}.${signValue(payload)}`
}

export function parsePortalSessionCookie(value: string | undefined): PortalSession | null {
	if (!value) {
		return null
	}

	const [payload, signature] = value.split(".")

	if (!payload || !signature) {
		return null
	}

	const expectedSignature = signValue(payload)
	const signatureBuffer = Buffer.from(signature)
	const expectedBuffer = Buffer.from(expectedSignature)

	if (
		signatureBuffer.length !== expectedBuffer.length ||
		!timingSafeEqual(signatureBuffer, expectedBuffer)
	) {
		return null
	}

	try {
		const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as PortalSession
		const ageSeconds = Math.floor(Date.now() / 1000) - session.issuedAt

		if (ageSeconds > SESSION_MAX_AGE_SECONDS) {
			return null
		}

		return session
	} catch {
		return null
	}
}

export function getPatientPortalCookieOptions() {
	return {
		httpOnly: true,
		maxAge: SESSION_MAX_AGE_SECONDS,
		path: "/patient-portal",
		sameSite: "lax" as const,
		secure: env.NODE_ENV === "production",
	}
}

export async function verifyPatientPortalIdentity(mrn: string, dateOfBirth: string) {
	const normalizedMrn = normalizePortalMrn(mrn)
	const { rows } = await getPool().query<PatientRow>(
		`
			select
				p.id,
				p.mrn,
				p.first_name,
				p.middle_name,
				p.last_name,
				p.date_of_birth::text as date_of_birth,
				p.sex,
				p.address_line1,
				p.address_line2,
				p.city,
				p.province,
				p.zip_code,
				p.phone,
				p.email,
				p.philhealth_member_id,
				p.emergency_contact_name,
				p.emergency_contact_phone,
				p.next_of_kin_name,
				p.next_of_kin_relationship,
				p.is_active,
				p.created_at::text as created_at,
				p.updated_at::text as updated_at,
				f.name as facility_name
			from patients p
			left join facilities f on f.id = p.facility_id
			where regexp_replace(upper(p.mrn), '[^A-Z0-9]', '', 'g') = $1
				and p.date_of_birth = $2::date
				and p.is_active = true
			limit 1
		`,
		[normalizedMrn, dateOfBirth]
	)

	return rows[0] ?? null
}

export async function getPatientPortalRecord(
	patientId: string
): Promise<PatientPortalRecord | null> {
	const patient = await getPatientById(patientId)

	if (!patient) {
		return null
	}

	const [
		encounters,
		problems,
		allergies,
		medications,
		labs,
		imaging,
		notes,
		appointments,
		consents,
		prescriptions,
		billing,
		recordsRequests,
	] = await Promise.all([
		getEncounters(patient.id),
		getProblems(patient.id),
		getAllergies(patient.id),
		getMedications(patient.id),
		getLabs(patient.id),
		getImaging(patient.id),
		getNotes(patient.id),
		getAppointments(patient.id),
		getConsents(patient.id),
		getPrescriptions(patient.id),
		getBilling(patient.id),
		getRecordsRequests(patient.id),
	])

	const patientName = formatPatientName(patient)

	return {
		patient: {
			id: patient.id,
			mrn: patient.mrn,
			name: patientName,
			firstName: patient.first_name,
			middleName: patient.middle_name,
			lastName: patient.last_name,
			dateOfBirth: patient.date_of_birth,
			sex: patient.sex,
			addressLine1: patient.address_line1,
			addressLine2: patient.address_line2,
			city: patient.city,
			province: patient.province,
			zipCode: patient.zip_code,
			phone: patient.phone,
			email: patient.email,
			philhealthMemberId: patient.philhealth_member_id,
			emergencyContactName: patient.emergency_contact_name,
			emergencyContactPhone: patient.emergency_contact_phone,
			nextOfKinName: patient.next_of_kin_name,
			nextOfKinRelationship: patient.next_of_kin_relationship,
			isActive: patient.is_active,
			createdAt: patient.created_at,
			updatedAt: patient.updated_at,
			facilityName: patient.facility_name ?? "Quanby",
		},
		snapshot: {
			generatedAt: formatDateTime(new Date().toISOString()),
			releasedThrough: "Patient-facing records available through the current portal snapshot.",
			source: "Read-only patient portal database snapshot",
		},
		patientDetails: buildPatientDetails(patient),
		overview: buildOverview(patient, encounters, problems, allergies),
		problems: problems.map(problem => ({
			label: problem.description,
			value: problem.status,
			detail: [
				problem.icd10_code ? `ICD-10 ${problem.icd10_code}` : null,
				problem.icd10_display,
				problem.onset_date ? `Onset ${formatDate(problem.onset_date)}` : null,
				problem.resolution_date ? `Resolved ${formatDate(problem.resolution_date)}` : null,
			]
				.filter(Boolean)
				.join(" · "),
			status: problem.status === "active" ? "attention" : "released",
		})),
		allergies: allergies.map(allergy => ({
			label: allergy.allergen_name,
			value: `${allergy.severity} ${allergy.allergen_type}`,
			detail: [
				allergy.reaction_type ? `Reaction: ${allergy.reaction_type}` : null,
				allergy.onset_date ? `Onset ${formatDate(allergy.onset_date)}` : null,
				allergy.is_active ? "Active" : "Inactive",
			]
				.filter(Boolean)
				.join(" · "),
			status: allergy.is_active ? "attention" : "released",
		})),
		medications: medications.map(medication => ({
			label: medication.generic_name,
			value: [
				medication.dose,
				medication.dose_unit,
				medication.dose_form,
				medication.route,
				medication.frequency,
			].join(" "),
			detail: [
				medication.brand_name ? `Brand: ${medication.brand_name}` : null,
				medication.duration_days ? `${medication.duration_days} days` : null,
				medication.special_instructions,
				`Status: ${medication.status}`,
			]
				.filter(Boolean)
				.join(" · "),
			status:
				medication.status === "active" || medication.status === "verified" ? "normal" : "released",
		})),
		labs: labs.map(lab => ({
			label: lab.panel_name ? `${lab.panel_name} · ${lab.test_name}` : lab.test_name,
			value: formatResults(lab.results) || lab.status,
			detail: [
				lab.specimen_type ? `Specimen: ${lab.specimen_type}` : null,
				`Priority: ${lab.priority}`,
				lab.resulted_datetime
					? `Resulted ${formatDateTime(lab.resulted_datetime)}`
					: `Ordered ${formatDateTime(lab.created_at)}`,
			]
				.filter(Boolean)
				.join(" · "),
			status: lab.status === "resulted" || lab.status === "completed" ? "released" : "attention",
		})),
		imaging: imaging.map(order => ({
			label: formatImagingExamName(order.modality, order.body_part),
			value: order.report || order.status,
			detail: [
				order.clinical_indication ? `Indication: ${order.clinical_indication}` : null,
				`Priority: ${order.priority}`,
				order.completed_datetime
					? `Completed ${formatDateTime(order.completed_datetime)}`
					: `Ordered ${formatDateTime(order.created_at)}`,
			]
				.filter(Boolean)
				.join(" · "),
			status: order.status === "completed" ? "released" : "attention",
		})),
		encounters: encounters.map(encounter => ({
			label: `${encounter.encounter_type} encounter`,
			value: encounter.status,
			detail: [
				encounter.chief_complaint ? `Chief complaint: ${encounter.chief_complaint}` : null,
				`Admitted ${formatDateTime(encounter.admission_datetime)}`,
				encounter.discharge_datetime
					? `Discharged ${formatDateTime(encounter.discharge_datetime)}`
					: null,
				encounter.disposition ? `Disposition: ${encounter.disposition}` : null,
			]
				.filter(Boolean)
				.join(" · "),
			status: encounter.status === "active" ? "normal" : "released",
		})),
		notes: notes.map(note => ({
			label: `${note.note_type} note`,
			value: note.status,
			detail: `${note.signed_at ? `Signed ${formatDateTime(note.signed_at)}` : `Created ${formatDateTime(note.created_at)}`} · ${truncateText(note.content, 140)}`,
			status: note.status === "signed" ? "released" : "attention",
		})),
		appointments: appointments.map(appointment => ({
			label: appointment.clinic_name ?? `${formatStatus(appointment.encounter_type)} appointment`,
			value: `${formatDate(appointment.appointment_date)} at ${formatTime(appointment.appointment_time)}`,
			detail: [
				`Status: ${formatStatus(appointment.status)}`,
				appointment.queue_number ? `Queue ${appointment.queue_number}` : null,
				appointment.chief_complaint ? `Reason: ${appointment.chief_complaint}` : appointment.notes,
			]
				.filter(Boolean)
				.join(" | "),
			status:
				appointment.status === "cancelled" || appointment.status === "no_show"
					? "attention"
					: "released",
		})),
		consents: consents.map(consent => ({
			label: `${formatStatus(consent.consent_type)} consent`,
			value: consent.is_active ? "Active" : "Inactive",
			detail: [
				`Signed by ${consent.signed_by_name} (${formatStatus(consent.relationship)})`,
				consent.signed_at ? `Signed ${formatDateTime(consent.signed_at)}` : null,
				consent.revoked_at ? `Revoked ${formatDateTime(consent.revoked_at)}` : null,
				consent.revocation_reason ? `Reason: ${consent.revocation_reason}` : null,
			]
				.filter(Boolean)
				.join(" | "),
			status: consent.is_active ? "released" : "attention",
		})),
		prescriptions: prescriptions.map(prescription => ({
			label: prescription.generic_name,
			value: [
				prescription.dose,
				prescription.dose_unit,
				prescription.dose_form,
				prescription.route,
				prescription.frequency,
			].join(" "),
			detail: [
				prescription.brand_name ? `Brand: ${prescription.brand_name}` : null,
				`Status: ${formatStatus(prescription.status)}`,
				prescription.signed_at
					? `Signed ${formatDateTime(prescription.signed_at)}`
					: `Created ${formatDateTime(prescription.created_at)}`,
			]
				.filter(Boolean)
				.join(" | "),
			status: "released",
		})),
		billing: billing.map(invoice => ({
			label: `Invoice ${invoice.invoice_number}`,
			value: `${formatCurrency(invoice.patient_responsibility)} patient responsibility`,
			detail: [
				`Total ${formatCurrency(invoice.total_amount)}`,
				`PhilHealth ${formatCurrency(invoice.philhealth_coverage)}`,
				`Discount ${formatCurrency(invoice.discount)}`,
				`Status: ${formatStatus(invoice.status)}`,
				invoice.finalized_at
					? `Finalized ${formatDateTime(invoice.finalized_at)}`
					: `Created ${formatDateTime(invoice.created_at)}`,
			].join(" | "),
			status: "released",
		})),
		recordsRequests: recordsRequests.map(request => ({
			label: formatStatus(request.request_type),
			value: formatStatus(request.status),
			detail: [
				`Requested by ${request.requested_by_name}${request.requested_by_relationship ? ` (${formatStatus(request.requested_by_relationship)})` : ""}`,
				request.purpose ? `Purpose: ${request.purpose}` : null,
				request.released_at
					? `Released ${formatDateTime(request.released_at)}`
					: request.completed_at
						? `Completed ${formatDateTime(request.completed_at)}`
						: `Requested ${formatDateTime(request.created_at)}`,
				request.rejection_reason ? `Reason: ${request.rejection_reason}` : null,
			]
				.filter(Boolean)
				.join(" | "),
			status: request.status === "rejected" ? "attention" : "released",
		})),
	}
}

export async function getPatientPortalPrescriptions(
	patientId: string,
	prescriptionIds: string[]
): Promise<PortalPrescriptionDetail[]> {
	if (prescriptionIds.length === 0) {
		return []
	}

	const { rows } = await getPool().query<PortalPrescriptionRow>(
		`
			select
				p.id,
				u.name as prescriber_name,
				p.prc_license_number,
				p.ptr_number,
				p.pdea_s2_license,
				p.prescription_content,
				p.status,
				p.signed_at::text as signed_at,
				p.created_at::text as created_at
			from prescriptions p
			left join staff_profiles sp on sp.id = p.prescriber_staff_id
			left join users u on u.id = sp.user_id
			where p.patient_id = $1
				and p.id = any($2::uuid[])
				and p.status in ('signed', 'issued')
			order by coalesce(p.signed_at, p.created_at) desc
		`,
		[patientId, prescriptionIds]
	)

	return rows.map(row => {
		const content = parsePrescriptionContent(row.prescription_content)

		return {
			id: row.id,
			prescriberName: row.prescriber_name ?? "Prescriber not recorded",
			prcLicenseNumber: row.prc_license_number,
			ptrNumber: row.ptr_number,
			pdeaS2License: row.pdea_s2_license,
			status: row.status,
			signedAt: row.signed_at,
			createdAt: row.created_at,
			genericName: formatValue(content.genericName),
			brandName: content.brandName ?? null,
			dose: formatValue(content.dose),
			doseUnit: formatValue(content.doseUnit),
			doseForm: formatValue(content.doseForm),
			route: formatValue(content.route),
			frequency: formatValue(content.frequency),
			durationDays: content.durationDays ?? null,
			specialInstructions: content.specialInstructions ?? null,
			isPrn: content.isPrn ?? false,
			prnReason: content.prnReason ?? null,
			isControlledSubstance: content.isControlledSubstance ?? false,
			pdeaSchedule: content.pdeaSchedule ?? null,
			noRefillInscribed: content.noRefillInscribed ?? content.isControlledSubstance ?? false,
			pdeaTrancheNumber: content.pdeaTrancheNumber ?? null,
			pdeaTrancheTotal: content.pdeaTrancheTotal ?? null,
			pdeaDispenseDate: content.pdeaDispenseDate ?? null,
			pdeaDispensingInstructions: content.pdeaDispensingInstructions ?? null,
		}
	})
}

export async function getPatientPortalLabRequests(
	patientId: string,
	labOrderIds: string[]
): Promise<PortalLabRequestDetail[]> {
	if (labOrderIds.length === 0) {
		return []
	}

	const { rows } = await getPool().query<PortalLabRequestRow>(
		`
			select
				lo.id,
				concat_ws(' ', p.first_name, p.middle_name, p.last_name) as patient_name,
				p.mrn as patient_mrn,
				p.date_of_birth::text as patient_date_of_birth,
				lo.test_name,
				lo.panel_name,
				lo.loinc_code,
				lo.panel_code,
				lo.clinical_indication,
				lo.indication_icd10_code,
				lo.indication_icd10_display,
				lo.priority,
				lo.status,
				lo.specimen_type,
				u.name as ordering_staff_name,
				sp.prc_license_number as ordering_staff_prc_license_number,
				sp.ptr_number as ordering_staff_ptr_number,
				sp.pdea_s2_license as ordering_staff_pdea_s2_license,
				nullif(concat_ws(' / ', w.name, b.bed_number), '') as location,
				lo.collection_datetime::text as collection_datetime,
				lo.resulted_datetime::text as resulted_datetime,
				lo.created_at::text as created_at
			from lab_orders lo
			inner join encounters e on e.id = lo.encounter_id
			inner join patients p on p.id = e.patient_id
			left join beds b on b.id = e.bed_id
			left join wards w on w.id = b.ward_id
			left join staff_profiles sp on sp.id = lo.ordering_staff_id
			left join users u on u.id = sp.user_id
			where p.id = $1
				and lo.id = any($2::uuid[])
				and lo.status <> 'cancelled'
			order by lo.created_at desc
		`,
		[patientId, labOrderIds]
	)

	return rows.map(row => ({
		id: row.id,
		patientName: row.patient_name ?? "Patient not recorded",
		patientMrn: row.patient_mrn,
		patientDateOfBirth: row.patient_date_of_birth,
		testName: row.test_name,
		panelName: row.panel_name,
		loincCode: row.loinc_code,
		panelCode: row.panel_code,
		clinicalIndication: row.clinical_indication,
		indicationIcd10Code: row.indication_icd10_code,
		indicationIcd10Display: row.indication_icd10_display,
		priority: row.priority,
		status: row.status,
		specimenType: row.specimen_type,
		orderingStaffName: row.ordering_staff_name ?? "Ordering clinician not recorded",
		orderingStaffPrcLicenseNumber: row.ordering_staff_prc_license_number,
		orderingStaffPtrNumber: row.ordering_staff_ptr_number,
		orderingStaffPdeaS2License: row.ordering_staff_pdea_s2_license,
		location: row.location,
		collectionDatetime: row.collection_datetime,
		resultedDatetime: row.resulted_datetime,
		createdAt: row.created_at,
	}))
}

export async function getPatientPortalLabRequestOwnerId(
	labOrderIds: string[]
): Promise<string | null> {
	if (labOrderIds.length === 0) {
		return null
	}

	const { rows } = await getPool().query<PortalRequestOwnerRow>(
		`
			select distinct p.id as patient_id
			from lab_orders lo
			inner join encounters e on e.id = lo.encounter_id
			inner join patients p on p.id = e.patient_id
			where lo.id = any($1::uuid[])
				and lo.status <> 'cancelled'
			limit 2
		`,
		[labOrderIds]
	)

	return rows.length === 1 ? (rows[0]?.patient_id ?? null) : null
}

export async function getPatientPortalImagingRequests(
	patientId: string,
	imagingOrderIds: string[]
): Promise<PortalImagingRequestDetail[]> {
	if (imagingOrderIds.length === 0) {
		return []
	}

	const { rows } = await getPool().query<PortalImagingRequestRow>(
		`
			select
				io.id,
				concat_ws(' ', p.first_name, p.middle_name, p.last_name) as patient_name,
				p.mrn as patient_mrn,
				p.date_of_birth::text as patient_date_of_birth,
				io.modality,
				io.body_part,
				io.clinical_indication,
				io.indication_icd10_code,
				io.indication_icd10_display,
				io.priority,
				io.status,
				u.name as ordering_staff_name,
				sp.prc_license_number as ordering_staff_prc_license_number,
				sp.ptr_number as ordering_staff_ptr_number,
				sp.pdea_s2_license as ordering_staff_pdea_s2_license,
				io.scheduled_datetime::text as scheduled_datetime,
				io.completed_datetime::text as completed_datetime,
				io.report,
				io.created_at::text as created_at
			from imaging_orders io
			inner join encounters e on e.id = io.encounter_id
			inner join patients p on p.id = e.patient_id
			left join staff_profiles sp on sp.id = io.ordering_staff_id
			left join users u on u.id = sp.user_id
			where p.id = $1
				and io.id = any($2::uuid[])
				and io.status <> 'cancelled'
			order by io.created_at desc
		`,
		[patientId, imagingOrderIds]
	)

	return rows.map(row => ({
		id: row.id,
		patientName: row.patient_name ?? "Patient not recorded",
		patientMrn: row.patient_mrn,
		patientDateOfBirth: row.patient_date_of_birth,
		modality: row.modality,
		bodyPart: row.body_part,
		examName: formatImagingExamName(row.modality, row.body_part),
		clinicalIndication: row.clinical_indication,
		indicationIcd10Code: row.indication_icd10_code,
		indicationIcd10Display: row.indication_icd10_display,
		priority: row.priority,
		status: row.status,
		orderingStaffName: row.ordering_staff_name ?? "Ordering clinician not recorded",
		orderingStaffPrcLicenseNumber: row.ordering_staff_prc_license_number,
		orderingStaffPtrNumber: row.ordering_staff_ptr_number,
		orderingStaffPdeaS2License: row.ordering_staff_pdea_s2_license,
		scheduledDatetime: row.scheduled_datetime,
		completedDatetime: row.completed_datetime,
		report: row.report,
		createdAt: row.created_at,
	}))
}

export async function getPatientPortalImagingRequestOwnerId(
	imagingOrderIds: string[]
): Promise<string | null> {
	if (imagingOrderIds.length === 0) {
		return null
	}

	const { rows } = await getPool().query<PortalRequestOwnerRow>(
		`
			select distinct p.id as patient_id
			from imaging_orders io
			inner join encounters e on e.id = io.encounter_id
			inner join patients p on p.id = e.patient_id
			where io.id = any($1::uuid[])
				and io.status <> 'cancelled'
			limit 2
		`,
		[imagingOrderIds]
	)

	return rows.length === 1 ? (rows[0]?.patient_id ?? null) : null
}

export function buildPatientPortalDocuments(record: PatientPortalRecord): PatientPortalDocument[] {
	const releasedAt = record.snapshot.generatedAt
	const safeMrn = record.patient.mrn.replace(/[^A-Z0-9-]/gi, "-").toLowerCase()

	return [
		{
			id: "patient-details",
			title: "Patient Database Record",
			category: "Patient Profile",
			releasedAt,
			format: "TXT",
			fileName: `${safeMrn}-patient-details.txt`,
			description: "Patient-facing profile details loaded from the matched patients table record.",
			body: buildDetailSectionDocument(record, "Patient Database Record", record.patientDetails),
		},
		{
			id: "daily-summary",
			title: "Daily Released Medical Summary",
			category: "Patient Summary",
			releasedAt,
			format: "TXT",
			fileName: `${safeMrn}-daily-summary.txt`,
			description:
				"Read-only snapshot of patient details and connected patient-facing medical records.",
			body: buildDocumentBody(record),
		},
		{
			id: "lab-results",
			title: "Released Laboratory Results",
			category: "Diagnostics",
			releasedAt,
			format: "TXT",
			fileName: `${safeMrn}-laboratory-results.txt`,
			description: "Released laboratory order and result summary for this patient.",
			body: buildSectionDocument(record, "Released Laboratory Results", record.labs),
		},
		{
			id: "imaging-report",
			title: "Released Imaging Reports",
			category: "Radiology",
			releasedAt,
			format: "TXT",
			fileName: `${safeMrn}-imaging-reports.txt`,
			description: "Released imaging order and report summary for this patient.",
			body: buildSectionDocument(record, "Released Imaging Reports", record.imaging),
		},
		{
			id: "appointments",
			title: "Appointment History",
			category: "Scheduling",
			releasedAt,
			format: "TXT",
			fileName: `${safeMrn}-appointments.txt`,
			description: "Appointments connected directly to this patient record.",
			body: buildSectionDocument(record, "Appointment History", record.appointments),
		},
		{
			id: "encounters",
			title: "Encounter History",
			category: "Clinical",
			releasedAt,
			format: "TXT",
			fileName: `${safeMrn}-encounters.txt`,
			description: "Recent encounters connected to this patient record.",
			body: buildSectionDocument(record, "Encounter History", record.encounters),
		},
		{
			id: "problems",
			title: "Problem Records",
			category: "Clinical",
			releasedAt,
			format: "TXT",
			fileName: `${safeMrn}-problems.txt`,
			description: "Problem-list records connected to this patient.",
			body: buildSectionDocument(record, "Problem Records", record.problems),
		},
		{
			id: "allergies",
			title: "Allergy Records",
			category: "Safety",
			releasedAt,
			format: "TXT",
			fileName: `${safeMrn}-allergies.txt`,
			description: "Allergy and reaction records connected to this patient.",
			body: buildSectionDocument(record, "Allergy Records", record.allergies),
		},
		{
			id: "medications",
			title: "Medication Records",
			category: "Pharmacy",
			releasedAt,
			format: "TXT",
			fileName: `${safeMrn}-medications.txt`,
			description: "Patient-facing medication orders connected through this patient's encounters.",
			body: buildSectionDocument(record, "Medication Records", record.medications),
		},
		{
			id: "prescriptions",
			title: "Released Prescriptions",
			category: "Pharmacy",
			releasedAt,
			format: "TXT",
			fileName: `${safeMrn}-prescriptions.txt`,
			description: "Signed and issued prescriptions for this patient.",
			body: buildSectionDocument(record, "Released Prescriptions", record.prescriptions),
		},
		{
			id: "signed-notes",
			title: "Signed Clinical Notes",
			category: "Clinical",
			releasedAt,
			format: "TXT",
			fileName: `${safeMrn}-signed-notes.txt`,
			description: "Signed clinical notes connected through this patient's encounters.",
			body: buildSectionDocument(record, "Signed Clinical Notes", record.notes),
		},
		{
			id: "consents",
			title: "Consent Records",
			category: "Consent",
			releasedAt,
			format: "TXT",
			fileName: `${safeMrn}-consents.txt`,
			description: "Signed consent records connected directly to this patient.",
			body: buildSectionDocument(record, "Consent Records", record.consents),
		},
		{
			id: "billing",
			title: "Billing Records",
			category: "Billing",
			releasedAt,
			format: "TXT",
			fileName: `${safeMrn}-billing.txt`,
			description: "Finalized invoices connected directly to this patient.",
			body: buildSectionDocument(record, "Billing Records", record.billing),
		},
		{
			id: "records-requests",
			title: "Medical Records Requests",
			category: "Medical Records",
			releasedAt,
			format: "TXT",
			fileName: `${safeMrn}-records-requests.txt`,
			description: "Chart and document requests connected directly to this patient.",
			body: buildSectionDocument(record, "Medical Records Requests", record.recordsRequests),
		},
	]
}

async function getPatientById(patientId: string) {
	const { rows } = await getPool().query<PatientRow>(
		`
			select
				p.id,
				p.mrn,
				p.first_name,
				p.middle_name,
				p.last_name,
				p.date_of_birth::text as date_of_birth,
				p.sex,
				p.address_line1,
				p.address_line2,
				p.city,
				p.province,
				p.zip_code,
				p.phone,
				p.email,
				p.philhealth_member_id,
				p.emergency_contact_name,
				p.emergency_contact_phone,
				p.next_of_kin_name,
				p.next_of_kin_relationship,
				p.is_active,
				p.created_at::text as created_at,
				p.updated_at::text as updated_at,
				f.name as facility_name
			from patients p
			left join facilities f on f.id = p.facility_id
			where p.id = $1
				and p.is_active = true
			limit 1
		`,
		[patientId]
	)

	return rows[0] ?? null
}

async function getEncounters(patientId: string) {
	const { rows } = await getPool().query<EncounterRow>(
		`
			select
				id,
				encounter_type,
				status,
				chief_complaint,
				admission_datetime::text as admission_datetime,
				discharge_datetime::text as discharge_datetime,
				disposition
			from encounters
			where patient_id = $1
			order by admission_datetime desc
			limit 10
		`,
		[patientId]
	)

	return rows
}

async function getProblems(patientId: string) {
	const { rows } = await getPool().query<ProblemRow>(
		`
			select description, status, onset_date::text as onset_date, resolution_date::text as resolution_date, icd10_code, icd10_display
			from problems
			where patient_id = $1
			order by created_at desc
			limit 20
		`,
		[patientId]
	)

	return rows
}

async function getAllergies(patientId: string) {
	const { rows } = await getPool().query<AllergyRow>(
		`
			select allergen_name, allergen_type, reaction_type, severity, onset_date::text as onset_date, is_active
			from allergies
			where patient_id = $1
			order by is_active desc, created_at desc
			limit 20
		`,
		[patientId]
	)

	return rows
}

async function getMedications(patientId: string) {
	const { rows } = await getPool().query<MedicationRow>(
		`
			select
				mo.generic_name,
				mo.brand_name,
				mo.dose,
				mo.dose_unit,
				mo.dose_form,
				mo.route,
				mo.frequency,
				mo.duration_days,
				mo.status,
				mo.special_instructions,
				mo.created_at::text as created_at
			from medication_orders mo
			inner join encounters e on e.id = mo.encounter_id
			where e.patient_id = $1
				and mo.status in ('verified', 'active', 'completed', 'discontinued')
			order by mo.created_at desc
			limit 30
		`,
		[patientId]
	)

	return rows
}

async function getLabs(patientId: string) {
	const { rows } = await getPool().query<LabRow>(
		`
			select
				lo.test_name,
				lo.panel_name,
				lo.priority,
				lo.status,
				lo.specimen_type,
				lo.collection_datetime::text as collection_datetime,
				lo.resulted_datetime::text as resulted_datetime,
				lo.results,
				lo.created_at::text as created_at
			from lab_orders lo
			inner join encounters e on e.id = lo.encounter_id
			where e.patient_id = $1
				and lo.status in ('resulted', 'completed')
			order by coalesce(lo.resulted_datetime, lo.created_at) desc
			limit 30
		`,
		[patientId]
	)

	return rows
}

async function getImaging(patientId: string) {
	const { rows } = await getPool().query<ImagingRow>(
		`
			select
				io.modality,
				io.body_part,
				io.clinical_indication,
				io.priority,
				io.status,
				io.scheduled_datetime::text as scheduled_datetime,
				io.completed_datetime::text as completed_datetime,
				io.report,
				io.created_at::text as created_at
			from imaging_orders io
			inner join encounters e on e.id = io.encounter_id
			where e.patient_id = $1
				and io.status = 'completed'
				and io.report is not null
			order by coalesce(io.completed_datetime, io.created_at) desc
			limit 30
		`,
		[patientId]
	)

	return rows
}

async function getNotes(patientId: string) {
	const { rows } = await getPool().query<NoteRow>(
		`
			select cn.note_type, cn.content, cn.status, cn.signed_at::text as signed_at, cn.created_at::text as created_at
			from clinical_notes cn
			inner join encounters e on e.id = cn.encounter_id
			where e.patient_id = $1
				and cn.status = 'signed'
			order by coalesce(cn.signed_at, cn.created_at) desc
			limit 20
		`,
		[patientId]
	)

	return rows
}

async function getAppointments(patientId: string) {
	const { rows } = await getPool().query<AppointmentRow>(
		`
			select
				ct.clinic_name,
				a.appointment_date::text as appointment_date,
				a.appointment_time::text as appointment_time,
				a.queue_number,
				a.status,
				a.encounter_type,
				a.chief_complaint,
				a.notes
			from appointments a
			left join clinic_templates ct on ct.id = a.clinic_template_id
			where a.patient_id = $1
			order by a.appointment_date desc, a.appointment_time desc
			limit 30
		`,
		[patientId]
	)

	return rows
}

async function getConsents(patientId: string) {
	const { rows } = await getPool().query<ConsentRow>(
		`
			select
				consent_type,
				signed_by_name,
				relationship,
				signed_at::text as signed_at,
				is_active,
				revoked_at::text as revoked_at,
				revocation_reason
			from consent_records
			where patient_id = $1
				and signed_at is not null
			order by signed_at desc
			limit 30
		`,
		[patientId]
	)

	return rows
}

async function getPrescriptions(patientId: string) {
	const { rows } = await getPool().query<PrescriptionRow>(
		`
			select
				mo.generic_name,
				mo.brand_name,
				mo.dose,
				mo.dose_unit,
				mo.dose_form,
				mo.route,
				mo.frequency,
				p.status,
				p.signed_at::text as signed_at,
				p.created_at::text as created_at
			from prescriptions p
			inner join medication_orders mo on mo.id = p.medication_order_id
			where p.patient_id = $1
				and p.status in ('signed', 'issued')
			order by coalesce(p.signed_at, p.created_at) desc
			limit 30
		`,
		[patientId]
	)

	return rows
}

async function getBilling(patientId: string) {
	const { rows } = await getPool().query<InvoiceRow>(
		`
			select
				invoice_number,
				subtotal::text as subtotal,
				discount::text as discount,
				total_amount::text as total_amount,
				philhealth_coverage::text as philhealth_coverage,
				patient_responsibility::text as patient_responsibility,
				status,
				finalized_at::text as finalized_at,
				created_at::text as created_at
			from invoices
			where patient_id = $1
				and status in ('finalized', 'partially_paid', 'paid')
			order by coalesce(finalized_at, created_at) desc
			limit 30
		`,
		[patientId]
	)

	return rows
}

async function getRecordsRequests(patientId: string) {
	const { rows } = await getPool().query<RecordsRequestRow>(
		`
			select
				request_type,
				requested_by_name,
				requested_by_relationship,
				purpose,
				status,
				completed_at::text as completed_at,
				released_at::text as released_at,
				rejection_reason,
				created_at::text as created_at
			from medical_records_requests
			where patient_id = $1
			order by created_at desc
			limit 30
		`,
		[patientId]
	)

	return rows
}

function buildPatientDetails(patient: PatientRow): PortalDetailItem[] {
	return [
		{ label: "Medical record number", value: patient.mrn },
		{ label: "First name", value: patient.first_name },
		{ label: "Middle name", value: formatValue(patient.middle_name) },
		{ label: "Last name", value: patient.last_name },
		{ label: "Date of birth", value: formatDate(patient.date_of_birth) },
		{ label: "Sex", value: formatStatus(patient.sex) },
		{ label: "Address line 1", value: formatValue(patient.address_line1) },
		{ label: "Address line 2", value: formatValue(patient.address_line2) },
		{ label: "City", value: formatValue(patient.city) },
		{ label: "Province", value: formatValue(patient.province) },
		{ label: "ZIP code", value: formatValue(patient.zip_code) },
		{ label: "Phone", value: formatValue(patient.phone) },
		{ label: "Email", value: formatValue(patient.email) },
		{ label: "PhilHealth member ID", value: formatValue(patient.philhealth_member_id) },
		{ label: "Emergency contact", value: formatValue(patient.emergency_contact_name) },
		{ label: "Emergency contact phone", value: formatValue(patient.emergency_contact_phone) },
		{ label: "Next of kin", value: formatValue(patient.next_of_kin_name) },
		{
			label: "Next-of-kin relationship",
			value: formatValue(patient.next_of_kin_relationship),
		},
		{
			label: "Registered facility",
			value: patient.facility_name ?? "Quanby",
		},
		{ label: "Patient record status", value: patient.is_active ? "Active" : "Inactive" },
		{ label: "Patient record created", value: formatDateTime(patient.created_at) },
		{ label: "Last profile update", value: formatDateTime(patient.updated_at) },
	]
}

function buildOverview(
	patient: PatientRow,
	encounters: EncounterRow[],
	problems: ProblemRow[],
	allergies: AllergyRow[]
): PortalSummaryItem[] {
	const latestEncounter = encounters[0]
	const activeAllergies = allergies.filter(allergy => allergy.is_active)
	const activeProblems = problems.filter(problem => problem.status === "active")

	return [
		{
			label: "Patient",
			value: formatPatientName(patient),
			detail: `MRN ${patient.mrn} · DOB ${formatDate(patient.date_of_birth)} · ${patient.sex}`,
			status: "released",
		},
		{
			label: "Latest encounter",
			value: latestEncounter
				? `${latestEncounter.encounter_type} · ${latestEncounter.status}`
				: "No encounter found",
			detail: latestEncounter
				? `${latestEncounter.chief_complaint ?? "No chief complaint recorded"} · ${formatDateTime(latestEncounter.admission_datetime)}`
				: "No released encounter is linked to this patient.",
			status: latestEncounter?.status === "active" ? "normal" : "released",
		},
		{
			label: "Active allergies",
			value: activeAllergies.length.toString(),
			detail:
				activeAllergies.map(allergy => allergy.allergen_name).join(", ") ||
				"No active allergy record found.",
			status: activeAllergies.length > 0 ? "attention" : "normal",
		},
		{
			label: "Active problems",
			value: activeProblems.length.toString(),
			detail:
				activeProblems.map(problem => problem.description).join(", ") ||
				"No active problem record found.",
			status: activeProblems.length > 0 ? "attention" : "normal",
		},
	]
}

function formatResults(results: unknown) {
	if (!results) {
		return ""
	}

	if (Array.isArray(results)) {
		return results
			.map(item => {
				if (typeof item === "object" && item !== null) {
					const result = item as Record<string, unknown>
					return [result.test, result.name, result.result, result.value, result.unit]
						.filter(Boolean)
						.join(" ")
				}

				return String(item)
			})
			.filter(Boolean)
			.join("; ")
	}

	if (typeof results === "object") {
		return Object.entries(results as Record<string, unknown>)
			.map(([key, value]) => `${key}: ${String(value)}`)
			.join("; ")
	}

	return String(results)
}

function buildDocumentBody(record: PatientPortalRecord) {
	return [
		"Quanby Patient Portal - Daily Released Medical Summary",
		"",
		`Patient: ${record.patient.name}`,
		`MRN: ${record.patient.mrn}`,
		`Date of birth: ${formatDate(record.patient.dateOfBirth)}`,
		`Facility: ${record.patient.facilityName}`,
		`Generated: ${record.snapshot.generatedAt}`,
		"",
		buildDetailSectionText("Patient Details", record.patientDetails),
		buildSectionText("Overview", record.overview),
		buildSectionText("Appointments", record.appointments),
		buildSectionText("Encounters", record.encounters),
		buildSectionText("Problems", record.problems),
		buildSectionText("Allergies", record.allergies),
		buildSectionText("Medications", record.medications),
		buildSectionText("Prescriptions", record.prescriptions),
		buildSectionText("Laboratory Results", record.labs),
		buildSectionText("Imaging Reports", record.imaging),
		buildSectionText("Signed Notes", record.notes),
		buildSectionText("Consents", record.consents),
		buildSectionText("Billing", record.billing),
		buildSectionText("Medical Records Requests", record.recordsRequests),
	].join("\n")
}

function parsePrescriptionContent(raw: unknown): PrescriptionContent {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
		return {}
	}

	return raw as PrescriptionContent
}

function buildSectionDocument(
	record: PatientPortalRecord,
	title: string,
	items: PortalSummaryItem[]
) {
	return [
		`Quanby Patient Portal - ${title}`,
		"",
		`Patient: ${record.patient.name}`,
		`MRN: ${record.patient.mrn}`,
		`Generated: ${record.snapshot.generatedAt}`,
		"",
		buildSectionText(title, items),
	].join("\n")
}

function buildDetailSectionDocument(
	record: PatientPortalRecord,
	title: string,
	items: PortalDetailItem[]
) {
	return [
		`Quanby Patient Portal - ${title}`,
		"",
		`Patient: ${record.patient.name}`,
		`MRN: ${record.patient.mrn}`,
		`Generated: ${record.snapshot.generatedAt}`,
		"",
		buildDetailSectionText(title, items),
	].join("\n")
}

function buildSectionText(title: string, items: PortalSummaryItem[]) {
	if (items.length === 0) {
		return `${title}\n- No released records found.`
	}

	return [
		title,
		...items.map(item => {
			const detail = item.detail ? ` (${item.detail})` : ""
			return `- ${item.label}: ${item.value}${detail}`
		}),
	].join("\n")
}

function buildDetailSectionText(title: string, items: PortalDetailItem[]) {
	return [title, ...items.map(item => `- ${item.label}: ${item.value}`)].join("\n")
}

function formatPatientName(patient: PatientRow) {
	return [patient.first_name, patient.middle_name, patient.last_name].filter(Boolean).join(" ")
}

function formatValue(value: string | null | undefined) {
	return value?.trim() || "Not recorded"
}

function formatStatus(value: string) {
	return value.replace(/_/g, " ").replace(/\b\w/g, character => character.toUpperCase())
}

function formatCurrency(value: string) {
	const amount = Number(value)

	if (Number.isNaN(amount)) {
		return value
	}

	return new Intl.NumberFormat("en-PH", {
		style: "currency",
		currency: "PHP",
	}).format(amount)
}

function formatTime(value: string) {
	const [hours, minutes] = value.split(":")
	const date = new Date()
	date.setHours(Number(hours), Number(minutes), 0, 0)

	if (Number.isNaN(date.getTime())) {
		return value
	}

	return new Intl.DateTimeFormat("en-PH", {
		hour: "numeric",
		minute: "2-digit",
	}).format(date)
}

function formatDate(value: string | null | undefined) {
	if (!value) {
		return "Not recorded"
	}

	return new Intl.DateTimeFormat("en-PH", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(new Date(value))
}

function formatDateTime(value: string | null | undefined) {
	if (!value) {
		return "Not recorded"
	}

	return new Intl.DateTimeFormat("en-PH", {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone: "Asia/Manila",
	}).format(new Date(value))
}

function truncateText(value: string, maxLength: number) {
	if (value.length <= maxLength) {
		return value
	}

	return `${value.slice(0, maxLength - 1)}...`
}
