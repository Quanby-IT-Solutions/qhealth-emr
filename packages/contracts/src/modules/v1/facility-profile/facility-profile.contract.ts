import { oc } from "@orpc/contract"

import { FacilityProfileSchema, UpdateFacilityProfileSchema } from "./facility-profile.schema.js"

export const facilityProfileContract = {
	/**
	 * Get the facility profile for the active facility.
	 * Auto-provisions the row on first access.
	 */
	get: oc
		.route({
			method: "GET",
			path: "/",
			summary: "Get facility profile (auto-provisioned on first read)",
			tags: ["Facility Profile"],
		})
		.output(FacilityProfileSchema),

	/**
	 * Update the facility profile. Writes a per-field audit log atomically.
	 */
	update: oc
		.route({
			method: "PATCH",
			path: "/",
			summary: "Update facility profile",
			tags: ["Facility Profile"],
		})
		.input(UpdateFacilityProfileSchema)
		.output(FacilityProfileSchema),
}
