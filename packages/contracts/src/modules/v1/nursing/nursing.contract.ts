import { oc } from "@orpc/contract"

import {
	AdministerMarSchema,
	AdministerTarSchema,
	ConsentRecordIdSchema,
	ConsentRecordListResponseSchema,
	ConsentRecordListSchema,
	ConsentRecordSchema,
	CreateConsentRecordSchema,
	FinalizeHandoffSchema,
	FlowsheetListResponseSchema,
	FlowsheetListSchema,
	GenerateHandoffSchema,
	GeneratedHandoffResponseSchema,
	HaiTagIdSchema,
	HaiTagListResponseSchema,
	HaiTagListSchema,
	HaiTagSchema,
	IoBalanceResponseSchema,
	IoBalanceSchema,
	IoEntryListResponseSchema,
	IoEntryListSchema,
	IoEntrySchema,
	MarEntryIdSchema,
	MarEntryListResponseSchema,
	MarEntryListSchema,
	MarEntrySchema,
	ShiftHandoffIdSchema,
	ShiftHandoffListResponseSchema,
	ShiftHandoffListSchema,
	ShiftHandoffSchema,
	TarEntryIdSchema,
	TarEntryListResponseSchema,
	TarEntryListSchema,
	TarEntrySchema,
	UpdateHaiTagSchema,
	VitalSignIdSchema,
	VitalSignListResponseSchema,
	VitalSignListSchema,
	VitalSignSchema,
} from "./nursing.schema.js"

