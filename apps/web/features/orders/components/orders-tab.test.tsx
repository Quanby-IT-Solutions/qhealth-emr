import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { OrdersTab } from "./orders-tab"

const mockUseMyProfile = vi.fn()
const mockUseMedOrderListQuery = vi.fn()
const mockUseLabOrderListQuery = vi.fn()
const mockUseImagingOrderListQuery = vi.fn()
const mockUsePrescriptionListQuery = vi.fn()
const mockUseDiscontinueMedOrderMutation = vi.fn()
const mockUseCreatePrescriptionMutation = vi.fn()
const mockUseSignPrescriptionMutation = vi.fn()
const mockUseGenerateOrderAccessTokenMutation = vi.fn()

vi.mock("@/features/app-shell/api/rbac.hooks", () => ({
	useMyProfile: (...args: unknown[]) => mockUseMyProfile(...args),
}))

vi.mock("@/features/orders/api/orders.hooks", () => ({
	useMedOrderListQuery: (...args: unknown[]) => mockUseMedOrderListQuery(...args),
	useLabOrderListQuery: (...args: unknown[]) => mockUseLabOrderListQuery(...args),
	useImagingOrderListQuery: (...args: unknown[]) => mockUseImagingOrderListQuery(...args),
	usePrescriptionListQuery: (...args: unknown[]) => mockUsePrescriptionListQuery(...args),
	useDiscontinueMedOrderMutation: (...args: unknown[]) =>
		mockUseDiscontinueMedOrderMutation(...args),
	useCreatePrescriptionMutation: (...args: unknown[]) => mockUseCreatePrescriptionMutation(...args),
	useSignPrescriptionMutation: (...args: unknown[]) => mockUseSignPrescriptionMutation(...args),
	useGenerateOrderAccessTokenMutation: (...args: unknown[]) =>
		mockUseGenerateOrderAccessTokenMutation(...args),
}))

vi.mock("./create-med-order-dialog", () => ({
	CreateMedOrderDialog: () => null,
}))

vi.mock("./create-lab-order-dialog", () => ({
	CreateLabOrderDialog: () => null,
}))

vi.mock("./create-imaging-order-dialog", () => ({
	CreateImagingOrderDialog: () => null,
}))

vi.mock("./create-order-set-dialog", () => ({
	CreateOrderSetDialog: () => null,
}))

vi.mock("./prescription-print-dialog", () => ({
	PrescriptionPrintDialog: () => null,
}))

vi.mock("./imaging-dashboard", () => ({
	ImagingDashboard: () => <div data-testid="imaging-dashboard" />,
}))

function mockRoleContext(permissions: Array<{ module: string; action: string }>) {
	mockUseMyProfile.mockReturnValue({
		data: {
			activeRole: { permissions },
			staffProfiles: [
				{
					id: "staff-1",
					facilityId: "facility-1",
					prcLicenseNumber: "PRC-123",
					ptrNumber: "PTR-456",
					prcExpiry: "2027-01-01",
					ptrExpiry: "2027-01-01",
				},
			],
			user: { name: "Dr. Test" },
		},
	})
}

function mockOrderQueries() {
	mockUseMedOrderListQuery.mockReturnValue({
		data: {
			data: [
				{
					id: "med-1",
					genericName: "Amoxicillin",
					brandName: null,
					dose: "500",
					doseUnit: "mg",
					doseForm: "capsule",
					route: "PO",
					frequency: "TID",
					durationDays: 7,
					isPrn: false,
					isControlledSubstance: false,
					pdeaSchedule: null,
					pdeaTrancheNumber: null,
					pdeaTrancheTotal: null,
					status: "active",
					orderingStaffName: "Dr. Test",
					createdAt: "2026-05-05T00:00:00.000Z",
				},
			],
		},
		isLoading: false,
	})
	mockUseLabOrderListQuery.mockReturnValue({ data: { data: [] }, isLoading: false })
	mockUseImagingOrderListQuery.mockReturnValue({ data: { data: [] }, isLoading: false })
	mockUsePrescriptionListQuery.mockReturnValue({
		data: {
			data: [
				{
					id: "rx-1",
					medicationOrderId: "med-1",
					status: "draft",
					prcLicenseNumber: "PRC-123",
					ptrNumber: "PTR-456",
					pdeaS2License: null,
					prescriberStaffName: "Dr. Test",
					createdAt: "2026-05-05T01:00:00.000Z",
					prescriptionContent: {
						genericName: "Amoxicillin",
					},
				},
			],
		},
		isLoading: false,
	})
}

