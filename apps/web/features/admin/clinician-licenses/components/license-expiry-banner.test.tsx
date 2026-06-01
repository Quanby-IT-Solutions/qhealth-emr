import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LicenseExpiryBanner } from "./license-expiry-banner"

const mockUseListCliniciansQuery = vi.fn()

vi.mock("../api/licenses.hooks", () => ({
	useListCliniciansQuery: (...args: unknown[]) => mockUseListCliniciansQuery(...args),
}))

function clinician(daysUntilNextExpiry: number | null) {
	return {
		staffProfileId: crypto.randomUUID(),
		staffName: "Dr. Test",
		facilityId: crypto.randomUUID(),
		licenses: [],
		daysUntilNextExpiry,
	}
}

describe("LicenseExpiryBanner", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		sessionStorage.clear()
	})

	it("shows separate expired and expiring counts", async () => {
		mockUseListCliniciansQuery.mockReturnValue({
			data: {
				data: [clinician(-2), clinician(0), clinician(30), clinician(31), clinician(null)],
			},
		})

		render(<LicenseExpiryBanner />)

		expect(await screen.findByText(/1 clinician license expired/i)).toBeInTheDocument()
		expect(screen.getByText(/2 clinician licenses expiring within 30 days/i)).toBeInTheDocument()
		expect(screen.getByRole("link", { name: /review now/i })).toHaveAttribute(
			"href",
			"/admin/clinician-licenses"
		)
	})

	it("does not label expired licenses as expiring soon", async () => {
		mockUseListCliniciansQuery.mockReturnValue({
			data: {
				data: [clinician(-1)],
			},
		})

		render(<LicenseExpiryBanner />)

		expect(await screen.findByText(/1 clinician license expired/i)).toBeInTheDocument()
		expect(screen.queryByText(/expiring within 30 days/i)).toBeNull()
	})

	it("dismisses for the current browser session", async () => {
		const user = userEvent.setup()
		mockUseListCliniciansQuery.mockReturnValue({
			data: {
				data: [clinician(10)],
			},
		})

		render(<LicenseExpiryBanner />)

		await user.click(await screen.findByRole("button", { name: /dismiss/i }))

		expect(screen.queryByText(/expiring within 30 days/i)).toBeNull()
		expect(sessionStorage.getItem("license_expiry_banner_dismissed")).toBe("1")
	})
})
