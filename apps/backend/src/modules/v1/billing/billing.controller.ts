import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { billingContract } from "@repo/contracts"

import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { BillingService } from "./billing.service"

@Controller()
export class BillingController {
	constructor(private readonly billingService: BillingService) {}

	// ========================================================================
	// Charge Master
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(billingContract.listChargeMasterItems)
	async listChargeMasterItems() {
		return implement(billingContract.listChargeMasterItems).handler(async ({ input }) => {
			return this.billingService.listChargeMasterItems(input) as never
		})
	}

	// ========================================================================
	// Charges
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(billingContract.listCharges)
	async listCharges() {
		return implement(billingContract.listCharges).handler(async ({ input }) => {
			return this.billingService.listCharges(input) as never
		})
	}

	@RequirePermission("billing", "create")
	@Implement(billingContract.createCharge)
	async createCharge(@Session() session: UserSession) {
		return implement(billingContract.createCharge).handler(async ({ input }) => {
			return this.billingService.createCharge(input, session.user.id) as never
		})
	}

	@RequirePermission("billing", "edit")
	@Implement(billingContract.updateCharge)
	async updateCharge(@Session() session: UserSession) {
		return implement(billingContract.updateCharge).handler(async ({ input }) => {
			return this.billingService.updateCharge(input, session.user.id) as never
		})
	}

	@RequirePermission("billing", "edit")
	@Implement(billingContract.deleteCharge)
	async deleteCharge(@Session() session: UserSession) {
		return implement(billingContract.deleteCharge).handler(async ({ input }) => {
			return this.billingService.deleteCharge(input.id, session.user.id) as never
		})
	}

	// ========================================================================
	// Invoices
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(billingContract.listInvoices)
	async listInvoices() {
		return implement(billingContract.listInvoices).handler(async ({ input }) => {
			return this.billingService.listInvoices(input) as never
		})
	}

	@RequirePermission("billing", "view")
	@Implement(billingContract.getInvoice)
	async getInvoice() {
		return implement(billingContract.getInvoice).handler(async ({ input }) => {
			return this.billingService.getInvoice(input.id) as never
		})
	}

	@RequirePermission("billing", "create")
	@Implement(billingContract.generateInvoice)
	async generateInvoice(@Session() session: UserSession) {
		return implement(billingContract.generateInvoice).handler(async ({ input }) => {
			return this.billingService.generateInvoice(input, session.user.id) as never
		})
	}

	@RequirePermission("billing", "edit")
	@Implement(billingContract.finalizeInvoice)
	async finalizeInvoice() {
		return implement(billingContract.finalizeInvoice).handler(async ({ input }) => {
			return this.billingService.finalizeInvoice(input.id) as never
		})
	}

	// ========================================================================
	// Payments
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(billingContract.listPayments)
	async listPayments() {
		return implement(billingContract.listPayments).handler(async ({ input }) => {
			return this.billingService.listPayments(input) as never
		})
	}

	@RequirePermission("billing", "create")
	@Implement(billingContract.recordPayment)
	async recordPayment(@Session() session: UserSession) {
		return implement(billingContract.recordPayment).handler(async ({ input }) => {
			return this.billingService.recordPayment(input, session.user.id) as never
		})
	}

	// ========================================================================
	// CF4 Claims
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(billingContract.getCf4)
	async getCf4() {
		return implement(billingContract.getCf4).handler(async ({ input }) => {
			return this.billingService.getCf4(input.id) as never
		})
	}

	@RequirePermission("billing", "create")
	@Implement(billingContract.generateCf4)
	async generateCf4() {
		return implement(billingContract.generateCf4).handler(async ({ input }) => {
			return this.billingService.generateCf4(input) as never
		})
	}

	@RequirePermission("billing", "edit")
	@Implement(billingContract.finalizeCf4)
	async finalizeCf4() {
		return implement(billingContract.finalizeCf4).handler(async ({ input }) => {
			return this.billingService.finalizeCf4(input) as never
		})
	}

	// ========================================================================
	// Eligibility Check
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(billingContract.checkEligibility)
	async checkEligibility(@Session() session: UserSession) {
		return implement(billingContract.checkEligibility).handler(async ({ input }) => {
			return this.billingService.checkEligibility(input, session.user.id) as never
		})
	}

