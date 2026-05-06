import { oc } from "@orpc/contract"

import {
	AttachIdentityProofInputSchema,
	AttachPhysicianSignatureInputSchema,
	CaptureDpaConsentInputSchema,
	ConfirmHaiInputSchema,
	DismissHaiInputSchema,
	GetDeficiencyInputSchema,
	HaiExportInputSchema,
	HaiExportResponseSchema,
	HaiReconciliationSchema,
	HaiReportInputSchema,
	HaiReportResponseSchema,
	ListCodesInputSchema,
	ListCodesResponseSchema,
	ListDeficienciesInputSchema,
	ListDeficienciesResponseSchema,
	ListHaiInputSchema,
	ListHaiResponseSchema,
	ListRecordsAuditInputSchema,
	ListRecordsAuditResponseSchema,
	MarkDeficiencyResolvedInputSchema,
	MarkPaymentClearedInputSchema,
	NotifyDeficiencyInputSchema,
	ReclassifyHaiInputSchema,
	ReleaseRecordsInputSchema,
	ScanDeficienciesInputSchema,
	ScanDeficienciesResponseSchema,
	SignCodesInputSchema,
	UpsertCodesInputSchema,
	AmendCodesInputSchema,
	ValidateCodesInputSchema,
	ValidateCodesResponseSchema,
	DeficiencyDetailSchema,
	EncounterCodeSchema,
} from "./him.schema.js"
import { z } from "zod"

export const himContract = {
	// Deficiencies
	listDeficiencies: oc
		.route({ method: "GET", path: "/him/deficiencies", summary: "List chart deficiencies", tags: ["HIM"] })
		.input(ListDeficienciesInputSchema)
		.output(ListDeficienciesResponseSchema),

	getDeficiency: oc
		.route({ method: "GET", path: "/him/deficiencies/{id}", summary: "Get a chart deficiency", tags: ["HIM"] })
		.input(GetDeficiencyInputSchema)
		.output(DeficiencyDetailSchema),

	notifyDeficiency: oc
		.route({ method: "POST", path: "/him/deficiencies/{id}/notify", summary: "Notify deficiency owner", tags: ["HIM"] })
		.input(NotifyDeficiencyInputSchema)
		.output(z.object({ success: z.boolean(), notificationId: z.string().uuid() })),

	markDeficiencyResolved: oc
		.route({ method: "POST", path: "/him/deficiencies/{id}/resolve", summary: "Mark deficiency resolved", tags: ["HIM"] })
		.input(MarkDeficiencyResolvedInputSchema)
		.output(DeficiencyDetailSchema),

	scanDeficiencies: oc
		.route({ method: "POST", path: "/him/deficiencies/scan", summary: "Scan encounters for deficiencies", tags: ["HIM"] })
		.input(ScanDeficienciesInputSchema)
		.output(ScanDeficienciesResponseSchema),

	// Coding
	listCodes: oc
		.route({ method: "GET", path: "/him/coding", summary: "List ICD-10 codes for an encounter", tags: ["HIM"] })
		.input(ListCodesInputSchema)
		.output(ListCodesResponseSchema),

	upsertCodes: oc
		.route({ method: "POST", path: "/him/coding/upsert", summary: "Upsert ICD-10 codes", tags: ["HIM"] })
		.input(UpsertCodesInputSchema)
		.output(ListCodesResponseSchema),

	signCodes: oc
		.route({ method: "POST", path: "/him/coding/sign", summary: "Sign ICD-10 coding", tags: ["HIM"] })
		.input(SignCodesInputSchema)
		.output(ListCodesResponseSchema),

	amendCodes: oc
		.route({ method: "POST", path: "/him/coding/amend", summary: "Amend signed coding (creates new version)", tags: ["HIM"] })
		.input(AmendCodesInputSchema)
		.output(ListCodesResponseSchema),

	validateCodes: oc
		.route({ method: "GET", path: "/him/coding/validate", summary: "Validate coding against deprecation rules", tags: ["HIM"] })
		.input(ValidateCodesInputSchema)
		.output(ValidateCodesResponseSchema),

	// Records audit + issuance gate writes
	listRecordsAudit: oc
		.route({ method: "GET", path: "/him/records/audit", summary: "List records release audit trail", tags: ["HIM"] })
		.input(ListRecordsAuditInputSchema)
		.output(ListRecordsAuditResponseSchema),

	captureDpaConsent: oc
		.route({ method: "POST", path: "/him/records/{requestId}/dpa-consent", summary: "Capture DPA consent", tags: ["HIM"] })
		.input(CaptureDpaConsentInputSchema)
		.output(z.object({ success: z.boolean() })),

	attachIdentityProof: oc
		.route({ method: "POST", path: "/him/records/{requestId}/identity-proof", summary: "Attach identity proof", tags: ["HIM"] })
		.input(AttachIdentityProofInputSchema)
		.output(z.object({ success: z.boolean() })),

	attachPhysicianSignature: oc
		.route({ method: "POST", path: "/him/records/{requestId}/physician-signature", summary: "Attach physician signature", tags: ["HIM"] })
		.input(AttachPhysicianSignatureInputSchema)
		.output(z.object({ success: z.boolean() })),

	markRecordsPaymentCleared: oc
		.route({ method: "POST", path: "/him/records/{requestId}/payment-cleared", summary: "Mark records payment cleared", tags: ["HIM"] })
		.input(MarkPaymentClearedInputSchema)
		.output(z.object({ success: z.boolean() })),

	releaseRecords: oc
		.route({ method: "POST", path: "/him/records/{requestId}/release", summary: "Release medical records", tags: ["HIM"] })
		.input(ReleaseRecordsInputSchema)
		.output(z.object({ success: z.boolean(), auditId: z.string().uuid() })),

	// HAI
	listHai: oc
		.route({ method: "GET", path: "/him/hai", summary: "List HAI tags", tags: ["HIM"] })
		.input(ListHaiInputSchema)
		.output(ListHaiResponseSchema),

	confirmHai: oc
		.route({ method: "POST", path: "/him/hai/confirm", summary: "Confirm HAI tag", tags: ["HIM"] })
		.input(ConfirmHaiInputSchema)
		.output(HaiReconciliationSchema),

	reclassifyHai: oc
		.route({ method: "POST", path: "/him/hai/reclassify", summary: "Reclassify HAI tag", tags: ["HIM"] })
		.input(ReclassifyHaiInputSchema)
		.output(HaiReconciliationSchema),

	dismissHai: oc
		.route({ method: "POST", path: "/him/hai/dismiss", summary: "Dismiss HAI tag", tags: ["HIM"] })
		.input(DismissHaiInputSchema)
		.output(HaiReconciliationSchema),

	haiReport: oc
		.route({ method: "GET", path: "/him/hai/report", summary: "HAI surveillance report", tags: ["HIM"] })
		.input(HaiReportInputSchema)
		.output(HaiReportResponseSchema),

	haiExport: oc
		.route({ method: "POST", path: "/him/hai/export", summary: "Export HAI report (AHSR)", tags: ["HIM"] })
		.input(HaiExportInputSchema)
		.output(HaiExportResponseSchema),
}

export type HimContract = typeof himContract
