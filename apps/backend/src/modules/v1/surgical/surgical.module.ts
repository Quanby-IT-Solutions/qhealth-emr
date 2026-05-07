import { Module } from "@nestjs/common"

import { NotificationModule } from "@/modules/v1/notifications/notification.module"

import { SurgicalController } from "./surgical.controller"
import { SurgicalService } from "./surgical.service"

@Module({
	imports: [NotificationModule],
	controllers: [SurgicalController],
	providers: [SurgicalService],
	exports: [SurgicalService],
})
export class SurgicalModule {}
