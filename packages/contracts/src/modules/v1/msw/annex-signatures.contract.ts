import { oc } from "@orpc/contract"
import { z } from "zod"

const dateOrString = z.union([z.date(), z.string()])

const AnnexSignatureSchema = z.object({
	id: z.string().uuid(),
	encounterId: z.string().uuid(),
	annexType: z.enum(["A", "B"]),
	patientSignatureUri: z.string(),
	witnessSignatureUri: z.string().nullable(),
	pdfUri: z.string().nullable(),
	contentHash: z.string().nullable(),
	replacedById: z.string().uuid().nullable(),
	replaceReason: z.string().nullable(),
	signedAt: dateOrString,
	createdAt: dateOrString,
})

const CaptureAnnexSchema = z.object({
	encounterId: z.string().uuid(),
	annexType: z.enum(["A", "B"]),
	patientSignaturePngBase64: z.string(),
	witnessSignaturePngBase64: z.string().optional(),
	replace: z.boolean().optional().default(false),
	replaceReason: z.string().optional(),
})

const AnnexListSchema = z.object({
	encounterId: z.string().uuid().optional(),
	patientId: z.string().uuid().optional(),
	annexType: z.enum(["A", "B"]).optional(),
})

export const annexSignaturesContract = {
	capture: oc
		.route({
			method: "POST",
			path: "/annex-signatures/capture",
			summary: "Capture PhilHealth Annex A/B signature",
			tags: ["MSW Annex"],
		})
		.input(CaptureAnnexSchema)
		.output(AnnexSignatureSchema),

	list: oc
		.route({
			method: "GET",
			path: "/annex-signatures",
			summary: "List annex signatures",
			tags: ["MSW Annex"],
		})
		.input(AnnexListSchema)
		.output(z.array(AnnexSignatureSchema)),

	get: oc
		.route({
			method: "GET",
			path: "/annex-signatures/{id}",
			summary: "Get annex signature by ID",
			tags: ["MSW Annex"],
		})
		.input(z.object({ id: z.string().uuid() }))
		.output(AnnexSignatureSchema),
}
