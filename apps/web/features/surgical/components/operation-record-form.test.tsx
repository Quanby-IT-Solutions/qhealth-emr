import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { OperationRecordForm } from "./operation-record-form"

const mockUseSaveOperationRecordMutation = vi.fn()
const mockUseSignOperationRecordMutation = vi.fn()
const mockUseListCliniciansQuery = vi.fn()

vi.mock("../api/surgical.hooks", () => ({
	useSaveOperationRecordMutation: (...args: unknown[]) => mockUseSaveOperationRecordMutation(...args),
	useSignOperationRecordMutation: (...args: unknown[]) => mockUseSignOperationRecordMutation(...args),
}))

vi.mock("@/features/patients/api/patients.hooks", () => ({
	useListCliniciansQuery: (...args: unknown[]) => mockUseListCliniciansQuery(...args),
}))

describe("OperationRecordForm", () => {
	const saveMutateAsync = vi.fn()
	const signMutateAsync = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()

		mockUseSaveOperationRecordMutation.mockReturnValue({
			mutateAsync: saveMutateAsync,
			isPending: false,
			isError: false,
			error: null,
		})
		mockUseSignOperationRecordMutation.mockReturnValue({
			mutateAsync: signMutateAsync,
			isPending: false,
			isError: false,
			error: null,
		})
		mockUseListCliniciansQuery.mockReturnValue({
			data: {
				data: [
					{
						staffProfileId: "surgeon-1",
						name: "Dr. Eduardo Lim",
						department: "Surgery",
					},
					{
						staffProfileId: "scrub-1",
						name: "Nurse Ana Reyes",
						department: "Ward Nursing",
					},
					{
						staffProfileId: "anes-1",
						name: "Dr. Rosario Tan",
						department: "Anesthesiology",
					},
				],
			},
			isLoading: false,
		})
	})

	it("saves the draft before signing and includes the new narrative fields", async () => {
		const user = userEvent.setup()
		const callOrder: string[] = []

		saveMutateAsync.mockImplementation(async (payload: unknown) => {
			callOrder.push("save")
			return payload
		})
		signMutateAsync.mockImplementation(async (payload: unknown) => {
			callOrder.push("sign")
			return payload
		})

		render(
			<OperationRecordForm
				caseId="case-1"
				facilityId="facility-1"
				surgeonStaffId="surgeon-1"
				defaultAnesthesiologistStaffId="anes-1"
				canEdit
				canSign
				existing={{
					id: "op-1",
					surgicalCaseId: "case-1",
					preOpDiagnosis: "Acute appendicitis",
					postOpDiagnosis: "Acute appendicitis",
					procedurePerformed: "Appendectomy",
					procedureDescription: "Laparoscopic appendectomy with irrigation",
					operativeTechnique: "Pneumoperitoneum established, appendix isolated and transected.",
					findings: null,
					specimens: null,
					estimatedBloodLoss: null,
					fluidIn: null,
					fluidOut: null,
					incisionDatetime: "2026-05-05T01:00:00.000Z",
					closureDatetime: "2026-05-05T02:00:00.000Z",
					surgeonStaffId: "surgeon-1",
					firstAssistantStaffId: null,
					secondAssistantStaffId: null,
					scrubNurseStaffId: "scrub-1",
					circulatingNurseStaffId: "circ-1",
					anesthesiologistStaffId: "anes-1",
					instrumentCountCorrect: true,
					swabCountCorrect: true,
					complications: null,
					status: "draft",
					signedAt: null,
					signedByStaffId: null,
					signedByName: null,
					createdAt: "2026-05-05T00:00:00.000Z",
					updatedAt: "2026-05-05T00:00:00.000Z",
				}}
			/>
		)

		await user.click(screen.getByRole("button", { name: /sign operation record/i }))

		await waitFor(() => {
			expect(saveMutateAsync).toHaveBeenCalledWith(
				expect.objectContaining({
					caseId: "case-1",
					surgeonStaffId: "surgeon-1",
					preOpDiagnosis: "Acute appendicitis",
					procedurePerformed: "Appendectomy",
					procedureDescription: "Laparoscopic appendectomy with irrigation",
					anesthesiologistStaffId: "anes-1",
				})
			)
		})

		await waitFor(() => {
			expect(signMutateAsync).toHaveBeenCalledWith({ caseId: "case-1" })
		})

		expect(callOrder).toEqual(["save", "sign"])
	})

	it("searches and stores selected OR personnel by staff profile id", async () => {
		const user = userEvent.setup()
		saveMutateAsync.mockResolvedValue({})

		render(
			<OperationRecordForm
				caseId="case-1"
				facilityId="facility-1"
				surgeonStaffId="surgeon-1"
				defaultAnesthesiologistStaffId="anes-1"
				canEdit
				existing={null}
			/>
		)

		await user.type(screen.getByPlaceholderText("Pre-op diagnosis"), "Symptomatic cholelithiasis")
		await user.type(
			screen.getByPlaceholderText("List each performed procedure on its own line for RVS mapping."),
			"Laparoscopic cholecystectomy"
		)
		await user.type(screen.getByTestId("scrub-nurse"), "ana")
		await user.click(screen.getByRole("button", { name: /nurse ana reyes/i }))

		await user.click(screen.getByRole("button", { name: /save operation record/i }))

		await waitFor(() => {
			expect(saveMutateAsync).toHaveBeenCalledWith(
				expect.objectContaining({
					scrubNurseStaffId: "scrub-1",
					anesthesiologistStaffId: "anes-1",
				})
			)
		})
	})
})
