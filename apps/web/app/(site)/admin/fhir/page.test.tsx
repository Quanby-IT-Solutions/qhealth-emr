import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import AdminFhirPage from "./page"

vi.mock("@/features/app-shell/api/rbac.hooks", () => ({
	useMyProfile: vi.fn(),
}))

vi.mock("@/features/fhir/components/fhir-export-dashboard", () => ({
	FhirExportDashboard: ({ canEdit }: { canEdit: boolean }) => (
		<div data-testid="fhir-dashboard" data-can-edit={String(canEdit)} />
	),
}))

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

function mockProfile(permissions: { module: string; action: string }[]) {
	vi.mocked(useMyProfile).mockReturnValue({
		data: { activeRole: { permissions } },
	} as ReturnType<typeof useMyProfile>)
}

describe("AdminFhirPage – permission gates", () => {
	it("denies access when admin:view is absent", () => {
		mockProfile([{ module: "fhir", action: "view" }, { module: "fhir", action: "export" }])
		render(<AdminFhirPage />)
		expect(screen.getByText(/you do not have permission to access this page/i)).toBeInTheDocument()
		expect(screen.queryByTestId("fhir-dashboard")).toBeNull()
	})

	it("denies FHIR access when admin:view present but fhir:view absent", () => {
		mockProfile([{ module: "admin", action: "view" }])
		render(<AdminFhirPage />)
		expect(screen.getByText(/you do not have permission to access fhir export management/i)).toBeInTheDocument()
		expect(screen.queryByTestId("fhir-dashboard")).toBeNull()
	})

	it("renders dashboard with canEdit=false when admin:view + fhir:view but not fhir:export", () => {
		mockProfile([
			{ module: "admin", action: "view" },
			{ module: "fhir", action: "view" },
		])
		render(<AdminFhirPage />)
		const dashboard = screen.getByTestId("fhir-dashboard")
		expect(dashboard).toBeInTheDocument()
		expect(dashboard.dataset.canEdit).toBe("false")
	})

	it("renders dashboard with canEdit=true when admin:view + fhir:view + fhir:export", () => {
		mockProfile([
			{ module: "admin", action: "view" },
			{ module: "fhir", action: "view" },
			{ module: "fhir", action: "export" },
		])
		render(<AdminFhirPage />)
		const dashboard = screen.getByTestId("fhir-dashboard")
		expect(dashboard).toBeInTheDocument()
		expect(dashboard.dataset.canEdit).toBe("true")
	})

	it("renders nothing extra for unrelated permissions alongside admin:view + fhir:view", () => {
		mockProfile([
			{ module: "admin", action: "view" },
			{ module: "fhir", action: "view" },
			{ module: "patients", action: "view" },
		])
		render(<AdminFhirPage />)
		expect(screen.getByTestId("fhir-dashboard")).toBeInTheDocument()
	})
})
