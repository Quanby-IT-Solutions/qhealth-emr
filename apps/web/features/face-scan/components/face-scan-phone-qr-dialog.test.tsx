import { StrictMode, type ReactNode } from "react"
import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { FaceScanPhoneQrDialog } from "./face-scan-phone-qr-dialog"

const { createFaceScanPhoneSession, mockToDataUrl, useFaceScanPhoneSessionQuery } = vi.hoisted(
	() => ({
		createFaceScanPhoneSession: vi.fn(),
		mockToDataUrl: vi.fn(),
		useFaceScanPhoneSessionQuery: vi.fn(),
	})
)

vi.mock("qrcode", () => ({
	toDataURL: (...args: unknown[]) => mockToDataUrl(...args),
}))

vi.mock("@/features/face-scan/hooks/face-scan.hooks", () => ({
	createFaceScanPhoneSession: (...args: unknown[]) => createFaceScanPhoneSession(...args),
	getFaceScanPhoneUrl: (token: string) => `http://localhost:3001/face-scan/phone/${token}`,
	useFaceScanPhoneSessionQuery: (...args: unknown[]) => useFaceScanPhoneSessionQuery(...args),
}))

vi.mock("@/core/components/ui/dialog", () => ({
	Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
		open ? <div>{children}</div> : null,
	DialogContent: ({ children }: { children: ReactNode }) => <div role="dialog">{children}</div>,
	DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
	DialogFooter: ({ children }: { children: ReactNode }) => <footer>{children}</footer>,
	DialogHeader: ({ children }: { children: ReactNode }) => <header>{children}</header>,
	DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}))

const pendingSession = {
	id: "550e8400-e29b-41d4-a716-446655440000",
	token: "phone-token",
	status: "pending" as const,
	expiresAt: "2026-06-29T08:00:00.000Z",
	completedAt: null,
	vitals: null,
}

const completeSession = {
	...pendingSession,
	token: undefined,
	status: "complete" as const,
	completedAt: "2026-06-29T07:55:00.000Z",
	vitals: {
		bpSystolic: 120,
		bpDiastolic: 80,
		heartRate: 72,
		respiratoryRate: 16,
		spo2: 98,
	},
}

describe("FaceScanPhoneQrDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockToDataUrl.mockResolvedValue("data:image/png;base64,qr")
		createFaceScanPhoneSession.mockResolvedValue(pendingSession)
		useFaceScanPhoneSessionQuery.mockReturnValue({
			data: undefined,
			isFetching: false,
		})
	})

	it("creates a phone session and renders the QR code link", async () => {
		render(
			<FaceScanPhoneQrDialog
				open
				onOpenChange={vi.fn()}
				age={42}
				gender="female"
				smoking={false}
				facilityId="facility-1"
				encounterId="encounter-1"
				patientId="patient-1"
				onComplete={vi.fn()}
			/>
		)

		await waitFor(() => {
			expect(createFaceScanPhoneSession).toHaveBeenCalledWith({
				facilityId: "facility-1",
				encounterId: "encounter-1",
				patientId: "patient-1",
				age: 42,
				gender: "female",
				smoking: false,
			})
		})
		expect(createFaceScanPhoneSession).toHaveBeenCalledTimes(1)
		expect(await screen.findByAltText("Phone face scan QR code")).toHaveAttribute(
			"src",
			"data:image/png;base64,qr"
		)
		expect(
			screen.getByText("http://localhost:3001/face-scan/phone/phone-token")
		).toBeInTheDocument()
	})

	it("does not create duplicate sessions when effects are replayed", async () => {
		render(
			<StrictMode>
				<FaceScanPhoneQrDialog open onOpenChange={vi.fn()} onComplete={vi.fn()} />
			</StrictMode>
		)

		expect(await screen.findByAltText("Phone face scan QR code")).toHaveAttribute(
			"src",
			"data:image/png;base64,qr"
		)
		expect(createFaceScanPhoneSession).toHaveBeenCalledTimes(1)
	})

	it("fires onComplete when polling returns completed vitals", async () => {
		const onComplete = vi.fn()
		const { rerender } = render(
			<FaceScanPhoneQrDialog open onOpenChange={vi.fn()} onComplete={onComplete} />
		)

		await screen.findByAltText("Phone face scan QR code")

		useFaceScanPhoneSessionQuery.mockReturnValue({
			data: completeSession,
			isFetching: false,
		})
		rerender(<FaceScanPhoneQrDialog open onOpenChange={vi.fn()} onComplete={onComplete} />)

		await waitFor(() => {
			expect(onComplete).toHaveBeenCalledWith(completeSession.vitals)
		})
		expect(screen.getByText(/values were applied to the vitals form/i)).toBeInTheDocument()
	})
})
