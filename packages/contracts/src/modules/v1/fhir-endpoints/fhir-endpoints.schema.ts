import { z } from "zod"

const dateOrString = z
	.union([z.date(), z.string()])
	.transform(v => (typeof v === "string" ? new Date(v) : v))

export const FhirEndpointSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	name: z.string(),
	endpointUrl: z.string().url(),
	fhirVersion: z.enum(["DSTU2", "STU3", "R4", "R5"]),
	authMethod: z.enum(["none", "basic", "bearer", "oauth2_client_credentials"]),
	// credential stored server-side, never returned
	authCredentialsRef: z.string().nullable(),
	resourceTypes: z.array(z.string()),
	cronSchedule: z.string().nullable(),
	enabled: z.boolean(),
	lastTestedAt: dateOrString.nullable(),
	lastTestStatus: z.enum(["ok", "error"]).nullable(),
	lastTestLatencyMs: z.number().int().nullable(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type FhirEndpoint = z.infer<typeof FhirEndpointSchema>

export const UpsertFhirEndpointSchema = z.object({
	id: z.string().uuid().optional(),
	facilityId: z.string().uuid(),
	name: z.string().min(1).max(100),
	endpointUrl: z.string().url(),
	fhirVersion: z.enum(["DSTU2", "STU3", "R4", "R5"]).default("R4"),
	authMethod: z.enum(["none", "basic", "bearer", "oauth2_client_credentials"]).default("none"),
	authCredentialsRef: z.string().nullable().optional(),
	resourceTypes: z.array(z.string()).default([]),
	cronSchedule: z.string().nullable().optional(),
	enabled: z.boolean().default(false),
})

export type UpsertFhirEndpointInput = z.infer<typeof UpsertFhirEndpointSchema>

export const FhirEndpointIdSchema = z.object({ id: z.string().uuid() })

export const ListFhirEndpointsSchema = z.object({ facilityId: z.string().uuid() })

export const TestConnectionResultSchema = z.object({
	status: z.enum(["ok", "error"]),
	httpStatus: z.number().nullable(),
	latencyMs: z.number().nullable(),
	detail: z.string(),
})

export type TestConnectionResult = z.infer<typeof TestConnectionResultSchema>

export const FhirExchangeLogEntrySchema = z.object({
	id: z.string().uuid(),
	endpointId: z.string().uuid(),
	facilityId: z.string().uuid(),
	direction: z.enum(["push", "pull"]),
	resourceType: z.string(),
	resourceId: z.string().nullable(),
	status: z.enum(["success", "partial", "failed"]),
	httpStatus: z.number().nullable(),
	errorMessage: z.string().nullable(),
	durationMs: z.number().nullable(),
	fhirVersionId: z.string().nullable(),
	occurredAt: dateOrString,
})

export type FhirExchangeLogEntry = z.infer<typeof FhirExchangeLogEntrySchema>

export const ListExchangeLogSchema = z.object({
	endpointId: z.string().uuid().optional(),
	facilityId: z.string().uuid(),
	status: z.enum(["success", "partial", "failed"]).optional(),
	resourceType: z.string().optional(),
	page: z.number().int().positive().default(1),
	limit: z.number().int().min(1).max(100).default(20),
})

export type ListExchangeLogInput = z.infer<typeof ListExchangeLogSchema>

export const ExchangeLogResponseSchema = z.object({
	data: z.array(FhirExchangeLogEntrySchema),
	total: z.number(),
	page: z.number(),
	limit: z.number(),
})

export type ExchangeLogResponse = z.infer<typeof ExchangeLogResponseSchema>

export const RetryExchangeSchema = z.object({
	logId: z.string().uuid(),
})

export type RetryExchangeInput = z.infer<typeof RetryExchangeSchema>

export const RetryExchangeResponseSchema = z.object({
	success: z.boolean(),
	message: z.string(),
})
