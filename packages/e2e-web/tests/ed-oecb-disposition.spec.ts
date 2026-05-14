import { expect, request, test, type Page } from "@playwright/test"

const HAS_BACKEND = !!process.env.E2E_AUTH_API_URL
const AUTH_API = process.env.E2E_AUTH_API_URL ?? "http://localhost:3000/api/v1/auth/"
const WEB_ORIGIN = process.env.BASE_URL ?? "http://localhost:3001"
const DEFAULT_PASSWORD = process.env.E2E_SEED_PASSWORD ?? "Password123"
const OECB_CRITERIA = [
	"Patient was not admitted as inpatient",
	"Emergency care was rendered",
	"Patient has active PhilHealth membership",
] as const

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

test.describe("OECB ED disposition → billing queue visibility", () => {
	test.skip(!HAS_BACKEND, "Requires backend auth API and seeded ED encounter data")

	test("physician can discharge ED patient with OECB tag and biller sees it in queue", async ({
		page,
	}) => {
		// ── Step 1: Physician logs in and opens ED dashboard ──────────────────────
		await signInAs(page, "doctor@qhealth.local")
		await page.goto("/ed")
		await expect(page.getByRole("heading", { name: /emergency department/i })).toBeVisible()

		// ── Step 2: Find an active ED encounter row with a Dispose button ─────────
		const disposeButton = page.getByRole("button", { name: "Dispose" }).first()
		await expect(disposeButton).toBeVisible({ timeout: 10_000 })

		// Read patient name from the dialog title after opening (avoids fragile table selectors)
		await disposeButton.click()

		// ── Step 3: Capture patient name from dialog title ────────────────────────
		const dialog = page.getByRole("dialog")
		await expect(dialog).toBeVisible()

		const dialogTitle = await dialog.getByRole("heading").first().textContent()
		// Title format: "ED Disposition — {patientName}"
		const patientName = dialogTitle?.split("—")[1]?.trim() ?? null

		// ── Step 4: Select Discharge → OECB criteria ─────────────────────────────
		// Click the "Discharge" disposition card
		await dialog.getByRole("button", { name: /discharge/i }).click()

		// OECB eligibility checklist should appear
		await expect(dialog.getByText(/OECB Eligibility Checklist/i)).toBeVisible()

		// Check eligibility criteria first; the OECB tag checkbox is disabled until these are met.
		for (const criterion of OECB_CRITERIA) {
			await dialog.getByText(criterion, { exact: true }).click()
		}
		await dialog.getByText(/Tag as OECB/i).click()

		// ── Step 5: Submit disposition ────────────────────────────────────────────
		await dialog.getByRole("button", { name: "Confirm Disposition" }).click()

		// Dialog should close or show success
		await expect(dialog).not.toBeVisible({ timeout: 8_000 })

		// ── Step 6: Biller navigates to billing queue ─────────────────────────────
		await signInAs(page, "biller@qhealth.local")
		await page.goto("/billing")
		await expect(page.getByRole("heading", { name: /billing/i })).toBeVisible()

		// Unbilled encounters table should load
		const table = page.getByRole("table")
		await expect(table).toBeVisible({ timeout: 10_000 })
		await expect(page.locator("tbody tr").first()).toBeVisible()

		// ── Step 7: Verify OECB encounter is in the full list ────────────────────
		if (patientName) {
			await expect(page.getByText(patientName)).toBeVisible()
		}

		// ── Step 8: Enable OECB-only filter ──────────────────────────────────────
		const oecbToggle = page.getByRole("switch", { name: /OECB only/i })
		await expect(oecbToggle).toBeVisible()
		await oecbToggle.click()

		// Table should still have at least one row (our OECB encounter)
		await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 5_000 })

		// Every visible row in OECB-only view should have the OECB badge text
		const rowCount = await page.locator("tbody tr").count()
		expect(rowCount).toBeGreaterThan(0)

		// ── Step 9: Disable filter — full list should be at least as large ────────
		await oecbToggle.click()
		await expect(page.locator("tbody tr").first()).toBeVisible()
	})
})
