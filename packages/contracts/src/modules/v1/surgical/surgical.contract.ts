import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	AnesthesiaRecordSchema,
	CreateSurgicalCaseSchema,
	OperationRecordSchema,
	OrConflictCheckResponseSchema,
	OrConflictCheckSchema,
	OrSlotSchema,
	OrSlotsQuerySchema,
	PreOpChecklistSchema,
	RemoveRvsAssignmentSchema,
	RvsAssignmentSchema,
	RvsCodesQuerySchema,
	RvsCodesResponseSchema,
	SaveAnesthesiaRecordSchema,
	SaveOperationRecordSchema,
	SavePreOpChecklistSchema,
	SignAnesthesiaRecordSchema,
	SignOperationRecordSchema,
	SuggestRvsCodeSchema,
	SurgicalCaseListResponseSchema,
	SurgicalCaseListSchema,
	SurgicalCaseSchema,
	UpdateRvsStatusSchema,
	UpdateSurgicalCaseSchema,
} from "./surgical.schema.js"

export const surgicalContract = {
	// ========================================================================
	// Surgical Cases
	// ========================================================================

	listCases: oc
		.route({
			method: "GET",
			path: "/cases",
			summary: "List surgical cases with filtering and pagination",
			tags: ["Surgical"],
		})
		.input(SurgicalCaseListSchema)
		.output(SurgicalCaseListResponseSchema),

	getCase: oc
		.route({
			method: "GET",
			path: "/cases/{id}",
			summary: "Get surgical case details by ID",
			tags: ["Surgical"],
		})
		.input(z.object({ id: z.string().uuid() }))
		.output(SurgicalCaseSchema),

	createCase: oc
		.route({
			method: "POST",
			path: "/cases",
			summary: "Create a new surgical case",
			tags: ["Surgical"],
		})
		.input(CreateSurgicalCaseSchema)
		.output(SurgicalCaseSchema),

	updateCase: oc
		.route({
			method: "PUT",
			path: "/cases/{id}",
			summary: "Update a surgical case",
			tags: ["Surgical"],
		})
		.input(UpdateSurgicalCaseSchema)
		.output(SurgicalCaseSchema),

	// ========================================================================
	// Operation Record
	// ========================================================================

	getOperationRecord: oc
		.route({
			method: "GET",
			path: "/cases/{caseId}/operation-record",
			summary: "Get operation record for a surgical case",
			tags: ["Surgical"],
		})
		.input(z.object({ caseId: z.string().uuid() }))
		.output(OperationRecordSchema.nullable()),

	saveOperationRecord: oc
		.route({
			method: "PUT",
			path: "/cases/{caseId}/operation-record",
			summary: "Create or update operation record",
			tags: ["Surgical"],
		})
		.input(SaveOperationRecordSchema)
		.output(OperationRecordSchema),

	signOperationRecord: oc
		.route({
			method: "PUT",
			path: "/cases/{caseId}/operation-record/sign",
			summary: "Sign an operation record",
			tags: ["Surgical"],
		})
		.input(SignOperationRecordSchema)
		.output(OperationRecordSchema),

	// ========================================================================
	// Anesthesia Record
	// ========================================================================

	getAnesthesiaRecord: oc
		.route({
			method: "GET",
			path: "/cases/{caseId}/anesthesia-record",
			summary: "Get anesthesia record for a surgical case",
			tags: ["Surgical"],
		})
		.input(z.object({ caseId: z.string().uuid() }))
		.output(AnesthesiaRecordSchema.nullable()),

	saveAnesthesiaRecord: oc
		.route({
			method: "PUT",
			path: "/cases/{caseId}/anesthesia-record",
			summary: "Create or update anesthesia record",
			tags: ["Surgical"],
		})
		.input(SaveAnesthesiaRecordSchema)
		.output(AnesthesiaRecordSchema),

	signAnesthesiaRecord: oc
		.route({
			method: "PUT",
			path: "/cases/{caseId}/anesthesia-record/sign",
			summary: "Sign an anesthesia record, locking it from further edits",
			tags: ["Surgical"],
		})
		.input(SignAnesthesiaRecordSchema)
		.output(AnesthesiaRecordSchema),

	// ========================================================================
	// Pre-Op Checklist
	// ========================================================================

	getPreOpChecklist: oc
		.route({
			method: "GET",
			path: "/cases/{caseId}/pre-op-checklist",
			summary: "Get pre-op checklist for a surgical case",
			tags: ["Surgical"],
		})
		.input(z.object({ caseId: z.string().uuid() }))
		.output(PreOpChecklistSchema.nullable()),

	savePreOpChecklist: oc
		.route({
			method: "PUT",
			path: "/cases/{caseId}/pre-op-checklist",
			summary: "Create or update pre-op checklist",
			tags: ["Surgical"],
		})
		.input(SavePreOpChecklistSchema)
		.output(PreOpChecklistSchema),

	// ========================================================================
	// RVS Codes
	// ========================================================================

	searchRvsCodes: oc
		.route({
			method: "GET",
			path: "/rvs-codes",
			summary: "Search RVS codes",
			tags: ["Surgical"],
		})
		.input(RvsCodesQuerySchema)
		.output(RvsCodesResponseSchema),

	// ========================================================================
	// RVS Assignments
	// ========================================================================

	listRvsAssignments: oc
		.route({
			method: "GET",
			path: "/cases/{caseId}/rvs-assignments",
			summary: "List RVS assignments for a surgical case",
			tags: ["Surgical"],
		})
		.input(z.object({ caseId: z.string().uuid() }))
		.output(z.array(RvsAssignmentSchema)),

	suggestRvsCode: oc
		.route({
			method: "POST",
			path: "/cases/{caseId}/rvs-assignments",
			summary: "Suggest an RVS code for a surgical case",
			tags: ["Surgical"],
		})
		.input(SuggestRvsCodeSchema)
		.output(RvsAssignmentSchema),

	updateRvsStatus: oc
		.route({
			method: "PUT",
			path: "/cases/{caseId}/rvs-assignments/{assignmentId}",
			summary: "Update RVS assignment status",
			tags: ["Surgical"],
		})
		.input(UpdateRvsStatusSchema)
		.output(RvsAssignmentSchema),

	removeRvsAssignment: oc
		.route({
			method: "DELETE",
			path: "/cases/{caseId}/rvs-assignments/{assignmentId}",
			summary: "Remove an RVS assignment",
			tags: ["Surgical"],
		})
		.input(RemoveRvsAssignmentSchema)
		.output(z.object({ success: z.boolean() })),

	// ========================================================================
	// OR Slots
	// ========================================================================

	listOrSlots: oc
		.route({
			method: "GET",
			path: "/or-slots",
			summary: "List OR slots for a facility and week",
			tags: ["Surgical"],
		})
		.input(OrSlotsQuerySchema)
		.output(z.array(OrSlotSchema)),

	// ========================================================================
	// OR Conflict Check
	// ========================================================================

	checkOrConflicts: oc
		.route({
			method: "POST",
			path: "/or-conflicts/check",
			summary: "Check for OR scheduling conflicts (room, surgeon, equipment)",
			tags: ["Surgical"],
		})
		.input(OrConflictCheckSchema)
		.output(OrConflictCheckResponseSchema),
}
