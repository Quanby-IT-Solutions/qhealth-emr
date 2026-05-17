import { z } from "zod"

// ============================================================================
// Helpers
// ============================================================================

const dateOrString = z
	.union([z.date(), z.string()])
	.transform(v => (typeof v === "string" ? new Date(v) : v))

const PaginationInputSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(50),
})

const PaginatedResponseSchema = z.object({
	total: z.number(),
	page: z.number(),
	limit: z.number(),
	totalPages: z.number(),
})

// ============================================================================
// Encounter types & status
// ============================================================================

export const EncounterTypeEnum = z.enum(["inpatient", "outpatient", "emergency", "telemedicine"])
export const EncounterStatusEnum = z.enum([
	"active",
	"pending_discharge",
	"discharged",
	"closed",
	"cancelled",
])
export const DispositionEnum = z.enum(["home", "transfer", "deceased", "ama"])

// ============================================================================
// SLA Status Enum
// ============================================================================

export const EncounterSlaStatusEnum = z.enum(["on_time", "approaching", "exceeded"])
export type EncounterSlaStatus = z.infer<typeof EncounterSlaStatusEnum>

// ============================================================================
// Encounter Schema — full encounter resource
// ============================================================================

export const EncounterSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	patientId: z.string().uuid(),
	encounterType: EncounterTypeEnum,
	status: EncounterStatusEnum,
	chiefComplaint: z.string().nullable(),
	admittingStaffId: z.string().uuid().nullable(),
	attendingStaffId: z.string().uuid().nullable(),
	bedId: z.string().uuid().nullable(),
	admissionDatetime: dateOrString,
	dischargeDatetime: dateOrString.nullable(),
	disposition: DispositionEnum.nullable(),
	oecbEligible: z.boolean(),
	mergedFromPreEncounterId: z.string().uuid().nullable(),

	// Linked encounter (for telemedicine follow-ups)
	linkedEncounterId: z.string().uuid().nullable(),

	// Scheduling integration
	appointmentId: z.string().uuid().nullable(),

	// PhilHealth tagging
	konsultaTagged: z.boolean(),

	// OPD queue number (outpatient encounters only, auto-generated per clinic per day)
	queueNumber: z.number().int().positive().nullable(),

	// PS-002: Clinic that this OPD encounter belongs to (for per-clinic queue numbering)
	clinicianStaffId: z.string().uuid().nullable(),

	// PS-003: Walk-in OPD queue position on the clinic queue board
	queueStatus: z.enum(["waiting", "in_progress", "completed"]).nullable(),

	// SLA tracking (computed from encounterStatusEvents)
	slaStatus: EncounterSlaStatusEnum.nullable(),
	slaElapsedMinutes: z.number().int().nonnegative().nullable(),
	slaTargetMinutes: z.number().int().positive().nullable(),

	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type Encounter = z.infer<typeof EncounterSchema>

// ============================================================================
// Encounter with relations (for detail view)
// ============================================================================

export const EncounterTransferSchema = z.object({
	id: z.string().uuid(),
	fromWardId: z.string().uuid().nullable(),
	fromBedId: z.string().uuid().nullable(),
	toWardId: z.string().uuid().nullable(),
	toBedId: z.string().uuid().nullable(),
	transferReason: z.string().nullable(),
	orderingStaffId: z.string().uuid().nullable(),
	transferredAt: dateOrString,
	status: z.enum(["pending", "completed"]),
	receivedAt: dateOrString.nullable(),
	fromWardName: z.string().nullable(),
	fromBedNumber: z.string().nullable(),
	toWardName: z.string().nullable(),
	toBedNumber: z.string().nullable(),
	orderingStaffName: z.string().nullable(),
})

export const EncounterDetailSchema = EncounterSchema.extend({
	patientName: z.string(),
	patientMrn: z.string(),
	patientAddress: z.string().nullable(),
	patientDateOfBirth: z.string(),
	patientSex: z.enum(["male", "female", "other"]),
	admittingStaffName: z.string().nullable(),
	attendingStaffName: z.string().nullable(),
	wardName: z.string().nullable(),
	bedNumber: z.string().nullable(),
	transfers: z.array(EncounterTransferSchema),
})

export type EncounterDetail = z.infer<typeof EncounterDetailSchema>

// ============================================================================
// Create Encounter
// ============================================================================

export const CreateEncounterSchema = z
	.object({
		facilityId: z.string().uuid(),
		patientId: z.string().uuid(),
		encounterType: EncounterTypeEnum,
		chiefComplaint: z.string().max(2000).optional(),
		admittingStaffId: z.string().uuid(),
		attendingStaffId: z.string().uuid().optional(),
		bedId: z.string().uuid().optional(),
		admissionDatetime: z.string().optional(),

		// Link to parent encounter (telemedicine follow-up)
		linkedEncounterId: z.string().uuid().optional(),

		// Link to scheduling appointment
		appointmentId: z.string().uuid().optional(),

		// PS-002: Clinic for OPD queue scoping
		clinicianStaffId: z.string().uuid().optional(),

		// PS-001: Link to triage intake record (pre-registration vitals)
		triageIntakeId: z.string().uuid().optional(),

		consentCaptured: z.boolean(),
	})
	.superRefine((data, ctx) => {
		// PS-036: clinicianStaffId required for outpatient encounters to ensure clinic-scoped queue assignment
		if (data.encounterType === "outpatient" && !data.clinicianStaffId) {
			ctx.addIssue({
				code: "custom",
				message: "clinicianStaffId is required for outpatient encounter registration",
				path: ["clinicianStaffId"],
			})
		}
		// PS-044: triageIntakeId required for outpatient encounters (TOR Flow 1 Step 1 mandatory)
		if (data.encounterType === "outpatient" && !data.triageIntakeId) {
			ctx.addIssue({
				code: "custom",
				message:
					"triageIntakeId is required for outpatient encounter registration (TOR Flow 1 Step 1)",
				path: ["triageIntakeId"],
			})
		}
		// ER and IPD require attendingStaffId
		if (
			(data.encounterType === "emergency" || data.encounterType === "inpatient") &&
			!data.attendingStaffId
		) {
			ctx.addIssue({
				code: "custom",
				message: "attendingStaffId is required for emergency and inpatient encounters",
				path: ["attendingStaffId"],
			})
		}
		// IPD requires bedId
		if (data.encounterType === "inpatient" && !data.bedId) {
			ctx.addIssue({
				code: "custom",
				message: "bedId is required for inpatient encounters",
				path: ["bedId"],
			})
		}
	})

