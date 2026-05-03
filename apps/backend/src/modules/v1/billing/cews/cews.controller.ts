import { Controller } from "@nestjs/common"

import { CewsService } from "./cews.service"

// TODO: BIL-BE-07 — wire oRPC contract endpoints: verify, snapshot, snapshots.list
@Controller()
export class CewsController {
	constructor(private readonly cewsService: CewsService) {}
}
