import { Module } from "@nestjs/common"

import { ProblemsAllergiesModule } from "../problems-allergies/problems-allergies.module"
import { OrdersController } from "./orders.controller"
import { OrdersService } from "./orders.service"

@Module({
	imports: [ProblemsAllergiesModule],
	controllers: [OrdersController],
	providers: [OrdersService],
	exports: [OrdersService],
})
export class OrdersModule {}
