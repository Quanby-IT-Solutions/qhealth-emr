import { expect, request, test, type Cookie, type Locator, type Page } from "@playwright/test"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Client } = require("pg")

const HAS_BACKEND = !!process.env.E2E_AUTH_API_URL
const AUTH_API = process.env.E2E_AUTH_API_URL ?? "http://localhost:3000/api/v1/auth/"
const WEB_ORIGIN = process.env.BASE_URL ?? "http://localhost:3001"
const DATABASE_URL =
	process.env.DATABASE_URL ?? "postgres://postgres:password@localhost:5432/qhealth-emr"
const DEFAULT_PASSWORD = process.env.E2E_SEED_PASSWORD ?? "Password123"

const CASE_PROCEDURE_NAME = "E2E 9.2 Anesthesia Record Case"
const ENCOUNTER_CHIEF_COMPLAINT = "E2E 9.2 anesthesia charting encounter"
const AIRWAY_NOTES = "Direct laryngoscopy with oral ETT secured at 21 cm."
const PACU_NOTES = "Transferred to PACU awake, stable, and breathing spontaneously."

type AnesthesiaFixture = {
	caseId: string
	encounterId: string
	anesthesiologistName: string
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
		},
	})

	const authRes = await api.post("sign-in/email", {
		data: { email, password: DEFAULT_PASSWORD },
	})
	if (!authRes.ok()) {
		throw new Error(`Failed to sign in as ${email}: ${authRes.status()} ${await authRes.text()}`)
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
	await page.goto("/dashboard")

	let needsUiLogin = false
	try {
		await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible({
			timeout: 2_000,
		})
		needsUiLogin = true
	} catch {
		needsUiLogin = false
	}

	if (needsUiLogin) {
		await page.getByRole("textbox", { name: /^email$/i }).fill(email)
		await page.getByRole("textbox", { name: /^password$/i }).fill(DEFAULT_PASSWORD)
		await page.getByRole("button", { name: /^login$/i }).click()
		await expect(page.getByRole("heading", { name: /welcome back/i })).toHaveCount(0, {
			timeout: 15_000,
		})
	}
}

async function seedAnesthesiaFixture(): Promise<AnesthesiaFixture> {
	return withDb(async client => {
		const context = await client.query(
			`select
				 p.id as patient_id,
				 surgeon_sp.id as surgeon_staff_id,
				 surgeon_sp.facility_id as facility_id,
				 anesth_sp.id as anesthesiologist_staff_id,
				 anesth_user.name as anesthesiologist_name
			 from patients p
			 join staff_profiles surgeon_sp on true
			 join users surgeon_user on surgeon_user.id = surgeon_sp.user_id
			 join staff_profiles anesth_sp on anesth_sp.facility_id = surgeon_sp.facility_id
			 join users anesth_user on anesth_user.id = anesth_sp.user_id
			 where p.mrn = 'QH-000002'
			   and surgeon_user.email = 'surgeon@qhealth.local'
			   and anesth_user.email = 'anesthesiologist@qhealth.local'
			 limit 1`
		)

		if (context.rowCount === 0) {
			throw new Error("Seed patient, surgeon, or anesthesiologist account was not found.")
		}

		const row = context.rows[0]
		const existingEncounter = await client.query(
			`select id from encounters where chief_complaint = $1 limit 1`,
			[ENCOUNTER_CHIEF_COMPLAINT]
		)

		if (existingEncounter.rowCount > 0) {
			const encounterId = existingEncounter.rows[0].id as string
			await client.query(
				`delete from anesthesia_records where surgical_case_id in (
					select id from surgical_cases where encounter_id = $1
				)`,
				[encounterId]
			)
			await client.query(
				`delete from operation_records where surgical_case_id in (
					select id from surgical_cases where encounter_id = $1
				)`,
				[encounterId]
			)
			await client.query(`delete from surgical_cases where encounter_id = $1`, [encounterId])
			await client.query(`delete from encounters where id = $1`, [encounterId])
		}

		const encounter = await client.query(
			`insert into encounters (
				 facility_id,
				 patient_id,
				 encounter_type,
				 status,
				 chief_complaint,
				 admitting_staff_id,
				 attending_staff_id,
				 admission_datetime,
				 created_at,
				 updated_at
			 )
			 values ($1, $2, 'inpatient', 'active', $3, $4, $4, '2026-05-21T07:00:00', now(), now())
			 returning id`,
			[
				row.facility_id,
				row.patient_id,
				ENCOUNTER_CHIEF_COMPLAINT,
				row.surgeon_staff_id,
			]
		)
		const encounterId = encounter.rows[0].id as string

		const surgicalCase = await client.query(
			`insert into surgical_cases (
				 facility_id,
				 encounter_id,
				 patient_id,
				 procedure_name,
				 or_suite,
				 surgical_type,
				 surgeon_staff_id,
				 anesthesiologist_staff_id,
				 scheduled_datetime,
				 status,
				 estimated_duration_minutes,
				 created_at,
				 updated_at
			 )
			 values ($1, $2, $3, $4, 'OR-3', 'elective', $5, $6, '2026-05-21T08:00:00', 'scheduled', 120, now(), now())
			 returning id`,
			[
				row.facility_id,
				encounterId,
				row.patient_id,
				CASE_PROCEDURE_NAME,
				row.surgeon_staff_id,
				row.anesthesiologist_staff_id,
			]
		)

		return {
			caseId: surgicalCase.rows[0].id as string,
			encounterId,
			anesthesiologistName: row.anesthesiologist_name as string,
		}
	})
}

