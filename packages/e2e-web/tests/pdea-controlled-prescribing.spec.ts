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

async function openMariaErOrders(page: Page) {
	await page.goto("/patients/search")
	await expect(page.getByRole("heading", { name: /^patients$/i })).toBeVisible()

	await page.getByPlaceholder(/filter by name or mrn/i).fill("Maria")
	await expect(page.getByText("Maria Santos")).toBeVisible()
	await page
		.locator("div")
		.filter({ hasText: /Maria Santos/ })
		.getByRole("button", { name: /open chart/i })
		.first()
		.click()

	await expect(page.getByRole("heading", { name: /maria santos/i })).toBeVisible()
	await page.getByRole("link", { name: /fever and productive cough/i }).click()
	await expect(page).toHaveURL(/\/patients\/[0-9a-f-]+\/encounters\/[0-9a-f-]+/)
	await page.getByRole("link", { name: /^orders$/i }).click()
	const medicationsTab = page.getByRole("tab", { name: /^medications$/i })
	const box = await medicationsTab.boundingBox()
	if (box) {
		await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
	} else {
		await medicationsTab.click({ force: true })
	}
	await expect(page.getByText("Medication Orders")).toBeVisible()
	await expect(page.getByRole("button", { name: /new medication order/i })).toBeVisible()
}

async function openNewMedicationOrderDialog(page: Page) {
	const medicationsTab = page.getByRole("tab", { name: /^medications$/i })
	const dialog = page.getByRole("dialog", { name: /new medication order/i })

	for (let attempt = 0; attempt < 5; attempt++) {
		let button = page.getByRole("button", { name: /new medication order/i })
		if (!(await button.isVisible())) {
			const box = await medicationsTab.boundingBox()
			if (box) {
				await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
			} else {
				await medicationsTab.click({ force: true })
			}
			await expect(page.getByText("Medication Orders")).toBeVisible({ timeout: 2_000 })
			button = page.getByRole("button", { name: /new medication order/i })
		}
		await expect(button).toBeVisible()
		await button.click({ force: true })

		try {
			await expect(dialog).toBeVisible({ timeout: 2_000 })
			return dialog
		} catch {
			await page.waitForTimeout(300)
		}
	}

	await expect(dialog).toBeVisible()
	return dialog
}

test.describe("PDEA controlled drug prescribing", () => {
	test.skip(!HAS_BACKEND, "Requires backend auth API and seeded clinical data")

	test("physician creates a 60-day S-2 controlled order split into 30-day no-refill tranches", async ({
		page,
	}) => {
		test.setTimeout(90_000)
		await signInAs(page, "doctor@qhealth.local")
		await openMariaErOrders(page)

		const dialog = await openNewMedicationOrderDialog(page)

		await dialog.getByPlaceholder(/amoxicillin/i).fill("Paracetamol")
		await expect(page.getByText("Paracetamol").first()).toBeVisible()
		await page.getByRole("option", { name: /paracetamol/i }).first().click()

		await dialog.locator("#dose").fill("10")
		await dialog.locator("#doseUnit").fill("mg")
		await dialog.locator("#doseForm").fill("tablet")
		await dialog.locator("#route").fill("oral")

		await dialog.getByLabel(/frequency/i).click()
		await page.getByRole("option", { name: "Daily", exact: true }).click()
		await dialog.locator("#durationDays").fill("60")

		await dialog
			.getByRole("checkbox", { name: /controlled substance/i })
			.click()
		const s2Dialog = page.getByRole("dialog", { name: /s-2 license validation/i })
		await expect(s2Dialog).toBeVisible()
		await expect(s2Dialog.getByText("S-2 License Valid", { exact: true })).toBeVisible()
		await s2Dialog.getByRole("button", { name: /proceed to controlled drug order/i }).click()

		await expect(dialog.getByText(/s-2 license #s2-100001/i)).toBeVisible()
		await dialog.getByLabel(/pdea schedule/i).click()
		await page.getByRole("option", { name: /s-2 \/ list a/i }).click()

		await dialog.getByRole("button", { name: /run drug safety check/i }).click()
		await expect(dialog.getByText(/safety check complete/i)).toBeVisible()
		await expect(dialog.getByText(/pdea regulations require dispensing in 30-day/i)).toBeVisible()

		await dialog.getByRole("button", { name: /preview tranches/i }).click()
		const trancheDialog = page.getByRole("dialog", { name: /controlled substance tranche preview/i })
		await expect(trancheDialog).toBeVisible()
		await expect(trancheDialog.getByText(/requires 2 tranches/i)).toBeVisible()
		await expect(trancheDialog.getByText(/no refill/i).first()).toBeVisible()
		await expect(trancheDialog.getByText(/next tranche dispense date/i)).toBeVisible()
		await trancheDialog.getByRole("button", { name: /confirm.*submit order/i }).click()

		await expect(dialog).not.toBeVisible({ timeout: 15_000 })
		await page.getByRole("tab", { name: /pending/i }).click()
		await expect(page.getByText("Paracetamol").first()).toBeVisible({ timeout: 15_000 })
		await expect(page.getByText(/CS S-2/i).first()).toBeVisible()

		await page.getByRole("button", { name: /expand tranches/i }).first().click()
		await expect(page.getByText(/tranche #2/i)).toBeVisible()
		await expect(page.getByText(/of 2/i).first()).toBeVisible()
	})
})
