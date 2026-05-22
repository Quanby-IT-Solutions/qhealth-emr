import { Module } from "@nestjs/common"

import { LiveKitModule } from "@/common/livekit/livekit.module"

import { NotificationModule } from "../notifications/notification.module"
import { OpdTriageController } from "./opd-triage.controller"
import { OpdTriageService } from "./opd-triage.service"

@Module({
	imports: [LiveKitModule, NotificationModule],
	controllers: [OpdTriageController],
	providers: [OpdTriageService],
	exports: [OpdTriageService],
})
export class OpdTriageModule {}