async function openAnesthesiaRecord(page: Page, fixture: AnesthesiaFixture) {
	await page.goto(`/surgical/${fixture.caseId}`)
	await expect(page.getByRole("heading", { name: CASE_PROCEDURE_NAME })).toBeVisible()
	await page.getByRole("tab", { name: /anesthesia record/i }).click()
	await expect(page.getByText("Patient Classification")).toBeVisible()
	await expect(page.getByText("Intraoperative Vitals Flowsheet")).toBeVisible()
}

async function selectCombobox(page: Page, index: number, optionName: RegExp) {
	await page.getByRole("combobox").nth(index).click()
	await page.getByRole("option", { name: optionName }).click()
}

function medicationRow(page: Page): Locator {
	return page.getByRole("row").filter({ has: page.getByPlaceholder("e.g. Cefazolin") }).first()
}

function vitalsRow(page: Page): Locator {
	return page.getByRole("row").filter({ has: page.getByPlaceholder("120/80") }).first()
}

async function addIncompleteMedication(page: Page) {
	await page.getByRole("button", { name: /add medication/i }).click()
	await medicationRow(page).getByPlaceholder("e.g. Cefazolin").fill("Propofol")
}

async function completeMedication(page: Page) {
	const row = medicationRow(page)
	await row.getByPlaceholder("e.g. 1g").fill("2 mg/kg")
	await row.getByPlaceholder("e.g. IV").fill("IV")
	await row.getByPlaceholder("HH:MM").fill("08:00")
	await row.getByPlaceholder("Optional").fill("Induction")
}

async function addIncompleteVitals(page: Page) {
	await page.getByRole("button", { name: /add entry/i }).click()
	const row = vitalsRow(page)
	await row.getByPlaceholder("HH:MM").fill("08:05")
	await row.getByPlaceholder("120/80").fill("120/80")
}

async function completeVitals(page: Page) {
	const row = vitalsRow(page)
	await row.getByPlaceholder("72").fill("72")
	await row.getByPlaceholder("98").fill("99")
	await row.getByPlaceholder("35").fill("35")
	await row.getByPlaceholder("36.5").fill("36.5")
}