describe("OrdersTab", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockOrderQueries()
		mockUseDiscontinueMedOrderMutation.mockReturnValue({
			mutate: vi.fn(),
			isPending: false,
		})
		mockUseCreatePrescriptionMutation.mockReturnValue({
			mutate: vi.fn(),
			isPending: false,
		})
		mockUseSignPrescriptionMutation.mockReturnValue({
			mutate: vi.fn(),
			isPending: false,
		})
		mockUseGenerateOrderAccessTokenMutation.mockReturnValue({
			mutate: vi.fn(),
			isPending: false,
		})
	})

	it("hides prescribing and order-authoring actions for view-only roles", async () => {
		const user = userEvent.setup()
		mockRoleContext([{ module: "orders", action: "view" }])

		render(<OrdersTab encounterId="enc-1" facilityId="facility-1" patientId="patient-1" />)

		expect(screen.queryByText(/prescription license warning/i)).toBeNull()
		expect(screen.queryByRole("button", { name: /order set/i })).toBeNull()

		await user.click(screen.getByRole("tab", { name: /medications/i }))
		expect(screen.queryByRole("button", { name: /new medication order/i })).toBeNull()
		expect(screen.queryByRole("button", { name: /generate rx/i })).toBeNull()
		expect(screen.queryByRole("button", { name: /discontinue/i })).toBeNull()

		await user.click(screen.getByRole("tab", { name: /prescriptions/i }))
		expect(screen.queryByRole("button", { name: /^sign$/i })).toBeNull()
	})

	it("shows TOR-authorized actions for prescribing clinicians", async () => {
		const user = userEvent.setup()
		mockRoleContext([
			{ module: "orders", action: "view" },
			{ module: "orders", action: "create" },
			{ module: "orders", action: "edit" },
			{ module: "orders", action: "sign" },
		])

		render(<OrdersTab encounterId="enc-1" facilityId="facility-1" patientId="patient-1" />)

		expect(screen.getByRole("button", { name: /order set/i })).toBeInTheDocument()

		await user.click(screen.getByRole("tab", { name: /medications/i }))
		expect(screen.getByRole("button", { name: /new medication order/i })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: /generate rx/i })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: /discontinue/i })).toBeInTheDocument()

		await user.click(screen.getByRole("tab", { name: /prescriptions/i }))
		expect(screen.getByRole("button", { name: /^sign$/i })).toBeInTheDocument()
	})

	it("confirms before discontinuing an active medication order", async () => {
		const user = userEvent.setup()
		const discontinueMutate = vi.fn()
		mockRoleContext([
			{ module: "orders", action: "view" },
			{ module: "orders", action: "edit" },
		])
		mockUseDiscontinueMedOrderMutation.mockReturnValue({
			mutate: discontinueMutate,
			isPending: false,
		})

		render(<OrdersTab encounterId="enc-1" facilityId="facility-1" patientId="patient-1" />)

		await user.click(screen.getByRole("tab", { name: /medications/i }))
		await user.click(screen.getByRole("button", { name: /discontinue/i }))

		expect(discontinueMutate).not.toHaveBeenCalled()
		expect(screen.getByText(/discontinue medication/i)).toBeInTheDocument()

		await user.click(screen.getByRole("button", { name: /^discontinue$/i }))

		expect(discontinueMutate).toHaveBeenCalledWith("med-1")
	})

	it("confirms before generating an e-prescription from an active medication order", async () => {
		const user = userEvent.setup()
		const createPrescriptionMutate = vi.fn()
		mockRoleContext([
			{ module: "orders", action: "view" },
			{ module: "orders", action: "create" },
			{ module: "orders", action: "sign" },
		])
		mockUseCreatePrescriptionMutation.mockReturnValue({
			mutate: createPrescriptionMutate,
			isPending: false,
		})

		render(<OrdersTab encounterId="enc-1" facilityId="facility-1" patientId="patient-1" />)

		await user.click(screen.getByRole("tab", { name: /medications/i }))
		await user.click(screen.getByRole("button", { name: /generate rx/i }))

		expect(createPrescriptionMutate).not.toHaveBeenCalled()
		expect(screen.getByText(/generate prescription/i)).toBeInTheDocument()

		await user.click(screen.getByRole("button", { name: /^generate rx$/i }))

		expect(createPrescriptionMutate).toHaveBeenCalledWith(
			expect.objectContaining({ medicationOrderId: "med-1" }),
			expect.any(Object)
		)
	})
})
