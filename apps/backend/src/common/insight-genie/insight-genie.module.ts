import { Module } from "@nestjs/common"

import { InsightGenieService } from "./insight-genie.service"

@Module({
	providers: [InsightGenieService],
	exports: [InsightGenieService],
})
export class InsightGenieModule {}
