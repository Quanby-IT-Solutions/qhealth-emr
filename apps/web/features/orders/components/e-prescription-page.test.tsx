import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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
		mockUseMyProfile.mockReturnValue({
			data: {
				activeRole: {
					permissions: [
						{ module: "orders", action: "view" },
						{ module: "orders", action: "create" },
						{ module: "orders", action: "sign" },
					],
				},
				staffProfiles: [
					{
						id: "staff-1",
						facilityId: "facility-1",
						prcLicenseNumber: "PRC-100001",
						prcExpiry: "2099-12-31",
						ptrNumber: "PTR-100001",
						ptrExpiry: "2099-12-31",
						pdeaS2License: null,
						pdeaS2Expiry: null,
					},
				],
				user: { name: "Dr. Test" },
			},
		})
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

	it("shows facility-specific PRC/PTR credentials and generates a prescription draft", async () => {
		const user = userEvent.setup()
		const createMutate = vi.fn()
		mockUseMedOrderListQuery.mockReturnValue({
			data: {
				data: [
					{
						id: "order-1",
						status: "verified",
						genericName: "Paracetamol",
						brandName: "Biogesic",
						dose: "500",
						doseUnit: "mg",
						doseForm: "tablet",
						route: "oral",
						frequency: "once",
						durationDays: 3,
						pdeaTrancheNumber: null,
					},
				],
			},
			isLoading: false,
		})
		mockUseCreatePrescriptionMutation.mockReturnValue({
			mutate: createMutate,
			isPending: false,
		})

		render(
			<EPrescriptionPage encounterId="enc-1" facilityId="facility-1" patientId="patient-1" />
		)

		expect(screen.getByText(/PRC PRC-100001/i)).toBeInTheDocument()
		expect(screen.getByText(/PTR PTR-100001/i)).toBeInTheDocument()

		await user.click(screen.getByRole("button", { name: /generate rx/i }))

		expect(createMutate).toHaveBeenCalledWith(
			{
				facilityId: "facility-1",
				encounterId: "enc-1",
				medicationOrderId: "order-1",
				patientId: "patient-1",
			},
			expect.objectContaining({
				onSuccess: expect.any(Function),
				onError: expect.any(Function),
			})
		)
	})

	it("blocks generation when no active staff profile exists for the selected facility", () => {
		mockUseMyProfile.mockReturnValue({
			data: {
				activeRole: {
					permissions: [
						{ module: "orders", action: "view" },
						{ module: "orders", action: "create" },
						{ module: "orders", action: "sign" },
					],
				},
				staffProfiles: [
					{
						id: "staff-other",
						facilityId: "other-facility",
						prcLicenseNumber: "PRC-OTHER",
						prcExpiry: "2099-12-31",
						ptrNumber: "PTR-OTHER",
						ptrExpiry: "2099-12-31",
					},
				],
				user: { name: "Dr. Other" },
			},
		})
		mockUseMedOrderListQuery.mockReturnValue({
			data: {
				data: [
					{
						id: "order-1",
						status: "verified",
						genericName: "Paracetamol",
						dose: "500",
						doseUnit: "mg",
						doseForm: "tablet",
						route: "oral",
						frequency: "once",
						pdeaTrancheNumber: null,
					},
				],
			},
			isLoading: false,
		})

		render(
			<EPrescriptionPage encounterId="enc-1" facilityId="facility-1" patientId="patient-1" />
		)

		expect(
			screen.getByText(/no active staff profile was found for this facility/i)
		).toBeInTheDocument()
		expect(screen.getByRole("button", { name: /generate rx/i })).toBeDisabled()
	})

	it("blocks e-prescription generation when PRC or PTR credentials are expired", () => {
		const createMutate = vi.fn()
		mockUseMyProfile.mockReturnValue({
			data: {
				activeRole: {
					permissions: [
						{ module: "orders", action: "view" },
						{ module: "orders", action: "create" },
						{ module: "orders", action: "sign" },
					],
				},
				staffProfiles: [
					{
						id: "staff-1",
						facilityId: "facility-1",
						prcLicenseNumber: "PRC-EXPIRED",
						prcExpiry: "2020-01-01",
						ptrNumber: "PTR-EXPIRED",
						ptrExpiry: "2020-01-01",
					},
				],
				user: { name: "Dr. Expired" },
			},
		})
		mockUseMedOrderListQuery.mockReturnValue({
			data: {
				data: [
					{
						id: "order-1",
						status: "verified",
						genericName: "Paracetamol",
						dose: "500",
						doseUnit: "mg",
						doseForm: "tablet",
						route: "oral",
						frequency: "once",
						pdeaTrancheNumber: null,
					},
				],
			},
			isLoading: false,
		})
		mockUseCreatePrescriptionMutation.mockReturnValue({
			mutate: createMutate,
			isPending: false,
		})

		render(
			<EPrescriptionPage encounterId="enc-1" facilityId="facility-1" patientId="patient-1" />
		)

		expect(screen.getByText(/PRC license expired/i)).toBeInTheDocument()
		expect(screen.getByText(/PTR expired/i)).toBeInTheDocument()
		expect(screen.getByRole("button", { name: /generate rx/i })).toBeDisabled()
		expect(createMutate).not.toHaveBeenCalled()
	})

	it("shows expiring PRC/PTR alerts without blocking active credentials", () => {
		const createMutate = vi.fn()
		const soon = new Date()
		soon.setDate(soon.getDate() + 10)
		const soonDate = soon.toISOString().split("T")[0]!
		mockUseMyProfile.mockReturnValue({
			data: {
				activeRole: {
					permissions: [
						{ module: "orders", action: "view" },
						{ module: "orders", action: "create" },
						{ module: "orders", action: "sign" },
					],
				},
				staffProfiles: [
					{
						id: "staff-1",
						facilityId: "facility-1",
						prcLicenseNumber: "PRC-SOON",
						prcExpiry: soonDate,
						ptrNumber: "PTR-SOON",
						ptrExpiry: soonDate,
					},
				],
				user: { name: "Dr. Soon" },
			},
		})
		mockUseMedOrderListQuery.mockReturnValue({
			data: {
				data: [
					{
						id: "order-1",
						status: "verified",
						genericName: "Paracetamol",
						dose: "500",
						doseUnit: "mg",
						doseForm: "tablet",
						route: "oral",
						frequency: "once",
						pdeaTrancheNumber: null,
					},
				],
			},
			isLoading: false,
		})
		mockUseCreatePrescriptionMutation.mockReturnValue({
			mutate: createMutate,
			isPending: false,
		})

		render(
			<EPrescriptionPage encounterId="enc-1" facilityId="facility-1" patientId="patient-1" />
		)

		expect(screen.getByText(/PRC license expires/i)).toBeInTheDocument()
		expect(screen.getByText(/PTR expires/i)).toBeInTheDocument()
		expect(screen.queryByText(/prescription generation blocked/i)).toBeNull()
		expect(screen.getByRole("button", { name: /generate rx/i })).toBeEnabled()
	})

	it("offers the first PDEA tranche for prescribing, not the parent course order", () => {
		mockUseMedOrderListQuery.mockReturnValue({
			data: {
				data: [
					{
						id: "parent-order",
						status: "verified",
						parentOrderId: null,
						genericName: "Morphine parent course",
						brandName: null,
						dose: "10",
						doseUnit: "mg",
						doseForm: "tablet",
						route: "oral",
						frequency: "bid",
						durationDays: 90,
						pdeaTrancheNumber: null,
						pdeaTrancheTotal: 3,
					},
					{
						id: "child-order-1",
						status: "verified",
						parentOrderId: "parent-order",
						genericName: "Morphine tranche one",
						brandName: null,
						dose: "10",
						doseUnit: "mg",
						doseForm: "tablet",
						route: "oral",
						frequency: "bid",
						durationDays: 30,
						pdeaTrancheNumber: 1,
						pdeaTrancheTotal: 3,
					},
					{
						id: "child-order-2",
						status: "verified",
						parentOrderId: "parent-order",
						genericName: "Morphine future tranche",
						brandName: null,
						dose: "10",
						doseUnit: "mg",
						doseForm: "tablet",
						route: "oral",
						frequency: "bid",
						durationDays: 30,
						pdeaTrancheNumber: 2,
						pdeaTrancheTotal: 3,
					},
				],
			},
			isLoading: false,
		})

		render(
			<EPrescriptionPage encounterId="enc-1" facilityId="facility-1" patientId="patient-1" />
		)

		expect(screen.queryByText(/Morphine parent course/i)).toBeNull()
		expect(screen.getByText(/Morphine tranche one/i)).toBeInTheDocument()
		expect(screen.queryByText(/Morphine future tranche/i)).toBeNull()
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
