import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

import AdminMedicationCompliancePage from "./page"

vi.mock("@/features/app-shell/api/rbac.hooks", () => ({
	useMyProfile: vi.fn(),
}))

vi.mock("@/features/admin/components/medication-compliance-panel", () => ({
	MedicationCompliancePanel: () => <div data-testid="medication-compliance-panel" />,
}))

function mockProfile(permissions: { module: string; action: string }[]) {
	vi.mocked(useMyProfile).mockReturnValue({
		data: { activeRole: { permissions } },
	} as ReturnType<typeof useMyProfile>)
}

describe("AdminMedicationCompliancePage – permission gates (ADMIN-003)", () => {
	it("denies access when formulary:clinical_policy is absent", () => {
		mockProfile([{ module: "admin", action: "view" }])
		render(<AdminMedicationCompliancePage />)
		expect(
			screen.getByText(/you do not have permission to access medication compliance/i)
		).toBeInTheDocument()
		expect(screen.queryByTestId("medication-compliance-panel")).toBeNull()
	})

	it("denies access when only formulary:view is present (not clinical_policy)", () => {
		mockProfile([{ module: "formulary", action: "view" }])
		render(<AdminMedicationCompliancePage />)
		expect(
			screen.getByText(/you do not have permission to access medication compliance/i)
		).toBeInTheDocument()
		expect(screen.queryByTestId("medication-compliance-panel")).toBeNull()
	})

	it("denies access when profile has no permissions at all", () => {
		mockProfile([])
		render(<AdminMedicationCompliancePage />)
		expect(
			screen.getByText(/you do not have permission to access medication compliance/i)
		).toBeInTheDocument()
		expect(screen.queryByTestId("medication-compliance-panel")).toBeNull()
	})

	it("renders panel when formulary:clinical_policy is present", () => {
		mockProfile([{ module: "formulary", action: "clinical_policy" }])
		render(<AdminMedicationCompliancePage />)
		expect(screen.getByTestId("medication-compliance-panel")).toBeInTheDocument()
	})

	it("renders panel when formulary:clinical_policy is present alongside other permissions", () => {
		mockProfile([
			{ module: "admin", action: "view" },
			{ module: "formulary", action: "clinical_policy" },
		])
		render(<AdminMedicationCompliancePage />)
		expect(screen.getByTestId("medication-compliance-panel")).toBeInTheDocument()
	})
})
