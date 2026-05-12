import { oc } from "@orpc/contract"
import { z } from "zod"

import { CoeProgramEnum } from "./msw.schema.js"

const dateOrString = z.union([z.date(), z.string()])

const CoeCertificateSchema = z.object({
	id: z.string().uuid(),
	evaluationId: z.string().uuid(),
	type: z.enum(["malasakit", "z_benefits", "indigent"]),
	amountApproved: z.number().nullable(),
	issuedByStaffId: z.string().uuid(),
	pdfUri: z.string().nullable(),
	signedAt: dateOrString.nullable(),
	voidedAt: dateOrString.nullable(),
	voidReason: z.string().nullable(),
	createdAt: dateOrString,
})

const IssueCoeV2Schema = z.object({
	evaluationId: z.string().uuid(),
	type: z.enum(["malasakit", "z_benefits", "indigent"]),
	amountApproved: z.number().nonnegative().optional(),
	signatureData: z.string().optional(),
	witnessName: z.string().optional(),
})

const RevokeCoeSchema = z.object({
	certificateId: z.string().uuid(),
	reason: z.string().min(1),
})

const CoeListSchema = z.object({
	evaluationId: z.string().uuid().optional(),
	encounterId: z.string().uuid().optional(),
	patientId: z.string().uuid().optional(),
})

export const coeContract = {
	issue: oc
		.route({
			method: "POST",
			path: "/coe/issue",
			summary: "Issue Certificate of Eligibility",
			tags: ["MSW CoE"],
		})
		.input(IssueCoeV2Schema)
		.output(CoeCertificateSchema),

	revoke: oc
		.route({
			method: "POST",
			path: "/coe/{certificateId}/revoke",
			summary: "Revoke Certificate of Eligibility",
			tags: ["MSW CoE"],
		})
		.input(RevokeCoeSchema)
		.output(CoeCertificateSchema),

	list: oc
		.route({
			method: "GET",
			path: "/coe",
			summary: "List CoE certificates",
			tags: ["MSW CoE"],
		})
		.input(CoeListSchema)
		.output(z.array(CoeCertificateSchema)),

	get: oc
		.route({
			method: "GET",
			path: "/coe/{id}",
			summary: "Get CoE certificate by ID",
			tags: ["MSW CoE"],
		})
		.input(z.object({ id: z.string().uuid() }))
		.output(CoeCertificateSchema),
}
