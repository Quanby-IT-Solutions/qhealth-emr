import { Module } from "@nestjs/common"

import { AncillaryClearanceModule } from "./ancillary-clearance/ancillary-clearance.module"
import { AnnexSignaturesModule } from "./annex-signatures/annex-signatures.module"
import { AssessmentsModule } from "./assessments/assessments.module"
import { CoeModule } from "./coe/coe.module"
import { MalasakitModule } from "./malasakit/malasakit.module"
import { MswController } from "./msw.controller"
import { MswService } from "./msw.service"

@Module({
	imports: [
		AssessmentsModule,
		CoeModule,
		AnnexSignaturesModule,
		MalasakitModule,
		AncillaryClearanceModule,
	],
	controllers: [MswController],
	providers: [MswService],
	exports: [MswService],
})
export class MswModule {}
