import { Module } from "@nestjs/common"

import { NotificationModule } from "@/modules/v1/notifications/notification.module"

import { TelemedicineController } from "./telemedicine.controller"
import { TelemedicineService } from "./telemedicine.service"

@Module({
	imports: [NotificationModule],
	controllers: [TelemedicineController],
	providers: [TelemedicineService],
	exports: [TelemedicineService],
})
export class TelemedicineModule {}
