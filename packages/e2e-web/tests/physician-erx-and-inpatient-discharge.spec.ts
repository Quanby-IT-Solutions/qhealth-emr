import { expect, request, test, type Cookie, type Page } from "@playwright/test"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Client } = require("pg")

const HAS_BACKEND = !!process.env.E2E_AUTH_API_URL
const AUTH_API = process.env.E2E_AUTH_API_URL ?? "http://localhost:3000/api/v1/auth/"
const WEB_ORIGIN = process.env.BASE_URL ?? "http://localhost:3001"
const DATABASE_URL =
	process.env.DATABASE_URL ?? "postgres://postgres:password@localhost:5432/qhealth-emr"
const DEFAULT_PASSWORD = process.env.E2E_SEED_PASSWORD ?? "Password123"

const ERX_MRN = "E2E-PHYS-ERX-SEND"
const ERX_CHIEF_COMPLAINT = "E2E physician regular e-prescription send"
const ERX_INSTRUCTION = "E2E regular e-prescription delivery audit"
const DISCHARGE_MRN = "E2E-PHYS-GATE-PASS"
const DISCHARGE_CHIEF_COMPLAINT = "E2E inpatient discharge checklist gate pass"

type ErxFixture = {
	encounterId: string
	patientId: string
	prescriptionId: string
}

type DischargeFixture = {
	encounterId: string
}

const authCookiesByEmail = new Map<string, Cookie[]>()

async function withDb<T>(fn: (client: typeof Client.prototype) => Promise<T>): Promise<T> {
	const client = new Client({ connectionString: DATABASE_URL })
	await client.connect()
	try {
		return await fn(client)
	} finally {
		await client.end()
	}
}

async function signInForCookies(email: string) {
	const api = await request.newContext({
		baseURL: AUTH_API,
		extraHTTPHeaders: {
			"Content-Type": "application/json",
			Origin: WEB_ORIGIN,
			"X-Forwarded-For": `127.0.0.${Math.floor(Math.random() * 200) + 20}`,
		},
	})

	let authRes = await api.post("sign-in/email", {
		data: { email, password: DEFAULT_PASSWORD },
	})
	for (let attempt = 0; authRes.status() === 429 && attempt < 6; attempt++) {
		await new Promise(resolve => setTimeout(resolve, 5_000))
		authRes = await api.post("sign-in/email", {
			data: { email, password: DEFAULT_PASSWORD },
		})
	}
	if (!authRes.ok()) {
		const body = await authRes.text()
		await api.dispose()
		throw new Error(`Failed to sign in as ${email}: ${authRes.status()} ${body}`)
	}

	const { cookies } = await api.storageState()
	await api.dispose()
	return cookies
}

async function signInAs(page: Page, email: string) {
	let cookies = authCookiesByEmail.get(email)
	if (!cookies) {
		cookies = await signInForCookies(email)
		authCookiesByEmail.set(email, cookies)
	}

	await page.context().clearCookies()
	await page.context().addCookies(cookies)
}

