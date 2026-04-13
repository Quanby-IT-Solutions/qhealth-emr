import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	BedCensusQuerySchema,
	BedCensusResponseSchema,
	BedListResponseSchema,
	BedListSchema,
	BedSchema,
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

	census: oc
		.route({
			method: "GET",
			path: "/beds/census",
			summary: "Get bed census snapshot with BOR calculation",
			tags: ["Beds"],
		})
		.input(BedCensusQuerySchema)
		.output(BedCensusResponseSchema),
}
