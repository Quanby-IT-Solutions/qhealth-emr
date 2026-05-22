import { expect, request, test, type Cookie, type Page } from "@playwright/test"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Client } = require("pg")

const HAS_BACKEND = !!process.env.E2E_AUTH_API_URL
const AUTH_API = process.env.E2E_AUTH_API_URL ?? "http://localhost:3000/api/v1/auth/"
const WEB_ORIGIN = process.env.BASE_URL ?? "http://localhost:3001"
const DATABASE_URL =
	process.env.DATABASE_URL ?? "postgres://postgres:password@localhost:5432/qhealth-emr"
const DEFAULT_PASSWORD = process.env.E2E_SEED_PASSWORD ?? "Password123"

const CASE_PROCEDURE_NAME = "E2E 9.3 RVS Mapping Case"
const ENCOUNTER_CHIEF_COMPLAINT = "E2E 9.3 surgical RVS readiness encounter"
const PROCEDURE_PERFORMED = "Appendectomy\nExploratory laparotomy"
const PROCEDURE_NARRATIVE =
	"Appendectomy and exploratory laparotomy performed under general anesthesia with sterile technique."
const OPERATIVE_TECHNIQUE =
	"Right lower quadrant incision made, appendix mobilized and removed. Midline exploration completed with hemostasis confirmed."

