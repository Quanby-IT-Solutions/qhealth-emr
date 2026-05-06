/**
 * Central contract registry
 * Re-exports version routers
 */

// V1 contracts (routers)
export { v1Contract } from "./modules/v1/v1.contract.js"

// Billing contract — exported directly so backend controller can reference typed procedures
// (v1Billing uses `as any` cast to avoid TS7056; billingContract retains full types)
export { billingContract } from "./modules/v1/billing/billing.contract.js"

// HIM contract (HIM-BE-01..05)
export { himContract } from "./modules/v1/him/him.contract.js"
export type { HimContract } from "./modules/v1/him/him.contract.js"

// Admin dashboard schemas — exported for frontend and backend consumption
export type {
	AdminDashboardSummary,
	AdminDashboardAlert,
	AdminSummaryCard,
	RecentChange,
	AccessGovernanceSection,
	PlatformControlSection,
	IntegrationHealthSection,
	AuditSummarySection,
	ArtaSlaSection,
	OfflineReadinessSection,
	StatutoryReadinessSection,
	StatutoryOpsSection,
	DataQualitySection,
	HimOpsSection,
	ExportAuditRecord,
	ExportComplianceList,
	ExportComplianceQuery,
	CivilRegistryOpsSection,
	MedicationComplianceSection,
} from "./modules/v1/admin-dashboard/admin-dashboard.schema.js"

// FHIR schemas — exported for backend service typing
export type { FhirSystemStatus } from "./modules/v1/fhir/fhir.schema.js"

// Patient schemas — exported for frontend validation (e.g. CreatePatientSchema.safeParse)
export {
	CreatePatientSchema,
	UpdatePatientSchema,
	PatientSearchSchema,
	RegisterPatientWithOpdEncounterInputSchema,
	type CreatePatientInput,
	type UpdatePatientInput,
	type PatientSearchInput,
	type Patient,
	type RegisterPatientWithOpdEncounterInput,
} from "./modules/v1/patients/patients.schema.js"

// Encounter schemas — exported for shared types (e.g. EncounterDetail in chart context)
export type { EncounterDetail } from "./modules/v1/encounters/encounters.schema.js"

// Audit schemas (enums, types) for use in frontend and backend
export * from "./modules/v1/audit/audit.schema.js"

// Auditor schemas — auditor-role read API types
export * from "./modules/v1/auditor/auditor.schema.js"

// Scheduling schemas — exported for frontend validation and types
export {
	AppointmentStatusEnum,
	AppointmentEncounterTypeEnum,
	ClinicSlotStatusEnum,
	ClinicTemplateSchema,
	AppointmentSchema,
	AppointmentDetailSchema,
	ClinicSlotSchema,
	CreateClinicTemplateSchema,
	AppointmentListSchema,
	CreateAppointmentSchema,
	CheckInAppointmentSchema,
	UpdateAppointmentStatusSchema,
	UpdateClinicTemplateSchema,
	AvailableSlotsQuerySchema,
	ListTemplateSlotsQuerySchema,
	UpdateSlotSchema,
	ClinicQueueQuerySchema,
	type Appointment,
	type AppointmentDetail,
	type ClinicTemplate,
	type ClinicSlot,
	type AppointmentListInput,
	type CreateAppointmentInput,
	type CheckInAppointmentInput,
	type UpdateAppointmentStatusInput,
	type AvailableSlotsQuery,
	type ListTemplateSlotsQuery,
	type ClinicQueueQuery,
	type UpdateSlotInput,
} from "./modules/v1/scheduling/scheduling.schema.js"

// SLA schemas — exported for frontend validation and types
export {
	SlaStatusEnum,
	SlaWorkflowTypeEnum,
	SlaStepTypeEnum,
	SLA_STEP_LABELS,
	SLA_STEP_DEFAULT_TARGETS,
	SLA_STEP_TO_EVENT_STATUS,
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
	SlaStepMetricSchema,
	SlaComplianceMetricSchema,
	type SlaStatus,
	type SlaWorkflowType,
	type SlaStepType,
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
	type SlaStepMetric,
	type SlaComplianceMetric,
	type SlaStepConfig,
	type SlaStepConfigsQuery,
	type SlaStepConfigsResponse,
	type CreateSlaStepConfig,
	type UpdateSlaStepConfig,
	SlaKpiTileSchema,
	SlaDashboardResponseSchema,
	type SlaKpiTile,
	type SlaDashboardResponse,
} from "./modules/v1/sla/sla.schema.js"

// OPD Triage schemas — exported for frontend validation and types
export {
	OpdTriageIntakeSchema,
	CreateOpdTriageIntakeSchema,
	OpdTriageIntakeIdSchema,
	LinkOpdTriageToPatientSchema,
	ListPendingTriageSchema,
	OpdTriageIntakeWithPatientSchema,
	type OpdTriageIntake,
	type CreateOpdTriageIntakeInput,
	type LinkOpdTriageToPatientInput,
	type OpdTriageIntakeWithPatient,
} from "./modules/v1/opd-triage/opd-triage.schema.js"

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

