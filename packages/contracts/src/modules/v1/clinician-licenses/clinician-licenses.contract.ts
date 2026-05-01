import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	AddLicenseSchema,
	ClinicianLicenseSchema,
	ClinicianWithLicensesSchema,
	LicenseIdSchema,
	ListCliniciansQuerySchema,
	VerifyLicenseSchema,
} from "./clinician-licenses.schema.js"

export const clinicianLicensesContract = {
	list: oc
		.route({
			method: "GET",
			path: "/",
			summary: "List clinicians with their license status (admin only)",
			tags: ["Clinician Licenses"],
		})
		.input(ListCliniciansQuerySchema)
		.output(z.object({
			data: z.array(ClinicianWithLicensesSchema),
			total: z.number().int(),
			page: z.number().int(),
			limit: z.number().int(),
		})),

	get: oc
		.route({
			method: "GET",
			path: "/{staffProfileId}",
			summary: "Get licenses for a specific clinician",
			tags: ["Clinician Licenses"],
		})
		.input(z.object({ staffProfileId: z.string().uuid() }))
		.output(ClinicianWithLicensesSchema),

	add: oc
		.route({
			method: "POST",
			path: "/",
			summary: "Add a license record for a clinician (admin only)",
			tags: ["Clinician Licenses"],
		})
		.input(AddLicenseSchema)
		.output(ClinicianLicenseSchema),

	verify: oc
		.route({
			method: "POST",
			path: "/{id}/verify",
			summary: "Mark a license as verified (admin only)",
			tags: ["Clinician Licenses"],
		})
		.input(VerifyLicenseSchema)
		.output(ClinicianLicenseSchema),

	markPending: oc
		.route({
			method: "POST",
			path: "/{id}/mark-pending",
			summary: "Mark a license as pending review (admin only)",
			tags: ["Clinician Licenses"],
		})
		.input(LicenseIdSchema)
		.output(ClinicianLicenseSchema),

	delete: oc
		.route({
			method: "DELETE",
			path: "/{id}",
			summary: "Delete a license record (admin only)",
			tags: ["Clinician Licenses"],
		})
		.input(LicenseIdSchema)
		.output(z.object({ success: z.boolean() })),
}
