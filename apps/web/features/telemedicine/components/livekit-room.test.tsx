import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { LiveKitVideoRoom } from "./livekit-room"

vi.mock("framer-motion", async () => {
	const React = await import("react")

	const MotionSpan = React.forwardRef<HTMLSpanElement, Record<string, unknown>>(
		({ animate: _animate, initial: _initial, transition: _transition, ...props }, ref) => (
			<span ref={ref} {...props} />
		)
	)
	MotionSpan.displayName = "MotionSpan"

	return {
		motion: {
			span: MotionSpan,
		},
	}
})

function renderWithQueryClient(ui: React.ReactElement) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	})

	return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe("LiveKitVideoRoom", () => {
	it("renders the full-viewport pre-join card before requesting a LiveKit token", () => {
		renderWithQueryClient(
			<LiveKitVideoRoom
				appointmentId="appointment-1"
				clinicianName="Dr. Miguel Santos"
				patientName="Dela Cruz, Juan"
				fullViewport
			/>
		)

		expect(screen.getByTestId("livekit-prejoin-card")).toBeVisible()
		expect(screen.getByRole("heading", { name: /telemedicine consultation/i })).toBeVisible()
		expect(screen.getByText("Dr. Miguel Santos")).toBeVisible()
		expect(screen.getByRole("button", { name: /join session/i })).toBeVisible()
	})
})
