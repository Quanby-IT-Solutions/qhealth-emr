import { z } from "zod"

// ============================================================================
// Helpers
// ============================================================================

const dateOrString = z
	.union([z.date(), z.string()])
	.transform(v => (typeof v === "string" ? new Date(v) : v))

const PaginationInputSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(25),
})

const PaginatedResponseSchema = z.object({
	total: z.number(),
	page: z.number(),
	limit: z.number(),
	totalPages: z.number(),
})

const RequiredTextSchema = z.string().trim().min(1)
const OptionalTextSchema = z.string().trim().optional()
const OptionalNonNegativeIntegerSchema = z.coerce.number().int().min(0).optional()
const OptionalDateTimeStringSchema = z
	.string()
	.refine(value => !Number.isNaN(new Date(value).getTime()), "Invalid date/time")
	.optional()

// ============================================================================
// Enums
// ============================================================================

export const SurgeryStatusEnum = z.enum([
	"scheduled",
	"in_progress",
	"completed",
	"cancelled",
	"postponed",
])

export const AsaClassEnum = z.enum(["ASA I", "ASA II", "ASA III", "ASA IV", "ASA V", "ASA VI"])

export const AirwayTypeEnum = z.enum([
	"oral_ett",
	"nasal_ett",
	"lma",
	"awake_fiber_optic",
	"tracheostomy",
])

export const AnesthesiaTypeEnum = z.enum(["general", "regional", "local", "sedation"])

export const IntubationGradeEnum = z.enum(["CL1", "CL2", "CL3", "CL4", "not_applicable"])

export const AnesthesiaRecordStatusEnum = z.enum(["draft", "signed"])

export const RvsCodeStatusEnum = z.enum(["suggested", "validated", "finalized"])
export const RvsAssignmentTypeEnum = z.enum(["primary", "adjunct"])
export const OperationRecordStatusEnum = z.enum(["draft", "signed"])

// ============================================================================
// Surgical Case Schema
// ============================================================================

