import { fireEvent, render, screen } from "@testing-library/react"
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
	it("keeps the continue button disabled until the required fields are complete", () => {
		render(
			<ConsentCaptureModal open patientName="Jane Doe" onCancel={() => {}} onConsented={() => {}} />
		)

		const continueButton = screen.getByRole("button", {
			name: /capture consent & continue/i,
		})

		expect(continueButton).toBeDisabled()

		fireEvent.change(screen.getByLabelText(/signed by \(full name\)/i), {
			target: { value: "Jane Doe" },
		})
		fireEvent.click(screen.getByRole("button", { name: /add signature/i }))

		expect(continueButton).toBeDisabled()

		fireEvent.click(screen.getByLabelText(/i have read and understood the privacy notice/i))

		expect(continueButton).toBeEnabled()
	})

	it("returns the captured consent payload when the user continues", () => {
		const onConsented = vi.fn()

		render(
			<ConsentCaptureModal
				open
				patientName="Jane Doe"
				onCancel={() => {}}
				onConsented={onConsented}
			/>
		)

		fireEvent.change(screen.getByLabelText(/signed by \(full name\)/i), {
			target: { value: "Jane Doe" },
		})
		fireEvent.click(screen.getByLabelText(/i have read and understood the privacy notice/i))
		fireEvent.click(screen.getByRole("button", { name: /add signature/i }))
		fireEvent.click(screen.getByRole("button", { name: /capture consent & continue/i }))

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

	it("calls onCancel when the modal is dismissed", () => {
		const onCancel = vi.fn()

		render(
			<ConsentCaptureModal open patientName="Jane Doe" onCancel={onCancel} onConsented={() => {}} />
		)

		fireEvent.click(screen.getByRole("button", { name: /cancel/i }))

		expect(onCancel).toHaveBeenCalled()
	})
})
