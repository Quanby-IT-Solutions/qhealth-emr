import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { CreateMedOrderDialog } from "./create-med-order-dialog"

const mockUseEvaluateCdsMutation = vi.fn()
const mockUseCreateMedOrderMutation = vi.fn()
const mockUseCreateTranchedOrdersMutation = vi.fn()
const mockUseCheckPdeaLicenseQuery = vi.fn()
const mockUseCreateHighAlertVerificationMutation = vi.fn()
const mockUseMyProfile = vi.fn()
const mockUseFormularyItemsQuery = vi.fn()

vi.mock("@/features/orders/api/orders.hooks", () => ({
	useEvaluateCdsMutation: (...args: unknown[]) => mockUseEvaluateCdsMutation(...args),
	useCreateMedOrderMutation: (...args: unknown[]) => mockUseCreateMedOrderMutation(...args),
	useCreateTranchedOrdersMutation: (...args: unknown[]) => mockUseCreateTranchedOrdersMutation(...args),
	useCheckPdeaLicenseQuery: (...args: unknown[]) => mockUseCheckPdeaLicenseQuery(...args),
	useCreateHighAlertVerificationMutation: (...args: unknown[]) =>
		mockUseCreateHighAlertVerificationMutation(...args),
}))

vi.mock("@/features/app-shell/api/rbac.hooks", () => ({
	useMyProfile: (...args: unknown[]) => mockUseMyProfile(...args),
}))

vi.mock("@/features/formulary/api/formulary.hooks", () => ({
	useFormularyItemsQuery: (...args: unknown[]) => mockUseFormularyItemsQuery(...args),
}))

interface MockSelectChildProps {
	id?: string
	children?: React.ReactNode
	value?: string
}

vi.mock("@/core/components/ui/select", async () => {
	const React = await import("react")

	const SelectTrigger = (_props: MockSelectChildProps) => null
	SelectTrigger.displayName = "MockSelectTrigger"
	const SelectValue = (_props: MockSelectChildProps) => null
	SelectValue.displayName = "MockSelectValue"
	const SelectContent = (_props: MockSelectChildProps) => null
	SelectContent.displayName = "MockSelectContent"
	const SelectItem = (_props: MockSelectChildProps) => null
	SelectItem.displayName = "MockSelectItem"

	function Select({
		children,
		value,
		onValueChange,
	}: {
		children?: React.ReactNode
		value?: string
		onValueChange?: (next: string) => void
	}) {
		let triggerId: string | undefined
		const options: Array<{ value: string; label: React.ReactNode }> = []

		React.Children.forEach(children, (child: unknown) => {
			if (!React.isValidElement(child)) return
			const childProps = child.props as MockSelectChildProps
			if (child.type === SelectTrigger) {
				triggerId = childProps.id
			}
			if (child.type === SelectContent) {
				React.Children.forEach(childProps.children, (item: unknown) => {
					if (!React.isValidElement(item) || item.type !== SelectItem) return
					const itemProps = item.props as MockSelectChildProps
					options.push({ value: itemProps.value ?? "", label: itemProps.children })
				})
			}
		})

		return (
			<select
				id={triggerId}
				value={value ?? ""}
				onChange={e => onValueChange?.(e.target.value)}
			>
				<option value="" disabled>
					Select…
				</option>
				{options.map(o => (
					<option key={o.value} value={o.value}>
						{typeof o.label === "string" ? o.label : o.value}
					</option>
				))}
			</select>
		)
	}

	return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
})

vi.mock("@/features/orders/components/drug-search-combobox", () => ({
	DrugSearchCombobox: ({
		id,
		value,
		onRawInput,
		placeholder,
	}: {
		id?: string
		value: string
		onRawInput: (next: string) => void
		placeholder: string
	}) => (
		<input
			id={id}
			value={value}
			onChange={e => onRawInput(e.target.value)}
			placeholder={placeholder}
			data-testid="generic-name-input"
		/>
	),
}))

