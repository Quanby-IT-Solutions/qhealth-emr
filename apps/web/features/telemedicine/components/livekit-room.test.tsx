import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { LiveKitErrorCard, LiveKitVideoRoom } from "./livekit-room"

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

	it("renders join-window errors as a schedule notice", () => {
		renderWithQueryClient(
			<LiveKitErrorCard message="Video room can be joined from May 24, 2026, 01:30 PM GMT+8 until May 24, 2026, 04:30 PM GMT+8." />
		)

		expect(screen.getByText(/video room opens later/i)).toBeVisible()
		expect(screen.getByText(/on May 24, 2026/i)).toBeVisible()
		expect(screen.getByText("01:30 PM")).toBeVisible()
		expect(screen.getByText("04:30 PM")).toBeVisible()
		expect(screen.getByText(/philippine time/i)).toBeVisible()
		expect(screen.queryByText(/unable to start video session/i)).not.toBeInTheDocument()
	})
})
