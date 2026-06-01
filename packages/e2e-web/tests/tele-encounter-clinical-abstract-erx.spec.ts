import { expect, request, test, type Cookie, type Page } from "@playwright/test"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Client } = require("pg")

const HAS_BACKEND = !!process.env.E2E_AUTH_API_URL
const AUTH_API = process.env.E2E_AUTH_API_URL ?? "http://localhost:3000/api/v1/auth/"
const API_BASE = AUTH_API.replace(/auth\/?$/, "")
const WEB_ORIGIN = process.env.BASE_URL ?? "http://localhost:3001"
const DATABASE_URL =
	process.env.DATABASE_URL ?? "postgres://postgres:password@localhost:5432/qhealth-emr"
const DEFAULT_PASSWORD = process.env.E2E_SEED_PASSWORD ?? "Password123"

const PHYSICIAN_EMAIL = "doctor@qhealth.local"
const PATIENT_MRN = "QH-000002"
const PATIENT_EMAIL = "tele-erx-patient@example.test"
const APPOINTMENT_NOTES = "E2E 14.2 tele-abstract and e-Rx appointment"
const CHIEF_COMPLAINT = "Persistent cough and low-grade fever during teleconsult"
const SUBJECTIVE = "Patient reports three days of cough, nasal congestion, and intermittent fever."
const OBJECTIVE = "Patient appears comfortable on video. No respiratory distress observed."
const ASSESSMENT = "Acute upper respiratory infection, likely viral, with symptomatic cough."
const PLAN = "Supportive care, hydration, fever control, and follow-up if symptoms worsen."
const DIAGNOSIS = "Acute upper respiratory infection"
const ICD_CODE = "J06.9"
const ABSTRACT_NOTES = "Telemedicine encounter completed with patient identity verified remotely."
const RX_GENERIC_NAME = "Paracetamol"
const RX_BRAND_NAME = "Biogesic"
const RX_DOSAGE = "500mg"
const RX_FREQUENCY = "Every 6 hours as needed"
const RX_DURATION = "3 days"
const RX_INSTRUCTIONS = "Do not exceed 4 grams per day."
const RX_DISPENSING = "Dispense only as digitally signed telemedicine prescription."

