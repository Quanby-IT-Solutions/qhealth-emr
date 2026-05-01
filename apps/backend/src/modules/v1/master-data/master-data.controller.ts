import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequirePermissions } from "@/modules/v1/rbac/rbac.guard"

import { MasterDataService } from "./master-data.service"

@Controller()
export class MasterDataController {
	constructor(private readonly masterDataService: MasterDataService) {}

	@RequirePermissions([{ module: "admin", action: "view" }])
	@Implement(v1.masterData.listCatalogs)
	async listCatalogs() {
		return implement(v1.masterData.listCatalogs).handler(async ({ input }) => {
			return this.masterDataService.listCatalogs(input.facilityId)
		})
	}

	@RequirePermissions([{ module: "admin", action: "view" }])
	@Implement(v1.masterData.listItems)
	async listItems() {
		return implement(v1.masterData.listItems).handler(async ({ input }) => {
			const { catalogId, ...opts } = input
			return this.masterDataService.listItems(catalogId, opts)
		})
	}

	@RequirePermissions([{ module: "admin", action: "view" }])
	@Implement(v1.masterData.getItem)
	async getItem() {
		return implement(v1.masterData.getItem).handler(async ({ input }) => {
			return this.masterDataService.getItem(input.id)
		})
	}

	@RequirePermissions([{ module: "admin", action: "edit" }])
	@Implement(v1.masterData.upsertItem)
	async upsertItem(@Session() session: UserSession) {
		return implement(v1.masterData.upsertItem).handler(async ({ input }) => {
			return this.masterDataService.upsertItem(input, session.user.id)
		})
	}

	@RequirePermissions([{ module: "admin", action: "edit" }])
	@Implement(v1.masterData.deprecateItem)
	async deprecateItem(@Session() session: UserSession) {
		return implement(v1.masterData.deprecateItem).handler(async ({ input }) => {
			return this.masterDataService.deprecateItem(input, session.user.id)
		})
	}

	@RequirePermissions([{ module: "admin", action: "edit" }])
	@Implement(v1.masterData.importItems)
	async importItems(@Session() session: UserSession) {
		return implement(v1.masterData.importItems).handler(async ({ input }) => {
			return this.masterDataService.importItems(input.catalogId, input.csv, session.user.id)
		})
	}
}