async function fillRequiredAnesthesiaFields(page: Page) {
	await selectCombobox(page, 0, /^General$/)
	await selectCombobox(page, 1, /^ASA II\b/)
	await selectCombobox(page, 2, /^Oral ETT$/)
	await selectCombobox(page, 3, /^CL Grade I$/)
	await page.locator('input[type="number"]').first().fill("1")
	await page.getByPlaceholder("Additional airway management notes").fill(AIRWAY_NOTES)
	await page.getByPlaceholder("0").fill("90")
	await page.getByPlaceholder("e.g. Neostigmine").fill("Sugammadex")
	await page.getByPlaceholder("Any anesthesia-related complications").fill("None.")
	await page.getByPlaceholder("Post-anesthesia care unit notes").fill(PACU_NOTES)
}

async function expectSavedValues(page: Page) {
	await expect(page.getByText("General").first()).toBeVisible()
	await expect(page.getByText(/^ASA II/).first()).toBeVisible()
	await expect(page.getByText("Oral ETT").first()).toBeVisible()
	await expect(page.getByText("CL Grade I").first()).toBeVisible()
	await expect(page.getByPlaceholder("Additional airway management notes")).toHaveValue(AIRWAY_NOTES)
	await expect(medicationRow(page).getByPlaceholder("e.g. Cefazolin")).toHaveValue("Propofol")
	await expect(medicationRow(page).getByPlaceholder("e.g. 1g")).toHaveValue("2 mg/kg")
	await expect(medicationRow(page).getByPlaceholder("e.g. IV")).toHaveValue("IV")
	await expect(vitalsRow(page).getByPlaceholder("120/80")).toHaveValue("120/80")
	await expect(vitalsRow(page).getByPlaceholder("72")).toHaveValue("72")
	await expect(vitalsRow(page).getByPlaceholder("98")).toHaveValue("99")
	await expect(page.getByPlaceholder("0", { exact: true })).toHaveValue("90")
	await expect(page.getByPlaceholder("Post-anesthesia care unit notes")).toHaveValue(PACU_NOTES)
}

async function expectAnesthesiaRecordStatus(caseId: string, status: "draft" | "signed") {
	await expect
		.poll(
			async () =>
				withDb(async client => {
					const result = await client.query(
						`select status
						 from anesthesia_records
						 where surgical_case_id = $1
						 limit 1`,
						[caseId]
					)
					return result.rows[0]?.status ?? null
				}),
			{ timeout: 15_000 }
		)
		.toBe(status)
}

