import { Module } from "@nestjs/common"

import { ProblemsAllergiesController } from "./problems-allergies.controller"
import { ProblemsAllergiesService } from "./problems-allergies.service"

@Module({
	controllers: [ProblemsAllergiesController],
	providers: [ProblemsAllergiesService],
	exports: [ProblemsAllergiesService],
})
export class ProblemsAllergiesModule {}
