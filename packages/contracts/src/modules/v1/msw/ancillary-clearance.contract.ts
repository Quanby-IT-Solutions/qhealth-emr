import { oc } from "@orpc/contract"
import { z } from "zod"

const dateOrString = z.union([z.date(), z.string()])

const AncillaryTypeEnum = z.enum(["Lab", "Imaging", "Pharmacy"])
const ClearanceStatusEnum = z.enum(["pending", "cleared", "overridden"])

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
	status: ClearanceStatusEnum,
	clearedByStaffId: z.string().uuid().nullable(),
	clearedAt: dateOrString.nullable(),
	overrideReason: z.string().nullable(),
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

const QueueListSchema = z.object({
	ancillaryType: AncillaryTypeEnum.optional(),
	encounterId: z.string().uuid().optional(),
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