async function seedRegularErxFixture(): Promise<ErxFixture> {
	return withDb(async client => {
		const context = await client.query(
			`select
				 f.id as facility_id,
				 doctor_sp.id as doctor_staff_id,
				 doctor_sp.prc_license_number,
				 doctor_sp.ptr_number
			 from facilities f
			 join staff_profiles doctor_sp on doctor_sp.facility_id = f.id
			 join users doctor_user on doctor_user.id = doctor_sp.user_id
			 where doctor_user.email = 'doctor@qhealth.local'
			 limit 1`
		)
		if (context.rowCount === 0) {
			throw new Error("Seed doctor account was not found.")
		}
		const row = context.rows[0]

		const oldPatient = await client.query(`select id from patients where mrn = $1`, [ERX_MRN])
		if (oldPatient.rowCount > 0) {
			await client.query(`delete from encounters where patient_id = $1`, [oldPatient.rows[0].id])
			await client.query(`delete from patients where id = $1`, [oldPatient.rows[0].id])
		}

		const patient = await client.query(
			`insert into patients (
				 facility_id, mrn, first_name, last_name, date_of_birth, sex, email, created_at, updated_at
			 )
			 values ($1, $2, 'Erin', 'Prescription', '1988-02-03', 'female', 'erin.prescription@example.test', now(), now())
			 returning id`,
			[row.facility_id, ERX_MRN]
		)
		const patientId = patient.rows[0].id as string

		const encounter = await client.query(
			`insert into encounters (
				 facility_id, patient_id, encounter_type, status, chief_complaint,
				 admitting_staff_id, attending_staff_id, admission_datetime, created_at, updated_at
			 )
			 values ($1, $2, 'outpatient', 'active', $3, $4, $4, now(), now(), now())
			 returning id`,
			[row.facility_id, patientId, ERX_CHIEF_COMPLAINT, row.doctor_staff_id]
		)
		const encounterId = encounter.rows[0].id as string

		const medOrder = await client.query(
			`insert into medication_orders (
				 facility_id, encounter_id, generic_name, dose, dose_unit, dose_form, route,
				 frequency, duration_days, special_instructions, status, ordering_staff_id,
				 created_at, updated_at
			 )
			 values ($1, $2, 'Cetirizine', '10', 'mg', 'tablet', 'oral', 'Daily', 5, $3, 'verified', $4, now(), now())
			 returning id`,
			[row.facility_id, encounterId, ERX_INSTRUCTION, row.doctor_staff_id]
		)
		const medicationOrderId = medOrder.rows[0].id as string

		const prescription = await client.query(
			`insert into prescriptions (
				 facility_id, encounter_id, medication_order_id, patient_id, prescriber_staff_id,
				 prc_license_number, ptr_number, prescription_content, status, signed_at, created_at
			 )
			 values (
				 $1, $2, $3, $4, $5, $6, $7,
				 $8::jsonb, 'signed', now(), now()
			 )
			 returning id`,
			[
				row.facility_id,
				encounterId,
				medicationOrderId,
				patientId,
				row.doctor_staff_id,
				row.prc_license_number ?? "PRC-100001",
				row.ptr_number ?? "PTR-100001",
				JSON.stringify({
					genericName: "Cetirizine",
					dose: "10",
					doseUnit: "mg",
					doseForm: "tablet",
					route: "oral",
					frequency: "Daily",
					durationDays: 5,
					specialInstructions: ERX_INSTRUCTION,
					isControlledSubstance: false,
					noRefillInscribed: false,
				}),
			]
		)

		return {
			encounterId,
			patientId,
			prescriptionId: prescription.rows[0].id as string,
		}
	})
}

