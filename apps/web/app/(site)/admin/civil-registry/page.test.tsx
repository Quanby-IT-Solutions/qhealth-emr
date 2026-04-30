import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import AdminCivilRegistryPage from "./page"

vi.mock("@/features/app-shell/api/rbac.hooks", () => ({
	useMyProfile: vi.fn(),
}))

vi.mock("@/features/admin/components/civil-registry-panel", () => ({
	CivilRegistryPanel: () => <div data-testid="civil-registry-panel" />,
}))

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

function mockProfile(permissions: { module: string; action: string }[]) {
	vi.mocked(useMyProfile).mockReturnValue({
		data: { activeRole: { permissions } },
	} as ReturnType<typeof useMyProfile>)
}

describe("AdminCivilRegistryPage – permission gates (ADMIN-002)", () => {
	it("denies access when civil_registry:view is absent", () => {
		mockProfile([{ module: "admin", action: "view" }])
		render(<AdminCivilRegistryPage />)
		expect(screen.getByText(/you do not have permission to access civil registry/i)).toBeInTheDocument()
		expect(screen.queryByTestId("civil-registry-panel")).toBeNull()
	})

	it("renders panel when civil_registry:view is present", () => {
		mockProfile([{ module: "civil_registry", action: "view" }])
		render(<AdminCivilRegistryPage />)
		expect(screen.getByTestId("civil-registry-panel")).toBeInTheDocument()
	})

	it("renders panel when civil_registry:view is present alongside other permissions", () => {
		mockProfile([
			{ module: "admin", action: "view" },
			{ module: "civil_registry", action: "view" },
		])
		render(<AdminCivilRegistryPage />)
		expect(screen.getByTestId("civil-registry-panel")).toBeInTheDocument()
	})

	it("denies access when profile has no permissions at all", () => {
		mockProfile([])
		render(<AdminCivilRegistryPage />)
		expect(screen.getByText(/you do not have permission to access civil registry/i)).toBeInTheDocument()
	})
})
