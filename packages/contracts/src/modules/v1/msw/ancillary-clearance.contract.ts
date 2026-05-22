import { oc } from "@orpc/contract"
import { z } from "zod"

const dateOrString = z.union([z.date(), z.string()])

const AncillaryTypeEnum = z.enum(["Lab", "Imaging", "Pharmacy"])

const CoverageSourceSchema = z.object({
	type: z.enum(["malasakit", "philhealth", "coe"]),
	referenceId: z.string(),
	amount: z.number().nonnegative(),
})

const AncillaryClearanceRecordSchema = z.object({
	id: z.string().uuid(),
	orderId: z.string().uuid(),
	encounterId: z.string().uuid().nullable(),
	appliedCoverages: z.array(CoverageSourceSchema).nullable(),
	status: z.string(),
	clearedByStaffId: z.string().uuid().nullable(),
	clearedAt: dateOrString.nullable(),
	overrideReason: z.string().nullable(),
	procedureStartAt: dateOrString.nullable(),
	procedureEndAt: dateOrString.nullable(),
	procedureStartBarcode: z.string().nullable(),
	procedureEndBarcode: z.string().nullable(),
	procedureStartBarcodeMatched: z.boolean(),
	procedureEndBarcodeMatched: z.boolean(),
	procedureStartedByStaffId: z.string().uuid().nullable(),
	procedureEndedByStaffId: z.string().uuid().nullable(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

const QueueItemSchema = z.object({
	orderId: z.string().uuid(),
	encounterId: z.string().uuid().nullable(),
	patientName: z.string().nullable(),
	ancillaryType: AncillaryTypeEnum,
	status: z.string(),
	waitTimeMinutes: z.number(),
	clearanceRecord: AncillaryClearanceRecordSchema.nullable(),
})

const ProcedureLogItemSchema = z.object({
	id: z.string().uuid(),
	orderId: z.string().uuid(),
	encounterId: z.string().uuid().nullable(),
	patientName: z.string().nullable(),
	patientMrn: z.string().nullable(),
	ancillaryType: AncillaryTypeEnum,
	procedureName: z.string().nullable(),
	status: z.string(),
	procedureStatus: z.enum(["not_started", "in_progress", "completed"]),
	startAt: dateOrString.nullable(),
	endAt: dateOrString.nullable(),
	durationMinutes: z.number().nullable(),
	slaStatus: z.enum(["ok", "breach", "in_progress", "not_started"]),
	procedureStartBarcodeMatched: z.boolean(),
	procedureEndBarcodeMatched: z.boolean(),
	procedureStartedByStaffId: z.string().uuid().nullable(),
	procedureEndedByStaffId: z.string().uuid().nullable(),
})

const QueueListSchema = z.object({
	ancillaryType: AncillaryTypeEnum.optional(),
	encounterId: z.string().uuid().optional(),
})

const ProcedureLogInputSchema = z.object({
	facilityId: z.string().uuid().optional(),
	limit: z.coerce.number().int().positive().max(100).default(50),
})

const ResolveProcedureClearanceInputSchema = z.object({
	facilityId: z.string().uuid().optional(),
	patientMrn: z.string().trim().min(1).max(100),
	scanType: z.enum(["start", "end"]),
})

const SaveProcedureClearanceInputSchema = ResolveProcedureClearanceInputSchema.extend({
	clearanceId: z.string().uuid().optional(),
})

const ResolveProcedureClearanceResultSchema = z.object({
	patient: z
		.object({
			id: z.string().uuid(),
			mrn: z.string(),
			name: z.string().nullable(),
		})
		.nullable(),
	clearance: z
		.object({
			id: z.string().uuid(),
			orderId: z.string().uuid(),
			encounterId: z.string().uuid().nullable(),
			procedureStatus: z.enum(["not_started", "in_progress", "completed"]),
			scanEligible: z.boolean(),
			created: z.boolean(),
			startAt: dateOrString.nullable(),
			endAt: dateOrString.nullable(),
		})
		.nullable(),
})

const ApplyCoverageSchema = z.object({
	orderId: z.string().uuid(),
	encounterId: z.string().uuid(),
	coverageSources: z.array(CoverageSourceSchema),
	reason: z.string().optional(),
})

const OverrideSchema = z.object({
	orderId: z.string().uuid(),
	encounterId: z.string().uuid(),
	reason: z.string().min(1),
})

const ProcedureScanSchema = z.object({
	identifier: z.string().trim().min(1).max(100),
	scanType: z.enum(["start", "end"]),
	patientBarcode: z.string().trim().min(1).max(100),
})

const ProcedureScanResultSchema = z.object({
	record: AncillaryClearanceRecordSchema,
	patientBarcodeMatched: z.boolean(),
	message: z.string(),
})

const HistorySchema = z.object({
	orderId: z.string().uuid(),
})

export const ancillaryClearanceContract = {
	queue: oc
		.route({
			method: "GET",
			path: "/ancillary-clearance/queue",
			summary: "List ancillary orders awaiting clearance",
			tags: ["MSW Ancillary"],
		})
		.input(QueueListSchema)
		.output(z.array(QueueItemSchema)),

	procedureLog: oc
		.route({
			method: "GET",
			path: "/ancillary-clearance/procedure-log",
			summary: "List ancillary clearance records for procedure logging",
			tags: ["MSW Ancillary"],
		})
		.input(ProcedureLogInputSchema)
		.output(z.array(ProcedureLogItemSchema)),

	resolveProcedureClearance: oc
		.route({
			method: "GET",
			path: "/ancillary-clearance/procedure-clearance",
			summary: "Resolve an ancillary procedure clearance record for a patient MRN",
			tags: ["MSW Ancillary"],
		})
		.input(ResolveProcedureClearanceInputSchema)
		.output(ResolveProcedureClearanceResultSchema),

	saveProcedureClearance: oc
		.route({
			method: "POST",
			path: "/ancillary-clearance/procedure-clearance",
			summary: "Create an ancillary procedure clearance record for a patient MRN",
			tags: ["MSW Ancillary"],
		})
		.input(SaveProcedureClearanceInputSchema)
		.output(ResolveProcedureClearanceResultSchema),

	applyCoverage: oc
		.route({
			method: "POST",
			path: "/ancillary-clearance/apply-coverage",
			summary: "Apply coverage and clear order",
			tags: ["MSW Ancillary"],
		})
		.input(ApplyCoverageSchema)
		.output(AncillaryClearanceRecordSchema),

	override: oc
		.route({
			method: "POST",
			path: "/ancillary-clearance/override",
			summary: "Override clearance without coverage",
			tags: ["MSW Ancillary"],
		})
		.input(OverrideSchema)
		.output(AncillaryClearanceRecordSchema),

	procedureScan: oc
		.route({
			method: "POST",
			path: "/ancillary-clearance/procedure-scan",
			summary: "Record ancillary procedure start/end barcode scan",
			tags: ["MSW Ancillary"],
		})
		.input(ProcedureScanSchema)
		.output(ProcedureScanResultSchema),

	history: oc
		.route({
			method: "GET",
			path: "/ancillary-clearance/history/{orderId}",
			summary: "Get clearance history for an order",
			tags: ["MSW Ancillary"],
		})
		.input(HistorySchema)
		.output(z.array(AncillaryClearanceRecordSchema)),
}
