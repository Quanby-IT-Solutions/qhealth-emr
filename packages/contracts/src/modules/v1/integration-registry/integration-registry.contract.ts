import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	ApiKeySchema,
	ConnectivityTestResultSchema,
	CreateIntegrationSchema,
	CreateWebhookSchema,
	CredentialRefsSchema,
	GenerateApiKeySchema,
	GeneratedApiKeyResponseSchema,
	IntegrationIdSchema,
	IntegrationSchema,
	ListApiKeysSchema,
	RevokeApiKeySchema,
	RotateApiKeySchema,
	RotatedApiKeyResponseSchema,
	UpdateIntegrationSchema,
	UpdateWebhookSchema,
	WebhookEndpointSchema,
	WebhookIdSchema,
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

	/**
	 * Perform an on-demand connectivity test against an integration's endpoint.
	 * Returns HTTP status, latency, and a human-readable detail string.
	 * Requires edit permission — identical to the save action.
	 */
	testConnectivity: oc
		.route({
			method: "POST",
			path: "/{id}/test-connectivity",
			summary: "Test connectivity to an integration endpoint",
			tags: ["Integration Registry"],
		})
		.input(IntegrationIdSchema)
		.output(ConnectivityTestResultSchema),

	listApiKeys: oc
		.route({
			method: "GET",
			path: "/{integrationId}/keys",
			summary: "List API keys for an integration (hashes never returned)",
			tags: ["Integration Registry"],
		})
		.input(ListApiKeysSchema)
		.output(z.array(ApiKeySchema)),

	generateApiKey: oc
		.route({
			method: "POST",
			path: "/{integrationId}/keys",
			summary: "Generate a new API key — raw key shown once in response",
			tags: ["Integration Registry"],
		})
		.input(GenerateApiKeySchema)
		.output(GeneratedApiKeyResponseSchema),

	revokeApiKey: oc
		.route({
			method: "DELETE",
			path: "/keys/{id}",
			summary: "Revoke an API key",
			tags: ["Integration Registry"],
		})
		.input(RevokeApiKeySchema)
		.output(ApiKeySchema),

	rotateApiKey: oc
		.route({
			method: "POST",
			path: "/keys/{id}/rotate",
			summary: "Rotate an API key with configurable grace period",
			tags: ["Integration Registry"],
		})
		.input(RotateApiKeySchema)
		.output(RotatedApiKeyResponseSchema),

	listWebhooks: oc
		.route({
			method: "GET",
			path: "/{integrationId}/webhooks",
			summary: "List webhook endpoints for an integration",
			tags: ["Integration Registry"],
		})
		.input(z.object({ integrationId: z.string() }))
		.output(z.array(WebhookEndpointSchema)),

	createWebhook: oc
		.route({
			method: "POST",
			path: "/{integrationId}/webhooks",
			summary: "Create a webhook endpoint for an integration",
			tags: ["Integration Registry"],
		})
		.input(CreateWebhookSchema)
		.output(WebhookEndpointSchema),

	updateWebhook: oc
		.route({
			method: "PATCH",
			path: "/webhooks/{id}",
			summary: "Update a webhook endpoint",
			tags: ["Integration Registry"],
		})
		.input(UpdateWebhookSchema)
		.output(WebhookEndpointSchema),

	deleteWebhook: oc
		.route({
			method: "DELETE",
			path: "/webhooks/{id}",
			summary: "Delete a webhook endpoint",
			tags: ["Integration Registry"],
		})
		.input(WebhookIdSchema)
		.output(WebhookEndpointSchema),
}
