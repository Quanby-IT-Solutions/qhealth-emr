import { Module } from "@nestjs/common"

import { AdminDashboardModule } from "./admin-dashboard/admin-dashboard.module"
import { AuditModule } from "./audit/audit.module"
import { AuditorModule } from "./auditor/auditor.module"
import { BedsModule } from "./beds/beds.module"
import { BillingModule } from "./billing/billing.module"
import { CivilRegistryModule } from "./civil-registry/civil-registry.module"
import { ClinicalDocsModule } from "./clinical-docs/clinical-docs.module"
import { ClinicianLicensesModule } from "./clinician-licenses/clinician-licenses.module"
import { DeathReportingModule } from "./death-reporting/death-reporting.module"
import { DepartmentsModule } from "./departments/departments.module"
import { EdModule } from "./ed/ed.module"
import { EncountersModule } from "./encounters/encounters.module"
import { FacilityProfileModule } from "./facility-profile/facility-profile.module"
import { FeatureFlagsModule } from "./feature-flags/feature-flags.module"
import { FhirEndpointsModule } from "./fhir-endpoints/fhir-endpoints.module"
import { FhirModule } from "./fhir/fhir.module"
import { FormularyModule } from "./formulary/formulary.module"
import { HealthModule } from "./health/health.module"
import { HimModule } from "./him/him.module"
import { IntegrationRegistryModule } from "./integration-registry/integration-registry.module"
import { LabModule } from "./lab/lab.module"
import { MasterDataModule } from "./master-data/master-data.module"
import { MedicalRecordsModule } from "./medical-records/medical-records.module"
import { MswModule } from "./msw/msw.module"
import { NbsModule } from "./nbs/nbs.module"
import { NotificationModule } from "./notifications/notification.module"
import { NursingModule } from "./nursing/nursing.module"
import { NutritionModule } from "./nutrition/nutrition.module"
import { OpdTriageModule } from "./opd-triage/opd-triage.module"
import { OrdersModule } from "./orders/orders.module"
import { PatientsModule } from "./patients/patients.module"
import { ProblemsAllergiesModule } from "./problems-allergies/problems-allergies.module"
import { RbacModule } from "./rbac/rbac.module"
import { ReportingModule } from "./reporting/reporting.module"
import { SchedulingModule } from "./scheduling/scheduling.module"
import { SlaModule } from "./sla/sla.module"
import { SurgicalModule } from "./surgical/surgical.module"
import { SystemSettingsModule } from "./system-settings/system-settings.module"
import { TelemedicineModule } from "./telemedicine/telemedicine.module"
import { TerminologyModule } from "./terminology/terminology.module"
import { DischargeClearancesModule } from "./discharge-clearances/discharge-clearances.module"
import { GatePassesModule } from "./gate-passes/gate-passes.module"
import { HousekeepingModule } from "./housekeeping/housekeeping.module"

@Module({
	imports: [
		AdminDashboardModule,
		HealthModule,
		AuditModule,
		NotificationModule,
		FormularyModule,
		LabModule,
		NbsModule,
		NutritionModule,
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
		MswModule,
		ReportingModule,
		SchedulingModule,
		SlaModule,
		SurgicalModule,
		TelemedicineModule,
		FeatureFlagsModule,
		SystemSettingsModule,
		FacilityProfileModule,
		IntegrationRegistryModule,
		OpdTriageModule,
		// SLA-017: civil registry (birth certificate requests + payment)
		CivilRegistryModule,
		// SLA-017: medical records requests + payment
		MedicalRecordsModule,
		// ADM-BE-05: clinician license management
		ClinicianLicensesModule,
		// ADM-BE-11: departments CRUD
		DepartmentsModule,
		// ADM-BE-07: FHIR endpoint management
		FhirEndpointsModule,
		// ADM-BE-08: terminology service
		TerminologyModule,
		// ADM-BE-11 master data
		MasterDataModule,
		// AUD-BE-01: Auditor module (read-side query API + break-glass review)
		AuditorModule,
		// HIM-BE-01..05: Health Information Management
		HimModule,
		// Registrar features
		DischargeClearancesModule,
		GatePassesModule,
		HousekeepingModule,
	],
})
export class V1Module {}
