import { oc } from "@orpc/contract"
import { z } from "zod"

import { BreakGlassEventSchema } from "../audit/audit.schema.js"
import {
	AuditorBreakGlassInboxFilterSchema,
	AuditorBreakGlassInboxResponseSchema,
	AuditorEventListFilterSchema,
	AuditorEventListResponseSchema,
	AuditorEventSchema,
	AuditorEventSessionResponseSchema,
	AuditorExportInputSchema,
	AuditorExportResponseSchema,
	AuditorReviewInputSchema,
	BreakGlassHistoryByClinicianResponseSchema,
	BreakGlassHistoryByClinicinaInputSchema,
	BreakGlassReviewSchema,
} from "./auditor.schema.js"

// ============================================================================
// Audit Events — read API for auditor role
// All paths are relative to the /auditor prefix applied in v1.auditor.ts
// ============================================================================

export const auditorEventsContract = {
	list: oc
		.route({
			method: "GET",
			path: "/events",
			summary: "List audit events (auditor read API)",
			tags: ["Auditor"],
		})
		.input(AuditorEventListFilterSchema)
		.output(AuditorEventListResponseSchema),

	get: oc
		.route({
			method: "GET",
			path: "/events/{id}",
			summary: "Get audit event detail with redacted payload",
			tags: ["Auditor"],
		})
		.input(z.object({ id: z.string().uuid() }))
		.output(AuditorEventSchema),

	session: oc
		.route({
			method: "GET",
			path: "/events/session/{sessionId}",
			summary: "List all events for a session",
			tags: ["Auditor"],
		})
		.input(z.object({ sessionId: z.string(), facilityId: z.string().uuid() }))
		.output(AuditorEventSessionResponseSchema),

	export: oc
		.route({
			method: "POST",
			path: "/events/export",
			summary: "Export audit events (CSV/PDF) with content hash",
			tags: ["Auditor"],
		})
		.input(AuditorExportInputSchema)
		.output(AuditorExportResponseSchema),
}

// ============================================================================
// Break-Glass — auditor inbox and review actions
// ============================================================================

export const auditorBreakGlassContract = {
	inboxList: oc
		.route({
			method: "GET",
			path: "/break-glass/inbox",
			summary: "Break-glass inbox with SLA filtering",
			tags: ["Auditor", "Break Glass"],
		})
		.input(AuditorBreakGlassInboxFilterSchema)
		.output(AuditorBreakGlassInboxResponseSchema),

	eventGet: oc
		.route({
			method: "GET",
			path: "/break-glass/{eventId}",
			summary: "Get break-glass event detail for auditor",
			tags: ["Auditor", "Break Glass"],
		})
		.input(z.object({ eventId: z.string().uuid() }))
		.output(BreakGlassEventSchema),

	reviewApprove: oc
		.route({
			method: "POST",
			path: "/break-glass/{eventId}/approve",
			summary: "Approve a break-glass event (writes immutable review row)",
			tags: ["Auditor", "Break Glass"],
		})
		.input(AuditorReviewInputSchema)
		.output(BreakGlassReviewSchema),

	reviewFlag: oc
		.route({
			method: "POST",
			path: "/break-glass/{eventId}/flag",
			summary: "Flag a break-glass event for investigation",
			tags: ["Auditor", "Break Glass"],
		})
		.input(AuditorReviewInputSchema)
		.output(BreakGlassReviewSchema),

	reviewAddNote: oc
		.route({
			method: "POST",
			path: "/break-glass/{eventId}/note",
			summary: "Add a note to a break-glass event",
			tags: ["Auditor", "Break Glass"],
		})
		.input(AuditorReviewInputSchema)
		.output(BreakGlassReviewSchema),

	historyByClinician: oc
		.route({
			method: "GET",
			path: "/break-glass/history/{clinicianId}",
			summary: "Get last 25 break-glass events for a clinician",
			tags: ["Auditor", "Break Glass"],
		})
		.input(BreakGlassHistoryByClinicinaInputSchema)
		.output(BreakGlassHistoryByClinicianResponseSchema),
}
