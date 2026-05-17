import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequirePermission, RequirePermissions } from "@/modules/v1/rbac/rbac.guard"

import { OrdersService } from "./orders.service"

@Controller()
export class OrdersController {
	constructor(private readonly ordersService: OrdersService) {}

	// ========================================================================
	// CDS Evaluation
	// ========================================================================

	@RequirePermission("orders", "view")
	@Implement(v1.orders.evaluateCds)
	async evaluateCds() {
		return implement(v1.orders.evaluateCds).handler(async ({ input }) => {
			return this.ordersService.evaluateCds(input)
		})
	}

	// ========================================================================
	// Medication Orders
	// ========================================================================

	@RequirePermission("orders", "view")
	@Implement(v1.orders.listMedOrders)
	async listMedOrders() {
		return implement(v1.orders.listMedOrders).handler(async ({ input }) => {
			return this.ordersService.findMedOrders(input)
		})
	}

	@RequirePermission("orders", "view")
	@Implement(v1.orders.getMedOrder)
	async getMedOrder() {
		return implement(v1.orders.getMedOrder).handler(async ({ input }) => {
			return this.ordersService.findMedOrder(input.id)
		})
	}

	@RequirePermissions([
		{ module: "orders", action: "create" },
		{ module: "orders", action: "sign" },
	])
	@Implement(v1.orders.createMedOrder)
	async createMedOrder(@Session() session: UserSession) {
		return implement(v1.orders.createMedOrder).handler(async ({ input }) => {
			return this.ordersService.createMedOrder(input, session.user.id)
		})
	}

	@RequirePermission("orders", "edit")
	@Implement(v1.orders.updateMedOrder)
	async updateMedOrder() {
		return implement(v1.orders.updateMedOrder).handler(async ({ input }) => {
			return this.ordersService.updateMedOrder(input)
		})
	}

	@RequirePermission("orders", "edit")
	@Implement(v1.orders.discontinueMedOrder)
	async discontinueMedOrder() {
		return implement(v1.orders.discontinueMedOrder).handler(async ({ input }) => {
			return this.ordersService.discontinueMedOrder(input.id)
		})
	}

	// ========================================================================
	// Lab Orders
	// ========================================================================

	@RequirePermission("orders", "view")
	@Implement(v1.orders.listLabOrders)
	async listLabOrders() {
		return implement(v1.orders.listLabOrders).handler(async ({ input }) => {
			return this.ordersService.findLabOrders(input)
		})
	}

	@RequirePermission("orders", "view")
	@Implement(v1.orders.getLabOrder)
	async getLabOrder() {
		return implement(v1.orders.getLabOrder).handler(async ({ input }) => {
			return this.ordersService.findLabOrder(input.id)
		})
	}

	@RequirePermission("orders", "create")
	@Implement(v1.orders.createLabOrder)
	async createLabOrder(@Session() session: UserSession) {
		return implement(v1.orders.createLabOrder).handler(async ({ input }) => {
			return this.ordersService.createLabOrder(input, session.user.id)
		})
	}

	@RequirePermission("orders", "edit")
	@Implement(v1.orders.updateLabOrder)
	async updateLabOrder() {
		return implement(v1.orders.updateLabOrder).handler(async ({ input }) => {
			return this.ordersService.updateLabOrder(input)
		})
	}

	// ========================================================================
	// Imaging Orders
	// ========================================================================

	@RequirePermission("orders", "view")
	@Implement(v1.orders.listImagingOrders)
	async listImagingOrders() {
		return implement(v1.orders.listImagingOrders).handler(async ({ input }) => {
			return this.ordersService.findImagingOrders(input)
		})
	}

	@RequirePermission("orders", "view")
	@Implement(v1.orders.getImagingOrder)
	async getImagingOrder() {
		return implement(v1.orders.getImagingOrder).handler(async ({ input }) => {
			return this.ordersService.findImagingOrder(input.id)
		})
	}

