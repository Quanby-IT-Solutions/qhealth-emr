import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LcrTrackingTable } from "./lcr-tracking-table"

const mockUseMyProfile = vi.fn()
const mockUseListBirthRegistrationsQuery = vi.fn()
const mockMarkPaid = vi.fn()
const mockMarkReleased = vi.fn()

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		className,
	}: {
		children: React.ReactNode
		href: string
		className?: string
	}) => (
		<a href={href} className={className}>
			{children}
		</a>
	),
}))

vi.mock("@hugeicons/react", () => ({
	HugeiconsIcon: () => <span aria-hidden="true" />,
}))

vi.mock("@/features/app-shell/api/rbac.hooks", () => ({
	useMyProfile: () => mockUseMyProfile(),
}))

vi.mock("@/features/registrar/civil-registry/api/lcr.hooks", () => ({
	useListBirthRegistrationsQuery: (
		params: { facilityId: string },
		options?: { enabled?: boolean }
	) => mockUseListBirthRegistrationsQuery(params, options),
	useMarkBirthRegistrationPaidMutation: () => mockMarkPaid(),
	useMarkBirthRegistrationReleasedMutation: () => mockMarkReleased(),
}))

const activeRoleId = "11111111-1111-4111-8111-111111111111"
const inactiveRoleId = "22222222-2222-4222-8222-222222222222"
const activeStaffProfileId = "33333333-3333-4333-8333-333333333333"
const inactiveStaffProfileId = "44444444-4444-4444-8444-444444444444"
const activeFacilityId = "55555555-5555-4555-8555-555555555555"
const inactiveFacilityId = "66666666-6666-4666-8666-666666666666"
const birthRegistrationId = "77777777-7777-4777-8777-777777777777"

function mockProfile(
	staffProfiles = [
		{
			id: inactiveStaffProfileId,
			userId: "user_with_non_uuid_auth_id",
			facilityId: inactiveFacilityId,
			employeeNumber: null,
			department: null,
			prcLicenseNumber: null,
			prcExpiry: null,
			ptrNumber: null,
			ptrExpiry: null,
			pdeaS2License: null,
			pdeaS2Expiry: null,
			isActive: true,
			createdAt: new Date("2026-01-01T00:00:00.000Z"),
			updatedAt: new Date("2026-01-01T00:00:00.000Z"),
			roles: [{ id: inactiveRoleId, name: "Inactive role", isPrimary: false }],
			facility: { id: inactiveFacilityId, name: "Other Facility", facilityType: "community" },
		},
		{
			id: activeStaffProfileId,
			userId: "user_with_non_uuid_auth_id",
			facilityId: activeFacilityId,
			employeeNumber: null,
			department: null,
			prcLicenseNumber: null,
			prcExpiry: null,
			ptrNumber: null,
			ptrExpiry: null,
			pdeaS2License: null,
			pdeaS2Expiry: null,
			isActive: true,
			createdAt: new Date("2026-01-01T00:00:00.000Z"),
			updatedAt: new Date("2026-01-01T00:00:00.000Z"),
			roles: [{ id: activeRoleId, name: "Registrar", isPrimary: true }],
			facility: { id: activeFacilityId, name: "Active Facility", facilityType: "district" },
		},
	]
) {
	return {
		user: {
			id: "user_with_non_uuid_auth_id",
			name: "Registrar User",
			email: "registrar@example.com",
		},
		activeRole: {
			id: activeRoleId,
			name: "Registrar",
			permissions: [],
		},
		staffProfiles,
	}
}

function mockBirthRegistration() {
	return {
		id: birthRegistrationId,
		facilityId: activeFacilityId,
		patientId: "88888888-8888-4888-8888-888888888888",
		encounterId: null,
		birthDatetime: new Date("2026-01-15T08:00:00.000Z"),
		registeredByStaffId: activeStaffProfileId,
		certificateNumber: "B-2026-001",
		attendantAtBirth: "Physician",
		placeOfBirthBarangay: "Poblacion",
		placeOfBirthMunicipality: "Quezon City",
		placeOfBirthProvince: "Metro Manila",
		placeOfBirthRegion: "NCR",
		fatherName: "Dela Cruz, Juan Santos",
		motherName: "Dela Cruz, Maria Reyes",
		physicianName: "Dr. Ana Santos",
		physicianLicenseNo: "1234567",
		physicianSignature: "data:image/png;base64,signature",
		attendingStaffId: null,
		status: "completed",
		requestedAt: new Date("2026-01-15T09:00:00.000Z"),
		paidAt: new Date("2026-01-15T10:00:00.000Z"),
		releasedByStaffId: null,
		releasedAt: null,
		completedAt: new Date("2026-01-15T09:30:00.000Z"),
		submittedAt: null,
		createdAt: new Date("2026-01-15T08:30:00.000Z"),
		updatedAt: new Date("2026-01-15T10:00:00.000Z"),
	}
}

describe("LcrTrackingTable", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockUseMyProfile.mockReturnValue({ data: mockProfile() })
		mockUseListBirthRegistrationsQuery.mockReturnValue({
			data: {
				data: [mockBirthRegistration()],
				total: 1,
			},
			isLoading: false,
		})
		mockMarkPaid.mockReturnValue({ mutate: vi.fn(), isPending: false })
		mockMarkReleased.mockReturnValue({ mutate: vi.fn(), isPending: false })
	})

	it("releases with the active staff-profile UUID instead of the auth user id", () => {
		const mutate = vi.fn()
		mockMarkReleased.mockReturnValue({ mutate, isPending: false })

		render(<LcrTrackingTable />)

		fireEvent.click(screen.getByRole("button", { name: /mark released/i }))

		expect(mockUseListBirthRegistrationsQuery).toHaveBeenCalledWith(
			{ facilityId: activeFacilityId },
			{ enabled: true }
		)
		expect(mutate).toHaveBeenCalledWith({
			id: birthRegistrationId,
		})
		expect(mutate).not.toHaveBeenCalledWith(
			expect.objectContaining({ releasedByStaffId: "user_with_non_uuid_auth_id" })
		)
	})

	it("hides the release action when no staff profile is available", () => {
		mockUseMyProfile.mockReturnValue({ data: mockProfile([]) })

		render(<LcrTrackingTable />)

		expect(screen.queryByRole("button", { name: /mark released/i })).not.toBeInTheDocument()
		expect(mockUseListBirthRegistrationsQuery).toHaveBeenCalledWith(
			{ facilityId: "" },
			{ enabled: false }
		)
	})

	it("blocks release when required LCR fields are missing", () => {
		mockUseListBirthRegistrationsQuery.mockReturnValue({
			data: {
				data: [{ ...mockBirthRegistration(), fatherName: null, physicianSignature: null }],
				total: 1,
			},
			isLoading: false,
		})

		render(<LcrTrackingTable />)

		expect(screen.getByText("Incomplete")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: /mark released/i })).toBeDisabled()
	})
})
