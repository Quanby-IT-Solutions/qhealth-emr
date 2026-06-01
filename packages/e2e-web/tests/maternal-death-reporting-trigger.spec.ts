import { expect, request, test, type Cookie, type Locator, type Page } from "@playwright/test"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Client } = require("pg")

const HAS_BACKEND = !!process.env.E2E_AUTH_API_URL
const AUTH_API = process.env.E2E_AUTH_API_URL ?? "http://localhost:3000/api/v1/auth/"
const WEB_ORIGIN = process.env.BASE_URL ?? "http://localhost:3001"
const DATABASE_URL =
	process.env.DATABASE_URL ?? "postgres://postgres:password@localhost:5432/qhealth-emr"
const DEFAULT_PASSWORD = process.env.E2E_SEED_PASSWORD ?? "Password123"

const ELIGIBLE_MRN = "E2E-64-FMDRF-ELIGIBLE"
const MALE_MRN = "E2E-64-FMDRF-MALE"
const CHILD_MRN = "E2E-64-FMDRF-CHILD"
const OLDER_MRN = "E2E-64-FMDRF-OLDER"
const TEST_MRNS = [ELIGIBLE_MRN, MALE_MRN, CHILD_MRN, OLDER_MRN] as const

type SeededCase = {
	patientId: string
	encounterId: string
	facilityId: string
	patientName: string
	mrn: string
}

type MaternalDeathFixture = {
	eligible: SeededCase
	male: SeededCase
	child: SeededCase
	older: SeededCase
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
}

async function seedMaternalDeathFixture(): Promise<MaternalDeathFixture> {
	return withDb(async client => {
		const doctor = await client.query(
			`select sp.id as staff_id, sp.facility_id
			 from users u
			 join staff_profiles sp on sp.user_id = u.id
			 where u.email = 'doctor@qhealth.local'
			 limit 1`
		)
		if (doctor.rowCount === 0) {
			throw new Error("Seed physician doctor@qhealth.local was not found.")
		}

		const staffId = doctor.rows[0].staff_id as string
		const facilityId = doctor.rows[0].facility_id as string

		await client.query(
			`delete from surveillance_flags
			 where encounter_id in (
			 	select e.id
			 	from encounters e
			 	join patients p on p.id = e.patient_id
			 	where p.mrn = any($1::text[])
			 )`,
			[TEST_MRNS]
		)
		await client.query(
			`delete from death_reports
			 where encounter_id in (
			 	select e.id
			 	from encounters e
			 	join patients p on p.id = e.patient_id
			 	where p.mrn = any($1::text[])
			 )`,
			[TEST_MRNS]
		)
		await client.query(
			`delete from encounters
			 where patient_id in (select id from patients where mrn = any($1::text[]))`,
			[TEST_MRNS]
		)
		await client.query(`delete from patients where mrn = any($1::text[])`, [TEST_MRNS])

		async function createCase(input: {
			mrn: string
			firstName: string
			lastName: string
			sex: "male" | "female"
			dateOfBirth: string
			chiefComplaint: string
			note?: boolean
		}): Promise<SeededCase> {
			const patient = await client.query(
				`insert into patients (
					facility_id, mrn, first_name, last_name, date_of_birth, sex,
					address_line1, city, province, phone
				)
				values ($1, $2, $3, $4, $5, $6, '123 E2E Maternal Street', 'Quezon City', 'Metro Manila', '09171234567')
				returning id`,
				[
					facilityId,
					input.mrn,
					input.firstName,
					input.lastName,
					input.dateOfBirth,
					input.sex,
				]
			)
			const encounter = await client.query(
				`insert into encounters (
					facility_id, patient_id, encounter_type, status, chief_complaint,
					admitting_staff_id, attending_staff_id, admission_datetime
				)
				values ($1, $2, 'emergency', 'active', $3, $4, $4, now() - interval '45 minutes')
				returning id`,
				[facilityId, patient.rows[0].id, input.chiefComplaint, staffId]
			)

			if (input.note ?? true) {
				await client.query(
					`insert into clinical_notes (
						facility_id, encounter_id, note_type, content, status, author_staff_id, signed_at
					)
					values ($1, $2, 'consultation', 'Signed E2E 6.4 disposition note', 'signed', $3, now())`,
					[facilityId, encounter.rows[0].id, staffId]
				)
			}

			return {
				patientId: patient.rows[0].id as string,
				encounterId: encounter.rows[0].id as string,
				facilityId,
				patientName: `${input.lastName}, ${input.firstName}`,
				mrn: input.mrn,
			}
		}

		return {
			eligible: await createCase({
				mrn: ELIGIBLE_MRN,
				firstName: "Eligible",
				lastName: "Fmdrf",
				sex: "female",
				dateOfBirth: "1995-05-17",
				chiefComplaint: "E2E 6.4 eligible maternal death trigger",
			}),
			male: await createCase({
				mrn: MALE_MRN,
				firstName: "Male",
				lastName: "Fmdrf",
				sex: "male",
				dateOfBirth: "1995-05-17",
				chiefComplaint: "E2E 6.4 male deceased negative",
			}),
			child: await createCase({
				mrn: CHILD_MRN,
				firstName: "Child",
				lastName: "Fmdrf",
				sex: "female",
				dateOfBirth: "2017-05-17",
				chiefComplaint: "E2E 6.4 under ten deceased negative",
			}),
			older: await createCase({
				mrn: OLDER_MRN,
				firstName: "Older",
				lastName: "Fmdrf",
				sex: "female",
				dateOfBirth: "1976-05-17",
				chiefComplaint: "E2E 6.4 over reproductive age deceased negative",
			}),
		}
	})
}

