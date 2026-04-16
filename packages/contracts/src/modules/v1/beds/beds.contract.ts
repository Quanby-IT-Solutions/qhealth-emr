import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	BedCensusQuerySchema,
	BedCensusResponseSchema,
	BedListResponseSchema,
	BedListSchema,
	BedSchema,
	BedSuggestionQuerySchema,
	BedSuggestionResponseSchema,
	CensusDashboardQuerySchema,
	CensusDashboardResponseSchema,
	CreateBedSchema,
	CreateWardSchema,
	UpdateBedStatusSchema,
	WardListSchema,
	WardSchema,
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
}
