import { oc } from "@orpc/contract"

import {
	SystemSettingsSchema,
	UpdateSystemSettingsSchema,
} from "./system-settings.schema.js"

export const systemSettingsContract = {
	/**
	 * Get system settings for the active facility.
	 * Auto-provisions the row on first access.
	 */
	get: oc
		.route({
			method: "GET",
			path: "/",
			summary: "Get system settings for the active facility (auto-provisioned on first read)",
			tags: ["System Settings"],
		})
		.output(SystemSettingsSchema),

	/**
	 * Update system settings. Computes per-field diff and writes audit atomically.
	 * Rejects unknown policySections keys (Zod .strict()).
	 */
	update: oc
		.route({
			method: "PATCH",
			path: "/",
			summary: "Update system settings for the active facility",
			tags: ["System Settings"],
		})
		.input(UpdateSystemSettingsSchema)
		.output(SystemSettingsSchema),
}
