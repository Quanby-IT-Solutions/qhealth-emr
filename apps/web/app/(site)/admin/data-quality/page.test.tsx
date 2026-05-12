import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import AdminDataQualityPage from "./page"

vi.mock("@/features/app-shell/api/rbac.hooks", () => ({
	useMyProfile: vi.fn(),
}))

vi.mock("@/features/admin/components/data-quality-panel", () => ({
	DataQualityPanel: () => <div data-testid="data-quality-panel" />,
}))

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

function mockProfile(permissions: { module: string; action: string }[]) {
	vi.mocked(useMyProfile).mockReturnValue({
		data: { activeRole: { permissions } },
	} as ReturnType<typeof useMyProfile>)
}

describe("AdminDataQualityPage – permission gates (ADMIN-002)", () => {
	it("denies access when medical_records:view is absent", () => {
		mockProfile([{ module: "admin", action: "view" }])
		render(<AdminDataQualityPage />)
		expect(screen.getByText(/you do not have permission to access data quality/i)).toBeInTheDocument()
		expect(screen.queryByTestId("data-quality-panel")).toBeNull()
	})

	it("denies access when profile has no permissions at all", () => {
		mockProfile([])
		render(<AdminDataQualityPage />)
		expect(screen.getByText(/you do not have permission to access data quality/i)).toBeInTheDocument()
		expect(screen.queryByTestId("data-quality-panel")).toBeNull()
	})

	it("renders panel when medical_records:view is present", () => {
		mockProfile([{ module: "medical_records", action: "view" }])
		render(<AdminDataQualityPage />)
		expect(screen.getByTestId("data-quality-panel")).toBeInTheDocument()
	})

	it("renders panel when medical_records:view is present alongside admin:view", () => {
		mockProfile([
			{ module: "admin", action: "view" },
			{ module: "medical_records", action: "view" },
		])
		render(<AdminDataQualityPage />)
		expect(screen.getByTestId("data-quality-panel")).toBeInTheDocument()
	})
})