type TeleFixture = {
	appointmentId: string
	facilityId: string
	patientId: string
	patientDateOfBirth: string
	patientInviteToken: string
	clinicianStaffId: string
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

async function ensureTelemedicineAnonymousAuditUser() {
	await withDb(async client => {
		await client.query(
			`insert into users (id, name, email, email_verified, created_at, updated_at, two_factor_enabled)
			 values (
			   'telemedicine:anonymous',
			   'Telemedicine Anonymous Patient',
			   'telemedicine-anonymous@qhealth.local',
			   true,
			   now(),
			   now(),
			   false
			 )
			 on conflict (id) do nothing`
		)
	})
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

function localAppointmentSlot() {
	const scheduled = new Date(Date.now() + 10 * 60 * 1000)
	const yyyy = scheduled.getFullYear()
	const mm = String(scheduled.getMonth() + 1).padStart(2, "0")
	const dd = String(scheduled.getDate()).padStart(2, "0")
	const hh = String(scheduled.getHours()).padStart(2, "0")
	const min = String(scheduled.getMinutes()).padStart(2, "0")
	return {
		scheduledDate: `${yyyy}-${mm}-${dd}`,
		scheduledTime: `${hh}:${min}`,
	}
}

async function seedTeleFixture(
	cookies: Cookie[],
	notes: string = APPOINTMENT_NOTES
): Promise<TeleFixture> {
	const context = await withDb(async client => {
		const context = await client.query(
			`select
				 p.id as patient_id,
				 p.date_of_birth::text as patient_date_of_birth,
				 p.facility_id as patient_facility_id,
				 sp.id as clinician_staff_id,
				 sp.facility_id as staff_facility_id
			 from patients p
			 join staff_profiles sp on sp.facility_id = p.facility_id
			 join users u on u.id = sp.user_id
			 where p.mrn = $1
			   and u.email = $2
			 limit 1`,
			[PATIENT_MRN, PHYSICIAN_EMAIL]
		)

		if (context.rowCount === 0) {
			throw new Error("Seed patient QH-000002 or physician doctor@qhealth.local was not found.")
		}

		const row = context.rows[0]
		const patientId = row.patient_id as string
		const patientDateOfBirth = row.patient_date_of_birth as string
		const facilityId = row.staff_facility_id as string
		const clinicianStaffId = row.clinician_staff_id as string

		const existing = await client.query(
			`select id from telemedicine_appointments where notes = $1`,
			[notes]
		)
		for (const existingAppointment of existing.rows as { id: string }[]) {
			const appointmentId = existingAppointment.id
			const encounters = await client.query(
				`select id from telemedicine_encounters where appointment_id = $1`,
				[appointmentId]
			)
			const encounterIds = encounters.rows.map((r: { id: string }) => r.id)
			if (encounterIds.length > 0) {
				await client.query(
					`delete from telemedicine_prescription_items
					 where prescription_id in (
					   select id from telemedicine_prescriptions where encounter_id = any($1::uuid[])
					 )`,
					[encounterIds]
				)
				await client.query(
					`delete from telemedicine_prescriptions where encounter_id = any($1::uuid[])`,
					[encounterIds]
				)
				await client.query(`delete from telemedicine_abstracts where encounter_id = any($1::uuid[])`, [
					encounterIds,
				])
				await client.query(`delete from telemedicine_encounters where id = any($1::uuid[])`, [
					encounterIds,
				])
			}
			await client.query(`delete from telemedicine_appointments where id = $1`, [appointmentId])
		}

		await client.query(`update patients set email = $1, updated_at = now() where id = $2`, [
			PATIENT_EMAIL,
			patientId,
		])

		return {
			facilityId,
			patientId,
			patientDateOfBirth,
			clinicianStaffId,
		}
	})

	const api = await request.newContext({
		baseURL: API_BASE,
		extraHTTPHeaders: { "Content-Type": "application/json", Origin: WEB_ORIGIN },
		storageState: { cookies, origins: [] },
	})
	try {
		const { scheduledDate, scheduledTime } = localAppointmentSlot()
		const create = await api.post("telemedicine/appointments", {
			data: {
				facilityId: context.facilityId,
				patientId: context.patientId,
				clinicianId: context.clinicianStaffId,
				scheduledDate,
				scheduledTime,
				durationMinutes: 30,
				platform: "livekit",
				notes,
			},
		})
		if (!create.ok()) {
			throw new Error(`Failed to create telemedicine appointment: ${create.status()} ${await create.text()}`)
		}

		const appointment = (await create.json()) as {
			id: string
			patientInviteToken?: string
			platform: string
			status: string
			livekitRoomName: string | null
			patientInviteExpiresAt: string | null
		}
		expect(appointment.platform).toBe("livekit")
		expect(appointment.status).toBe("scheduled")
		expect(appointment.livekitRoomName).toMatch(/^telemed-[0-9a-f-]{36}$/i)
		expect(appointment.patientInviteExpiresAt).toBeTruthy()
		expect(appointment.patientInviteToken).toBeTruthy()

		return {
			...context,
			appointmentId: appointment.id,
			patientInviteToken: appointment.patientInviteToken!,
		}
	} finally {
		await api.dispose()
	}
}

async function openSeededAppointment(page: Page) {
	await page.goto("/telemedicine")
	await expect(page.getByRole("heading", { name: /^telemedicine$/i })).toBeVisible()
	await expect(page.getByRole("button", { name: /^my appointments/i })).toBeVisible()
	await expect(page.getByRole("button", { name: /^encounter\b/i })).toBeVisible()
	await expect(page.getByRole("button", { name: /^video session/i })).toBeVisible()
	await expect(page.getByRole("button", { name: /^abstract \/ rx/i })).toBeVisible()
	await page.getByPlaceholder(/search by patient, mrn, or notes/i).fill(APPOINTMENT_NOTES)
	await expect(page.getByText(APPOINTMENT_NOTES)).toBeVisible()
	const row = page.getByText(APPOINTMENT_NOTES).locator(
		"xpath=ancestor::div[contains(@class,'rounded-lg')][.//button][1]"
	)
	await row.getByRole("button", { name: /start encounter/i }).click()
	await expect(page.getByText(/telemedicine clinical note/i)).toBeVisible()
}

async function assertVirtualEncounterLogging(page: Page, fixture: TeleFixture, cookies: Cookie[]) {
	await page.getByRole("button", { name: /video session/i }).click()
	await expect(page.getByText(/video room is ready for this appointment/i)).toBeVisible()
	const clinicianRoomLink = page.getByRole("link", { name: /open clinician room/i })
	await expect(clinicianRoomLink).toHaveAttribute(
		"href",
		new RegExp(`/telemedicine/appointments/${fixture.appointmentId}/video$`)
	)

	const api = await request.newContext({
		baseURL: API_BASE,
		extraHTTPHeaders: { "Content-Type": "application/json", Origin: WEB_ORIGIN },
		storageState: { cookies, origins: [] },
	})
	try {
		const preview = await request
			.newContext({ baseURL: API_BASE, extraHTTPHeaders: { Origin: WEB_ORIGIN } })
			.then(async publicApi => {
				try {
					const response = await publicApi.get(
						`telemedicine/patient-invites/${fixture.patientInviteToken}`
					)
					return { response, publicApi }
				} catch (error) {
					await publicApi.dispose()
					throw error
				}
			})
		try {
			expect(preview.response.ok()).toBeTruthy()
			const body = (await preview.response.json()) as { canJoinNow: boolean; isRevoked: boolean }
			expect(body.canJoinNow).toBe(true)
			expect(body.isRevoked).toBe(false)
		} finally {
			await preview.publicApi.dispose()
		}

		const clinicianToken = await api.post(
			`telemedicine/appointments/${fixture.appointmentId}/livekit-token`
		)
		expect(clinicianToken.ok()).toBeTruthy()
		const clinicianTokenBody = (await clinicianToken.json()) as {
			isConfigured: boolean
			roomName?: string
			token?: string
			wsUrl?: string
		}
		expect(clinicianTokenBody.isConfigured).toBe(true)
		expect(clinicianTokenBody.token).toBeTruthy()
		expect(clinicianTokenBody.wsUrl).toMatch(/^wss:\/\//)
		expect(clinicianTokenBody.roomName).toBe(`telemed-${fixture.appointmentId}`)

		await withDb(async client => {
			const row = await client.query(
				`select status, livekit_session_started_at, patient_joined_at
				 from telemedicine_appointments where id = $1`,
				[fixture.appointmentId]
			)
			expect(row.rows[0].status).toBe("in-progress")
			expect(row.rows[0].livekit_session_started_at).toBeTruthy()
			expect(row.rows[0].patient_joined_at).toBeNull()
		})

		const publicApi = await request.newContext({
			baseURL: API_BASE,
			extraHTTPHeaders: { "Content-Type": "application/json", Origin: WEB_ORIGIN },
		})
		try {
			const wrongJoin = await publicApi.post(
				`telemedicine/patient-invites/${fixture.patientInviteToken}/livekit-token`,
				{ data: { dateOfBirth: "1900-01-01", mrn: "WRONG-MRN" } }
			)
			expect(wrongJoin.status()).toBe(403)

			const patientJoin = await publicApi.post(
				`telemedicine/patient-invites/${fixture.patientInviteToken}/livekit-token`,
				{ data: { dateOfBirth: fixture.patientDateOfBirth } }
			)
			expect(patientJoin.ok()).toBeTruthy()
			const patientJoinBody = (await patientJoin.json()) as { isConfigured: boolean; token?: string }
			expect(patientJoinBody.isConfigured).toBe(true)
			expect(patientJoinBody.token).toBeTruthy()
		} finally {
			await publicApi.dispose()
		}

		const ended = await api.post(
			`telemedicine/appointments/${fixture.appointmentId}/livekit-session/end`
		)
		expect(ended.ok()).toBeTruthy()

		await withDb(async client => {
			const row = await client.query(
				`select patient_joined_at, patient_invite_last_used_at, livekit_session_ended_at
				 from telemedicine_appointments where id = $1`,
				[fixture.appointmentId]
			)
			expect(row.rows[0].patient_joined_at).toBeTruthy()
			expect(row.rows[0].patient_invite_last_used_at).toBeTruthy()
			expect(row.rows[0].livekit_session_ended_at).toBeTruthy()

			const audit = await client.query(
				`select entity_type, action, outcome, severity, metadata, after_state
				 from audit_logs
				 where entity_id = $1
				 order by created_at`,
				[fixture.appointmentId]
			)
			expect(audit.rows).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ entity_type: "telemedicine_appointment", action: "create" }),
					expect.objectContaining({
						entity_type: "telemedicine_livekit_token",
						action: "create",
					}),
					expect.objectContaining({
						entity_type: "telemedicine_patient_invite",
						action: "verify",
						outcome: "failure",
						severity: "warning",
					}),
					expect.objectContaining({
						entity_type: "telemedicine_appointment_session",
						action: "update",
					}),
				])
			)
			expect(
				audit.rows.some(
					(row: { entity_type: string; after_state?: { role?: string } | null }) =>
						row.entity_type === "telemedicine_livekit_token" && row.after_state?.role === "patient"
				)
			).toBe(true)
			expect(
				audit.rows.some(
					(row: { metadata?: { reason?: string } | null }) =>
						row.metadata?.reason === "verification_failed"
				)
			).toBe(true)
		})
	} finally {
		await api.dispose()
	}

	await page.getByRole("button", { name: /^encounter\b/i }).click()
	await expect(page.getByText(/telemedicine clinical note/i)).toBeVisible()
}

