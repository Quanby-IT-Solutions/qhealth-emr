import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

import AdminExportCompliancePage from "./page"

vi.mock("@/features/app-shell/api/rbac.hooks", () => ({
	useMyProfile: vi.fn(),
}))

vi.mock("@/features/admin/components/export-compliance-panel", () => ({
	ExportCompliancePanel: () => <div data-testid="export-compliance-panel" />,
}))

function mockProfile(permissions: { module: string; action: string }[]) {
	vi.mocked(useMyProfile).mockReturnValue({
		data: { activeRole: { permissions } },
	} as ReturnType<typeof useMyProfile>)
}

describe("AdminExportCompliancePage – permission gates (ADMIN-001)", () => {
	it("denies access when audit:view is absent", () => {
		mockProfile([{ module: "admin", action: "view" }])
		render(<AdminExportCompliancePage />)
		expect(screen.getByText(/requires audit\/privacy officer access/i)).toBeInTheDocument()
		expect(screen.queryByTestId("export-compliance-panel")).toBeNull()
	})

	it("denies access when profile has no permissions at all", () => {
		mockProfile([])
		render(<AdminExportCompliancePage />)
		expect(screen.getByText(/requires audit\/privacy officer access/i)).toBeInTheDocument()
		expect(screen.queryByTestId("export-compliance-panel")).toBeNull()
	})

	it("renders panel when audit:view is present", () => {
		mockProfile([{ module: "audit", action: "view" }])
		render(<AdminExportCompliancePage />)
		expect(screen.getByTestId("export-compliance-panel")).toBeInTheDocument()
	})

	it("renders panel when audit:view is present alongside admin:view", () => {
		mockProfile([
			{ module: "admin", action: "view" },
			{ module: "audit", action: "view" },
		])
		render(<AdminExportCompliancePage />)
		expect(screen.getByTestId("export-compliance-panel")).toBeInTheDocument()
	})
})
