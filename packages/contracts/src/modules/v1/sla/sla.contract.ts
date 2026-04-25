import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	CreateSlaConfigSchema,
	CreateSlaStepConfigSchema,
	DeleteSlaConfigParamsSchema,
	DeleteSlaStepConfigParamsSchema,
	SlaComplianceQuerySchema,
	SlaComplianceReportSchema,
	SlaConfigSchema,
	SlaConfigsQuerySchema,
	SlaConfigsResponseSchema,
	SlaEventsByEncounterParamsSchema,
	SlaEventSchema,
	SlaEventsQuerySchema,
	SlaEventsResponseSchema,
	SlaStepConfigSchema,
	SlaStepConfigsQuerySchema,
	SlaStepConfigsResponseSchema,
	UpdateSlaConfigParamsSchema,
	UpdateSlaConfigSchema,
	UpdateSlaStepConfigParamsSchema,
	UpdateSlaStepConfigSchema,
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

	// ========================================================================
	// SLA Step Configs
	// ========================================================================

	listStepConfigs: oc
		.route({
			method: "GET",
			path: "/step-configs",
			summary: "List step-level SLA target overrides for a facility",
			tags: ["SLA"],
		})
		.input(SlaStepConfigsQuerySchema)
		.output(SlaStepConfigsResponseSchema),

	createStepConfig: oc
		.route({
			method: "POST",
			path: "/step-configs",
			summary: "Create a step-level SLA target override",
			tags: ["SLA"],
		})
		.input(CreateSlaStepConfigSchema)
		.output(SlaStepConfigSchema),

	updateStepConfig: oc
		.route({
			method: "PATCH",
			path: "/step-configs/{id}",
			summary: "Update a step-level SLA target override",
			tags: ["SLA"],
		})
		.input(UpdateSlaStepConfigSchema)
		.output(SlaStepConfigSchema),

	deleteStepConfig: oc
		.route({
			method: "DELETE",
			path: "/step-configs/{id}",
			summary: "Delete a step-level SLA target override",
			tags: ["SLA"],
		})
		.input(DeleteSlaStepConfigParamsSchema)
		.output(z.object({ success: z.boolean() })),
}
