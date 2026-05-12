import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { billingContract } from "@repo/contracts"

import { v1 } from "@/config/api-versions.config"
import { RequireAnyPermissions, RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { BillingService } from "./billing.service"

// Runtime billing procedures with full /v1/billing/* paths, fully typed via billingContract
const billingV1 = v1.billing as unknown as typeof billingContract

@Controller()
export class BillingController {
	constructor(private readonly billingService: BillingService) {}

	// ========================================================================
	// Charge Master
	// ========================================================================

	@RequireAnyPermissions([
		{ module: "billing.charges", action: "read" },
		{ module: "billing", action: "view" },
	])
	@Implement(billingV1.listChargeMasterItems)
	async listChargeMasterItems() {
		return implement(billingV1.listChargeMasterItems).handler(async ({ input }) => {
			return this.billingService.listChargeMasterItems(input) as never
		})
	}

	// ========================================================================
	// Charges
	// ========================================================================

	@RequireAnyPermissions([
		{ module: "billing.charges", action: "read" },
		{ module: "billing", action: "view" },
	])
	@Implement(billingV1.listCharges)
	async listCharges() {
		return implement(billingV1.listCharges).handler(async ({ input }) => {
			return this.billingService.listCharges(input) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "billing.charges", action: "write" },
		{ module: "billing", action: "create" },
	])
	@Implement(billingV1.createCharge)
	async createCharge(@Session() session: UserSession) {
		return implement(billingV1.createCharge).handler(async ({ input }) => {
			return this.billingService.createCharge(input, session.user.id) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "billing.charges", action: "write" },
		{ module: "billing", action: "edit" },
	])
	@Implement(billingV1.updateCharge)
	async updateCharge(@Session() session: UserSession) {
		return implement(billingV1.updateCharge).handler(async ({ input }) => {
			return this.billingService.updateCharge(input, session.user.id) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "billing.charges", action: "write" },
		{ module: "billing", action: "edit" },
	])
	@Implement(billingV1.deleteCharge)
	async deleteCharge(@Session() session: UserSession) {
		return implement(billingV1.deleteCharge).handler(async ({ input }) => {
			return this.billingService.deleteCharge(input.id, session.user.id) as never
		})
	}

	// ========================================================================
	// Invoices
	// ========================================================================

	@RequireAnyPermissions([
		{ module: "billing.invoices", action: "read" },
		{ module: "billing", action: "view" },
	])
	@Implement(billingV1.listInvoices)
	async listInvoices() {
		return implement(billingV1.listInvoices).handler(async ({ input }) => {
			return this.billingService.listInvoices(input) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "billing.invoices", action: "read" },
		{ module: "billing", action: "view" },
	])
	@Implement(billingV1.getInvoice)
	async getInvoice() {
		return implement(billingV1.getInvoice).handler(async ({ input }) => {
			return this.billingService.getInvoice(input.id) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "billing.invoices", action: "write" },
		{ module: "billing", action: "create" },
	])
	@Implement(billingV1.generateInvoice)
	async generateInvoice(@Session() session: UserSession) {
		return implement(billingV1.generateInvoice).handler(async ({ input }) => {
			return this.billingService.generateInvoice(input, session.user.id) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "billing.invoices", action: "write" },
		{ module: "billing", action: "edit" },
	])
	@Implement(billingV1.finalizeInvoice)
	async finalizeInvoice() {
		return implement(billingV1.finalizeInvoice).handler(async ({ input }) => {
			return this.billingService.finalizeInvoice(input.id) as never
		})
	}

	// ========================================================================
	// Payments
	// ========================================================================

	@RequireAnyPermissions([
		{ module: "billing.payments", action: "read" },
		{ module: "billing", action: "view" },
	])
	@Implement(billingV1.listPayments)
	async listPayments() {
		return implement(billingV1.listPayments).handler(async ({ input }) => {
			return this.billingService.listPayments(input) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "billing.payments", action: "write" },
		{ module: "billing", action: "create" },
	])
	@Implement(billingV1.recordPayment)
	async recordPayment(@Session() session: UserSession) {
		return implement(billingV1.recordPayment).handler(async ({ input }) => {
			return this.billingService.recordPayment(input, session.user.id) as never
		})
	}

	// ========================================================================
	// CF4 Claims
	// ========================================================================

	@RequireAnyPermissions([
		{ module: "billing.cf4", action: "read" },
		{ module: "billing", action: "view" },
	])
	@Implement(billingV1.getCf4)
	async getCf4() {
		return implement(billingV1.getCf4).handler(async ({ input }) => {
			return this.billingService.getCf4(input.id) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "billing.cf4", action: "write" },
		{ module: "billing", action: "create" },
	])
	@Implement(billingV1.generateCf4)
	async generateCf4() {
		return implement(billingV1.generateCf4).handler(async ({ input }) => {
			return this.billingService.generateCf4(input) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "billing.cf4", action: "write" },
		{ module: "billing", action: "edit" },
	])
	@Implement(billingV1.finalizeCf4)
	async finalizeCf4() {
		return implement(billingV1.finalizeCf4).handler(async ({ input }) => {
			return this.billingService.finalizeCf4(input) as never
		})
	}

	// ========================================================================
	// Eligibility Check
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(billingV1.checkEligibility)
	async checkEligibility(@Session() session: UserSession) {
		return implement(billingV1.checkEligibility).handler(async ({ input }) => {
			return this.billingService.checkEligibility(input, session.user.id) as never
		})
	}

	// ========================================================================
	// Billing Status
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(billingV1.getBillingStatus)
	async getBillingStatus() {
		return implement(billingV1.getBillingStatus).handler(async ({ input }) => {
			return this.billingService.getBillingStatus(input.encounterId) as never
		})
	}

	// ========================================================================
	// Unbilled Encounters
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(billingV1.listUnbilledEncounters)
	async listUnbilledEncounters() {
		return implement(billingV1.listUnbilledEncounters).handler(async ({ input }) => {
			return this.billingService.listUnbilledEncounters(input) as never
		})
	}

	// ========================================================================
	// Statement of Account (SOA)
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(billingV1.getSoa)
	async getSoa() {
		return implement(billingV1.getSoa).handler(async ({ input }) => {
			return this.billingService.getSoa(input) as never
		})
	}

	@RequirePermission("billing", "create")
	@Implement(billingV1.generateSoa)
	async generateSoa() {
		return implement(billingV1.generateSoa).handler(async ({ input }) => {
			return this.billingService.generateSoa(input) as never
		})
	}

	@RequirePermission("billing", "edit")
	@Implement(billingV1.finalizeSoa)
	async finalizeSoa() {
		return implement(billingV1.finalizeSoa).handler(async ({ input }) => {
			return this.billingService.finalizeSoa(input) as never
		})
	}

	// ========================================================================
	// CF5 / DRG Shadow Billing
	// ========================================================================

	@RequireAnyPermissions([
		{ module: "billing.cf5", action: "read" },
		{ module: "billing", action: "view" },
	])
	@Implement(billingV1.getCf5)
	async getCf5() {
		return implement(billingV1.getCf5).handler(async ({ input }) => {
			return this.billingService.getCf5(input) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "billing.drg", action: "read" },
		{ module: "billing", action: "view" },
	])
	@Implement(billingV1.searchDrgCodes)
	async searchDrgCodes() {
		return implement(billingV1.searchDrgCodes).handler(async ({ input }) => {
			return this.billingService.searchDrgCodes(input) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "billing.drg", action: "write" },
		{ module: "billing", action: "edit" },
	])
	@Implement(billingV1.assignDrg)
	async assignDrg() {
		return implement(billingV1.assignDrg).handler(async ({ input }) => {
			return this.billingService.assignDrg(input) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "billing.cf5", action: "write" },
		{ module: "billing", action: "edit" },
	])
	@Implement(billingV1.approveCf5)
	async approveCf5() {
		return implement(billingV1.approveCf5).handler(async ({ input }) => {
			return this.billingService.approveCf5(input) as never
		})
	}

	// ========================================================================
	// Konsulta Capitation
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(billingV1.getKonsultaBenefit)
	async getKonsultaBenefit() {
		return implement(billingV1.getKonsultaBenefit).handler(async ({ input }) => {
			return this.billingService.getKonsultaBenefit(input) as never
		})
	}

	@RequirePermission("billing", "create")
	@Implement(billingV1.recordKonsultaVisit)
	async recordKonsultaVisit() {
		return implement(billingV1.recordKonsultaVisit).handler(async ({ input }) => {
			return this.billingService.recordKonsultaVisit(input) as never
		})
	}

	// ========================================================================
	// Malasakit Center
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(billingV1.getMalasakit)
	async getMalasakit() {
		return implement(billingV1.getMalasakit).handler(async ({ input }) => {
			return this.billingService.getMalasakit(input) as never
		})
	}

	@RequirePermission("billing", "create")
	@Implement(billingV1.addMalasakit)
	async addMalasakit() {
		return implement(billingV1.addMalasakit).handler(async ({ input }) => {
			return this.billingService.addMalasakit(input) as never
		})
	}

	@RequirePermission("billing", "edit")
	@Implement(billingV1.updateMalasakitStatus)
	async updateMalasakitStatus() {
		return implement(billingV1.updateMalasakitStatus).handler(async ({ input }) => {
			return this.billingService.updateMalasakitStatus(input) as never
		})
	}

	// ========================================================================
	// Mark Ready for Invoicing (BIL-BE-02)
	// ========================================================================

	@RequireAnyPermissions([
		{ module: "billing.charges", action: "write" },
		{ module: "billing", action: "edit" },
	])
	@Implement(billingV1.markReadyForInvoicing)
	async markReadyForInvoicing(@Session() session: UserSession) {
		return implement(billingV1.markReadyForInvoicing).handler(async ({ input }) => {
			return this.billingService.markReadyForInvoicing({
				...input,
				staffId: session.user.id,
			}) as never
		})
	}

	// ========================================================================
	// Service Catalog
	// ========================================================================

	@RequireAnyPermissions([
		{ module: "billing.charges", action: "read" },
		{ module: "billing", action: "view" },
	])
	@Implement(billingV1.searchServiceCatalog)
	async searchServiceCatalog() {
		return implement(billingV1.searchServiceCatalog).handler(async ({ input }) => {
			return this.billingService.searchServiceCatalog(input) as never
		})
	}

	// ========================================================================
	// Apply Discount (BIL-BE-03)
	// ========================================================================

	@RequireAnyPermissions([
		{ module: "billing.invoices", action: "write" },
		{ module: "billing", action: "edit" },
	])
	@Implement(billingV1.applyDiscount)
	async applyDiscount(@Session() session: UserSession) {
		return implement(billingV1.applyDiscount).handler(async ({ input }) => {
			return this.billingService.applyDiscount({ ...input, staffId: session.user.id }) as never
		})
	}

	// ========================================================================
	// Issue Receipt (BIL-BE-03)
	// ========================================================================

	@RequireAnyPermissions([
		{ module: "billing.payments", action: "write" },
		{ module: "billing", action: "create" },
	])
	@Implement(billingV1.issueReceipt)
	async issueReceipt(@Session() session: UserSession) {
		return implement(billingV1.issueReceipt).handler(async ({ input }) => {
			return this.billingService.issueReceipt({
				paymentId: input.paymentId,
				staffId: session.user.id,
			}) as never
		})
	}

	// ========================================================================
	// Record Malasakit Payment (BIL-BE-03)
	// ========================================================================

	@RequireAnyPermissions([
		{ module: "billing.payments", action: "write" },
		{ module: "billing", action: "create" },
	])
	@Implement(billingV1.recordMalasakitPayment)
	async recordMalasakitPayment(@Session() session: UserSession) {
		return implement(billingV1.recordMalasakitPayment).handler(async ({ input }) => {
			return this.billingService.recordMalasakitPayment({
				...input,
				staffId: session.user.id,
			}) as never
		})
	}

	// ========================================================================
	// CF4 XML Preview (BIL-BE-04)
	// ========================================================================

	@RequireAnyPermissions([
		{ module: "billing.cf4", action: "read" },
		{ module: "billing", action: "view" },
	])
	@Implement(billingV1.previewCf4Xml)
	async previewCf4Xml() {
		return implement(billingV1.previewCf4Xml).handler(async ({ input }) => {
			return this.billingService.previewCf4Xml(input.id) as never
		})
	}

	// ========================================================================
	// Poll CF4 Status (BIL-BE-04)
	// ========================================================================

	@RequireAnyPermissions([
		{ module: "billing.cf4", action: "read" },
		{ module: "billing", action: "view" },
	])
	@Implement(billingV1.pollCf4Status)
	async pollCf4Status() {
		return implement(billingV1.pollCf4Status).handler(async ({ input }) => {
			return this.billingService.pollCf4Status(input) as never
		})
	}

	// ========================================================================
	// Resubmit CF4 (BIL-BE-04)
	// ========================================================================

	@RequireAnyPermissions([
		{ module: "billing.cf4", action: "write" },
		{ module: "billing", action: "edit" },
	])
	@Implement(billingV1.resubmitCf4)
	async resubmitCf4() {
		return implement(billingV1.resubmitCf4).handler(async ({ input }) => {
			return this.billingService.resubmitCf4(input) as never
		})
	}

	// ========================================================================
	// CEWS
	// ========================================================================

	@RequireAnyPermissions([
		{ module: "billing.cews", action: "read" },
		{ module: "billing", action: "view" },
	])
	@Implement(billingV1.verifyCewsMembership)
	async verifyCewsMembership() {
		return implement(billingV1.verifyCewsMembership).handler(async ({ input }) => {
			return this.billingService.verifyCewsMembership(input) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "billing.cews", action: "write" },
		{ module: "billing", action: "create" },
	])
	@Implement(billingV1.saveCewsSnapshot)
	async saveCewsSnapshot(@Session() session: UserSession) {
		return implement(billingV1.saveCewsSnapshot).handler(async ({ input }) => {
			return this.billingService.saveCewsSnapshot({ ...input, staffId: session.user.id }) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "billing.cews", action: "read" },
		{ module: "billing", action: "view" },
	])
	@Implement(billingV1.listCewsSnapshots)
	async listCewsSnapshots() {
		return implement(billingV1.listCewsSnapshots).handler(async ({ input }) => {
			return this.billingService.listCewsSnapshots(input) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "billing.cews", action: "read" },
		{ module: "billing", action: "view" },
	])
	@Implement(billingV1.checkCews)
	async checkCews() {
		return implement(billingV1.checkCews).handler(async ({ input }) => {
			return this.billingService.checkCews(input) as never
		})
	}

	// ========================================================================
	// Konsulta Activities (BIL-BE-08)
	// ========================================================================

	@RequireAnyPermissions([
		{ module: "billing.konsulta", action: "read" },
		{ module: "billing", action: "view" },
	])
	@Implement(billingV1.listKonsultaActivities)
	async listKonsultaActivities() {
		return implement(billingV1.listKonsultaActivities).handler(async ({ input }) => {
			return this.billingService.listKonsultaActivities(input) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "billing.konsulta", action: "read" },
		{ module: "billing", action: "view" },
	])
	@Implement(billingV1.listKonsultaTrackerRows)
	async listKonsultaTrackerRows() {
		return implement(billingV1.listKonsultaTrackerRows).handler(async ({ input }) => {
			return this.billingService.listKonsultaTrackerRows(input) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "billing.konsulta", action: "write" },
		{ module: "billing", action: "create" },
	])
	@Implement(billingV1.recordKonsultaEvent)
	async recordKonsultaEvent() {
		return implement(billingV1.recordKonsultaEvent).handler(async ({ input }) => {
			return this.billingService.recordKonsultaEvent(input) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "billing.konsulta", action: "read" },
		{ module: "billing", action: "view" },
	])
	@Implement(billingV1.generateKonsultaReport)
	async generateKonsultaReport() {
		return implement(billingV1.generateKonsultaReport).handler(async ({ input }) => {
			return this.billingService.generateKonsultaReport(input) as never
		})
	}

	// ========================================================================
	// CF5 with Billing (BIL-BE-05)
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(billingV1.getCf5WithBilling)
	async getCf5WithBilling() {
		return implement(billingV1.getCf5WithBilling).handler(async ({ input }) => {
			return this.billingService.getCf5WithBilling(input) as never
		})
	}

	@RequirePermission("billing", "edit")
	@Implement(billingV1.linkChargeToIcd)
	async linkChargeToIcd() {
		return implement(billingV1.linkChargeToIcd).handler(async ({ input }) => {
			return this.billingService.linkChargeToIcd(input) as never
		})
	}

	// ========================================================================
	// eSOA (BIL-BE-06)
	// ========================================================================

	@RequirePermission("billing", "create")
	@Implement(billingV1.generateEsoa)
	async generateEsoa() {
		return implement(billingV1.generateEsoa).handler(async ({ input }) => {
			return this.billingService.generateEsoa(input) as never
		})
	}

	// ========================================================================
	// BIL-BE-05: DRG Suggest / Confirm + CF5 lifecycle
	// ========================================================================

	@RequirePermission("billing", "view")
	@Implement(billingV1.suggestDrg)
	async suggestDrg() {
		return implement(billingV1.suggestDrg).handler(async ({ input }) => {
			return this.billingService.suggestDrg(input) as never
		})
	}

	@RequirePermission("billing", "create")
	@Implement(billingV1.confirmDrg)
	async confirmDrg(@Session() session: UserSession) {
		return implement(billingV1.confirmDrg).handler(async ({ input }) => {
			return this.billingService.confirmDrg(input, session.user.id) as never
		})
	}

	@RequirePermission("billing", "create")
	@Implement(billingV1.generateCf5)
	async generateCf5(@Session() session: UserSession) {
		return implement(billingV1.generateCf5).handler(async ({ input }) => {
			return this.billingService.generateCf5(input, session.user.id) as never
		})
	}

	@RequirePermission("billing", "view")
	@Implement(billingV1.getCf5Claim)
	async getCf5Claim() {
		return implement(billingV1.getCf5Claim).handler(async ({ input }) => {
			return this.billingService.getCf5Claim(input) as never
		})
	}

	@RequirePermission("billing", "view")
	@Implement(billingV1.listCf5Claims)
	async listCf5Claims() {
		return implement(billingV1.listCf5Claims).handler(async ({ input }) => {
			return this.billingService.listCf5Claims(input) as never
		})
	}

	@RequirePermission("billing", "view")
	@Implement(billingV1.previewCf5Xml)
	async previewCf5Xml() {
		return implement(billingV1.previewCf5Xml).handler(async ({ input }) => {
			return this.billingService.previewCf5Xml(input) as never
		})
	}

	@RequirePermission("billing", "create")
	@Implement(billingV1.submitCf5)
	async submitCf5(@Session() session: UserSession) {
		return implement(billingV1.submitCf5).handler(async ({ input }) => {
			return this.billingService.submitCf5(input, session.user.id) as never
		})
	}

	@RequirePermission("billing", "view")
	@Implement(billingV1.pollCf5Status)
	async pollCf5Status() {
		return implement(billingV1.pollCf5Status).handler(async ({ input }) => {
			return this.billingService.pollCf5Status(input) as never
		})
	}

	@RequirePermission("billing", "create")
	@Implement(billingV1.resubmitCf5)
	async resubmitCf5(@Session() session: UserSession) {
		return implement(billingV1.resubmitCf5).handler(async ({ input }) => {
			return this.billingService.resubmitCf5(input, session.user.id) as never
		})
	}

	// ========================================================================
	// BIL-BE-06: eSOA list / send / generate from invoice
	// ========================================================================

	@RequireAnyPermissions([
		{ module: "billing.esoa", action: "read" },
		{ module: "billing", action: "view" },
	])
	@Implement(billingV1.listEsoaStatements)
	async listEsoaStatements() {
		return implement(billingV1.listEsoaStatements).handler(async ({ input }) => {
			return this.billingService.listEsoaStatements(input) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "billing.esoa", action: "write" },
		{ module: "billing", action: "create" },
	])
	@Implement(billingV1.sendEsoa)
	async sendEsoa(@Session() session: UserSession) {
		return implement(billingV1.sendEsoa).handler(async ({ input }) => {
			return this.billingService.sendEsoa({ ...input, staffId: session.user.id }) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "billing.esoa", action: "write" },
		{ module: "billing", action: "create" },
	])
	@Implement(billingV1.generateEsoaFromInvoice)
	async generateEsoaFromInvoice() {
		return implement(billingV1.generateEsoaFromInvoice).handler(async ({ input }) => {
			return this.billingService.generateEsoaFromInvoice(input) as never
		})
	}
}
