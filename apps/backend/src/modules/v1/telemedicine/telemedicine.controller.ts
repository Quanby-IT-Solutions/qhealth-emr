import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"

import { TelemedicineService } from "./telemedicine.service"

@Controller()
export class TelemedicineController {
	constructor(private readonly telemedicineService: TelemedicineService) {}

	// ─── Appointments ──────────────────────────────────────────────────────────

	@Implement(v1.telemedicine.listAppointments)
	async listAppointments() {
		return implement(v1.telemedicine.listAppointments).handler(async ({ input }) => {
			return this.telemedicineService.listAppointments(input)
		})
	}

	@Implement(v1.telemedicine.getAppointment)
	async getAppointment() {
		return implement(v1.telemedicine.getAppointment).handler(async ({ input }) => {
			return this.telemedicineService.getAppointment(input)
		})
	}

	@Implement(v1.telemedicine.createAppointment)
	async createAppointment(@Session() session: UserSession) {
		return implement(v1.telemedicine.createAppointment).handler(async ({ input }) => {
			void session
			return this.telemedicineService.createAppointment(input)
		})
	}

	@Implement(v1.telemedicine.cancelAppointment)
	async cancelAppointment(@Session() session: UserSession) {
		return implement(v1.telemedicine.cancelAppointment).handler(async ({ input }) => {
			void session
			return this.telemedicineService.cancelAppointment(input)
		})
	}

	// ─── Encounters ────────────────────────────────────────────────────────────

	@Implement(v1.telemedicine.getEncounter)
	async getEncounter() {
		return implement(v1.telemedicine.getEncounter).handler(async ({ input }) => {
			return this.telemedicineService.getEncounter(input)
		})
	}

	@Implement(v1.telemedicine.createEncounter)
	async createEncounter(@Session() session: UserSession) {
		return implement(v1.telemedicine.createEncounter).handler(async ({ input }) => {
			void session
			return this.telemedicineService.createEncounter(input)
		})
	}

	// ─── Prescriptions ─────────────────────────────────────────────────────────

	@Implement(v1.telemedicine.getPrescription)
	async getPrescription() {
		return implement(v1.telemedicine.getPrescription).handler(async ({ input }) => {
			return this.telemedicineService.getPrescription(input)
		})
	}

	@Implement(v1.telemedicine.listPrescriptions)
	async listPrescriptions() {
		return implement(v1.telemedicine.listPrescriptions).handler(async ({ input }) => {
			return this.telemedicineService.listPrescriptions(input)
		})
	}

	@Implement(v1.telemedicine.createPrescription)
	async createPrescription(@Session() session: UserSession) {
		return implement(v1.telemedicine.createPrescription).handler(async ({ input }) => {
			void session
			return this.telemedicineService.createPrescription(input)
		})
	}
}
