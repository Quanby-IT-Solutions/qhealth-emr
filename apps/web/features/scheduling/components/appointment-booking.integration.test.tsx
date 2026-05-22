import { createContext, useContext, type ReactNode } from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AppointmentBooking } from "./appointment-booking"

const mockUsePermissions = vi.fn()
const mockUsePatientSearchQuery = vi.fn()
const mockUseAvailableSlotsQuery = vi.fn()
const mockUseBookAppointmentMutation = vi.fn()
const mockUseStaffClinicianListQuery = vi.fn()
const mockUseCreateTelemedicineAppointmentMutation = vi.fn()
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()

type SelectContextValue = {
	disabled?: boolean
	onValueChange?: (value: string) => void
	value?: string
}

const SelectContext = createContext<SelectContextValue>({})

vi.mock("@/core/hooks/use-permissions", () => ({
	usePermissions: (...args: unknown[]) => mockUsePermissions(...args),
}))

vi.mock("@/features/patients/api/patients.hooks", () => ({
	usePatientSearchQuery: (...args: unknown[]) => mockUsePatientSearchQuery(...args),
}))

vi.mock("@/features/scheduling/api/scheduling.hooks", () => ({
	useAvailableSlotsQuery: (...args: unknown[]) => mockUseAvailableSlotsQuery(...args),
	useBookAppointmentMutation: (...args: unknown[]) => mockUseBookAppointmentMutation(...args),
	useStaffClinicianListQuery: (...args: unknown[]) => mockUseStaffClinicianListQuery(...args),
}))

vi.mock("@/features/telemedicine/api/telemedicine.hooks", () => ({
	useCreateAppointmentMutation: (...args: unknown[]) =>
		mockUseCreateTelemedicineAppointmentMutation(...args),
}))

vi.mock("sonner", () => ({
	toast: {
		error: (...args: unknown[]) => mockToastError(...args),
		success: (...args: unknown[]) => mockToastSuccess(...args),
	},
}))

vi.mock("@/core/components/ui/dialog", () => ({
	Dialog: ({
		children,
		open,
	}: {
		children: ReactNode
		open?: boolean
		onOpenChange?: (open: boolean) => void
	}) => (open ? <div>{children}</div> : null),
	DialogContent: ({ children }: { children: ReactNode }) => (
		<div role="dialog" aria-modal="true">
			{children}
		</div>
	),
	DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}))

vi.mock("@/core/components/ui/select", () => ({
	Select: ({
		children,
		disabled,
		onValueChange,
		value,
	}: {
		children: ReactNode
		disabled?: boolean
		onValueChange?: (value: string) => void
		value?: string
	}) => (
		<SelectContext.Provider value={{ disabled, onValueChange, value }}>
			<div>{children}</div>
		</SelectContext.Provider>
	),
	SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	SelectItem: ({
		children,
		disabled,
		value,
	}: {
		children: ReactNode
		disabled?: boolean
		value: string
	}) => {
		const context = useContext(SelectContext)
		return (
			<button
				type="button"
				disabled={disabled || context.disabled}
				onClick={() => context.onValueChange?.(value)}
			>
				{children}
			</button>
		)
	},
	SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	SelectValue: ({ children }: { children?: ReactNode }) => {
		const context = useContext(SelectContext)
		return <span>{children ?? context.value}</span>
	},
}))

const clinicians = [
	{ id: "physician-1", name: "Dr. Reyes", department: "Cardiology" },
	{ id: "physician-2", name: "Dr. Santos", department: "Family Medicine" },
]

function renderBooking() {
	render(<AppointmentBooking facilityId="facility-1" />)
}

async function openTelemedicineSlot() {
	const user = userEvent.setup()

	renderBooking()
	await user.click(screen.getByRole("button", { name: /telemedicine/i }))
	await user.click(screen.getByRole("button", { name: /dr\. reyes — cardiology/i }))
	await user.click(screen.getByRole("button", { name: /10:00 am/i }))

	return user
}

