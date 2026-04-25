import { oc } from "@orpc/contract"

import {
	CreateMedicalRecordsRequestSchema,
	ListMedicalRecordsRequestsResponseSchema,
	ListMedicalRecordsRequestsSchema,
	MarkMedicalRecordsPaidInputSchema,
	MarkMedicalRecordsPaidResponseSchema,
	MarkMedicalRecordsReleasedInputSchema,
	MarkMedicalRecordsReleasedResponseSchema,
	MedicalRecordsRequestIdSchema,
	MedicalRecordsRequestSchema,
	UpdateMedicalRecordsRequestSchema,
} from "./medical-records.schema.js"

export const medicalRecordsContract = {
	listMedicalRecordsRequests: oc
		.route({
			method: "GET",
			path: "/medical-records/requests",
			summary: "List medical records requests",
			tags: ["Medical Records"],
		})
		.input(ListMedicalRecordsRequestsSchema)
		.output(ListMedicalRecordsRequestsResponseSchema),

	getMedicalRecordsRequest: oc
		.route({
			method: "GET",
			path: "/medical-records/requests/{id}",
			summary: "Get a medical records request by ID",
			tags: ["Medical Records"],
		})
		.input(MedicalRecordsRequestIdSchema)
		.output(MedicalRecordsRequestSchema),

	createMedicalRecordsRequest: oc
		.route({
			method: "POST",
			path: "/medical-records/requests",
			summary: "Create a medical records request (SLA-017)",
			tags: ["Medical Records"],
		})
		.input(CreateMedicalRecordsRequestSchema)
		.output(MedicalRecordsRequestSchema),

	updateMedicalRecordsRequest: oc
		.route({
			method: "PATCH",
			path: "/medical-records/requests/{id}",
			summary: "Update a medical records request (status transitions)",
			tags: ["Medical Records"],
		})
		.input(UpdateMedicalRecordsRequestSchema)
		.output(MedicalRecordsRequestSchema),

	// SLA-017: payment checkpoint for medical records/certificates
	markMedicalRecordsPaid: oc
		.route({
			method: "POST",
			path: "/medical-records/requests/{id}/mark-paid",
			summary: "Record payment receipt for a medical records request (SLA-017 Flow 7 Step 2)",
			tags: ["Medical Records"],
		})
		.input(MarkMedicalRecordsPaidInputSchema)
		.output(MarkMedicalRecordsPaidResponseSchema),

	// SLA-020: release evidence checkpoint for medical records/certificates
	markMedicalRecordsReleased: oc
		.route({
			method: "POST",
			path: "/medical-records/requests/{id}/mark-released",
			summary: "Record release of medical records to requestor (SLA-020 Flow 7 Step 3)",
			tags: ["Medical Records"],
		})
		.input(MarkMedicalRecordsReleasedInputSchema)
		.output(MarkMedicalRecordsReleasedResponseSchema),
}
