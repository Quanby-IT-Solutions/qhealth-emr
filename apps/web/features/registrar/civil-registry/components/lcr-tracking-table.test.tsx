import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LcrTrackingTable } from "./lcr-tracking-table"

const mockUseMyProfile = vi.fn()
const mockUseListLcrTrackingQuery = vi.fn()
const mockMarkPaid = vi.fn()
const mockMarkReleased = vi.fn()
const mockMarkDeathPaid = vi.fn()
const mockMarkDeathReleased = vi.fn()
const mockGenerateArtifact = vi.fn()
const mockMarkSubmitted = vi.fn()
const mockSubmitCertificate = vi.fn()
const mockRetrySubmission = vi.fn()

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
	useListLcrTrackingQuery: (params: { facilityId: string }, options?: { enabled?: boolean }) =>
		mockUseListLcrTrackingQuery(params, options),
	useMarkBirthRegistrationPaidMutation: () => mockMarkPaid(),
	useMarkBirthRegistrationReleasedMutation: () => mockMarkReleased(),
	useMarkDeathCertificateRegistrationPaidMutation: () => mockMarkDeathPaid(),
	useMarkDeathCertificateRegistrationReleasedMutation: () => mockMarkDeathReleased(),
	useGenerateLcrArtifactMutation: () => mockGenerateArtifact(),
	useGenerateBirthCertificateArtifactsMutation: () => mockGenerateArtifact(),
	useGenerateDeathCertificateArtifactsMutation: () => mockGenerateArtifact(),
	useMarkLcrSubmittedMutation: () => mockMarkSubmitted(),
	useSubmitBirthCertificateToLcrMutation: () => mockSubmitCertificate(),
	useSubmitDeathCertificateToLcrMutation: () => mockSubmitCertificate(),
	useRetryLcrSubmissionMutation: () => mockRetrySubmission(),
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
		certificateType: "birth",
		sourceRecordId: birthRegistrationId,
		facilityId: activeFacilityId,
		patientId: "88888888-8888-4888-8888-888888888888",
		encounterId: null,
		certificateNumber: "B-2026-001",
		eventDatetime: new Date("2026-01-15T08:00:00.000Z"),
		status: "completed",
		requestedAt: new Date("2026-01-15T09:00:00.000Z"),
		paidAt: new Date("2026-01-15T10:00:00.000Z"),
		releasedAt: null,
		completedAt: new Date("2026-01-15T09:30:00.000Z"),
		submittedAt: null,
		tracking: null,
	}
}

function mockDeathRegistration() {
	return {
		certificateType: "death",
		sourceRecordId: "99999999-9999-4999-8999-999999999999",
		facilityId: activeFacilityId,
		patientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
		encounterId: null,
		certificateNumber: "D-2026-001",
		eventDatetime: new Date("2026-01-16T08:00:00.000Z"),
		status: "submitted",
		requestedAt: new Date("2026-01-16T09:00:00.000Z"),
		paidAt: new Date("2026-01-16T10:00:00.000Z"),
		releasedAt: new Date("2026-01-16T11:00:00.000Z"),
		completedAt: new Date("2026-01-16T11:00:00.000Z"),
		submittedAt: new Date("2026-01-16T12:00:00.000Z"),
		tracking: {
			pdfStatus: "generated",
			pdfGeneratedAt: new Date("2026-01-16T11:10:00.000Z"),
			pdfUrl: "/storage/lcr-certificates/death/facility/2026/registration.pdf",
			xmlStatus: "generated",
			xmlGeneratedAt: new Date("2026-01-16T11:15:00.000Z"),
			xmlUrl: "/storage/lcr-certificates/death/facility/2026/registration.xml",
			submissionStatus: "acknowledged",
			submittedAt: new Date("2026-01-16T12:00:00.000Z"),
			acknowledgementNumber: "ACK-1",
			referenceNumber: "REF-1",
			lastSubmissionError: null,
			lastSubmissionErrorAt: null,
		},
	}
}

describe("LcrTrackingTable", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockUseMyProfile.mockReturnValue({ data: mockProfile() })
		mockUseListLcrTrackingQuery.mockReturnValue({
			data: {
				data: [mockBirthRegistration(), mockDeathRegistration()],
				total: 2,
			},
			isLoading: false,
		})
		mockMarkPaid.mockReturnValue({ mutate: vi.fn(), isPending: false })
		mockMarkReleased.mockReturnValue({ mutate: vi.fn(), isPending: false })
		mockMarkDeathPaid.mockReturnValue({ mutate: vi.fn(), isPending: false })
		mockMarkDeathReleased.mockReturnValue({ mutate: vi.fn(), isPending: false })
		mockGenerateArtifact.mockReturnValue({ mutate: vi.fn(), isPending: false })
		mockMarkSubmitted.mockReturnValue({ mutate: vi.fn(), isPending: false })
		mockSubmitCertificate.mockReturnValue({ mutate: vi.fn(), isPending: false })
		mockRetrySubmission.mockReturnValue({ mutate: vi.fn(), isPending: false })
	})

	it("releases with the active staff-profile UUID instead of the auth user id", () => {
		const mutate = vi.fn()
		mockMarkReleased.mockReturnValue({ mutate, isPending: false })

		render(<LcrTrackingTable />)

		fireEvent.click(screen.getByRole("button", { name: /mark released/i }))

		expect(mockUseListLcrTrackingQuery).toHaveBeenCalledWith(
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
		expect(mockUseListLcrTrackingQuery).toHaveBeenCalledWith({ facilityId: "" }, { enabled: false })
	})

	it("shows birth and death records with artifact and submission state", () => {
		render(<LcrTrackingTable />)

		expect(screen.getByText("Birth")).toBeInTheDocument()
		expect(screen.getByText("Death")).toBeInTheDocument()
		expect(screen.getAllByText("generated")).toHaveLength(2)
		expect(screen.getByText("acknowledged")).toBeInTheDocument()
		expect(screen.getByText(/Ack ACK-1/)).toBeInTheDocument()
	})
})
