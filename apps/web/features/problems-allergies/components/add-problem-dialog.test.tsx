import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AddProblemDialog } from "./add-problem-dialog"

const mockCreateProblemMutation = vi.fn()
const mockProblemsQuery = vi.fn()
const mockIcd10ProblemSearchQuery = vi.fn()

vi.mock("@/features/problems-allergies/api/problems-allergies.hooks", () => ({
	useCreateProblemMutation: () => mockCreateProblemMutation(),
	useProblemsQuery: (...args: unknown[]) => mockProblemsQuery(...args),
	useIcd10ProblemSearchQuery: (...args: unknown[]) => mockIcd10ProblemSearchQuery(...args),
}))

describe("AddProblemDialog", () => {
	const mutate = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
		mockCreateProblemMutation.mockReturnValue({ mutate, isPending: false })
		mockProblemsQuery.mockReturnValue({
			data: { data: [], total: 0, page: 1, limit: 50, totalPages: 0 },
		})
		mockIcd10ProblemSearchQuery.mockReturnValue({
			data: { data: [] },
			isFetching: false,
		})
	})

	it("submits a custom text-only diagnosis without requiring an ICD-10 code", async () => {
		const user = userEvent.setup()
		render(
			<AddProblemDialog open onOpenChange={vi.fn()} patientId="patient-1" facilityId="facility-1" />
		)

		await user.type(screen.getByLabelText(/diagnosis/i), "Clinical diagnosis pending coding")
		await user.click(screen.getByRole("button", { name: /^add problem$/i }))

		expect(mutate).toHaveBeenCalledWith(
			expect.objectContaining({
				facilityId: "facility-1",
				patientId: "patient-1",
				description: "Clinical diagnosis pending coding",
				icd10Code: undefined,
				icd10Display: undefined,
				status: "active",
			}),
			expect.any(Object)
		)
	})

	it("presents ICD-10 as optional coding, not the required diagnosis field", () => {
		render(
			<AddProblemDialog open onOpenChange={vi.fn()} patientId="patient-1" facilityId="facility-1" />
		)

		expect(screen.getByLabelText(/diagnosis/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/search icd-10 codes/i)).toBeInTheDocument()
		expect(screen.getByText(/no icd-10 code selected/i)).toBeInTheDocument()
	})
})
