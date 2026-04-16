import { Module } from "@nestjs/common"

import { env } from "@/config/env.config"

import { MockPhilHealthProvider } from "./mock-philhealth.provider"
import { PHILHEALTH_ADAPTER } from "./philhealth.adapter"
import { RealPhilHealthProvider } from "./real-philhealth.provider"

@Module({
	providers: [
		MockPhilHealthProvider,
		RealPhilHealthProvider,
		{
			provide: PHILHEALTH_ADAPTER,
			inject: [MockPhilHealthProvider, RealPhilHealthProvider],
			useFactory: (mockProvider: MockPhilHealthProvider, realProvider: RealPhilHealthProvider) => {
				return env.PHILHEALTH_MODE === "real" ? realProvider : mockProvider
			},
		},
	],
	exports: [PHILHEALTH_ADAPTER],
})
export class PhilHealthModule {}