function fieldByLabel(page: Page, label: string | RegExp): Locator {
	return page.locator("label", { hasText: label }).locator("..").locator("input, textarea").first()
}

async function chooseSelectByLabel(page: Page, label: string | RegExp, optionName: RegExp) {
	await page.locator("label", { hasText: label }).locator("..").getByRole("combobox").click()
	await page.getByRole("option", { name: optionName }).click()
}

async function drawSignature(page: Page) {
	const canvas = page.locator("canvas").first()
	await expect(canvas).toBeVisible()
	await canvas.evaluate(element => {
		const canvasEl = element as HTMLCanvasElement
		const rect = canvasEl.getBoundingClientRect()
		const event = (type: string, x: number, y: number) =>
			new PointerEvent(type, {
				bubbles: true,
				cancelable: true,
				pointerId: 1,
				pointerType: "mouse",
				isPrimary: true,
				clientX: rect.left + x,
				clientY: rect.top + y,
			})
		canvasEl.dispatchEvent(event("pointerdown", 24, 70))
		canvasEl.dispatchEvent(event("pointermove", 130, 42))
		canvasEl.dispatchEvent(event("pointermove", 240, 88))
		canvasEl.dispatchEvent(event("pointerup", 240, 88))
	})
	await expect(page.getByText(/draw your signature above/i)).toHaveCount(0)
}

async function openEdDisposition(page: Page, patientName: string) {
	await page.goto("/ed")
	await expect(page.getByRole("heading", { name: /emergency department/i })).toBeVisible()
	const row = page.getByRole("row", { name: new RegExp(patientName, "i") })
	await expect(row).toBeVisible({ timeout: 20_000 })
	await row.getByRole("button", { name: /^dispose$/i }).click()
	const dialog = page.getByRole("dialog", { name: new RegExp(`ED Disposition.*${patientName}`, "i") })
	await expect(dialog).toBeVisible()
	return dialog
}

