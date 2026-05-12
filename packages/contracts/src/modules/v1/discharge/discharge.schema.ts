import { z } from "zod"

export const ClearanceStatusSchema = z.object({
	encounterId: z.string().uuid(),
	pharmacyCleared: z.boolean(),
	pharmacyClearedAt: z.string().nullable(),
	nursingCleared: z.boolean(),
	nursingClearedAt: z.string().nullable(),
	billingSignedOff: z.boolean(),
	billingSignedOffAt: z.string().nullable(),
	allConfirmed: z.boolean(),
})

export const ConfirmClearanceInputSchema = z.object({
	encounterId: z.string().uuid(),
})

export const GatePassSchema = z.object({
	id: z.string().uuid(),
	encounterId: z.string().uuid(),
	facilityId: z.string().uuid(),
	issuedAt: z.string(),
	issuedByStaffId: z.string().uuid().nullable(),
	patientName: z.string(),
	wardName: z.string(),
	bedNumber: z.string(),
	admissionDatetime: z.string(),
	dischargeDatetime: z.string(),
	lengthOfStayDays: z.number().int(),
	disposition: z.enum(["home", "transfer", "deceased", "ama"]),
	deathClassification: z.enum(["gross", "net"]).nullable(),
	qrCodePayload: z.string(),
	pdfUri: z.string().nullable(),
	createdAt: z.string(),
})

export const IssueGatePassInputSchema = z.object({
	encounterId: z.string().uuid(),
})

export const GetClearanceStatusInputSchema = z.object({
	encounterId: z.string().uuid(),
})

export const GetGatePassInputSchema = z.object({
	encounterId: z.string().uuid(),
})
