import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { TelemedicineEncounterForm } from "./telemedicine-encounter-form"

const mockUseEncounterListQuery = vi.fn()
const mockUsePatientSummaryQuery = vi.fn()
const mockMutateAsync = vi.fn()
const mockUseCreateEncounterMutation = vi.fn()

vi.mock("@/features/encounters/api/encounters.hooks", () => ({
	useEncounterListQuery: (...args: unknown[]) => mockUseEncounterListQuery(...args),
}))

vi.mock("@/features/problems-allergies/api/problems-allergies.hooks", () => ({
	usePatientSummaryQuery: (...args: unknown[]) => mockUsePatientSummaryQuery(...args),
}))

vi.mock("@/features/telemedicine/api/telemedicine.hooks", () => ({
	useCreateEncounterMutation: (...args: unknown[]) => mockUseCreateEncounterMutation(...args),
}))

vi.mock("@/features/face-scan/components/face-scan-vitals-button", () => ({
	FaceScanVitalsButton: () => null,
}))

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
	},
}))

const VISIT_ID = "550e8400-e29b-41d4-a716-446655440001"

function renderForm(props: { initialLinkedEncounterId?: string | null } = {}) {
	return render(
		<TelemedicineEncounterForm
			appointmentId="550e8400-e29b-41d4-a716-446655440000"
			facilityId="550e8400-e29b-41d4-a716-446655440010"
			patientId="550e8400-e29b-41d4-a716-446655440011"
			patientName="Dela Cruz, Juan"
			clinicianName="Dr. Reyes"
			initialLinkedEncounterId={props.initialLinkedEncounterId}
		/>
	)
}

beforeEach(() => {
	vi.clearAllMocks()
	mockMutateAsync.mockResolvedValue({ id: "550e8400-e29b-41d4-a716-446655440099" })
	mockUseCreateEncounterMutation.mockReturnValue({
		mutateAsync: mockMutateAsync,
		isPending: false,
	})
	mockUsePatientSummaryQuery.mockReturnValue({
		data: { activeProblems: [], activeAllergies: [] },
		isLoading: false,
	})
	mockUseEncounterListQuery.mockReturnValue({
		data: {
			data: [
				{
					id: VISIT_ID,
					encounterType: "outpatient",
					status: "active",
					chiefComplaint: "Cough follow-up",
					admissionDatetime: "2026-05-18T08:00:00.000Z",
					dischargeDatetime: null,
					patientName: "Dela Cruz, Juan",
					attendingStaffName: "Dr. Santos",
					wardName: null,
					bedNumber: null,
					queueNumber: 12,
					transferStatus: null,
				},
				{
					id: "550e8400-e29b-41d4-a716-446655440002",
					encounterType: "telemedicine",
					status: "active",
					chiefComplaint: "Virtual visit",
					admissionDatetime: "2026-05-19T08:00:00.000Z",
					dischargeDatetime: null,
					patientName: "Dela Cruz, Juan",
					attendingStaffName: "Dr. Reyes",
					wardName: null,
					bedNumber: null,
					queueNumber: null,
					transferStatus: null,
				},
			],
		},
		isLoading: false,
	})
})

describe("TelemedicineEncounterForm", () => {
	it("shows an in-person encounter picker for linked notes", async () => {
		const user = userEvent.setup()
		renderForm()

		await user.click(screen.getByRole("button", { name: /follow-up to in-person visit/i }))

		expect(screen.getByText(/linked in-person visit/i)).toBeInTheDocument()
		expect(screen.getByText(/cough follow-up/i)).toBeInTheDocument()
		expect(screen.queryByText(/virtual visit/i)).not.toBeInTheDocument()
	})

	it("disables follow-up mode when the patient has no prior in-person visits", () => {
		mockUseEncounterListQuery.mockReturnValue({
			data: { data: [] },
			isLoading: false,
		})

		renderForm()

		expect(screen.getByRole("button", { name: /follow-up to in-person visit/i })).toBeDisabled()
		expect(screen.getByText(/no prior opd, er, or inpatient visit found/i)).toBeInTheDocument()
	})

	it("auto-detects follow-up mode when the appointment has a linked source encounter", () => {
		renderForm({ initialLinkedEncounterId: VISIT_ID })

		expect(screen.getByText(/detected from the appointment source/i)).toBeInTheDocument()
		expect(screen.getByRole("button", { name: /follow-up to in-person visit/i })).toHaveAttribute(
			"aria-pressed",
			"true"
		)
		expect(screen.getByText(/cough follow-up/i)).toBeInTheDocument()
	})

	it("submits standalone notes without linkedEncounterId", async () => {
		const user = userEvent.setup()
		renderForm()

		await user.type(screen.getByLabelText(/chief complaint/i), "Cough")
		await user.type(screen.getByLabelText(/diagnosis/i), "URTI")
		await user.click(screen.getByRole("button", { name: /save clinical note/i }))

		expect(mockMutateAsync).toHaveBeenCalledWith(
			expect.not.objectContaining({ linkedEncounterId: expect.anything() })
		)
		expect(mockMutateAsync).toHaveBeenCalledWith(
			expect.objectContaining({ encounterType: "standalone" })
		)
	})

	it("submits linked notes with the selected linkedEncounterId", async () => {
		const user = userEvent.setup()
		renderForm()

		await user.click(screen.getByRole("button", { name: /follow-up to in-person visit/i }))
		await user.click(screen.getByRole("button", { name: /outpatient/i }))
		await user.type(screen.getByLabelText(/chief complaint/i), "Follow-up")
		await user.type(screen.getByLabelText(/diagnosis/i), "Improving")
		await user.click(screen.getByRole("button", { name: /save clinical note/i }))

		expect(mockMutateAsync).toHaveBeenCalledWith(
			expect.objectContaining({
				encounterType: "linked",
				linkedEncounterId: VISIT_ID,
			})
		)
	})
})
