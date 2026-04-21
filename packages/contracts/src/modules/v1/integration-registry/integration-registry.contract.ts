import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	CreateIntegrationSchema,
	CredentialRefsSchema,
	IntegrationIdSchema,
	IntegrationSchema,
	UpdateIntegrationSchema,
} from "./integration-registry.schema.js"

export const integrationRegistryContract = {
	/**
	 * List all integrations for the active facility.
	 * credentialStatus is computed per-row server-side.
	 */
	list: oc
		.route({
			method: "GET",
			path: "/",
			summary: "List integrations for the active facility",
			tags: ["Integration Registry"],
		})
		.output(z.array(IntegrationSchema)),

	/**
	 * Get a single integration by ID.
	 */
	get: oc
		.route({
			method: "GET",
			path: "/{id}",
			summary: "Get an integration by ID",
			tags: ["Integration Registry"],
		})
		.input(IntegrationIdSchema)
		.output(IntegrationSchema),

	/**
	 * Create a new integration.
	 */
	create: oc
		.route({
			method: "POST",
			path: "/",
			summary: "Create a new integration",
			tags: ["Integration Registry"],
		})
		.input(CreateIntegrationSchema)
		.output(IntegrationSchema),

	/**
	 * Update an existing integration. Writes a per-field audit log atomically.
	 */
	update: oc
		.route({
			method: "PATCH",
			path: "/{id}",
			summary: "Update an integration",
			tags: ["Integration Registry"],
		})
		.input(UpdateIntegrationSchema)
		.output(IntegrationSchema),

	/**
	 * Delete an integration (audited). Requires explicit confirmation in UI.
	 */
	delete: oc
		.route({
			method: "DELETE",
			path: "/{id}",
			summary: "Delete an integration",
			tags: ["Integration Registry"],
		})
		.input(IntegrationIdSchema)
		.output(IntegrationSchema),

	/**
	 * List whitelisted credential env var names (no values).
	 * Used to populate the credential picker in the UI.
	 */
	listCredentialRefs: oc
		.route({
			method: "GET",
			path: "/credential-refs",
			summary: "List whitelisted credential env var names (no values exposed)",
			tags: ["Integration Registry"],
		})
		.output(CredentialRefsSchema),
}
