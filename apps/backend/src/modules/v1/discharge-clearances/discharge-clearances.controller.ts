import { Controller, Req } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"
import type { Request } from "express"

import { v1 } from "@/config/api-versions.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { DischargeClearancesService } from "./discharge-clearances.service"

@Controller()
export class DischargeClearancesController {
    constructor(private readonly service: DischargeClearancesService) {}

    @RequirePermission("adt", "view")
    @Implement(v1.dischargeClearances.list)
    async list(@Session() session: UserSession, @Req() req: Request) {
        return implement(v1.dischargeClearances.list).handler(async ({ input }) => {
            return this.service.listForEncounter(input.encounterId)
        })
    }

    @RequirePermission("formulary", "sign")
    @Implement(v1.dischargeClearances.recordPharmacy)
    async recordPharmacy(@Session() session: UserSession) {
        return implement(v1.dischargeClearances.recordPharmacy).handler(async ({ input }) => {
            return this.service.recordClearance(input.encounterId, "pharmacy", input.notes, session.user.id)
        })
    }

    @RequirePermission("nursing", "sign")
    @Implement(v1.dischargeClearances.recordNurse)
    async recordNurse(@Session() session: UserSession) {
        return implement(v1.dischargeClearances.recordNurse).handler(async ({ input }) => {
            return this.service.recordClearance(input.encounterId, "nurse", input.notes, session.user.id)
        })
    }

    @RequirePermission("billing", "sign")
    @Implement(v1.dischargeClearances.recordBilling)
    async recordBilling(@Session() session: UserSession) {
        return implement(v1.dischargeClearances.recordBilling).handler(async ({ input }) => {
            return this.service.recordClearance(input.encounterId, "billing", input.notes, session.user.id)
        })
    }

    @RequirePermission("formulary", "sign")
    @Implement(v1.dischargeClearances.revokePharmacy)
    async revokePharmacy(@Session() session: UserSession) {
        return implement(v1.dischargeClearances.revokePharmacy).handler(async ({ input }) => {
            return this.service.revokeClearance(input.encounterId, "pharmacy", session.user.id)
        })
    }

    @RequirePermission("nursing", "sign")
    @Implement(v1.dischargeClearances.revokeNurse)
    async revokeNurse(@Session() session: UserSession) {
        return implement(v1.dischargeClearances.revokeNurse).handler(async ({ input }) => {
            return this.service.revokeClearance(input.encounterId, "nurse", session.user.id)
        })
    }

    @RequirePermission("billing", "sign")
    @Implement(v1.dischargeClearances.revokeBilling)
    async revokeBilling(@Session() session: UserSession) {
        return implement(v1.dischargeClearances.revokeBilling).handler(async ({ input }) => {
            return this.service.revokeClearance(input.encounterId, "billing", session.user.id)
        })
    }
}
