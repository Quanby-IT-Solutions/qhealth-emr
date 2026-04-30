import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"

import { v1 } from "@/config/api-versions.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { OpdTriageService } from "./opd-triage.service"

@Controller()
export class OpdTriageController {
	constructor(private readonly opdTriageService: OpdTriageService) {}

	// Triage Officers (nursing:create) record walk-in intakes
	@RequirePermission("nursing", "create")
	@Implement(v1.opdTriage.create)
	async create() {
		return implement(v1.opdTriage.create).handler(async ({ input }) => {
			return this.opdTriageService.create(input)
		})
	}

	// Any clinical staff with patient-record access can look up a triage record
	@RequirePermission("patients", "view")
	@Implement(v1.opdTriage.get)
	async get() {
		return implement(v1.opdTriage.get).handler(async ({ input }) => {
			return this.opdTriageService.findById(input)
		})
	}

	// Registrar (opd:view) uses the pending queue for reconciliation
	@RequirePermission("opd", "view")
	@Implement(v1.opdTriage.listPending)
	async listPending() {
		return implement(v1.opdTriage.listPending).handler(async ({ input }) => {
			return this.opdTriageService.listPending(input)
		})
	}

	// Registrar (adt:edit) links a walk-in intake to a registered patient
	@RequirePermission("adt", "edit")
	@Implement(v1.opdTriage.linkToPatient)
	async linkToPatient() {
		return implement(v1.opdTriage.linkToPatient).handler(async ({ input }) => {
			return this.opdTriageService.linkToPatient(input)
		})
	}
}
