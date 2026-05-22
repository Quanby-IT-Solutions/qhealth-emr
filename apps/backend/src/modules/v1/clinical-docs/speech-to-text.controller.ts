import {
	BadRequestException,
	Controller,
	Post,
	UploadedFile,
	UseInterceptors,
	Version,
} from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { ElevenLabsService } from "@/common/elevenlabs/elevenlabs.service"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

@Controller("clinical-docs")
export class SpeechToTextController {
	constructor(private readonly elevenLabsService: ElevenLabsService) {}

	@RequirePermission("clinical_docs", "create")
	@Version("1")
	@Post("speech-to-text")
	@UseInterceptors(
		FileInterceptor("audio", {
			limits: { fileSize: 25 * 1024 * 1024 },
		})
	)
	async transcribe(
		@Session() _session: UserSession,
		@UploadedFile() file: Express.Multer.File | undefined
	): Promise<{ text: string }> {
		if (!file) {
			throw new BadRequestException("No audio file provided.")
		}
		return this.elevenLabsService.transcribeAudio(file.buffer, file.mimetype)
	}
}
