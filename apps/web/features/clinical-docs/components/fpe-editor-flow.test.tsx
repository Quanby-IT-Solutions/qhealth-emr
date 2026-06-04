import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { FpeEditorFlow } from "./fpe-editor-flow"
import { EMPTY_FPE_DATA } from "./fpe-template"
import { getFpeValidation } from "./fpe-validation"

const mockUseCreateNoteMutation = vi.fn()
const mockUseUpdateNoteMutation = vi.fn()
const mockUseSubmitFpeMutation = vi.fn()

vi.mock("@/features/clinical-docs/api/clinical-docs.hooks", () => ({
	useCreateNoteMutation: (...args: unknown[]) => mockUseCreateNoteMutation(...args),
	useUpdateNoteMutation: (...args: unknown[]) => mockUseUpdateNoteMutation(...args),
	useSubmitFpeMutation: (...args: unknown[]) => mockUseSubmitFpeMutation(...args),
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
				"Lifestyle / Social History",
				"Mental Health Screening",
				"History of Present Illness",
				"Physical Exam (General)",
			])
		)
	})

	it("allows draft save with the minimum field but blocks review until complete and saved", async () => {
		const user = userEvent.setup()

		render(
			<FpeEditorFlow encounterId="enc-1" facilityId="fac-1" onBack={vi.fn()} onDone={vi.fn()} />
		)

		expect(screen.getByRole("button", { name: /save draft/i })).toBeDisabled()
		expect(screen.getByRole("button", { name: /review & submit/i })).toBeDisabled()

		fireEvent.change(screen.getByPlaceholderText(/icd-10 code/i), {
			target: { value: "j18.9" },
		})
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

		fireEvent.change(screen.getByPlaceholderText(/patient's primary reason/i), {
			target: { value: "Cough" },
		})
		fireEvent.change(screen.getByPlaceholderText(/onset, duration/i), {
			target: { value: "Three days" },
		})
		fireEvent.change(screen.getByPlaceholderText("mmHg"), {
			target: { value: "120/80" },
		})
		fireEvent.change(screen.getByPlaceholderText("kg"), {
			target: { value: "65" },
		})
		fireEvent.change(screen.getByPlaceholderText("cm"), {
			target: { value: "170" },
		})
		fireEvent.change(screen.getByPlaceholderText(/diagnosis description/i), {
			target: { value: "Pneumonia" },
		})
		fireEvent.change(screen.getByPlaceholderText(/smoking, alcohol use/i), {
			target: { value: "No smoking or alcohol use" },
		})
		fireEvent.change(screen.getByPlaceholderText(/mood, sleep/i), {
			target: { value: "No mood concerns or self-harm risk" },
		})
		fireEvent.change(screen.getByPlaceholderText(/general findings/i), {
			target: { value: "Awake, not in distress" },
		})

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
		render(
			<FpeEditorFlow encounterId="enc-1" facilityId="fac-1" onBack={vi.fn()} onDone={vi.fn()} />
		)

		fireEvent.change(screen.getByPlaceholderText(/icd-10 code/i), {
			target: { value: "j18.$9" },
		})
		expect(screen.getByPlaceholderText(/icd-10 code/i)).toHaveValue("J18.9")

		fireEvent.change(screen.getByPlaceholderText("mmHg"), {
			target: { value: "120/80abc" },
		})
		expect(screen.getByPlaceholderText("mmHg")).toHaveValue("120/80")

		fireEvent.change(screen.getByPlaceholderText("bpm"), {
			target: { value: "7a2" },
		})
		expect(screen.getByPlaceholderText("bpm")).toHaveValue("72")

		fireEvent.change(screen.getByPlaceholderText("kg"), {
			target: { value: "65.456" },
		})
		expect(screen.getByPlaceholderText("kg")).toHaveValue("65.45")

		fireEvent.change(screen.getByPlaceholderText(/patient's primary reason/i), {
			target: { value: "Cough <script>|" },
		})
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
