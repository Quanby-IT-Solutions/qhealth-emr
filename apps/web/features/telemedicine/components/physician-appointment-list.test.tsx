import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { PhysicianAppointmentList } from "./physician-appointment-list"

const mockUseAppointmentsQuery = vi.fn()

vi.mock("@/features/telemedicine/api/telemedicine.hooks", async importOriginal => {
	const actual =
		await importOriginal<typeof import("@/features/telemedicine/api/telemedicine.hooks")>()
	return {
		...actual,
		useAppointmentsQuery: (...args: unknown[]) => mockUseAppointmentsQuery(...args),
	}
})

function makeAppointment(overrides: Record<string, unknown> = {}) {
	return {
		id: "appt-1",
		facilityId: "facility-1",
		patientId: "patient-1",
		patientName: "Juan Dela Cruz",
		patientMrn: "MRN-001",
		patientContactNumber: "09170000000",
		patientEmail: "juan@example.com",
		clinicianId: "staff-1",
		clinicianName: "Dr. Reyes",
		clinicianSpecialty: "Family Medicine",
		scheduledDate: "2026-05-24",
		scheduledTime: "14:00:00",
		durationMinutes: 30,
		platform: "livekit",
		status: "scheduled",
		videoLink: null,
		meetingId: null,
		meetingPassword: null,
		livekitRoomName: null,
		livekitSessionStartedAt: null,
		livekitSessionEndedAt: null,
		patientInviteExpiresAt: null,
		patientInviteRevokedAt: null,
		patientInviteLastUsedAt: null,
		patientJoinedAt: null,
		notes: null,
		encounterId: null,
		linkedCoreEncounterId: null,
		createdAt: "2026-05-20T00:00:00.000Z",
		createdByName: "Scheduler",
		...overrides,
	}
}

function renderList(onAppointmentSelected = vi.fn()) {
	mockUseAppointmentsQuery.mockReturnValue({
		data: { data: [makeAppointment()], total: 1, page: 1, limit: 20 },
		error: null,
		isLoading: false,
		isFetching: false,
		refetch: vi.fn(),
	})

	render(
		<PhysicianAppointmentList
			facilityId="facility-1"
			staffProfileId="staff-1"
			onAppointmentSelected={onAppointmentSelected}
		/>
	)

	return onAppointmentSelected
}

beforeEach(() => {
	vi.useFakeTimers({ shouldAdvanceTime: true })
	vi.setSystemTime(new Date("2026-05-24T09:00:00.000Z"))
	vi.clearAllMocks()
})

afterEach(() => {
	vi.useRealTimers()
})

describe("PhysicianAppointmentList", () => {
	it("does not start a new encounter after the video window has passed", async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
		const onAppointmentSelected = renderList()

		expect(screen.getByText(/video window has passed/i)).toBeInTheDocument()
		expect(screen.getByText(/mark as no-show or reschedule/i)).toBeInTheDocument()

		await user.click(screen.getByRole("button", { name: /view details/i }))

		expect(onAppointmentSelected).toHaveBeenCalledWith("appt-1", null, "video")
	})

	it("allows continuing an existing encounter even after the video window has passed", async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
		const onAppointmentSelected = vi.fn()
		mockUseAppointmentsQuery.mockReturnValue({
			data: {
				data: [makeAppointment({ encounterId: "encounter-1" })],
				total: 1,
				page: 1,
				limit: 20,
			},
			error: null,
			isLoading: false,
			isFetching: false,
			refetch: vi.fn(),
		})

		render(
			<PhysicianAppointmentList
				facilityId="facility-1"
				staffProfileId="staff-1"
				onAppointmentSelected={onAppointmentSelected}
			/>
		)

		await user.click(screen.getByRole("button", { name: /continue encounter/i }))

		expect(onAppointmentSelected).toHaveBeenCalledWith("appt-1", "encounter-1", "encounter")
	})
})
