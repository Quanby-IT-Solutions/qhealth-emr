import { Module } from "@nestjs/common"

import { ChargesController } from "./charges.controller"
import { ChargesService } from "./charges.service"

// TODO: BIL-BE-02 — implement charge capture logic
@Module({
	controllers: [ChargesController],
	providers: [ChargesService],
	exports: [ChargesService],
})
export class ChargesModule {}
