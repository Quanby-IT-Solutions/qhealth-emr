import { Module } from "@nestjs/common"

import { CivilRegistryController } from "./civil-registry.controller"
import { CivilRegistryService } from "./civil-registry.service"

@Module({
	controllers: [CivilRegistryController],
	providers: [CivilRegistryService],
	exports: [CivilRegistryService],
})
export class CivilRegistryModule {}
