import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"

import { NbsService } from "./nbs.service"

@Controller()
export class NbsController {
	constructor(private readonly nbsService: NbsService) {}

	// ========================================================================
	// Screening
	// ========================================================================

	@Implement(v1.nbs.getScreeningByEncounter)
	async getScreeningByEncounter() {
		return implement(v1.nbs.getScreeningByEncounter).handler(async ({ input }) => {
			return this.nbsService.getScreeningByEncounter(input.encounterId)
		})
	}

	@Implement(v1.nbs.createScreening)
	async createScreening(@Session() session: UserSession) {
		return implement(v1.nbs.createScreening).handler(async ({ input }) => {
			return this.nbsService.createScreening(input, session.user.id)
		})
	}

	@Implement(v1.nbs.updateScreening)
	async updateScreening(@Session() session: UserSession) {
		return implement(v1.nbs.updateScreening).handler(async ({ input }) => {
			void session
			return this.nbsService.updateScreening(input)
		})
	}

	// ========================================================================
	// Consent
	// ========================================================================

	@Implement(v1.nbs.getConsentByNbsId)
	async getConsentByNbsId() {
		return implement(v1.nbs.getConsentByNbsId).handler(async ({ input }) => {
			return this.nbsService.getConsentByNbsId(input.nbsId)
		})
	}

	@Implement(v1.nbs.createConsent)
	async createConsent(@Session() session: UserSession) {
		return implement(v1.nbs.createConsent).handler(async ({ input }) => {
			return this.nbsService.createConsent(input, session.user.id)
		})
	}

	// ========================================================================
	// Referrals
	// ========================================================================

	@Implement(v1.nbs.getReferralsByNbsId)
	async getReferralsByNbsId() {
		return implement(v1.nbs.getReferralsByNbsId).handler(async ({ input }) => {
			return this.nbsService.getReferralsByNbsId(input.nbsId)
		})
	}

	@Implement(v1.nbs.createReferral)
	async createReferral(@Session() session: UserSession) {
		return implement(v1.nbs.createReferral).handler(async ({ input }) => {
			return this.nbsService.createReferral(input, session.user.id)
		})
	}

	@Implement(v1.nbs.updateReferral)
	async updateReferral(@Session() session: UserSession) {
		return implement(v1.nbs.updateReferral).handler(async ({ input }) => {
			void session
			return this.nbsService.updateReferral(input)
		})
	}

	// ========================================================================
	// Logbook
	// ========================================================================

	@Implement(v1.nbs.getLogbook)
	async getLogbook() {
		return implement(v1.nbs.getLogbook).handler(async ({ input }) => {
			return this.nbsService.getLogbook(input)
		})
	}
}
