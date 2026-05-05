import { Injectable } from "@nestjs/common"
import { OnEvent } from "@nestjs/event-emitter"

import { HimService } from "../him.service"

interface EncounterDischargedEvent {
	facilityId: string
	encounterId: string
}

@Injectable()
export class DeficienciesService {
	constructor(private readonly himService: HimService) {}

	@OnEvent("encounter.discharged")
	async handleEncounterDischarged(event: EncounterDischargedEvent) {
		await this.himService.scanDeficiencies({
			facilityId: event.facilityId,
			encounterId: event.encounterId,
		})
	}

	listDeficiencies(input: Parameters<HimService["listDeficiencies"]>[0]) {
		return this.himService.listDeficiencies(input)
	}

	getDeficiency(input: Parameters<HimService["getDeficiency"]>[0]) {
		return this.himService.getDeficiency(input)
	}

	notifyDeficiency(input: Parameters<HimService["notifyDeficiency"]>[0]) {
		return this.himService.notifyDeficiency(input)
	}

	markDeficiencyResolved(input: Parameters<HimService["markDeficiencyResolved"]>[0]) {
		return this.himService.markDeficiencyResolved(input)
	}

	scanDeficiencies(input: Parameters<HimService["scanDeficiencies"]>[0]) {
		return this.himService.scanDeficiencies(input)
	}
}