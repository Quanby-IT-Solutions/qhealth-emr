import { Injectable } from "@nestjs/common"

import { HimService } from "../him.service"

@Injectable()
export class CodingService {
	constructor(private readonly himService: HimService) {}

	listCodes(input: Parameters<HimService["listCodes"]>[0]) {
		return this.himService.listCodes(input)
	}

	upsertCodes(input: Parameters<HimService["upsertCodes"]>[0]) {
		return this.himService.upsertCodes(input)
	}

	signCodes(input: Parameters<HimService["signCodes"]>[0]) {
		return this.himService.signCodes(input)
	}

	amendCodes(input: Parameters<HimService["amendCodes"]>[0]) {
		return this.himService.amendCodes(input)
	}

	validateCodes(input: Parameters<HimService["validateCodes"]>[0]) {
		return this.himService.validateCodes(input)
	}
}
