import { expect, request, test, type Cookie, type Page } from "@playwright/test"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Client } = require("pg")

const HAS_BACKEND = !!process.env.E2E_AUTH_API_URL
const AUTH_API = process.env.E2E_AUTH_API_URL ?? "http://localhost:3000/api/v1/auth/"
const WEB_ORIGIN = process.env.BASE_URL ?? "http://localhost:3001"
const DATABASE_URL =
	process.env.DATABASE_URL ?? "postgres://postgres:password@localhost:5432/qhealth-emr"
const DEFAULT_PASSWORD = process.env.E2E_SEED_PASSWORD ?? "Password123"

const LAB_INDICATION = "E2E 5.5 Fever and productive cough"
const IMAGING_INDICATION = "E2E 5.5 Persistent cough and fever"
const ORDER_SET_INDICATION = "Suspected sepsis"
const ICD10_CODE = "J18.9"
const ICD10_DISPLAY = "Pneumonia, unspecified organism"

type OrderEntryFixture = {
	patientId: string
	encounterId: string
	facilityId: string
}

const authCookiesByEmail = new Map<string, Cookie[]>()

async function withDb<T>(fn: (client: typeof Client.prototype) => Promise<T>): Promise<T> {
	const client = new Client({ connectionString: DATABASE_URL })
	await client.connect()
	try {
		return await fn(client)
	} finally {
		await client.end()
	}
}

async function signInForCookies(email: string) {
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
	await api.dispose()
	return cookies
}

async function signInAs(page: Page, email: string) {
	let cookies = authCookiesByEmail.get(email)
	if (!cookies) {
		cookies = await signInForCookies(email)
		authCookiesByEmail.set(email, cookies)
	}

	await page.context().clearCookies()
	await page.context().addCookies(cookies)
}

async function seedOrderEntryFixture(): Promise<OrderEntryFixture> {
	return withDb(async client => {
		const context = await client.query(
			`select p.id as patient_id,
			        e.id as encounter_id,
			        sp.facility_id
			 from patients p
			 join encounters e on e.patient_id = p.id
			 join staff_profiles sp on true
			 join users u on u.id = sp.user_id
			 where u.email = 'doctor@qhealth.local'
			   and p.first_name = 'Maria'
			   and p.last_name = 'Santos'
			   and e.chief_complaint ilike '%Fever and productive cough%'
			 limit 1`
		)

		if (context.rowCount === 0) {
			throw new Error("Seed patient Maria Santos ER encounter was not found.")
		}

		const fixture = {
			patientId: context.rows[0].patient_id as string,
			encounterId: context.rows[0].encounter_id as string,
			facilityId: context.rows[0].facility_id as string,
		}

		await client.query(
			`delete from lab_orders
			 where encounter_id = $1
			   and (
			   	clinical_indication in ($2, $3)
			   	or indication_icd10_code = 'A41.9'
			   	or panel_name = 'Sepsis Bundle'
			   )`,
			[fixture.encounterId, LAB_INDICATION, ORDER_SET_INDICATION]
		)
		await client.query(
			`delete from imaging_orders
			 where encounter_id = $1
			   and (
			   	clinical_indication in ($2, $3)
			   	or indication_icd10_code = 'A41.9'
			   )`,
			[fixture.encounterId, IMAGING_INDICATION, ORDER_SET_INDICATION]
		)

		return fixture
	})
}

async function openEncounterOrders(page: Page, fixture: OrderEntryFixture) {
	await page.goto(`/patients/${fixture.patientId}/encounters/${fixture.encounterId}/orders`)
	await expect(page.getByRole("link", { name: /^orders$/i })).toBeVisible()
	await expect(page.getByRole("tab", { name: /^all orders$/i })).toBeVisible()
}

