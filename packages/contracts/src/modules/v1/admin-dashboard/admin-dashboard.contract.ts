import { oc } from "@orpc/contract"

import {
	AdminDashboardSummarySchema,
	CivilRegistryOpsSectionSchema,
	ExportComplianceListSchema,
	ExportComplianceQuerySchema,
	HimOpsSectionSchema,
	MedicationComplianceSectionSchema,
} from "./admin-dashboard.schema.js"

export const adminDashboardContract = {
	summary: oc
		.route({
			method: "GET",
			path: "/summary",
			summary: "Get administrator dashboard summary with governance KPIs",
			tags: ["Admin Dashboard"],
		})
		.output(AdminDashboardSummarySchema),

	himOps: oc
		.route({
			method: "GET",
			path: "/him-ops",
			summary: "HIM operations backlog: discharge summaries, coding queue, records release",
			tags: ["Admin Dashboard"],
		})
		.output(HimOpsSectionSchema),

	exportCompliance: oc
		.route({
			method: "GET",
			path: "/export-compliance",
			summary: "DPA export compliance audit trail with consent-gate evidence",
			tags: ["Admin Dashboard"],
		})
		.input(ExportComplianceQuerySchema)
		.output(ExportComplianceListSchema),

	civilRegistryOps: oc
		.route({
			method: "GET",
			path: "/civil-registry-ops",
			summary: "Civil registry (FMDRF/FNDRF) death certificate transmission status",
			tags: ["Admin Dashboard"],
		})
		.output(CivilRegistryOpsSectionSchema),

	medicationCompliance: oc
		.route({
			method: "GET",
			path: "/medication-compliance",
			summary: "Medication compliance: Generics Act, PDEA S-2 tranching, CDS verification",
			tags: ["Admin Dashboard"],
		})
		.output(MedicationComplianceSectionSchema),
}
