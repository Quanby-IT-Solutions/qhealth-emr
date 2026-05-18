import { Module } from "@nestjs/common"

import { LiveKitModule } from "@/common/livekit/livekit.module"
import { NotificationModule } from "@/modules/v1/notifications/notification.module"

import { LiveKitWebhookController } from "./livekit-webhook.controller"
import { TelemedicineController } from "./telemedicine.controller"
import { TelemedicineService } from "./telemedicine.service"

@Module({
	imports: [LiveKitModule, NotificationModule],
	controllers: [TelemedicineController, LiveKitWebhookController],
	providers: [TelemedicineService],
	exports: [TelemedicineService],
})
export class TelemedicineModule {}