async function switchOrdersTab(
	page: Page,
	tabName: "All Orders" | "Labs" | "Imaging",
	options: { expectCreateButton?: boolean } = {},
) {
	const expectCreateButton = options.expectCreateButton ?? true
	const tab = page.getByRole("tab", { name: tabName, exact: true })
	for (let attempt = 0; attempt < 5; attempt++) {
		await tab.click({ force: true })
		try {
			if (tabName === "Labs") {
				await expect(page.getByText("Lab Orders").first()).toBeVisible({ timeout: 1_500 })
				if (expectCreateButton) {
					await expect(page.getByRole("button", { name: /new lab order/i })).toBeVisible({
						timeout: 1_500,
					})
				}
			} else if (tabName === "Imaging") {
				await expect(page.getByText("Imaging Orders").first()).toBeVisible({ timeout: 1_500 })
				if (expectCreateButton) {
					await expect(page.getByRole("button", { name: /new imaging order/i })).toBeVisible({
						timeout: 1_500,
					})
				}
			} else {
				await expect(page.getByText("All Orders")).toBeVisible({ timeout: 1_500 })
			}
			return
		} catch {
			await page.waitForTimeout(300)
		}
	}
}

async function chooseSelectOption(page: Page, trigger: ReturnType<Page["locator"]>, optionName: RegExp) {
	await trigger.click()
	await page.getByRole("option", { name: optionName }).click()
}

async function createManualLabOrder(page: Page, fixture: OrderEntryFixture) {
	await signInAs(page, "doctor@qhealth.local")
	await openEncounterOrders(page, fixture)
	await switchOrdersTab(page, "Labs")

	const labDialog = page.getByRole("dialog", { name: /new lab order/i })
	await page.getByRole("button", { name: /new lab order/i }).click()
	await expect(labDialog).toBeVisible()

	await expect(labDialog.getByRole("button", { name: /sign lab order/i })).toBeDisabled()
	await labDialog.locator("#labTestName").fill("Complete Blood Count")
	await labDialog.locator("#labPanelName").fill("Hematology")
	await labDialog.locator("#labLoincCode").fill("57021-8")
	await labDialog.locator("#labSpecimenType").fill("Blood")
	await labDialog.locator("#labClinicalIndication").fill(LAB_INDICATION)
	await labDialog.locator("#labIndicationIcd10Code").fill(ICD10_CODE)
	await labDialog.locator("#labIndicationIcd10Display").fill(ICD10_DISPLAY)
	await chooseSelectOption(page, labDialog.locator("#labPriority"), /stat/i)
	await labDialog.getByRole("button", { name: /sign lab order/i }).click()
	await expect(labDialog).not.toBeVisible({ timeout: 15_000 })

	await expect(page.getByText("Complete Blood Count").first()).toBeVisible({ timeout: 15_000 })
	await expect(page.getByText("Hematology").first()).toBeVisible()
	await expect(page.getByText("57021-8").first()).toBeVisible()
	await expect(page.getByText(LAB_INDICATION).first()).toBeVisible()
	await expect(page.getByText(ICD10_CODE).first()).toBeVisible()
	await expect(page.getByText(/ordered/i).first()).toBeVisible()

	await switchOrdersTab(page, "All Orders")
	await expect(page.getByText("Complete Blood Count").first()).toBeVisible()
	await expect(page.getByText("Lab").first()).toBeVisible()
}

async function createManualImagingOrder(page: Page, fixture: OrderEntryFixture) {
	await signInAs(page, "doctor@qhealth.local")
	await openEncounterOrders(page, fixture)
	await switchOrdersTab(page, "Imaging")

	const imagingDialog = page.getByRole("dialog", { name: /new imaging order/i })
	await page.getByRole("button", { name: /new imaging order/i }).click()
	await expect(imagingDialog).toBeVisible()

	await expect(imagingDialog.getByRole("button", { name: /sign imaging order/i })).toBeDisabled()
	await chooseSelectOption(page, imagingDialog.locator("#imgModality"), /x-ray/i)
	await expect(imagingDialog.getByRole("button", { name: /sign imaging order/i })).toBeDisabled()
	await imagingDialog.locator("#imgBodyPart").fill("Chest")
	await imagingDialog.locator("#imgClinicalIndication").fill(IMAGING_INDICATION)
	await imagingDialog.locator("#imgIndicationIcd10Code").fill(ICD10_CODE)
	await imagingDialog.locator("#imgIndicationIcd10Display").fill(ICD10_DISPLAY)
	await chooseSelectOption(page, imagingDialog.locator("#imgPriority"), /urgent/i)
	await imagingDialog.getByRole("button", { name: /sign imaging order/i }).click()
	await expect(imagingDialog).not.toBeVisible({ timeout: 15_000 })

	await expect(page.getByText("xray").first()).toBeVisible({ timeout: 15_000 })
	await expect(page.getByText("Chest").first()).toBeVisible()
	await expect(page.getByText(IMAGING_INDICATION).first()).toBeVisible()
	await expect(page.getByText(ICD10_CODE).first()).toBeVisible()
	await expect(page.getByText(/urgent/i).first()).toBeVisible()

	await switchOrdersTab(page, "All Orders")
	await expect(page.getByText("X-Ray - Chest").first()).toBeVisible()
	await expect(page.getByText("Imaging").first()).toBeVisible()
}

