import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	CreateNbsConsentSchema,
	CreateNbsReferralSchema,
	CreateNbsScreeningSchema,
	NbsConsentByNbsIdParamsSchema,
	NbsConsentSchema,
	NbsLogbookQuerySchema,
	NbsLogbookResponseSchema,
	NbsReferralByIdParamsSchema,
	NbsReferralsByNbsIdParamsSchema,
	NbsReferralSchema,
	NbsScreeningByEncounterParamsSchema,
	NbsScreeningByIdParamsSchema,
	NbsScreeningSchema,
	UpdateNbsReferralSchema,
	UpdateNbsScreeningSchema,
} from "./nbs.schema.js"

export const nbsContract = {
	// ========================================================================
	// Screening
	// ========================================================================

	getScreeningByEncounter: oc
		.route({
			method: "GET",
			path: "/encounters/{encounterId}/screening",
			summary: "Get NBS screening for an encounter",
			tags: ["NBS"],
		})
		.input(NbsScreeningByEncounterParamsSchema)
		.output(NbsScreeningSchema.nullable()),

	createScreening: oc
		.route({
			method: "POST",
			path: "/screenings",
			summary: "Create a new NBS screening",
			tags: ["NBS"],
		})
		.input(CreateNbsScreeningSchema)
		.output(NbsScreeningSchema),

	updateScreening: oc
		.route({
			method: "PATCH",
			path: "/screenings/{id}",
			summary: "Update an NBS screening",
			tags: ["NBS"],
		})
		.input(UpdateNbsScreeningSchema)
		.output(NbsScreeningSchema),

	// ========================================================================
	// Consent
	// ========================================================================

	getConsentByNbsId: oc
		.route({
			method: "GET",
			path: "/screenings/{nbsId}/consent",
			summary: "Get NBS consent for a screening",
			tags: ["NBS"],
		})
		.input(NbsConsentByNbsIdParamsSchema)
		.output(NbsConsentSchema.nullable()),

	createConsent: oc
		.route({
			method: "POST",
			path: "/consents",
			summary: "Create NBS consent",
			tags: ["NBS"],
		})
		.input(CreateNbsConsentSchema)
		.output(NbsConsentSchema),

	// ========================================================================
	// Referrals
	// ========================================================================

	getReferralsByNbsId: oc
		.route({
			method: "GET",
			path: "/screenings/{nbsId}/referrals",
			summary: "Get NBS referrals for a screening",
			tags: ["NBS"],
		})
		.input(NbsReferralsByNbsIdParamsSchema)
		.output(z.array(NbsReferralSchema)),

	createReferral: oc
		.route({
			method: "POST",
			path: "/referrals",
			summary: "Create NBS referral",
			tags: ["NBS"],
		})
		.input(CreateNbsReferralSchema)
		.output(NbsReferralSchema),

	updateReferral: oc
		.route({
			method: "PATCH",
			path: "/referrals/{id}",
			summary: "Update an NBS referral",
			tags: ["NBS"],
		})
		.input(UpdateNbsReferralSchema)
		.output(NbsReferralSchema),

	// ========================================================================
	// Logbook
	// ========================================================================

	getLogbook: oc
		.route({
			method: "GET",
			path: "/logbook",
			summary: "Get NBS logbook with pagination",
			tags: ["NBS"],
		})
		.input(NbsLogbookQuerySchema)
		.output(NbsLogbookResponseSchema),
}
