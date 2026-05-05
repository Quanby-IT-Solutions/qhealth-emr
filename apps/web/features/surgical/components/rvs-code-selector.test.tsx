import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { RvsCodeSelector } from "./rvs-code-selector"

const mockUseRvsAssignmentsQuery = vi.fn()
const mockUseRvsCodeSearchQuery = vi.fn()
const mockUseSuggestRvsCodeMutation = vi.fn()
const mockUseUpdateRvsStatusMutation = vi.fn()
const mockUseRemoveRvsAssignmentMutation = vi.fn()

vi.mock("../api/surgical.hooks", () => ({
	useRvsAssignmentsQuery: (...args: unknown[]) => mockUseRvsAssignmentsQuery(...args),
	useRvsCodeSearchQuery: (...args: unknown[]) => mockUseRvsCodeSearchQuery(...args),
	useSuggestRvsCodeMutation: (...args: unknown[]) => mockUseSuggestRvsCodeMutation(...args),
	useUpdateRvsStatusMutation: (...args: unknown[]) => mockUseUpdateRvsStatusMutation(...args),
	useRemoveRvsAssignmentMutation: (...args: unknown[]) => mockUseRemoveRvsAssignmentMutation(...args),
}))

describe("RvsCodeSelector", () => {
	const suggestMutate = vi.fn()
	const updateMutate = vi.fn()
	const removeMutate = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()

		mockUseRvsAssignmentsQuery.mockReturnValue({
			data: [],
			isLoading: false,
		})
		mockUseRvsCodeSearchQuery.mockImplementation((search: string) => ({
			data:
				search.length >= 2
					? {
						data: [
							{
								id: "rvs-uuid-1",
								code: "47562",
								description: "Laparoscopic cholecystectomy",
								baseValue: 42,
								category: "surgery",
							},
						],
						total: 1,
						page: 1,
						limit: 20,
						totalPages: 1,
					}
					: undefined,
			isLoading: false,
		}))
		mockUseSuggestRvsCodeMutation.mockReturnValue({
			mutate: suggestMutate,
			isPending: false,
			variables: undefined,
		})
		mockUseUpdateRvsStatusMutation.mockReturnValue({
			mutate: updateMutate,
			isPending: false,
			variables: undefined,
		})
		mockUseRemoveRvsAssignmentMutation.mockReturnValue({
			mutate: removeMutate,
			isPending: false,
			variables: undefined,
		})
	})

	it("suggests using the RVS code UUID instead of the display code", async () => {
		render(
			<RvsCodeSelector
				caseId="case-1"
				operationRecord={{ procedurePerformed: "Laparoscopic cholecystectomy" }}
				canEdit
				canValidate={false}
				canFinalize={false}
				isOperationRecordSigned
			/>
		)

		fireEvent.change(screen.getByLabelText(/search rvs\/cpt codes/i), {
			target: { value: "47" },
		})
		await act(async () => {
			await new Promise(resolve => setTimeout(resolve, 350))
		})

		fireEvent.click(await screen.findByRole("button", { name: /suggest/i }))

		expect(suggestMutate).toHaveBeenCalledWith({
			caseId: "case-1",
			rvsCodeId: "rvs-uuid-1",
			procedureLabel: "Laparoscopic cholecystectomy",
			assignmentType: "primary",
		})
	})

	it("disables mutating actions until the operation record is signed", async () => {
		mockUseRvsAssignmentsQuery.mockReturnValue({
			data: [
				{
					id: "assignment-1",
					surgicalCaseId: "case-1",
					rvsCodeId: "rvs-uuid-1",
					procedureLabel: "Laparoscopic cholecystectomy",
					code: "47562",
					description: "Laparoscopic cholecystectomy",
					assignmentType: "primary",
					status: "suggested",
					suggestedByName: "Dr. Smith",
					validatedByName: null,
					finalizedByName: null,
					suggestedAt: "2026-05-05T00:00:00.000Z",
					validatedAt: null,
					finalizedAt: null,
					modifier: null,
					units: 1,
					createdAt: "2026-05-05T00:00:00.000Z",
				},
			],
			isLoading: false,
		})

		render(
			<RvsCodeSelector
				caseId="case-1"
				operationRecord={{ procedurePerformed: "Laparoscopic cholecystectomy" }}
				canEdit
				canValidate
				canFinalize
				isOperationRecordSigned={false}
			/>
		)

		expect(screen.getByText(/sign the operative record first/i)).toBeInTheDocument()
		expect(screen.getByRole("button", { name: /validate/i })).toBeDisabled()
		expect(screen.getByRole("button", { name: /remove 47562/i })).toBeDisabled()

		fireEvent.change(screen.getByLabelText(/search rvs\/cpt codes/i), {
			target: { value: "47" },
		})
		await act(async () => {
			await new Promise(resolve => setTimeout(resolve, 350))
		})

		await waitFor(() => {
			expect(screen.getByRole("button", { name: /suggest/i })).toBeDisabled()
		})
	})
})
