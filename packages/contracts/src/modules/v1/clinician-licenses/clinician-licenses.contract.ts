import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	AddLicenseSchema,
	AddMyLicenseSchema,
	ClinicianLicenseSchema,
	ClinicianWithLicensesSchema,
	LicenseIdSchema,
	ListCliniciansQuerySchema,
	UpdateLicenseSchema,
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
		.output(
			z.object({
				data: z.array(ClinicianWithLicensesSchema),
				total: z.number().int(),
				page: z.number().int(),
				limit: z.number().int(),
			})
		),

	getMine: oc
		.route({
			method: "GET",
			path: "/me",
			summary: "Get licenses for the signed-in clinician",
			tags: ["Clinician Licenses"],
		})
		.output(ClinicianWithLicensesSchema),

	get: oc
		.route({
			method: "GET",
			path: "/{staffProfileId}",
			summary: "Get licenses for a specific clinician",
			tags: ["Clinician Licenses"],
		})
		.input(z.object({ staffProfileId: z.string().uuid() }))
		.output(ClinicianWithLicensesSchema),

	addMine: oc
		.route({
			method: "POST",
			path: "/me",
			summary: "Add a license record for the signed-in clinician",
			tags: ["Clinician Licenses"],
		})
		.input(AddMyLicenseSchema)
		.output(ClinicianLicenseSchema),

	add: oc
		.route({
			method: "POST",
			path: "/",
			summary: "Add a license record for a clinician (admin only)",
			tags: ["Clinician Licenses"],
		})
		.input(AddLicenseSchema)
		.output(ClinicianLicenseSchema),

	updateMine: oc
		.route({
			method: "PATCH",
			path: "/me/{id}",
			summary: "Update a license record for the signed-in clinician",
			tags: ["Clinician Licenses"],
		})
		.input(UpdateLicenseSchema)
		.output(ClinicianLicenseSchema),

	update: oc
		.route({
			method: "PATCH",
			path: "/{id}",
			summary: "Update a clinician license record",
			tags: ["Clinician Licenses"],
		})
		.input(UpdateLicenseSchema)
		.output(ClinicianLicenseSchema),

	verifyMine: oc
		.route({
			method: "POST",
			path: "/me/{id}/verify",
			summary: "Verify a license record for the signed-in clinician",
			tags: ["Clinician Licenses"],
		})
		.input(VerifyLicenseSchema)
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

	deleteMine: oc
		.route({
			method: "DELETE",
			path: "/me/{id}",
			summary: "Delete a license record for the signed-in clinician",
			tags: ["Clinician Licenses"],
		})
		.input(LicenseIdSchema)
		.output(z.object({ success: z.boolean() })),

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