vi.mock("./s2-validation-modal", () => ({
	S2ValidationModal: ({
		open,
		onProceed,
		onOpenChange,
	}: {
		open: boolean
		onProceed: () => void
		onOpenChange: (open: boolean) => void
	}) =>
		open ? (
			<div data-testid="s2-validation-modal">
				<button
					type="button"
					data-testid="s2-proceed"
					onClick={() => {
						onProceed()
						onOpenChange(false)
					}}
				>
					S2 Proceed
				</button>
			</div>
		) : null,
}))

vi.mock("./tranching-preview-modal", () => ({
	TranchingPreviewModal: ({
		open,
		onConfirm,
	}: {
		open: boolean
		onConfirm: (tranches: Array<{ startDate: Date }>) => void
	}) =>
		open ? (
			<button
				type="button"
				data-testid="confirm-tranches"
				onClick={() => onConfirm([{ startDate: new Date("2026-05-17T00:00:00.000Z") }])}
			>
				Confirm Tranches
			</button>
		) : null,
}))

vi.mock("./high-alert-verification-dialog", () => ({
	HighAlertVerificationDialog: () => null,
}))

interface MockAllergyAlert {
	id: string
	allergenName: string
	blockType: "hard_block" | "soft_block"
}

vi.mock("./allergy-alert-banner", () => ({
	AllergyAlertBanner: ({
		alerts,
		onOverride,
	}: {
		alerts: MockAllergyAlert[]
		onOverride?: (id: string, reason: string) => void
	}) => (
		<div data-testid="allergy-alert-banner">
			{alerts.map(alert => (
				<div key={alert.id} data-testid={`allergy-alert-${alert.id}`}>
					<span>
						{alert.allergenName} {alert.blockType}
					</span>
					{alert.blockType === "soft_block" && (
						<button
							type="button"
							onClick={() => onOverride?.(alert.id, "Clinically necessary")}
						>
							Override {alert.id}
						</button>
					)}
				</div>
			))}
		</div>
	),
}))

interface MockCdsAlert {
	id: string
	severity: "hard_block" | "soft_block" | "warning" | "high_alert"
	message: string
}

vi.mock("./cds-alert-banner", () => ({
	CdsAlertBanner: ({ alerts }: { alerts: MockCdsAlert[] }) => (
		<div data-testid="cds-alert-banner">
			{alerts.map(alert => (
				<div key={alert.id} data-testid={`cds-alert-${alert.id}`}>
					<span data-testid={`cds-alert-${alert.id}-severity`}>{alert.severity}</span>
					<span>{alert.message}</span>
				</div>
			))}
		</div>
	),
}))

interface EvaluateCdsAlert {
	type: string
	severity: string
	message: string
	details?: Record<string, unknown>
}

interface EvaluateCdsResult {
	alerts: EvaluateCdsAlert[]
	canProceed: boolean
	requiresOverride: boolean
	requiresDoubleVerification: boolean
}

function setCdsEvaluateResult(result: EvaluateCdsResult) {
	mockUseEvaluateCdsMutation.mockReturnValue({
		mutate: (
			_input: unknown,
			opts?: { onSuccess?: (data: EvaluateCdsResult) => void }
		) => {
			opts?.onSuccess?.(result)
		},
		isPending: false,
	})
}

function setCdsEvaluateError(error: Error) {
	mockUseEvaluateCdsMutation.mockReturnValue({
		mutate: (_input: unknown, opts?: { onError?: (error: Error) => void }) => {
			opts?.onError?.(error)
		},
		isPending: false,
	})
}

const defaultProps = {
	open: true,
	onOpenChange: () => {},
	encounterId: "enc-1",
	facilityId: "facility-1",
	patientId: "patient-1",
	orderingStaffId: "staff-1",
}

