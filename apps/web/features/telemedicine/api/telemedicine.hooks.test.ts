import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

import {
	formatAppointmentStatusLabel,
	getAppointmentStatusColor,
	getPatientInvitePath,
	getPatientInviteUrl,
	getPlatformLabel,
	telemedicineKeys,
	useAbstractQuery,
	useAppointmentQuery,
	useAppointmentsQuery,
	useCancelAppointmentMutation,
	useCreateAppointmentMutation,
	useCreateEncounterMutation,
	useCreatePrescriptionMutation,
	useEncounterAbstractsQuery,
	useEncounterPrescriptionsQuery,
	useEncounterQuery,
	useEndLiveKitSessionMutation,
	useGenerateAbstractMutation,
	useJoinLiveKitRoomMutation,
	useJoinPatientLiveKitRoomMutation,
	usePatientInvitePreviewQuery,
	usePrescriptionQuery,
	useRegeneratePatientInviteMutation,
	useRevokePatientInviteMutation,
	useSendAbstractMutation,
	useSendPrescriptionMutation,
	useSignAbstractMutation,
	useSignPrescriptionMutation,
	useUpdateAppointmentMutation,
	type AppointmentStatus,
} from "./telemedicine.hooks"

const { fetchMock, invalidateQueries, mockUseMutation, mockUseQuery } = vi.hoisted(() => ({
	fetchMock: vi.fn(),
	invalidateQueries: vi.fn(),
	mockUseMutation: vi.fn(options => options),
	mockUseQuery: vi.fn(options => options),
}))

vi.mock("@tanstack/react-query", () => ({
	useMutation: mockUseMutation,
	useQuery: mockUseQuery,
	useQueryClient: () => ({ invalidateQueries }),
}))

interface QueryOptions {
	enabled?: boolean
	queryFn: () => Promise<unknown>
	queryKey: readonly unknown[]
}

interface MutationOptions<TVariables> {
	mutationFn: (variables: TVariables) => Promise<unknown>
	onSuccess?: (data: unknown, variables: TVariables) => void
}

function asQueryOptions(result: unknown) {
	return result as QueryOptions
}

async function executeMutation<TVariables>(result: unknown, variables: TVariables) {
	const options = result as MutationOptions<TVariables>
	await options.mutationFn(variables)
	options.onSuccess?.({}, variables)
}

beforeEach(() => {
	vi.clearAllMocks()
	fetchMock.mockResolvedValue({
		ok: true,
		status: 200,
		statusText: "OK",
		text: async () => "",
		json: async () => ({ ok: true }),
	})
	vi.stubGlobal("fetch", fetchMock)
})

afterAll(() => {
	vi.unstubAllGlobals()
})

