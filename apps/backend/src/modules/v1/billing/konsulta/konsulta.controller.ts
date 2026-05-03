import { Controller } from "@nestjs/common"

import { KonsultaService } from "./konsulta.service"

// TODO: BIL-BE-08 — wire oRPC contract endpoints: activities.list, activities.recordEvent, report.generate
@Controller()
export class KonsultaController {
	constructor(private readonly konsultaService: KonsultaService) {}
}
