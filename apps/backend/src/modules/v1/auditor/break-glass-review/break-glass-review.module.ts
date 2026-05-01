import { Module } from "@nestjs/common"

import { BreakGlassReviewController } from "./break-glass-review.controller"
import { BreakGlassReviewService } from "./break-glass-review.service"

@Module({
	controllers: [BreakGlassReviewController],
	providers: [BreakGlassReviewService],
	exports: [BreakGlassReviewService],
})
export class BreakGlassReviewModule {}
