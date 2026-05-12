import { Controller } from "@nestjs/common"

import { PaymentsService } from "./payments.service"

// TODO: BIL-BE-03 — wire oRPC contract endpoints for payments and receipts
@Controller()
export class PaymentsController {
	constructor(private readonly paymentsService: PaymentsService) {}
}
