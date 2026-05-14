import type { AuditService } from "./audit.service"

let nextInput: unknown

jest.mock("@/config/api-versions.config", () => ({
	v1: {
		audit: {
			log: {
				list: {},
				get: {},
				exportCsv: {},
				configHistory: {},
			},
			breakGlass: {
				exportCsv: {},
				list: {},
				get: {},
				myActive: {},
				patterns: {},
				create: {},
				review: {},
			},
		},
	},
}))

jest.mock("@/modules/v1/rbac/rbac.guard", () => ({
	RequirePermission: () => () => undefined,
}))

jest.mock("@orpc/nest", () => ({
	Implement: () => () => undefined,
}))

jest.mock("@orpc/server", () => ({
	implement: jest.fn(() => ({
		handler: (callback: (args: { input: unknown }) => unknown) => callback({ input: nextInput }),
	})),
}))

jest.mock("@thallesp/nestjs-better-auth", () => ({
	Session: () => () => undefined,
}))

jest.mock("./audit.service", () => ({
	AuditService: class {},
}))

jest.mock("../notifications/notification.service", () => ({
	NotificationService: class {},
}))

describe("AuditController.createBreakGlass", () => {
	const input = {
		facilityId: "11111111-1111-1111-1111-111111111111",
		patientId: "22222222-2222-2222-2222-222222222222",
		reasonCategory: "code_blue",
		justification: "Code blue response requires immediate chart access.",
		durationHours: 4,
	}
	const event = {
		id: "44444444-4444-4444-4444-444444444444",
		...input,
		clinicianStaffId: "doctor-staff",
		accessGrantedAt: new Date(),
		accessExpiresAt: new Date(),
		reviewStatus: "pending",
	}

	beforeEach(() => {
		nextInput = input
		jest.clearAllMocks()
	})

	it("creates a break-glass event and notifies reviewer staff", async () => {
		const { AuditController } = await import("./audit.controller")
		const auditService = {
			resolveStaffProfileId: jest.fn().mockResolvedValue("doctor-staff"),
			createBreakGlass: jest.fn().mockResolvedValue(event),
			findBreakGlassReviewerStaffIds: jest
				.fn()
				.mockResolvedValue(["auditor-staff-1", "auditor-staff-2"]),
		} as unknown as AuditService
		const notificationService = {
			send: jest.fn().mockResolvedValue(undefined),
		}
		const controller = new AuditController(auditService, notificationService as never)

		const result = await controller.createBreakGlass({
			user: { id: "doctor-user" },
		} as never)

		expect(result).toEqual(event)
		expect(auditService.resolveStaffProfileId).toHaveBeenCalledWith("doctor-user")
		expect(auditService.createBreakGlass).toHaveBeenCalledWith({
			...input,
			clinicianStaffId: "doctor-staff",
			userId: "doctor-user",
		})
		expect(auditService.findBreakGlassReviewerStaffIds).toHaveBeenCalledWith(input.facilityId, {
			excludeStaffId: "doctor-staff",
		})
		expect(notificationService.send).toHaveBeenCalledTimes(2)
		expect(notificationService.send).toHaveBeenCalledWith(
			expect.objectContaining({
				facilityId: input.facilityId,
				recipientStaffId: "auditor-staff-1",
				topic: "break_glass",
				title: "Break-Glass Access Requested",
				data: expect.objectContaining({
					breakGlassEventId: event.id,
					patientId: input.patientId,
					reasonCategory: input.reasonCategory,
					requestingStaffId: "doctor-staff",
				}),
			})
		)
	})
})
