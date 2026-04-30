import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { BillingService } from "./billing.service"

@Controller()
export class BillingController {
	constructor(private readonly billingService: BillingService) {}

	// ========================================================================
	// Charge Master
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(v1.billing.listChargeMasterItems)
	async listChargeMasterItems() {
		return implement(v1.billing.listChargeMasterItems).handler(async ({ input }) => {
			return this.billingService.listChargeMasterItems(input)
		})
	}

	// ========================================================================
	// Charges
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(v1.billing.listCharges)
	async listCharges() {
		return implement(v1.billing.listCharges).handler(async ({ input }) => {
			return this.billingService.listCharges(input)
		})
	}

	@RequirePermission("billing", "create")
	@Implement(v1.billing.createCharge)
	async createCharge(@Session() session: UserSession) {
		return implement(v1.billing.createCharge).handler(async ({ input }) => {
			return this.billingService.createCharge(input, session.user.id)
		})
	}

	@RequirePermission("billing", "edit")
	@Implement(v1.billing.updateCharge)
	async updateCharge() {
		return implement(v1.billing.updateCharge).handler(async ({ input }) => {
			return this.billingService.updateCharge(input)
		})
	}

	@RequirePermission("billing", "edit")
	@Implement(v1.billing.deleteCharge)
	async deleteCharge() {
		return implement(v1.billing.deleteCharge).handler(async ({ input }) => {
			return this.billingService.deleteCharge(input.id)
		})
	}

	// ========================================================================
	// Invoices
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(v1.billing.listInvoices)
	async listInvoices() {
		return implement(v1.billing.listInvoices).handler(async ({ input }) => {
			return this.billingService.listInvoices(input)
		})
	}

	@RequirePermission("billing", "view")
	@Implement(v1.billing.getInvoice)
	async getInvoice() {
		return implement(v1.billing.getInvoice).handler(async ({ input }) => {
			return this.billingService.getInvoice(input.id)
		})
	}

	@RequirePermission("billing", "create")
	@Implement(v1.billing.generateInvoice)
	async generateInvoice(@Session() session: UserSession) {
		return implement(v1.billing.generateInvoice).handler(async ({ input }) => {
			return this.billingService.generateInvoice(input, session.user.id)
		})
	}

	@RequirePermission("billing", "edit")
	@Implement(v1.billing.finalizeInvoice)
	async finalizeInvoice() {
		return implement(v1.billing.finalizeInvoice).handler(async ({ input }) => {
			return this.billingService.finalizeInvoice(input.id)
		})
	}

	// ========================================================================
	// Payments
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(v1.billing.listPayments)
	async listPayments() {
		return implement(v1.billing.listPayments).handler(async ({ input }) => {
			return this.billingService.listPayments(input)
		})
	}

	@RequirePermission("billing", "create")
	@Implement(v1.billing.recordPayment)
	async recordPayment(@Session() session: UserSession) {
		return implement(v1.billing.recordPayment).handler(async ({ input }) => {
			return this.billingService.recordPayment(input, session.user.id)
		})
	}

	// ========================================================================
	// CF4 Claims
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(v1.billing.getCf4)
	async getCf4() {
		return implement(v1.billing.getCf4).handler(async ({ input }) => {
			return this.billingService.getCf4(input.id)
		})
	}

	@RequirePermission("billing", "create")
	@Implement(v1.billing.generateCf4)
	async generateCf4() {
		return implement(v1.billing.generateCf4).handler(async ({ input }) => {
			return this.billingService.generateCf4(input)
		})
	}

	@RequirePermission("billing", "edit")
	@Implement(v1.billing.finalizeCf4)
	async finalizeCf4() {
		return implement(v1.billing.finalizeCf4).handler(async ({ input }) => {
			return this.billingService.finalizeCf4(input)
		})
	}