	// ========================================================================
	// Billing Status
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(billingContract.getBillingStatus)
	async getBillingStatus() {
		return implement(billingContract.getBillingStatus).handler(async ({ input }) => {
			return this.billingService.getBillingStatus(input.encounterId) as never
		})
	}

	// ========================================================================
	// Unbilled Encounters
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(billingContract.listUnbilledEncounters)
	async listUnbilledEncounters() {
		return implement(billingContract.listUnbilledEncounters).handler(async ({ input }) => {
			return this.billingService.listUnbilledEncounters(input) as never
		})
	}

	// ========================================================================
	// Statement of Account (SOA)
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(billingContract.getSoa)
	async getSoa() {
		return implement(billingContract.getSoa).handler(async ({ input }) => {
			return this.billingService.getSoa(input) as never
		})
	}

	@RequirePermission("billing", "create")
	@Implement(billingContract.generateSoa)
	async generateSoa() {
		return implement(billingContract.generateSoa).handler(async ({ input }) => {
			return this.billingService.generateSoa(input) as never
		})
	}

	@RequirePermission("billing", "edit")
	@Implement(billingContract.finalizeSoa)
	async finalizeSoa() {
		return implement(billingContract.finalizeSoa).handler(async ({ input }) => {
			return this.billingService.finalizeSoa(input) as never
		})
	}

	// ========================================================================
	// CF5 / DRG Shadow Billing
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(billingContract.getCf5)
	async getCf5() {
		return implement(billingContract.getCf5).handler(async ({ input }) => {
			return this.billingService.getCf5(input) as never
		})
	}

	@RequirePermission("billing", "view")
	@Implement(billingContract.searchDrgCodes)
	async searchDrgCodes() {
		return implement(billingContract.searchDrgCodes).handler(async ({ input }) => {
			return this.billingService.searchDrgCodes(input) as never
		})
	}

	@RequirePermission("billing", "edit")
	@Implement(billingContract.assignDrg)
	async assignDrg() {
		return implement(billingContract.assignDrg).handler(async ({ input }) => {
			return this.billingService.assignDrg(input) as never
		})
	}

	@RequirePermission("billing", "edit")
	@Implement(billingContract.approveCf5)
	async approveCf5() {
		return implement(billingContract.approveCf5).handler(async ({ input }) => {
			return this.billingService.approveCf5(input) as never
		})
	}

	// ========================================================================
	// Konsulta Capitation
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(billingContract.getKonsultaBenefit)
	async getKonsultaBenefit() {
		return implement(billingContract.getKonsultaBenefit).handler(async ({ input }) => {
			return this.billingService.getKonsultaBenefit(input) as never
		})
	}

	@RequirePermission("billing", "create")
	@Implement(billingContract.recordKonsultaVisit)
	async recordKonsultaVisit() {
		return implement(billingContract.recordKonsultaVisit).handler(async ({ input }) => {
			return this.billingService.recordKonsultaVisit(input) as never
		})
	}

	// ========================================================================
	// Malasakit Center
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(billingContract.getMalasakit)
	async getMalasakit() {
		return implement(billingContract.getMalasakit).handler(async ({ input }) => {
			return this.billingService.getMalasakit(input) as never
		})
	}

	@RequirePermission("billing", "create")
	@Implement(billingContract.addMalasakit)
	async addMalasakit() {
		return implement(billingContract.addMalasakit).handler(async ({ input }) => {
			return this.billingService.addMalasakit(input) as never
		})
	}

	@RequirePermission("billing", "edit")
	@Implement(billingContract.updateMalasakitStatus)
	async updateMalasakitStatus() {
		return implement(billingContract.updateMalasakitStatus).handler(async ({ input }) => {
			return this.billingService.updateMalasakitStatus(input) as never
		})
	}

	// ========================================================================
	// Mark Ready for Invoicing (BIL-BE-02)
	// ========================================================================

	@RequirePermission("billing", "edit")
	@Implement(billingContract.markReadyForInvoicing)
	async markReadyForInvoicing(@Session() session: UserSession) {
		return implement(billingContract.markReadyForInvoicing).handler(async ({ input }) => {
			return this.billingService.markReadyForInvoicing({ ...input, staffId: session.user.id }) as never
		})
	}

	// ========================================================================
	// Service Catalog
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(billingContract.searchServiceCatalog)
	async searchServiceCatalog() {
		return implement(billingContract.searchServiceCatalog).handler(async ({ input }) => {
			return this.billingService.searchServiceCatalog(input) as never
		})
	}