describe("CreateMedOrderDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockUseMyProfile.mockReturnValue({
			data: {
				activeRole: { permissions: [{ module: "orders", action: "create" }] },
				staffProfiles: [
					{
						id: "staff-1",
						facilityId: "facility-1",
						prcLicenseNumber: "PRC-1",
						ptrNumber: "PTR-1",
						prcExpiry: "2027-01-01",
						ptrExpiry: "2027-01-01",
						pdeaS2License: null,
						pdeaS2Expiry: null,
					},
				],
				user: { name: "Dr. Test" },
			},
		})
		mockUseFormularyItemsQuery.mockReturnValue({ data: { data: [] }, isLoading: false })
		mockUseCheckPdeaLicenseQuery.mockReturnValue({
			data: undefined,
			isLoading: false,
			isSuccess: true,
			isError: false,
		})
		mockUseCreateMedOrderMutation.mockReturnValue({ mutate: vi.fn(), isPending: false })
		mockUseCreateTranchedOrdersMutation.mockReturnValue({ mutate: vi.fn(), isPending: false })
		mockUseCreateHighAlertVerificationMutation.mockReturnValue({
			mutate: vi.fn(),
			isPending: false,
		})
		setCdsEvaluateResult({
			alerts: [],
			canProceed: true,
			requiresOverride: false,
			requiresDoubleVerification: false,
		})
	})

	it("renders the generic name field as the first labeled input", () => {
		render(<CreateMedOrderDialog {...defaultProps} />)

		const dialog = screen.getByRole("dialog")
		const firstLabel = within(dialog).getAllByText(/generic name/i)[0]
		expect(firstLabel).toBeInTheDocument()

		const allLabels = dialog.querySelectorAll("label")
		expect(allLabels[0]?.textContent ?? "").toMatch(/generic name/i)
	})

	it("disables the drug safety check button when generic name is empty", () => {
		render(<CreateMedOrderDialog {...defaultProps} />)
		const checkBtn = screen.getByRole("button", { name: /run drug safety check/i })
		expect(checkBtn).toBeDisabled()
	})

	it("keeps submit disabled when CDS returns a hard-block allergy", async () => {
		const user = userEvent.setup()
		setCdsEvaluateResult({
			alerts: [
				{
					type: "allergy_hard_block",
					severity: "hard_block",
					message: "Penicillin allergy on file",
					details: { allergenName: "Penicillin", severity: "severe", reactionType: "Anaphylaxis" },
				},
			],
			canProceed: false,
			requiresOverride: false,
			requiresDoubleVerification: false,
		})

		render(<CreateMedOrderDialog {...defaultProps} />)

		await user.type(screen.getByTestId("generic-name-input"), "Amoxicillin")
		await user.click(screen.getByRole("button", { name: /run drug safety check/i }))

		expect(screen.getByTestId("allergy-alert-allergy-0")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: /create order/i })).toBeDisabled()
	})

	it("shows CDS validation errors before signing the order", async () => {
		const user = userEvent.setup()
		setCdsEvaluateError(
			new Error(
				"Biogesic is a brand name. Select the generic name first (Paracetamol); brand name is optional and subordinate."
			)
		)

		render(<CreateMedOrderDialog {...defaultProps} />)

		await user.type(screen.getByTestId("generic-name-input"), "Biogesic")
		await user.click(screen.getByRole("button", { name: /run drug safety check/i }))

		expect(await screen.findByText(/Biogesic is a brand name/i)).toBeInTheDocument()
		expect(screen.getByRole("button", { name: /create order/i })).toBeDisabled()
	})

	it("enables submit after a soft-block allergy is overridden once all required fields are filled", async () => {
		const user = userEvent.setup()
		setCdsEvaluateResult({
			alerts: [
				{
					type: "allergy_soft_block",
					severity: "soft_block",
					message: "Possible cross-reactivity",
					details: { allergenName: "Amoxicillin", severity: "moderate", reactionType: "Rash" },
				},
			],
			canProceed: false,
			requiresOverride: true,
			requiresDoubleVerification: false,
		})

		render(<CreateMedOrderDialog {...defaultProps} />)

		await user.type(screen.getByTestId("generic-name-input"), "Amoxicillin")
		await user.click(screen.getByRole("button", { name: /run drug safety check/i }))

		await user.type(screen.getByLabelText(/^Dose\s+\*$/i), "500")
		await user.type(screen.getByLabelText(/^Dose Unit\s+\*$/i), "mg")
		await user.type(screen.getByLabelText(/^Dose Form\s+\*$/i), "tablet")
		await user.type(screen.getByLabelText(/^Route\s+\*$/i), "oral")

		await user.selectOptions(screen.getByLabelText(/^Frequency\s+\*$/i), "once")

		const submitBtn = screen.getByRole("button", { name: /create order/i })
		expect(submitBtn).toBeDisabled()

		await user.click(screen.getByRole("button", { name: /override allergy-0/i }))

		expect(screen.getByRole("button", { name: /create order/i })).not.toBeDisabled()
	})

	it("renders a high-alert severity item when CDS requires double verification", async () => {
		const user = userEvent.setup()
		setCdsEvaluateResult({
			alerts: [
				{
					type: "high_alert",
					severity: "warning",
					message: "High-alert medication: requires dual sign-off",
				},
			],
			canProceed: true,
			requiresOverride: false,
			requiresDoubleVerification: true,
		})

		render(<CreateMedOrderDialog {...defaultProps} />)

		await user.type(screen.getByTestId("generic-name-input"), "Insulin")
		await user.click(screen.getByRole("button", { name: /run drug safety check/i }))

		expect(screen.getByTestId("cds-alert-cds-0-severity")).toHaveTextContent("high_alert")
		expect(
			screen.getByText(/dual clinician verification required before submitting/i)
		).toBeInTheDocument()
	})

	it("opens the S-2 validation modal before enabling the controlled-substance flow", async () => {
		const user = userEvent.setup()
		render(<CreateMedOrderDialog {...defaultProps} />)

		expect(screen.queryByTestId("s2-validation-modal")).toBeNull()
		expect(screen.queryByLabelText(/pdea schedule/i)).toBeNull()

		const checkbox = screen.getByRole("checkbox", { name: /controlled substance/i })
		await user.click(checkbox)

		// The S-2 validation modal must gate the controlled-substance flow:
		// the checkbox click opens the modal but does NOT yet flip the
		// controlled-substance state (no PDEA schedule field, checkbox still off).
		expect(screen.getByTestId("s2-validation-modal")).toBeInTheDocument()
		expect((checkbox as HTMLInputElement).checked).toBe(false)
		expect(screen.queryByLabelText(/pdea schedule/i)).toBeNull()

		await user.click(screen.getByTestId("s2-proceed"))

		expect(screen.queryByTestId("s2-validation-modal")).toBeNull()
		expect(screen.getByLabelText(/pdea schedule/i)).toBeInTheDocument()
	})

	it("blocks controlled substance orders beyond the 90-day PDEA cap", async () => {
		const user = userEvent.setup()
		mockUseMyProfile.mockReturnValue({
			data: {
				activeRole: { permissions: [{ module: "orders", action: "create" }] },
				staffProfiles: [
					{
						id: "staff-1",
						facilityId: "facility-1",
						prcLicenseNumber: "PRC-1",
						ptrNumber: "PTR-1",
						prcExpiry: "2027-01-01",
						ptrExpiry: "2027-01-01",
						pdeaS2License: "S2-1",
						pdeaS2Expiry: "2027-01-01",
					},
				],
				user: { name: "Dr. Test" },
			},
		})
		mockUseCheckPdeaLicenseQuery.mockReturnValue({
			data: {
				canPrescribeControlled: true,
				licenseNumber: "S2-1",
				expiryDate: "2027-01-01",
				daysUntilExpiry: 200,
				errorMessage: null,
			},
			isLoading: false,
			isSuccess: true,
			isError: false,
		})

		render(<CreateMedOrderDialog {...defaultProps} />)

		await user.type(screen.getByTestId("generic-name-input"), "Morphine")
		await user.click(screen.getByRole("checkbox", { name: /controlled substance/i }))
		await user.click(screen.getByTestId("s2-proceed"))
		await user.click(screen.getByRole("button", { name: /run drug safety check/i }))
		await user.type(screen.getByLabelText(/^Dose\s+\*$/i), "10")
		await user.type(screen.getByLabelText(/^Dose Unit\s+\*$/i), "mg")
		await user.type(screen.getByLabelText(/^Dose Form\s+\*$/i), "tablet")
		await user.type(screen.getByLabelText(/^Route\s+\*$/i), "oral")
		await user.selectOptions(screen.getByLabelText(/^Frequency\s+\*$/i), "bid")
		await user.type(screen.getByLabelText(/duration/i), "91")
		await user.selectOptions(screen.getByLabelText(/pdea schedule/i), "S-2")

		expect(screen.getByText(/cannot exceed 90 days/i)).toBeInTheDocument()
		expect(screen.getByRole("button", { name: /create order/i })).toBeDisabled()
	})

	it("submits controlled orders over 30 days through the tranching endpoint", async () => {
		const user = userEvent.setup()
		const createMedOrderMutate = vi.fn()
		const createTranchedOrdersMutate = vi.fn()
		mockUseCreateMedOrderMutation.mockReturnValue({
			mutate: createMedOrderMutate,
			isPending: false,
		})
		mockUseCreateTranchedOrdersMutation.mockReturnValue({
			mutate: createTranchedOrdersMutate,
			isPending: false,
		})
		mockUseMyProfile.mockReturnValue({
			data: {
				activeRole: { permissions: [{ module: "orders", action: "create" }] },
				staffProfiles: [
					{
						id: "staff-1",
						facilityId: "facility-1",
						prcLicenseNumber: "PRC-1",
						ptrNumber: "PTR-1",
						prcExpiry: "2027-01-01",
						ptrExpiry: "2027-01-01",
						pdeaS2License: "S2-1",
						pdeaS2Expiry: "2027-01-01",
					},
				],
				user: { name: "Dr. Test" },
			},
		})
		mockUseCheckPdeaLicenseQuery.mockReturnValue({
			data: {
				canPrescribeControlled: true,
				licenseNumber: "S2-1",
				expiryDate: "2027-01-01",
				daysUntilExpiry: 200,
				errorMessage: null,
			},
			isLoading: false,
			isSuccess: true,
			isError: false,
		})

		render(<CreateMedOrderDialog {...defaultProps} />)

		await user.type(screen.getByTestId("generic-name-input"), "Morphine")
		await user.click(screen.getByRole("checkbox", { name: /controlled substance/i }))
		await user.click(screen.getByTestId("s2-proceed"))
		await user.click(screen.getByRole("button", { name: /run drug safety check/i }))
		await user.type(screen.getByLabelText(/^Dose\s+\*$/i), "10")
		await user.type(screen.getByLabelText(/^Dose Unit\s+\*$/i), "mg")
		await user.type(screen.getByLabelText(/^Dose Form\s+\*$/i), "tablet")
		await user.type(screen.getByLabelText(/^Route\s+\*$/i), "oral")
		await user.selectOptions(screen.getByLabelText(/^Frequency\s+\*$/i), "bid")
		await user.type(screen.getByLabelText(/duration/i), "45")
		await user.selectOptions(screen.getByLabelText(/pdea schedule/i), "S-2")

		await user.click(screen.getByRole("button", { name: /preview tranches/i }))
		await user.click(screen.getByTestId("confirm-tranches"))

		expect(createMedOrderMutate).not.toHaveBeenCalled()
		expect(createTranchedOrdersMutate).toHaveBeenCalledWith(
			expect.objectContaining({
				durationDays: 45,
				pdeaSchedule: "S-2",
				startDate: "2026-05-17",
			}),
			expect.any(Object)
		)
	})

	it("labels the brand name field as optional and renders it after the generic name", async () => {
		const user = userEvent.setup()
		render(<CreateMedOrderDialog {...defaultProps} />)

		await user.type(screen.getByTestId("generic-name-input"), "Amoxicillin")

		const brandLabel = screen.getByText(/brand name \(optional\)/i)
		expect(brandLabel).toBeInTheDocument()

		const genericInput = screen.getByTestId("generic-name-input")
		const brandInput = screen.getByLabelText(/brand name \(optional\)/i)

		const order = genericInput.compareDocumentPosition(brandInput)
		expect(order & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
	})
})
