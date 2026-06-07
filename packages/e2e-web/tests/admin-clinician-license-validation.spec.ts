import { expect, request, test, type Cookie, type Page } from "@playwright/test"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Client } = require("pg")

const HAS_BACKEND = !!process.env.E2E_AUTH_API_URL
const AUTH_API = process.env.E2E_AUTH_API_URL ?? "http://localhost:3000/api/v1/auth/"
const WEB_ORIGIN = process.env.BASE_URL ?? "http://localhost:3001"
const DATABASE_URL =
	process.env.DATABASE_URL ?? "postgres://postgres:password@localhost:5432/qhealth-emr"
const DEFAULT_PASSWORD = process.env.E2E_SEED_PASSWORD ?? "Password123"

const CLINICIAN_USER_ID = "e2e-license-validation-user"
const CLINICIAN_EMAIL = "e2e-license-validation@qhealth.local"
const CLINICIAN_NAME = "Dr. License Validation"
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@qhealth.local"

const LICENSES = [
	{ type: "PRC", option: "PRC", number: "PRC-E2E-900001", expiry: "2027-12-31" },
	{ type: "PTR", option: "PTR", number: "PTR-E2E-900001", expiry: "2027-11-30" },
	{ type: "S2", option: "S2 (PDEA)", number: "S2-E2E-900001", expiry: "2027-10-31" },
] as const

type LicenseFixture = {
	staffProfileId: string
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

async function seedLicenseFixture(): Promise<LicenseFixture> {
	return withDb(async client => {
		const facility = await client.query(`select id from facilities order by created_at asc limit 1`)
		if (facility.rowCount === 0) {
			throw new Error("No facility seed was found.")
		}
		const facilityId = facility.rows[0].id as string

		await client.query(`delete from users where email = $1`, [CLINICIAN_EMAIL])
		await client.query(
			`insert into users (id, name, email, email_verified, created_at, updated_at)
			 values ($1, $2, $3, true, now(), now())`,
			[CLINICIAN_USER_ID, CLINICIAN_NAME, CLINICIAN_EMAIL]
		)
		const staffProfile = await client.query(
			`insert into staff_profiles (
				 user_id, facility_id, employee_number, department,
				 prc_license_number, prc_expiry, ptr_number, ptr_expiry,
				 pdea_s2_license, pdea_s2_expiry, s2_verified_until, is_active,
				 created_at, updated_at
			 )
			 values (
				 $1, $2, 'E2E-LICENSE-001', 'Clinical',
				 null, null, null, null, null, null, null, true,
				 now(), now()
			 )
			 returning id`,
			[CLINICIAN_USER_ID, facilityId]
		)

		return { staffProfileId: staffProfile.rows[0].id as string }
	})
}

function dateOnly(value: unknown) {
	if (value instanceof Date) {
		const year = value.getFullYear()
		const month = String(value.getMonth() + 1).padStart(2, "0")
		const day = String(value.getDate()).padStart(2, "0")
		return `${year}-${month}-${day}`
	}
	return String(value ?? "").slice(0, 10)
}

async function expectVerifiedCredentials(staffProfileId: string) {
	await expect
		.poll(
			async () =>
				withDb(async client => {
					const result = await client.query(
						`select
							 prc_license_number, prc_expiry,
							 ptr_number, ptr_expiry,
							 pdea_s2_license, pdea_s2_expiry, s2_verified_until
						 from staff_profiles
						 where id = $1`,
						[staffProfileId]
					)
					const row = result.rows[0]
					return {
						prcLicenseNumber: row?.prc_license_number ?? null,
						prcExpiry: dateOnly(row?.prc_expiry),
						ptrNumber: row?.ptr_number ?? null,
						ptrExpiry: dateOnly(row?.ptr_expiry),
						pdeaS2License: row?.pdea_s2_license ?? null,
						pdeaS2Expiry: dateOnly(row?.pdea_s2_expiry),
						s2VerifiedUntil: dateOnly(row?.s2_verified_until),
					}
				}),
			{ timeout: 20_000 }
		)
		.toEqual({
			prcLicenseNumber: "PRC-E2E-900001",
			prcExpiry: "2027-12-31",
			ptrNumber: "PTR-E2E-900001",
			ptrExpiry: "2027-11-30",
			pdeaS2License: "S2-E2E-900001",
			pdeaS2Expiry: "2027-10-31",
			s2VerifiedUntil: "2027-10-31",
		})
}

async function addAndVerifyLicense(
	page: Page,
	license: (typeof LICENSES)[number],
	staffProfileId: string
) {
	const addButton = page.getByRole("button", { name: /add license/i }).last()
	await expect(addButton).toBeEnabled({ timeout: 20_000 })
	await page.waitForTimeout(500)
	await addButton.click()
	const drawer = page.getByRole("dialog").filter({ hasText: "Add License" })
	await expect(drawer).toBeVisible({ timeout: 20_000 })

	await drawer.getByRole("combobox").click()
	await page.getByRole("option", { name: license.option }).click()
	await drawer.getByLabel("License Number").fill(license.number)
	await drawer.getByLabel("Expiry Date").fill(license.expiry)
	await drawer.getByRole("button", { name: /^add license$/i }).click()

	await expect(drawer).toBeHidden({ timeout: 20_000 })
	await expect(page.getByText(license.number)).toBeVisible({ timeout: 20_000 })

	await page.getByLabel(`Verification Proof (optional)`).last().fill(
		`E2E registry proof for ${license.type}`
	)
	await page.getByRole("button", { name: /^verify$/i }).last().click()

	await expect
		.poll(
			async () =>
				withDb(async client => {
					const result = await client.query(
						`select status
						 from clinician_licenses
						 where staff_profile_id = $1
						   and license_number = $2
						 order by created_at desc
						 limit 1`,
						[staffProfileId, license.number]
					)
					return result.rows[0]?.status ?? null
				}),
			{ timeout: 20_000 }
		)
		.toBe("verified")
}

test.describe.serial("Admin clinician license validation", () => {
	test.skip(!HAS_BACKEND, "Requires backend auth API and seeded admin data")
	test.setTimeout(180_000)

	test.beforeAll(async () => {
		authCookiesByEmail.set(ADMIN_EMAIL, await signInForCookies(ADMIN_EMAIL))
	})

	test("admin adds and verifies PRC, PTR, and S2 licenses that feed Physician prescribing credentials", async ({
		page,
	}) => {
		const fixture = await seedLicenseFixture()

		await signInAs(page, ADMIN_EMAIL)
		await page.goto("/admin/clinician-licenses")

		await expect(page.getByRole("heading", { name: /clinician licenses/i })).toBeVisible({
			timeout: 20_000,
		})
		await page.getByPlaceholder("Search clinician name...").fill(CLINICIAN_NAME)
		await expect(page.getByRole("row").filter({ hasText: CLINICIAN_NAME })).toBeVisible({
			timeout: 20_000,
		})
		await page.getByRole("row").filter({ hasText: CLINICIAN_NAME }).getByRole("button", { name: /view/i }).click()

		await expect(page).toHaveURL(new RegExp(`/admin/clinician-licenses/${fixture.staffProfileId}`), {
			timeout: 20_000,
		})
		await expect(page.getByRole("heading", { name: CLINICIAN_NAME })).toBeVisible()

		for (const license of LICENSES) {
			await addAndVerifyLicense(page, license, fixture.staffProfileId)
		}

		await expectVerifiedCredentials(fixture.staffProfileId)
	})
})
