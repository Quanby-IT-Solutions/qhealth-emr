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
			"X-Forwarded-For": `127.0.0.${Math.floor(Math.random() * 200) + 20}`,
		},
	})

	let authRes = await api.post("sign-in/email", {
		data: { email, password: DEFAULT_PASSWORD },
	})
	for (let attempt = 0; authRes.status() === 429 && attempt < 6; attempt++) {
		await new Promise(resolve => setTimeout(resolve, 5_000))
		authRes = await api.post("sign-in/email", {
			data: { email, password: DEFAULT_PASSWORD },
		})
	}
	if (!authRes.ok()) {
		const body = await authRes.text()
		await api.dispose()
		throw new Error(`Failed to sign in as ${email}: ${authRes.status()} ${body}`)
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
	await switchToMedicationsTab(page)
}

async function switchToMedicationsTab(page: Page) {
	const medicationsTab = page.getByRole("tab", { name: /^medications$/i })
	for (let attempt = 0; attempt < 6; attempt++) {
		await medicationsTab.click({ force: true })
		await page.evaluate(() => {
			const tab = [...document.querySelectorAll<HTMLElement>("[role='tab'],button")].find(
				element => element.textContent?.trim() === "Medications"
			)
			tab?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))
			tab?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))
			tab?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }))
			tab?.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }))
			tab?.click()
		})

		try {
			await expect(medicationsTab).toHaveAttribute("aria-selected", "true", { timeout: 1_500 })
			await expect(page.getByText("Medication Orders")).toBeVisible({ timeout: 2_000 })
			await expect(page.getByRole("button", { name: /new medication order/i })).toBeVisible({
				timeout: 2_000,
			})
			return
		} catch {
			await page.waitForTimeout(300)
		}
	}

	await expect(page.getByText("Medication Orders")).toBeVisible()
	await expect(page.getByRole("button", { name: /new medication order/i })).toBeVisible()
}

async function openNewMedicationOrderDialog(page: Page) {
	const dialog = page.getByRole("dialog", { name: /new medication order/i })

	for (let attempt = 0; attempt < 5; attempt++) {
		await switchToMedicationsTab(page)
		const button = page.getByRole("button", { name: /new medication order/i })
		if (!(await button.isVisible())) {
			await page.waitForTimeout(300)
			continue
		}
		await page.evaluate(() => {
			const button = [...document.querySelectorAll<HTMLButtonElement>("button")].find(candidate =>
				/new medication order/i.test(candidate.textContent ?? "")
			)
			button?.click()
		})

		try {
			await expect(dialog).toBeVisible({ timeout: 2_000 })
			return dialog
		} catch {
			await page.waitForTimeout(300)
		}
	}

	await switchToMedicationsTab(page)
	await expect(page.getByRole("button", { name: /new medication order/i })).toBeVisible()
	await expect(dialog).toBeVisible()
	return dialog
}

async function selectDrug(page: Page, dialog: ReturnType<Page["getByRole"]>, genericName: string) {
	for (let attempt = 0; attempt < 5; attempt++) {
		const input = dialog.getByPlaceholder(/amoxicillin/i)
		try {
			await expect(input).toBeVisible({ timeout: 2_000 })
			await input.click()
			await input.press(process.platform === "darwin" ? "Meta+A" : "Control+A")
			await input.type(genericName, { delay: 15 })
			const option = page.getByRole("option").filter({ hasText: genericName }).first()
			await expect(option).toBeVisible({ timeout: 3_000 })
			await option.click()
			return
		} catch {
			await page.waitForTimeout(300)
		}
	}

	await dialog.getByPlaceholder(/amoxicillin/i).fill(genericName)
	await page.getByRole("option").filter({ hasText: genericName }).first().click()
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

		await selectDrug(page, dialog, "Paracetamol")

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
		await expect(dialog.getByText(/drug safety check/i).first()).toBeVisible()
		await expect(dialog.getByText(/pdea regulations require dispensing in 30-day/i)).toBeVisible()
		const clickedOverride = await dialog.evaluate(element => {
			const button = [...element.querySelectorAll<HTMLButtonElement>("button")].find(candidate =>
				/Override/i.test(candidate.textContent ?? "")
			)
			button?.click()
			return Boolean(button)
		})
		if (clickedOverride) {
			await dialog
				.getByPlaceholder(/document the clinical justification/i)
				.fill("PDEA e2e controlled-drug tranching validation.")
			await dialog.getByRole("button", { name: /confirm override/i }).click()
			await expect(dialog.getByText("Overridden").first()).toBeVisible()
		}

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
		await expect(page.getByText(/tranche #2/i).first()).toBeVisible()
		await expect(page.getByText(/of 2/i).first()).toBeVisible()
	})
})
