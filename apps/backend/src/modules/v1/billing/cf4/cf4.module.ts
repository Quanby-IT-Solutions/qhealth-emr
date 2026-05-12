import { Module } from "@nestjs/common"

import { Cf4Controller } from "./cf4.controller"
import { Cf4Service } from "./cf4.service"

// TODO: BIL-BE-04 — implement CF4 generator + eClaims client
@Module({
	controllers: [Cf4Controller],
	providers: [Cf4Service],
	exports: [Cf4Service],
})
export class Cf4Module {}