async function fillClinicalNote(page: Page) {
	await page.locator("#chiefComplaint").fill(CHIEF_COMPLAINT)
	await page.locator("#subjectiveNotes").fill(SUBJECTIVE)
	await page.locator("#objectiveNotes").fill(OBJECTIVE)
	await page.locator("#assessmentNotes").fill(ASSESSMENT)
	await page.locator("#planNotes").fill(PLAN)
	await page.locator("#diagnosis").fill(DIAGNOSIS)
	await page.locator("#icdCode").fill(ICD_CODE)
	await page.locator('[data-field="bloodPressure"] input').fill("120/80")
	await page.locator('[data-field="heartRate"] input').fill("88")
	await page.locator('[data-field="temperature"] input').fill("38.2")
	await page.locator('[data-field="oxygenSaturation"] input').fill("97")
	await page.locator('[data-field="weight"] input').fill("70")
	await page.getByRole("button", { name: /save clinical note/i }).click()
	await expect(page.getByText(/video room is ready for this appointment/i)).toBeVisible({
		timeout: 15_000,
	})
	await expect(page.getByRole("button", { name: /abstract \/ rx/i })).toBeEnabled()
}

async function openDocuments(page: Page) {
	await page.getByRole("button", { name: /abstract \/ rx/i }).click()
	await expect(page.getByText(/documents for/i)).toBeVisible()
}

