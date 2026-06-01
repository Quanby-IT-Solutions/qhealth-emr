import { expect, request, test, type Cookie, type Page } from "@playwright/test"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Client } = require("pg")

const HAS_BACKEND = !!process.env.E2E_AUTH_API_URL
const AUTH_API = process.env.E2E_AUTH_API_URL ?? "http://localhost:3000/api/v1/auth/"
const WEB_ORIGIN = process.env.BASE_URL ?? "http://localhost:3001"
const DATABASE_URL =
	process.env.DATABASE_URL ?? "postgres://postgres:password@localhost:5432/qhealth-emr"
const DEFAULT_PASSWORD = process.env.E2E_SEED_PASSWORD ?? "Password123"

const PROCEDURE_NAME = "E2E 9.1 Manual Test Laparoscopic Appendectomy"
const PRE_OP_DIAGNOSIS = "Acute appendicitis"
const POST_OP_DIAGNOSIS = "Acute suppurative appendicitis"
const PROCEDURE_PERFORMED = "Laparoscopic appendectomy"
const PROCEDURE_NARRATIVE =
	"Patient placed supine under general anesthesia. Abdomen prepared and draped. Pneumoperitoneum established and ports inserted under direct visualization."
const OPERATIVE_TECHNIQUE =
	"Appendix identified, mesoappendix divided, base secured, appendix removed via endoscopic retrieval bag. Peritoneal cavity irrigated and hemostasis confirmed."
const FINDINGS = "Inflamed appendix with localized exudate. No gross perforation."
const SPECIMENS = "Appendix sent to histopathology."

