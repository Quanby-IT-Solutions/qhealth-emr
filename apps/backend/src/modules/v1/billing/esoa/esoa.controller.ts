import { Controller } from "@nestjs/common"

import { EsoaService } from "./esoa.service"

// TODO: BIL-BE-06 — wire oRPC contract endpoints: generate, list, send
@Controller()
export class EsoaController {
	constructor(private readonly esoaService: EsoaService) {}
}
