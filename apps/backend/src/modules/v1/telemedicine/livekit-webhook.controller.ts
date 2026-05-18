import { Controller, HttpCode, Post, Req, Version } from "@nestjs/common"
import { SkipThrottle } from "@nestjs/throttler"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"
import type { Request } from "express"

import { TelemedicineService } from "./telemedicine.service"

@Controller()
export class LiveKitWebhookController {
	constructor(private readonly telemedicineService: TelemedicineService) {}

	@AllowAnonymous()
	@SkipThrottle()
	@Version("1")
	@Post("webhooks/livekit")
	@HttpCode(200)
	async handle(@Req() req: Request): Promise<{ ok: true }> {
		const body =
			typeof req.body === "string"
				? req.body
				: Buffer.isBuffer(req.body)
					? req.body.toString("utf8")
					: ""
		const authHeader = (req.headers["authorization"] as string | undefined) ?? undefined
		await this.telemedicineService.handleLiveKitWebhook(body, authHeader)
		return { ok: true }
	}
}
