import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ConsentCaptureModal } from "./consent-capture-modal"

vi.mock("@/features/nursing/components/consent-capture", () => ({
	SignatureCanvas: ({
		disabled,
		onCapture,
		onClear,
	}: {
		disabled?: boolean
		onCapture: (dataUrl: string) => void
		onClear: () => void
	}) => (
		<div>
			<button
				type="button"
				onClick={() => onCapture("data:image/png;base64,mock-signature")}
				disabled={disabled}
			>
				Add signature
			</button>
			<button type="button" onClick={onClear} disabled={disabled}>
				Clear signature
			</button>
		</div>
	),
}))

describe("ConsentCaptureModal", () => {
	it("keeps the continue button disabled until the required fields are complete", async () => {
		const user = userEvent.setup()

		render(
			<ConsentCaptureModal open patientName="Jane Doe" onCancel={() => {}} onConsented={() => {}} />
		)

		const continueButton = screen.getByRole("button", {
			name: /capture consent & continue/i,
		})

		expect(continueButton).toBeDisabled()

		await user.type(screen.getByLabelText(/signed by \(full name\)/i), "Jane Doe")
		await user.click(screen.getByRole("button", { name: /add signature/i }))

		expect(continueButton).toBeDisabled()

		await user.click(screen.getByLabelText(/i have read and understood the privacy notice/i))

		expect(continueButton).toBeEnabled()
	})

	it("returns the captured consent payload when the user continues", async () => {
		const user = userEvent.setup()
		const onConsented = vi.fn()

		render(
			<ConsentCaptureModal
				open
				patientName="Jane Doe"
				onCancel={() => {}}
				onConsented={onConsented}
			/>
		)

		await user.type(screen.getByLabelText(/signed by \(full name\)/i), "Jane Doe")
		await user.click(screen.getByLabelText(/i have read and understood the privacy notice/i))
		await user.click(screen.getByRole("button", { name: /add signature/i }))
		await user.click(screen.getByRole("button", { name: /capture consent & continue/i }))

		expect(onConsented).toHaveBeenCalledWith({
			rightsAcknowledged: true,
			relationship: "self",
			signatureData: {
				capturedAt: expect.any(String),
				dataUrl: "data:image/png;base64,mock-signature",
			},
			signedByName: "Jane Doe",
		})
	})

	it("calls onCancel when the modal is dismissed", async () => {
		const user = userEvent.setup()
		const onCancel = vi.fn()

		render(
			<ConsentCaptureModal open patientName="Jane Doe" onCancel={onCancel} onConsented={() => {}} />
		)

		await user.click(screen.getByRole("button", { name: /cancel/i }))

		expect(onCancel).toHaveBeenCalled()
	})
})
