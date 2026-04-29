import { oc } from "@orpc/contract"

import {
	AuditLogExportFilterSchema,
	AuditLogFilterSchema,
	AuditLogListResponseSchema,
	AuditLogSchema,
	BreakGlassEventSchema,
	BreakGlassExportFilterSchema,
	BreakGlassFilterSchema,
	BreakGlassIdSchema,
	BreakGlassListResponseSchema,
	BreakGlassPatternsFilterSchema,
	BreakGlassPatternsSchema,
	ConfigHistoryFilterSchema,
	ConfigHistoryListResponseSchema,
	CreateBreakGlassSchema,
	ReviewBreakGlassSchema,
} from "./audit.schema.js"

export const auditLogContract = {
	list: oc
		.route({
			method: "GET",
			path: "/audit-logs",
			summary: "List audit logs with filters",
			tags: ["Audit"],
		})
		.input(AuditLogFilterSchema)
		.output(AuditLogListResponseSchema),

	get: oc
		.route({
			method: "GET",
			path: "/audit-logs/{id}",
			summary: "Get audit log detail",
			tags: ["Audit"],
		})
		.input(BreakGlassIdSchema)
		.output(AuditLogSchema),

	exportCsv: oc
		.route({
			method: "GET",
			path: "/audit-logs/export",
			summary: "Export filtered audit logs as CSV",
			tags: ["Audit"],
		})
		.input(AuditLogExportFilterSchema)
		.output(
			// Returns CSV string - frontend handles download
			AuditLogListResponseSchema
		),

	configHistory: oc
		.route({
			method: "GET",
			path: "/audit-logs/config-history",
			summary: "List configuration change history for governance forensics",
			tags: ["Audit", "Config History"],
		})
		.input(ConfigHistoryFilterSchema)
		.output(ConfigHistoryListResponseSchema),
}

export const breakGlassContract = {
	list: oc
		.route({
			method: "GET",
			path: "/break-glass",
			summary: "List break-glass events",
			tags: ["Audit", "Break Glass"],
		})
		.input(BreakGlassFilterSchema)
		.output(BreakGlassListResponseSchema),

	get: oc
		.route({
			method: "GET",
			path: "/break-glass/{id}",
			summary: "Get break-glass event detail",
			tags: ["Audit", "Break Glass"],
		})
		.input(BreakGlassIdSchema)
		.output(BreakGlassEventSchema),

	create: oc
		.route({
			method: "POST",
			path: "/break-glass",
			summary: "Request emergency break-glass access",
			tags: ["Audit", "Break Glass"],
		})
		.input(CreateBreakGlassSchema)
		.output(BreakGlassEventSchema),

	review: oc
		.route({
			method: "PUT",
			path: "/break-glass/{id}/review",
			summary: "Review a break-glass event",
			tags: ["Audit", "Break Glass"],
		})
		.input(ReviewBreakGlassSchema)
		.output(BreakGlassEventSchema),

	patterns: oc
		.route({
			method: "GET",
			path: "/break-glass/patterns",
			summary: "Get break-glass pattern analysis for privacy officer investigation",
			tags: ["Audit", "Break Glass"],
		})
		.input(BreakGlassPatternsFilterSchema)
		.output(BreakGlassPatternsSchema),

	exportCsv: oc
		.route({
			method: "GET",
			path: "/break-glass/export",
			summary: "Export filtered break-glass events as CSV",
			tags: ["Audit", "Break Glass"],
		})
		.input(BreakGlassExportFilterSchema)
		.output(BreakGlassListResponseSchema),
}
