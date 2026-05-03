import { Module } from "@nestjs/common"

import { PhilHealthModule } from "@/common/philhealth/philhealth.module"

import { AuditModule } from "../audit/audit.module"

import { BillingController } from "./billing.controller"
import { BillingService } from "./billing.service"
import { Cf4Module } from "./cf4/cf4.module"
import { CewsModule } from "./cews/cews.module"
import { ChargesModule } from "./charges/charges.module"
import { DrgModule } from "./drg/drg.module"
import { EclaimsModule } from "./eclaims/eclaims.module"
import { EsoaModule } from "./esoa/esoa.module"
import { InvoicesModule } from "./invoices/invoices.module"
import { KonsultaModule } from "./konsulta/konsulta.module"
import { PaymentsModule } from "./payments/payments.module"

@Module({
	imports: [
		AuditModule,
		PhilHealthModule,
		// BIL-BE-01: Sub-domain modules (scaffold; logic implemented in BIL-BE-02 through BIL-BE-08)
		ChargesModule,
		InvoicesModule,
		PaymentsModule,
		Cf4Module,
		EclaimsModule,
		DrgModule,
		EsoaModule,
		CewsModule,
		KonsultaModule,
	],
	controllers: [BillingController],
	providers: [BillingService],
	exports: [BillingService],
})
export class BillingModule {}
