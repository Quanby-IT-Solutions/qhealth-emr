import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { FpeEditorFlow } from "./fpe-editor-flow"
import { getFpeValidation } from "./fpe-validation"
import { EMPTY_FPE_DATA } from "./fpe-template"

const mockUseCreateNoteMutation = vi.fn()
const mockUseUpdateNoteMutation = vi.fn()
const mockUseSubmitFpeMutation = vi.fn()
const mockUseRecordKonsultaVisitMutation = vi.fn()

vi.mock("@/features/clinical-docs/api/clinical-docs.hooks", () => ({
	useCreateNoteMutation: (...args: unknown[]) => mockUseCreateNoteMutation(...args),
	useUpdateNoteMutation: (...args: unknown[]) => mockUseUpdateNoteMutation(...args),
	useSubmitFpeMutation: (...args: unknown[]) => mockUseSubmitFpeMutation(...args),
}))

vi.mock("@/features/billing/api/billing.hooks", () => ({
	useRecordKonsultaVisitMutation: (...args: unknown[]) =>
		mockUseRecordKonsultaVisitMutation(...args),
}))

describe("FpeEditorFlow", () => {
	const createMutate = vi.fn()
	const updateMutate = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()

		mockUseCreateNoteMutation.mockReturnValue({
			mutate: createMutate,
			isPending: false,
		})
		mockUseUpdateNoteMutation.mockReturnValue({
			mutate: updateMutate,
			isPending: false,
		})
		mockUseSubmitFpeMutation.mockReturnValue({
			mutate: vi.fn(),
			isPending: false,
			isError: false,
			error: null,
		})
		mockUseRecordKonsultaVisitMutation.mockReturnValue({
			mutate: vi.fn(),
			isPending: false,
		})

		createMutate.mockImplementation((_payload, options) => {
			options?.onSuccess?.({ id: "fpe-note-1" })
		})
		updateMutate.mockImplementation((_payload, options) => {
			options?.onSuccess?.({ id: "fpe-note-1" })
		})
	})

	it("uses one validation result for draft and review requirements", () => {
		const validation = getFpeValidation(EMPTY_FPE_DATA)

		expect(validation.canSaveDraft).toBe(false)
		expect(validation.draftMissingFields).toEqual(["Primary Diagnosis Code"])
		expect(validation.canReview).toBe(false)
		expect(validation.submitMissingFields).toEqual(
			expect.arrayContaining([
				"Chief Complaint",
				"Blood Pressure",
				"Weight",
				"Height",
				"Primary Diagnosis Code",
				"Primary Diagnosis Description",
				"History of Present Illness",
				"Physical Exam (General)",
			])
		)
	})

	it("allows draft save with the minimum field but blocks review until complete and saved", async () => {
		const user = userEvent.setup()

		render(
			<FpeEditorFlow
				encounterId="enc-1"
				facilityId="fac-1"
				patientId="pat-1"
				onBack={vi.fn()}
				onDone={vi.fn()}
			/>
		)

		expect(screen.getByRole("button", { name: /save draft/i })).toBeDisabled()
		expect(screen.getByRole("button", { name: /review & submit/i })).toBeDisabled()

		await user.type(screen.getByPlaceholderText(/icd-10 code/i), "j18.9")
		await user.click(screen.getByRole("button", { name: /save draft/i }))

		await waitFor(() => {
			expect(createMutate).toHaveBeenCalledWith(
				expect.objectContaining({ noteType: "fpe" }),
				expect.any(Object)
			)
		})
		expect(screen.getByRole("button", { name: /review & submit/i })).toBeDisabled()
		expect(screen.getByText(/fix these fields before review & submit/i)).toHaveTextContent(
			"Chief Complaint"
		)

		await user.type(screen.getByPlaceholderText(/patient's primary reason/i), "Cough")
		await user.type(screen.getByPlaceholderText(/onset, duration/i), "Three days")
		await user.type(screen.getByPlaceholderText("mmHg"), "120/80")
		await user.type(screen.getByPlaceholderText("kg"), "65")
		await user.type(screen.getByPlaceholderText("cm"), "170")
		await user.type(screen.getByPlaceholderText(/diagnosis description/i), "Pneumonia")
		await user.type(screen.getByPlaceholderText(/general findings/i), "Awake, not in distress")

		expect(screen.getByText(/save draft changes before review & submit/i)).toBeInTheDocument()
		expect(screen.getByRole("button", { name: /review & submit/i })).toBeDisabled()

		await user.click(screen.getByRole("button", { name: /save draft changes/i }))

		await waitFor(() => {
			expect(updateMutate).toHaveBeenCalledWith(
				expect.objectContaining({ id: "fpe-note-1" }),
				expect.any(Object)
			)
		})
		expect(screen.getByRole("button", { name: /review & submit/i })).toBeEnabled()
	})

	it("sanitizes FPE numeric, ICD-10, and clinical text inputs while typing", async () => {
		const user = userEvent.setup()

		render(
			<FpeEditorFlow
				encounterId="enc-1"
				facilityId="fac-1"
				patientId="pat-1"
				onBack={vi.fn()}
				onDone={vi.fn()}
			/>
		)

		await user.type(screen.getByPlaceholderText(/icd-10 code/i), "j18.$9")
		expect(screen.getByPlaceholderText(/icd-10 code/i)).toHaveValue("J18.9")

		await user.type(screen.getByPlaceholderText("mmHg"), "120/80abc")
		expect(screen.getByPlaceholderText("mmHg")).toHaveValue("120/80")

		await user.type(screen.getByPlaceholderText("bpm"), "7a2")
		expect(screen.getByPlaceholderText("bpm")).toHaveValue("72")

		await user.type(screen.getByPlaceholderText("kg"), "65.456")
		expect(screen.getByPlaceholderText("kg")).toHaveValue("65.45")

		await user.type(screen.getByPlaceholderText(/patient's primary reason/i), "Cough <script>|")
		expect(screen.getByPlaceholderText(/patient's primary reason/i)).toHaveValue("Cough script")
	})

	it("blocks save and review when formatted fields are invalid", async () => {
		const invalidData = {
			...EMPTY_FPE_DATA,
			primaryDiagnosis: { code: "J1", description: "Pneumonia" },
			chiefComplaint: "Cough",
			historyOfPresentIllness: "Three days",
			physicalExamGeneral: "Awake",
			vitalSigns: {
				...EMPTY_FPE_DATA.vitalSigns,
				bloodPressure: "12080",
				weight: "65",
				height: "170",
			},
		}

		const validation = getFpeValidation(invalidData)

		expect(validation.canSaveDraft).toBe(false)
		expect(validation.canReview).toBe(false)
		expect(validation.fieldErrors["primaryDiagnosis.code"]).toMatch(/ICD-10 format/i)
		expect(validation.fieldErrors["vitalSigns.bloodPressure"]).toMatch(/systolic\/diastolic/i)
	})
})
