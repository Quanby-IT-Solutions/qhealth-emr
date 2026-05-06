import { Module } from "@nestjs/common"

import { AuditModule } from "../audit/audit.module"
import { HimService } from "./him.service"

@Module({
	imports: [AuditModule],
	providers: [HimService],
	exports: [HimService],
})
export class HimSharedModule {}
