import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	CreateSlaConfigSchema,
	DeleteSlaConfigParamsSchema,
	SlaComplianceQuerySchema,
	SlaComplianceReportSchema,
	SlaConfigSchema,
	SlaConfigsQuerySchema,
	SlaConfigsResponseSchema,
	SlaEventsByEncounterParamsSchema,
	SlaEventSchema,
	SlaEventsQuerySchema,
	SlaEventsResponseSchema,
	UpdateSlaConfigParamsSchema,
	UpdateSlaConfigSchema,
} from "./sla.schema.js"

export const slaContract = {
	// ========================================================================
	// SLA Events
	// ========================================================================

	listEvents: oc
		.route({
			method: "GET",
			path: "/events",
			summary: "List SLA events with filtering and pagination",
			tags: ["SLA"],
		})
		.input(SlaEventsQuerySchema)
		.output(SlaEventsResponseSchema),

	getEventsByEncounter: oc
		.route({
			method: "GET",
			path: "/events/encounter/{encounterId}",
			summary: "Get SLA events for a specific encounter",
			tags: ["SLA"],
		})
		.input(SlaEventsByEncounterParamsSchema)
		.output(z.array(SlaEventSchema)),

	// ========================================================================
	// SLA Configs
	// ========================================================================

	listConfigs: oc
		.route({
			method: "GET",
			path: "/configs",
			summary: "List SLA configurations for a facility",
			tags: ["SLA"],
		})
		.input(SlaConfigsQuerySchema)
		.output(SlaConfigsResponseSchema),

	createConfig: oc
		.route({
			method: "POST",
			path: "/configs",
			summary: "Create a new SLA configuration",
			tags: ["SLA"],
		})
		.input(CreateSlaConfigSchema)
		.output(SlaConfigSchema),

	updateConfig: oc
		.route({
			method: "PATCH",
			path: "/configs/{id}",
			summary: "Update an existing SLA configuration",
			tags: ["SLA"],
		})
		.input(UpdateSlaConfigSchema)
		.output(SlaConfigSchema),

	deleteConfig: oc
		.route({
			method: "DELETE",
			path: "/configs/{id}",
			summary: "Delete an SLA configuration",
			tags: ["SLA"],
		})
		.input(DeleteSlaConfigParamsSchema)
		.output(z.object({ success: z.boolean() })),

	// ========================================================================
	// SLA Compliance Report
	// ========================================================================

	getComplianceReport: oc
		.route({
			method: "GET",
			path: "/compliance",
			summary: "Get SLA compliance report for a facility and date range",
			tags: ["SLA"],
		})
		.input(SlaComplianceQuerySchema)
		.output(SlaComplianceReportSchema),
}
