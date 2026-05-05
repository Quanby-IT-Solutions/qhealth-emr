import { oc } from "@orpc/contract"

import {
	ClinicianListResponseSchema,
	CreatePatientSchema,
	ListCliniciansInputSchema,
	PatientIdSchema,
	PatientProfileResponseSchema,
	PatientSchema,
	PatientSearchResponseSchema,
	PatientSearchSchema,
	RegisterPatientWithOpdEncounterInputSchema,
	RegisterPatientWithOpdEncounterResponseSchema,
	UpdatePatientSchema,
} from "./patients.schema.js"

export const patientContract = {
	search: oc
		.route({
			method: "GET",
			path: "/patients",
			summary: "Search patients by name, MRN, date of birth, or PhilHealth number",
			tags: ["Patients"],
		})
		.input(PatientSearchSchema)
		.output(PatientSearchResponseSchema),

	listClinicians: oc
		.route({
			method: "GET",
			path: "/patients/clinicians",
			summary:
				"List active clinicians for a facility — accessible to registrar (opd:view), no admin permission required",
			tags: ["Patients"],
		})
		.input(ListCliniciansInputSchema)
		.output(ClinicianListResponseSchema),

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

	registerWithOpdEncounter: oc
		.route({
			method: "POST",
			path: "/patients/register-with-opd-encounter",
			summary: "Atomically register a new patient and create an OPD encounter (TOR Flow 1 Step 2)",
			tags: ["Patients"],
		})
		.input(RegisterPatientWithOpdEncounterInputSchema)
		.output(RegisterPatientWithOpdEncounterResponseSchema),
}