export type CreateEncounterInput = z.infer<typeof CreateEncounterSchema>

// ============================================================================
// List Encounters for Patient
// ============================================================================

export const EncounterListSchema = PaginationInputSchema.extend({
	patientId: z.string().uuid().optional(),
	facilityId: z.string().uuid(),
	status: EncounterStatusEnum.optional(),
	encounterType: EncounterTypeEnum.optional(),
})

export const EncounterListItemSchema = z.object({
	id: z.string().uuid(),
	encounterType: EncounterTypeEnum,
	status: EncounterStatusEnum,
	chiefComplaint: z.string().nullable(),
	admissionDatetime: dateOrString,
	dischargeDatetime: dateOrString.nullable(),
	patientName: z.string().nullable(),
	attendingStaffName: z.string().nullable(),
	wardName: z.string().nullable(),
	bedNumber: z.string().nullable(),
	queueNumber: z.number().int().positive().nullable(),
	transferStatus: z.enum(["pending", "completed"]).nullable(),
})

export const EncounterListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(EncounterListItemSchema),
})

// ============================================================================
// Get Encounter by ID
// ============================================================================

export const EncounterIdSchema = z.object({
	id: z.string().uuid(),
})

// ============================================================================
// Transfer Encounter
// ============================================================================

export const TransferEncounterSchema = z.object({
	encounterId: z.string().uuid(),
	toWardId: z.string().uuid(),
	toBedId: z.string().uuid(),
	transferReason: z.string().max(2000).optional(),
	orderingStaffId: z.string().uuid(),
})

export type TransferEncounterInput = z.infer<typeof TransferEncounterSchema>

// ============================================================================
// Discharge Encounter (Inpatient)
// ============================================================================

export const DischargeEncounterSchema = z.object({
	encounterId: z.string().uuid(),
	disposition: DispositionEnum,
	dischargeDatetime: z.string().optional(),
})

export type DischargeEncounterInput = z.infer<typeof DischargeEncounterSchema>

// ============================================================================
// May Go Home Order (Inpatient)
// ============================================================================

export const SignMayGoHomeOrderSchema = z.object({
	encounterId: z.string().uuid(),
})

export type SignMayGoHomeOrderInput = z.infer<typeof SignMayGoHomeOrderSchema>

// ============================================================================
// Close Encounter (Outpatient)
// ============================================================================

export const CloseEncounterSchema = z.object({
	encounterId: z.string().uuid(),
})

// ============================================================================
// Discharge Checklist (computed on read)
// ============================================================================

export const DischargeChecklistItemSchema = z.object({
	key: z.string(),
	label: z.string(),
	category: z.enum(["clinical", "billing"]),
	status: z.enum(["complete", "incomplete", "not_applicable"]),
	responsibleRole: z.string(),
})

export const DischargeChecklistSchema = z.object({
	encounterId: z.string().uuid(),
	encounterType: EncounterTypeEnum,
	items: z.array(DischargeChecklistItemSchema),
	allComplete: z.boolean(),
})

export type DischargeChecklist = z.infer<typeof DischargeChecklistSchema>

// ============================================================================
// Linked Encounters (telemedicine follow-ups)
// ============================================================================

export const LinkedEncounterItemSchema = z.object({
	id: z.string().uuid(),
	encounterType: EncounterTypeEnum,
	status: EncounterStatusEnum,
	admissionDatetime: dateOrString,
	dischargeDatetime: dateOrString.nullable(),
	attendingStaffName: z.string().nullable(),
})

export const LinkedEncounterListSchema = z.object({
	sourceEncounterId: z.string().uuid(),
	linkedEncounters: z.array(LinkedEncounterItemSchema),
})

// ============================================================================
// Receive Transfer (Ward Nurse confirms patient arrival)
// ============================================================================

export const ReceiveTransferSchema = z.object({
	transferId: z.string().uuid(),
	receivingStaffId: z.string().uuid(),
})

export type ReceiveTransferInput = z.infer<typeof ReceiveTransferSchema>

// ============================================================================
// List Pending Transfers (Ward Nurse view)
// ============================================================================

export const ListPendingTransfersSchema = z.object({
	facilityId: z.string().uuid(),
	toWardId: z.string().uuid().optional(),
})

export const PendingTransferItemSchema = z.object({
	transferId: z.string().uuid(),
	encounterId: z.string().uuid(),
	patientName: z.string(),
	patientMrn: z.string(),
	fromWardName: z.string().nullable(),
	fromBedNumber: z.string().nullable(),
	toWardName: z.string().nullable(),
	toBedNumber: z.string().nullable(),
	transferReason: z.string().nullable(),
	orderingStaffName: z.string().nullable(),
	transferredAt: dateOrString,
})

export const PendingTransferListResponseSchema = z.array(PendingTransferItemSchema)
