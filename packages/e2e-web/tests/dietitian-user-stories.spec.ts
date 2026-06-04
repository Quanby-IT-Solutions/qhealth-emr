import { expect, test } from "@playwright/test"

import { HAS_BACKEND, preloadRoleAuth, signInAs } from "./helpers/role-auth"

test.describe.serial("Dietitian Karl-done user stories", () => {
	test.skip(!HAS_BACKEND, "Requires backend auth API and seeded role accounts")
	test.setTimeout(90_000)

	test.beforeAll(async () => {
		await preloadRoleAuth(["dietitian@qhealth.local"])
	})

	test("Story 11.1 Nutrition Assessment dashboard/worklist is accessible", async ({ page }) => {
		await signInAs(page, "dietitian@qhealth.local")
		await page.goto("/nutrition")

		await expect(page).toHaveURL(/\/nutrition/)
		await expect(page.getByRole("heading", { name: /nutrition & dietetics/i })).toBeVisible()
		await expect(page.getByText(/patient assessment worklist/i)).toBeVisible()
		await expect(page.getByText(/high-risk patients/i)).toBeVisible()
		await expect(
			page.getByText(/you do not have permission to access nutrition services/i)
		).toHaveCount(0)

		const riskTrigger = page.getByRole("combobox").first()
		await riskTrigger.click()
		await page.getByRole("option", { name: /high risk/i }).click()
		await expect(riskTrigger).toContainText(/high/i)

		const refresh = page.getByRole("button", { name: /^refresh$/i })
		await refresh.click()
		await expect(page.getByText(/patient assessment worklist/i)).toBeVisible()
	})

	test("Story 11.2 meal plan and NutritionOrder workflow markers are visible", async ({ page }) => {
		await signInAs(page, "dietitian@qhealth.local")
		await page.goto("/nutrition")

		await expect(page.getByText(/pending meal plans/i)).toBeVisible()
		await expect(page.getByText(/fhir diet order management/i)).toBeVisible()
	})
})
