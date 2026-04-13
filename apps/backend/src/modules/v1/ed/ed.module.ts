import { Module } from "@nestjs/common"

import { NotificationModule } from "../notifications/notification.module"
import { EdController } from "./ed.controller"
import { EdService } from "./ed.service"

@Module({
	imports: [NotificationModule],
	controllers: [EdController],
	providers: [EdService],
	exports: [EdService],
})
export class EdModule {}