	// ========================================================================
	// Eligibility Check
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(v1.billing.checkEligibility)
	async checkEligibility(@Session() session: UserSession) {
		return implement(v1.billing.checkEligibility).handler(async ({ input }) => {
			return this.billingService.checkEligibility(input, session.user.id)
		})
	}

	// ========================================================================
	// Billing Status
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(v1.billing.getBillingStatus)
	async getBillingStatus() {
		return implement(v1.billing.getBillingStatus).handler(async ({ input }) => {
			return this.billingService.getBillingStatus(input.encounterId)
		})
	}

	// ========================================================================
	// Unbilled Encounters
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(v1.billing.listUnbilledEncounters)
	async listUnbilledEncounters() {
		return implement(v1.billing.listUnbilledEncounters).handler(async ({ input }) => {
			return this.billingService.listUnbilledEncounters(input)
		})
	}

	// ========================================================================
	// Statement of Account (SOA)
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(v1.billing.getSoa)
	async getSoa() {
		return implement(v1.billing.getSoa).handler(async ({ input }) => {
			return this.billingService.getSoa(input)
		})
	}

	@RequirePermission("billing", "create")
	@Implement(v1.billing.generateSoa)
	async generateSoa() {
		return implement(v1.billing.generateSoa).handler(async ({ input }) => {
			return this.billingService.generateSoa(input)
		})
	}

	@RequirePermission("billing", "edit")
	@Implement(v1.billing.finalizeSoa)
	async finalizeSoa() {
		return implement(v1.billing.finalizeSoa).handler(async ({ input }) => {
			return this.billingService.finalizeSoa(input)
		})
	}

	// ========================================================================
	// CF5 / DRG Shadow Billing
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(v1.billing.getCf5)
	async getCf5() {
		return implement(v1.billing.getCf5).handler(async ({ input }) => {
			return this.billingService.getCf5(input)
		})
	}

	@RequirePermission("billing", "view")
	@Implement(v1.billing.searchDrgCodes)
	async searchDrgCodes() {
		return implement(v1.billing.searchDrgCodes).handler(async ({ input }) => {
			return this.billingService.searchDrgCodes(input)
		})
	}

	@RequirePermission("billing", "edit")
	@Implement(v1.billing.assignDrg)
	async assignDrg() {
		return implement(v1.billing.assignDrg).handler(async ({ input }) => {
			return this.billingService.assignDrg(input)
		})
	}

	@RequirePermission("billing", "edit")
	@Implement(v1.billing.approveCf5)
	async approveCf5() {
		return implement(v1.billing.approveCf5).handler(async ({ input }) => {
			return this.billingService.approveCf5(input)
		})
	}

	// ========================================================================
	// Konsulta Capitation
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(v1.billing.getKonsultaBenefit)
	async getKonsultaBenefit() {
		return implement(v1.billing.getKonsultaBenefit).handler(async ({ input }) => {
			return this.billingService.getKonsultaBenefit(input)
		})
	}

	@RequirePermission("billing", "create")
	@Implement(v1.billing.recordKonsultaVisit)
	async recordKonsultaVisit() {
		return implement(v1.billing.recordKonsultaVisit).handler(async ({ input }) => {
			return this.billingService.recordKonsultaVisit(input)
		})
	}

	// ========================================================================
	// Malasakit Center
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(v1.billing.getMalasakit)
	async getMalasakit() {
		return implement(v1.billing.getMalasakit).handler(async ({ input }) => {
			return this.billingService.getMalasakit(input)
		})
	}

	@RequirePermission("billing", "create")
	@Implement(v1.billing.addMalasakit)
	async addMalasakit() {
		return implement(v1.billing.addMalasakit).handler(async ({ input }) => {
			return this.billingService.addMalasakit(input)
		})
	}

	@RequirePermission("billing", "edit")
	@Implement(v1.billing.updateMalasakitStatus)
	async updateMalasakitStatus() {
		return implement(v1.billing.updateMalasakitStatus).handler(async ({ input }) => {
			return this.billingService.updateMalasakitStatus(input)
		})
	}
}
