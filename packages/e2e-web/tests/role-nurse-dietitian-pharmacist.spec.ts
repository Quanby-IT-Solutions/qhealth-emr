import { expect, request, test, type Cookie, type Page } from "@playwright/test"

const HAS_BACKEND = !!process.env.E2E_AUTH_API_URL
const AUTH_API = process.env.E2E_AUTH_API_URL ?? "http://localhost:3000/api/v1/auth/"
const WEB_ORIGIN = process.env.BASE_URL ?? "http://localhost:3001"
const DEFAULT_PASSWORD = process.env.E2E_SEED_PASSWORD ?? "Password123"

const authCookiesByEmail = new Map<string, Cookie[]>()

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

test.describe.serial("Nurse, Dietitian, Pharmacist role smoke", () => {
	test.skip(!HAS_BACKEND, "Requires backend auth API and seeded role accounts")
	test.setTimeout(90_000)

	test.beforeAll(async () => {
		authCookiesByEmail.set("nurse@qhealth.local", await signInForCookies("nurse@qhealth.local"))
		authCookiesByEmail.set(
			"dietitian@qhealth.local",
			await signInForCookies("dietitian@qhealth.local")
		)
		authCookiesByEmail.set(
			"pharmacist@qhealth.local",
			await signInForCookies("pharmacist@qhealth.local")
		)
	})

	test("Nurse can open nursing dashboard", async ({ page }) => {
		await signInAs(page, "nurse@qhealth.local")
		await page.goto("/nursing")

		await expect(page).toHaveURL(/\/nursing/)
		await expect(page.getByRole("heading", { name: /nursing dashboard/i })).toBeVisible()
		await expect(page.getByRole("tab", { name: /news alerts/i })).toBeVisible()
		await expect(
			page.getByText(/you do not have permission to access nursing services/i)
		).toHaveCount(0)
	})

	test("Dietitian can open nutrition dashboard", async ({ page }) => {
		await signInAs(page, "dietitian@qhealth.local")
		await page.goto("/nutrition")

		await expect(page).toHaveURL(/\/nutrition/)
		await expect(page.getByRole("heading", { name: /nutrition & dietetics/i })).toBeVisible()
		await expect(page.getByText(/patient assessment worklist/i)).toBeVisible()
		await expect(
			page.getByText(/you do not have permission to access nutrition services/i)
		).toHaveCount(0)
	})

	test("Pharmacist can open verification queue", async ({ page }) => {
		await signInAs(page, "pharmacist@qhealth.local")
		await page.goto("/pharmacy")

		await expect(page).toHaveURL(/\/pharmacy/)
		await expect(page.getByText(/verification queue/i)).toBeVisible()
			await expect(page.getByRole("button", { name: /^refresh$/i })).toBeVisible()
		await expect(page.getByLabel(/search patient or drug/i)).toBeVisible()
		await expect(page.getByText(/you do not have permission to access pharmacy/i)).toHaveCount(0)
	})
})
