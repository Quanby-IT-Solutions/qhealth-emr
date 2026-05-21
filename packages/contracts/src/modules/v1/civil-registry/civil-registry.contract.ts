import { oc } from "@orpc/contract"

import {
	BirthRegistrationIdSchema,
	BirthRegistrationSchema,
	CreateBirthRegistrationSchema,
	CreateDeathCertificateRegistrationSchema,
	DeathCertificateRegistrationIdSchema,
	DeathCertificateRegistrationSchema,
	GenerateLcrArtifactInputSchema,
	LcrTrackingSchema,
	ListBirthRegistrationsResponseSchema,
	ListBirthRegistrationsSchema,
	ListDeathCertificateRegistrationsResponseSchema,
	ListDeathCertificateRegistrationsSchema,
	ListLcrTrackingResponseSchema,
	ListLcrTrackingSchema,
	MarkBirthRegistrationPaidInputSchema,
	MarkBirthRegistrationPaidResponseSchema,
	MarkBirthRegistrationReleasedInputSchema,
	MarkBirthRegistrationReleasedResponseSchema,
	MarkDeathCertificateRegistrationPaidInputSchema,
	MarkDeathCertificateRegistrationPaidResponseSchema,
	MarkDeathCertificateRegistrationReleasedInputSchema,
	MarkDeathCertificateRegistrationReleasedResponseSchema,
	MarkLcrSubmittedInputSchema,
	UpdateBirthRegistrationSchema,
	UpdateDeathCertificateRegistrationSchema,
} from "./civil-registry.schema.js"

export const civilRegistryContract = {
	listLcrTracking: oc
		.route({
			method: "GET",
			path: "/civil-registry/lcr-tracking",
			summary: "List unified LCR tracking records for birth and death certificates",
			tags: ["Civil Registry"],
		})
		.input(ListLcrTrackingSchema)
		.output(ListLcrTrackingResponseSchema),

	generateLcrArtifact: oc
		.route({
			method: "POST",
			path: "/civil-registry/lcr-tracking/{certificateType}/{sourceRecordId}/artifacts",
			summary: "Record a generated or failed PDF/XML artifact for an LCR certificate",
			tags: ["Civil Registry"],
		})
		.input(GenerateLcrArtifactInputSchema)
		.output(LcrTrackingSchema),

	markLcrSubmitted: oc
		.route({
			method: "POST",
			path: "/civil-registry/lcr-tracking/{certificateType}/{sourceRecordId}/submission",
			summary: "Mark an LCR certificate as submitted and store acknowledgement or error details",
			tags: ["Civil Registry"],
		})
		.input(MarkLcrSubmittedInputSchema)
		.output(LcrTrackingSchema),

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

	listDeathCertificateRegistrations: oc
		.route({
			method: "GET",
			path: "/civil-registry/death-certificate-registrations",
			summary: "List death certificate registrations",
			tags: ["Civil Registry"],
		})
		.input(ListDeathCertificateRegistrationsSchema)
		.output(ListDeathCertificateRegistrationsResponseSchema),

	getDeathCertificateRegistration: oc
		.route({
			method: "GET",
			path: "/civil-registry/death-certificate-registrations/{id}",
			summary: "Get a death certificate registration by ID",
			tags: ["Civil Registry"],
		})
		.input(DeathCertificateRegistrationIdSchema)
		.output(DeathCertificateRegistrationSchema),

	createDeathCertificateRegistration: oc
		.route({
			method: "POST",
			path: "/civil-registry/death-certificate-registrations",
			summary: "Create a death certificate registration",
			tags: ["Civil Registry"],
		})
		.input(CreateDeathCertificateRegistrationSchema)
		.output(DeathCertificateRegistrationSchema),

	updateDeathCertificateRegistration: oc
		.route({
			method: "PUT",
			path: "/civil-registry/death-certificate-registrations/{id}",
			summary: "Update a death certificate registration",
			tags: ["Civil Registry"],
		})
		.input(UpdateDeathCertificateRegistrationSchema)
		.output(DeathCertificateRegistrationSchema),

	markDeathCertificateRegistrationPaid: oc
		.route({
			method: "POST",
			path: "/civil-registry/death-certificate-registrations/{id}/mark-paid",
			summary: "Record payment receipt for a death certificate",
			tags: ["Civil Registry"],
		})
		.input(MarkDeathCertificateRegistrationPaidInputSchema)
		.output(MarkDeathCertificateRegistrationPaidResponseSchema),

	markDeathCertificateRegistrationReleased: oc
		.route({
			method: "POST",
			path: "/civil-registry/death-certificate-registrations/{id}/mark-released",
			summary: "Record release of a death certificate to the family",
			tags: ["Civil Registry"],
		})
		.input(MarkDeathCertificateRegistrationReleasedInputSchema)
		.output(MarkDeathCertificateRegistrationReleasedResponseSchema),
}
