import { oc } from "@orpc/contract"

import {
	AddendumSchema,
	ClinicalNoteIdSchema,
	ClinicalNoteListResponseSchema,
	ClinicalNoteListSchema,
	ClinicalNoteSchema,
	ConsentRecordIdSchema,
	ConsentRecordListResponseSchema,
	ConsentRecordListSchema,
	ConsentRecordSchema,
	CreateAddendumSchema,
	CreateClinicalNoteSchema,
	CreateConsentRecordSchema,
	CreateNoteTemplateSchema,
	NoteTemplateIdSchema,
	NoteTemplateListResponseSchema,
	NoteTemplateListSchema,
	NoteTemplateSchema,
	RevokeConsentSchema,
	SignAddendumSchema,
	SignClinicalNoteSchema,
	SignedNotesResponseSchema,
	SignedNotesSchema,
	UpdateClinicalNoteSchema,
	UpdateNoteTemplateSchema,
} from "./clinical-docs.schema.js"

export const clinicalDocsContract = {
	// ========================================================================
	// Note Templates
	// ========================================================================

	listTemplates: oc
		.route({
			method: "GET",
			path: "/templates",
			summary: "List note templates for a facility",
			tags: ["Clinical Documentation"],
		})
		.input(NoteTemplateListSchema)
		.output(NoteTemplateListResponseSchema),

	getTemplate: oc
		.route({
			method: "GET",
			path: "/templates/{id}",
			summary: "Get a note template by ID",
			tags: ["Clinical Documentation"],
		})
		.input(NoteTemplateIdSchema)
		.output(NoteTemplateSchema),

	createTemplate: oc
		.route({
			method: "POST",
			path: "/templates",
			summary: "Create a new note template",
			tags: ["Clinical Documentation"],
		})
		.input(CreateNoteTemplateSchema)
		.output(NoteTemplateSchema),

	updateTemplate: oc
		.route({
			method: "PUT",
			path: "/templates/{id}",
			summary: "Update a note template",
			tags: ["Clinical Documentation"],
		})
		.input(UpdateNoteTemplateSchema)
		.output(NoteTemplateSchema),

	// ========================================================================
	// Clinical Notes
	// ========================================================================

	listNotes: oc
		.route({
			method: "GET",
			path: "/notes",
			summary: "List clinical notes for an encounter",
			tags: ["Clinical Documentation"],
		})
		.input(ClinicalNoteListSchema)
		.output(ClinicalNoteListResponseSchema),

	getNote: oc
		.route({
			method: "GET",
			path: "/notes/{id}",
			summary: "Get a clinical note by ID with addenda",
			tags: ["Clinical Documentation"],
		})
		.input(ClinicalNoteIdSchema)
		.output(ClinicalNoteSchema),

	createNote: oc
		.route({
			method: "POST",
			path: "/notes",
			summary: "Create a new clinical note (draft)",
			tags: ["Clinical Documentation"],
		})
		.input(CreateClinicalNoteSchema)
		.output(ClinicalNoteSchema),

	updateNote: oc
		.route({
			method: "PUT",
			path: "/notes/{id}",
			summary: "Update a draft clinical note",
			tags: ["Clinical Documentation"],
		})
		.input(UpdateClinicalNoteSchema)
		.output(ClinicalNoteSchema),

	signNote: oc
		.route({
			method: "PUT",
			path: "/notes/{id}/sign",
			summary: "Sign a clinical note (locks it permanently)",
			tags: ["Clinical Documentation"],
		})
		.input(SignClinicalNoteSchema)
		.output(ClinicalNoteSchema),

	// ========================================================================
	// Note Addenda
	// ========================================================================

	createAddendum: oc
		.route({
			method: "POST",
			path: "/addenda",
			summary: "Add an addendum to a signed clinical note",
			tags: ["Clinical Documentation"],
		})
		.input(CreateAddendumSchema)
		.output(AddendumSchema),

	signAddendum: oc
		.route({
			method: "PUT",
			path: "/addenda/{id}/sign",
			summary: "Sign an addendum",
			tags: ["Clinical Documentation"],
		})
		.input(SignAddendumSchema)
		.output(AddendumSchema),

	// ========================================================================
	// Consent Records
	// ========================================================================

	listConsents: oc
		.route({
			method: "GET",
			path: "/consents",
			summary: "List consent records for an encounter",
			tags: ["Clinical Documentation"],
		})
		.input(ConsentRecordListSchema)
		.output(ConsentRecordListResponseSchema),

	getConsent: oc
		.route({
			method: "GET",
			path: "/consents/{id}",
			summary: "Get a consent record by ID",
			tags: ["Clinical Documentation"],
		})
		.input(ConsentRecordIdSchema)
		.output(ConsentRecordSchema),

	createConsent: oc
		.route({
			method: "POST",
			path: "/consents",
			summary: "Capture a new electronic consent",
			tags: ["Clinical Documentation"],
		})
		.input(CreateConsentRecordSchema)
		.output(ConsentRecordSchema),

	revokeConsent: oc
		.route({
			method: "PUT",
			path: "/consents/{id}/revoke",
			summary: "Revoke a consent record",
			tags: ["Clinical Documentation"],
		})
		.input(RevokeConsentSchema)
		.output(ConsentRecordSchema),

	// ========================================================================
	// Cross-module (Billing/CF4)
	// ========================================================================

	getSignedNotes: oc
		.route({
			method: "GET",
			path: "/signed-notes",
			summary: "Get signed notes for an encounter (used by Billing for CF4)",
			tags: ["Clinical Documentation"],
		})
		.input(SignedNotesSchema)
		.output(SignedNotesResponseSchema),
}
