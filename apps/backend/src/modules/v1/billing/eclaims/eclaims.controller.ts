import { Controller } from "@nestjs/common"

import { EclaimsService } from "./eclaims.service"

// TODO: BIL-BE-04 — eClaims status polling and submission tracking
@Controller()
export class EclaimsController {
	constructor(private readonly eclaimsService: EclaimsService) {}
}
