import { Module } from "@nestjs/common"

import { AuditModule } from "@/modules/v1/audit/audit.module"

import { FacilityProfileController } from "./facility-profile.controller"
import { FacilityProfileService } from "./facility-profile.service"

@Module({
	imports: [AuditModule],
	controllers: [FacilityProfileController],
	providers: [FacilityProfileService],
	exports: [FacilityProfileService],
})
export class FacilityProfileModule {}
