import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AnesthesiaRecordForm } from "./anesthesia-record-form"

const mockUseSaveAnesthesiaRecordMutation = vi.fn()
const mockUseSignAnesthesiaRecordMutation = vi.fn()

vi.mock("../api/surgical.hooks", () => ({
	useSaveAnesthesiaRecordMutation: (...args: unknown[]) =>
		mockUseSaveAnesthesiaRecordMutation(...args),
	useSignAnesthesiaRecordMutation: (...args: unknown[]) =>
		mockUseSignAnesthesiaRecordMutation(...args),
}))

describe("AnesthesiaRecordForm", () => {
	const saveMutateAsync = vi.fn()
	const signMutateAsync = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()

		mockUseSaveAnesthesiaRecordMutation.mockReturnValue({
			mutateAsync: saveMutateAsync,
			isPending: false,
			isError: false,
			error: null,
		})
		mockUseSignAnesthesiaRecordMutation.mockReturnValue({
			mutateAsync: signMutateAsync,
			isPending: false,
			isError: false,
			error: null,
		})
	})

	it("hydrates legacy agents into the medication table", () => {
		render(
			<AnesthesiaRecordForm
				caseId="case-1"
				canEdit
				canSign={false}
				existing={{
					id: "anes-1",
					surgicalCaseId: "case-1",
					asaClass: "ASA II",
					anesthesiaType: "general",
					airwayType: "oral_ett",
					airwayManagement: "Direct laryngoscopy with oral ETT secured at 21 cm.",
					intubationAttempts: 1,
					intubationGrade: "CL1",
					difficultAirway: false,
					agents: [{ name: "Propofol", dose: "2 mg/kg", route: "IV", time: "08:00" }],
					inductionAgents: null,
					maintenanceAgents: null,
					muscleRelaxants: null,
					intraopMedications: null,
					intraopVitals: null,
					reversalAgent: null,
					totalAnesthesiaMinutes: null,
					emergenceSmooth: null,
					complications: null,
					postAnesthesiaCareNotes: null,
					status: "draft",
					signedAt: null,
					signedByStaffId: null,
					createdAt: "2026-05-05T00:00:00.000Z",
					updatedAt: "2026-05-05T00:00:00.000Z",
				}}
			/>
		)

		expect(screen.getByDisplayValue("Propofol")).toBeInTheDocument()
		expect(screen.getByDisplayValue("2 mg/kg")).toBeInTheDocument()
		expect(screen.getByDisplayValue("IV")).toBeInTheDocument()
		expect(screen.getByDisplayValue("08:00")).toBeInTheDocument()
	})

	it("saves the current draft before signing and mirrors medications into legacy agents", async () => {
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
			<AnesthesiaRecordForm
				caseId="case-1"
				canEdit
				canSign
				existing={{
					id: "anes-1",
					surgicalCaseId: "case-1",
					asaClass: "ASA II",
					anesthesiaType: "general",
					airwayType: "oral_ett",
					airwayManagement: "Direct laryngoscopy with oral ETT secured at 21 cm.",
					intubationAttempts: 1,
					intubationGrade: "CL1",
					difficultAirway: false,
					agents: null,
					inductionAgents: null,
					maintenanceAgents: null,
					muscleRelaxants: null,
					intraopMedications: [
						{
							name: "Propofol",
							dose: "2 mg/kg",
							route: "IV",
							time: "08:00",
							indication: "Induction",
						},
					],
					intraopVitals: [{ time: "08:05", bp: "120/80", hr: 72, spo2: 99 }],
					reversalAgent: null,
					totalAnesthesiaMinutes: 90,
					emergenceSmooth: true,
					complications: null,
					postAnesthesiaCareNotes: null,
					status: "draft",
					signedAt: null,
					signedByStaffId: null,
					createdAt: "2026-05-05T00:00:00.000Z",
					updatedAt: "2026-05-05T00:00:00.000Z",
				}}
			/>
		)

		await user.click(screen.getByRole("button", { name: /sign anesthesia record/i }))
		await user.click(screen.getByRole("button", { name: /sign record/i }))

		await waitFor(() => {
			expect(saveMutateAsync).toHaveBeenCalledWith(
				expect.objectContaining({
					caseId: "case-1",
					anesthesiaType: "general",
					agents: [{ name: "Propofol", dose: "2 mg/kg", route: "IV", time: "08:00" }],
					intraopMedications: [
						expect.objectContaining({
							name: "Propofol",
							dose: "2 mg/kg",
							route: "IV",
							time: "08:00",
						}),
					],
				})
			)
		})

		await waitFor(() => {
			expect(signMutateAsync).toHaveBeenCalledWith({ caseId: "case-1" })
		})

		expect(callOrder).toEqual(["save", "sign"])
	})

	it("blocks signing until required anesthesia fields are complete", async () => {
		const user = userEvent.setup()

		render(
			<AnesthesiaRecordForm
				caseId="case-1"
				canEdit
				canSign
				existing={{
					id: "anes-1",
					surgicalCaseId: "case-1",
					asaClass: null,
					anesthesiaType: null,
					airwayType: null,
					airwayManagement: null,
					intubationAttempts: null,
					intubationGrade: null,
					difficultAirway: false,
					agents: null,
					inductionAgents: null,
					maintenanceAgents: null,
					muscleRelaxants: null,
					intraopMedications: null,
					intraopVitals: [],
					reversalAgent: null,
					totalAnesthesiaMinutes: null,
					emergenceSmooth: null,
					complications: null,
					postAnesthesiaCareNotes: null,
					status: "draft",
					signedAt: null,
					signedByStaffId: null,
					createdAt: "2026-05-05T00:00:00.000Z",
					updatedAt: "2026-05-05T00:00:00.000Z",
				}}
			/>
		)

		expect(screen.getByText(/complete these fields before signing/i)).toHaveTextContent(
			"anesthesia type"
		)
		expect(screen.getByText(/complete these fields before signing/i)).toHaveTextContent(
			"at least one complete intraoperative vital"
		)

		await user.click(screen.getByRole("button", { name: /save draft/i }))

		await waitFor(() => {
			expect(saveMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ caseId: "case-1" }))
		})
		expect(screen.getByRole("button", { name: /sign anesthesia record/i })).toBeDisabled()
		expect(signMutateAsync).not.toHaveBeenCalled()
	})
})
