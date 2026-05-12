import { Module } from "@nestjs/common"

import { KonsultaController } from "./konsulta.controller"
import { KonsultaService } from "./konsulta.service"

// TODO: BIL-BE-08 — implement Konsulta capitation tracking service
@Module({
	controllers: [KonsultaController],
	providers: [KonsultaService],
	exports: [KonsultaService],
})
export class KonsultaModule {}
