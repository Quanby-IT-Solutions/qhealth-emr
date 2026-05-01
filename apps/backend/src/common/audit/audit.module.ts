import { Global, Module } from "@nestjs/common"

import { CommonAuditService } from "./audit.service"

/**
 * Global shared audit write module. Import in main.module.ts so all feature
 * modules can inject CommonAuditService without importing AuditModule.
 *
 * Append-only policy: the application database user has no UPDATE/DELETE
 * permission on audit_logs or break_glass_reviews. All writes go through
 * CommonAuditService.log() which performs INSERT only.
 */
@Global()
@Module({
	providers: [CommonAuditService],
	exports: [CommonAuditService],
})
export class CommonAuditModule {}