async function generateAndSignAbstract(page: Page) {
	await page.getByLabel(/additional notes/i).fill(ABSTRACT_NOTES)
	await page.getByRole("button", { name: /generate abstract from encounter/i }).click()
	await expect(page.getByText(CHIEF_COMPLAINT)).toBeVisible({ timeout: 15_000 })
	await expect(page.getByText(SUBJECTIVE)).toBeVisible()
	await expect(page.getByText(DIAGNOSIS, { exact: true })).toBeVisible()
	await expect(page.getByText(`ICD-10: ${ICD_CODE}`)).toBeVisible()
	await expect(page.getByText(ABSTRACT_NOTES)).toBeVisible()
	await expect(page.getByRole("button", { name: /download pdf/i })).toBeDisabled()

	await page.getByRole("button", { name: /sign abstract/i }).click()
	await expect(page.getByText(/signed:/i)).toBeVisible({ timeout: 15_000 })
	await expect(page.getByRole("button", { name: /download pdf/i })).toBeEnabled()
}

async function sendAbstract(page: Page) {
	await page.getByRole("button", { name: /send to patient/i }).click()
	await expect(page.locator("#sendEmail")).toHaveValue(PATIENT_EMAIL)
	await page.getByRole("button", { name: /^send abstract$/i }).click()
	await expect(page.getByText("Sent to Patient", { exact: true })).toBeVisible({
		timeout: 15_000,
	})
	await expect(page.getByText(PATIENT_EMAIL)).toBeVisible()
}