test.describe.serial("Anesthesia record charting", () => {
	test.skip(!HAS_BACKEND, "Requires backend auth API and seeded surgical data")
	test.setTimeout(240_000)

	let fixture: AnesthesiaFixture

	test.beforeAll(async () => {
		fixture = await seedAnesthesiaFixture()
		for (const email of ["anesthesiologist@qhealth.local", "surgeon@qhealth.local"]) {
			authCookiesByEmail.set(email, await signInForCookies(email))
		}
	})

	test("assigned anesthesiologist saves, signs, and locks anesthesia charting", async ({ page }) => {
		await signInAs(page, "anesthesiologist@qhealth.local")
		await openAnesthesiaRecord(page, fixture)

		await expect(page.getByRole("button", { name: /sign anesthesia record/i })).toBeDisabled()
		await expect(page.getByText(/anesthesia type/i).first()).toBeVisible()
		await expect(page.getByText(/ASA physical status class/i).first()).toBeVisible()
		await expect(page.getByText(/airway device/i).first()).toBeVisible()
		await expect(page.getByText(/Cormack-Lehane grade/i).first()).toBeVisible()
		await expect(page.getByText(/airway notes/i).first()).toBeVisible()
		await expect(page.getByText(/total anesthesia time/i).first()).toBeVisible()
		await expect(page.getByText(/at least one complete medication/i).first()).toBeVisible()
		await expect(page.getByText(/at least one complete intraoperative vital/i).first()).toBeVisible()

		await fillRequiredAnesthesiaFields(page)
		await addIncompleteMedication(page)
		await addIncompleteVitals(page)
		await expect(page.getByText(/at least one complete medication/i).first()).toBeVisible()
		await expect(page.getByText(/at least one complete intraoperative vital/i).first()).toBeVisible()
		await expect(page.getByRole("button", { name: /sign anesthesia record/i })).toBeDisabled()

		await completeMedication(page)
		await expect(page.getByText(/at least one complete medication/i)).toHaveCount(0)
		await expect(page.getByRole("button", { name: /sign anesthesia record/i })).toBeDisabled()

		await completeVitals(page)
		await expect(page.getByText(/at least one complete intraoperative vital/i)).toHaveCount(0)
		await expect(page.getByRole("button", { name: /sign anesthesia record/i })).toBeEnabled()

		await page.getByRole("button", { name: /save draft/i }).click()
		await expectAnesthesiaRecordStatus(fixture.caseId, "draft")

		await page.reload()
		await openAnesthesiaRecord(page, fixture)
		await expectSavedValues(page)
		await expect(page.getByRole("button", { name: /sign anesthesia record/i })).toBeEnabled()

		await page.getByRole("button", { name: /sign anesthesia record/i }).click()
		await expect(page.getByRole("alertdialog", { name: /sign and lock anesthesia record/i })).toBeVisible()
		await page.getByRole("button", { name: /^sign record$/i }).click()
		await expectAnesthesiaRecordStatus(fixture.caseId, "signed")
		await expect(page.getByText(/anesthesia record signed/i)).toBeVisible({ timeout: 20_000 })
		await expect(page.getByPlaceholder("Additional airway management notes")).toBeDisabled()
		await expect(page.getByRole("button", { name: /save draft/i })).toHaveCount(0)
		await expect(page.getByRole("button", { name: /sign anesthesia record/i })).toHaveCount(0)

		await page.reload()
		await openAnesthesiaRecord(page, fixture)
		await expect(page.getByText(/anesthesia record signed/i)).toBeVisible()
		await expectSavedValues(page)
		await expect(page.getByPlaceholder("Additional airway management notes")).toBeDisabled()

		const persisted = await withDb(async client =>
			client.query(
				`select status,
				        signed_at,
				        signed_by_staff_id,
				        anesthesia_type,
				        asa_class,
				        airway_type,
				        intubation_grade,
				        airway_management,
				        total_anesthesia_minutes,
				        intraop_medications,
				        intraop_vitals
				 from anesthesia_records
				 where surgical_case_id = $1`,
				[fixture.caseId]
			)
		)
		expect(persisted.rowCount).toBe(1)
		expect(persisted.rows[0]).toEqual(
			expect.objectContaining({
				status: "signed",
				anesthesia_type: "general",
				asa_class: "ASA II",
				airway_type: "oral_ett",
				intubation_grade: "CL1",
				airway_management: AIRWAY_NOTES,
				total_anesthesia_minutes: 90,
			})
		)
		expect(persisted.rows[0].signed_at).toBeTruthy()
		expect(persisted.rows[0].signed_by_staff_id).toBeTruthy()
		expect(persisted.rows[0].intraop_medications).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: "Propofol",
					dose: "2 mg/kg",
					route: "IV",
					time: "08:00",
					indication: "Induction",
				}),
			])
		)
		expect(persisted.rows[0].intraop_vitals).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					time: "08:05",
					bp: "120/80",
					hr: 72,
					spo2: 99,
					etco2: 35,
					temp: 36.5,
				}),
			])
		)
	})

	test("surgeon can view but cannot author or sign anesthesia record", async ({ page }) => {
		await signInAs(page, "surgeon@qhealth.local")
		await openAnesthesiaRecord(page, fixture)
		await expect(page.getByText(/view-only access/i)).toBeVisible()
		await expect(page.getByText(/anesthesia record signed/i)).toBeVisible()
		await expect(page.getByPlaceholder("Additional airway management notes")).toBeDisabled()
		await expect(page.getByRole("button", { name: /save draft/i })).toHaveCount(0)
		await expect(page.getByRole("button", { name: /sign anesthesia record/i })).toHaveCount(0)
	})
})
