import { Injectable } from "@nestjs/common"

import { HimService } from "../him.service"

@Injectable()
export class HaiService {
	constructor(private readonly himService: HimService) {}

	listHai(input: Parameters<HimService["listHai"]>[0]) {
		return this.himService.listHai(input)
	}

	decideHai(input: Parameters<HimService["decideHai"]>[0]) {
		return this.himService.decideHai(input)
	}

	haiReport(input: Parameters<HimService["haiReport"]>[0]) {
		return this.himService.haiReport(input)
	}

	haiExport(input: Parameters<HimService["haiExport"]>[0]) {
		return this.himService.haiExport(input)
	}
}
