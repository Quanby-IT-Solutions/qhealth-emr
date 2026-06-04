import { expect, test } from "@playwright/test"

// All tests in this file run with stored auth session (chromium-authenticated project)

test.describe("authenticated dashboard", () => {
	test("is accessible without redirect", async ({ page }) => {
		await page.goto("/dashboard")
		await expect(page).toHaveURL(/\/dashboard/)
	})

	test("shows the Dashboard breadcrumb", async ({ page }) => {
		await page.goto("/dashboard")
		await expect(
			page.locator('[data-slot="breadcrumb-page"]', { hasText: /dashboard/i })
		).toBeVisible()
	})
})

test.describe("authenticated session page", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/session")
	})

	test("loads without redirecting to login", async ({ page }) => {
		await expect(page).toHaveURL(/\/session/)
	})

	test("displays session information", async ({ page }) => {
		await expect(page.getByText("Server Session")).toBeVisible()
		await expect(page.getByText("Client Session")).toBeVisible()
	})

	test("server session is not null", async ({ page }) => {
		// Session JSON is rendered inside a <pre> in the ServerSession component.
		await expect(page.locator("pre").first()).not.toContainText("No active session")
	})

	test("server session includes user email", async ({ page }) => {
		const testEmail = process.env.E2E_TEST_EMAIL ?? "test@gmail.com"
		await expect(page.locator("pre").first()).toContainText(testEmail)
	})
})
