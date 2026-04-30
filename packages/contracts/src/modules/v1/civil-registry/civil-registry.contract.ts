import { oc } from "@orpc/contract"

import {
	BirthRegistrationIdSchema,
	BirthRegistrationSchema,
	CreateBirthRegistrationSchema,
	ListBirthRegistrationsResponseSchema,
	ListBirthRegistrationsSchema,
	MarkBirthRegistrationPaidInputSchema,
	MarkBirthRegistrationPaidResponseSchema,
	MarkBirthRegistrationReleasedInputSchema,
	MarkBirthRegistrationReleasedResponseSchema,
	UpdateBirthRegistrationSchema,
} from "./civil-registry.schema.js"

export const civilRegistryContract = {
	listBirthRegistrations: oc
		.route({
			method: "GET",
			path: "/civil-registry/birth-registrations",
			summary: "List birth registrations",
			tags: ["Civil Registry"],
		})
		.input(ListBirthRegistrationsSchema)
		.output(ListBirthRegistrationsResponseSchema),

	getBirthRegistration: oc
		.route({
			method: "GET",
			path: "/civil-registry/birth-registrations/{id}",
			summary: "Get a birth registration by ID",
			tags: ["Civil Registry"],
		})
		.input(BirthRegistrationIdSchema)
		.output(BirthRegistrationSchema),

	createBirthRegistration: oc
		.route({
			method: "POST",
			path: "/civil-registry/birth-registrations",
			summary: "Create a birth registration (SLA-017: sets requestedAt)",
			tags: ["Civil Registry"],
		})
		.input(CreateBirthRegistrationSchema)
		.output(BirthRegistrationSchema),

	updateBirthRegistration: oc
		.route({
			method: "PUT",
			path: "/civil-registry/birth-registrations/{id}",
			summary: "Update a birth registration",
			tags: ["Civil Registry"],
		})
		.input(UpdateBirthRegistrationSchema)
		.output(BirthRegistrationSchema),

	// SLA-017: payment checkpoint for birth certificates
	markBirthRegistrationPaid: oc
		.route({
			method: "POST",
			path: "/civil-registry/birth-registrations/{id}/mark-paid",
			summary: "Record payment receipt for a birth certificate (SLA-017 Flow 7 Step 2)",
			tags: ["Civil Registry"],
		})
		.input(MarkBirthRegistrationPaidInputSchema)
		.output(MarkBirthRegistrationPaidResponseSchema),

	// SLA-021: release audit checkpoint for birth certificates
	markBirthRegistrationReleased: oc
		.route({
			method: "POST",
			path: "/civil-registry/birth-registrations/{id}/mark-released",
			summary: "Record release of a birth certificate to the family (SLA-021 Flow 7 Step 3)",
			tags: ["Civil Registry"],
		})
		.input(MarkBirthRegistrationReleasedInputSchema)
		.output(MarkBirthRegistrationReleasedResponseSchema),
}
