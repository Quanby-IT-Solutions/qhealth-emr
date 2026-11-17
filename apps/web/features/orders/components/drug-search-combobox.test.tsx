import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { DrugSearchCombobox } from "./drug-search-combobox"

const mockUseFormularyItemsQuery = vi.fn()
const mockUseDrugGenericsQuery = vi.fn()

vi.mock("@/features/formulary/api/formulary.hooks", () => ({
	useDrugGenericsQuery: (...args: unknown[]) => mockUseDrugGenericsQuery(...args),
	useFormularyItemsQuery: (...args: unknown[]) => mockUseFormularyItemsQuery(...args),
}))

const paracetamolFormularyItem = {
	id: "formulary-1",
	facilityId: "facility-1",
	drugGenericId: "generic-1",
	drugBrandId: "brand-1",
	genericName: "Paracetamol",
	brandName: "Biogesic",
	doseForm: "tablet",
	strength: "500 mg",
	route: "oral",
	isActive: true,
	isHighAlert: false,
	highAlertNotes: null,
	isRestricted: false,
	restrictionNotes: null,
	formularyNotes: null,
	createdAt: new Date("2026-01-01T00:00:00.000Z"),
	updatedAt: new Date("2026-01-01T00:00:00.000Z"),
}

const amoxicillinGeneric = {
	id: "generic-2",
	genericName: "Amoxicillin",
	rxnormCode: "723",
	atcCode: "J01CA04",
	isActive: true,
	createdAt: new Date("2026-01-01T00:00:00.000Z"),
}

