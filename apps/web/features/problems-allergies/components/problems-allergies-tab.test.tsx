import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ProblemsAllergiesTab } from "./problems-allergies-tab"

const mockUseProblemsQuery = vi.fn()
const mockUseAllergiesQuery = vi.fn()
const mockUseUpdateProblemMutation = vi.fn()
const mockUseMarkProblemEnteredInErrorMutation = vi.fn()
const mockUseDeactivateAllergyMutation = vi.fn()
const mockUseVerifyAllergyMutation = vi.fn()

vi.mock("@/features/problems-allergies/api/problems-allergies.hooks", () => ({
	useProblemsQuery: (...args: unknown[]) => mockUseProblemsQuery(...args),
	useAllergiesQuery: (...args: unknown[]) => mockUseAllergiesQuery(...args),
	useUpdateProblemMutation: (...args: unknown[]) => mockUseUpdateProblemMutation(...args),
	useMarkProblemEnteredInErrorMutation: (...args: unknown[]) =>
		mockUseMarkProblemEnteredInErrorMutation(...args),
	useDeactivateAllergyMutation: (...args: unknown[]) => mockUseDeactivateAllergyMutation(...args),
	useVerifyAllergyMutation: (...args: unknown[]) => mockUseVerifyAllergyMutation(...args),
}))

vi.mock("./add-problem-dialog", () => ({
	AddProblemDialog: () => null,
}))

vi.mock("./add-allergy-dialog", () => ({
	AddAllergyDialog: () => null,
}))

vi.mock("./edit-problem-dialog", () => ({
	EditProblemDialog: () => null,
}))

vi.mock("./edit-allergy-dialog", () => ({
	EditAllergyDialog: () => null,
}))

vi.mock("./resolve-problem-dialog", () => ({
	ResolveProblemDialog: () => null,
}))

function buildProblem(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: "problem-1",
		facilityId: "facility-1",
		patientId: "patient-1",
		icd10Code: "I10",
		icd10Display: "Essential (primary) hypertension",
		snomedCode: null,
		snomedDisplay: null,
		description: "Hypertension",
		onsetDate: "2026-01-01",
		resolutionDate: null,
		status: "active",
		documentingStaffId: "staff-1",
		documentingStaffName: "Dr. Test",
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
		...overrides,
	}
}

function buildAllergy(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: "allergy-1",
		facilityId: "facility-1",
		patientId: "patient-1",
		allergenName: "Penicillin",
		allergenType: "medication",
		reactionType: "Anaphylaxis",
		severity: "severe",
		onsetDate: "2026-01-01",
		isActive: true,
		isVerified: false,
		verifiedAt: null,
		verifiedByStaffId: null,
		verifiedByStaffName: null,
		documentingStaffId: "staff-1",
		documentingStaffName: "Dr. Test",
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
		...overrides,
	}
}

function mockEmptyProblems() {
	mockUseProblemsQuery.mockReturnValue({
		data: { data: [], total: 0, page: 1, limit: 50, totalPages: 0 },
		isLoading: false,
	})
}

function mockEmptyAllergies() {
	mockUseAllergiesQuery.mockReturnValue({
		data: { data: [], total: 0, page: 1, limit: 50, totalPages: 0 },
		isLoading: false,
	})
}

function mockProblemsWith(problems: ReturnType<typeof buildProblem>[]) {
	mockUseProblemsQuery.mockReturnValue({
		data: { data: problems, total: problems.length, page: 1, limit: 50, totalPages: 1 },
		isLoading: false,
	})
}

function mockAllergiesWith(allergies: ReturnType<typeof buildAllergy>[]) {
	mockUseAllergiesQuery.mockReturnValue({
		data: { data: allergies, total: allergies.length, page: 1, limit: 50, totalPages: 1 },
		isLoading: false,
	})
}

async function openAllergiesTab(user: ReturnType<typeof userEvent.setup>) {
	await user.click(screen.getByRole("tab", { name: /allergies/i }))
}

