import { expect, request, test, type Page } from "@playwright/test"

const HAS_BACKEND = !!process.env.E2E_AUTH_API_URL
const AUTH_API = process.env.E2E_AUTH_API_URL ?? "http://localhost:3000/api/v1/auth/"
const WEB_ORIGIN = process.env.BASE_URL ?? "http://localhost:3001"
const DEFAULT_PASSWORD = process.env.E2E_SEED_PASSWORD ?? "Password123"

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

test.describe("break-glass emergency access", () => {
	test.skip(!HAS_BACKEND, "Requires backend auth API and seeded clinical data")

	test("physician can request emergency access and auditor can see the event", async ({ page }) => {
		const justification = `E2E code blue emergency override ${Date.now()} requires immediate access to stabilize the patient.`

		await signInAs(page, "doctor@qhealth.local")
		await page.goto("/patients/search")
		await expect(page.getByRole("heading", { name: /^patients$/i })).toBeVisible()

		await page.getByPlaceholder(/filter by name or mrn/i).fill("Pedro")
		await expect(page.getByText("Pedro Reyes")).toBeVisible()
		await page
			.locator("div")
			.filter({ hasText: /Pedro Reyes/ })
			.getByRole("button", { name: /open chart/i })
			.first()
			.click()

		await expect(page.getByRole("dialog", { name: /emergency override access/i })).toBeVisible()
		await page.getByRole("combobox", { name: /reason category/i }).click()
		await page.getByRole("option", { name: /code blue/i }).click()
		await page.getByRole("combobox", { name: /access duration/i }).click()
		await page.getByRole("option", { name: /4 hours/i }).click()
		await page.getByLabel(/clinical justification/i).fill(justification)
		await page.getByLabel(/i acknowledge/i).check()
		await page.getByRole("button", { name: /request emergency access/i }).click()

		await expect(page).toHaveURL(/\/patients\/[0-9a-f-]+/)
		await expect(page.getByText(/temporary break-glass access active/i)).toBeVisible()

		await signInAs(page, "auditor@qhealth.local")
		await page.goto("/auditor/break-glass")
		await expect(page.getByRole("heading", { name: /break-glass reviews/i })).toBeVisible()
		await expect(page.getByText(/code blue/i).first()).toBeVisible()
	})
})
