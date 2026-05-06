import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { EPrescriptionPage } from "./e-prescription-page"

const mockUseMyProfile = vi.fn()
const mockUseEncounterDetailQuery = vi.fn()
const mockUseMedOrderListQuery = vi.fn()
const mockUsePrescriptionListQuery = vi.fn()
const mockUseCreatePrescriptionMutation = vi.fn()
const mockUseSignPrescriptionMutation = vi.fn()

vi.mock("@/features/app-shell/api/rbac.hooks", () => ({
	useMyProfile: (...args: unknown[]) => mockUseMyProfile(...args),
}))

vi.mock("@/features/encounters/api/encounters.hooks", () => ({
	useEncounterDetailQuery: (...args: unknown[]) => mockUseEncounterDetailQuery(...args),
}))

vi.mock("@/features/orders/api/orders.hooks", () => ({
	useMedOrderListQuery: (...args: unknown[]) => mockUseMedOrderListQuery(...args),
	usePrescriptionListQuery: (...args: unknown[]) => mockUsePrescriptionListQuery(...args),
	useCreatePrescriptionMutation: (...args: unknown[]) =>
		mockUseCreatePrescriptionMutation(...args),
	useSignPrescriptionMutation: (...args: unknown[]) => mockUseSignPrescriptionMutation(...args),
}))

vi.mock("./prescription-print-dialog", () => ({
	PrescriptionPrintDialog: () => null,
}))

describe("EPrescriptionPage", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockUseEncounterDetailQuery.mockReturnValue({
			data: {
				patientName: "Juan Dela Cruz",
				patientMrn: "MRN-1",
				admissionDatetime: "2026-05-05T00:00:00.000Z",
			},
		})
		mockUseMedOrderListQuery.mockReturnValue({ data: { data: [] }, isLoading: false })
		mockUsePrescriptionListQuery.mockReturnValue({ data: { data: [] }, isLoading: false })
		mockUseCreatePrescriptionMutation.mockReturnValue({
			mutate: vi.fn(),
			isPending: false,
		})
		mockUseSignPrescriptionMutation.mockReturnValue({
			mutate: vi.fn(),
			isPending: false,
		})
	})

	it("blocks direct access for roles that cannot sign prescriptions", () => {
		mockUseMyProfile.mockReturnValue({
			data: {
				activeRole: {
					permissions: [{ module: "orders", action: "view" }],
				},
				staffProfiles: [],
				user: { name: "Viewer" },
			},
		})

		render(
			<EPrescriptionPage encounterId="enc-1" facilityId="facility-1" patientId="patient-1" />
		)

		expect(screen.getByText(/you do not have permission to access e-prescription/i)).toBeInTheDocument()
		expect(screen.queryByText(/ready to prescribe/i)).toBeNull()
	})
})
