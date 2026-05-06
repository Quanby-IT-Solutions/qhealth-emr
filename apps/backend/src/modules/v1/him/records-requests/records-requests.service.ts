import { Injectable } from "@nestjs/common"

import { HimService } from "../him.service"

@Injectable()
export class RecordsRequestsService {
	constructor(private readonly himService: HimService) {}

	listRecordsAudit(input: Parameters<HimService["listRecordsAudit"]>[0]) {
		return this.himService.listRecordsAudit(input)
	}

	captureDpaConsent(input: Parameters<HimService["captureDpaConsent"]>[0]) {
		return this.himService.captureDpaConsent(input)
	}

	attachIdentityProof(input: Parameters<HimService["attachIdentityProof"]>[0]) {
		return this.himService.attachIdentityProof(input)
	}

	attachPhysicianSignature(input: Parameters<HimService["attachPhysicianSignature"]>[0]) {
		return this.himService.attachPhysicianSignature(input)
	}

	markRecordsPaymentCleared(input: Parameters<HimService["markRecordsPaymentCleared"]>[0]) {
		return this.himService.markRecordsPaymentCleared(input)
	}

	releaseRecords(input: Parameters<HimService["releaseRecords"]>[0]) {
		return this.himService.releaseRecords(input)
	}
}