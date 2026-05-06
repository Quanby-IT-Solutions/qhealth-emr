import { Module } from "@nestjs/common"

import { CodingModule } from "./coding/coding.module"
import { DeficienciesModule } from "./deficiencies/deficiencies.module"
import { HaiModule } from "./hai/hai.module"
import { RecordsRequestsModule } from "./records-requests/records-requests.module"

@Module({
	imports: [DeficienciesModule, CodingModule, RecordsRequestsModule, HaiModule],
})
export class HimModule {}