async function submitEligibleFmdrf(page: Page, fixture: SeededCase) {
	await expect(page.getByRole("heading", { name: /death reporting/i })).toBeVisible()
	await expect(page.getByRole("heading", { name: /facility maternal death review form/i })).toBeVisible()

	await expect(fieldByLabel(page, /^Full Name/)).toHaveValue(fixture.patientName)
	await expect(fieldByLabel(page, /^MRN/)).toHaveValue(fixture.mrn)
	await expect(fieldByLabel(page, /^Age at Death/)).toHaveValue("31")
	await expect(fieldByLabel(page, /^Address/)).toHaveValue(/123 E2E Maternal Street/)
	await expect(fieldByLabel(page, /^Place of Death/)).toHaveValue("Emergency Department")

	await fieldByLabel(page, /^Antecedent Cause/).fill("Retained placenta")
	await fieldByLabel(page, /^Underlying Cause/).fill("Pregnancy-related obstetric hemorrhage")
	await fieldByLabel(page, /^Contributing Conditions/).fill("Sepsis")
	await fieldByLabel(page, /^Gravidity/).fill("2")
	await fieldByLabel(page, /^Parity/).fill("1")
	await fieldByLabel(page, /^Last Menstrual Period/).fill("2025-09-01")
	await fieldByLabel(page, /^Gestational Age/).fill("37")
	await chooseSelectByLabel(page, /^Antenatal Care Received/, /yes/i)
	await fieldByLabel(page, /^ANC Visit Count/).fill("4")
	await fieldByLabel(page, /^Complication Type/).fill("Postpartum hemorrhage")
	await page.getByLabel("Hemorrhage").check()
	await page.getByLabel("Sepsis / Infection").check()
	await page.getByLabel("Eclampsia / Pre-eclampsia").check()
	await fieldByLabel(page, /^Other Contributing Factor/).fill("Delayed transfer")
	await page.getByLabel("Were avoidable factors identified?").check()
	await fieldByLabel(page, /^Avoidable Factor Remarks/).fill("Delayed recognition of severe bleeding")
	await fieldByLabel(page, /^Physician Name/).fill("Dr. Miguel Santos")
	await fieldByLabel(page, /^PRC License No/).fill("PRC-1234567")
	await fieldByLabel(page, /^Date of Certification/).fill("2026-05-21")
	await drawSignature(page)
	await page.locator('input[type="datetime-local"]').fill("2026-05-21T09:30")
	await page
		.getByPlaceholder(/J18\.9/)
		.fill("O72.1 - Other immediate postpartum hemorrhage")
	await page.getByPlaceholder(/Condition giving rise/).fill("Retained placenta")
	await page
		.getByPlaceholder(/Disease\/injury initiating/)
		.fill("Pregnancy-related obstetric hemorrhage")

	await expect(page.locator('input[type="datetime-local"]')).toHaveValue("2026-05-21T09:30")
	await expect(page.getByPlaceholder(/J18\.9/)).toHaveValue(
		"O72.1 - Other immediate postpartum hemorrhage"
	)
	await expect(page.getByRole("button", { name: /submit fmdrf/i })).toBeEnabled()

	await page.getByRole("button", { name: /submit fmdrf/i }).click()
	await expect(page.getByText("FMDRF Submitted")).toBeVisible({ timeout: 15_000 })
}

async function expectNoMaternalDeathModalFor(page: Page, patientName: string) {
	const dialog = await openEdDisposition(page, patientName)
	await dialog.getByRole("button", { name: /deceased/i }).click()
	await expect(page.getByRole("dialog", { name: /maternal death reporting required/i })).toHaveCount(0)
	await expect(dialog.getByRole("button", { name: /confirm disposition/i })).toBeEnabled()
	await page.keyboard.press("Escape")
	await expect(dialog).not.toBeVisible()
}

