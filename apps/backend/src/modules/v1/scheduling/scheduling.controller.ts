import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"

import { SchedulingService } from "./scheduling.service"

@Controller()
export class SchedulingController {
	constructor(private readonly schedulingService: SchedulingService) {}

	// ========================================================================
	// Clinic Templates
	// ========================================================================

	@Implement(v1.scheduling.listClinicTemplates)
	async listClinicTemplates() {
		return implement(v1.scheduling.listClinicTemplates).handler(
			async ({ input }) => {
				return this.schedulingService.listClinicTemplates(input)
			}
		)
	}

	@Implement(v1.scheduling.createClinicTemplate)
	async createClinicTemplate(@Session() session: UserSession) {
		return implement(v1.scheduling.createClinicTemplate).handler(
			async ({ input }) => {
				void session
				return this.schedulingService.createClinicTemplate(input)
			}
		)
	}

	@Implement(v1.scheduling.updateClinicTemplate)
	async updateClinicTemplate(@Session() session: UserSession) {
		return implement(v1.scheduling.updateClinicTemplate).handler(
			async ({ input }) => {
				void session
				return this.schedulingService.updateClinicTemplate(input)
			}
		)
	}

	// ========================================================================
	// Appointments
	// ========================================================================

	@Implement(v1.scheduling.listAppointments)
	async listAppointments() {
		return implement(v1.scheduling.listAppointments).handler(
			async ({ input }) => {
				return this.schedulingService.listAppointments(input)
			}
		)
	}

	@Implement(v1.scheduling.getAppointment)
	async getAppointment() {
		return implement(v1.scheduling.getAppointment).handler(
			async ({ input }) => {
				return this.schedulingService.getAppointment(input.id)
			}
		)
	}

	@Implement(v1.scheduling.createAppointment)
	async createAppointment(@Session() session: UserSession) {
		return implement(v1.scheduling.createAppointment).handler(
			async ({ input }) => {
				return this.schedulingService.createAppointment(input, session)
			}
		)
	}

	@Implement(v1.scheduling.checkInAppointment)
	async checkInAppointment(@Session() session: UserSession) {
		return implement(v1.scheduling.checkInAppointment).handler(
			async ({ input }) => {
				void session
				return this.schedulingService.checkInAppointment(input)
			}
		)
	}

	@Implement(v1.scheduling.updateAppointmentStatus)
	async updateAppointmentStatus(@Session() session: UserSession) {
		return implement(v1.scheduling.updateAppointmentStatus).handler(
			async ({ input }) => {
				void session
				return this.schedulingService.updateAppointmentStatus(input)
			}
		)
	}

	// ========================================================================
	// Availability & Queue
	// ========================================================================

	@Implement(v1.scheduling.getAvailableSlots)
	async getAvailableSlots() {
		return implement(v1.scheduling.getAvailableSlots).handler(
			async ({ input }) => {
				return this.schedulingService.getAvailableSlots(input)
			}
		)
	}

	@Implement(v1.scheduling.getClinicQueue)
	async getClinicQueue() {
		return implement(v1.scheduling.getClinicQueue).handler(
			async ({ input }) => {
				return this.schedulingService.getClinicQueue(input)
			}
		)
	}
}