	// ========================================================================
	// Apply Discount (BIL-BE-03)
	// ========================================================================

	@RequirePermission("billing", "edit")
	@Implement(billingContract.applyDiscount)
	async applyDiscount(@Session() session: UserSession) {
		return implement(billingContract.applyDiscount).handler(async ({ input }) => {
			return this.billingService.applyDiscount({ ...input, staffId: session.user.id }) as never
		})
	}

	// ========================================================================
	// Issue Receipt (BIL-BE-03)
	// ========================================================================

	@RequirePermission("billing", "create")
	@Implement(billingContract.issueReceipt)
	async issueReceipt(@Session() session: UserSession) {
		return implement(billingContract.issueReceipt).handler(async ({ input }) => {
			return this.billingService.issueReceipt({ paymentId: input.paymentId, staffId: session.user.id }) as never
		})
	}

	// ========================================================================
	// Record Malasakit Payment (BIL-BE-03)
	// ========================================================================

	@RequirePermission("billing", "create")
	@Implement(billingContract.recordMalasakitPayment)
	async recordMalasakitPayment(@Session() session: UserSession) {
		return implement(billingContract.recordMalasakitPayment).handler(async ({ input }) => {
			return this.billingService.recordMalasakitPayment({ ...input, staffId: session.user.id }) as never
		})
	}

	// ========================================================================
	// CF4 XML Preview (BIL-BE-04)
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(billingContract.previewCf4Xml)
	async previewCf4Xml() {
		return implement(billingContract.previewCf4Xml).handler(async ({ input }) => {
			return this.billingService.previewCf4Xml(input.id) as never
		})
	}

	// ========================================================================
	// Poll CF4 Status (BIL-BE-04)
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(billingContract.pollCf4Status)
	async pollCf4Status() {
		return implement(billingContract.pollCf4Status).handler(async ({ input }) => {
			return this.billingService.pollCf4Status(input) as never
		})
	}

	// ========================================================================
	// Resubmit CF4 (BIL-BE-04)
	// ========================================================================

	@RequirePermission("billing", "edit")
	@Implement(billingContract.resubmitCf4)
	async resubmitCf4() {
		return implement(billingContract.resubmitCf4).handler(async ({ input }) => {
			return this.billingService.resubmitCf4(input) as never
		})
	}

	// ========================================================================
	// CEWS
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(billingContract.verifyCewsMembership)
	async verifyCewsMembership() {
		return implement(billingContract.verifyCewsMembership).handler(async ({ input }) => {
			return this.billingService.verifyCewsMembership(input) as never
		})
	}

	@RequirePermission("billing", "create")
	@Implement(billingContract.saveCewsSnapshot)
	async saveCewsSnapshot(@Session() session: UserSession) {
		return implement(billingContract.saveCewsSnapshot).handler(async ({ input }) => {
			return this.billingService.saveCewsSnapshot({ ...input, staffId: session.user.id }) as never
		})
	}

	@RequirePermission("billing", "view")
	@Implement(billingContract.listCewsSnapshots)
	async listCewsSnapshots() {
		return implement(billingContract.listCewsSnapshots).handler(async ({ input }) => {
			return this.billingService.listCewsSnapshots(input) as never
		})
	}

	@RequirePermission("billing", "view")
	@Implement(billingContract.checkCews)
	async checkCews() {
		return implement(billingContract.checkCews).handler(async ({ input }) => {
			return this.billingService.checkCews(input) as never
		})
	}

	// ========================================================================
	// Konsulta Activities (BIL-BE-08)
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(billingContract.listKonsultaActivities)
	async listKonsultaActivities() {
		return implement(billingContract.listKonsultaActivities).handler(async ({ input }) => {
			return this.billingService.listKonsultaActivities(input) as never
		})
	}

	@RequirePermission("billing", "create")
	@Implement(billingContract.recordKonsultaEvent)
	async recordKonsultaEvent() {
		return implement(billingContract.recordKonsultaEvent).handler(async ({ input }) => {
			return this.billingService.recordKonsultaEvent(input) as never
		})
	}

	@RequirePermission("billing", "create")
	@Implement(billingContract.generateKonsultaReport)
	async generateKonsultaReport() {
		return implement(billingContract.generateKonsultaReport).handler(async ({ input }) => {
			return this.billingService.generateKonsultaReport(input) as never
		})
	}