describe("ProblemsAllergiesTab", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockEmptyProblems()
		mockEmptyAllergies()
		mockUseUpdateProblemMutation.mockReturnValue({ mutate: vi.fn(), isPending: false })
		mockUseMarkProblemEnteredInErrorMutation.mockReturnValue({ mutate: vi.fn(), isPending: false })
		mockUseDeactivateAllergyMutation.mockReturnValue({ mutate: vi.fn(), isPending: false })
		mockUseVerifyAllergyMutation.mockReturnValue({ mutate: vi.fn(), isPending: false })
	})

	it("renders empty state for problems when none are returned", () => {
		render(<ProblemsAllergiesTab patientId="patient-1" facilityId="facility-1" canWrite />)
		expect(screen.getByText(/no active problems recorded\./i)).toBeInTheDocument()
	})

	it("renders empty state for allergies when none are returned", async () => {
		const user = userEvent.setup()
		render(<ProblemsAllergiesTab patientId="patient-1" facilityId="facility-1" canWrite />)
		await openAllergiesTab(user)

		expect(screen.getByText(/no active allergies documented\./i)).toBeInTheDocument()
	})

	it("hides add buttons when canWrite is false", () => {
		render(<ProblemsAllergiesTab patientId="patient-1" facilityId="facility-1" canWrite={false} />)
		expect(screen.queryByRole("button", { name: /add problem/i })).toBeNull()
		expect(screen.queryByRole("button", { name: /add allergy/i })).toBeNull()
	})

	it("shows add buttons when canWrite is true", async () => {
		const user = userEvent.setup()
		render(<ProblemsAllergiesTab patientId="patient-1" facilityId="facility-1" canWrite />)
		expect(screen.getByRole("button", { name: /add problem/i })).toBeInTheDocument()
		await openAllergiesTab(user)

		expect(screen.getByRole("button", { name: /add allergy/i })).toBeInTheDocument()
	})

	it("renders problem description and ICD-10 code in the row", () => {
		mockProblemsWith([buildProblem({ description: "Hypertension", icd10Code: "I10", status: "active" })])
		render(<ProblemsAllergiesTab patientId="patient-1" facilityId="facility-1" canWrite />)
		expect(screen.getAllByText("Hypertension").length).toBeGreaterThan(0)
		expect(screen.getAllByText("I10").length).toBeGreaterThan(0)
	})

	it("renders allergy name and severity badge", async () => {
		const user = userEvent.setup()
		mockAllergiesWith([
			buildAllergy({ allergenName: "Penicillin", allergenType: "medication", severity: "severe" }),
		])
		render(<ProblemsAllergiesTab patientId="patient-1" facilityId="facility-1" canWrite />)
		await openAllergiesTab(user)

		expect(screen.getAllByText("Penicillin").length).toBeGreaterThan(0)
		expect(screen.getAllByText("severe").length).toBeGreaterThan(0)
	})

	it("opens the deactivate allergy confirmation with the allergen name", async () => {
		const user = userEvent.setup()
		mockAllergiesWith([buildAllergy({ allergenName: "Penicillin" })])
		render(<ProblemsAllergiesTab patientId="patient-1" facilityId="facility-1" canWrite />)
		await openAllergiesTab(user)

		const [deactivateButton] = screen.getAllByRole("button", { name: /deactivate/i })
		await user.click(deactivateButton!)

		expect(screen.getByRole("alertdialog")).toBeInTheDocument()
		expect(
			screen.getByText(/removes penicillin from active cds allergy checks/i)
		).toBeInTheDocument()
	})

	it("opens the entered-in-error confirmation with the problem description", async () => {
		const user = userEvent.setup()
		mockProblemsWith([buildProblem({ description: "Hypertension" })])
		render(<ProblemsAllergiesTab patientId="patient-1" facilityId="facility-1" canWrite />)

		const [enteredInErrorButton] = screen.getAllByRole("button", { name: /entered in error/i })
		await user.click(enteredInErrorButton!)

		expect(screen.getByRole("alertdialog")).toBeInTheDocument()
		expect(
			screen.getByText(/hides hypertension from active and resolved clinical lists/i)
		).toBeInTheDocument()
	})

	it("renders an Unverified badge for unverified allergies and exposes a Verify action", async () => {
		const user = userEvent.setup()
		const mutate = vi.fn()
		mockUseVerifyAllergyMutation.mockReturnValue({ mutate, isPending: false })
		mockAllergiesWith([buildAllergy({ id: "allergy-unverified", isVerified: false })])
		render(<ProblemsAllergiesTab patientId="patient-1" facilityId="facility-1" canWrite />)
		await openAllergiesTab(user)

		expect(screen.getAllByText(/unverified/i).length).toBeGreaterThan(0)
		expect(
			screen.getByText(/unverified allergies are visible in the chart but do not block/i)
		).toBeInTheDocument()

		const [verifyButton] = screen.getAllByRole("button", { name: /^verify$/i })
		await user.click(verifyButton!)
		expect(mutate).toHaveBeenCalledWith("allergy-unverified")
	})

	it("renders a Verified badge and no Verify action when the allergy is already verified", async () => {
		const user = userEvent.setup()
		mockAllergiesWith([
			buildAllergy({
				id: "allergy-verified",
				isVerified: true,
				verifiedAt: "2026-02-01T00:00:00.000Z",
				verifiedByStaffId: "staff-1",
				verifiedByStaffName: "Dr. Test",
			}),
		])
		render(<ProblemsAllergiesTab patientId="patient-1" facilityId="facility-1" canWrite />)
		await openAllergiesTab(user)

		expect(screen.getAllByText(/^verified$/i).length).toBeGreaterThan(0)
		expect(screen.queryByRole("button", { name: /^verify$/i })).toBeNull()
	})

	it("queries resolved problems when the Resolved tab is selected", async () => {
		const user = userEvent.setup()
		render(<ProblemsAllergiesTab patientId="patient-1" facilityId="facility-1" canWrite />)

		mockUseProblemsQuery.mockClear()
		await user.click(screen.getByRole("tab", { name: /resolved/i }))

		const calledWithResolved = mockUseProblemsQuery.mock.calls.some(call =>
			call[0]?.status === "resolved"
		)
		expect(calledWithResolved).toBe(true)
	})

	it("queries entered-in-error problems when the Entered in Error tab is selected", async () => {
		const user = userEvent.setup()
		render(<ProblemsAllergiesTab patientId="patient-1" facilityId="facility-1" canWrite />)

		mockUseProblemsQuery.mockClear()
		await user.click(screen.getByRole("tab", { name: /entered in error/i }))

		const calledWithEnteredInError = mockUseProblemsQuery.mock.calls.some(
			call => call[0]?.status === "entered_in_error"
		)
		expect(calledWithEnteredInError).toBe(true)
	})

	it("shows entered-in-error problems as audit-only records without edit actions", () => {
		mockProblemsWith([
			buildProblem({
				description: "Incorrect diagnosis",
				status: "entered_in_error",
				resolutionDate: "2026-05-28",
			}),
		])

		render(<ProblemsAllergiesTab patientId="patient-1" facilityId="facility-1" canWrite />)

		expect(screen.getAllByText(/audit only/i).length).toBeGreaterThan(0)
		expect(screen.queryByRole("button", { name: /^edit$/i })).toBeNull()
		expect(screen.queryByRole("button", { name: /^resolve$/i })).toBeNull()
	})
})
