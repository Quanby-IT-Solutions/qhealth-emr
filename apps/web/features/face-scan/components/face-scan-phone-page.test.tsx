import type { RefObject } from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ScanState } from "../lib/insight-genie-adapter"
import { FaceScanPhonePage } from "./face-scan-phone-page"

const {
	completeFaceScanPhoneSession,
	createFaceScanPhoneToken,
	mockUseFaceScan,
	useFaceScanPhoneSessionPreviewQuery,
} = vi.hoisted(() => ({
	completeFaceScanPhoneSession: vi.fn(),
	createFaceScanPhoneToken: vi.fn(),
	mockUseFaceScan: vi.fn(),
	useFaceScanPhoneSessionPreviewQuery: vi.fn(),
}))

vi.mock("@/features/face-scan/hooks/face-scan.hooks", () => ({
	completeFaceScanPhoneSession: (...args: unknown[]) => completeFaceScanPhoneSession(...args),
	createFaceScanPhoneToken: (...args: unknown[]) => createFaceScanPhoneToken(...args),
	useFaceScanPhoneSessionPreviewQuery: (...args: unknown[]) =>
		useFaceScanPhoneSessionPreviewQuery(...args),
}))

vi.mock("@/features/face-scan/hooks/use-face-scan", () => ({
	useFaceScan: (...args: unknown[]) => mockUseFaceScan(...args),
}))

vi.mock("@/features/face-scan/components/face-scan-guide-panel", () => ({
	FaceScanGuidePanel: () => <aside>Scan guide</aside>,
}))

const idleScan = {
	iframeUrl: null,
	scanState: "idle" as ScanState,
	vitals: null,
	error: null,
	conditionStatus: null,
	scanTimeRemaining: null,
	iframeRef: { current: null } as RefObject<HTMLIFrameElement | null>,
	resetScan: vi.fn(),
}

const completedVitals = {
	bpSystolic: 120,
	bpDiastolic: 80,
	heartRate: 72,
	respiratoryRate: 16,
	spo2: 98,
}

describe("FaceScanPhonePage", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		useFaceScanPhoneSessionPreviewQuery.mockReturnValue({
			data: {
				enabled: true,
				status: "pending",
				expiresAt: "2026-06-29T08:00:00.000Z",
				requiresAge: false,
				requiresGender: false,
				requiresSmoking: false,
			},
			isLoading: false,
			error: null,
		})
		mockUseFaceScan.mockReturnValue(idleScan)
		completeFaceScanPhoneSession.mockResolvedValue({
			id: "550e8400-e29b-41d4-a716-446655440000",
			status: "complete",
			expiresAt: "2026-06-29T08:00:00.000Z",
			completedAt: "2026-06-29T07:55:00.000Z",
			vitals: { ...completedVitals, heightCm: 170, weightKg: 70 },
		})
	})

	it("posts completed phone scan vitals with setup measurements", async () => {
		const user = userEvent.setup()
		const { rerender } = render(<FaceScanPhonePage token="phone-token" />)

		await user.type(screen.getByLabelText(/height/i), "170")
		await user.type(screen.getByLabelText(/weight/i), "70")
		await user.click(screen.getByRole("button", { name: /start face scan/i }))

		mockUseFaceScan.mockReturnValue({
			...idleScan,
			scanState: "complete",
			vitals: completedVitals,
		})
		rerender(<FaceScanPhonePage token="phone-token" />)

		await waitFor(() => {
			expect(completeFaceScanPhoneSession).toHaveBeenCalledWith({
				token: "phone-token",
				vitals: {
					...completedVitals,
					heightCm: 170,
					weightKg: 70,
				},
			})
		})
		expect(await screen.findByText(/results sent/i)).toBeInTheDocument()
		expect(screen.getByText(/return to staff/i)).toBeInTheDocument()
	})

	it("asks only for measurements and smoking status before starting a scan", async () => {
		const user = userEvent.setup()
		useFaceScanPhoneSessionPreviewQuery.mockReturnValue({
			data: {
				enabled: true,
				status: "pending",
				expiresAt: "2026-06-29T08:00:00.000Z",
				requiresAge: true,
				requiresGender: true,
				requiresSmoking: true,
			},
			isLoading: false,
			error: null,
		})

		render(<FaceScanPhonePage token="phone-token" />)

		expect(screen.queryByLabelText(/age/i)).not.toBeInTheDocument()
		expect(screen.queryByLabelText(/sex/i)).not.toBeInTheDocument()
		await user.type(screen.getByLabelText(/height/i), "170")
		await user.type(screen.getByLabelText(/weight/i), "70")
		await user.click(screen.getByRole("button", { name: /^smoker$/i }))
		await user.click(screen.getByRole("button", { name: /start face scan/i }))

		await waitFor(() => {
			expect(mockUseFaceScan).toHaveBeenLastCalledWith(
				expect.objectContaining({
					age: undefined,
					gender: undefined,
					smoking: true,
					heightCm: 170,
					weightKg: 70,
				})
			)
		})
	})
})
