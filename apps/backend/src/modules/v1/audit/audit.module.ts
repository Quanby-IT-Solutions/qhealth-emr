import { Module, forwardRef } from "@nestjs/common"

import { NotificationModule } from "../notifications/notification.module"

import { AuditController } from "./audit.controller"
import { AuditService } from "./audit.service"

@Module({
	imports: [forwardRef(() => NotificationModule)],
	controllers: [AuditController],
	providers: [
		AuditService,
		{ provide: "AUDIT_SERVICE", useExisting: AuditService },
	],
	exports: [AuditService, "AUDIT_SERVICE"],
})
export class AuditModule {}