	// ========================================================================
	// CF5 with Billing (BIL-BE-05)
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(billingContract.getCf5WithBilling)
	async getCf5WithBilling() {
		return implement(billingContract.getCf5WithBilling).handler(async ({ input }) => {
			return this.billingService.getCf5WithBilling(input) as never
		})
	}

	@RequirePermission("billing", "edit")
	@Implement(billingContract.linkChargeToIcd)
	async linkChargeToIcd() {
		return implement(billingContract.linkChargeToIcd).handler(async ({ input }) => {
			return this.billingService.linkChargeToIcd(input) as never
		})
	}

	// ========================================================================
	// eSOA (BIL-BE-06)
	// ========================================================================

	@RequirePermission("billing", "create")
	@Implement(billingContract.generateEsoa)
	async generateEsoa() {
		return implement(billingContract.generateEsoa).handler(async ({ input }) => {
			return this.billingService.generateEsoa(input) as never
		})
	}

	// ========================================================================
	// BIL-BE-05: DRG Suggest / Confirm + CF5 lifecycle
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(billingContract.suggestDrg)
	async suggestDrg() {
		return implement(billingContract.suggestDrg).handler(async ({ input }) => {
			return this.billingService.suggestDrg(input) as never
		})
	}

	@RequirePermission("billing", "create")
	@Implement(billingContract.confirmDrg)
	async confirmDrg(@Session() session: UserSession) {
		return implement(billingContract.confirmDrg).handler(async ({ input }) => {
			return this.billingService.confirmDrg(input, session.user.id) as never
		})
	}

	@RequirePermission("billing", "create")
	@Implement(billingContract.generateCf5)
	async generateCf5(@Session() session: UserSession) {
		return implement(billingContract.generateCf5).handler(async ({ input }) => {
			return this.billingService.generateCf5(input, session.user.id) as never
		})
	}

	@RequirePermission("billing", "view")
	@Implement(billingContract.getCf5Claim)
	async getCf5Claim() {
		return implement(billingContract.getCf5Claim).handler(async ({ input }) => {
			return this.billingService.getCf5Claim(input) as never
		})
	}

	@RequirePermission("billing", "view")
	@Implement(billingContract.listCf5Claims)
	async listCf5Claims() {
		return implement(billingContract.listCf5Claims).handler(async ({ input }) => {
			return this.billingService.listCf5Claims(input) as never
		})
	}

	@RequirePermission("billing", "view")
	@Implement(billingContract.previewCf5Xml)
	async previewCf5Xml() {
		return implement(billingContract.previewCf5Xml).handler(async ({ input }) => {
			return this.billingService.previewCf5Xml(input) as never
		})
	}

	@RequirePermission("billing", "create")
	@Implement(billingContract.submitCf5)
	async submitCf5(@Session() session: UserSession) {
		return implement(billingContract.submitCf5).handler(async ({ input }) => {
			return this.billingService.submitCf5(input, session.user.id) as never
		})
	}

	@RequirePermission("billing", "view")
	@Implement(billingContract.pollCf5Status)
	async pollCf5Status() {
		return implement(billingContract.pollCf5Status).handler(async ({ input }) => {
			return this.billingService.pollCf5Status(input) as never
		})
	}

	@RequirePermission("billing", "create")
	@Implement(billingContract.resubmitCf5)
	async resubmitCf5(@Session() session: UserSession) {
		return implement(billingContract.resubmitCf5).handler(async ({ input }) => {
			return this.billingService.resubmitCf5(input, session.user.id) as never
		})
	}

	// ========================================================================
	// BIL-BE-06: eSOA list / send / generate from invoice
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(billingContract.listEsoaStatements)
	async listEsoaStatements() {
		return implement(billingContract.listEsoaStatements).handler(async ({ input }) => {
			return this.billingService.listEsoaStatements(input) as never
		})
	}

	@RequirePermission("billing", "create")
	@Implement(billingContract.sendEsoa)
	async sendEsoa() {
		return implement(billingContract.sendEsoa).handler(async ({ input }) => {
			return this.billingService.sendEsoa(input) as never
		})
	}

	@RequirePermission("billing", "create")
	@Implement(billingContract.generateEsoaFromInvoice)
	async generateEsoaFromInvoice() {
		return implement(billingContract.generateEsoaFromInvoice).handler(async ({ input }) => {
			return this.billingService.generateEsoaFromInvoice(input) as never
		})
	}
}