type RvsFixture = {
	caseId: string
	encounterId: string
	facilityId: string
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

async function seedRvsFixture(): Promise<RvsFixture> {
	return withDb(async client => {
		const context = await client.query(
			`select
				 p.id as patient_id,
				 surgeon_sp.id as surgeon_staff_id,
				 surgeon_user.name as surgeon_name,
				 surgeon_sp.facility_id as facility_id,
				 anesth_sp.id as anesthesiologist_staff_id,
				 anesth_user.name as anesthesiologist_name,
				 nurse_sp.id as nurse_staff_id,
				 nurse_user.name as nurse_name
			 from patients p
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
			 limit 1`
		)

		if (context.rowCount === 0) {
			throw new Error("Seed patient, surgeon, anesthesiologist, or nurse account was not found.")
		}

		const row = context.rows[0]

		await client.query(
			`insert into rvs_codes (rvs_code, procedure_name, category, rvs_value, effective_date, is_active)
			 values
			 	('44950', 'Appendectomy', 'Surgery', 6.50, '2024-01-01', true),
			 	('49000', 'Exploratory laparotomy', 'Surgery', 7.50, '2024-01-01', true)
			 on conflict (rvs_code) do update
			 set procedure_name = excluded.procedure_name,
			     category = excluded.category,
			     rvs_value = excluded.rvs_value,
			     is_active = true`
		)

		await client.query(
			`insert into role_permissions (role_id, module, action)
			 select r.id, 'billing', 'sign'
			 from roles r
			 join staff_profiles sp on sp.facility_id = r.facility_id
			 join users u on u.id = sp.user_id
			 where u.email = 'billing@qhealth.local'
			   and r.name = 'Billing Officer'
			   and not exists (
			   	select 1 from role_permissions rp
			   	where rp.role_id = r.id and rp.module = 'billing' and rp.action = 'sign'
			   )`
		)

		const existingEncounter = await client.query(
			`select id
			 from encounters
			 where chief_complaint = $1
			 limit 1`,
			[ENCOUNTER_CHIEF_COMPLAINT]
		)

		if (existingEncounter.rowCount > 0) {
			const encounterId = existingEncounter.rows[0].id as string
			await client.query(
				`delete from cf5_status_log where claim_id in (
					select id from cf5_claims where encounter_id = $1
				)`,
				[encounterId]
			)
			await client.query(`delete from cf5_claims where encounter_id = $1`, [encounterId])
			await client.query(`delete from drg_mappings where encounter_id = $1`, [encounterId])
			await client.query(
				`delete from surgical_rvs_assignments where surgical_case_id in (
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
			 values ($1, $2, $3, $4, 'OR-2', 'elective', $5, $6, '2026-05-21T08:00:00', 'scheduled', 120, now(), now())
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

		await client.query(
			`insert into drg_mappings (
				 encounter_id,
				 drg_code,
				 drg_description,
				 confidence,
				 is_manual_override,
				 confirmed_by_staff_id,
				 confirmed_at,
				 created_at
			 )
			 values ($1, 'DRG-RESP-001', 'Medical respiratory infection', 0.9200, true, $2, now(), now())`,
			[encounterId, row.surgeon_staff_id]
		)

		return {
			caseId: surgicalCase.rows[0].id as string,
			encounterId,
			facilityId: row.facility_id as string,
			surgeonName: row.surgeon_name as string,
			anesthesiologistName: row.anesthesiologist_name as string,
			nurseName: row.nurse_name as string,
		}
	})
}

async function fillStaffCombobox(page: Page, id: string, name: string) {
	const input = page.getByTestId(id)
	await input.click()
	await input.fill(name)
	await page.getByText(name, { exact: true }).last().click()
	await expect(input).toHaveValue(name)
}

async function openSurgicalCase(page: Page, fixture: RvsFixture) {
	await page.goto(`/surgical/${fixture.caseId}`)
	await expect(page.getByRole("heading", { name: CASE_PROCEDURE_NAME })).toBeVisible()
}

async function fillAndSaveOperationRecord(page: Page, fixture: RvsFixture) {
	await page.getByRole("tab", { name: /operation record/i }).click()
	await page.getByPlaceholder("Pre-op diagnosis").fill("Acute appendicitis")
	await page.getByPlaceholder("Post-op diagnosis").fill("Acute appendicitis with adhesions")
	await page
		.getByPlaceholder("List each performed procedure on its own line for RVS mapping.")
		.fill(PROCEDURE_PERFORMED)
	await page
		.getByPlaceholder("Narrative description for documentation and export...")
		.fill(PROCEDURE_NARRATIVE)
	await page.getByPlaceholder("Describe operative technique...").fill(OPERATIVE_TECHNIQUE)

	const numberInputs = page.locator('input[type="number"]')
	await numberInputs.nth(0).fill("75")
	await numberInputs.nth(1).fill("1200")
	await numberInputs.nth(2).fill("250")

	const dateInputs = page.locator('input[type="datetime-local"]')
	await dateInputs.nth(0).fill("2026-05-21T09:00")
	await dateInputs.nth(1).fill("2026-05-21T10:30")

	await fillStaffCombobox(page, "scrub-nurse", fixture.nurseName)
	await fillStaffCombobox(page, "circulating-nurse", fixture.nurseName)
	await fillStaffCombobox(page, "anesthesiologist", fixture.anesthesiologistName)
	await page.locator('label[for="instrument-count"]').click()
	await page.locator('label[for="swab-count"]').click()

	await page.getByRole("button", { name: /save operation record/i }).click()
	await expect(page.getByRole("button", { name: /save operation record/i })).toBeEnabled({
		timeout: 20_000,
	})
}

async function mapPrimaryRvsCode(page: Page, procedureLabel: string, searchText: string, code: string) {
	await page.getByRole("tab", { name: /rvs codes/i }).click()
	await page.getByRole("button", { name: new RegExp(procedureLabel, "i") }).click()
	await page.locator("#rvsSearch").fill(searchText)
	await expect(page.getByText(code).first()).toBeVisible({ timeout: 15_000 })
	await page.getByRole("button", { name: /^suggest$/i }).first().click()
	await page.getByRole("button", { name: /^add$/i }).click()
	await expect(page.getByRole("cell", { name: code })).toBeVisible({ timeout: 15_000 })
	await expect(page.getByText("Suggested").first()).toBeVisible()
}

async function validateAndFinalizeVisibleAssignment(page: Page, code: string) {
	await page.getByRole("tab", { name: /rvs codes/i }).click()
	await expect(page.getByRole("cell", { name: code })).toBeVisible({ timeout: 15_000 })
	await page.getByRole("button", { name: /^validate$/i }).first().click()
	await expect(page.getByText("Validated").first()).toBeVisible({ timeout: 15_000 })
	await page.getByRole("button", { name: /^finalize$/i }).first().click()
	await expect(page.getByText("Finalized").first()).toBeVisible({ timeout: 15_000 })
}

async function expectCf5Blocked(page: Page, fixture: RvsFixture, missingProcedure: string) {
	await page.goto(`/billing/encounters/${fixture.encounterId}/drg/cf5`)
	await expect(page.getByRole("heading", { name: /cf5.*drg shadow billing/i })).toBeVisible({
		timeout: 20_000,
	})
	await expect(page.getByText(/cf5 is blocked until every signed operative procedure/i)).toBeVisible()
	await expect(page.getByText(missingProcedure).first()).toBeVisible()
	await expect(page.getByRole("button", { name: /generate cf5/i })).toBeDisabled()
}

async function expectCf5Ready(page: Page, fixture: RvsFixture) {
	await page.goto(`/billing/encounters/${fixture.encounterId}/drg/cf5`)
	await expect(page.getByRole("heading", { name: /cf5.*drg shadow billing/i })).toBeVisible({
		timeout: 20_000,
	})
	await expect(page.getByText(/surgical prerequisite check passed/i)).toBeVisible()
	await expect(page.getByText(/finalized primary rvs code/i)).toBeVisible()
	await expect(page.getByRole("button", { name: /generate cf5/i })).toBeEnabled()
}

async function expectOperationRecordStatus(caseId: string, status: "draft" | "signed") {
	await expect
		.poll(
			async () =>
				withDb(async client => {
					const result = await client.query(
						`select op.status
						 from operation_records op
						 where op.surgical_case_id = $1
						 limit 1`,
						[caseId]
					)
					return result.rows[0]?.status ?? null
				}),
			{ timeout: 15_000 }
		)
		.toBe(status)
}

test.describe.serial("RVS code capture for surgical procedures", () => {
	test.skip(!HAS_BACKEND, "Requires backend auth API and seeded surgical/billing data")
	test.setTimeout(240_000)

	let fixture: RvsFixture

	test.beforeAll(async () => {
		fixture = await seedRvsFixture()
		for (const email of [
			"surgeon@qhealth.local",
			"anesthesiologist@qhealth.local",
			"billing@qhealth.local",
		]) {
			authCookiesByEmail.set(email, await signInForCookies(email))
		}
	})

	test("surgeon maps signed procedures and billing validates/finalizes RVS codes for CF5 readiness", async ({
		page,
	}) => {
		await signInAs(page, "surgeon@qhealth.local")
		await openSurgicalCase(page, fixture)
		await fillAndSaveOperationRecord(page, fixture)
		await expectOperationRecordStatus(fixture.caseId, "draft")

		await page.getByRole("tab", { name: /rvs codes/i }).click()
		await expect(
			page.getByText(/sign the operative record before mapping, validating, or finalizing rvs codes/i)
		).toBeVisible()
		await page.locator("#rvsSearch").fill("appendectomy")
		await expect(page.getByText("44950").first()).toBeVisible({ timeout: 15_000 })
		await expect(page.getByRole("button", { name: /^suggest$/i }).first()).toBeDisabled()

		await page.getByRole("tab", { name: /operation record/i }).click()
		await page.reload()
		await openSurgicalCase(page, fixture)
		await page.getByRole("tab", { name: /operation record/i }).click()
		await expect(page.getByRole("button", { name: /sign operation record/i })).toBeEnabled()
		await page.getByRole("button", { name: /sign operation record/i }).click()
		await expectOperationRecordStatus(fixture.caseId, "signed")
		await expect(page.getByText(/^Signed$/).first()).toBeVisible({ timeout: 20_000 })

		await signInAs(page, "anesthesiologist@qhealth.local")
		await openSurgicalCase(page, fixture)
		await expect(page.getByRole("tab", { name: /rvs codes/i })).toHaveCount(0)

		await signInAs(page, "surgeon@qhealth.local")
		await openSurgicalCase(page, fixture)
		await mapPrimaryRvsCode(page, "Appendectomy", "appendectomy", "44950")
		await expect(page.getByText(/1 procedure still need/i)).toBeVisible()

		await signInAs(page, "billing@qhealth.local")
		await openSurgicalCase(page, fixture)
		await validateAndFinalizeVisibleAssignment(page, "44950")
		await expect(page.getByLabel(/remove 44950/i)).toHaveCount(0)
		await expectCf5Blocked(page, fixture, "Exploratory laparotomy")

		await signInAs(page, "surgeon@qhealth.local")
		await openSurgicalCase(page, fixture)
		await mapPrimaryRvsCode(page, "Exploratory laparotomy", "exploratory", "49000")

		await signInAs(page, "billing@qhealth.local")
		await openSurgicalCase(page, fixture)
		await validateAndFinalizeVisibleAssignment(page, "49000")
		await expect(
			page.getByText(/all procedures mapped with finalized primary rvs codes/i)
		).toBeVisible()
		await expect(page.getByLabel(/remove 49000/i)).toHaveCount(0)
		await expectCf5Ready(page, fixture)

		const persisted = await withDb(async client =>
			client.query(
				`select procedure_label, rvs_code, assignment_type, status
				 from surgical_rvs_assignments
				 where surgical_case_id = $1
				 order by procedure_label`,
				[fixture.caseId]
			)
		)
		expect(persisted.rowCount).toBe(2)
		expect(persisted.rows).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					procedure_label: "Appendectomy",
					rvs_code: "44950",
					assignment_type: "primary",
					status: "finalized",
				}),
				expect.objectContaining({
					procedure_label: "Exploratory laparotomy",
					rvs_code: "49000",
					assignment_type: "primary",
					status: "finalized",
				}),
			])
		)
	})
})
