import { expect, request, test, type APIRequestContext, type Cookie, type Locator, type Page } from "@playwright/test"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Client } = require("pg")

const HAS_BACKEND = !!process.env.E2E_AUTH_API_URL
const AUTH_API = process.env.E2E_AUTH_API_URL ?? "http://localhost:3000/api/v1/auth/"
const API_BASE = process.env.E2E_API_BASE_URL ?? "http://localhost:3000/api/v1/"
const WEB_ORIGIN = process.env.BASE_URL ?? "http://localhost:3001"
const DATABASE_URL =
	process.env.DATABASE_URL ?? "postgres://postgres:password@localhost:5432/qhealth-emr"
const DEFAULT_PASSWORD = process.env.E2E_SEED_PASSWORD ?? "Password123"

const NEONATE_MRN = "E2E-65-FNDRF-NEONATE"
const BOUNDARY_MRN = "E2E-65-FNDRF-BOUNDARY-28"
const NON_NEONATE_MRN = "E2E-65-FNDRF-NON-NEONATE"
const TEST_MRNS = [NEONATE_MRN, BOUNDARY_MRN, NON_NEONATE_MRN] as const

type SeededCase = {
	patientId: string
	encounterId: string
	facilityId: string
	patientName: string
	mrn: string
	dateOfBirth: string
}

type NeonatalDeathFixture = {
	neonate: SeededCase
	boundary: SeededCase
	nonNeonate: SeededCase
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

async function authenticatedApi(email: string): Promise<APIRequestContext> {
	const cookies = authCookiesByEmail.get(email)
	if (cookies) {
		return request.newContext({
			baseURL: API_BASE,
			extraHTTPHeaders: {
				"Content-Type": "application/json",
				Origin: WEB_ORIGIN,
			},
			storageState: { cookies, origins: [] },
		})
	}

	const api = await request.newContext({
		baseURL: API_BASE,
		extraHTTPHeaders: {
			"Content-Type": "application/json",
			Origin: WEB_ORIGIN,
		},
	})
	const authRes = await api.post("auth/sign-in/email", {
		data: { email, password: DEFAULT_PASSWORD },
	})
	if (!authRes.ok()) {
		throw new Error(`Failed to sign in API as ${email}: ${authRes.status()} ${await authRes.text()}`)
	}
	return api
}

async function seedNeonatalDeathFixture(): Promise<NeonatalDeathFixture> {
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
			dateOfBirth: string
			chiefComplaint: string
		}): Promise<SeededCase> {
			const patient = await client.query(
				`insert into patients (
					facility_id, mrn, first_name, last_name, date_of_birth, sex,
					address_line1, city, province, phone
				)
				values ($1, $2, $3, $4, $5, 'male', '456 E2E Neonatal Street', 'Quezon City', 'Metro Manila', '09171234567')
				returning id`,
				[facilityId, input.mrn, input.firstName, input.lastName, input.dateOfBirth]
			)
			const encounter = await client.query(
				`insert into encounters (
					facility_id, patient_id, encounter_type, status, chief_complaint,
					admitting_staff_id, attending_staff_id, admission_datetime
				)
				values ($1, $2, 'emergency', 'active', $3, $4, $4, now() - interval '30 minutes')
				returning id`,
				[facilityId, patient.rows[0].id, input.chiefComplaint, staffId]
			)
			await client.query(
				`insert into clinical_notes (
					facility_id, encounter_id, note_type, content, status, author_staff_id, signed_at
				)
				values ($1, $2, 'consultation', 'Signed E2E 6.5 disposition note', 'signed', $3, now())`,
				[facilityId, encounter.rows[0].id, staffId]
			)

			return {
				patientId: patient.rows[0].id as string,
				encounterId: encounter.rows[0].id as string,
				facilityId,
				patientName: `${input.lastName}, ${input.firstName}`,
				mrn: input.mrn,
				dateOfBirth: input.dateOfBirth,
			}
		}

		return {
			neonate: await createCase({
				mrn: NEONATE_MRN,
				firstName: "Neonate",
				lastName: "Fndrf",
				dateOfBirth: "2026-05-18",
				chiefComplaint: "E2E 6.5 neonatal death trigger",
			}),
			boundary: await createCase({
				mrn: BOUNDARY_MRN,
				firstName: "Boundary",
				lastName: "Fndrf",
				dateOfBirth: "2026-04-23",
				chiefComplaint: "E2E 6.5 exact twenty eight day neonatal death trigger",
			}),
			nonNeonate: await createCase({
				mrn: NON_NEONATE_MRN,
				firstName: "Older",
				lastName: "Fndrf",
				dateOfBirth: "2026-04-22",
				chiefComplaint: "E2E 6.5 twenty nine day non-neonate negative",
			}),
		}
	})
}