async function createSignAndSendPrescription(page: Page) {
	await page.getByRole("button", { name: /generate e-prescription/i }).click()
	await page.getByPlaceholder(/e\.g\. amoxicillin/i).fill(RX_GENERIC_NAME)
	await page.getByPlaceholder(/e\.g\. amoxil/i).fill(RX_BRAND_NAME)
	await page.getByPlaceholder(/e\.g\. 500mg/i).fill(RX_DOSAGE)
	await page.locator("select").filter({ has: page.locator("option", { hasText: "Select form" }) }).selectOption("tablet")
	await page.getByPlaceholder(/e\.g\. 3x daily/i).fill(RX_FREQUENCY)
	await page.getByPlaceholder(/e\.g\. 7 days/i).fill(RX_DURATION)
	await page.getByPlaceholder(/take with food/i).fill(RX_INSTRUCTIONS)
	await page.locator("#dispensingInstructions").fill(RX_DISPENSING)
	await page.getByRole("button", { name: /generate e-prescription/i }).click()

	await expect(page.getByText(RX_GENERIC_NAME)).toBeVisible({ timeout: 15_000 })
	await expect(page.getByText(RX_BRAND_NAME)).toBeVisible()
	await expect(page.getByText(/physician signature required/i)).toBeVisible()
	await expect(page.getByRole("button", { name: /download pdf/i }).nth(1)).toBeDisabled()

	await page.getByRole("button", { name: /sign prescription/i }).click()
	await expect(page.getByText(/digitally signed by/i)).toBeVisible({ timeout: 15_000 })
	await expect(page.getByRole("button", { name: /download pdf/i }).nth(1)).toBeEnabled()

	await page.getByRole("button", { name: /send via email/i }).click()
	await page.getByPlaceholder("patient@email.com").fill(PATIENT_EMAIL)
	await page.getByRole("button", { name: /^send$/i }).click()
	await expect(page.getByText(/sent to patient/i).last()).toBeVisible({ timeout: 15_000 })
}

