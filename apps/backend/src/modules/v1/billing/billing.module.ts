import { Module } from "@nestjs/common"

import { PhilHealthModule } from "@/common/philhealth/philhealth.module"

import { AuditModule } from "../audit/audit.module"

import { BillingController } from "./billing.controller"
import { BillingService } from "./billing.service"

@Module({
	imports: [AuditModule, PhilHealthModule],
	controllers: [BillingController],
	providers: [BillingService],
	exports: [BillingService],
})
export class BillingModule {}
