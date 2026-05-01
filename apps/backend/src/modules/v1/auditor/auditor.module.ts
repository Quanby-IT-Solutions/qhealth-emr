import { Module } from "@nestjs/common"

import { AuditLogModule } from "./audit-log/audit-log.module"
import { BreakGlassReviewModule } from "./break-glass-review/break-glass-review.module"

@Module({
	imports: [AuditLogModule, BreakGlassReviewModule],
})
export class AuditorModule {}
