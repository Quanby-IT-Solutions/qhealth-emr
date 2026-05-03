import { Controller } from "@nestjs/common"

import { InvoicesService } from "./invoices.service"

// TODO: BIL-BE-03 — wire oRPC contract endpoints for invoices
@Controller()
export class InvoicesController {
	constructor(private readonly invoicesService: InvoicesService) {}
}