async function assertDatabaseState(fixture: TeleFixture) {
	await withDb(async client => {
		const encounter = await client.query(
			`select id, appointment_id, patient_id, clinician_staff_id, chief_complaint, diagnosis, icd_code, status
			 from telemedicine_encounters
			 where appointment_id = $1`,
			[fixture.appointmentId]
		)
		expect(encounter.rowCount).toBe(1)
		expect(encounter.rows[0]).toMatchObject({
			appointment_id: fixture.appointmentId,
			patient_id: fixture.patientId,
			clinician_staff_id: fixture.clinicianStaffId,
			chief_complaint: CHIEF_COMPLAINT,
			diagnosis: DIAGNOSIS,
			icd_code: ICD_CODE,
			status: "finalized",
		})

		const encounterId = encounter.rows[0].id as string
		const abstract = await client.query(
			`select id, status, chief_complaint, diagnosis, icd_code, additional_notes, signed_at, signed_by_staff_id, sent_at, sent_to_email
			 from telemedicine_abstracts
			 where encounter_id = $1`,
			[encounterId]
		)
		expect(abstract.rowCount).toBe(1)
		expect(abstract.rows[0]).toMatchObject({
			status: "sent",
			chief_complaint: CHIEF_COMPLAINT,
			diagnosis: DIAGNOSIS,
			icd_code: ICD_CODE,
			additional_notes: ABSTRACT_NOTES,
			signed_by_staff_id: fixture.clinicianStaffId,
			sent_to_email: PATIENT_EMAIL,
		})
		expect(abstract.rows[0].signed_at).toBeTruthy()
		expect(abstract.rows[0].sent_at).toBeTruthy()

		const rx = await client.query(
			`select id, status, prc_license_number, ptr_number, signed_at, signed_by_staff_id, sent_at, sent_to_email, dispensing_instructions
			 from telemedicine_prescriptions
			 where encounter_id = $1`,
			[encounterId]
		)
		expect(rx.rowCount).toBe(1)
		expect(rx.rows[0]).toMatchObject({
			status: "sent",
			prc_license_number: "PRC-100001",
			ptr_number: "PTR-100001",
			signed_by_staff_id: fixture.clinicianStaffId,
			sent_to_email: PATIENT_EMAIL,
			dispensing_instructions: RX_DISPENSING,
		})
		expect(rx.rows[0].signed_at).toBeTruthy()
		expect(rx.rows[0].sent_at).toBeTruthy()

		const items = await client.query(
			`select generic_name, brand_name, dosage, form, quantity, unit, frequency, duration, route, instructions
			 from telemedicine_prescription_items
			 where prescription_id = $1`,
			[rx.rows[0].id]
		)
		expect(items.rowCount).toBe(1)
		expect(items.rows[0]).toMatchObject({
			generic_name: RX_GENERIC_NAME,
			brand_name: RX_BRAND_NAME,
			dosage: RX_DOSAGE,
			form: "tablet",
			quantity: 1,
			unit: "tablet(s)",
			frequency: RX_FREQUENCY,
			duration: RX_DURATION,
			route: "oral",
			instructions: RX_INSTRUCTIONS,
		})

		const appointment = await client.query(
			`select status from telemedicine_appointments where id = $1`,
			[fixture.appointmentId]
		)
		expect(appointment.rows[0].status).toBe("completed")

		const audit = await client.query(
			`select entity_type, action
			 from audit_logs
			 where entity_id in ($1, $2)
			 order by created_at`,
			[abstract.rows[0].id, rx.rows[0].id]
		)
		expect(audit.rows).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ entity_type: "telemedicine_abstract", action: "create" }),
				expect.objectContaining({ entity_type: "telemedicine_abstract", action: "sign" }),
				expect.objectContaining({ entity_type: "telemedicine_abstract", action: "update" }),
				expect.objectContaining({ entity_type: "telemedicine_prescription", action: "create" }),
				expect.objectContaining({ entity_type: "telemedicine_prescription", action: "sign" }),
				expect.objectContaining({ entity_type: "telemedicine_prescription", action: "update" }),
			])
		)
	})
}

