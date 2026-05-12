import { Module } from "@nestjs/common"

import { InvoicesController } from "./invoices.controller"
import { InvoicesService } from "./invoices.service"

// TODO: BIL-BE-03 — implement invoice + receipt logic
@Module({
	controllers: [InvoicesController],
	providers: [InvoicesService],
	exports: [InvoicesService],
})
export class InvoicesModule {}
