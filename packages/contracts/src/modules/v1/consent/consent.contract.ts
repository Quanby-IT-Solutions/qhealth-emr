import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	BreakGlassRequestSchema,
	BreakGlassResponseSchema,
	BreakGlassVerifyResultSchema,
	CheckConsentSchema,
	ConsentCheckResultSchema,
	ConsentIdSchema,
	ConsentListResponseSchema,
	ConsentListSchema,
	ConsentRecordSchema,
	CreateConsentSchema,
	PatientConsentsSchema,
	RevokeConsentSchema,
	SignConsentSchema,
	VerifyBreakGlassSchema,
} from "./consent.schema.js"

export const consentContract = {
	// ========================================================================
	// Consent Management
	// ========================================================================

	list: oc
		.route({
			method: "GET",
			path: "/records",
			summary: "List consent records",
			tags: ["Consent"],
		})
		.input(ConsentListSchema)
		.output(ConsentListResponseSchema),

	get: oc
		.route({
			method: "GET",
			path: "/records/{id}",
			summary: "Get consent record by ID",
			tags: ["Consent"],
		})
		.input(ConsentIdSchema)
		.output(ConsentRecordSchema),

	getPatientConsents: oc
		.route({
			method: "GET",
			path: "/records/patient/{patientId}",
			summary: "Get all active consents for a patient",
			tags: ["Consent"],
		})
		.input(PatientConsentsSchema)
		.output(z.array(ConsentRecordSchema)),

	create: oc
		.route({
			method: "POST",
			path: "/records",
			summary: "Create consent record (pending signature)",
			tags: ["Consent"],
		})
		.input(CreateConsentSchema)
		.output(ConsentRecordSchema),

	sign: oc
		.route({
			method: "POST",
			path: "/records/{id}/sign",
			summary: "Sign consent record",
			tags: ["Consent"],
		})
		.input(SignConsentSchema)
		.output(ConsentRecordSchema),

	revoke: oc
		.route({
			method: "POST",
			path: "/records/{id}/revoke",
			summary: "Revoke consent",
			tags: ["Consent"],
		})
		.input(RevokeConsentSchema)
		.output(ConsentRecordSchema),

	// ========================================================================
	// Consent Checks
	// ========================================================================

	checkConsent: oc
		.route({
			method: "GET",
			path: "/check",
			summary: "Check if patient has valid consent of a specific type",
			tags: ["Consent"],
		})
		.input(CheckConsentSchema)
		.output(ConsentCheckResultSchema),

	// ========================================================================
	// Break-Glass Access
	// ========================================================================

	requestBreakGlass: oc
		.route({
			method: "POST",
			path: "/break-glass/request",
			summary: "Request break-glass emergency access",
			tags: ["Consent — Break-Glass"],
		})
		.input(BreakGlassRequestSchema)
		.output(BreakGlassResponseSchema),

	verifyBreakGlass: oc
		.route({
			method: "POST",
			path: "/break-glass/verify",
			summary: "Verify break-glass access token",
			tags: ["Consent — Break-Glass"],
		})
		.input(VerifyBreakGlassSchema)
		.output(BreakGlassVerifyResultSchema),
}