	@RequirePermission("orders", "create")
	@Implement(v1.orders.createImagingOrder)
	async createImagingOrder(@Session() session: UserSession) {
		return implement(v1.orders.createImagingOrder).handler(async ({ input }) => {
			return this.ordersService.createImagingOrder(input, session.user.id)
		})
	}

	@RequirePermission("orders", "edit")
	@Implement(v1.orders.updateImagingOrder)
	async updateImagingOrder() {
		return implement(v1.orders.updateImagingOrder).handler(async ({ input }) => {
			return this.ordersService.updateImagingOrder(input)
		})
	}

	// ========================================================================
	// Pharmacy Verification
	// ========================================================================

	@RequirePermission("orders", "view")
	@Implement(v1.orders.getVerificationQueue)
	async getVerificationQueue() {
		return implement(v1.orders.getVerificationQueue).handler(async ({ input }) => {
			return this.ordersService.getVerificationQueue(input)
		})
	}

	@RequirePermission("orders", "verify")
	@Implement(v1.orders.verifyOrder)
	async verifyOrder(@Session() session: UserSession) {
		return implement(v1.orders.verifyOrder).handler(async ({ input }) => {
			return this.ordersService.verifyOrder(input, session.user.id)
		})
	}

	@RequirePermission("orders", "create")
	@Implement(v1.orders.createHighAlertVerification)
	async createHighAlertVerification(@Session() session: UserSession) {
		return implement(v1.orders.createHighAlertVerification).handler(async ({ input }) => {
			return this.ordersService.createHighAlertVerification(input, session.user.id)
		})
	}

	@RequirePermission("orders", "view")
	@Implement(v1.orders.getHighAlertVerification)
	async getHighAlertVerification() {
		return implement(v1.orders.getHighAlertVerification).handler(async ({ input }) => {
			return this.ordersService.getHighAlertVerification(input.medicationOrderId)
		})
	}

	// ========================================================================
	// Prescriptions
	// ========================================================================

	@RequirePermission("orders", "view")
	@Implement(v1.orders.listPrescriptions)
	async listPrescriptions() {
		return implement(v1.orders.listPrescriptions).handler(async ({ input }) => {
			return this.ordersService.findPrescriptions(input)
		})
	}

	@RequirePermission("orders", "view")
	@Implement(v1.orders.getPrescription)
	async getPrescription() {
		return implement(v1.orders.getPrescription).handler(async ({ input }) => {
			return this.ordersService.findPrescription(input.id)
		})
	}

	@RequirePermission("orders", "create")
	@Implement(v1.orders.createPrescription)
	async createPrescription(@Session() session: UserSession) {
		return implement(v1.orders.createPrescription).handler(async ({ input }) => {
			return this.ordersService.createPrescription(input, session.user.id)
		})
	}

	@RequirePermission("orders", "sign")
	@Implement(v1.orders.signPrescription)
	async signPrescription(@Session() session: UserSession) {
		return implement(v1.orders.signPrescription).handler(async ({ input }) => {
			return this.ordersService.signPrescription(input.id, session.user.id)
		})
	}

	// ========================================================================
	// Active Orders
	// ========================================================================

	@RequirePermission("orders", "view")
	@Implement(v1.orders.getActiveOrders)
	async getActiveOrders() {
		return implement(v1.orders.getActiveOrders).handler(async ({ input }) => {
			return this.ordersService.getActiveOrders(input)
		})
	}

	// ========================================================================
	// PDEA License Check (AD-010)
	// ========================================================================

	@RequirePermission("orders", "view")
	@Implement(v1.orders.checkPdeaLicense)
	async checkPdeaLicense() {
		return implement(v1.orders.checkPdeaLicense).handler(async ({ input }) => {
			return this.ordersService.checkPdeaLicense(input)
		})
	}

	// ========================================================================
	// PDEA Tranching (AD-010)
	// ========================================================================

