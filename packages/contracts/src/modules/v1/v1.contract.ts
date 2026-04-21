import { oc } from "@orpc/contract"

import { v1Audit } from "./audit/v1.audit.js"
import { v1AdminDashboard } from "./admin-dashboard/v1.admin-dashboard.js"
import { v1Bed } from "./beds/v1.bed.js"
import { v1Billing } from "./billing/v1.billing.js"
import { v1ClinicalDocs } from "./clinical-docs/v1.clinical-docs.js"
import { v1Consent } from "./consent/v1.consent.js"
import { v1DeathReporting } from "./death-reporting/v1.death-reporting.js"
import { v1Ed } from "./ed/v1.ed.js"
import { v1Encounter } from "./encounters/v1.encounter.js"
import { v1Fhir } from "./fhir/v1.fhir.js"
import { v1Formulary } from "./formulary/v1.formulary.js"
import { healthContract } from "./health/health.contract.js"
import { v1Lab } from "./lab/v1.lab.js"
import { v1Msw } from "./msw/v1.msw.js"
import { v1Nbs } from "./nbs/v1.nbs.js"
import { v1Notification } from "./notifications/v1.notification.js"
import { v1Nursing } from "./nursing/v1.nursing.js"
import { v1Nutrition } from "./nutrition/v1.nutrition.js"
import { v1Orders } from "./orders/v1.orders.js"
import { v1Patient } from "./patients/v1.patient.js"
import { v1Pharmacy } from "./pharmacy/v1.pharmacy.js"
import { v1Philhealth } from "./philhealth/v1.philhealth.js"
import { v1ProblemsAllergies } from "./problems-allergies/v1.problems-allergies.js"
import { v1Rbac } from "./rbac/v1.rbac.js"
import { v1Reporting } from "./reporting/v1.reporting.js"
import { v1Scheduling } from "./scheduling/v1.scheduling.js"
import { v1Sla } from "./sla/v1.sla.js"
import { v1Surgical } from "./surgical/v1.surgical.js"
import { v1Telemedicine } from "./telemedicine/v1.telemedicine.js"
import { v1FeatureFlags } from "./feature-flags/v1.feature-flags.js"
import { v1SystemSettings } from "./system-settings/v1.system-settings.js"
import { v1FacilityProfile } from "./facility-profile/v1.facility-profile.js"
import { v1IntegrationRegistry } from "./integration-registry/v1.integration-registry.js"

/**
 * V1 contract router
 * Assembles all v1 feature contracts and applies the /v1 prefix
 */
export const v1Contract = oc.prefix("/v1").router(
	oc.router({
		health: healthContract,
		audit: v1Audit,
		adminDashboard: v1AdminDashboard,
		notification: v1Notification,
		formulary: v1Formulary,
		lab: v1Lab,
		nbs: v1Nbs,
		patient: v1Patient,
		encounter: v1Encounter,
		fhir: v1Fhir,
		bed: v1Bed,
		rbac: v1Rbac,
		ed: v1Ed,
		problemsAllergies: v1ProblemsAllergies,
		clinicalDocs: v1ClinicalDocs,
		orders: v1Orders,
		nursing: v1Nursing,
		billing: v1Billing,
		deathReporting: v1DeathReporting,
		reporting: v1Reporting,
		scheduling: v1Scheduling,
		sla: v1Sla,
		surgical: v1Surgical,
		telemedicine: v1Telemedicine,
		// New modules for ticket BE-02
		consent: v1Consent,
		msw: v1Msw,
		nutrition: v1Nutrition,
		pharmacy: v1Pharmacy,
		philhealth: v1Philhealth,
		featureFlags: v1FeatureFlags,
		systemSettings: v1SystemSettings,
		facilityProfile: v1FacilityProfile,
		integrationRegistry: v1IntegrationRegistry,
	})
)

export type V1Contract = typeof v1Contract
