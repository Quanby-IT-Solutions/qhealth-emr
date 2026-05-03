import { Controller } from "@nestjs/common"

import { Cf4Service } from "./cf4.service"

// TODO: BIL-BE-04 — wire oRPC contract endpoints: generate, preview, submit, statusPoll, resubmit
@Controller()
export class Cf4Controller {
	constructor(private readonly cf4Service: Cf4Service) {}
}
