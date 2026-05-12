import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	CreateFeatureFlagSchema,
	FeatureFlagDetailSchema,
	FeatureFlagIdSchema,
	FeatureFlagKeySchema,
	FeatureFlagListResponseSchema,
	FeatureFlagSchema,
	ResolvedFlagsSchema,
	UpdateFeatureFlagSchema,
	UpdateFeatureFlagTargetingSchema,
} from "./feature-flags.schema.js"

const FeatureFlagHistoryItemSchema = z.object({
	id: z.string().uuid(),
	flagId: z.string().uuid(),
	flagName: z.string(),
	previousValue: z.boolean().nullable(),
	newValue: z.boolean(),
	changedBy: z.string().uuid().nullable(),
	changedAt: z
		.union([z.date(), z.string()])
		.transform(v => (typeof v === "string" ? new Date(v) : v)),
	reason: z.string().nullable(),
})

const FeatureFlagHistoryQuerySchema = z.object({
	flagId: z.string().uuid(),
	page: z.number().int().positive().optional().default(1),
	limit: z.number().int().min(1).max(100).optional().default(20),
})

const EvaluateResponseSchema = z.object({
	key: z.string(),
	enabled: z.boolean(),
	defaultEnabled: z.boolean(),
})

export const featureFlagsContract = {
	list: oc
		.route({
			method: "GET",
			path: "/",
			summary: "List all feature flags with their targeting configuration",
			tags: ["Feature Flags"],
		})
		.output(FeatureFlagListResponseSchema),

	get: oc
		.route({
			method: "GET",
			path: "/{id}",
			summary: "Get a feature flag detail including targets",
			tags: ["Feature Flags"],
		})
		.input(FeatureFlagIdSchema)
		.output(FeatureFlagDetailSchema),

	create: oc
		.route({
			method: "POST",
			path: "/",
			summary: "Create a new feature flag definition",
			tags: ["Feature Flags"],
		})
		.input(CreateFeatureFlagSchema)
		.output(FeatureFlagSchema),

	update: oc
		.route({
			method: "PATCH",
			path: "/{id}",
			summary: "Update a feature flag definition",
			tags: ["Feature Flags"],
		})
		.input(UpdateFeatureFlagSchema)
		.output(FeatureFlagSchema),

	delete: oc
		.route({
			method: "DELETE",
			path: "/{id}",
			summary: "Delete a feature flag and all its targets",
			tags: ["Feature Flags"],
		})
		.input(FeatureFlagIdSchema)
		.output(FeatureFlagSchema),

	updateTargeting: oc
		.route({
			method: "PUT",
			path: "/{flagId}/targets",
			summary: "Replace targeting configuration for a flag (full replace, audited diff)",
			tags: ["Feature Flags"],
		})
		.input(UpdateFeatureFlagTargetingSchema)
		.output(FeatureFlagDetailSchema),

	/**
	 * Bulk-resolve all flags for the calling user's active facility + role.
	 * `environment` is derived server-side from APP_ENVIRONMENT/NODE_ENV.
	 */
	resolveForSession: oc
		.route({
			method: "GET",
			path: "/resolve",
			summary: "Resolve all feature flags for the current session context",
			tags: ["Feature Flags"],
		})
		.output(ResolvedFlagsSchema),

	/**
	 * Evaluate a single flag by key for the calling user's active context.
	 * Use this for critical paths where a cache miss must be authoritative.
	 */
	evaluate: oc
		.route({
			method: "GET",
			path: "/evaluate/{key}",
			summary: "Evaluate a single feature flag by key for the current session",
			tags: ["Feature Flags"],
		})
		.input(FeatureFlagKeySchema)
		.output(EvaluateResponseSchema),

	/**
	 * Paginated history of changes for a specific feature flag.
	 */
	history: oc
		.route({
			method: "GET",
			path: "/{flagId}/history",
			summary: "Get paginated change history for a feature flag",
			tags: ["Feature Flags"],
		})
		.input(FeatureFlagHistoryQuerySchema)
		.output(
			z.object({
				data: z.array(FeatureFlagHistoryItemSchema),
				total: z.number().int(),
				page: z.number().int(),
				limit: z.number().int(),
			})
		),
}
