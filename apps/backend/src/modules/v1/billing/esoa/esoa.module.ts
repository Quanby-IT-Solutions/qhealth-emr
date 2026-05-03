import { Module } from "@nestjs/common"

import { EsoaController } from "./esoa.controller"
import { EsoaService } from "./esoa.service"

// TODO: BIL-BE-06 — implement eSOA generation service
@Module({
	controllers: [EsoaController],
	providers: [EsoaService],
	exports: [EsoaService],
})
export class EsoaModule {}
