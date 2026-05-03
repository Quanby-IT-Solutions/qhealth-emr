import { Module } from "@nestjs/common"

import { PaymentsController } from "./payments.controller"
import { PaymentsService } from "./payments.service"

// TODO: BIL-BE-03 — implement payment + receipt logic
@Module({
	controllers: [PaymentsController],
	providers: [PaymentsService],
	exports: [PaymentsService],
})
export class PaymentsModule {}