describe("DrugSearchCombobox", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		globalThis.ResizeObserver = class ResizeObserver {
			observe() {}
			unobserve() {}
			disconnect() {}
		}
		window.HTMLElement.prototype.scrollIntoView = vi.fn()
		mockUseFormularyItemsQuery.mockImplementation((params: { search?: string }) => ({
			data: params.search ? { data: [paracetamolFormularyItem] } : { data: [] },
			isLoading: false,
		}))
		mockUseDrugGenericsQuery.mockImplementation((params: { search?: string }) => ({
			data: params.search ? { data: [] } : { data: [] },
			isLoading: false,
		}))
	})

	it("shows brand-backed matches while keeping the selected value generic-first", async () => {
		const user = userEvent.setup()
		const onSelect = vi.fn()
		const onRawInput = vi.fn()

		render(
			<DrugSearchCombobox
				id="genericName"
				facilityId="facility-1"
				value=""
				onSelect={onSelect}
				onRawInput={onRawInput}
				placeholder="Search generic"
			/>
		)

		const input = screen.getByPlaceholderText("Search generic")

		await user.type(input, "Bio")
		expect(await screen.findByText("Biogesic")).toBeInTheDocument()

		expect(input).toHaveFocus()
		await user.type(input, "gesic")
		expect(input).toHaveValue("Biogesic")

		await user.click(screen.getByText("Paracetamol"))

		expect(onSelect).toHaveBeenLastCalledWith(
			expect.objectContaining({
				id: "formulary-1",
				formularyItemId: "formulary-1",
				genericName: "Paracetamol",
				brandName: "Biogesic",
				isFormulary: true,
			})
		)
	})

	it("shows active generic matches that are not on the facility formulary", async () => {
		const user = userEvent.setup()
		const onSelect = vi.fn()
		const onRawInput = vi.fn()

		mockUseFormularyItemsQuery.mockReturnValue({
			data: { data: [] },
			isLoading: false,
		})
		mockUseDrugGenericsQuery.mockReturnValue({
			data: { data: [amoxicillinGeneric] },
			isLoading: false,
		})

		render(
			<DrugSearchCombobox
				id="genericName"
				facilityId="facility-1"
				value=""
				onSelect={onSelect}
				onRawInput={onRawInput}
				placeholder="Search generic"
			/>
		)

		await user.type(screen.getByPlaceholderText("Search generic"), "Amox")

		expect(await screen.findByText("Amoxicillin")).toBeInTheDocument()
		expect(screen.getByText("Non-formulary at this facility")).toBeInTheDocument()

		await user.click(screen.getByText("Amoxicillin"))

		expect(onSelect).toHaveBeenLastCalledWith(
			expect.objectContaining({
				id: "generic-2",
				drugGenericId: "generic-2",
				genericName: "Amoxicillin",
				isFormulary: false,
			})
		)
	})

	it("deduplicates non-formulary generic matches by normalized generic name", async () => {
		const user = userEvent.setup()

		mockUseFormularyItemsQuery.mockReturnValue({
			data: { data: [] },
			isLoading: false,
		})
		mockUseDrugGenericsQuery.mockReturnValue({
			data: {
				data: [
					amoxicillinGeneric,
					{ ...amoxicillinGeneric, id: "generic-duplicate", genericName: " amoxicillin " },
				],
			},
			isLoading: false,
		})

		render(
			<DrugSearchCombobox
				id="genericName"
				facilityId="facility-1"
				value=""
				onSelect={vi.fn()}
				onRawInput={vi.fn()}
				placeholder="Search generic"
			/>
		)

		await user.type(screen.getByPlaceholderText("Search generic"), "Amox")

		expect(await screen.findByText("Amoxicillin")).toBeInTheDocument()
		expect(screen.getAllByText(/non-formulary at this facility/i)).toHaveLength(1)
	})

	it("deduplicates repeated formulary rows while preserving brandless variants", async () => {
		const user = userEvent.setup()

		mockUseFormularyItemsQuery.mockReturnValue({
			data: {
				data: [
					paracetamolFormularyItem,
					{ ...paracetamolFormularyItem, id: "formulary-duplicate" },
					{
						...paracetamolFormularyItem,
						id: "formulary-brandless",
						drugBrandId: null,
						brandName: null,
					},
				],
			},
			isLoading: false,
		})
		mockUseDrugGenericsQuery.mockReturnValue({
			data: { data: [] },
			isLoading: false,
		})

		render(
			<DrugSearchCombobox
				id="genericName"
				facilityId="facility-1"
				value=""
				onSelect={vi.fn()}
				onRawInput={vi.fn()}
				placeholder="Search generic"
			/>
		)

		await user.type(screen.getByPlaceholderText("Search generic"), "Para")

		expect(await screen.findAllByText("Paracetamol")).toHaveLength(2)
		expect(screen.getAllByText("tablet / 500 mg / oral")).toHaveLength(2)
		expect(screen.getByText("Biogesic")).toBeInTheDocument()
	})

	it("ranks exact generic matches before combination and substring matches", async () => {
		const user = userEvent.setup()

		mockUseFormularyItemsQuery.mockReturnValue({
			data: { data: [] },
			isLoading: false,
		})
		mockUseDrugGenericsQuery.mockReturnValue({
			data: {
				data: [
					{
						id: "generic-combo-1",
						genericName: "amoxicillin / omeprazole / rifabutin",
						rxnormCode: null,
						atcCode: null,
						isActive: true,
						createdAt: new Date("2026-01-01T00:00:00.000Z"),
					},
					{
						id: "generic-substring-1",
						genericName: "esomeprazole",
						rxnormCode: null,
						atcCode: null,
						isActive: true,
						createdAt: new Date("2026-01-01T00:00:00.000Z"),
					},
					{
						id: "generic-exact",
						genericName: "Omeprazole",
						rxnormCode: "7646",
						atcCode: null,
						isActive: true,
						createdAt: new Date("2026-01-01T00:00:00.000Z"),
					},
					{
						id: "generic-prefix",
						genericName: "omeprazole magnesium",
						rxnormCode: null,
						atcCode: null,
						isActive: true,
						createdAt: new Date("2026-01-01T00:00:00.000Z"),
					},
					{
						id: "generic-combo-2",
						genericName: "aspirin / omeprazole",
						rxnormCode: null,
						atcCode: null,
						isActive: true,
						createdAt: new Date("2026-01-01T00:00:00.000Z"),
					},
				],
			},
			isLoading: false,
		})

		render(
			<DrugSearchCombobox
				id="genericName"
				facilityId="facility-1"
				value=""
				onSelect={vi.fn()}
				onRawInput={vi.fn()}
				placeholder="Search generic"
			/>
		)

		await user.type(screen.getByPlaceholderText("Search generic"), "omeprazole")

		const options = await screen.findAllByRole("option")
		const optionText = options.map(option => option.textContent ?? "")

		expect(optionText[0]).toContain("Omeprazole")
		expect(optionText[1]).toContain("omeprazole magnesium")
		expect(optionText[2]).toContain("amoxicillin / omeprazole / rifabutin")
		expect(optionText[3]).toContain("aspirin / omeprazole")
		expect(optionText[4]).toContain("esomeprazole")
	})

	it("shows that unmatched typed generic text can still be used", async () => {
		const user = userEvent.setup()

		mockUseFormularyItemsQuery.mockReturnValue({
			data: { data: [] },
			isLoading: false,
		})
		mockUseDrugGenericsQuery.mockReturnValue({
			data: { data: [] },
			isLoading: false,
		})

		render(
			<DrugSearchCombobox
				id="genericName"
				facilityId="facility-1"
				value=""
				onSelect={vi.fn()}
				onRawInput={vi.fn()}
				placeholder="Search generic"
			/>
		)

		await user.type(screen.getByPlaceholderText("Search generic"), "Custom Herbal Capsule")

		expect(await screen.findByText("No catalog match found.")).toBeInTheDocument()
		expect(
			screen.getByText(/continue with the typed generic name as custom text/i)
		).toBeInTheDocument()
	})

	it("opens active drug options on focus before typing", async () => {
		const user = userEvent.setup()
		const onSelect = vi.fn()
		const onRawInput = vi.fn()

		mockUseFormularyItemsQuery.mockReturnValue({
			data: { data: [paracetamolFormularyItem] },
			isLoading: false,
		})
		mockUseDrugGenericsQuery.mockReturnValue({
			data: { data: [] },
			isLoading: false,
		})

		render(
			<DrugSearchCombobox
				id="genericName"
				facilityId="facility-1"
				value=""
				onSelect={onSelect}
				onRawInput={onRawInput}
				placeholder="Search generic"
			/>
		)

		await user.click(screen.getByPlaceholderText("Search generic"))

		expect(await screen.findByText("Paracetamol")).toBeInTheDocument()
		expect(screen.getByText("Biogesic")).toBeInTheDocument()
	})
})
