import { expect, request, test, type Cookie, type Page } from "@playwright/test"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Client } = require("pg")

const HAS_BACKEND = !!process.env.E2E_AUTH_API_URL
const AUTH_API = process.env.E2E_AUTH_API_URL ?? "http://localhost:3000/api/v1/auth/"
const WEB_ORIGIN = process.env.BASE_URL ?? "http://localhost:3001"
const DATABASE_URL =
	process.env.DATABASE_URL ?? "postgres://postgres:password@localhost:5432/qhealth-emr"
const DEFAULT_PASSWORD = process.env.E2E_SEED_PASSWORD ?? "Password123"

type SafetyFixture = {
	patientId: string
	encounterId: string
	facilityId: string
	doctorStaffId: string
	pharmacistStaffId: string
	highAlertOrderId?: string
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

async function ensureFormularyItem(
	client: typeof Client.prototype,
	facilityId: string,
	genericName: string,
	{
		doseForm,
		strength,
		route,
		isHighAlert = false,
		highAlertNotes = null,
		isRestricted = false,
		restrictionNotes = null,
	}: {
		doseForm: string
		strength: string
		route: string
		isHighAlert?: boolean
		highAlertNotes?: string | null
		isRestricted?: boolean
		restrictionNotes?: string | null
	}
) {
	let generic = await client.query(
		`select id from drug_generics where lower(generic_name) = lower($1) limit 1`,
		[genericName]
	)

	if (generic.rowCount === 0) {
		generic = await client.query(
			`insert into drug_generics (generic_name, is_active) values ($1, true) returning id`,
			[genericName]
		)
	}

	const drugGenericId = generic.rows[0].id
	let item = await client.query(
		`select id from formulary_items where facility_id = $1 and drug_generic_id = $2 limit 1`,
		[facilityId, drugGenericId]
	)

	if (item.rowCount === 0) {
		item = await client.query(
			`insert into formulary_items
				(facility_id, drug_generic_id, dose_form, strength, route, is_active, is_high_alert, high_alert_notes, is_restricted, restriction_notes)
			 values ($1, $2, $3, $4, $5, true, $6, $7, $8, $9)
			 returning id`,
			[
				facilityId,
				drugGenericId,
				doseForm,
				strength,
				route,
				isHighAlert,
				highAlertNotes,
				isRestricted,
				restrictionNotes,
			]
		)
	} else {
		await client.query(
			`update formulary_items
			 set dose_form = $2,
			     strength = $3,
			     route = $4,
			     is_active = true,
			     is_high_alert = $5,
			     high_alert_notes = $6,
			     is_restricted = $7,
			     restriction_notes = $8,
			     updated_at = now()
			 where id = $1`,
			[
				item.rows[0].id,
				doseForm,
				strength,
				route,
				isHighAlert,
				highAlertNotes,
				isRestricted,
				restrictionNotes,
			]
		)
	}

	return item.rows[0].id as string
}

async function upsertVerifiedAllergy(
	client: typeof Client.prototype,
	fixture: SafetyFixture,
	allergenName: string,
	severity: "moderate" | "severe",
	reactionType: string
) {
	const existing = await client.query(
		`select id from allergies
		 where patient_id = $1 and lower(allergen_name) = lower($2) and allergen_type = 'medication'
		 limit 1`,
		[fixture.patientId, allergenName]
	)

	if (existing.rowCount === 0) {
		await client.query(
			`insert into allergies
				(facility_id, patient_id, allergen_name, allergen_type, reaction_type, severity,
				 is_active, is_verified, verified_at, verified_by_staff_id, documenting_staff_id)
			 values ($1, $2, $3, 'medication', $4, $5, true, true, now(), $6, $6)`,
			[
				fixture.facilityId,
				fixture.patientId,
				allergenName,
				reactionType,
				severity,
				fixture.doctorStaffId,
			]
		)
		return
	}

	await client.query(
		`update allergies
		 set reaction_type = $2,
		     severity = $3,
		     is_active = true,
		     is_verified = true,
		     verified_at = now(),
		     verified_by_staff_id = $4,
		     documenting_staff_id = $4,
		     updated_at = now()
		 where id = $1`,
		[existing.rows[0].id, reactionType, severity, fixture.doctorStaffId]
	)
}

async function seedSafetyFixture(): Promise<SafetyFixture> {
	return withDb(async client => {
		const context = await client.query(
			`select p.id as patient_id,
			        e.id as encounter_id,
			        sp.id as doctor_staff_id,
			        sp.facility_id,
			        (
			          select sp2.id
			          from staff_profiles sp2
			          join users u2 on u2.id = sp2.user_id
			          where u2.email = 'pharmacist@qhealth.local'
			          limit 1
			        ) as pharmacist_staff_id
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

		const fixture: SafetyFixture = {
			patientId: context.rows[0].patient_id,
			encounterId: context.rows[0].encounter_id,
			facilityId: context.rows[0].facility_id,
			doctorStaffId: context.rows[0].doctor_staff_id,
			pharmacistStaffId: context.rows[0].pharmacist_staff_id,
		}

		await ensureFormularyItem(client, fixture.facilityId, "Amoxicillin", {
			doseForm: "capsule",
			strength: "500 mg",
			route: "oral",
		})
		await ensureFormularyItem(client, fixture.facilityId, "Ibuprofen", {
			doseForm: "tablet",
			strength: "200 mg",
			route: "oral",
		})
		await ensureFormularyItem(client, fixture.facilityId, "Paracetamol", {
			doseForm: "tablet",
			strength: "500 mg",
			route: "oral",
			isRestricted: true,
			restrictionNotes: "E2E 5.4 restricted medication requires justification.",
		})
		await ensureFormularyItem(client, fixture.facilityId, "Insulin Glargine", {
			doseForm: "solution",
			strength: "100 units/mL",
			route: "subcutaneous",
			isHighAlert: true,
			highAlertNotes: "E2E 5.4 DOH high-alert insulin requires dual verification.",
		})
		const insulinLisproItemId = await ensureFormularyItem(client, fixture.facilityId, "Insulin Lispro", {
			doseForm: "solution",
			strength: "100 units/mL",
			route: "subcutaneous",
			isHighAlert: true,
			highAlertNotes: "E2E 5.4 high-alert blocker order without co-signature.",
		})

		await upsertVerifiedAllergy(
			client,
			fixture,
			"Penicillin",
			"severe",
			"Anaphylaxis"
		)
		await upsertVerifiedAllergy(client, fixture, "Ibuprofen", "moderate", "Rash")

		await client.query(
			`with e2e_orders as (
				select id
				from medication_orders
				where encounter_id = $1
				  and special_instructions in (
				  	'E2E 5.4 severe allergy scenario',
				  	'E2E 5.4 moderate allergy override',
				  	'E2E 5.4 restricted formulary override',
				  	'E2E 5.4 high-alert dual verification',
				  	'E2E 5.4 high-alert blocker without co-signature'
				  )
			 )
			 delete from mar_entries
			 where medication_order_id in (select id from e2e_orders)`,
			[fixture.encounterId]
		)
		await client.query(
			`delete from medication_orders
			 where encounter_id = $1
			   and special_instructions in (
			   	'E2E 5.4 severe allergy scenario',
			   	'E2E 5.4 moderate allergy override',
			   	'E2E 5.4 restricted formulary override',
			   	'E2E 5.4 high-alert dual verification',
			   	'E2E 5.4 high-alert blocker without co-signature'
			   )`,
			[fixture.encounterId]
		)

		const blocker = await client.query(
			`insert into medication_orders
				(facility_id, encounter_id, formulary_item_id, generic_name, dose, dose_unit,
				 dose_form, route, frequency, first_dose_at, duration_days, special_instructions,
				 status, ordering_staff_id, cds_alerts)
			 values ($1, $2, $3, 'Insulin Lispro', '4', 'units', 'solution', 'subcutaneous',
			         'daily', now() + interval '1 hour', 1, 'E2E 5.4 high-alert blocker without co-signature',
			         'pending_verification', $4,
			         $5::jsonb)
			 returning id`,
			[
				fixture.facilityId,
				fixture.encounterId,
				insulinLisproItemId,
				fixture.doctorStaffId,
				JSON.stringify([
					{
						type: "high_alert",
						severity: "warning",
						message:
							"This is a HIGH-ALERT medication. Double verification by a pharmacist is required.",
					},
				]),
			]
		)
		fixture.highAlertOrderId = blocker.rows[0].id

		return fixture
	})
}

async function openMariaProblemsAndAllergies(page: Page) {
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
	await page.getByRole("link", { name: /problems & allergies/i }).click()
	await expect(page.getByText(/2 Allergies/i)).toBeVisible()
	await expect(page.getByText(/Severe allergy documented/i)).toBeVisible()
}

async function openMariaOrders(page: Page) {
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
	await page.getByRole("link", { name: /^orders$/i }).click()
	const medicationsTab = page.getByRole("tab", { name: /^medications$/i })
	for (let attempt = 0; attempt < 5; attempt++) {
		await medicationsTab.click({ force: true })
		try {
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
}

async function switchToMedicationsTab(page: Page) {
	const medicationsTab = page.getByRole("tab", { name: "Medications", exact: true })
	for (let attempt = 0; attempt < 5; attempt++) {
		await medicationsTab.click({ force: true })
		await page.evaluate(() => {
			const tab = [...document.querySelectorAll<HTMLElement>("[role='tab'],button")].find(
				element => element.textContent?.trim() === "Medications"
			)
			tab?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))
			tab?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }))
			tab?.click()
		})
		try {
			await expect(page.getByRole("button", { name: /new medication order/i }).first()).toBeVisible({
				timeout: 1_500,
			})
			return
		} catch {
			await page.waitForTimeout(300)
		}
	}

	await expect(page.getByRole("button", { name: /new medication order/i }).first()).toBeVisible()
}

async function openNewMedicationOrderDialog(page: Page) {
	const dialog = page.getByRole("dialog", { name: /new medication order/i })
	for (let attempt = 0; attempt < 5; attempt++) {
		let button = page.getByRole("button", { name: /new medication order/i }).first()
		if (!(await button.isVisible())) {
			await switchToMedicationsTab(page)
			button = page.getByRole("button", { name: /new medication order/i }).first()
		}
		await expect(button).toBeVisible({ timeout: 5_000 })
		await page.evaluate(() => {
			const buttons = [...document.querySelectorAll("button")]
			const target = buttons.find(button => /new medication order/i.test(button.textContent ?? ""))
			target?.click()
		})

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

async function selectDrug(page: Page, dialog: ReturnType<Page["getByRole"]>, genericName: string) {
	await dialog.getByPlaceholder(/amoxicillin/i).fill(genericName)
	const option = page.getByRole("option").filter({ hasText: genericName }).first()
	await expect(option).toBeVisible()
	await option.click()
}

async function fillDoseFields(
	page: Page,
	dialog: ReturnType<Page["getByRole"]>,
	{
		dose = "1",
		doseUnit = "tab",
		doseForm,
		route,
		durationDays = "1",
		specialInstructions,
	}: {
		dose?: string
		doseUnit?: string
		doseForm?: string
		route?: string
		durationDays?: string
		specialInstructions: string
	}
) {
	await dialog.locator("#dose").fill(dose)
	await dialog.locator("#doseUnit").fill(doseUnit)
	if (doseForm) await dialog.locator("#doseForm").fill(doseForm)
	if (route) await dialog.locator("#route").fill(route)
	await dialog.getByLabel(/frequency/i).click()
	await page.getByRole("option", { name: "Daily", exact: true }).click()
	await dialog.locator("#durationDays").fill(durationDays)
	await dialog.locator("#specialInstructions").fill(specialInstructions)
}

async function runSafetyCheck(dialog: ReturnType<Page["getByRole"]>) {
	await dialog.getByRole("button", { name: /run drug safety check/i }).click()
	await expect(dialog.getByText(/alert[s]? found|safety check complete/i)).toBeVisible()
}

async function overrideFirstSoftBlock(
	dialog: ReturnType<Page["getByRole"]>,
	reason: string
) {
	await dialog.getByRole("button", { name: /override (allergy|cds)-/i }).first().click()
	await dialog.getByPlaceholder(/document the clinical justification/i).fill(reason)
	await dialog.getByRole("button", { name: /confirm override/i }).click()
	await expect(dialog.getByText("Overridden").first()).toBeVisible()
}

async function latestOrderWithInstruction(specialInstructions: string) {
	return withDb(async client => {
		const result = await client.query(
			`select id, cds_overrides
			 from medication_orders
			 where special_instructions = $1
			 order by created_at desc
			 limit 1`,
			[specialInstructions]
		)
		return result.rows[0] as { id: string; cds_overrides: { overrides?: unknown[] } } | undefined
	})
}

async function waitForLatestOrderWithInstruction(specialInstructions: string) {
	for (let attempt = 0; attempt < 20; attempt++) {
		const order = await latestOrderWithInstruction(specialInstructions)
		if (order) return order
		await new Promise(resolve => setTimeout(resolve, 500))
	}

	return latestOrderWithInstruction(specialInstructions)
}

test.describe.serial("Allergy and high-alert decision support", () => {
	test.skip(!HAS_BACKEND, "Requires backend auth API and seeded clinical data")
	test.setTimeout(180_000)

	let fixture: SafetyFixture

	test.beforeAll(async () => {
		fixture = await seedSafetyFixture()
		authCookiesByEmail.set("doctor@qhealth.local", await signInForCookies("doctor@qhealth.local"))
		authCookiesByEmail.set(
			"pharmacist@qhealth.local",
			await signInForCookies("pharmacist@qhealth.local")
		)
	})

	test("A. severe verified allergy hard-blocks CPOE without override", async ({ page }) => {
		await signInAs(page, "doctor@qhealth.local")
		await openMariaProblemsAndAllergies(page)
		await openMariaOrders(page)

		const dialog = await openNewMedicationOrderDialog(page)
		await selectDrug(page, dialog, "Amoxicillin")
		await fillDoseFields(page, dialog, {
			dose: "500",
			doseUnit: "mg",
			doseForm: "capsule",
			route: "oral",
			specialInstructions: "E2E 5.4 severe allergy scenario",
		})
		await runSafetyCheck(dialog)

		const allergyAlert = dialog.getByTestId(/allergy-alert-/)
		await expect(allergyAlert.getByText("Allergy hard block")).toBeVisible()
		await expect(allergyAlert.getByText(/Penicillin/i)).toBeVisible()
		await expect(allergyAlert.getByText(/severe/i)).toBeVisible()
		await expect(dialog.getByText(/Cannot proceed/i)).toBeVisible()
		await expect(dialog.getByRole("button", { name: /override allergy/i })).toHaveCount(0)
		await expect(dialog.getByRole("button", { name: /^create order$/i })).toBeDisabled()
		await dialog.getByRole("button", { name: /^cancel$/i }).click()
	})

	test("B. non-severe verified allergy requires override justification", async ({ page }) => {
		const instruction = "E2E 5.4 moderate allergy override"
		await signInAs(page, "doctor@qhealth.local")
		await openMariaOrders(page)

		const dialog = await openNewMedicationOrderDialog(page)
		await selectDrug(page, dialog, "Ibuprofen")
		await fillDoseFields(page, dialog, {
			dose: "200",
			doseUnit: "mg",
			doseForm: "tablet",
			route: "oral",
			specialInstructions: instruction,
		})
		await runSafetyCheck(dialog)

		await expect(dialog.getByText("Allergy override required")).toBeVisible()
		await expect(dialog.getByText(/Ibuprofen/i)).toBeVisible()
		await expect(dialog.getByRole("button", { name: /^create order$/i })).toBeDisabled()
		await overrideFirstSoftBlock(dialog, "Patient previously tolerated ibuprofen with monitoring.")
		await expect(dialog.getByRole("button", { name: /^create order$/i })).toBeEnabled()
		await dialog.getByRole("button", { name: /^create order$/i }).click()
		await expect(dialog).not.toBeVisible()

		const order = await latestOrderWithInstruction(instruction)
		expect(order?.cds_overrides?.overrides?.length).toBeGreaterThan(0)
	})

	test("C. restricted formulary item requires override justification", async ({ page }) => {
		const instruction = "E2E 5.4 restricted formulary override"
		await signInAs(page, "doctor@qhealth.local")
		await openMariaOrders(page)

		const dialog = await openNewMedicationOrderDialog(page)
		await selectDrug(page, dialog, "Paracetamol")
		await fillDoseFields(page, dialog, {
			dose: "500",
			doseUnit: "mg",
			doseForm: "tablet",
			route: "oral",
			specialInstructions: instruction,
		})
		await runSafetyCheck(dialog)

		await expect(dialog.getByText("Override required")).toBeVisible()
		await expect(dialog.getByText(/RESTRICTED at this facility/i)).toBeVisible()
		await expect(dialog.getByRole("button", { name: /^create order$/i })).toBeDisabled()
		await overrideFirstSoftBlock(dialog, "Restricted medication approved for this encounter.")
		await dialog.getByRole("button", { name: /^create order$/i }).click()
		await expect(dialog).not.toBeVisible()

		const order = await latestOrderWithInstruction(instruction)
		expect(order?.cds_overrides?.overrides?.length).toBeGreaterThan(0)
	})

	test("D. high-alert drug requires second clinician credentials and rejects wrong password", async ({
		page,
	}) => {
		const instruction = "E2E 5.4 high-alert dual verification"
		await signInAs(page, "doctor@qhealth.local")
		await openMariaOrders(page)

		const dialog = await openNewMedicationOrderDialog(page)
		await selectDrug(page, dialog, "Insulin Glargine")
		await fillDoseFields(page, dialog, {
			dose: "10",
			doseUnit: "units",
			doseForm: "solution",
			route: "subcutaneous",
			specialInstructions: instruction,
		})
		await runSafetyCheck(dialog)

		await expect(dialog.getByText("High-alert medication", { exact: true })).toBeVisible()
		await expect(dialog.getByText(/Dual clinician verification required/i)).toBeVisible()
		await dialog.getByRole("button", { name: /^create order$/i }).click()

		const cosignDialog = page.getByRole("dialog", {
			name: /high-alert medication.*dual verification/i,
		})
		await expect(cosignDialog).toBeVisible()
		await cosignDialog.getByPlaceholder(/search by clinician name/i).fill("Miguel")
		await expect(page.getByRole("option", { name: /Miguel Santos/i })).toHaveCount(0)

		await cosignDialog.getByPlaceholder(/search by clinician name/i).fill("Carlo")
		await page.getByRole("option", { name: /Carlo Dizon/i }).click()
		await cosignDialog.getByRole("button", { name: /^continue$/i }).click()

		await cosignDialog.locator("#cosignPassword").fill("WrongPassword123")
		await cosignDialog.getByRole("button", { name: /co-sign & verify/i }).click()
		await expect(cosignDialog.getByText(/incorrect password/i)).toBeVisible()

		await cosignDialog.locator("#cosignPassword").fill(DEFAULT_PASSWORD)
		await cosignDialog.locator("#highAlertNotes").fill("Independent high-alert co-sign completed.")
		await cosignDialog.getByRole("button", { name: /co-sign & verify/i }).click()
		await expect(dialog).not.toBeVisible({ timeout: 15_000 })

		const order = await waitForLatestOrderWithInstruction(instruction)
		expect(order?.id).toBeTruthy()
		const verification = await withDb(async client =>
			client.query(
				`select hav.id, al.id as audit_id
				 from high_alert_verifications hav
				 left join audit_logs al
				   on al.entity_type = 'high_alert_verification'
				  and al.entity_id = hav.id
				  and al.action = 'verify'
				 where hav.medication_order_id = $1
				 limit 1`,
				[order!.id]
			)
		)
		expect(verification.rowCount).toBe(1)
		expect(verification.rows[0].audit_id).toBeTruthy()
	})

	test("E. pharmacy approval blocks unsigned high-alert orders and approves signed ones", async ({
		page,
	}) => {
		await signInAs(page, "pharmacist@qhealth.local")
		await page.goto("/pharmacy")
		await expect(page.getByText("Verification Queue")).toBeVisible()

		await page.getByLabel(/search patient or drug/i).fill("Insulin Lispro")
		await expect(page.getByText("Insulin Lispro").first()).toBeVisible()
		await page.getByRole("button", { name: /review/i }).first().click()
		await expect(page.getByText("Clinical Safety Checks")).toBeVisible()
		await expect(page.getByText("High-alert medication", { exact: true })).toBeVisible()
		await page.getByRole("button", { name: /verify only/i }).click()
		await expect(
			page.getByText(/requires dual verification by a second clinician/i)
		).toBeVisible()

		await page.getByRole("button", { name: /back to queue/i }).click()
		await page.getByLabel(/search patient or drug/i).fill("Insulin Glargine")
		await expect(page.getByText("Insulin Glargine").first()).toBeVisible()
		await page.getByRole("button", { name: /review/i }).first().click()
		await expect(page.getByText("Clinical Safety Checks")).toBeVisible()
		await expect(page.getByText("High-alert medication", { exact: true })).toBeVisible()
		await page.getByRole("button", { name: /verify only/i }).click()
		await expect(page.getByText(/Verification Queue/i)).toBeVisible({ timeout: 15_000 })
	})
})
