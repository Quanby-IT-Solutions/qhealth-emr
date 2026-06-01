import { expect, request, test, type Page } from "@playwright/test"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Client } = require("pg")

const HAS_BACKEND = !!process.env.E2E_AUTH_API_URL
const AUTH_API = process.env.E2E_AUTH_API_URL ?? "http://localhost:3000/api/v1/auth/"
const WEB_ORIGIN = process.env.BASE_URL ?? "http://localhost:3001"
const DATABASE_URL =
	process.env.DATABASE_URL ?? "postgres://postgres:password@localhost:5432/qhealth-emr"
const DEFAULT_PASSWORD = process.env.E2E_SEED_PASSWORD ?? "Password123"

const OECB_CRITERIA = [
	"Patient was not admitted as inpatient",
	"Emergency care was rendered",
	"Patient has active PhilHealth membership",
] as const

type OecbFixture = {
	encounterId: string
	patientId: string
	edPatientName: string
	billingPatientName: string
	mrn: string
}

async function withDb<T>(fn: (client: typeof Client.prototype) => Promise<T>): Promise<T> {
	const client = new Client({ connectionString: DATABASE_URL })
	await client.connect()
	try {
		return await fn(client)
	} finally {
		await client.end()
	}
}

async function createOecbFixture(): Promise<OecbFixture> {
	const unique = Date.now().toString(36)
	const mrn = `OECB-${unique}`.toUpperCase()
	const firstName = "E2E"
	const lastName = `OECB ${unique}`
	const edPatientName = `${lastName}, ${firstName}`
	const billingPatientName = `${firstName} ${lastName}`

	return withDb(async client => {
		const staffResult = await client.query(
			`select sp.id as staff_id, sp.facility_id
			 from staff_profiles sp
			 join users u on u.id = sp.user_id
			 where u.email = 'doctor@qhealth.local'
			   and sp.is_active = true
			 order by sp.created_at asc
			 limit 1`
		)
		const staff = staffResult.rows[0]
		if (!staff?.staff_id || !staff?.facility_id) {
			throw new Error("Seed physician doctor@qhealth.local was not found.")
		}

		const patientResult = await client.query(
			`insert into patients (
				 facility_id,
				 mrn,
				 first_name,
				 last_name,
				 date_of_birth,
				 sex,
				 philhealth_member_id,
				 phone,
				 is_active
			 )
			 values ($1, $2, $3, $4, '1984-02-14', 'male', 'PHIC-E2E-OECB', '09170000003', true)
			 returning id`,
			[staff.facility_id, mrn, firstName, lastName]
		)
		const patientId = patientResult.rows[0].id as string

		const encounterResult = await client.query(
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
			 values ($1, $2, 'emergency', 'active', 'E2E OECB emergency care rendered', $3, $3, now(), now(), now())
			 returning id`,
			[staff.facility_id, patientId, staff.staff_id]
		)
		const encounterId = encounterResult.rows[0].id as string

		await client.query(
			`insert into clinical_notes (
				 facility_id,
				 encounter_id,
				 note_type,
				 content,
				 structured_data,
				 status,
				 author_staff_id,
				 signed_at,
				 signed_ip,
				 created_at,
				 updated_at
			 )
			 values ($1, $2, 'consultation', 'Signed E2E OECB disposition note', '{}'::jsonb, 'signed', $3, now(), '127.0.0.1', now(), now())`,
			[staff.facility_id, encounterId, staff.staff_id]
		)

		await client.query(
			`insert into encounter_status_events (
				 facility_id,
				 encounter_id,
				 from_status,
				 to_status,
				 workflow_type,
				 staff_id,
				 notes,
				 occurred_at,
				 created_at
			 )
			 values ($1, $2, null, 'being_seen', 'ed', $3, 'E2E active ED queue item', now(), now())`,
			[staff.facility_id, encounterId, staff.staff_id]
		)

		return { encounterId, patientId, edPatientName, billingPatientName, mrn }
	})
}

async function expectOecbRoutingEvidence(encounterId: string) {
	await expect
		.poll(
			async () =>
				withDb(async client => {
					const result = await client.query(
						`select
							 e.status,
							 e.disposition,
							 e.oecb_eligible,
							 e.discharge_datetime is not null as has_discharge_datetime,
							 exists (
								 select 1
								 from encounter_status_events ese
								 where ese.encounter_id = e.id
								   and ese.workflow_type = 'billing'
								   and ese.to_status = 'ready_for_billing'
								   and ese.notes ilike '%OECB%'
							 ) as has_billing_routing_event
						 from encounters e
						 where e.id = $1`,
						[encounterId]
					)
					const row = result.rows[0]
					if (!row) return null
					return {
						status: row.status,
						disposition: row.disposition,
						oecbEligible: row.oecb_eligible,
						hasDischargeDatetime: row.has_discharge_datetime,
						hasBillingRoutingEvent: row.has_billing_routing_event,
					}
				}),
			{ timeout: 20_000 }
		)
		.toEqual({
			status: "discharged",
			disposition: "home",
			oecbEligible: true,
			hasDischargeDatetime: true,
			hasBillingRoutingEvent: true,
		})
}

async function signInAs(page: Page, email: string) {
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
	await page.context().clearCookies()
	await page.context().addCookies(cookies)
	await api.dispose()
}

test.describe("OECB ED disposition to billing queue visibility", () => {
	test.skip(!HAS_BACKEND, "Requires backend auth API and seeded ED encounter data")

	test("physician can discharge ED patient with OECB tag and billing sees it in queue", async ({
		page,
	}) => {
		test.setTimeout(90_000)
		const fixture = await createOecbFixture()

		await signInAs(page, "doctor@qhealth.local")
		await page.goto("/ed")
		await expect(page.getByRole("heading", { name: /emergency department/i })).toBeVisible()

		const fixtureRow = page.getByRole("row").filter({ hasText: fixture.mrn }).first()
		await expect(fixtureRow).toBeVisible({ timeout: 15_000 })
		await fixtureRow.getByRole("button", { name: "Dispose" }).click()

		const dialog = page.getByRole("dialog", { name: /ed disposition/i })
		await expect(dialog).toBeVisible()
		await expect(dialog.getByRole("heading").first()).toContainText(fixture.edPatientName)

		await dialog.getByRole("button", { name: /discharge/i }).click()
		await expect(dialog.getByText(/OECB Eligibility Checklist/i)).toBeVisible()

		for (const criterion of OECB_CRITERIA) {
			await dialog.getByText(criterion, { exact: true }).click()
		}
		await dialog.getByText(/Tag as OECB/i).click()
		await dialog.getByRole("button", { name: "Confirm Disposition" }).click()

		await expect(dialog).not.toBeVisible({ timeout: 8_000 })
		const dischargeInstructions = page.getByRole("dialog", { name: /discharge instructions/i })
		if (await dischargeInstructions.isVisible({ timeout: 2_000 }).catch(() => false)) {
			await dischargeInstructions.getByRole("button", { name: /close/i }).click()
			await expect(dischargeInstructions).not.toBeVisible()
		}
		await expectOecbRoutingEvidence(fixture.encounterId)

		await signInAs(page, "billing@qhealth.local")
		await page.goto("/billing")
		await expect(page.getByRole("heading", { name: /^billing$/i })).toBeVisible()

		const table = page.getByRole("table")
		await expect(table).toBeVisible({ timeout: 10_000 })
		await expect(page.getByRole("row").filter({ hasText: fixture.billingPatientName })).toBeVisible()
		await expect(page.getByText(fixture.mrn)).toBeVisible()

		const oecbToggle = page.getByText("OECB only", { exact: true })
		await expect(oecbToggle).toBeVisible()
		await oecbToggle.click()

		await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 5_000 })
		await expect(page.getByRole("row").filter({ hasText: fixture.billingPatientName })).toBeVisible()
		await expect(page.getByText("OECB").first()).toBeVisible()
	})
})
