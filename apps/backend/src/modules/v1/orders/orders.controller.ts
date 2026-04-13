import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"

import { OrdersService } from "./orders.service"

@Controller()
export class OrdersController {
	constructor(private readonly ordersService: OrdersService) {}

	// ========================================================================
	// CDS Evaluation
	// ========================================================================

	@Implement(v1.orders.evaluateCds)
	async evaluateCds() {
		return implement(v1.orders.evaluateCds).handler(async ({ input }) => {
			return this.ordersService.evaluateCds(input)
		})
	}

	// ========================================================================
	// Medication Orders
	// ========================================================================

	@Implement(v1.orders.listMedOrders)
	async listMedOrders() {
		return implement(v1.orders.listMedOrders).handler(async ({ input }) => {
			return this.ordersService.findMedOrders(input)
		})
	}

	@Implement(v1.orders.getMedOrder)
	async getMedOrder() {
		return implement(v1.orders.getMedOrder).handler(async ({ input }) => {
			return this.ordersService.findMedOrder(input.id)
		})
	}

	@Implement(v1.orders.createMedOrder)
	async createMedOrder(@Session() session: UserSession) {
		return implement(v1.orders.createMedOrder).handler(async ({ input }) => {
			return this.ordersService.createMedOrder(input, session.user.id)
		})
	}

	@Implement(v1.orders.updateMedOrder)
	async updateMedOrder() {
		return implement(v1.orders.updateMedOrder).handler(async ({ input }) => {
			return this.ordersService.updateMedOrder(input)
		})
	}

	@Implement(v1.orders.discontinueMedOrder)
	async discontinueMedOrder() {
		return implement(v1.orders.discontinueMedOrder).handler(async ({ input }) => {
			return this.ordersService.discontinueMedOrder(input.id)
		})
	}

	// ========================================================================
	// Lab Orders
	// ========================================================================

	@Implement(v1.orders.listLabOrders)
	async listLabOrders() {
		return implement(v1.orders.listLabOrders).handler(async ({ input }) => {
			return this.ordersService.findLabOrders(input)
		})
	}

	@Implement(v1.orders.getLabOrder)
	async getLabOrder() {
		return implement(v1.orders.getLabOrder).handler(async ({ input }) => {
			return this.ordersService.findLabOrder(input.id)
		})
	}

	@Implement(v1.orders.createLabOrder)
	async createLabOrder(@Session() session: UserSession) {
		return implement(v1.orders.createLabOrder).handler(async ({ input }) => {
			return this.ordersService.createLabOrder(input, session.user.id)
		})
	}

	// ========================================================================
	// Imaging Orders
	// ========================================================================

	@Implement(v1.orders.listImagingOrders)
	async listImagingOrders() {
		return implement(v1.orders.listImagingOrders).handler(async ({ input }) => {
			return this.ordersService.findImagingOrders(input)
		})
	}

	@Implement(v1.orders.getImagingOrder)
	async getImagingOrder() {
		return implement(v1.orders.getImagingOrder).handler(async ({ input }) => {
			return this.ordersService.findImagingOrder(input.id)
		})
	}

	@Implement(v1.orders.createImagingOrder)
	async createImagingOrder(@Session() session: UserSession) {
		return implement(v1.orders.createImagingOrder).handler(async ({ input }) => {
			return this.ordersService.createImagingOrder(input, session.user.id)
		})
	}

	// ========================================================================
	// Pharmacy Verification
	// ========================================================================

	@Implement(v1.orders.getVerificationQueue)
	async getVerificationQueue() {
		return implement(v1.orders.getVerificationQueue).handler(async ({ input }) => {
			return this.ordersService.getVerificationQueue(input)
		})
	}

	@Implement(v1.orders.verifyOrder)
	async verifyOrder(@Session() session: UserSession) {
		return implement(v1.orders.verifyOrder).handler(async ({ input }) => {
			return this.ordersService.verifyOrder(input, session.user.id)
		})
	}

	// ========================================================================
	// Prescriptions
	// ========================================================================

	@Implement(v1.orders.listPrescriptions)
	async listPrescriptions() {
		return implement(v1.orders.listPrescriptions).handler(async ({ input }) => {
			return this.ordersService.findPrescriptions(input)
		})
	}

	@Implement(v1.orders.getPrescription)
	async getPrescription() {
		return implement(v1.orders.getPrescription).handler(async ({ input }) => {
			return this.ordersService.findPrescription(input.id)
		})
	}

	@Implement(v1.orders.createPrescription)
	async createPrescription(@Session() session: UserSession) {
		return implement(v1.orders.createPrescription).handler(async ({ input }) => {
			return this.ordersService.createPrescription(input, session.user.id)
		})
	}

	@Implement(v1.orders.signPrescription)
	async signPrescription() {
		return implement(v1.orders.signPrescription).handler(async ({ input }) => {
			return this.ordersService.signPrescription(input.id)
		})
	}

	// ========================================================================
	// Active Orders
	// ========================================================================

	@Implement(v1.orders.getActiveOrders)
	async getActiveOrders() {
		return implement(v1.orders.getActiveOrders).handler(async ({ input }) => {
			return this.ordersService.getActiveOrders(input)
		})
	}
}