export const SurgicalCaseSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid().nullable(),
	patientId: z.string().uuid(),
	patientName: z.string().nullable(),
	procedureName: z.string(),
	orSuite: z.string().nullable(),
	surgeonName: z.string().nullable(),
	surgeonStaffId: z.string().uuid().nullable(),
	anesthesiologistName: z.string().nullable(),
	anesthesiologistStaffId: z.string().uuid().nullable(),
	scheduledDatetime: z.string().nullable(),
	actualStartDatetime: z.string().nullable(),
	actualEndDatetime: z.string().nullable(),
	status: SurgeryStatusEnum,
	surgicalType: z.string(),
	asaClass: AsaClassEnum.nullable(),
	estimatedDurationMinutes: z.number().int().nullable(),
	requiredEquipment: z.array(z.string()).nullable(),
	notes: z.string().nullable(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type SurgicalCase = z.infer<typeof SurgicalCaseSchema>

// ============================================================================
// Operation Record Schema
// ============================================================================

export const OperationRecordSchema = z.object({
	id: z.string().uuid(),
	surgicalCaseId: z.string().uuid(),
	preOpDiagnosis: z.string(),
	postOpDiagnosis: z.string().nullable(),
	procedurePerformed: z.string(),
	procedureDescription: z.string().nullable(),
	operativeTechnique: z.string().nullable(),
	findings: z.string().nullable(),
	specimens: z.string().nullable(),
	estimatedBloodLoss: z.number().nullable(),
	fluidIn: z.number().nullable(),
	fluidOut: z.number().nullable(),
	incisionDatetime: z.string().nullable(),
	closureDatetime: z.string().nullable(),
	surgeonStaffId: z.string().uuid(),
	firstAssistantStaffId: z.string().uuid().nullable(),
	secondAssistantStaffId: z.string().uuid().nullable(),
	scrubNurseStaffId: z.string().uuid().nullable(),
	circulatingNurseStaffId: z.string().uuid().nullable(),
	anesthesiologistStaffId: z.string().uuid().nullable(),
	instrumentCountCorrect: z.boolean(),
	swabCountCorrect: z.boolean(),
	complications: z.string().nullable(),
	status: OperationRecordStatusEnum,
	signedAt: z.string().nullable(),
	signedByStaffId: z.string().uuid().nullable(),
	signedByName: z.string().nullable(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type OperationRecord = z.infer<typeof OperationRecordSchema>

// ============================================================================
// Anesthesia Agent & Vitals
// ============================================================================

export const AnesthesiaAgentSchema = z.object({
	name: z.string(),
	dose: z.string(),
	route: z.string(),
	time: z.string(),
})

export const InductionAgentSchema = z.object({
	agent: z.string(),
	dose: z.string(),
	time: z.string().optional(),
})

export const MaintenanceAgentSchema = z.object({
	agent: z.string(),
	dose: z.string(),
	time: z.string().optional(),
})

export const MuscleRelaxantSchema = z.object({
	agent: z.string(),
	dose: z.string(),
	time: z.string().optional(),
})

export const IntraopMedicationSchema = z.object({
	name: z.string(),
	dose: z.string(),
	route: z.string(),
	time: z.string(),
	indication: z.string().optional(),
})

export const IntraopVitalSchema = z.object({
	time: z.string(),
	bp: z.string(),
	hr: z.number(),
	spo2: z.number(),
	etco2: z.number().optional(),
	temp: z.number().optional(),
})

export const FluidBalanceSchema = z.object({
	ivFluids: z.array(z.object({ type: z.string(), volumeMl: z.number() })).optional(),
	estimatedBloodLoss: z.number().optional(),
	urineOutput: z.number().optional(),
	otherOutput: z.number().optional(),
})

// ============================================================================
// Anesthesia Record Schema
// ============================================================================

export const AnesthesiaRecordSchema = z.object({
	id: z.string().uuid(),
	surgicalCaseId: z.string().uuid(),
	asaClass: AsaClassEnum.nullable(),
	anesthesiaType: AnesthesiaTypeEnum.nullable(),
	airwayType: AirwayTypeEnum.nullable(),
	airwayManagement: z.string().nullable(),
	intubationAttempts: z.number().int().nullable(),
	intubationGrade: IntubationGradeEnum.nullable(),
	difficultAirway: z.boolean(),
	agents: z.array(AnesthesiaAgentSchema).nullable(),
	inductionAgents: z.array(InductionAgentSchema).nullable(),
	maintenanceAgents: z.array(MaintenanceAgentSchema).nullable(),
	muscleRelaxants: z.array(MuscleRelaxantSchema).nullable(),
	intraopMedications: z.array(IntraopMedicationSchema).nullable(),
	intraopVitals: z.array(IntraopVitalSchema).nullable(),
	fluidBalance: FluidBalanceSchema.nullable(),
	reversalAgent: z.string().nullable(),
	totalAnesthesiaMinutes: z.number().nullable(),
	emergenceSmooth: z.boolean().nullable(),
	complications: z.string().nullable(),
	postAnesthesiaCareNotes: z.string().nullable(),
	anesthesiologistStaffId: z.string().uuid().nullable(),
	status: AnesthesiaRecordStatusEnum,
	signedAt: z.string().nullable(),
	signedByStaffId: z.string().uuid().nullable(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type AnesthesiaRecord = z.infer<typeof AnesthesiaRecordSchema>

// ============================================================================
// Pre-Op Checklist Schema
// ============================================================================

export const PreOpChecklistItemSchema = z.object({
	key: z.string(),
	label: z.string(),
	checked: z.boolean(),
	checkedAt: z.string().nullable(),
	checkedByName: z.string().nullable(),
})

export const PreOpChecklistSchema = z.object({
	id: z.string().uuid(),
	surgicalCaseId: z.string().uuid(),
	items: z.array(PreOpChecklistItemSchema),
	allClear: z.boolean(),
	completedAt: z.string().nullable(),
	completedByName: z.string().nullable(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type PreOpChecklist = z.infer<typeof PreOpChecklistSchema>

// ============================================================================
// RVS Code Schema
// ============================================================================

export const RvsCodeSchema = z.object({
	id: z.string().uuid(),
	code: z.string(),
	description: z.string(),
	baseValue: z.number(),
	category: z.string(),
})

export type RvsCode = z.infer<typeof RvsCodeSchema>

// ============================================================================
// RVS Assignment Schema
// ============================================================================

export const RvsAssignmentSchema = z.object({
	id: z.string().uuid(),
	surgicalCaseId: z.string().uuid(),
	rvsCodeId: z.string().uuid().nullable(),
	procedureLabel: z.string().nullable(),
	code: z.string(),
	description: z.string(),
	assignmentType: RvsAssignmentTypeEnum,
	status: RvsCodeStatusEnum,
	suggestedByName: z.string().nullable(),
	validatedByName: z.string().nullable(),
	finalizedByName: z.string().nullable(),
	suggestedAt: z.string().nullable(),
	validatedAt: z.string().nullable(),
	finalizedAt: z.string().nullable(),
	modifier: z.string().nullable(),
	units: z.number(),
	createdAt: dateOrString,
})

export type RvsAssignment = z.infer<typeof RvsAssignmentSchema>

// ============================================================================
// OR Slot Schema
// ============================================================================

export const OrSlotSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	orSuite: z.string(),
	date: z.string(),
	startTime: z.string(),
	endTime: z.string(),
	surgicalCaseId: z.string().uuid().nullable(),
	procedureName: z.string().nullable(),
	surgeonName: z.string().nullable(),
})

export type OrSlot = z.infer<typeof OrSlotSchema>

// ============================================================================
// List Surgical Cases
// ============================================================================

export const SurgicalCaseListSchema = PaginationInputSchema.extend({
	facilityId: z.string().uuid().optional(),
	encounterId: z.string().uuid().optional(),
	status: SurgeryStatusEnum.optional(),
	date: z.string().optional(),
	surgeonStaffId: z.string().uuid().optional(),
	anesthesiologistStaffId: z.string().uuid().optional(),
})

export const SurgicalCaseListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(SurgicalCaseSchema),
})

// ============================================================================
// Create Surgical Case
// ============================================================================

export const CreateSurgicalCaseSchema = z.object({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid().optional(),
	patientId: z.string().uuid(),
	procedureName: z.string().min(1),
	orSuite: z.string().optional(),
	surgeonStaffId: z.string().uuid().optional(),
	anesthesiologistStaffId: z.string().uuid().optional(),
	scheduledDatetime: z.string().optional(),
	surgicalType: z.string().min(1),
	asaClass: AsaClassEnum.optional(),
	estimatedDurationMinutes: z.number().int().positive().optional().default(120),
	requiredEquipment: z.array(z.string()).optional(),
	notes: z.string().optional(),
})

// ============================================================================
// Update Surgical Case
// ============================================================================

export const UpdateSurgicalCaseSchema = z.object({
	id: z.string().uuid(),
	status: SurgeryStatusEnum.optional(),
	actualStartDatetime: z.string().optional(),
	actualEndDatetime: z.string().optional(),
	orSuite: z.string().optional(),
	notes: z.string().optional(),
	asaClass: AsaClassEnum.optional(),
})

// ============================================================================
// Save Operation Record
// ============================================================================

export const SaveOperationRecordSchema = z.object({
	caseId: z.string().uuid(),
	preOpDiagnosis: RequiredTextSchema,
	postOpDiagnosis: OptionalTextSchema,
	procedurePerformed: RequiredTextSchema,
	procedureDescription: OptionalTextSchema,
	operativeTechnique: OptionalTextSchema,
	findings: OptionalTextSchema,
	specimens: OptionalTextSchema,
	estimatedBloodLoss: OptionalNonNegativeIntegerSchema,
	fluidIn: OptionalNonNegativeIntegerSchema,
	fluidOut: OptionalNonNegativeIntegerSchema,
	incisionDatetime: OptionalDateTimeStringSchema,
	closureDatetime: OptionalDateTimeStringSchema,
	surgeonStaffId: z.string().uuid(),
	firstAssistantStaffId: z.string().uuid().optional(),
	secondAssistantStaffId: z.string().uuid().optional(),
	scrubNurseStaffId: z.string().uuid().optional(),
	circulatingNurseStaffId: z.string().uuid().optional(),
	anesthesiologistStaffId: z.string().uuid().nullable().optional(),
	instrumentCountCorrect: z.boolean(),
	swabCountCorrect: z.boolean(),
	complications: OptionalTextSchema,
})

export const SignOperationRecordSchema = z.object({
	caseId: z.string().uuid(),
})

// ============================================================================
// Save Anesthesia Record
// ============================================================================

export const SaveAnesthesiaRecordSchema = z.object({
	caseId: z.string().uuid(),
	asaClass: AsaClassEnum.optional(),
	anesthesiaType: AnesthesiaTypeEnum.optional(),
	airwayType: AirwayTypeEnum.optional(),
	airwayManagement: z.string().optional(),
	intubationAttempts: z.number().int().min(0).optional(),
	intubationGrade: IntubationGradeEnum.optional(),
	difficultAirway: z.boolean().optional(),
	agents: z.array(AnesthesiaAgentSchema).optional(),
	inductionAgents: z.array(InductionAgentSchema).optional(),
	maintenanceAgents: z.array(MaintenanceAgentSchema).optional(),
	muscleRelaxants: z.array(MuscleRelaxantSchema).optional(),
	intraopMedications: z.array(IntraopMedicationSchema).optional(),
	intraopVitals: z.array(IntraopVitalSchema).optional(),
	fluidBalance: FluidBalanceSchema.optional(),
	reversalAgent: z.string().optional(),
	totalAnesthesiaMinutes: z.number().optional(),
	emergenceSmooth: z.boolean().optional(),
	complications: z.string().optional(),
	postAnesthesiaCareNotes: z.string().optional(),
	anesthesiologistStaffId: z.string().uuid().optional(),
})

export const SignAnesthesiaRecordSchema = z.object({
	caseId: z.string().uuid(),
})

// ============================================================================
// Save Pre-Op Checklist
// ============================================================================

export const SavePreOpChecklistSchema = z.object({
	caseId: z.string().uuid(),
	items: z.array(
		z.object({
			key: z.string(),
			checked: z.boolean(),
		})
	),
})

// ============================================================================
// RVS Codes Query
// ============================================================================

export const RvsCodesQuerySchema = z.object({
	search: z.string().trim().min(2),
	limit: z.coerce.number().int().positive().max(50).default(20),
})

export const RvsCodesResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(RvsCodeSchema),
})

// ============================================================================
// Suggest RVS Code
// ============================================================================

export const SuggestRvsCodeSchema = z.object({
	caseId: z.string().uuid(),
	rvsCodeId: z.string().uuid(),
	procedureLabel: RequiredTextSchema,
	assignmentType: RvsAssignmentTypeEnum.default("primary"),
	modifier: OptionalTextSchema,
	units: z.coerce.number().int().positive().default(1),
})

// ============================================================================
// Update RVS Status
// ============================================================================

export const UpdateRvsStatusSchema = z.object({
	caseId: z.string().uuid(),
	assignmentId: z.string().uuid(),
	status: RvsCodeStatusEnum,
})

// ============================================================================
// Remove RVS Assignment
// ============================================================================

export const RemoveRvsAssignmentSchema = z.object({
	caseId: z.string().uuid(),
	assignmentId: z.string().uuid(),
})

// ============================================================================
// OR Slots Query
// ============================================================================

export const OrSlotsQuerySchema = z.object({
	facilityId: z.string().uuid(),
	weekStart: z.string(),
	surgeonStaffId: z.string().uuid().optional(),
	anesthesiologistStaffId: z.string().uuid().optional(),
})

// ============================================================================
// OR Conflict Check
// ============================================================================

export const OrConflictCheckSchema = z.object({
	facilityId: z.string().uuid(),
	orSuite: z.string(),
	scheduledDatetime: z.string(),
	estimatedDurationMinutes: z.number().int().positive(),
	surgeonStaffId: z.string().uuid().optional(),
	requiredEquipment: z.array(z.string()).optional(),
	excludeCaseId: z.string().uuid().optional(),
})

export const OrConflictSchema = z.object({
	type: z.enum(["room", "surgeon", "equipment"]),
	conflictingCaseId: z.string().uuid(),
	conflictingProcedure: z.string(),
	conflictingOrSuite: z.string().nullable(),
	conflictingStart: z.string(),
	conflictingEnd: z.string(),
	equipmentItem: z.string().optional(),
})

export const OrConflictCheckResponseSchema = z.object({
	hasConflicts: z.boolean(),
	conflicts: z.array(OrConflictSchema),
})

export type OrConflictCheck = z.infer<typeof OrConflictCheckSchema>
export type OrConflict = z.infer<typeof OrConflictSchema>
export type OrConflictCheckResponse = z.infer<typeof OrConflictCheckResponseSchema>
