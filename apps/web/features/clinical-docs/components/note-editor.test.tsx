import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { NoteEditor } from "./note-editor"
import type { AuthoringTemplate } from "./template-selector-page"

const mockUseCreateNoteMutation = vi.fn()
const mockUseUpdateNoteMutation = vi.fn()
const mockUseNoteContextQuery = vi.fn()
const mockUseIcd10ProblemSearchQuery = vi.fn()

vi.mock("@/features/clinical-docs/api/clinical-docs.hooks", () => ({
	useCreateNoteMutation: (...args: unknown[]) => mockUseCreateNoteMutation(...args),
	useUpdateNoteMutation: (...args: unknown[]) => mockUseUpdateNoteMutation(...args),
	useNoteContextQuery: (...args: unknown[]) => mockUseNoteContextQuery(...args),
}))

vi.mock("@/features/problems-allergies/api/problems-allergies.hooks", () => ({
	useIcd10ProblemSearchQuery: (...args: unknown[]) => mockUseIcd10ProblemSearchQuery(...args),
}))

const template: AuthoringTemplate = {
	id: "tpl-1",
	name: "Progress Note",
	category: "progress",
	isFacilityTemplate: false,
	sections: [
		{ key: "assessment", label: "Assessment", type: "structured" },
		{ key: "plan", label: "Plan", type: "structured" },
	],
}

describe("NoteEditor", () => {
	const createMutate = vi.fn()
	const updateMutate = vi.fn()

	beforeEach(() => {
		vi.useRealTimers()
		vi.clearAllMocks()

		mockUseCreateNoteMutation.mockReturnValue({
			mutate: createMutate,
			isPending: false,
			error: null,
		})
		mockUseUpdateNoteMutation.mockReturnValue({
			mutate: updateMutate,
			isPending: false,
			error: null,
		})
		mockUseNoteContextQuery.mockReturnValue({
			data: null,
			isLoading: false,
		})
		mockUseIcd10ProblemSearchQuery.mockReturnValue({
			data: { data: [] },
			isFetching: false,
		})

		createMutate.mockImplementation((_payload, options) => {
			options?.onSuccess?.({ id: "note-1" })
			options?.onSettled?.()
		})
		updateMutate.mockImplementation((_payload, options) => {
			options?.onSuccess?.({ id: "note-1" })
		})
	})

	it("requires Assessment and Plan before saving the first draft", () => {
		render(
			<NoteEditor
				encounterId="enc-1"
				facilityId="fac-1"
				template={template}
				onBack={vi.fn()}
				onDone={vi.fn()}
			/>
		)

		expect(screen.getByRole("button", { name: /save draft/i })).toBeDisabled()
		expect(screen.getByText(/complete assessment and plan/i)).toBeInTheDocument()
		expect(screen.getByText(/assessment is required/i)).toBeInTheDocument()
		expect(screen.getByText(/plan is required/i)).toBeInTheDocument()
	})

	it("shows Saved after the first successful draft save", async () => {
		const user = userEvent.setup()

		render(
			<NoteEditor
				encounterId="enc-1"
				facilityId="fac-1"
				template={template}
				onBack={vi.fn()}
				onDone={vi.fn()}
			/>
		)

		await user.type(screen.getByLabelText("Assessment"), "Stable")
		await user.type(screen.getByLabelText("Plan"), "Follow up")
		await user.click(screen.getByRole("button", { name: /save draft/i }))

		await waitFor(() => {
			expect(createMutate).toHaveBeenCalledWith(
				expect.objectContaining({ encounterId: "enc-1", facilityId: "fac-1" }),
				expect.any(Object)
			)
		})
		expect(screen.getByRole("button", { name: /^saved$/i })).toBeDisabled()
		expect(screen.queryByRole("button", { name: /^save$/i })).not.toBeInTheDocument()
	})

	it("enables Save Changes after editing a saved note and autosaves it", async () => {
		const user = userEvent.setup()

		render(
			<NoteEditor
				encounterId="enc-1"
				facilityId="fac-1"
				template={template}
				onBack={vi.fn()}
				onDone={vi.fn()}
			/>
		)

		await user.type(screen.getByLabelText("Assessment"), "Stable")
		await user.type(screen.getByLabelText("Plan"), "Follow up")
		await user.click(screen.getByRole("button", { name: /save draft/i }))
		await user.type(screen.getByLabelText("Plan"), " tomorrow")

		expect(screen.getByRole("button", { name: /save changes/i })).toBeEnabled()

		await waitFor(() => {
			expect(updateMutate).toHaveBeenCalledWith(
				expect.objectContaining({ id: "note-1" }),
				expect.any(Object)
			)
		}, { timeout: 2500 })
		await waitFor(() => {
			expect(screen.getByRole("button", { name: /^saved$/i })).toBeDisabled()
		})
	})

	it("prevents duplicate chart context inserts", async () => {
		const user = userEvent.setup()
		const templateWithContextTargets: AuthoringTemplate = {
			...template,
			sections: [
				{ key: "subjective", label: "Subjective", type: "structured" },
				{ key: "objective", label: "Objective", type: "structured" },
				{ key: "assessment", label: "Assessment", type: "structured" },
				{ key: "plan", label: "Plan", type: "structured" },
			],
		}

		mockUseNoteContextQuery.mockReturnValue({
			isLoading: false,
			data: {
				encounterId: "enc-1",
				patientId: "pat-1",
				latestVitals: {
					id: "vital-1",
					temperature: "38.1",
					bpSystolic: 120,
					bpDiastolic: 80,
					heartRate: 88,
					respiratoryRate: 18,
					spo2: "98",
					painScore: 2,
					weight: null,
					height: null,
					newsScore: null,
					newsRiskLevel: null,
					recordedAt: "2026-05-14T08:00:00.000Z",
				},
				activeAllergies: [
					{
						id: "allergy-1",
						allergenName: "Penicillin",
						allergenType: "medication",
						reactionType: "rash",
						severity: "moderate",
						onsetDate: null,
					},
				],
				recentLabs: [
					{
						id: "lab-1",
						testName: "CBC",
						panelName: null,
						status: "resulted",
						resultedDatetime: "2026-05-14T08:30:00.000Z",
						results: { items: [{ testName: "WBC", value: "8.2", unit: "10^9/L" }] },
					},
				],
			},
		})

		render(
			<NoteEditor
				encounterId="enc-1"
				facilityId="fac-1"
				template={templateWithContextTargets}
				onBack={vi.fn()}
				onDone={vi.fn()}
			/>
		)

		await user.click(screen.getByRole("button", { name: /insert vitals into objective/i }))
		await user.click(screen.getByRole("button", { name: /insert allergies into subjective/i }))
		await user.click(screen.getByRole("button", { name: /insert labs into objective/i }))

		expect(screen.getByRole("button", { name: /insert vitals into objective/i })).toBeDisabled()
		expect(screen.getByRole("button", { name: /insert allergies into subjective/i })).toBeDisabled()
		expect(screen.getByRole("button", { name: /insert labs into objective/i })).toBeDisabled()

		const objective = screen.getByLabelText("Objective")
		const subjective = screen.getByLabelText("Subjective")

		expect((objective as HTMLTextAreaElement).value.match(/Vitals/g)).toHaveLength(1)
		expect((objective as HTMLTextAreaElement).value.match(/Recent labs/g)).toHaveLength(1)
		expect((subjective as HTMLTextAreaElement).value.match(/Active allergies/g)).toHaveLength(1)
	})
})
