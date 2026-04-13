import { Module } from "@nestjs/common"

import { AuditModule } from "./audit/audit.module"
import { BedsModule } from "./beds/beds.module"
import { BillingModule } from "./billing/billing.module"
import { ClinicalDocsModule } from "./clinical-docs/clinical-docs.module"
import { EdModule } from "./ed/ed.module"
import { EncountersModule } from "./encounters/encounters.module"
import { FormularyModule } from "./formulary/formulary.module"
import { HealthModule } from "./health/health.module"
import { NotificationModule } from "./notifications/notification.module"
import { NursingModule } from "./nursing/nursing.module"
import { OrdersModule } from "./orders/orders.module"
import { PatientsModule } from "./patients/patients.module"
import { ReportingModule } from "./reporting/reporting.module"
import { ProblemsAllergiesModule } from "./problems-allergies/problems-allergies.module"
import { RbacModule } from "./rbac/rbac.module"

@Module({
	imports: [
		HealthModule,
		AuditModule,
		NotificationModule,
		FormularyModule,
		PatientsModule,
		RbacModule,
		EncountersModule,
		BedsModule,
		EdModule,
		ProblemsAllergiesModule,
		ClinicalDocsModule,
		OrdersModule,
		NursingModule,
		BillingModule,
		ReportingModule,
	],
})
export class V1Module {}