export const nursingContract = {
	// ========================================================================
	// Vital Signs
	// ========================================================================

	listVitals: oc
		.route({
			method: "GET",
			path: "/vitals",
			summary: "List vital sign entries",
			tags: ["Nursing — Vitals"],
		})
		.input(VitalSignListSchema)
		.output(VitalSignListResponseSchema),

	getVital: oc
		.route({
			method: "GET",
			path: "/vitals/{id}",
			summary: "Get vital sign entry by ID",
			tags: ["Nursing — Vitals"],
		})
		.input(VitalSignIdSchema)
		.output(VitalSignSchema),

	createVital: oc
		.route({
			method: "POST",
			path: "/vitals",
			summary: "Record vital signs with auto NEWS calculation",
			tags: ["Nursing — Vitals"],
		})
		.input(CreateVitalSignSchema)
		.output(VitalSignSchema),

	// ========================================================================
	// MAR Entries
	// ========================================================================

	listMarEntries: oc
		.route({
			method: "GET",
			path: "/mar",
			summary: "List MAR entries (time-grid data)",
			tags: ["Nursing — MAR"],
		})
		.input(MarEntryListSchema)
		.output(MarEntryListResponseSchema),

	getMarEntry: oc
		.route({
			method: "GET",
			path: "/mar/{id}",
			summary: "Get MAR entry by ID",
			tags: ["Nursing — MAR"],
		})
		.input(MarEntryIdSchema)
		.output(MarEntrySchema),

	administerMar: oc
		.route({
			method: "PUT",
			path: "/mar/{id}/administer",
			summary: "Administer, hold, or refuse a medication (MAR)",
			tags: ["Nursing — MAR"],
		})
		.input(AdministerMarSchema)
		.output(MarEntrySchema),

	// ========================================================================
	// TAR Entries
	// ========================================================================

	listTarEntries: oc
		.route({
			method: "GET",
			path: "/tar",
			summary: "List TAR entries",
			tags: ["Nursing — TAR"],
		})
		.input(TarEntryListSchema)
		.output(TarEntryListResponseSchema),

	getTarEntry: oc
		.route({
			method: "GET",
			path: "/tar/{id}",
			summary: "Get TAR entry by ID",
			tags: ["Nursing — TAR"],
		})
		.input(TarEntryIdSchema)
		.output(TarEntrySchema),

	createTarEntry: oc
		.route({
			method: "POST",
			path: "/tar",
			summary: "Create a TAR entry",
			tags: ["Nursing — TAR"],
		})
		.input(CreateTarEntrySchema)
		.output(TarEntrySchema),

	administerTar: oc
		.route({
			method: "PUT",
			path: "/tar/{id}/administer",
			summary: "Complete or mark a treatment (TAR)",
			tags: ["Nursing — TAR"],
		})
		.input(AdministerTarSchema)
		.output(TarEntrySchema),

	// ========================================================================
	// I/O Entries
	// ========================================================================

	listIoEntries: oc
		.route({
			method: "GET",
			path: "/io",
			summary: "List intake/output entries",
			tags: ["Nursing — I/O"],
		})
		.input(IoEntryListSchema)
		.output(IoEntryListResponseSchema),

	createIoEntry: oc
		.route({
			method: "POST",
			path: "/io",
			summary: "Record an intake or output entry",
			tags: ["Nursing — I/O"],
		})
		.input(CreateIoEntrySchema)
		.output(IoEntrySchema),

	getIoBalance: oc
		.route({
			method: "GET",
			path: "/io/balance",
			summary: "Get 24hr I/O fluid balance",
			tags: ["Nursing — I/O"],
		})
		.input(IoBalanceSchema)
		.output(IoBalanceResponseSchema),

	// ========================================================================
	// Flowsheets
	// ========================================================================

	listFlowsheetEntries: oc
		.route({
			method: "GET",
			path: "/flowsheets",
			summary: "List flowsheet entries (time-series grid)",
			tags: ["Nursing — Flowsheets"],
		})
		.input(FlowsheetListSchema)
		.output(FlowsheetListResponseSchema),

	// ========================================================================
	// Shift Handoff
	// ========================================================================

	listHandoffs: oc
		.route({
			method: "GET",
			path: "/handoffs",
			summary: "List shift handoff reports",
			tags: ["Nursing — Handoff"],
		})
		.input(ShiftHandoffListSchema)
		.output(ShiftHandoffListResponseSchema),

	getHandoff: oc
		.route({
			method: "GET",
			path: "/handoffs/{id}",
			summary: "Get shift handoff by ID",
			tags: ["Nursing — Handoff"],
		})
		.input(ShiftHandoffIdSchema)
		.output(ShiftHandoffSchema),

	generateHandoffSummary: oc
		.route({
			method: "POST",
			path: "/handoffs/generate",
			summary: "Auto-generate a shift handoff summary",
			tags: ["Nursing — Handoff"],
		})
		.input(GenerateHandoffSchema)
		.output(GeneratedHandoffResponseSchema),

	createHandoff: oc
		.route({
			method: "POST",
			path: "/handoffs",
			summary: "Create a shift handoff report",
			tags: ["Nursing — Handoff"],
		})
		.input(CreateShiftHandoffSchema)
		.output(ShiftHandoffSchema),

	finalizeHandoff: oc
		.route({
			method: "PUT",
			path: "/handoffs/{id}/finalize",
			summary: "Finalize (sign) a shift handoff",
			tags: ["Nursing — Handoff"],
		})
		.input(FinalizeHandoffSchema)
		.output(ShiftHandoffSchema),

	// ========================================================================
	// HAI Tags
	// ========================================================================

	listHaiTags: oc
		.route({
			method: "GET",
			path: "/hai-tags",
			summary: "List HAI tags",
			tags: ["Nursing — HAI"],
		})
		.input(HaiTagListSchema)
		.output(HaiTagListResponseSchema),

	getHaiTag: oc
		.route({
			method: "GET",
			path: "/hai-tags/{id}",
			summary: "Get HAI tag by ID",
			tags: ["Nursing — HAI"],
		})
		.input(HaiTagIdSchema)
		.output(HaiTagSchema),

	createHaiTag: oc
		.route({
			method: "POST",
			path: "/hai-tags",
			summary: "Create an HAI tag",
			tags: ["Nursing — HAI"],
		})
		.input(CreateHaiTagSchema)
		.output(HaiTagSchema),

	updateHaiTag: oc
		.route({
			method: "PUT",
			path: "/hai-tags/{id}",
			summary: "Update an HAI tag",
			tags: ["Nursing — HAI"],
		})
		.input(UpdateHaiTagSchema)
		.output(HaiTagSchema),

	// ========================================================================
	// Consent Records
	// ========================================================================

	listConsents: oc
		.route({
			method: "GET",
			path: "/consents",
			summary: "List consent records for an encounter",
			tags: ["Nursing — Consents"],
		})
		.input(ConsentRecordListSchema)
		.output(ConsentRecordListResponseSchema),

	getConsent: oc
		.route({
			method: "GET",
			path: "/consents/{id}",
			summary: "Get a consent record by ID",
			tags: ["Nursing — Consents"],
		})
		.input(ConsentRecordIdSchema)
		.output(ConsentRecordSchema),

	createConsent: oc
		.route({
			method: "POST",
			path: "/consents",
			summary: "Create and persist a signed consent record",
			tags: ["Nursing — Consents"],
		})
		.input(CreateConsentRecordSchema)
		.output(ConsentRecordSchema),
}
