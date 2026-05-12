import { Module } from "@nestjs/common"

import { EclaimsController } from "./eclaims.controller"
import { EclaimsService } from "./eclaims.service"

// TODO: BIL-BE-04 — eClaims submission client (PhilHealth API wrapper)
@Module({
	controllers: [EclaimsController],
	providers: [EclaimsService],
	exports: [EclaimsService],
})
export class EclaimsModule {}
