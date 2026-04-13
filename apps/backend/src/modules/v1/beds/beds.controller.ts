import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"

import { BedsService } from "./beds.service"

@Controller()
export class BedsController {
	constructor(private readonly bedsService: BedsService) {}

	@Implement(v1.bed.listWards)
	async listWards() {
		return implement(v1.bed.listWards).handler(async ({ input }) => {
			return this.bedsService.listWards(input)
		})
	}

	@Implement(v1.bed.createWard)
	async createWard(@Session() session: UserSession) {
		return implement(v1.bed.createWard).handler(async ({ input }) => {
			void session
			return this.bedsService.createWard(input)
		})
	}

	@Implement(v1.bed.listBeds)
	async listBeds() {
		return implement(v1.bed.listBeds).handler(async ({ input }) => {
			return this.bedsService.listBeds(input)
		})
	}

	@Implement(v1.bed.createBed)
	async createBed(@Session() session: UserSession) {
		return implement(v1.bed.createBed).handler(async ({ input }) => {
			void session
			return this.bedsService.createBed(input)
		})
	}

	@Implement(v1.bed.updateBedStatus)
	async updateBedStatus(@Session() session: UserSession) {
		return implement(v1.bed.updateBedStatus).handler(async ({ input }) => {
			void session
			return this.bedsService.updateBedStatus(input)
		})
	}

	@Implement(v1.bed.census)
	async census() {
		return implement(v1.bed.census).handler(async ({ input }) => {
			return this.bedsService.getCensus(input)
		})
	}
}