	@RequirePermission("orders", "view")
	@Implement(v1.orders.previewTranches)
	async previewTranches() {
		return implement(v1.orders.previewTranches).handler(async ({ input }) => {
			return this.ordersService.previewTranches(input)
		})
	}

	@RequirePermissions([
		{ module: "orders", action: "create" },
		{ module: "orders", action: "sign" },
	])
	@Implement(v1.orders.createTranchedOrders)
	async createTranchedOrders(@Session() session: UserSession) {
		return implement(v1.orders.createTranchedOrders).handler(async ({ input }) => {
			return this.ordersService.createTranchedOrders(input, session.user.id)
		})
	}

	@RequirePermission("orders", "view")
	@Implement(v1.orders.getChildOrders)
	async getChildOrders() {
		return implement(v1.orders.getChildOrders).handler(async ({ input }) => {
			return this.ordersService.getChildOrders(input.parentOrderId)
		})
	}

	// ========================================================================
	// Dispense (Inpatient)
	// ========================================================================

	@RequirePermission("orders", "verify")
	@Implement(v1.orders.dispenseOrder)
	async dispenseOrder(@Session() session: UserSession) {
		return implement(v1.orders.dispenseOrder).handler(async ({ input }) => {
			return this.ordersService.dispenseOrder(input, session.user.id)
		})
	}

	@RequirePermission("orders", "verify")
	@Implement(v1.orders.listDispenseLogs)
	async listDispenseLogs() {
		return implement(v1.orders.listDispenseLogs).handler(async ({ input }) => {
			return this.ordersService.findDispenseLogs(input)
		})
	}

	@RequirePermission("orders", "verify")
	@Implement(v1.orders.getDispenseLog)
	async getDispenseLog() {
		return implement(v1.orders.getDispenseLog).handler(async ({ input }) => {
			return this.ordersService.findDispenseLog(input.id)
		})
	}

	// ========================================================================
	// OPD Dispensing
	// ========================================================================

	@RequirePermission("orders", "verify")
	@Implement(v1.orders.listOpdPrescriptions)
	async listOpdPrescriptions() {
		return implement(v1.orders.listOpdPrescriptions).handler(async ({ input }) => {
			return this.ordersService.listOpdPrescriptions(input)
		})
	}

	@RequirePermission("orders", "verify")
	@Implement(v1.orders.searchOpdPrescription)
	async searchOpdPrescription() {
		return implement(v1.orders.searchOpdPrescription).handler(async ({ input }) => {
			return this.ordersService.searchOpdPrescription(input)
		})
	}

	@RequirePermission("orders", "verify")
	@Implement(v1.orders.opdDispense)
	async opdDispense(@Session() session: UserSession) {
		return implement(v1.orders.opdDispense).handler(async ({ input }) => {
			return this.ordersService.opdDispense(input, session.user.id)
		})
	}

	@RequirePermission("orders", "verify")
	@Implement(v1.orders.listOpdDispenseHistory)
	async listOpdDispenseHistory() {
		return implement(v1.orders.listOpdDispenseHistory).handler(async ({ input }) => {
			return this.ordersService.listOpdDispenseHistory(input)
		})
	}

	// ========================================================================
	// Patient Counseling
	// ========================================================================

	@RequirePermission("orders", "verify")
	@Implement(v1.orders.saveCounselingLog)
	async saveCounselingLog(@Session() session: UserSession) {
		return implement(v1.orders.saveCounselingLog).handler(async ({ input }) => {
			return this.ordersService.saveCounselingLog(input, session.user.id)
		})
	}

	@RequirePermission("orders", "verify")
	@Implement(v1.orders.listCounselingLogs)
	async listCounselingLogs() {
		return implement(v1.orders.listCounselingLogs).handler(async ({ input }) => {
			return this.ordersService.findCounselingLogs(input)
		})
	}
}
