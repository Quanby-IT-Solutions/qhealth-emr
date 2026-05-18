import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { DrugSearchCombobox } from "./drug-search-combobox"

const mockUseFormularyItemsQuery = vi.fn()

vi.mock("@/features/formulary/api/formulary.hooks", () => ({
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

describe("DrugSearchCombobox", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		globalThis.ResizeObserver = class ResizeObserver {
			observe() {}
			unobserve() {}
			disconnect() {}
		}
		mockUseFormularyItemsQuery.mockImplementation((params: { search?: string }) => ({
			data: params.search ? { data: [paracetamolFormularyItem] } : { data: [] },
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
				genericName: "Paracetamol",
				brandName: "Biogesic",
			})
		)
	})
})
