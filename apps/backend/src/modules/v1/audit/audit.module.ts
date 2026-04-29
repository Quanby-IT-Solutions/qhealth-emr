import { Module, forwardRef } from "@nestjs/common"

import { NotificationModule } from "../notifications/notification.module"

import { AuditController } from "./audit.controller"
import { AuditService } from "./audit.service"
import { ChartAccessService } from "./chart-access.service"

@Module({
	imports: [forwardRef(() => NotificationModule)],
	controllers: [AuditController],
	providers: [
		AuditService,
		ChartAccessService,
		{ provide: "AUDIT_SERVICE", useExisting: AuditService },
	],
	exports: [AuditService, ChartAccessService, "AUDIT_SERVICE"],
})
export class AuditModule {}
