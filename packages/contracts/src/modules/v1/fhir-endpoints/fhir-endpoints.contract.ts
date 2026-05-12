import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	ExchangeLogResponseSchema,
	FhirEndpointIdSchema,
	FhirEndpointSchema,
	ListExchangeLogSchema,
	ListFhirEndpointsSchema,
	RetryExchangeResponseSchema,
	RetryExchangeSchema,
	TestConnectionResultSchema,
	UpsertFhirEndpointSchema,
} from "./fhir-endpoints.schema.js"

export const fhirEndpointsContract = {
	list: oc
		.route({
			method: "GET",
			path: "/",
			summary: "List FHIR endpoints for a facility",
			tags: ["FHIR Endpoints"],
		})
		.input(ListFhirEndpointsSchema)
		.output(z.array(FhirEndpointSchema)),

	get: oc
		.route({
			method: "GET",
			path: "/{id}",
			summary: "Get FHIR endpoint by ID",
			tags: ["FHIR Endpoints"],
		})
		.input(FhirEndpointIdSchema)
		.output(FhirEndpointSchema),

	upsert: oc
		.route({
			method: "PUT",
			path: "/",
			summary: "Create or update a FHIR endpoint",
			tags: ["FHIR Endpoints"],
		})
		.input(UpsertFhirEndpointSchema)
		.output(FhirEndpointSchema),

	delete: oc
		.route({
			method: "DELETE",
			path: "/{id}",
			summary: "Delete a FHIR endpoint",
			tags: ["FHIR Endpoints"],
		})
		.input(FhirEndpointIdSchema)
		.output(z.object({ success: z.boolean() })),

	testConnection: oc
		.route({
			method: "POST",
			path: "/{id}/test-connection",
			summary: "Test connectivity to FHIR endpoint",
			tags: ["FHIR Endpoints"],
		})
		.input(FhirEndpointIdSchema)
		.output(TestConnectionResultSchema),

	listExchangeLog: oc
		.route({
			method: "GET",
			path: "/exchange-log",
			summary: "List FHIR exchange log",
			tags: ["FHIR Endpoints"],
		})
		.input(ListExchangeLogSchema)
		.output(ExchangeLogResponseSchema),

	retryExchange: oc
		.route({
			method: "POST",
			path: "/exchange-log/{logId}/retry",
			summary: "Retry a failed FHIR exchange log entry",
			tags: ["FHIR Endpoints"],
		})
		.input(RetryExchangeSchema)
		.output(RetryExchangeResponseSchema),
}
