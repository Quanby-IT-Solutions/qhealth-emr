import { Controller } from "@nestjs/common"

import { DrgService } from "./drg.service"

// TODO: BIL-BE-05 — wire oRPC contract endpoints: suggest, confirm, cf5 lifecycle
@Controller()
export class DrgController {
	constructor(private readonly drgService: DrgService) {}
}
