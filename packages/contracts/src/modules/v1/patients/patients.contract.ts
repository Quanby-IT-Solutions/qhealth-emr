import { oc } from "@orpc/contract"

import {
	CreatePatientSchema,
	PatientIdSchema,
	PatientProfileResponseSchema,
	PatientSchema,
	PatientSearchResponseSchema,
	PatientSearchSchema,
	UpdatePatientSchema,
} from "./patients.schema.js"

export const patientContract = {
	search: oc
		.route({
			method: "GET",
			path: "/patients",
			summary: "Search patients by name, MRN, or date of birth",
			tags: ["Patients"],
		})
		.input(PatientSearchSchema)
		.output(PatientSearchResponseSchema),

	get: oc
		.route({
			method: "GET",
			path: "/patients/{id}",
			summary: "Get patient profile with encounter history",
			tags: ["Patients"],
		})
		.input(PatientIdSchema)
		.output(PatientProfileResponseSchema),

	create: oc
		.route({
			method: "POST",
			path: "/patients",
			summary: "Register a new patient with auto-generated MRN",
			tags: ["Patients"],
		})
		.input(CreatePatientSchema)
		.output(PatientSchema),

	update: oc
		.route({
			method: "PUT",
			path: "/patients/{id}",
			summary: "Update patient demographics",
			tags: ["Patients"],
		})
		// oRPC's OpenAPILink automatically maps `UpdatePatientSchema.id` to the
		// `{id}` path parameter and sends the remaining fields as the request body.
		// No schema separation is needed — oRPC handles the path/body merge.
		.input(UpdatePatientSchema)
		.output(PatientSchema),
}
