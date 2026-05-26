import { expect, request, test, type Page } from "@playwright/test"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Client } = require("pg")

const HAS_BACKEND = !!process.env.E2E_AUTH_API_URL
const AUTH_API = process.env.E2E_AUTH_API_URL ?? "http://localhost:3000/api/v1/auth/"
const WEB_ORIGIN = process.env.BASE_URL ?? "http://localhost:3001"
const DATABASE_URL =
	process.env.DATABASE_URL ?? "postgres://postgres:password@localhost:5432/qhealth-emr"
const DEFAULT_PASSWORD = process.env.E2E_SEED_PASSWORD ?? "Password123"

type BreakGlassEvidence = {
	id: string
	patientId: string
	clinicianStaffId: string
	reviewStatus: string
	hasRecordsAccessed: boolean
	hasOverrideAudit: boolean
}

type BreakGlassTestPatient = {
	id: string
	mrn: string
	name: string
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

async function createBreakGlassTestPatient(): Promise<BreakGlassTestPatient> {
	const unique = Date.now().toString(36)
	const mrn = `BG-${unique}`.toUpperCase()
	const firstName = "E2E"
	const lastName = `Breakglass ${unique}`

	return withDb(async client => {
		const facilityResult = await client.query(
			`select sp.facility_id
			 from staff_profiles sp
			 join users u on u.id = sp.user_id
			 where u.email = 'doctor@qhealth.local'
			   and sp.is_active = true
			 order by sp.created_at asc
			 limit 1`
		)
		const facilityId = facilityResult.rows[0]?.facility_id
		if (!facilityId) {
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
				 address_line1,
				 city,
				 province,
				 phone,
				 emergency_contact_name,
				 emergency_contact_phone,
				 is_active
			 )
			 values ($1, $2, $3, $4, '1980-01-01', 'male', 'E2E QA Street', 'Quezon City', 'Metro Manila', '09170000001', 'QA Contact', '09170000002', true)
			 returning id, mrn, first_name, last_name`,
			[facilityId, mrn, firstName, lastName]
		)
		const row = patientResult.rows[0]
		return {
			id: row.id as string,
			mrn: row.mrn as string,
			name: `${row.first_name} ${row.last_name}`,
		}
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

async function expectBreakGlassEvidence(justification: string): Promise<BreakGlassEvidence> {
	await expect
		.poll(
			async () =>
				withDb(async client => {
					const result = await client.query(
						`select
							 bge.id,
							 bge.patient_id,
							 bge.clinician_staff_id,
							 bge.review_status,
							 bge.records_accessed,
							 exists (
								 select 1
								 from audit_logs al
								 where al.entity_type = 'break_glass_event'
								   and al.entity_id = bge.id
								   and al.action = 'override'
								   and al.severity = 'critical'
								   and al.outcome = 'success'
							 ) as has_override_audit
						 from break_glass_events bge
						 where bge.justification = $1
						 order by bge.created_at desc
						 limit 1`,
						[justification]
					)
					const row = result.rows[0]
					if (!row) return null
					return {
						id: row.id as string,
						patientId: row.patient_id as string,
						clinicianStaffId: row.clinician_staff_id as string,
						reviewStatus: row.review_status as string,
						hasRecordsAccessed:
							Array.isArray(row.records_accessed) && row.records_accessed.length > 0,
						hasOverrideAudit: row.has_override_audit === true,
					}
				}),
			{ timeout: 20_000 }
		)
		.toEqual(
			expect.objectContaining({
				reviewStatus: "pending",
				hasRecordsAccessed: true,
				hasOverrideAudit: true,
			})
		)

	return withDb(async client => {
		const result = await client.query(
			`select id, patient_id, clinician_staff_id, review_status, records_accessed
			 from break_glass_events
			 where justification = $1
			 order by created_at desc
			 limit 1`,
			[justification]
		)
		const row = result.rows[0]
		return {
			id: row.id as string,
			patientId: row.patient_id as string,
			clinicianStaffId: row.clinician_staff_id as string,
			reviewStatus: row.review_status as string,
			hasRecordsAccessed: Array.isArray(row.records_accessed) && row.records_accessed.length > 0,
			hasOverrideAudit: true,
		}
	})
}

async function expectApprovedBreakGlass(eventId: string, reviewReason: string) {
	await expect
		.poll(
			async () =>
				withDb(async client => {
					const result = await client.query(
						`select
							 bge.review_status,
							 bge.reviewed_at is not null as has_reviewed_at,
							 bge.review_notes,
							 exists (
								 select 1
								 from break_glass_reviews bgr
								 where bgr.break_glass_event_id = bge.id
								   and bgr.action = 'approve'
								   and bgr.reason = $2
							 ) as has_review_row,
							 exists (
								 select 1
								 from audit_logs al
								 where al.entity_type = 'break_glass_review'
								   and al.metadata ->> 'breakGlassEventId' = bge.id::text
								   and al.metadata ->> 'reviewAction' = 'approve'
								   and al.action = 'update'
								   and al.outcome = 'success'
							 ) as has_review_audit
						 from break_glass_events bge
						 where bge.id = $1`,
						[eventId, reviewReason]
					)
					const row = result.rows[0]
					if (!row) return null
					return {
						reviewStatus: row.review_status,
						hasReviewedAt: row.has_reviewed_at,
						reviewNotes: row.review_notes,
						hasReviewRow: row.has_review_row,
						hasReviewAudit: row.has_review_audit,
					}
				}),
			{ timeout: 20_000 }
		)
		.toEqual({
			reviewStatus: "appropriate",
			hasReviewedAt: true,
			reviewNotes: reviewReason,
			hasReviewRow: true,
			hasReviewAudit: true,
		})
}

test.describe("break-glass emergency access", () => {
	test.skip(!HAS_BACKEND, "Requires backend auth API and seeded clinical data")

	test("physician can request emergency access and auditor can approve the report with audit evidence", async ({ page }) => {
		const patient = await createBreakGlassTestPatient()
		const justification = `E2E code blue emergency override ${Date.now()} requires immediate access to stabilize the patient.`
		const reviewReason = `E2E approval verified appropriate emergency access ${Date.now()}`

		await signInAs(page, "doctor@qhealth.local")
		await page.goto("/patients/search")
		await expect(page.getByRole("heading", { name: /^patients$/i })).toBeVisible()

		await page.getByPlaceholder(/filter by name or mrn/i).fill(patient.mrn)
		await expect(page.getByText(patient.name)).toBeVisible()
		await page
			.locator("div")
			.filter({ hasText: patient.name })
			.getByRole("button", { name: /open chart/i })
			.first()
			.click()

		await expect(page.getByRole("dialog", { name: /emergency override access/i })).toBeVisible()
		await page.getByRole("combobox", { name: /reason category/i }).click()
		await page.getByRole("option", { name: /code blue/i }).click()
		await page.getByRole("combobox", { name: /access duration/i }).click()
		await page.getByRole("option", { name: "4 hours (default)" }).click()
		await page.getByLabel(/clinical justification/i).fill(justification)
		await page.getByLabel(/i acknowledge/i).check()
		await page.getByRole("button", { name: /request emergency access/i }).click()

		await expect(page).toHaveURL(/\/patients\/[0-9a-f-]+/)
		await expect(page.getByText(/temporary break-glass access active/i)).toBeVisible()
		const event = await expectBreakGlassEvidence(justification)

		await signInAs(page, "auditor@qhealth.local")
		await page.goto("/auditor/break-glass")
		await expect(page.getByRole("heading", { name: /break-glass reviews/i })).toBeVisible()
		const eventRow = page.getByRole("row").filter({ hasText: event.patientId }).first()
		await expect(eventRow.getByText(/code blue/i)).toBeVisible()
		await eventRow.getByRole("link", { name: /view report/i }).click()

		await expect(page).toHaveURL(new RegExp(`/auditor/break-glass/${event.id}$`))
		await expect(page.getByRole("heading", { name: /break-glass event report/i })).toBeVisible()
		await expect(page.getByText(justification)).toBeVisible()
		await expect(page.getByText(/accessed resources timeline/i)).toBeVisible()

		await page.getByRole("button", { name: /^approve$/i }).click()
		const approveDialog = page.getByRole("dialog", { name: /approve break-glass access/i })
		await approveDialog.getByLabel(/reason/i).fill(reviewReason)
		await approveDialog.getByRole("button", { name: /^approve$/i }).click()

		await expect(page.getByText("appropriate", { exact: true })).toBeVisible({ timeout: 20_000 })
		await expectApprovedBreakGlass(event.id, reviewReason)
	})
})
