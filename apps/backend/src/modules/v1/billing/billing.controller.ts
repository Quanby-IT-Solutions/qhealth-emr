import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"

import { BillingService } from "./billing.service"

@Controller()
export class BillingController {
	constructor(private readonly billingService: BillingService) {}

	// ========================================================================
	// Charge Master
	// ========================================================================

	@Implement(v1.billing.listChargeMasterItems)
	async listChargeMasterItems() {
		return implement(v1.billing.listChargeMasterItems).handler(async ({ input }) => {
			return this.billingService.listChargeMasterItems(input)
		})
	}

	// ========================================================================
	// Charges
	// ========================================================================

	@Implement(v1.billing.listCharges)
	async listCharges() {
		return implement(v1.billing.listCharges).handler(async ({ input }) => {
			return this.billingService.listCharges(input)
		})
	}

	@Implement(v1.billing.createCharge)
	async createCharge(@Session() session: UserSession) {
		return implement(v1.billing.createCharge).handler(async ({ input }) => {
			return this.billingService.createCharge(input, session.user.id)
		})
	}

	@Implement(v1.billing.updateCharge)
	async updateCharge() {
		return implement(v1.billing.updateCharge).handler(async ({ input }) => {
			return this.billingService.updateCharge(input)
		})
	}

	@Implement(v1.billing.deleteCharge)
	async deleteCharge() {
		return implement(v1.billing.deleteCharge).handler(async ({ input }) => {
			return this.billingService.deleteCharge(input.id)
		})
	}

	// ========================================================================
	// Invoices
	// ========================================================================

	@Implement(v1.billing.listInvoices)
	async listInvoices() {
		return implement(v1.billing.listInvoices).handler(async ({ input }) => {
			return this.billingService.listInvoices(input)
		})
	}

	@Implement(v1.billing.getInvoice)
	async getInvoice() {
		return implement(v1.billing.getInvoice).handler(async ({ input }) => {
			return this.billingService.getInvoice(input.id)
		})
	}

	@Implement(v1.billing.generateInvoice)
	async generateInvoice(@Session() session: UserSession) {
		return implement(v1.billing.generateInvoice).handler(async ({ input }) => {
			return this.billingService.generateInvoice(input, session.user.id)
		})
	}

	@Implement(v1.billing.finalizeInvoice)
	async finalizeInvoice() {
		return implement(v1.billing.finalizeInvoice).handler(async ({ input }) => {
			return this.billingService.finalizeInvoice(input.id)
		})
	}

	// ========================================================================
	// Payments
	// ========================================================================

	@Implement(v1.billing.listPayments)
	async listPayments() {
		return implement(v1.billing.listPayments).handler(async ({ input }) => {
			return this.billingService.listPayments(input)
		})
	}

	@Implement(v1.billing.recordPayment)
	async recordPayment(@Session() session: UserSession) {
		return implement(v1.billing.recordPayment).handler(async ({ input }) => {
			return this.billingService.recordPayment(input, session.user.id)
		})
	}

	// ========================================================================
	// CF4 Claims
	// ========================================================================

	@Implement(v1.billing.getCf4)
	async getCf4() {
		return implement(v1.billing.getCf4).handler(async ({ input }) => {
			return this.billingService.getCf4(input.id)
		})
	}

	@Implement(v1.billing.generateCf4)
	async generateCf4() {
		return implement(v1.billing.generateCf4).handler(async ({ input }) => {
			return this.billingService.generateCf4(input)
		})
	}

	@Implement(v1.billing.finalizeCf4)
	async finalizeCf4() {
		return implement(v1.billing.finalizeCf4).handler(async ({ input }) => {
			return this.billingService.finalizeCf4(input)
		})
	}

	// ========================================================================
	// Eligibility Check
	// ========================================================================

	@Implement(v1.billing.checkEligibility)
	async checkEligibility() {
		return implement(v1.billing.checkEligibility).handler(async ({ input }) => {
			return this.billingService.checkEligibility(input)
		})
	}

	// ========================================================================
	// Billing Status
	// ========================================================================

	@Implement(v1.billing.getBillingStatus)
	async getBillingStatus() {
		return implement(v1.billing.getBillingStatus).handler(async ({ input }) => {
			return this.billingService.getBillingStatus(input.encounterId)
		})
	}

	// ========================================================================
	// Unbilled Encounters
	// ========================================================================

	@Implement(v1.billing.listUnbilledEncounters)
	async listUnbilledEncounters() {
		return implement(v1.billing.listUnbilledEncounters).handler(async ({ input }) => {
			return this.billingService.listUnbilledEncounters(input)
		})
	}
}
