import { expect, request, test, type APIRequestContext, type Cookie } from "@playwright/test"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Client } = require("pg")

const HAS_BACKEND = !!process.env.E2E_AUTH_API_URL
const AUTH_API = process.env.E2E_AUTH_API_URL ?? "http://localhost:3000/api/v1/auth/"
const API_BASE = AUTH_API.replace(/auth\/?$/, "")
const WEB_ORIGIN = process.env.BASE_URL ?? "http://localhost:3001"
const DATABASE_URL =
	process.env.DATABASE_URL ?? "postgres://postgres:password@localhost:5432/qhealth-emr"
const DEFAULT_PASSWORD = process.env.E2E_SEED_PASSWORD ?? "Password123"

const SCHEDULER_EMAIL = "scheduler@qhealth.local"
const PHYSICIAN_EMAIL = "doctor@qhealth.local"
const PATIENT_MRN = "QH-000002"

type StaffContext = {
	facilityId: string
	patientId: string
	schedulerStaffId: string
	physicianStaffId: string
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

async function signInForCookies(email: string) {
	const api = await request.newContext({
		baseURL: AUTH_API,
		extraHTTPHeaders: {
			"Content-Type": "application/json",
			"Origin": WEB_ORIGIN,
		},
	})

	try {
		const authRes = await api.post("sign-in/email", {
			data: { email, password: DEFAULT_PASSWORD },
		})
		if (!authRes.ok()) {
			throw new Error(`Failed to sign in as ${email}: ${authRes.status()} ${await authRes.text()}`)
		}

		const { cookies } = await api.storageState()
		return cookies
	} finally {
		await api.dispose()
	}
}

async function authenticatedApi(cookies: Cookie[]) {
	return request.newContext({
		baseURL: API_BASE,
		extraHTTPHeaders: { "Content-Type": "application/json", "Origin": WEB_ORIGIN },
		storageState: { cookies, origins: [] },
	})
}

function localAppointmentSlot(offsetMinutes = 30) {
	const scheduled = new Date(Date.now() + offsetMinutes * 60 * 1000)
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

async function seedContext(): Promise<StaffContext> {
	return withDb(async client => {
		const result = await client.query(
			`select
				 p.id as patient_id,
				 sp_scheduler.id as scheduler_staff_id,
				 sp_scheduler.facility_id as facility_id,
				 sp_physician.id as physician_staff_id
			 from staff_profiles sp_scheduler
			 join users u_scheduler on u_scheduler.id = sp_scheduler.user_id
			 join staff_profiles sp_physician on sp_physician.facility_id = sp_scheduler.facility_id
			 join users u_physician on u_physician.id = sp_physician.user_id
			 join patients p on p.facility_id = sp_scheduler.facility_id
			 where u_scheduler.email = $1
			   and u_physician.email = $2
			   and p.mrn = $3
			 limit 1`,
			[SCHEDULER_EMAIL, PHYSICIAN_EMAIL, PATIENT_MRN]
		)

		if (result.rowCount === 0) {
			throw new Error(
				"Seed scheduler, physician, or patient fixture was not found. Run the dev seed before this E2E test."
			)
		}

		const row = result.rows[0]
		return {
			facilityId: row.facility_id as string,
			patientId: row.patient_id as string,
			schedulerStaffId: row.scheduler_staff_id as string,
			physicianStaffId: row.physician_staff_id as string,
		}
	})
}

async function createAppointment(
	api: APIRequestContext,
	context: StaffContext,
	clinicianId: string,
	notes: string,
	offsetMinutes = 30
) {
	const slot = localAppointmentSlot(offsetMinutes)
	const response = await api.post("telemedicine/appointments", {
		data: {
			facilityId: context.facilityId,
			patientId: context.patientId,
			clinicianId,
			scheduledDate: slot.scheduledDate,
			scheduledTime: slot.scheduledTime,
			durationMinutes: 30,
			platform: "livekit",
			notes,
		},
	})

	return response
}

test.describe.serial("Scheduler telemedicine booking workflow", () => {
	test.setTimeout(90_000)
	test.skip(!HAS_BACKEND, "Set E2E_AUTH_API_URL to run against the backend.")

	let context: StaffContext
	let schedulerCookies: Cookie[]
	let physicianCookies: Cookie[]

	test.beforeAll(async () => {
		context = await seedContext()
		schedulerCookies = await signInForCookies(SCHEDULER_EMAIL)
		physicianCookies = await signInForCookies(PHYSICIAN_EMAIL)
	})

	test("scheduler can book telemedicine only for an assigned physician and audit captures role context", async () => {
		const api = await authenticatedApi(schedulerCookies)
		const notes = `E2E scheduler telemedicine ${Date.now()}`

		try {
			const create = await createAppointment(api, context, context.physicianStaffId, notes)
			expect(create.ok()).toBeTruthy()

			const appointment = (await create.json()) as {
				id: string
				clinicianId: string
				status: string
			}
			expect(appointment).toEqual(
				expect.objectContaining({
					clinicianId: context.physicianStaffId,
					status: "scheduled",
				})
			)

			await withDb(async client => {
				const audit = await client.query(
					`select metadata
					 from audit_logs
					 where entity_id = $1
					   and entity_type = 'telemedicine_appointment'
					   and action = 'create'
					 order by created_at desc
					 limit 1`,
					[appointment.id]
				)

				expect(audit.rowCount).toBe(1)
				expect(audit.rows[0].metadata).toEqual(
					expect.objectContaining({
						isSchedulerAction: true,
						isPhysicianAction: false,
						userRoles: expect.arrayContaining(["Scheduler"]),
					})
				)
			})
		} finally {
			await api.dispose()
		}
	})

	test("scheduler cannot self-assign as the treating physician", async () => {
		const api = await authenticatedApi(schedulerCookies)

		try {
			const response = await createAppointment(
				api,
				context,
				context.schedulerStaffId,
				`E2E scheduler self assignment ${Date.now()}`,
				45
			)
			expect(response.status()).toBe(400)
			expect(await response.text()).toContain("Schedulers cannot assign themselves")
		} finally {
			await api.dispose()
		}
	})

	test("physician self-booking remains valid and scheduler cannot sign physician prescriptions", async () => {
		const physicianApi = await authenticatedApi(physicianCookies)
		const schedulerApi = await authenticatedApi(schedulerCookies)

		try {
			const create = await createAppointment(
				physicianApi,
				context,
				context.physicianStaffId,
				`E2E physician self booking ${Date.now()}`,
				60
			)
			expect(create.ok()).toBeTruthy()

			const appointment = (await create.json()) as {
				id: string
				clinicianId: string
				status: string
			}
			expect(appointment).toEqual(
				expect.objectContaining({
					clinicianId: context.physicianStaffId,
					status: "scheduled",
				})
			)

			const encounter = await physicianApi.post("telemedicine/encounters", {
				data: {
					appointmentId: appointment.id,
					encounterType: "standalone",
					chiefComplaint: "E2E cough",
					subjectiveNotes: "Patient reports mild cough.",
					objectiveNotes: "Patient appears comfortable on video.",
					assessmentNotes: "Likely viral URI.",
					planNotes: "Supportive care.",
					diagnosis: "Acute upper respiratory infection",
					icdCode: "J06.9",
				},
			})
			expect(encounter.ok()).toBeTruthy()

			const encounterBody = (await encounter.json()) as { id: string }
			const prescription = await physicianApi.post("telemedicine/prescriptions", {
				data: {
					encounterId: encounterBody.id,
					medications: [
						{
							genericName: "Paracetamol",
							brandName: "Biogesic",
							dosage: "500mg",
							form: "tablet",
							quantity: 1,
							unit: "tablet(s)",
							frequency: "Every 6 hours as needed",
							duration: "3 days",
							route: "oral",
						},
					],
					dispensingInstructions: "E2E scheduler signing should be rejected.",
				},
			})
			expect(prescription.ok()).toBeTruthy()

			const prescriptionBody = (await prescription.json()) as { id: string }
			const schedulerSign = await schedulerApi.post(
				`telemedicine/prescriptions/${prescriptionBody.id}/sign`
			)
			expect([400, 403]).toContain(schedulerSign.status())
			expect(await schedulerSign.text()).toMatch(/assigned clinician|permission|forbidden/i)
		} finally {
			await physicianApi.dispose()
			await schedulerApi.dispose()
		}
	})
})
