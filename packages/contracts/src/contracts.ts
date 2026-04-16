/**
 * Central contract registry
 * Re-exports version routers
 */

// V1 contracts (routers)
export { v1Contract } from "./modules/v1/v1.contract.js"
export type { V1Contract } from "./modules/v1/v1.contract.js"

// Patient schemas — exported for frontend validation (e.g. CreatePatientSchema.safeParse)
export {
	CreatePatientSchema,
	UpdatePatientSchema,
	PatientSearchSchema,
	type CreatePatientInput,
	type UpdatePatientInput,
	type PatientSearchInput,
	type Patient,
} from "./modules/v1/patients/patients.schema.js"

// Encounter schemas — exported for shared types (e.g. EncounterDetail in chart context)
export type { EncounterDetail } from "./modules/v1/encounters/encounters.schema.js"

// Audit schemas (enums, types) for use in frontend and backend
export * from "./modules/v1/audit/audit.schema.js"

// Scheduling schemas — exported for frontend validation and types
export {
	AppointmentStatusEnum,
	AppointmentEncounterTypeEnum,
	AppointmentSchema,
	AppointmentDetailSchema,
	AppointmentListSchema,
	CreateAppointmentSchema,
	CheckInAppointmentSchema,
	UpdateAppointmentStatusSchema,
	AvailableSlotsQuerySchema,
	ClinicQueueQuerySchema,
	type Appointment,
	type AppointmentDetail,
	type AppointmentListInput,
	type CreateAppointmentInput,
	type CheckInAppointmentInput,
	type UpdateAppointmentStatusInput,
	type AvailableSlotsQuery,
	type ClinicQueueQuery,
} from "./modules/v1/scheduling/scheduling.schema.js"

// SLA schemas — exported for frontend validation and types
export {
	SlaStatusEnum,
	SlaWorkflowTypeEnum,
	SlaConfigSchema,
	SlaEventSchema,
	SlaEventsQuerySchema,
	SlaEventsResponseSchema,
	SlaConfigsQuerySchema,
	SlaConfigsResponseSchema,
	CreateSlaConfigSchema,
	UpdateSlaConfigSchema,
	SlaComplianceQuerySchema,
	SlaComplianceReportSchema,
	type SlaStatus,
	type SlaWorkflowType,
	type SlaConfig,
	type SlaEvent,
	type SlaEventsQuery,
	type SlaEventsResponse,
	type SlaConfigsQuery,
	type SlaConfigsResponse,
	type CreateSlaConfig,
	type UpdateSlaConfig,
	type SlaComplianceQuery,
	type SlaComplianceReport,
} from "./modules/v1/sla/sla.schema.js"

// NBS schemas — exported for frontend validation and types
export {
	NbsStatusEnum,
	NbsSpecimenTypeEnum,
	NbsConsentTypeEnum,
	NbsReferralStatusEnum,
	NbsResultEnum,
	NbsOverallResultEnum,
	NbsScreeningSchema,
	NbsConsentSchema,
	NbsReferralSchema,
	NbsLogbookEntrySchema,
	NbsLogbookQuerySchema,
	NbsLogbookResponseSchema,
	CreateNbsScreeningSchema,
	UpdateNbsScreeningSchema,
	CreateNbsConsentSchema,
	CreateNbsReferralSchema,
	UpdateNbsReferralSchema,
	type NbsStatus,
	type NbsSpecimenType,
	type NbsConsentType,
	type NbsReferralStatus,
	type NbsScreening,
	type NbsConsent,
	type NbsReferral,
	type NbsLogbookEntry,
	type NbsLogbookQuery,
	type NbsLogbookResponse,
	type CreateNbsScreening,
	type UpdateNbsScreening,
	type CreateNbsConsent,
	type CreateNbsReferral,
	type UpdateNbsReferral,
} from "./modules/v1/nbs/nbs.schema.js"

// FHIR schemas — exported for frontend validation and types
export {
	FhirResourceTypeEnum,
	FhirExportStatusEnum,
	NhdrSubmissionStatusEnum,
	ValidationIssueSeverityEnum,
	FhirExportSchema,
	NhdrSubmissionSchema,
	FhirValidationReportSchema,
	FhirExportsQuerySchema,
	FhirExportsResponseSchema,
	NhdrSubmissionsQuerySchema,
	CreateFhirExportSchema,
	type FhirResourceType,
	type FhirExportStatus,
	type NhdrSubmissionStatus,
	type FhirExport,
	type NhdrSubmission,
	type FhirValidationReport,
	type FhirExportsQuery,
	type FhirExportsResponse,
	type NhdrSubmissionsQuery,
	type CreateFhirExport,
} from "./modules/v1/fhir/fhir.schema.js"

// Lab / Blood Bank schemas — exported for frontend validation and types
export {
	BloodTypeEnum,
	BloodUnitStatusEnum,
	CrossMatchStatusEnum,
	CrossMatchUrgencyEnum,
	CompatibilityResultEnum,
	BloodUnitSchema,
	CrossMatchRequestSchema,
	CrossMatchListQuerySchema,
	CrossMatchListResponseSchema,
	CreateCrossMatchSchema,
	ApproveCrossMatchSchema,
	BedsideVerifyInputSchema,
	BedsideVerifyResultSchema,
	type BloodType,
	type BloodUnitStatus,
	type CrossMatchStatus,
	type CrossMatchUrgency,
	type CompatibilityResult,
	type BloodUnit,
	type CrossMatchRequest,
	type CrossMatchListQuery,
	type CrossMatchListResponse,
	type CreateCrossMatch,
	type ApproveCrossMatch,
	type BedsideVerifyInput,
	type BedsideVerifyResult,
} from "./modules/v1/lab/lab.schema.js"

// Future versions:
// export { v2Contract, type V2Contract } from "./modules/v2/v2.contract.js"
// export const v2 = { ... }
// export type { Todo as V2Todo, ... } from "./modules/v2/..."
