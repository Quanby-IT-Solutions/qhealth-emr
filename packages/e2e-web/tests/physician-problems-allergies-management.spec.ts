import { expect, request, test, type Cookie, type Page } from "@playwright/test"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Client } = require("pg")

const HAS_BACKEND = !!process.env.E2E_AUTH_API_URL
const AUTH_API = process.env.E2E_AUTH_API_URL ?? "http://localhost:3000/api/v1/auth/"
const WEB_ORIGIN = process.env.BASE_URL ?? "http://localhost:3001"
const DATABASE_URL =
	process.env.DATABASE_URL ?? "postgres://postgres:password@localhost:5432/qhealth-emr"
const DEFAULT_PASSWORD = process.env.E2E_SEED_PASSWORD ?? "Password123"

const MRN = "E2E-PHYS-D5"
const PROBLEM_DESCRIPTION = "Essential hypertension - E2E physician managed"
const ALLERGEN_NAME = "E2E Penicillin allergy"

type ProblemAllergyFixture = {
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

async function signInAs(page: Page, email: string) {
	let cookies = authCookiesByEmail.get(email)
	if (!cookies) {
		cookies = await signInForCookies(email)
		authCookiesByEmail.set(email, cookies)
	}

	await page.context().clearCookies()
	await page.context().addCookies(cookies)
}

async function seedProblemAllergyFixture(): Promise<ProblemAllergyFixture> {
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
			 values ($1, $2, 'Paula', 'Problems', '1985-04-12', 'female', now(), now())
			 returning id`,
			[row.facility_id, MRN]
		)
		const patientId = patient.rows[0].id as string

		const encounter = await client.query(
			`insert into encounters (
				 facility_id, patient_id, encounter_type, status, chief_complaint,
				 admitting_staff_id, attending_staff_id, admission_datetime, created_at, updated_at
			 )
			 values ($1, $2, 'outpatient', 'active', 'E2E physician problem allergy management', $3, $3, now(), now(), now())
			 returning id`,
			[row.facility_id, patientId, row.doctor_staff_id]
		)

		return {
			patientId,
			encounterId: encounter.rows[0].id as string,
		}
	})
}

async function expectProblemAndAllergyLifecycle(patientId: string) {
	await expect
		.poll(
			async () =>
				withDb(async client => {
					const problem = await client.query(
						`select status, icd10_code
						 from problems
						 where patient_id = $1
						   and description = $2
						 order by created_at desc
						 limit 1`,
						[patientId, PROBLEM_DESCRIPTION]
					)
					const allergy = await client.query(
						`select is_active, is_verified, verified_at, verified_by_staff_id
						 from allergies
						 where patient_id = $1
						   and allergen_name = $2
						 order by created_at desc
						 limit 1`,
						[patientId, ALLERGEN_NAME]
					)
					return {
						problemStatus: problem.rows[0]?.status ?? null,
						problemIcd10: problem.rows[0]?.icd10_code ?? null,
						allergyActive: allergy.rows[0]?.is_active ?? null,
						allergyVerified: allergy.rows[0]?.is_verified ?? null,
						allergyHasVerifiedAt: Boolean(allergy.rows[0]?.verified_at),
						allergyHasVerifier: Boolean(allergy.rows[0]?.verified_by_staff_id),
					}
				}),
			{ timeout: 20_000 }
		)
		.toEqual({
			problemStatus: "entered_in_error",
			problemIcd10: "I10",
			allergyActive: false,
			allergyVerified: true,
			allergyHasVerifiedAt: true,
			allergyHasVerifier: true,
		})
}

test.describe("Physician problem list and allergy management", () => {
	test.skip(!HAS_BACKEND, "Requires backend auth API and seeded clinical data")
	test.setTimeout(120_000)

	test.beforeAll(async () => {
		authCookiesByEmail.set("doctor@qhealth.local", await signInForCookies("doctor@qhealth.local"))
	})

	test("physician manages coded problems and verifies allergies through the chart UI", async ({
		page,
	}) => {
		const fixture = await seedProblemAllergyFixture()

		await signInAs(page, "doctor@qhealth.local")
		await page.goto(`/patients/${fixture.patientId}/encounters/${fixture.encounterId}/problems-allergies`)

		await expect(page.getByText("Problem List", { exact: true })).toBeVisible({
			timeout: 20_000,
		})
		await expect(page.getByRole("button", { name: /add problem/i })).toBeVisible()

		await page.getByRole("button", { name: /add problem/i }).click()
		const problemDialog = page.getByRole("dialog", { name: /add problem/i })
		await problemDialog.getByLabel("Search ICD-10 codes").fill("I10")
		await expect(problemDialog.getByText("Essential (primary) hypertension")).toBeVisible({
			timeout: 20_000,
		})
		await problemDialog.getByText("Essential (primary) hypertension").click()
		await problemDialog.getByPlaceholder("Problem description").fill(PROBLEM_DESCRIPTION)
		await problemDialog.getByRole("button", { name: /^add problem$/i }).click()

		const activeProblemRow = page.getByRole("row").filter({ hasText: PROBLEM_DESCRIPTION })
		await expect(activeProblemRow).toBeVisible({ timeout: 20_000 })
		await expect(activeProblemRow.getByText("I10")).toBeVisible()

		await activeProblemRow.getByRole("button", { name: /resolve/i }).click()
		const resolveDialog = page.getByRole("dialog", { name: /mark problem as resolved/i })
		await resolveDialog.getByRole("button", { name: /mark resolved/i }).click()

		await page.getByRole("tab", { name: /^resolved$/i }).click()
		const resolvedProblemRow = page.getByRole("row").filter({ hasText: PROBLEM_DESCRIPTION })
		await expect(resolvedProblemRow).toBeVisible({ timeout: 20_000 })
		await resolvedProblemRow.getByRole("button", { name: /reactivate/i }).click()

		await page.getByRole("tab", { name: /^active$/i }).click()
		const reactivatedProblemRow = page.getByRole("row").filter({ hasText: PROBLEM_DESCRIPTION })
		await expect(reactivatedProblemRow).toBeVisible({ timeout: 20_000 })
		await reactivatedProblemRow.getByRole("button", { name: /entered in error/i }).click()
		await page.getByRole("alertdialog").getByRole("button", { name: /mark entered in error/i }).click()

		await page.getByRole("tab", { name: /entered in error/i }).click()
		await expect(page.getByRole("row").filter({ hasText: PROBLEM_DESCRIPTION })).toBeVisible({
			timeout: 20_000,
		})

		await page.getByRole("tab", { name: /^allergies$/i }).click()
		await expect(page.getByRole("button", { name: /add allergy/i })).toBeVisible()
		await page.getByRole("button", { name: /add allergy/i }).click()

		const allergyDialog = page.getByRole("dialog", { name: /add allergy/i })
		await allergyDialog.getByRole("combobox").nth(0).click()
		await page.getByRole("option", { name: "Medication" }).click()
		await allergyDialog.getByRole("combobox").nth(1).click()
		await page.getByRole("option", { name: "Severe" }).click()
		await allergyDialog.getByPlaceholder(/Anaphylaxis/i).fill("Anaphylaxis")
		await allergyDialog.getByPlaceholder("Search or enter allergen").fill(ALLERGEN_NAME)
		await allergyDialog.getByRole("button", { name: /^add allergy$/i }).click()

		const allergyRow = page.getByRole("row").filter({ hasText: ALLERGEN_NAME })
		await expect(allergyRow).toBeVisible({ timeout: 20_000 })
		await expect(allergyRow.getByText("Unverified")).toBeVisible()
		await expect(
			page.getByText(/unverified allergies are visible in the chart but do not block/i)
		).toBeVisible()

		await allergyRow.getByRole("button", { name: /^verify$/i }).click()
		await expect(allergyRow.getByText("Verified")).toBeVisible({ timeout: 20_000 })

		await allergyRow.getByRole("button", { name: /deactivate/i }).click()
		await page.getByRole("alertdialog").getByRole("button", { name: /^deactivate$/i }).click()
		await expect(page.getByText("No active allergies documented.")).toBeVisible({ timeout: 20_000 })

		await expectProblemAndAllergyLifecycle(fixture.patientId)
	})
})
