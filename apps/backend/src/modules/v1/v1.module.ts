import { Module } from "@nestjs/common"

import { AuditModule } from "./audit/audit.module"
import { BedsModule } from "./beds/beds.module"
import { BillingModule } from "./billing/billing.module"
import { ClinicalDocsModule } from "./clinical-docs/clinical-docs.module"
import { DeathReportingModule } from "./death-reporting/death-reporting.module"
import { EdModule } from "./ed/ed.module"
import { EncountersModule } from "./encounters/encounters.module"
import { FhirModule } from "./fhir/fhir.module"
import { FormularyModule } from "./formulary/formulary.module"
import { HealthModule } from "./health/health.module"
import { LabModule } from "./lab/lab.module"
import { NbsModule } from "./nbs/nbs.module"
import { NotificationModule } from "./notifications/notification.module"
import { NursingModule } from "./nursing/nursing.module"
import { OrdersModule } from "./orders/orders.module"
import { PatientsModule } from "./patients/patients.module"
import { ReportingModule } from "./reporting/reporting.module"
import { ProblemsAllergiesModule } from "./problems-allergies/problems-allergies.module"
import { RbacModule } from "./rbac/rbac.module"
import { SchedulingModule } from "./scheduling/scheduling.module"
import { SlaModule } from "./sla/sla.module"
import { SurgicalModule } from "./surgical/surgical.module"
import { TelemedicineModule } from "./telemedicine/telemedicine.module"

@Module({
	imports: [
		HealthModule,
		AuditModule,
		NotificationModule,
		FormularyModule,
		LabModule,
		NbsModule,
		PatientsModule,
		RbacModule,
		EncountersModule,
		FhirModule,
		BedsModule,
		EdModule,
		ProblemsAllergiesModule,
		ClinicalDocsModule,
		OrdersModule,
		NursingModule,
		BillingModule,
		DeathReportingModule,
		ReportingModule,
		SchedulingModule,
		SlaModule,
		SurgicalModule,
		TelemedicineModule,
	],
})
export class V1Module {}