async function createSepsisOrderSet(page: Page, fixture: OrderEntryFixture) {
	await signInAs(page, "doctor@qhealth.local")
	await openEncounterOrders(page, fixture)

	await page.getByRole("button", { name: /order set/i }).first().click()
	const dialog = page.getByRole("dialog", { name: /create order set/i })
	await expect(dialog).toBeVisible()
	await expect(dialog.getByText("Sepsis Bundle").first()).toBeVisible()
	await expect(dialog.getByText(/5 orders will be created/i)).toBeVisible()
	await expect(dialog.getByText("A41.9").first()).toBeVisible()
	await expect(dialog.getByText("Complete Blood Count").first()).toBeVisible()
	await expect(dialog.getByText(/x-ray - chest/i)).toBeVisible()
	await dialog.getByRole("button", { name: /sign order set/i }).click()
	await expect(dialog).not.toBeVisible({ timeout: 20_000 })

	await switchOrdersTab(page, "Labs")
	await expect(page.getByText("Sepsis Bundle").first()).toBeVisible({ timeout: 15_000 })
	await expect(page.getByText("A41.9").first()).toBeVisible()

	await switchOrdersTab(page, "Imaging")
	await expect(page.getByText("xray").first()).toBeVisible()
	await expect(page.getByText("Chest").first()).toBeVisible()
	await expect(page.getByText("A41.9").first()).toBeVisible()
}

async function expectLabWorklistOrder(page: Page) {
	await signInAs(page, "labtech@qhealth.local")
	await page.goto("/laboratory")
	await expect(page.getByRole("heading", { name: /laboratory orders/i })).toBeVisible()
	await page.getByRole("tab", { name: /pending/i }).click()
	await expect(page.getByText("Complete Blood Count").first()).toBeVisible({ timeout: 30_000 })
	await expect(page.getByText("Hematology").first()).toBeVisible()
	await expect(page.getByText("Blood").first()).toBeVisible()
	await expect(page.getByText(LAB_INDICATION).first()).toBeVisible()
	await expect(page.getByText(ICD10_CODE).first()).toBeVisible()
	await expect(page.getByText("STAT").first()).toBeVisible()
	await expect(page.getByText(/ordered/i).first()).toBeVisible()

	await page.getByRole("combobox").first().click()
	await page.getByRole("option", { name: /stat only/i }).click()
	await expect(page.getByText("Complete Blood Count").first()).toBeVisible()

	await page.reload()
	await expect(page.getByText("Complete Blood Count").first()).toBeVisible({ timeout: 30_000 })
	await expect(page.getByText(LAB_INDICATION).first()).toBeVisible()
}

