import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	CancelOpdTeleTriageIntakeSchema,
	CreateOpdTeleTriageIntakeSchema,
	CreateOpdTriageIntakeSchema,
	LinkOpdTriageToPatientSchema,
	ListOpdTeleTriageIntakesSchema,
	ListPendingTriageSchema,
	MarkOpdTeleTriageArrivedResultSchema,
	OpdTeleTriageIntakeIdSchema,
	OpdTeleTriageIntakeSchema,
	OpdTeleTriageLiveKitSessionEndResponseSchema,
	OpdTeleTriageLiveKitTokenResponseSchema,
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
			summary:
				"Link a pre-registration triage intake to a registered patient (registrar reconciliation)",
			tags: ["OPD Triage"],
		})
		.input(LinkOpdTriageToPatientSchema)
		.output(OpdTriageIntakeSchema),

	createRemoteIntake: oc
		.route({
			method: "POST",
			path: "/opd-triage/remote-intakes",
			summary: "Record OPD tele-triage intake before patient arrival",
			tags: ["OPD Triage"],
		})
		.input(CreateOpdTeleTriageIntakeSchema)
		.output(OpdTeleTriageIntakeSchema),

	listRemoteIntakes: oc
		.route({
			method: "GET",
			path: "/opd-triage/remote-intakes",
			summary: "List inbound OPD tele-triage patients",
			tags: ["OPD Triage"],
		})
		.input(ListOpdTeleTriageIntakesSchema)
		.output(z.array(OpdTeleTriageIntakeSchema)),

	markRemoteArrived: oc
		.route({
			method: "PATCH",
			path: "/opd-triage/remote-intakes/{id}/arrived",
			summary: "Mark OPD tele-triage patient arrived and create OPD triage intake",
			tags: ["OPD Triage"],
		})
		.input(OpdTeleTriageIntakeIdSchema)
		.output(MarkOpdTeleTriageArrivedResultSchema),

	cancelRemoteIntake: oc
		.route({
			method: "PATCH",
			path: "/opd-triage/remote-intakes/{id}/cancel",
			summary: "Cancel or no-show an OPD tele-triage intake",
			tags: ["OPD Triage"],
		})
		.input(CancelOpdTeleTriageIntakeSchema)
		.output(OpdTeleTriageIntakeSchema),

	joinRemoteLiveKitRoom: oc
		.route({
			method: "POST",
			path: "/opd-triage/remote-intakes/{id}/livekit-token",
			summary: "Get a LiveKit access token for an OPD tele-triage intake",
			tags: ["OPD Triage"],
		})
		.input(OpdTeleTriageIntakeIdSchema)
		.output(OpdTeleTriageLiveKitTokenResponseSchema),

	endRemoteLiveKitSession: oc
		.route({
			method: "POST",
			path: "/opd-triage/remote-intakes/{id}/livekit-session/end",
			summary: "Mark an OPD tele-triage LiveKit session ended",
			tags: ["OPD Triage"],
		})
		.input(OpdTeleTriageIntakeIdSchema)
		.output(OpdTeleTriageLiveKitSessionEndResponseSchema),
}
