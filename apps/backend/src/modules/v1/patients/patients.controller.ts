import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"

import { PatientsService } from "./patients.service"

@Controller()
export class PatientsController {
	constructor(private readonly patientsService: PatientsService) {}

	@Implement(v1.patient.search)
	async search() {
		return implement(v1.patient.search).handler(async ({ input }) => {
			return this.patientsService.search(input)
		})
	}

	@Implement(v1.patient.get)
	async get() {
		return implement(v1.patient.get).handler(async ({ input }) => {
			return this.patientsService.findById(input.id)
		})
	}

	@Implement(v1.patient.create)
	async create(@Session() session: UserSession) {
		return implement(v1.patient.create).handler(async ({ input }) => {
			void session // auth required
			return this.patientsService.create(input)
		})
	}

	@Implement(v1.patient.update)
	async update(@Session() session: UserSession) {
		return implement(v1.patient.update).handler(async ({ input }) => {
			void session // auth required
			return this.patientsService.update(input)
		})
	}
}