async function expectRadiologyWorklistOrder(page: Page) {
	await signInAs(page, "radiologist@qhealth.local")
	await page.goto("/radiology")
	await expect(page.getByRole("heading", { name: /imaging orders/i })).toBeVisible()
	await page.getByRole("tab", { name: /pending/i }).click()
	await expect(page.getByText("xray").first()).toBeVisible({ timeout: 30_000 })
	await expect(page.getByText("Chest").first()).toBeVisible()
	await expect(page.getByText(IMAGING_INDICATION).first()).toBeVisible()
	await expect(page.getByText(ICD10_CODE).first()).toBeVisible()
	await expect(page.getByText(/urgent/i).first()).toBeVisible()
	await expect(page.getByText(/ordered/i).first()).toBeVisible()
	await expect(page.getByText(/Dr\. Miguel Santos/i).first()).toBeVisible()

	await page.getByRole("button", { name: /report/i }).first().click()
	await expect(page.getByText(/report pending/i)).toBeVisible()
	await expect(page.getByText(IMAGING_INDICATION).first()).toBeVisible()
	await expect(page.getByText(ICD10_CODE).first()).toBeVisible()
}

test.describe.serial("Lab and imaging order entry", () => {
	test.skip(!HAS_BACKEND, "Requires backend auth API and seeded clinical data")
	test.setTimeout(180_000)

	let fixture: OrderEntryFixture

	test.beforeAll(async () => {
		fixture = await seedOrderEntryFixture()
		for (const email of [
			"doctor@qhealth.local",
			"labtech@qhealth.local",
			"radiologist@qhealth.local",
		]) {
			authCookiesByEmail.set(email, await signInForCookies(email))
		}
	})

	test("Flow 1-2. physician lab CPOE reaches lab tech pending worklist", async ({ page }) => {
		await createManualLabOrder(page, fixture)
		await expectLabWorklistOrder(page)
	})

	test("Flow 3-4. physician imaging CPOE reaches radiologist pending worklist", async ({ page }) => {
		await createManualImagingOrder(page, fixture)
		await expectRadiologyWorklistOrder(page)
	})

	test("Flow 5. sepsis order set creates lab and imaging requisitions with ICD-10 context", async ({
		page,
	}) => {
		await createSepsisOrderSet(page, fixture)

		await signInAs(page, "labtech@qhealth.local")
		await page.goto("/laboratory")
		await expect(page.getByText("Sepsis Bundle").first()).toBeVisible({ timeout: 30_000 })
		await expect(page.getByText("A41.9").first()).toBeVisible()

		await signInAs(page, "radiologist@qhealth.local")
		await page.goto("/radiology")
		await expect(page.getByText("Suspected sepsis").first()).toBeVisible({ timeout: 30_000 })
		await expect(page.getByText("A41.9").first()).toBeVisible()
	})

	test("Negative checks. validation and ancillary role restrictions", async ({ page }) => {
		await signInAs(page, "doctor@qhealth.local")
		await openEncounterOrders(page, fixture)
		await switchOrdersTab(page, "Labs")
		await page.getByRole("button", { name: /new lab order/i }).click()
		const labDialog = page.getByRole("dialog", { name: /new lab order/i })
		await expect(labDialog.getByRole("button", { name: /sign lab order/i })).toBeDisabled()
		await labDialog.getByRole("button", { name: /^cancel$/i }).click()

		await switchOrdersTab(page, "Imaging")
		await page.getByRole("button", { name: /new imaging order/i }).click()
		const imagingDialog = page.getByRole("dialog", { name: /new imaging order/i })
		await expect(imagingDialog.getByRole("button", { name: /sign imaging order/i })).toBeDisabled()
		await chooseSelectOption(page, imagingDialog.locator("#imgModality"), /x-ray/i)
		await expect(imagingDialog.getByRole("button", { name: /sign imaging order/i })).toBeDisabled()
		await imagingDialog.getByRole("button", { name: /^cancel$/i }).click()

		await signInAs(page, "labtech@qhealth.local")
		await openEncounterOrders(page, fixture)
		await switchOrdersTab(page, "Labs", { expectCreateButton: false })
		await expect(page.getByRole("button", { name: /new lab order/i })).toHaveCount(0)
		await expect(page.getByRole("button", { name: /order set/i })).toHaveCount(0)

		await signInAs(page, "radiologist@qhealth.local")
		await openEncounterOrders(page, fixture)
		await switchOrdersTab(page, "Imaging", { expectCreateButton: false })
		await expect(page.getByRole("button", { name: /new imaging order/i })).toHaveCount(0)
		await expect(page.getByRole("button", { name: /order set/i })).toHaveCount(0)
	})
})
