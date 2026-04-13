import { oc } from "@orpc/contract"

import { v1Audit } from "./audit/v1.audit.js"
import { v1Bed } from "./beds/v1.bed.js"
import { v1Billing } from "./billing/v1.billing.js"
import { v1ClinicalDocs } from "./clinical-docs/v1.clinical-docs.js"
import { v1Ed } from "./ed/v1.ed.js"
import { v1Encounter } from "./encounters/v1.encounter.js"
import { v1Formulary } from "./formulary/v1.formulary.js"
import { healthContract } from "./health/health.contract.js"
import { v1Notification } from "./notifications/v1.notification.js"
import { v1Nursing } from "./nursing/v1.nursing.js"
import { v1Orders } from "./orders/v1.orders.js"
import { v1Patient } from "./patients/v1.patient.js"
import { v1ProblemsAllergies } from "./problems-allergies/v1.problems-allergies.js"
import { v1Rbac } from "./rbac/v1.rbac.js"
import { v1Reporting } from "./reporting/v1.reporting.js"

/**
 * V1 contract router
 * Assembles all v1 feature contracts and applies the /v1 prefix
 */
export const v1Contract = oc.prefix("/v1").router(
	oc.router({
		health: healthContract,
		audit: v1Audit,
		notification: v1Notification,
		formulary: v1Formulary,
		patient: v1Patient,
		encounter: v1Encounter,
		bed: v1Bed,
		rbac: v1Rbac,
		ed: v1Ed,
		problemsAllergies: v1ProblemsAllergies,
		clinicalDocs: v1ClinicalDocs,
		orders: v1Orders,
		nursing: v1Nursing,
		billing: v1Billing,
		reporting: v1Reporting,
	})
)

export type V1Contract = typeof v1Contract