async function seedDischargeFixture(options: { clinicalComplete: boolean }): Promise<DischargeFixture> {
	return withDb(async client => {
		const context = await client.query(
			`select
				 f.id as facility_id,
				 doctor_sp.id as doctor_staff_id,
				 nurse_sp.id as nurse_staff_id,
				 pharmacist_sp.id as pharmacist_staff_id,
				 billing_sp.id as billing_staff_id
			 from facilities f
			 join staff_profiles doctor_sp on doctor_sp.facility_id = f.id
			 join users doctor_user on doctor_user.id = doctor_sp.user_id
			 join staff_profiles nurse_sp on nurse_sp.facility_id = f.id
			 join users nurse_user on nurse_user.id = nurse_sp.user_id
			 join staff_profiles pharmacist_sp on pharmacist_sp.facility_id = f.id
			 join users pharmacist_user on pharmacist_user.id = pharmacist_sp.user_id
			 join staff_profiles billing_sp on billing_sp.facility_id = f.id
			 join users billing_user on billing_user.id = billing_sp.user_id
			 where doctor_user.email = 'doctor@qhealth.local'
			   and nurse_user.email = 'nurse@qhealth.local'
			   and pharmacist_user.email = 'pharmacist@qhealth.local'
			   and billing_user.email = 'billing@qhealth.local'
			 limit 1`
		)
		if (context.rowCount === 0) {
			throw new Error("Seed clinician, nurse, pharmacist, or billing account was not found.")
		}
		const row = context.rows[0]

		const oldPatient = await client.query(`select id from patients where mrn = $1`, [DISCHARGE_MRN])
		if (oldPatient.rowCount > 0) {
			await client.query(`delete from encounters where patient_id = $1`, [oldPatient.rows[0].id])
			await client.query(`delete from patients where id = $1`, [oldPatient.rows[0].id])
		}

		const patient = await client.query(
			`insert into patients (
				 facility_id, mrn, first_name, last_name, date_of_birth, sex, created_at, updated_at
			 )
			 values ($1, $2, 'Isaac', 'Discharge', '1974-07-12', 'male', now(), now())
			 returning id`,
			[row.facility_id, DISCHARGE_MRN]
		)
		const patientId = patient.rows[0].id as string

		const encounter = await client.query(
			`insert into encounters (
				 facility_id, patient_id, encounter_type, status, chief_complaint,
				 admitting_staff_id, attending_staff_id, admission_datetime, discharge_datetime,
				 disposition, created_at, updated_at
			 )
			 values (
				 $1, $2, 'inpatient', 'pending_discharge', $3, $4, $4,
				 '2026-05-20T08:00:00', '2026-05-26T10:30:00', 'home', now(), now()
			 )
			 returning id`,
			[row.facility_id, patientId, DISCHARGE_CHIEF_COMPLAINT, row.doctor_staff_id]
		)
		const encounterId = encounter.rows[0].id as string

		await client.query(
			`insert into discharge_clearances (
				 encounter_id, facility_id, pharmacy_cleared_at, pharmacy_cleared_by_staff_id,
				 nursing_cleared_at, nursing_cleared_by_staff_id, billing_signed_off_at,
				 billing_signed_off_by_staff_id, created_at, updated_at
			 )
			 values ($1, $2, now(), $3, now(), $4, now(), $5, now(), now())`,
			[
				encounterId,
				row.facility_id,
				row.pharmacist_staff_id,
				row.nurse_staff_id,
				row.billing_staff_id,
			]
		)

		const charge = await client.query(
			`insert into charges (
				 facility_id, encounter_id, description, quantity, unit_price, total_amount,
				 source_type, created_by_staff_id, created_at
			 )
			 values ($1, $2, 'E2E inpatient room and services', 1, 1000.00, 1000.00, 'manual', $3, now())
			 returning id`,
			[row.facility_id, encounterId, row.billing_staff_id]
		)

		const invoice = await client.query(
			`insert into invoices (
				 facility_id, encounter_id, patient_id, invoice_number, subtotal, total_amount,
				 patient_responsibility, status, finalized_at, created_by_staff_id, created_at, updated_at
			 )
			 values ($1, $2, $3, $4, 1000.00, 1000.00, 1000.00, 'paid', now(), $5, now(), now())
			 returning id`,
			[
				row.facility_id,
				encounterId,
				patientId,
				`E2E-GP-${Date.now()}`,
				row.billing_staff_id,
			]
		)
		await client.query(
			`insert into invoice_line_items (
				 invoice_id, charge_id, description, quantity, unit_price, total_amount, created_at
			 )
			 values ($1, $2, 'E2E inpatient room and services', 1, 1000.00, 1000.00, now())`,
			[invoice.rows[0].id, charge.rows[0].id]
		)
		await client.query(
			`insert into payments (
				 facility_id, invoice_id, amount, payment_method, reference_number,
				 received_by_staff_id, payment_date, notes, created_at
			 )
			 values ($1, $2, 1000.00, 'cash', 'E2E-GP-CASH', $3, '2026-05-26', 'E2E gate pass clearance', now())`,
			[row.facility_id, invoice.rows[0].id, row.billing_staff_id]
		)

		if (options.clinicalComplete) {
			await client.query(
				`insert into clinical_notes (
					 facility_id, encounter_id, note_type, content, structured_data, status,
					 author_staff_id, signed_at, signed_ip, created_at, updated_at
				 )
				 values ($1, $2, 'discharge_summary', $3, $4::jsonb, 'signed', $5, now(), '127.0.0.1', now(), now())`,
				[
					row.facility_id,
					encounterId,
					"Patient discharged improved with follow-up instructions.",
					JSON.stringify({
						icd10_diagnosis: {
							icd10Code: "J18.9",
							icd10Display: "Pneumonia, unspecified organism",
						},
						plan: "Follow up with attending physician in 7 days.",
					}),
					row.doctor_staff_id,
				]
			)
		}

		return { encounterId }
	})
}

