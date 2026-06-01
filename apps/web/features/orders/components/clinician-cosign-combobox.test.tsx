import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ClinicianCoSignCombobox } from "./clinician-cosign-combobox"

const mockUseSearchCliniciansQuery = vi.fn()

vi.mock("@/features/admin/user-management/api/users.hooks", () => ({
	useSearchCliniciansQuery: (...args: unknown[]) => mockUseSearchCliniciansQuery(...args),
}))

describe("ClinicianCoSignCombobox", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		globalThis.ResizeObserver = class ResizeObserver {
			observe() {}
			unobserve() {}
			disconnect() {}
		}
	})

	it("shows available co-signers when focused before typing", async () => {
		const user = userEvent.setup()
		const onChange = vi.fn()

		mockUseSearchCliniciansQuery.mockReturnValue({
			data: [
				{
					staffProfileId: "staff-pharm-1",
					name: "Pharm. Carlo Dizon",
					department: "Pharmacy",
					primaryRole: "Pharmacist",
				},
			],
			isLoading: false,
		})

		render(
			<ClinicianCoSignCombobox
				facilityId="facility-1"
				excludeStaffProfileId="staff-doctor-1"
				value={null}
				onChange={onChange}
			/>
		)

		await user.click(screen.getByPlaceholderText(/search by clinician name/i))

		expect(await screen.findByText("Pharm. Carlo Dizon")).toBeInTheDocument()
		expect(screen.getByText(/pharmacist/i)).toBeInTheDocument()
		expect(mockUseSearchCliniciansQuery).toHaveBeenCalledWith(
			expect.objectContaining({
				facilityId: "facility-1",
				search: "",
				excludeStaffProfileId: "staff-doctor-1",
			})
		)
	})

	it("selects a co-signer from the results", async () => {
		const user = userEvent.setup()
		const onChange = vi.fn()

		mockUseSearchCliniciansQuery.mockReturnValue({
			data: [
				{
					staffProfileId: "staff-pharm-1",
					name: "Pharm. Carlo Dizon",
					department: "Pharmacy",
					primaryRole: "Pharmacist",
				},
			],
			isLoading: false,
		})

		render(
			<ClinicianCoSignCombobox
				facilityId="facility-1"
				excludeStaffProfileId="staff-doctor-1"
				value={null}
				onChange={onChange}
			/>
		)

		await user.click(screen.getByPlaceholderText(/search by clinician name/i))
		await user.click(await screen.findByText("Pharm. Carlo Dizon"))

		expect(onChange).toHaveBeenLastCalledWith({
			staffProfileId: "staff-pharm-1",
			name: "Pharm. Carlo Dizon",
		})
	})
})
