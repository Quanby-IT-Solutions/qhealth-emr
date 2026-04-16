import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	CreateFmdrfInputSchema,
	CreateFndrfInputSchema,
	DeathReportStatusSchema,
	FmdrfIdInputSchema,
	FmdrfReportSchema,
	FndrfIdInputSchema,
	FndrfReportSchema,
	GetDeathReportStatusInputSchema,
	GetFmdrfInputSchema,
	GetFndrfInputSchema,
	UpdateFmdrfInputSchema,
	UpdateFndrfInputSchema,
} from "./death-reporting.schema.js"

export const deathReportingContract = {
	// Status endpoint
	getStatus: oc
		.route({
			method: "GET",
			path: "/death-reporting/status",
			summary: "Get death report status for an encounter",
			tags: ["Death Reporting"],
		})
		.input(GetDeathReportStatusInputSchema)
		.output(DeathReportStatusSchema),

	// FMDRF endpoints
	getFmdrf: oc
		.route({
			method: "GET",
			path: "/death-reporting/fmdrf",
			summary: "Get FMDRF report by encounter",
			tags: ["Death Reporting"],
		})
		.input(GetFmdrfInputSchema)
		.output(FmdrfReportSchema.nullable()),

	createFmdrf: oc
		.route({
			method: "POST",
			path: "/death-reporting/fmdrf",
			summary: "Create FMDRF report",
			tags: ["Death Reporting"],
		})
		.input(CreateFmdrfInputSchema)
		.output(FmdrfReportSchema),

	updateFmdrf: oc
		.route({
			method: "PATCH",
			path: "/death-reporting/fmdrf/{id}",
			summary: "Update FMDRF report",
			tags: ["Death Reporting"],
		})
		.input(UpdateFmdrfInputSchema)
		.output(FmdrfReportSchema),

	// FNDRF endpoints
	getFndrf: oc
		.route({
			method: "GET",
			path: "/death-reporting/fndrf",
			summary: "Get FNDRF report by encounter",
			tags: ["Death Reporting"],
		})
		.input(GetFndrfInputSchema)
		.output(FndrfReportSchema.nullable()),

	createFndrf: oc
		.route({
			method: "POST",
			path: "/death-reporting/fndrf",
			summary: "Create FNDRF report",
			tags: ["Death Reporting"],
		})
		.input(CreateFndrfInputSchema)
		.output(FndrfReportSchema),

	updateFndrf: oc
		.route({
			method: "PATCH",
			path: "/death-reporting/fndrf/{id}",
			summary: "Update FNDRF report",
			tags: ["Death Reporting"],
		})
		.input(UpdateFndrfInputSchema)
		.output(FndrfReportSchema),
}
