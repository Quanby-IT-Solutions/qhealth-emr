import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { himContract } from "@repo/contracts"

import { v1 } from "@/config/api-versions.config"
import { RequireAnyPermissions } from "@/modules/v1/rbac/rbac.guard"

import { RecordsRequestsService } from "./records-requests.service"

// Runtime records procedures with full /v1/him/* paths, typed via himContract
const himV1 = v1.him as unknown as typeof himContract

@Controller()
export class RecordsRequestsController {
	constructor(private readonly recordsRequestsService: RecordsRequestsService) {}

	@RequireAnyPermissions([
		{ module: "him.records", action: "read" },
		{ module: "medical_records", action: "view" },
	])
	@Implement(himV1.listRecordsAudit)
	async listRecordsAudit() {
		return implement(himV1.listRecordsAudit).handler(async ({ input }) => {
			return this.recordsRequestsService.listRecordsAudit(input) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "him.records", action: "write" },
		{ module: "medical_records", action: "edit" },
	])
	@Implement(himV1.captureDpaConsent)
	async captureDpaConsent(@Session() session: UserSession) {
		return implement(himV1.captureDpaConsent).handler(async ({ input }) => {
			return this.recordsRequestsService.captureDpaConsent({
				...input,
				staffId: session.user.id,
			}) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "him.records", action: "write" },
		{ module: "medical_records", action: "edit" },
	])
	@Implement(himV1.attachIdentityProof)
	async attachIdentityProof(@Session() session: UserSession) {
		return implement(himV1.attachIdentityProof).handler(async ({ input }) => {
			return this.recordsRequestsService.attachIdentityProof({
				...input,
				staffId: session.user.id,
			}) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "him.records", action: "write" },
		{ module: "medical_records", action: "edit" },
	])
	@Implement(himV1.attachPhysicianSignature)
	async attachPhysicianSignature(@Session() session: UserSession) {
		return implement(himV1.attachPhysicianSignature).handler(async ({ input }) => {
			return this.recordsRequestsService.attachPhysicianSignature({
				...input,
				staffId: session.user.id,
			}) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "him.records", action: "write" },
		{ module: "medical_records", action: "edit" },
	])
	@Implement(himV1.markRecordsPaymentCleared)
	async markRecordsPaymentCleared(@Session() session: UserSession) {
		return implement(himV1.markRecordsPaymentCleared).handler(async ({ input }) => {
			return this.recordsRequestsService.markRecordsPaymentCleared({
				...input,
				staffId: session.user.id,
			}) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "him.records", action: "write" },
		{ module: "medical_records", action: "edit" },
	])
	@Implement(himV1.releaseRecords)
	async releaseRecords(@Session() session: UserSession) {
		return implement(himV1.releaseRecords).handler(async ({ input }) => {
			return this.recordsRequestsService.releaseRecords({
				...input,
				staffId: session.user.id,
			}) as never
		})
	}
}