async function expectPrescriptionSendAudit(
	prescriptionId: string,
	channel: "patient_portal" | "email",
	email?: string
) {
	await expect
		.poll(
			async () =>
				withDb(async client => {
					const result = await client.query(
						`select metadata
						 from audit_logs
						 where entity_type = 'prescription'
						   and entity_id = $1
						   and action = 'update'
						   and metadata->>'operation' = 'sendPrescription'
						   and metadata->>'channel' = $2
						   and ($3::text is null or metadata->>'email' = $3)
						 order by created_at desc
						 limit 1`,
						[prescriptionId, channel, email ?? null]
					)
					return result.rowCount
				}),
			{ timeout: 15_000 }
		)
		.toBe(1)
}

async function expectGatePassIssued(encounterId: string) {
	await expect
		.poll(
			async () =>
				withDb(async client => {
					const result = await client.query(
						`select count(*)::int as n from gate_passes where encounter_id = $1`,
						[encounterId]
					)
					return result.rows[0]?.n ?? 0
				}),
			{ timeout: 15_000 }
		)
		.toBe(1)
}

test.describe.serial("Physician e-prescribing and inpatient discharge gates", () => {
	test.skip(!HAS_BACKEND, "Requires backend auth API and seeded clinical data")
	test.setTimeout(180_000)

	test.beforeAll(async () => {
		for (const email of ["doctor@qhealth.local", "registrar@qhealth.local"]) {
			authCookiesByEmail.set(email, await signInForCookies(email))
		}
	})

	test("physician sends a signed regular e-prescription to portal and email with audit evidence", async ({
		page,
	}) => {
		const fixture = await seedRegularErxFixture()

		await signInAs(page, "doctor@qhealth.local")
		await page.goto(`/patients/${fixture.patientId}/encounters/${fixture.encounterId}/e-prescription`)

		await expect(page.getByText(/e-Prescription.*Electronic Prescription System/i)).toBeVisible({
			timeout: 20_000,
		})
		await expect(page.getByText("Cetirizine").first()).toBeVisible()
		await page.getByRole("button", { name: /print \/ send/i }).click()

		const dialog = page.getByRole("dialog", { name: /^e-prescription$/i })
		await expect(dialog).toBeVisible()
		await expect(dialog.getByText(/signed prescriptions/i)).toBeVisible()

		await dialog.getByRole("button", { name: /patient portal/i }).click()
		await expectPrescriptionSendAudit(fixture.prescriptionId, "patient_portal")

		page.once("dialog", prompt => prompt.accept("erin.prescription@example.test"))
		await dialog.getByRole("button", { name: /send via email/i }).click()
		await expectPrescriptionSendAudit(
			fixture.prescriptionId,
			"email",
			"erin.prescription@example.test"
		)
	})

	test("registrar cannot issue inpatient gate pass until physician discharge documents are complete", async ({
		page,
	}) => {
		const incompleteFixture = await seedDischargeFixture({ clinicalComplete: false })

		await signInAs(page, "registrar@qhealth.local")
		await page.goto(`/registrar/discharge/${incompleteFixture.encounterId}`)

		await expect(page.getByRole("heading", { name: /discharge processing/i })).toBeVisible({
			timeout: 20_000,
		})
		await expect(page.getByText("Discharge Checklist", { exact: true })).toBeVisible()
		await expect(page.getByText("Discharge summary signed")).toBeVisible()
		await expect(page.getByText(/all discharge checklist items must be completed/i)).toBeVisible()
		await expect(page.getByRole("button", { name: /issue gate pass/i })).toBeDisabled()

		const completeFixture = await seedDischargeFixture({ clinicalComplete: true })
		await page.goto(`/registrar/discharge/${completeFixture.encounterId}`)

		await expect(page.getByText("Discharge Checklist", { exact: true })).toBeVisible()
		await expect(page.getByText(/all steps complete/i)).toBeVisible({ timeout: 20_000 })
		await expect(page.getByRole("button", { name: /issue gate pass/i })).toBeEnabled()
		await page.getByRole("button", { name: /issue gate pass/i }).click()

		await expect(page).toHaveURL(new RegExp(`/registrar/discharge/${completeFixture.encounterId}/gate-pass`), {
			timeout: 20_000,
		})
		await expectGatePassIssued(completeFixture.encounterId)
	})
})
