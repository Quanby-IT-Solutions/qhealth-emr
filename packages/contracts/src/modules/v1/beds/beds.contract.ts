import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	AhsrExportQuerySchema,
	AhsrExportResponseSchema,
	BedCensusQuerySchema,
	BedCensusResponseSchema,
	BedListResponseSchema,
	BedListSchema,
	BedSchema,
	BedSuggestionQuerySchema,
	BedSuggestionResponseSchema,
	BorTrendQuerySchema,
	BorTrendResponseSchema,
	CensusDashboardQuerySchema,
	CensusDashboardResponseSchema,
	CreateBedSchema,
	CreateWardSchema,
	DeleteWardSchema,
	UpdateBedStatusSchema,
	WardListSchema,
	WardSchema,
	BedStatusHistorySchema,
	CleaningQueueItemSchema,
	MarkCleanedInputSchema,
} from "./beds.schema.js"

export const bedContract = {
	listWards: oc
		.route({
			method: "GET",
			path: "/wards",
			summary: "List wards for a facility",
			tags: ["Beds"],
		})
		.input(WardListSchema)
		.output(z.array(WardSchema)),

	createWard: oc
		.route({
			method: "POST",
			path: "/wards",
			summary: "Create a new ward",
			tags: ["Beds"],
		})
		.input(CreateWardSchema)
		.output(WardSchema),

	listBeds: oc
		.route({
			method: "GET",
			path: "/beds",
			summary: "List beds grouped by ward with occupancy info",
			tags: ["Beds"],
		})
		.input(BedListSchema)
		.output(BedListResponseSchema),

	createBed: oc
		.route({
			method: "POST",
			path: "/beds",
			summary: "Create a new bed in a ward",
			tags: ["Beds"],
		})
		.input(CreateBedSchema)
		.output(BedSchema),

	updateBedStatus: oc
		.route({
			method: "PUT",
			path: "/beds/{id}",
			summary: "Update bed status (available/occupied/out_of_service)",
			tags: ["Beds"],
		})
		.input(UpdateBedStatusSchema)
		.output(BedSchema),

	markCleaned: oc
		.route({
			method: "PATCH",
			path: "/beds/{id}/mark-cleaned",
			summary: "Mark a bed cleaned (housekeeping)",
			tags: ["Beds"],
		})
		.input(MarkCleanedInputSchema)
		.output(BedSchema),

	getStatusHistory: oc
		.route({
			method: "GET",
			path: "/beds/{id}/status-history",
			summary: "Get bed status history timeline",
			tags: ["Beds"],
		})
		.input(z.object({ id: z.string().uuid() }))
		.output(z.array(BedStatusHistorySchema)),

	cleaningQueue: oc
		.route({
			method: "GET",
			path: "/beds/cleaning-queue",
			summary: "List beds dirty for cleaning",
			tags: ["Beds"],
		})
		.input(z.object({ facilityId: z.string().uuid() }))
		.output(z.array(CleaningQueueItemSchema)),

	suggestBeds: oc
		.route({
			method: "POST",
			path: "/beds/suggest",
			summary: "Get ranked bed suggestions based on patient criteria",
			tags: ["Beds"],
		})
		.input(BedSuggestionQuerySchema)
		.output(BedSuggestionResponseSchema),

	census: oc
		.route({
			method: "GET",
			path: "/beds/census",
			summary: "Get bed census snapshot with BOR calculation",
			tags: ["Beds"],
		})
		.input(BedCensusQuerySchema)
		.output(BedCensusResponseSchema),

	dashboard: oc
		.route({
			method: "GET",
			path: "/beds/dashboard",
			summary: "Real-time census dashboard with activity metrics",
			tags: ["Beds"],
		})
		.input(CensusDashboardQuerySchema)
		.output(CensusDashboardResponseSchema),

	borTrend: oc
		.route({
			method: "GET",
			path: "/beds/bor/trend",
			summary: "BOR trend by period (7d/30d/90d/1y)",
			tags: ["Beds"],
		})
		.input(BorTrendQuerySchema)
		.output(BorTrendResponseSchema),

	exportAhsr: oc
		.route({
			method: "GET",
			path: "/beds/bor/export",
			summary: "Export AHSR-format census data (DOH columns)",
			tags: ["Beds"],
		})
		.input(AhsrExportQuerySchema)
		.output(AhsrExportResponseSchema),

	deleteWard: oc
		.route({
			method: "DELETE",
			path: "/beds/wards/{wardId}",
			summary: "Delete a ward (blocked if occupied beds exist)",
			tags: ["Beds"],
		})
		.input(DeleteWardSchema)
		.output(z.object({ success: z.boolean() })),
}