describe("AppointmentBooking telemedicine integration", () => {
	beforeEach(() => {
		vi.clearAllMocks()

		mockUsePermissions.mockReturnValue({ canCreateTelemedicine: true })
		mockUseStaffClinicianListQuery.mockReturnValue({ data: clinicians, isLoading: false })
		mockUseAvailableSlotsQuery.mockReturnValue({
			data: {
				clinicName: "Main OPD",
				slots: [{ slotId: "slot-1", time: "10:00", available: true }],
			},
			isLoading: false,
		})
		mockUsePatientSearchQuery.mockReturnValue({
			data: {
				data: [
					{
						id: "patient-1",
						firstName: "Juan",
						lastName: "Dela Cruz",
						mrn: "QH-000002",
					},
				],
			},
			isLoading: false,
		})
		mockUseBookAppointmentMutation.mockReturnValue({
			isPending: false,
			mutate: vi.fn(),
		})
		mockUseCreateTelemedicineAppointmentMutation.mockReturnValue({
			isPending: false,
			mutate: vi.fn(),
		})
	})

	it("shows telemedicine booking fields for scheduler users with create permission", async () => {
		await openTelemedicineSlot()

		expect(screen.getByRole("dialog")).toBeInTheDocument()
		expect(screen.getByText("Telemedicine details")).toBeInTheDocument()
		expect(screen.getByText(/assign the physician/i)).toBeInTheDocument()
		expect(screen.getByRole("button", { name: /livekit/i })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: /30 minutes/i })).toBeInTheDocument()
		expect(screen.queryByPlaceholderText(/chief complaint/i)).not.toBeInTheDocument()
	})

	it("hides the telemedicine appointment type when permission is missing", () => {
		mockUsePermissions.mockReturnValue({ canCreateTelemedicine: false })

		renderBooking()

		expect(screen.queryByRole("button", { name: /telemedicine/i })).not.toBeInTheDocument()
	})

	it("submits telemedicine appointments through the telemedicine mutation", async () => {
		const mutate = vi.fn((_input, options) => options?.onSuccess?.())
		mockUseCreateTelemedicineAppointmentMutation.mockReturnValue({
			isPending: false,
			mutate,
		})
		const user = await openTelemedicineSlot()

		await user.type(screen.getByPlaceholderText(/name or mrn/i), "Dela Cruz")
		await user.click(screen.getByRole("button", { name: /dela cruz, juan/i }))
		await user.type(screen.getByPlaceholderText(/additional notes/i), "Needs interpreter")
		await user.click(screen.getByRole("button", { name: /book telemedicine/i }))

		expect(mutate).toHaveBeenCalledWith(
			expect.objectContaining({
				facilityId: "facility-1",
				patientId: "patient-1",
				clinicianId: "physician-1",
				scheduledTime: "10:00",
				durationMinutes: 30,
				platform: "livekit",
				notes: "Needs interpreter",
			}),
			expect.objectContaining({
				onError: expect.any(Function),
				onSuccess: expect.any(Function),
			})
		)
		expect(mockToastSuccess).toHaveBeenCalledWith("Telemedicine appointment booked.")
	})

	it("surfaces backend telemedicine validation errors", async () => {
		const mutate = vi.fn((_input, options) =>
			options?.onError?.(
				new Error("Schedulers cannot assign themselves as the treating physician.")
			)
		)
		mockUseCreateTelemedicineAppointmentMutation.mockReturnValue({
			isPending: false,
			mutate,
		})
		const user = await openTelemedicineSlot()

		await user.type(screen.getByPlaceholderText(/name or mrn/i), "Dela Cruz")
		await user.click(screen.getByRole("button", { name: /dela cruz, juan/i }))
		await user.click(screen.getByRole("button", { name: /book telemedicine/i }))

		await waitFor(() => {
			expect(mockToastError).toHaveBeenCalledWith(
				"Schedulers cannot assign themselves as the treating physician."
			)
		})
	})
})