// ============================================================================
// NEW MODULES (Ticket BE-02)
// ============================================================================

// Nutrition schemas — exported for frontend validation
export {
	ScreeningToolEnum,
	MalnutritionRiskEnum,
	NutritionStatusEnum,
	DietTypeEnum,
	NutritionAssessmentSchema,
	CreateNutritionAssessmentSchema,
	MealPlanSchema,
	ScreeningScoreInputSchema,
	ScreeningScoreResultSchema,
	Nrs2002InputSchema,
	MustInputSchema,
	SgaInputSchema,
	type NutritionAssessment,
	type CreateNutritionAssessment,
	type MealPlan,
	type ScreeningScoreInput,
	type ScreeningScoreResult,
	type Nrs2002Input,
	type MustInput,
	type SgaInput,
} from "./modules/v1/nutrition/nutrition.schema.js"

// MSW (Medical Social Work) schemas — exported for frontend validation
export {
	MswStatusEnum,
	CoeProgramEnum,
	FinancialClassEnum,
	EmploymentStatusEnum,
	MswEvaluationSchema,
	CreateMswEvaluationSchema,
	IssueCoeSchema,
	type MswEvaluation,
	type CreateMswEvaluation,
	type IssueCoe,
} from "./modules/v1/msw/msw.schema.js"

// Consent schemas — exported for frontend validation
export {
	ConsentTypeEnum as ConsentModuleTypeEnum,
	ConsentStatusEnum,
	SignerRelationshipEnum,
	ConsentRecordSchema as ConsentModuleRecordSchema,
	CreateConsentSchema as CreateConsentModuleRecordSchema,
	BreakGlassRequestSchema,
	BreakGlassResponseSchema,
	type ConsentRecord as ConsentModuleRecord,
	type CreateConsent as CreateConsentModuleRecordInput,
	type BreakGlassRequest,
	type BreakGlassResponse,
} from "./modules/v1/consent/consent.schema.js"

// PhilHealth schemas — exported for frontend validation
export {
	EligibilityStatusEnum,
	MemberTypeEnum,
	PatientRelationEnum,
	Cf5StatusEnum as PhilhealthCf5StatusEnum,
	KonsultaServiceTypeEnum,
	CewsEligibilityQuerySchema,
	CewsEligibilityResultSchema,
	Cf5ClaimSchema,
	KonsultaServiceSchema,
	type CewsEligibilityQuery,
	type CewsEligibilityResult,
	type Cf5Claim,
	type KonsultaService,
} from "./modules/v1/philhealth/philhealth.schema.js"

// Pharmacy / Dispensing schemas — exported for frontend validation
export {
	DispensingStatusEnum,
	DispensingTypeEnum,
	PharmacyLocationEnum,
	DispensingQueueItemSchema,
	DispensingQueueQuerySchema,
	DispensingRecordSchema,
	StartDispensingSchema,
	CompleteDispensingSchema,
	type DispensingQueueItem,
	type DispensingRecord,
	type StartDispensing,
	type CompleteDispensing,
} from "./modules/v1/pharmacy/pharmacy.schema.js"

// Future versions:
// export { v2Contract, type V2Contract } from "./modules/v2/v2.contract.js"
// export const v2 = { ... }
// export type { Todo as V2Todo, ... } from "./modules/v2/..."

// System settings schemas — exported for frontend consumption
export type {
	SystemSettings,
	TriggerOfflineCacheJobResult,
} from "./modules/v1/system-settings/system-settings.schema.js"

// FHIR Endpoints schemas (ADM-BE-07)
export type {
	FhirEndpoint,
	FhirExchangeLogEntry,
	TestConnectionResult,
	UpsertFhirEndpointInput,
	ListExchangeLogInput,
	ExchangeLogResponse,
} from "./modules/v1/fhir-endpoints/fhir-endpoints.schema.js"

// Terminology schemas (ADM-BE-08)
export type {
	CodeSystem,
	Code,
	SearchCodesInput,
	SearchCodesResponse,
	DeprecateCodeInput,
	ImportCodesInput,
	ImportResult as TerminologyImportResult,
} from "./modules/v1/terminology/terminology.schema.js"

// Master Data schemas (ADM-BE-11 master data)
export type {
	MasterDataCatalog,
	MasterDataItem,
	ListItemsInput,
	ItemsResponse,
	UpsertItemInput,
	DeprecateItemInput,
	ImportItemsInput,
	ImportResult as MasterDataImportResult,
} from "./modules/v1/master-data/master-data.schema.js"
