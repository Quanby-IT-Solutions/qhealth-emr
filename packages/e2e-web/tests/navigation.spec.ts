import { expect, test } from "@playwright/test"

test.describe("protected route guards", () => {
	test("redirects /dashboard to /login when unauthenticated", async ({ page }) => {
		await page.goto("/dashboard")
		await expect(page).toHaveURL(/\/login/)
	})
})

test.describe("auth page cross-links", () => {
	test("Sign In CTA on home navigates to /login", async ({ page }) => {
		await page.goto("/")
		await page
			.getByRole("link", { name: /sign in/i })
			.first()
			.click()
		await expect(page).toHaveURL(/\/login/)
	})

	test("register page Sign in link navigates to /login", async ({ page }) => {
		await page.goto("/register")
		await page.getByRole("link", { name: /sign in/i }).click()
		await expect(page).toHaveURL(/\/login/)
	})
})
