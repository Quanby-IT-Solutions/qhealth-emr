import { expect, test } from "@playwright/test"

test.describe("landing page", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/")
	})

	test("displays the main heading", async ({ page }) => {
		await expect(page.getByRole("heading", { level: 1 })).toContainText(
			/electronic medical record/i
		)
	})

	test("shows the Philippine healthcare positioning", async ({ page }) => {
		await expect(page.getByText(/philippine healthcare/i).first()).toBeVisible()
	})

	test("shows the product description", async ({ page }) => {
		await expect(page.getByText(/compliant by design/i)).toBeVisible()
	})

	test("shows a Sign In CTA linking to /login when logged out", async ({ page }) => {
		const cta = page.getByRole("link", { name: /sign in/i }).first()
		await expect(cta).toBeVisible()
		await expect(cta).toHaveAttribute("href", "/login")
	})
})
