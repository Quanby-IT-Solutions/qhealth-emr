import { expect, test } from "@playwright/test"

import { HAS_BACKEND, preloadRoleAuth, signInAs } from "./helpers/role-auth"

test.describe.serial("Nurse Karl-done user stories", () => {
	test.skip(!HAS_BACKEND, "Requires backend auth API and seeded role accounts")
	test.setTimeout(120_000)

	test.beforeAll(async () => {
		await preloadRoleAuth(["nurse@qhealth.local"])
	})

	test("Story 3.3 ER Patient Tracker page is accessible", async ({ page }) => {
		await signInAs(page, "nurse@qhealth.local")
		await page.goto("/ed")

		await expect(page).toHaveURL(/\/ed/)
		await expect(page.getByRole("heading", { name: /emergency department/i })).toBeVisible()
		const tableTab = page.getByRole("tab", { name: /table view/i })
		const boardTab = page.getByRole("tab", { name: /tracking board/i })
		await expect(tableTab).toBeVisible()
		await expect(boardTab).toBeVisible()
		await boardTab.click()
		await expect(boardTab).toHaveAttribute("aria-selected", "true")
		await tableTab.click()
		await expect(tableTab).toHaveAttribute("aria-selected", "true")
		await expect(
			page.getByText(/you do not have permission to access the emergency department module/i)
		).toHaveCount(0)
	})

	test("Stories 6.1, 6.2, 6.3 NBS logbook, consent/waiver, referral tracking are visible", async ({
		page,
	}) => {
		await signInAs(page, "nurse@qhealth.local")
		await page.goto("/nbs")

		await expect(page).toHaveURL(/\/nbs/)
		await expect(page.getByRole("heading", { name: /newborn screening/i })).toBeVisible()
		await expect(page.getByText(/consent & waiver/i)).toBeVisible()
		await expect(page.getByText("Referral Tracking", { exact: true })).toBeVisible()
		await expect(page.getByRole("main").getByText("NBS Logbook", { exact: true })).toBeVisible()
	})

	test("Stories 7.1 to 7.6 nursing dashboard modules are visible", async ({ page }) => {
		await signInAs(page, "nurse@qhealth.local")
		await page.goto("/nursing")

		await expect(page).toHaveURL(/\/nursing/)
		await expect(page.getByRole("heading", { name: /nursing dashboard/i })).toBeVisible()
		const alertsTab = page.getByRole("tab", { name: /news alerts/i })
		const haiTab = page.getByRole("tab", { name: /hai surveillance/i })
		const nbsTab = page.getByRole("tab", { name: /nbs worklist/i })
		await expect(alertsTab).toBeVisible()
		await expect(haiTab).toBeVisible()
		await expect(nbsTab).toBeVisible()

		await haiTab.click()
		await expect(haiTab).toHaveAttribute("aria-selected", "true")
		await nbsTab.click()
		await expect(nbsTab).toHaveAttribute("aria-selected", "true")
		await alertsTab.click()
		await expect(alertsTab).toHaveAttribute("aria-selected", "true")
	})

	test("Story 8.4 bedside transfusion verification field behavior works", async ({ page }) => {
		await signInAs(page, "nurse@qhealth.local")
		await page.goto("/transfusion")

		await expect(page).toHaveURL(/\/transfusion/)
		await expect(
			page.getByRole("heading", { name: /bedside transfusion verification/i })
		).toBeVisible()

		const patientMrn = page.getByLabel(/patient mrn/i)
		const wristband = page.getByLabel(/patient wristband barcode/i)
		const bloodUnit = page.getByLabel(/blood unit barcode/i)
		const verifyButton = page.getByRole("button", { name: /verify match/i })
		const resetButton = page.getByRole("button", { name: /^reset$/i })

		await expect(patientMrn).toBeVisible()
		await expect(wristband).toBeVisible()
		await expect(bloodUnit).toBeVisible()
		await expect(verifyButton).toBeDisabled()

		await patientMrn.fill("E2E-MRN-001")
		await wristband.fill("WB-001")
		await bloodUnit.fill("BU-001")
		await expect(patientMrn).toHaveValue("E2E-MRN-001")
		await expect(wristband).toHaveValue("WB-001")
		await expect(bloodUnit).toHaveValue("BU-001")

		await resetButton.click()
		await expect(patientMrn).toHaveValue("")
		await expect(wristband).toHaveValue("")
		await expect(bloodUnit).toHaveValue("")
	})

	test("Story 18.2 sync status and reconnect workflow controls are working", async ({ page }) => {
		await signInAs(page, "nurse@qhealth.local")
		await page.goto("/nursing/sync")

		await expect(page).toHaveURL(/\/nursing\/sync/)
		await expect(page.getByRole("heading", { name: /offline synchronization/i })).toBeVisible()
		await expect(page.getByText(/offline sync status/i)).toBeVisible()

		const syncNow = page.getByRole("button", { name: /sync now/i })
		await expect(syncNow).toBeVisible()
		if (await syncNow.isEnabled()) {
			await syncNow.click()
			await expect(page.getByText(/offline sync status/i)).toBeVisible()
		}
	})
})