test.describe.serial("Tele-encounter clinical abstract and e-Rx", () => {
	test.setTimeout(120_000)
	test.skip(!HAS_BACKEND, "Set E2E_AUTH_API_URL to run against the backend.")

	let fixture: TeleFixture

	test.beforeAll(async () => {
		await ensureTelemedicineAnonymousAuditUser()
		const physicianCookies = await signInForCookies(PHYSICIAN_EMAIL)
		authCookiesByEmail.set(PHYSICIAN_EMAIL, physicianCookies)
		fixture = await seedTeleFixture(physicianCookies)
	})

	test("physician completes tele-encounter abstract and digitally signed e-prescription", async ({
		page,
	}) => {
		await signInAs(page, PHYSICIAN_EMAIL)
		await openSeededAppointment(page)
		await assertVirtualEncounterLogging(
			page,
			fixture,
			authCookiesByEmail.get(PHYSICIAN_EMAIL) ?? []
		)
		await fillClinicalNote(page)
		await openDocuments(page)
		await generateAndSignAbstract(page)
		await createSignAndSendPrescription(page)
		await sendAbstract(page)
		await assertDatabaseState(fixture)

		const cookies = authCookiesByEmail.get(PHYSICIAN_EMAIL) ?? []
		const api = await request.newContext({
			baseURL: API_BASE,
			extraHTTPHeaders: { Origin: WEB_ORIGIN },
			storageState: { cookies, origins: [] },
		})
		try {
			const ids = await withDb(async client => {
				const result = await client.query(
					`select a.id as abstract_id, p.id as prescription_id
					 from telemedicine_encounters e
					 join telemedicine_abstracts a on a.encounter_id = e.id
					 join telemedicine_prescriptions p on p.encounter_id = e.id
					 where e.appointment_id = $1`,
					[fixture.appointmentId]
				)
				return result.rows[0] as { abstract_id: string; prescription_id: string }
			})

			const abstractPdf = await api.get(`telemedicine/abstracts/${ids.abstract_id}/pdf`)
			expect(abstractPdf.ok()).toBeTruthy()
			expect(abstractPdf.headers()["content-type"]).toContain("application/pdf")
			expect((await abstractPdf.body()).byteLength).toBeGreaterThan(1000)

			const rxPdf = await api.get(`telemedicine/prescriptions/${ids.prescription_id}/pdf`)
			expect(rxPdf.ok()).toBeTruthy()
			expect(rxPdf.headers()["content-type"]).toContain("application/pdf")
			expect((await rxPdf.body()).byteLength).toBeGreaterThan(1000)
		} finally {
			await api.dispose()
		}
	})

	test("patient invite negative checks reject revoked and expired joins with audit", async () => {
		const cookies = authCookiesByEmail.get(PHYSICIAN_EMAIL) ?? []
		const api = await request.newContext({
			baseURL: API_BASE,
			extraHTTPHeaders: { "Content-Type": "application/json", Origin: WEB_ORIGIN },
			storageState: { cookies, origins: [] },
		})
		const publicApi = await request.newContext({
			baseURL: API_BASE,
			extraHTTPHeaders: { "Content-Type": "application/json", Origin: WEB_ORIGIN },
		})

		try {
			const revoked = await seedTeleFixture(cookies, `${APPOINTMENT_NOTES} revoked`)
			const revokeResponse = await api.post(
				`telemedicine/appointments/${revoked.appointmentId}/patient-invite/revoke`
			)
			expect(revokeResponse.ok()).toBeTruthy()

			const revokedPreview = await publicApi.get(
				`telemedicine/patient-invites/${revoked.patientInviteToken}`
			)
			expect(revokedPreview.ok()).toBeTruthy()
			expect(await revokedPreview.json()).toEqual(
				expect.objectContaining({ isRevoked: true, canJoinNow: false })
			)

			const revokedJoin = await publicApi.post(
				`telemedicine/patient-invites/${revoked.patientInviteToken}/livekit-token`,
				{ data: { dateOfBirth: revoked.patientDateOfBirth } }
			)
			expect(revokedJoin.status()).toBe(400)

			await withDb(async client => {
				const audit = await client.query(
					`select outcome, severity, metadata->>'reason' as reason
					 from audit_logs
					 where entity_id = $1
					   and entity_type = 'telemedicine_patient_invite'
					 order by created_at desc
					 limit 5`,
					[revoked.appointmentId]
				)
				expect(audit.rows).toEqual(
					expect.arrayContaining([
						expect.objectContaining({
							outcome: "failure",
							severity: "warning",
							reason: "invite_revoked",
						}),
					])
				)
			})

			const expired = await seedTeleFixture(cookies, `${APPOINTMENT_NOTES} expired`)
			await withDb(async client => {
				await client.query(
					`update telemedicine_appointments
					 set patient_invite_expires_at = now() - interval '1 hour',
					     updated_at = now()
					 where id = $1`,
					[expired.appointmentId]
				)
			})

			const expiredPreview = await publicApi.get(
				`telemedicine/patient-invites/${expired.patientInviteToken}`
			)
			expect(expiredPreview.ok()).toBeTruthy()
			expect(await expiredPreview.json()).toEqual(
				expect.objectContaining({ isExpired: true, canJoinNow: false })
			)

			const expiredJoin = await publicApi.post(
				`telemedicine/patient-invites/${expired.patientInviteToken}/livekit-token`,
				{ data: { mrn: PATIENT_MRN } }
			)
			expect(expiredJoin.status()).toBe(400)

			await withDb(async client => {
				const audit = await client.query(
					`select outcome, severity, metadata->>'reason' as reason
					 from audit_logs
					 where entity_id = $1
					   and entity_type = 'telemedicine_patient_invite'
					 order by created_at desc
					 limit 5`,
					[expired.appointmentId]
				)
				expect(audit.rows).toEqual(
					expect.arrayContaining([
						expect.objectContaining({
							outcome: "failure",
							severity: "warning",
							reason: "invite_expired",
						}),
					])
				)
			})
		} finally {
			await api.dispose()
			await publicApi.dispose()
		}
	})
})
