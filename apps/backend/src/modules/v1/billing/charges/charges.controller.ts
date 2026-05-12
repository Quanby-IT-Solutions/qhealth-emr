import { Controller } from "@nestjs/common"

import { ChargesService } from "./charges.service"

// TODO: BIL-BE-02 — wire oRPC contract endpoints for charge capture
@Controller()
export class ChargesController {
	constructor(private readonly chargesService: ChargesService) {}
}
