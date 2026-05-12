import { Module } from "@nestjs/common"

import { AnnexSignaturesController } from "./annex-signatures.controller"
import { AnnexSignaturesService } from "./annex-signatures.service"

@Module({
	controllers: [AnnexSignaturesController],
	providers: [AnnexSignaturesService],
	exports: [AnnexSignaturesService],
})
export class AnnexSignaturesModule {}