test.describe.serial("Maternal death reporting trigger (FMDRF)", () => {
	test.skip(!HAS_BACKEND, "Requires backend auth API and seeded clinical data")
	test.setTimeout(180_000)

	let fixture: MaternalDeathFixture

	test.beforeAll(async () => {
		fixture = await seedMaternalDeathFixture()
		authCookiesByEmail.set("doctor@qhealth.local", await signInForCookies("doctor@qhealth.local"))
	})

	test("eligible reproductive-age female deceased ED disposition is blocked until FMDRF is submitted", async ({
		page,
	}) => {
		await signInAs(page, "doctor@qhealth.local")
		const dialog = await openEdDisposition(page, fixture.eligible.patientName)

		await dialog.getByRole("button", { name: /deceased/i }).click()
		const alert = page.getByRole("dialog", { name: /maternal death reporting required/i })
		await expect(alert).toBeVisible()
		await expect(alert.getByText("FMDRF", { exact: true })).toBeVisible()
		await expect(alert.getByText(/facility maternal death review form/i)).toBeVisible()
		await expect(alert.getByRole("button", { name: /required/i })).toBeDisabled()

		const blockedState = await withDb(async client => {
			const result = await client.query(`select status, disposition from encounters where id = $1`, [
				fixture.eligible.encounterId,
			])
			return result.rows[0]
		})
		expect(blockedState).toMatchObject({ status: "active", disposition: null })

		await Promise.all([
			page.waitForURL(/\/death-report\?type=fmdrf/, { timeout: 15_000 }),
			alert.getByRole("button", { name: /complete fmdrf/i }).click(),
		])
		await submitEligibleFmdrf(page, fixture.eligible)

		await page.reload()
		await expect(page.getByRole("heading", { name: /facility maternal death review form/i })).toBeVisible()
		await expect(page.getByText("Submitted")).toBeVisible()
		await expect(fieldByLabel(page, /^Immediate Cause of Death/)).toHaveValue(
			"O72.1 - Other immediate postpartum hemorrhage"
		)
		await expect(fieldByLabel(page, /^Underlying Cause/)).toHaveValue(
			"Pregnancy-related obstetric hemorrhage"
		)

		await page.goto("/ed")
		const secondDialog = await openEdDisposition(page, fixture.eligible.patientName)
		await secondDialog.getByRole("button", { name: /deceased/i }).click()
		await expect(page.getByRole("dialog", { name: /maternal death reporting required/i })).toHaveCount(0)
		await secondDialog.getByRole("button", { name: /confirm disposition/i }).click()
		await expect(secondDialog).not.toBeVisible({ timeout: 10_000 })

		const finalState = await withDb(async client => {
			const encounter = await client.query(
				`select status, disposition, oecb_eligible from encounters where id = $1`,
				[fixture.eligible.encounterId]
			)
			const report = await client.query(
				`select id, status, maternal_history, physician_certification
				 from death_reports
				 where encounter_id = $1 and report_type = 'fmdrf'`,
				[fixture.eligible.encounterId]
			)
			const flags = await client.query(
				`select flag_type, trigger_value, is_reviewed
				 from surveillance_flags
				 where encounter_id = $1 and flag_type = 'mndrs_fmdrf'`,
				[fixture.eligible.encounterId]
			)
			return { encounter: encounter.rows[0], report: report.rows, flags: flags.rows }
		})

		expect(finalState.encounter).toMatchObject({
			status: "discharged",
			disposition: "deceased",
			oecb_eligible: false,
		})
		expect(finalState.report).toHaveLength(1)
		expect(finalState.report[0].status).toBe("submitted")
		expect(finalState.report[0].maternal_history.patientAddress).toContain("123 E2E Maternal Street")
		expect(finalState.report[0].physician_certification.prcLicenseNumber).toBe("PRC-1234567")
		expect(finalState.flags).toHaveLength(1)
		expect(finalState.flags[0]).toMatchObject({ flag_type: "mndrs_fmdrf", is_reviewed: false })
		expect(finalState.flags[0].trigger_value).toContain(finalState.report[0].id)
	})

	test("non-eligible deceased ED dispositions do not trigger FMDRF", async ({ page }) => {
		await signInAs(page, "doctor@qhealth.local")
		await expectNoMaternalDeathModalFor(page, fixture.male.patientName)
		await expectNoMaternalDeathModalFor(page, fixture.child.patientName)
		await expectNoMaternalDeathModalFor(page, fixture.older.patientName)

		await page.goto(
			`/patients/${fixture.male.patientId}/encounters/${fixture.male.encounterId}/death-report?type=fmdrf`
		)
		await expect(page.getByText(/does not meet the criteria for FMDRF or FNDRF reporting/i)).toBeVisible()
	})

	test("duplicate FMDRF for the same encounter is blocked by the unique encounter/type rule", async () => {
		const duplicateError = await withDb(async client => {
			try {
				await client.query(
					`insert into death_reports (
						facility_id, encounter_id, patient_id, report_type, death_datetime, cause_of_death, status
					)
					values ($1, $2, $3, 'fmdrf', now(), 'Duplicate E2E attempt', 'submitted')`,
					[fixture.eligible.facilityId, fixture.eligible.encounterId, fixture.eligible.patientId]
				)
				return null
			} catch (error) {
				return error as { code?: string; message?: string }
			}
		})

		expect(duplicateError?.code).toBe("23505")
	})
})