describe("telemedicine API hooks", () => {
	it("builds stable query keys and display values", () => {
		expect(telemedicineKeys.appointments("facility-1")).toEqual([
			"telemedicine",
			"appointments",
			"facility-1",
		])
		expect(telemedicineKeys.appointment("appointment-1")).toEqual([
			"telemedicine",
			"appointments",
			"appointment-1",
		])
		expect(telemedicineKeys.encounters("appointment-1")).toEqual([
			"telemedicine",
			"encounters",
			"appointment-1",
		])
		expect(telemedicineKeys.encounter("encounter-1")).toEqual([
			"telemedicine",
			"encounter",
			"encounter-1",
		])
		expect(telemedicineKeys.prescriptions("encounter-1")).toEqual([
			"telemedicine",
			"prescriptions",
			"encounter-1",
		])
		expect(telemedicineKeys.prescription("prescription-1")).toEqual([
			"telemedicine",
			"prescription",
			"prescription-1",
		])
		expect(telemedicineKeys.abstracts("encounter-1")).toEqual([
			"telemedicine",
			"abstracts",
			"encounter-1",
		])
		expect(telemedicineKeys.abstract("abstract-1")).toEqual([
			"telemedicine",
			"abstract",
			"abstract-1",
		])
		expect(telemedicineKeys.patientInvite("appointment-1")).toEqual([
			"telemedicine",
			"appointments",
			"appointment-1",
			"patient-invite",
		])
		expect(telemedicineKeys.patientInvitePreview("invite token")).toEqual([
			"telemedicine",
			"patient-invites",
			"invite token",
		])

		expect(getAppointmentStatusColor("confirmed")).toContain("text-success")
		expect(getAppointmentStatusColor("unknown" as AppointmentStatus)).toContain(
			"text-muted-foreground"
		)
		expect(getPlatformLabel("teams")).toBe("Microsoft Teams")
		expect(formatAppointmentStatusLabel("in-progress")).toBe("In Progress")
		expect(formatAppointmentStatusLabel("unknown" as AppointmentStatus)).toBe("unknown")
		expect(getPatientInvitePath("invite token")).toBe("/telemedicine/join/invite%20token")
		expect(getPatientInviteUrl("invite token")).toBe(
			"http://localhost:3001/telemedicine/join/invite%20token"
		)
	})

	it("configures and executes appointment, encounter, prescription, invite, and abstract queries", async () => {
		const appointments = asQueryOptions(useAppointmentsQuery("facility-1", 2, 25, "confirmed"))
		await appointments.queryFn()
		expect(appointments.queryKey).toEqual([
			"telemedicine",
			"appointments",
			"facility-1",
			2,
			25,
			"confirmed",
		])
		expect(fetchMock).toHaveBeenLastCalledWith(
			"http://localhost:3000/v1/telemedicine/appointments?facilityId=facility-1&page=2&limit=25&status=confirmed",
			expect.objectContaining({ credentials: "include" })
		)

		const disabledAppointments = asQueryOptions(useAppointmentsQuery("", 1, 20, undefined, false))
		expect(disabledAppointments.enabled).toBe(false)
		await disabledAppointments.queryFn()
		expect(fetchMock).toHaveBeenLastCalledWith(
			"http://localhost:3000/v1/telemedicine/appointments?facilityId=&page=1&limit=20",
			expect.any(Object)
		)

		await asQueryOptions(useAppointmentQuery("appointment-1")).queryFn()
		await asQueryOptions(useEncounterQuery("encounter-1")).queryFn()
		await asQueryOptions(usePrescriptionQuery("prescription-1")).queryFn()
		await asQueryOptions(useEncounterPrescriptionsQuery("encounter-1")).queryFn()
		await asQueryOptions(usePatientInvitePreviewQuery("invite-token")).queryFn()
		await asQueryOptions(useEncounterAbstractsQuery("encounter-1")).queryFn()
		await asQueryOptions(useAbstractQuery("abstract-1")).queryFn()

		expect(fetchMock).toHaveBeenCalledWith(
			"http://localhost:3000/v1/telemedicine/abstracts/abstract-1",
			expect.objectContaining({ credentials: "include" })
		)
	})

	it("executes mutation requests and invalidates related cached data", async () => {
		await executeMutation(useCreateAppointmentMutation(), {
			facilityId: "facility-1",
			patientId: "patient-1",
			clinicianId: "clinician-1",
			scheduledDate: "2026-06-02",
			scheduledTime: "10:00",
			durationMinutes: 30,
		})
		await executeMutation(useCancelAppointmentMutation(), "appointment-1")
		await executeMutation(useUpdateAppointmentMutation(), {
			id: "appointment-1",
			videoLink: "https://example.test/room",
		})
		await executeMutation(useJoinLiveKitRoomMutation(), "appointment-1")
		await executeMutation(useEndLiveKitSessionMutation(), "appointment-1")
		await executeMutation(useRegeneratePatientInviteMutation(), "appointment-1")
		await executeMutation(useRevokePatientInviteMutation(), "appointment-1")
		await executeMutation(useJoinPatientLiveKitRoomMutation(), {
			token: "invite-token",
			dateOfBirth: "1980-01-01",
		})
		await executeMutation(useCreateEncounterMutation(), {
			appointmentId: "appointment-1",
			encounterType: "standalone",
			chiefComplaint: "Cough",
			subjectiveNotes: "Cough for three days",
			objectiveNotes: "Afebrile",
			assessmentNotes: "Upper respiratory tract infection",
			planNotes: "Hydration and rest",
			diagnosis: "URI",
		})
		await executeMutation(useCreatePrescriptionMutation(), {
			encounterId: "encounter-1",
			medications: [],
		})
		await executeMutation(useSignPrescriptionMutation(), { id: "prescription-1" })
		await executeMutation(useSendPrescriptionMutation(), {
			id: "prescription-1",
			email: "patient@example.test",
		})
		await executeMutation(useGenerateAbstractMutation(), { encounterId: "encounter-1" })
		await executeMutation(useSignAbstractMutation(), { id: "abstract-1" })
		await executeMutation(useSendAbstractMutation(), {
			id: "abstract-1",
			email: "patient@example.test",
		})

		expect(fetchMock).toHaveBeenCalledWith(
			"http://localhost:3000/v1/telemedicine/appointments/appointment-1/cancel",
			expect.objectContaining({ method: "POST" })
		)
		expect(fetchMock).toHaveBeenCalledWith(
			"http://localhost:3000/v1/telemedicine/abstracts/abstract-1/send",
			expect.objectContaining({ method: "POST" })
		)
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: telemedicineKeys.all })
		expect(invalidateQueries).toHaveBeenCalledWith({
			queryKey: telemedicineKeys.patientInvite("appointment-1"),
		})
	})

	it("surfaces API error messages from JSON response bodies", async () => {
		fetchMock.mockResolvedValueOnce({
			ok: false,
			status: 404,
			statusText: "Not Found",
			text: async () => JSON.stringify({ message: "Appointment was not found" }),
		})

		await expect(asQueryOptions(useAppointmentQuery("missing")).queryFn()).rejects.toThrow(
			"Appointment was not found"
		)
	})
})
