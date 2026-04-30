import { oc } from "@orpc/contract"

import {
	SystemSettingsSchema,
	TriggerOfflineCacheJobResultSchema,
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

	/**
	 * Manually trigger an offline cache preparation job for the active facility.
	 * Counts active patients and records the result in offline_cache_jobs.
	 */
	triggerCacheJob: oc
		.route({
			method: "POST",
			path: "/offline-cache/trigger",
			summary: "Manually trigger an offline cache preparation job for the active facility",
			tags: ["System Settings"],
		})
		.output(TriggerOfflineCacheJobResultSchema),
}
