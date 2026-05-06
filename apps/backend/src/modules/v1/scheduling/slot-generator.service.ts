import { Injectable, Logger } from "@nestjs/common"

@Injectable()
export class SlotGeneratorService {
	private readonly logger = new Logger(SlotGeneratorService.name)

	async generateSlotsForTemplate(templateId: string, fromDate: string, toDate: string) {
		this.logger.warn(
			`SlotGeneratorService stub invoked for templateId=${templateId} range=${fromDate}..${toDate}`
		)
		return { inserted: 0 }
	}
}