function fieldByLabel(page: Page, label: string | RegExp): Locator {
	return page.locator("label", { hasText: label }).locator("..").locator("input, textarea").first()
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
		canvasEl.dispatchEvent(event("pointerdown", 24, 72))
		canvasEl.dispatchEvent(event("pointermove", 130, 40))
		canvasEl.dispatchEvent(event("pointermove", 250, 86))
		canvasEl.dispatchEvent(event("pointerup", 250, 86))
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

async function openEdDispositionByMrn(page: Page, mrn: string) {
	await page.goto("/ed")
	await expect(page.getByRole("heading", { name: /emergency department/i })).toBeVisible()
	const row = page.getByRole("row", { name: new RegExp(mrn, "i") })
	await expect(row).toBeVisible({ timeout: 20_000 })
	await row.getByRole("button", { name: /^dispose$/i }).click()
	const dialog = page.getByRole("dialog", { name: /ED Disposition/i })
	await expect(dialog).toBeVisible()
	return dialog
}

async function fillValidFndrf(page: Page, fixture: SeededCase) {
	await expect(page.getByRole("heading", { name: /death reporting/i })).toBeVisible()
	await expect(page.getByRole("heading", { name: /facility neonatal death review form/i })).toBeVisible()

	await expect(fieldByLabel(page, /^Newborn Name/)).toHaveValue(fixture.patientName)
	await expect(fieldByLabel(page, /^MRN/)).toHaveValue(fixture.mrn)
	await expect(fieldByLabel(page, /^Date of Birth/)).toHaveValue(/2026-05-18|2026-04-23/)
	await expect(fieldByLabel(page, /^Place of Death/)).toHaveValue("Emergency Department")
	await expect(fieldByLabel(page, /^Physician Name/)).toHaveValue(/Dr\. Miguel Santos/)

	await expect(page.getByRole("button", { name: /submit fndrf/i })).toBeDisabled()
	await expect(page.getByLabel("Resuscitation efforts performed")).toBeVisible()

	await fieldByLabel(page, /APGAR Score.*1 min/).fill("6")
	await fieldByLabel(page, /APGAR Score.*5 min/).fill("8")
	await page.getByLabel("Resuscitation efforts performed").check()
	await fieldByLabel(page, /^Mother.*Full Name/).fill("Maria Santos")
	await fieldByLabel(page, /^Mother.*Age/).fill("26")
	await fieldByLabel(page, /^Gravidity/).fill("1")
	await fieldByLabel(page, /^Parity/).fill("1")
	await fieldByLabel(page, /^ANC Visits/).fill("4")
	await fieldByLabel(page, /^Age at Death.*hours/).fill("12")
	await fieldByLabel(page, /^Age at Death.*days/).fill("0")
	await fieldByLabel(page, /^Place of Death/).fill("NICU")
	await page.getByPlaceholder(/Describe any contributing factors/i).fill(
		"Initial neonatal hypoxia with sepsis watch"
	)
	await fieldByLabel(page, /^Physician Name/).fill("Dr. Miguel Santos")
	await fieldByLabel(page, /^PRC License No/).fill("PRC-7654321")
	await fieldByLabel(page, /^Date of Certification/).fill("2026-05-21")
	await drawSignature(page)

	await fieldByLabel(page, /^Gestational Age/).fill("36")
	await fieldByLabel(page, /^Birth Weight/).fill("2400")
	await page.locator('input[type="datetime-local"]').nth(1).fill("2026-05-21T09:30")
	await expect(page.getByRole("button", { name: /submit fndrf/i })).toBeDisabled()
	await page.getByLabel("Birth Asphyxia").check()
	await expect(page.getByRole("button", { name: /submit fndrf/i })).toBeEnabled()

	await page.getByRole("button", { name: /submit fndrf/i }).click()
	await expect(page.getByText("FNDRF Submitted")).toBeVisible({ timeout: 15_000 })
	await expect(page.getByText(/submitted for MNDRS review/i)).toBeVisible()
}

async function expectNeonatalAlert(page: Page, patientName: string) {
	const dialog = await openEdDisposition(page, patientName)
	await dialog.getByRole("button", { name: /deceased/i }).click()
	const alert = page.getByRole("dialog", { name: /neonatal death reporting required/i })
	await expect(alert).toBeVisible({ timeout: 15_000 })
	await expect(alert.getByText("FNDRF", { exact: true })).toBeVisible()
	await expect(alert.getByText(/facility neonatal death review form/i)).toBeVisible()
	await expect(alert.getByRole("button", { name: /required/i })).toBeDisabled()
	return { dialog, alert }
}

async function expectNeonatalAlertByMrn(page: Page, mrn: string) {
	const dialog = await openEdDispositionByMrn(page, mrn)
	await dialog.getByRole("button", { name: /deceased/i }).click()
	const alert = page.getByRole("dialog", { name: /neonatal death reporting required/i })
	await expect(alert).toBeVisible({ timeout: 15_000 })
	await expect(alert.getByText("FNDRF", { exact: true })).toBeVisible()
	await expect(alert.getByText(/facility neonatal death review form/i)).toBeVisible()
	await expect(alert.getByRole("button", { name: /required/i })).toBeDisabled()
	return { dialog, alert }
}

test.describe.serial("Neonatal death reporting trigger (FNDRF)", () => {
	test.skip(!HAS_BACKEND, "Requires backend auth API and seeded clinical data")
	test.setTimeout(180_000)

	let fixture: NeonatalDeathFixture

	test.beforeAll(async () => {
		fixture = await seedNeonatalDeathFixture()
		authCookiesByEmail.set("doctor@qhealth.local", await signInForCookies("doctor@qhealth.local"))
	})

	test("neonate deceased ED disposition is blocked until FNDRF is submitted", async ({ page }) => {
		await signInAs(page, "doctor@qhealth.local")
		const { alert } = await expectNeonatalAlert(page, fixture.neonate.patientName)

		const blockedState = await withDb(async client => {
			const result = await client.query(`select status, disposition from encounters where id = $1`, [
				fixture.neonate.encounterId,
			])
			return result.rows[0]
		})
		expect(blockedState).toMatchObject({ status: "active", disposition: null })

		await Promise.all([
			page.waitForURL(/\/death-report\?type=fndrf/, { timeout: 15_000 }),
			alert.getByRole("button", { name: /complete fndrf/i }).click(),
		])
		await fillValidFndrf(page, fixture.neonate)

		await page.reload()
		await expect(page.getByRole("heading", { name: /facility neonatal death review form/i })).toBeVisible()
		await expect(page.getByText("Submitted")).toBeVisible()
		await expect(fieldByLabel(page, /^Birth Weight/)).toHaveValue("2400")
		await expect(fieldByLabel(page, /^Mother.*Full Name/)).toHaveValue("Maria Santos")
		await expect(page.getByLabel("Birth Asphyxia")).toBeChecked()

		await page.goto("/ed")
		const secondDialog = await openEdDisposition(page, fixture.neonate.patientName)
		await secondDialog.getByRole("button", { name: /deceased/i }).click()
		await expect(page.getByRole("dialog", { name: /neonatal death reporting required/i })).toHaveCount(0)
		await secondDialog.getByRole("button", { name: /confirm disposition/i }).click()
		await expect(secondDialog).not.toBeVisible({ timeout: 10_000 })

		const finalState = await withDb(async client => {
			const encounter = await client.query(
				`select status, disposition, oecb_eligible from encounters where id = $1`,
				[fixture.neonate.encounterId]
			)
			const report = await client.query(
				`select id, status, submitted_at, neonatal_details, physician_certification, cause_of_death
				 from death_reports
				 where encounter_id = $1 and report_type = 'fndrf'`,
				[fixture.neonate.encounterId]
			)
			const flags = await client.query(
				`select flag_type, trigger_value, is_reviewed
				 from surveillance_flags
				 where encounter_id = $1 and flag_type = 'mndrs_fndrf'`,
				[fixture.neonate.encounterId]
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
		expect(finalState.report[0].submitted_at).toBeTruthy()
		expect(finalState.report[0].cause_of_death).toContain("Birth Asphyxia")
		expect(finalState.report[0].neonatal_details).toMatchObject({
			birthWeight: 2400,
			gestationalAgeWeeks: 36,
			resuscitationRequired: true,
			motherName: "Maria Santos",
			motherAge: 26,
			placeOfDeath: "NICU",
		})
		expect(finalState.report[0].physician_certification.prcLicenseNumber).toBe("PRC-7654321")
		expect(finalState.flags).toHaveLength(1)
		expect(finalState.flags[0]).toMatchObject({ flag_type: "mndrs_fndrf", is_reviewed: false })
		expect(finalState.flags[0].trigger_value).toContain(finalState.report[0].id)
	})

	test("existing FNDRF loads and updates the same record", async ({ page }) => {
		await signInAs(page, "doctor@qhealth.local")
		const before = await withDb(async client => {
			const result = await client.query(
				`select id from death_reports where encounter_id = $1 and report_type = 'fndrf'`,
				[fixture.neonate.encounterId]
			)
			return result.rows[0].id as string
		})

		await page.goto(
			`/patients/${fixture.neonate.patientId}/encounters/${fixture.neonate.encounterId}/death-report?type=fndrf`
		)
		await expect(page.getByText("Submitted")).toBeVisible()
		await page.getByRole("button", { name: /^edit$/i }).click()
		await page.getByPlaceholder(/Describe any contributing factors/i).fill(
			"Updated E2E FNDRF contributing remarks"
		)
		await page.getByRole("button", { name: /update fndrf/i }).click()
		await expect(page.getByText("FNDRF Submitted")).toBeVisible({ timeout: 15_000 })

		const after = await withDb(async client => {
			const result = await client.query(
				`select id, status, contributing_factors
				 from death_reports
				 where encounter_id = $1 and report_type = 'fndrf'`,
				[fixture.neonate.encounterId]
			)
			return result.rows
		})
		expect(after).toHaveLength(1)
		expect(after[0].id).toBe(before)
		expect(after[0].status).toBe("submitted")
		expect(after[0].contributing_factors[0].factor).toBe("Updated E2E FNDRF contributing remarks")
	})

	test("exactly 28-day neonate triggers FNDRF and 29-day patient does not", async ({ page }) => {
		await signInAs(page, "doctor@qhealth.local")
		await expectNeonatalAlertByMrn(page, fixture.boundary.mrn)
		await page.keyboard.press("Escape")

		const dialog = await openEdDisposition(page, fixture.nonNeonate.patientName)
		await dialog.getByRole("button", { name: /deceased/i }).click()
		await expect(page.getByRole("dialog", { name: /neonatal death reporting required/i })).toHaveCount(0)
		await expect(dialog.getByRole("button", { name: /confirm disposition/i })).toBeEnabled()
		await page.keyboard.press("Escape")

		await page.goto(
			`/patients/${fixture.nonNeonate.patientId}/encounters/${fixture.nonNeonate.encounterId}/death-report?type=fndrf`
		)
		await expect(page.getByText(/does not meet the criteria for FMDRF or FNDRF reporting/i)).toBeVisible()
	})

	test("backend rejects FNDRF creation for a non-neonate encounter", async () => {
		const api = await authenticatedApi("doctor@qhealth.local")
		const response = await api.post("death-reporting/fndrf", {
			data: {
				encounterId: fixture.nonNeonate.encounterId,
				patientId: fixture.nonNeonate.patientId,
				facilityId: fixture.nonNeonate.facilityId,
				newbornName: fixture.nonNeonate.patientName,
				newbornMrn: fixture.nonNeonate.mrn,
				newbornDateOfBirth: `${fixture.nonNeonate.dateOfBirth}T00:00`,
				gestationalAgeWeeks: 36,
				birthWeightGrams: 2400,
				deliveryType: "svd",
				apgarScore1Min: 6,
				apgarScore5Min: 8,
				resuscitationRequired: true,
				motherName: "Maria Santos",
				motherAge: 26,
				motherGravidity: 1,
				motherParity: 1,
				motherAncVisits: 4,
				dateOfDeath: "2026-05-21T09:30",
				ageAtDeathHours: 0,
				ageAtDeathDays: 29,
				placeOfDeath: "Emergency Department",
				causePrematurity: false,
				causeBirthAsphyxia: true,
				causeSepsis: false,
				causeCongenitalAnomaly: false,
				causeRds: false,
				causeOther: null,
				contributingRemarks: null,
				physicianName: "Dr. Miguel Santos",
				physicianLicenseNo: "PRC-7654321",
				physicianSignatureDataUrl: "data:image/png;base64,ZTI2LWZuZHJm",
				certificationDate: "2026-05-21",
			},
		})
		expect(response.status()).toBe(400)
		await expect(response.text()).resolves.toContain("FNDRF is required only for neonates")
		await api.dispose()
	})
})
