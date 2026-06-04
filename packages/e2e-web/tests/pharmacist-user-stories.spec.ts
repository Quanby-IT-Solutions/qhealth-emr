import { expect, test } from "@playwright/test"

import { HAS_BACKEND, preloadRoleAuth, signInAs } from "./helpers/role-auth"

test.describe.serial("Pharmacist Karl-done user stories", () => {
	test.skip(!HAS_BACKEND, "Requires backend auth API and seeded role accounts")
	test.setTimeout(120_000)

	test.beforeAll(async () => {
		await preloadRoleAuth(["pharmacist@qhealth.local"])
	})

	test("Story 10.1 clinical verification queue is accessible", async ({ page }) => {
		await signInAs(page, "pharmacist@qhealth.local")
		await page.goto("/pharmacy")

		await expect(page).toHaveURL(/\/pharmacy/)
		await expect(page.getByText(/verification queue/i)).toBeVisible()
		await expect(page.getByLabel(/search patient or drug/i)).toBeVisible()
		await expect(page.getByRole("button", { name: /^refresh$/i })).toBeVisible()
		await expect(page.getByText(/you do not have permission to access pharmacy/i)).toHaveCount(0)

		const search = page.getByLabel(/search patient or drug/i)
		await search.fill("__no_match_e2e__")
		await expect(search).toHaveValue("__no_match_e2e__")
		await expect(page.getByText(/no orders match the current filters/i)).toBeVisible()

		await page.getByRole("button", { name: /^refresh$/i }).click()
		await expect(page.getByText(/verification queue/i)).toBeVisible()
	})

	test("Story 10.2 formulary note management page is accessible", async ({ page }) => {
		await signInAs(page, "pharmacist@qhealth.local")
		await page.goto("/pharmacy/formulary")

		await expect(page).toHaveURL(/\/pharmacy\/formulary/)
		await expect(page.getByRole("heading", { name: /^formulary$/i })).toBeVisible()
		await expect(page.getByText(/drug formulary/i)).toBeVisible()
		const formularySearch = page.getByPlaceholder(/search formulary items/i)
		await expect(formularySearch).toBeVisible()
		await formularySearch.fill("__no_formulary_match_e2e__")
		await expect(formularySearch).toHaveValue("__no_formulary_match_e2e__")
	})

	test("Story 10.3 outpatient dispensing workflow page is accessible", async ({ page }) => {
		await signInAs(page, "pharmacist@qhealth.local")
		await page.goto("/pharmacy/opd")

		await expect(page).toHaveURL(/\/pharmacy\/opd/)
		await expect(page.getByText(/rx verification/i)).toBeVisible()
		await expect(page.getByText(/billing confirmation/i)).toBeVisible()
		await expect(page.getByText(/step 1 .*scan or enter prescription/i)).toBeVisible()

		const rxSearch = page.getByPlaceholder(/rx number, patient mrn/i)
		await rxSearch.fill("NO-RX-FOUND-E2E")
		await page.getByRole("button", { name: /^search$/i }).click()
		await expect(page.getByText(/prescription not found/i)).toBeVisible()
	})
})
