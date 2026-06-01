import { expect, request, test, type Cookie, type Page } from "@playwright/test"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Client } = require("pg")

const HAS_BACKEND = !!process.env.E2E_AUTH_API_URL
const AUTH_API = process.env.E2E_AUTH_API_URL ?? "http://localhost:3000/api/v1/auth/"
const WEB_ORIGIN = process.env.BASE_URL ?? "http://localhost:3001"
const DATABASE_URL =
	process.env.DATABASE_URL ?? "postgres://postgres:password@localhost:5432/qhealth-emr"
const DEFAULT_PASSWORD = process.env.E2E_SEED_PASSWORD ?? "Password123"

const MRN = "E2E-PHYS-DOCS"
const FPE_MRN = "E2E-PHYS-FPE"
const CHIEF_COMPLAINT = "E2E physician SOAP documentation"
const FPE_CHIEF_COMPLAINT = "E2E physician FPE Konsulta capture"
const ADDENDUM_TEXT = "Addendum: patient was advised to return sooner for worsening dyspnea."

type DocumentationFixture = {
	patientId: string
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

async function warmDocumentationRoute() {
	const web = await request.newContext({ baseURL: WEB_ORIGIN })
	try {
		await web.get("/login", { timeout: 60_000 })
		await web.get("/patients/warm/encounters/warm/documentation", { timeout: 60_000 })
	} catch {
		// Turbopack compiles the route on first hit; auth/encounter outcome is irrelevant here.
	} finally {
		await web.dispose()
	}
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

async function seedDocumentationFixture(): Promise<DocumentationFixture> {
	return withDb(async client => {
		const context = await client.query(
			`select
				 f.id as facility_id,
				 doctor_sp.id as doctor_staff_id
			 from facilities f
			 join staff_profiles doctor_sp on doctor_sp.facility_id = f.id
			 join users doctor_user on doctor_user.id = doctor_sp.user_id
			 where doctor_user.email = 'doctor@qhealth.local'
			 limit 1`
		)
		if (context.rowCount === 0) {
			throw new Error("Seed physician doctor@qhealth.local was not found.")
		}
		const row = context.rows[0]

		const oldPatient = await client.query(`select id from patients where mrn = $1`, [MRN])
		if (oldPatient.rowCount > 0) {
			await client.query(`delete from encounters where patient_id = $1`, [oldPatient.rows[0].id])
			await client.query(`delete from patients where id = $1`, [oldPatient.rows[0].id])
		}

		const patient = await client.query(
			`insert into patients (
				 facility_id, mrn, first_name, last_name, date_of_birth, sex, created_at, updated_at
			 )
			 values ($1, $2, 'Diana', 'Documentation', '1991-08-17', 'female', now(), now())
			 returning id`,
			[row.facility_id, MRN]
		)
		const patientId = patient.rows[0].id as string

		const encounter = await client.query(
			`insert into encounters (
				 facility_id, patient_id, encounter_type, status, chief_complaint,
				 admitting_staff_id, attending_staff_id, admission_datetime, created_at, updated_at
			 )
			 values ($1, $2, 'outpatient', 'active', $3, $4, $4, now(), now(), now())
			 returning id`,
			[row.facility_id, patientId, CHIEF_COMPLAINT, row.doctor_staff_id]
		)

		return {
			patientId,
			encounterId: encounter.rows[0].id as string,
		}
	})
}

async function seedFpeFixture(): Promise<DocumentationFixture> {
	return withDb(async client => {
		const context = await client.query(
			`select
				 f.id as facility_id,
				 doctor_sp.id as doctor_staff_id
			 from facilities f
			 join staff_profiles doctor_sp on doctor_sp.facility_id = f.id
			 join users doctor_user on doctor_user.id = doctor_sp.user_id
			 where doctor_user.email = 'doctor@qhealth.local'
			 limit 1`
		)
		if (context.rowCount === 0) {
			throw new Error("Seed physician doctor@qhealth.local was not found.")
		}
		const row = context.rows[0]

		const oldPatient = await client.query(`select id from patients where mrn = $1`, [FPE_MRN])
		if (oldPatient.rowCount > 0) {
			await client.query(`delete from konsulta_activities where patient_id = $1`, [
				oldPatient.rows[0].id,
			])
			await client.query(`delete from consent_records where patient_id = $1`, [
				oldPatient.rows[0].id,
			])
			await client.query(`delete from encounters where patient_id = $1`, [oldPatient.rows[0].id])
			await client.query(`delete from patients where id = $1`, [oldPatient.rows[0].id])
		}

		const patient = await client.query(
			`insert into patients (
				 facility_id, mrn, first_name, last_name, date_of_birth, sex,
				 philhealth_member_id, created_at, updated_at
			 )
			 values ($1, $2, 'Feliza', 'Konsulta', '1985-02-04', 'female',
				 'PHIC-E2E-FPE-0001', now(), now())
			 returning id`,
			[row.facility_id, FPE_MRN]
		)
		const patientId = patient.rows[0].id as string

		const encounter = await client.query(
			`insert into encounters (
				 facility_id, patient_id, encounter_type, status, chief_complaint,
				 admitting_staff_id, attending_staff_id, admission_datetime, created_at, updated_at
			 )
			 values ($1, $2, 'outpatient', 'active', $3, $4, $4, now(), now(), now())
			 returning id`,
			[row.facility_id, patientId, FPE_CHIEF_COMPLAINT, row.doctor_staff_id]
		)

		await client.query(
			`insert into consent_records (
				 facility_id, encounter_id, patient_id, consent_type, signed_by_name,
				 relationship, content, signed_at, witness_staff_id, is_active,
				 consent_text, created_at, updated_at
			 )
			 values ($1, $2, $3, 'dpa', 'Feliza Konsulta', 'self',
				 'Data Privacy Act consent for Konsulta FPE submission',
				 now(), $4, true, 'DPA consent for E2E Konsulta FPE', now(), now())`,
			[row.facility_id, encounter.rows[0].id, patientId, row.doctor_staff_id]
		)

		return {
			patientId,
			encounterId: encounter.rows[0].id as string,
		}
	})
}

async function expectSignedNoteAndAddendum(encounterId: string) {
	await expect
		.poll(
			async () =>
				withDb(async client => {
					const result = await client.query(
						`select
							 cn.id,
							 cn.status,
							 cn.signed_at,
							 cn.content,
							 count(na.id)::int as addenda_count,
							 count(na.id) filter (where na.status = 'signed')::int as signed_addenda_count
						 from clinical_notes cn
						 left join note_addenda na on na.note_id = cn.id
						 where cn.encounter_id = $1
						   and cn.note_type = 'consultation'
						 group by cn.id
						 order by cn.created_at desc
						 limit 1`,
						[encounterId]
					)
					const row = result.rows[0]
					if (!row) return null
					return {
						status: row.status,
						hasSignedAt: Boolean(row.signed_at),
						hasSoapContent:
							typeof row.content === "string" &&
							row.content.includes("## Subjective") &&
							row.content.includes("Community-acquired pneumonia, improving."),
						addendaCount: row.addenda_count,
						signedAddendaCount: row.signed_addenda_count,
					}
				}),
			{ timeout: 20_000 }
		)
		.toEqual({
			status: "signed",
			hasSignedAt: true,
			hasSoapContent: true,
			addendaCount: 1,
			signedAddendaCount: 1,
		})
}

async function expectSignedFpeAndKonsultaActivity(encounterId: string) {
	await expect
		.poll(
			async () =>
				withDb(async client => {
					const result = await client.query(
						`select
							 cn.id,
							 cn.status,
							 cn.signed_at,
							 cn.structured_data,
							 ka.activity_type,
							 ka.activity_date,
							 al.id as audit_log_id
						 from clinical_notes cn
						 join encounters e on e.id = cn.encounter_id
						 left join konsulta_activities ka on ka.source_ref = cn.id::text
						 left join audit_logs al
						   on al.entity_id = cn.id
						  and al.entity_type = 'clinical_note'
						  and al.action = 'sign'
						 where cn.encounter_id = $1
						   and cn.note_type = 'fpe'
						 order by cn.created_at desc
						 limit 1`,
						[encounterId]
					)
					const row = result.rows[0]
					if (!row) return null
					return {
						status: row.status,
						hasSignedAt: Boolean(row.signed_at),
						chiefComplaint: row.structured_data?.chiefComplaint,
						diagnosisCode: row.structured_data?.primaryDiagnosis?.code,
						activityType: row.activity_type,
						hasActivityDate: Boolean(row.activity_date),
						hasAuditLog: Boolean(row.audit_log_id),
					}
				}),
			{ timeout: 20_000 }
		)
		.toEqual({
			status: "signed",
			hasSignedAt: true,
			chiefComplaint: "Annual Konsulta FPE visit with cough screening.",
			diagnosisCode: "Z00.0",
			activityType: "FPE",
			hasActivityDate: true,
			hasAuditLog: true,
		})
}

test.describe("Physician clinical documentation", () => {
	test.skip(!HAS_BACKEND, "Requires backend auth API and seeded clinical data")
	test.setTimeout(120_000)

	test.beforeAll(async () => {
		await warmDocumentationRoute()
		authCookiesByEmail.set("doctor@qhealth.local", await signInForCookies("doctor@qhealth.local"))
	})

	test("physician authors, signs, and amends a SOAP note through the chart UI", async ({
		page,
	}) => {
		const fixture = await seedDocumentationFixture()

		await signInAs(page, "doctor@qhealth.local")
		await page.goto(`/patients/${fixture.patientId}/encounters/${fixture.encounterId}/documentation`)

		await expect(page.getByText("Clinical Notes", { exact: true })).toBeVisible({
			timeout: 20_000,
		})
		await expect(page.getByText(/no clinical notes yet/i)).toBeVisible()

		await page.getByRole("button", { name: /new note/i }).click()
		await expect(page.getByText(/new clinical note/i)).toBeVisible()
		await page.getByText(/SOAP/i).first().click()

		await expect(page.getByRole("heading", { name: /SOAP|Consultation/i })).toBeVisible()
		await page
			.getByRole("textbox", { name: "Subjective" })
			.fill("Cough and fever improving after initial treatment.")
		await page
			.getByRole("textbox", { name: "Objective" })
			.fill("Afebrile, oxygen saturation stable on room air.")
		await page
			.getByRole("textbox", { name: "Assessment" })
			.fill("Community-acquired pneumonia, improving.")
		await page
			.getByRole("textbox", { name: "Plan" })
			.fill("Continue oral hydration and follow up in 48 hours.")

		await page.getByRole("button", { name: /save draft/i }).click()
		await expect(page.getByRole("button", { name: /^saved$/i })).toBeDisabled({
			timeout: 20_000,
		})
		await page.getByRole("button", { name: /^done$/i }).click()

		const noteButton = page.getByRole("button").filter({
			hasText: /Cough and fever improving/i,
		})
		await expect(noteButton).toBeVisible({ timeout: 20_000 })
		await noteButton.click()

		const dialog = page.getByRole("dialog")
		await expect(dialog.getByText("Draft", { exact: true })).toBeVisible()
		await dialog.getByRole("button", { name: /^sign note$/i }).click()

		await expect(dialog.getByText(/Signing as/i)).toBeVisible()
		await expect(dialog.getByText("PRC License No.", { exact: true })).toBeVisible()
		await expect(dialog.getByText("PTR No.", { exact: true })).toBeVisible()
		await dialog.getByRole("button", { name: /^sign note$/i }).click()

		await expect(dialog.getByText("Signed", { exact: true }).first()).toBeVisible({
			timeout: 20_000,
		})
		await expect(dialog.getByRole("button", { name: /^edit$/i })).toHaveCount(0)
		await dialog.getByRole("button", { name: /add addendum/i }).click()

		await dialog
			.getByPlaceholder(/Medication dosage correction/i)
			.fill("Additional discharge precaution")
		await dialog
			.getByPlaceholder(/Document the correction or additional information/i)
			.fill(ADDENDUM_TEXT)
		await dialog.getByRole("button", { name: /sign addendum/i }).click()

		await expect(dialog.getByText(ADDENDUM_TEXT)).toBeVisible({ timeout: 20_000 })
		await dialog.getByRole("tab", { name: /history/i }).click()
		await expect(dialog.getByText(/version trail/i)).toBeVisible()
		await expect(dialog.getByText(/2 versions/i)).toBeVisible()
		await expect(dialog.getByText(/Reason for amendment/i)).toBeVisible()

		await expectSignedNoteAndAddendum(fixture.encounterId)
	})

	test("physician completes PhilHealth FPE and records Konsulta capitation evidence", async ({
		page,
	}) => {
		const fixture = await seedFpeFixture()

		await signInAs(page, "doctor@qhealth.local")
		await page.goto(`/patients/${fixture.patientId}/encounters/${fixture.encounterId}/documentation`)

		await expect(page.getByText("Clinical Notes", { exact: true })).toBeVisible({
			timeout: 20_000,
		})
		await page.getByRole("button", { name: /new fpe/i }).click()
		await expect(page.getByText("FPE / Konsulta", { exact: true })).toBeVisible()
		await expect(page.getByRole("button", { name: /save draft/i })).toBeDisabled()
		await expect(page.getByRole("button", { name: /review & submit/i })).toBeDisabled()

		await page
			.getByPlaceholder(/patient's primary reason/i)
			.fill("Annual Konsulta FPE visit with cough screening.")
		await page
			.getByPlaceholder(/onset, duration/i)
			.fill("Mild cough for two days, no fever or shortness of breath.")
		await page
			.getByPlaceholder(/smoking, alcohol use/i)
			.fill("Non-smoker, no alcohol use, walks daily.")
		await page
			.getByPlaceholder(/mood, sleep/i)
			.fill("No mood concerns, sleeps well, denies self-harm risk.")
		await page.getByPlaceholder("mmHg").fill("118/76")
		await page.getByPlaceholder("kg").fill("62")
		await page.getByPlaceholder("cm").fill("162")
		await page.getByPlaceholder(/general findings/i).fill("Awake, ambulatory, not in distress.")
		await page.getByPlaceholder(/icd-10 code/i).fill("z00.0")
		await page.getByPlaceholder(/diagnosis description/i).fill("General medical examination")

		await page.getByRole("button", { name: /^save draft$/i }).click()
		await expect(page.getByText(/saved/i).first()).toBeVisible({ timeout: 20_000 })
		await expect(page.getByRole("button", { name: /review & submit/i })).toBeEnabled()

		await page.getByRole("button", { name: /review & submit/i }).click()
		await expect(page.getByText(/philhealth fpe - review & submit/i)).toBeVisible()
		await expect(page.getByText(/all required fields are complete/i)).toBeVisible()
		await page.getByRole("button", { name: /submit & archive fpe/i }).click()

		await expect(page.getByText(/fpe archived/i)).toBeVisible({ timeout: 20_000 })
		await expect(page.getByText(/konsulta capitation activity has been recorded/i)).toBeVisible()

		await expectSignedFpeAndKonsultaActivity(fixture.encounterId)
	})
})
