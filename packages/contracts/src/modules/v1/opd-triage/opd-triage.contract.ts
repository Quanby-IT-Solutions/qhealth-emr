import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	CreateOpdTriageIntakeSchema,
	LinkOpdTriageToPatientSchema,
	ListPendingTriageSchema,
	OpdTriageIntakeIdSchema,
	OpdTriageIntakeSchema,
	OpdTriageIntakeWithPatientSchema,
} from "./opd-triage.schema.js"

export const opdTriageContract = {
	create: oc
		.route({
			method: "POST",
			path: "/opd-triage",
			summary: "Record OPD triage intake (arrival time, vitals, chief complaint)",
			tags: ["OPD Triage"],
		})
		.input(CreateOpdTriageIntakeSchema)
		.output(OpdTriageIntakeSchema),

	get: oc
		.route({
			method: "GET",
			path: "/opd-triage/{id}",
			summary: "Get OPD triage intake by ID",
			tags: ["OPD Triage"],
		})
		.input(OpdTriageIntakeIdSchema)
		.output(OpdTriageIntakeWithPatientSchema),

	listPending: oc
		.route({
			method: "GET",
			path: "/opd-triage",
			summary: "List pending OPD triage intakes for registrar queue",
			tags: ["OPD Triage"],
		})
		.input(ListPendingTriageSchema)
		.output(z.array(OpdTriageIntakeWithPatientSchema)),

	linkToPatient: oc
		.route({
			method: "PATCH",
			path: "/opd-triage/{id}/link-patient",
			summary: "Link a pre-registration triage intake to a registered patient (registrar reconciliation)",
			tags: ["OPD Triage"],
		})
		.input(LinkOpdTriageToPatientSchema)
		.output(OpdTriageIntakeSchema),
}
