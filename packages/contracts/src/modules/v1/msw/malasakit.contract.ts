import { oc } from "@orpc/contract"
import { z } from "zod"

const dateOrString = z.union([z.date(), z.string()])

const MalasakitSourceEnum = z.enum(["DSWD", "PCSO", "DOH-MAIFIP"])
const MalasakitStatusEnum = z.enum(["pending", "approved", "released", "denied"])

const MalasakitCaseSchema = z.object({
	id: z.string().uuid(),
	encounterId: z.string().uuid().nullable(),
	patientId: z.string().uuid(),
	patientName: z.string().nullable(),
	source: MalasakitSourceEnum,
	status: MalasakitStatusEnum,
	amountGranted: z.number().nullable(),
	referenceNo: z.string().nullable(),
	deniedReason: z.string().nullable(),
	mswOwnerStaffId: z.string().uuid().nullable(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

const MalasakitStatusLogSchema = z.object({
	id: z.string().uuid(),
	caseId: z.string().uuid(),
	fromStatus: MalasakitStatusEnum.nullable(),
	toStatus: MalasakitStatusEnum,
	actorStaffId: z.string().uuid().nullable(),
	note: z.string().nullable(),
	changedAt: dateOrString,
})

const CreateMalasakitCaseSchema = z.object({
	encounterId: z.string().uuid().optional(),
	patientId: z.string().uuid(),
	source: MalasakitSourceEnum,
	amountGranted: z.number().nonnegative().optional(),
	referenceNo: z.string().optional(),
})

const UpdateMalasakitCaseSchema = z.object({
	id: z.string().uuid(),
	status: MalasakitStatusEnum.optional(),
	amountGranted: z.number().nonnegative().optional(),
	referenceNo: z.string().optional(),
	deniedReason: z.string().optional(),
	note: z.string().optional(),
})

const ListMalasakitCasesSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(25),
	source: MalasakitSourceEnum.optional(),
	status: MalasakitStatusEnum.optional(),
	patientId: z.string().uuid().optional(),
	encounterId: z.string().uuid().optional(),
	dateFrom: z.string().optional(),
	dateTo: z.string().optional(),
})

const ReconcileSchema = z.object({
	caseId: z.string().uuid(),
	billingPaymentId: z.string().uuid(),
	amount: z.number().positive(),
	reference: z.string(),
})

export const malasakitContract = {
	list: oc
		.route({
			method: "GET",
			path: "/malasakit/cases",
			summary: "List Malasakit cases",
			tags: ["MSW Malasakit"],
		})
		.input(ListMalasakitCasesSchema)
		.output(
			z.object({
				data: z.array(MalasakitCaseSchema),
				total: z.number(),
				page: z.number(),
				limit: z.number(),
				totalPages: z.number(),
			})
		),

	get: oc
		.route({
			method: "GET",
			path: "/malasakit/cases/{id}",
			summary: "Get Malasakit case",
			tags: ["MSW Malasakit"],
		})
		.input(z.object({ id: z.string().uuid() }))
		.output(MalasakitCaseSchema),

	create: oc
		.route({
			method: "POST",
			path: "/malasakit/cases",
			summary: "Create Malasakit case",
			tags: ["MSW Malasakit"],
		})
		.input(CreateMalasakitCaseSchema)
		.output(MalasakitCaseSchema),

	update: oc
		.route({
			method: "PUT",
			path: "/malasakit/cases/{id}",
			summary: "Update Malasakit case",
			tags: ["MSW Malasakit"],
		})
		.input(UpdateMalasakitCaseSchema)
		.output(MalasakitCaseSchema),

	statusLog: oc
		.route({
			method: "GET",
			path: "/malasakit/cases/{caseId}/status-log",
			summary: "Get Malasakit case status log",
			tags: ["MSW Malasakit"],
		})
		.input(z.object({ caseId: z.string().uuid() }))
		.output(z.array(MalasakitStatusLogSchema)),

	reconcile: oc
		.route({
			method: "POST",
			path: "/malasakit/cases/{caseId}/reconcile",
			summary: "Reconcile Malasakit grant with billing",
			tags: ["MSW Malasakit"],
		})
		.input(ReconcileSchema)
		.output(MalasakitCaseSchema),
}