type SurgicalFixture = {
	caseId: string
	surgeonName: string
	anesthesiologistName: string
	nurseName: string
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

async function seedSurgicalCase(): Promise<SurgicalFixture> {
	return withDb(async client => {
		const context = await client.query(
			`select
				 p.id as patient_id,
				 e.id as encounter_id,
				 surgeon_sp.id as surgeon_staff_id,
				 surgeon_user.name as surgeon_name,
				 surgeon_sp.facility_id as facility_id,
				 anesth_sp.id as anesthesiologist_staff_id,
				 anesth_user.name as anesthesiologist_name,
				 nurse_sp.id as nurse_staff_id,
				 nurse_user.name as nurse_name
			 from patients p
			 left join encounters e on e.patient_id = p.id
			 join staff_profiles surgeon_sp on true
			 join users surgeon_user on surgeon_user.id = surgeon_sp.user_id
			 join staff_profiles anesth_sp on anesth_sp.facility_id = surgeon_sp.facility_id
			 join users anesth_user on anesth_user.id = anesth_sp.user_id
			 join staff_profiles nurse_sp on nurse_sp.facility_id = surgeon_sp.facility_id
			 join users nurse_user on nurse_user.id = nurse_sp.user_id
			 where p.mrn = 'QH-000002'
			   and surgeon_user.email = 'surgeon@qhealth.local'
			   and anesth_user.email = 'anesthesiologist@qhealth.local'
			   and nurse_user.email = 'nurse@qhealth.local'
			 order by e.created_at desc nulls last
			 limit 1`
		)

		if (context.rowCount === 0) {
			throw new Error("Seed patient, surgeon, anesthesiologist, or nurse account was not found.")
		}

		const row = context.rows[0]

		await client.query(
			`delete from operation_records
			 where surgical_case_id in (
			 	select id from surgical_cases where procedure_name = $1
			 )`,
			[PROCEDURE_NAME]
		)
		await client.query(`delete from surgical_cases where procedure_name = $1`, [PROCEDURE_NAME])

		const inserted = await client.query(
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
			 values ($1, $2, $3, $4, 'OR-1', 'elective', $5, $6, '2026-05-21T08:00:00', 'scheduled', 120, now(), now())
			 returning id`,
			[
				row.facility_id,
				row.encounter_id,
				row.patient_id,
				PROCEDURE_NAME,
				row.surgeon_staff_id,
				row.anesthesiologist_staff_id,
			]
		)

		return {
			caseId: inserted.rows[0].id as string,
			surgeonName: row.surgeon_name as string,
			anesthesiologistName: row.anesthesiologist_name as string,
			nurseName: row.nurse_name as string,
		}
	})
}

async function openOperationRecord(page: Page, fixture: SurgicalFixture) {
	await page.goto(`/surgical/${fixture.caseId}`)
	await expect(page.getByRole("heading", { name: PROCEDURE_NAME })).toBeVisible()
	await page.getByRole("tab", { name: /operation record/i }).click()
	await expect(page.getByText("Operation Record Status")).toBeVisible()
	await expect(page.getByText("OR Personnel")).toBeVisible()
}

async function fillStaffCombobox(page: Page, id: string, name: string) {
	const input = page.getByTestId(id)
	await input.click()
	await input.fill(name)
	await page.getByText(name, { exact: true }).last().click()
	await expect(input).toHaveValue(name)
}

async function fillOperationRecord(page: Page, fixture: SurgicalFixture) {
	await page.getByPlaceholder("Pre-op diagnosis").fill(PRE_OP_DIAGNOSIS)
	await page.getByPlaceholder("Post-op diagnosis").fill(POST_OP_DIAGNOSIS)
	await page
		.getByPlaceholder("List each performed procedure on its own line for RVS mapping.")
		.fill(PROCEDURE_PERFORMED)
	await page
		.getByPlaceholder("Narrative description for documentation and export...")
		.fill(PROCEDURE_NARRATIVE)
	await page.getByPlaceholder("Describe operative technique...").fill(OPERATIVE_TECHNIQUE)
	await page.getByPlaceholder("Intraoperative findings...").fill(FINDINGS)
	await page.getByPlaceholder("Specimen type and destination...").fill(SPECIMENS)
	await page.getByPlaceholder("Note any intraoperative complications...").fill("None.")

	const numberInputs = page.locator('input[type="number"]')
	await numberInputs.nth(0).fill("50")
	await numberInputs.nth(1).fill("1000")
	await numberInputs.nth(2).fill("200")

	const dateInputs = page.locator('input[type="datetime-local"]')
	await dateInputs.nth(0).fill("2026-05-21T09:00")
	await dateInputs.nth(1).fill("2026-05-21T10:15")

	await fillStaffCombobox(page, "scrub-nurse", fixture.nurseName)
	await fillStaffCombobox(page, "circulating-nurse", fixture.nurseName)
	await fillStaffCombobox(page, "anesthesiologist", fixture.anesthesiologistName)

	await page.locator('label[for="instrument-count"]').click()
	await page.locator('label[for="swab-count"]').click()
}

async function expectRecordValues(page: Page, fixture: SurgicalFixture) {
	await expect(page.getByPlaceholder("Pre-op diagnosis")).toHaveValue(PRE_OP_DIAGNOSIS)
	await expect(page.getByPlaceholder("Post-op diagnosis")).toHaveValue(POST_OP_DIAGNOSIS)
	await expect(
		page.getByPlaceholder("List each performed procedure on its own line for RVS mapping.")
	).toHaveValue(PROCEDURE_PERFORMED)
	await expect(page.getByPlaceholder("Narrative description for documentation and export...")).toHaveValue(
		PROCEDURE_NARRATIVE
	)
	await expect(page.getByPlaceholder("Describe operative technique...")).toHaveValue(OPERATIVE_TECHNIQUE)
	const dateInputs = page.locator('input[type="datetime-local"]')
	await expect(dateInputs.nth(0)).toHaveValue("2026-05-21T09:00")
	await expect(dateInputs.nth(1)).toHaveValue("2026-05-21T10:15")
	await expect(page.getByTestId("scrub-nurse")).toHaveValue(fixture.nurseName)
	await expect(page.getByTestId("circulating-nurse")).toHaveValue(fixture.nurseName)
	await expect(page.getByTestId("anesthesiologist")).toHaveValue(fixture.anesthesiologistName)
}

test.describe.serial("Operative record charting", () => {
	test.skip(!HAS_BACKEND, "Requires backend auth API and seeded surgical data")
	test.setTimeout(180_000)

	let fixture: SurgicalFixture

	test.beforeAll(async () => {
		fixture = await seedSurgicalCase()
		for (const email of ["surgeon@qhealth.local", "anesthesiologist@qhealth.local"]) {
			authCookiesByEmail.set(email, await signInForCookies(email))
		}
	})

	test("assigned surgeon saves, validates timestamps, signs, and locks the operation record", async ({
		page,
	}) => {
		await signInAs(page, "surgeon@qhealth.local")
		await page.goto("/surgical")
		await expect(page.getByRole("heading", { name: /surgical services/i })).toBeVisible()
		await expect(page.getByText(PROCEDURE_NAME)).toBeVisible({ timeout: 20_000 })
		await page.getByText(PROCEDURE_NAME).click()

		await openOperationRecord(page, fixture)
		await expect(page.getByText("Draft").first()).toBeVisible()
		await expect(page.locator("input:disabled").first()).toHaveValue(fixture.surgeonName)

		await expect(page.getByRole("button", { name: /sign operation record/i })).toBeDisabled()
		await expect(page.getByText(/procedure narrative/i).first()).toBeVisible()
		await expect(page.getByText(/operative technique/i).first()).toBeVisible()
		await expect(page.getByText(/incision time/i).first()).toBeVisible()
		await expect(page.getByText(/closure time/i).first()).toBeVisible()
		await expect(page.getByText(/scrub nurse/i).first()).toBeVisible()
		await expect(page.getByText(/circulating nurse/i).first()).toBeVisible()
		await expect(page.getByText(/anesthesiologist/i).first()).toBeVisible()

		await fillOperationRecord(page, fixture)
		await page.getByRole("button", { name: /save operation record/i }).click()
		await expect(page.getByRole("button", { name: /save operation record/i })).toBeEnabled({
			timeout: 20_000,
		})

		await page.reload()
		await openOperationRecord(page, fixture)
		await expectRecordValues(page, fixture)
		await expect(page.getByText("Draft").first()).toBeVisible()

		const dateInputs = page.locator('input[type="datetime-local"]')
		await dateInputs.nth(1).fill("2026-05-21T08:30")
		await expect(page.getByText(/closure time must be after incision time/i)).toBeVisible()
		await expect(page.getByRole("button", { name: /save operation record/i })).toBeDisabled()
		await expect(page.getByRole("button", { name: /sign operation record/i })).toBeDisabled()
		await dateInputs.nth(1).fill("2026-05-21T10:15")

		await page.getByRole("button", { name: /sign operation record/i }).click()
		await expect(page.getByText("Signed").first()).toBeVisible({ timeout: 20_000 })
		await expect(page.getByText(/signed by/i)).toBeVisible()
		await expect(page.getByText(/edits are disabled after signing/i)).toBeVisible()
		await expect(page.getByPlaceholder("Pre-op diagnosis")).toBeDisabled()
		await expect(page.getByRole("button", { name: /save operation record/i })).toBeDisabled()
		await expect(page.getByRole("button", { name: /^signed$/i })).toBeDisabled()

		await page.reload()
		await openOperationRecord(page, fixture)
		await expect(page.getByText("Signed").first()).toBeVisible()
		await expectRecordValues(page, fixture)
		await expect(page.getByPlaceholder("Pre-op diagnosis")).toBeDisabled()

		const persisted = await withDb(async client =>
			client.query(
				`select sc.status as case_status,
				        op.status as operation_status,
				        op.signed_at,
				        op.signed_by_staff_id,
				        op.incision_time,
				        op.closure_time,
				        op.scrub_nurse_staff_id,
				        op.circulating_nurse_staff_id,
				        op.anesthesiologist_staff_id
				 from surgical_cases sc
				 join operation_records op on op.surgical_case_id = sc.id
				 where sc.id = $1`,
				[fixture.caseId]
			)
		)
		expect(persisted.rowCount).toBe(1)
		expect(persisted.rows[0].case_status).toBe("completed")
		expect(persisted.rows[0].operation_status).toBe("signed")
		expect(persisted.rows[0].signed_at).toBeTruthy()
		expect(persisted.rows[0].signed_by_staff_id).toBeTruthy()
		expect(persisted.rows[0].incision_time).toBeTruthy()
		expect(persisted.rows[0].closure_time).toBeTruthy()
		expect(persisted.rows[0].scrub_nurse_staff_id).toBeTruthy()
		expect(persisted.rows[0].circulating_nurse_staff_id).toBeTruthy()
		expect(persisted.rows[0].anesthesiologist_staff_id).toBeTruthy()
	})

	test("assigned anesthesiologist can view but cannot author or sign the surgeon operation record", async ({
		page,
	}) => {
		await signInAs(page, "anesthesiologist@qhealth.local")
		await page.goto(`/surgical/${fixture.caseId}`)
		await expect(page.getByRole("heading", { name: PROCEDURE_NAME })).toBeVisible()
		await page.getByRole("tab", { name: /operation record/i }).click()
		await expect(page.getByText(/view-only access/i)).toBeVisible()
		await expect(page.getByText("Signed").first()).toBeVisible()
		await expect(page.getByPlaceholder("Pre-op diagnosis")).toBeDisabled()
		await expect(page.getByRole("button", { name: /save operation record/i })).toHaveCount(0)
		await expect(page.getByRole("button", { name: /sign operation record/i })).toHaveCount(0)
	})
})
