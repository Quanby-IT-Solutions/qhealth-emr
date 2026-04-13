import { z } from "zod"

// ============================================================================
// Helpers
// ============================================================================

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
// Enums
// ============================================================================

export const PidsrCategoryEnum = z.enum(["category_1", "category_2"])

export const CaseClassificationEnum = z.enum(["suspected", "probable", "confirmed"])

export const PidsrReportStatusEnum = z.enum(["draft", "submitted"])

export const SurveillanceFlagTypeEnum = z.enum(["icd10_match", "syndromic_keyword"])

export const FlagReviewActionEnum = z.enum(["confirm", "dismiss"])

// ============================================================================
// Surveillance Flags
// ============================================================================

export const ListSurveillanceFlagsInputSchema = PaginationInputSchema.extend({
	facilityId: z.string().uuid(),
	isReviewed: z.coerce.boolean().optional(),
	flagType: SurveillanceFlagTypeEnum.optional(),
	category: PidsrCategoryEnum.optional(),
})

export const SurveillanceFlagSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid().nullable(),
	noteId: z.string().uuid().nullable(),
	flagType: z.string(),
	triggeredBy: z.string(),
	triggerValue: z.string(),
	category: z.string().nullable(),
	diseaseName: z.string().nullable(),
	isReviewed: z.boolean(),
	reviewedByStaffId: z.string().uuid().nullable(),
	reviewedAt: z.string().nullable(),
	createdAt: z.string(),
	patientName: z.string().nullable(),
	patientMrn: z.string().nullable(),
	encounterType: z.string().nullable(),
})

export const ListSurveillanceFlagsResponseSchema = PaginatedResponseSchema.extend({
	flags: z.array(SurveillanceFlagSchema),
})

export const ReviewFlagInputSchema = z.object({
	id: z.string().uuid(),
	action: FlagReviewActionEnum,
	dismissReason: z.string().optional(),
})

export const ReviewFlagResponseSchema = z.object({
	success: z.boolean(),
	pidsrCaseId: z.string().uuid().nullable(),
})

export type ListSurveillanceFlagsInput = z.infer<typeof ListSurveillanceFlagsInputSchema>
export type SurveillanceFlag = z.infer<typeof SurveillanceFlagSchema>
export type ReviewFlagInput = z.infer<typeof ReviewFlagInputSchema>

// ============================================================================
// PIDSR Cases
// ============================================================================

export const ListPidsrCasesInputSchema = PaginationInputSchema.extend({
	facilityId: z.string().uuid(),
	reportStatus: PidsrReportStatusEnum.optional(),
	category: PidsrCategoryEnum.optional(),
	dateFrom: z.string().optional(),
	dateTo: z.string().optional(),
})

export const PidsrCaseSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid().nullable(),
	patientId: z.string().uuid(),
	diseaseCode: z.string(),
	diseaseName: z.string(),
	caseClassification: CaseClassificationEnum,
	onsetDate: z.string().nullable(),
	diagnosisDate: z.string(),
	reportingStaffId: z.string().uuid(),
	reportStatus: PidsrReportStatusEnum,
	submissionData: z.record(z.string(), z.unknown()).nullable(),
	submittedAt: z.string().nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
	patientName: z.string().nullable(),
	patientMrn: z.string().nullable(),
})

export const ListPidsrCasesResponseSchema = PaginatedResponseSchema.extend({
	cases: z.array(PidsrCaseSchema),
})

export const GetPidsrCaseInputSchema = z.object({
	id: z.string().uuid(),
})

export const PidsrCaseDetailSchema = PidsrCaseSchema.extend({
	encounterType: z.string().nullable(),
	chiefComplaint: z.string().nullable(),
	attendingPhysician: z.string().nullable(),
})

export const SubmitPidsrCaseInputSchema = z.object({
	id: z.string().uuid(),
})

export const SubmitPidsrCaseResponseSchema = z.object({
	success: z.boolean(),
	message: z.string(),
})

export type ListPidsrCasesInput = z.infer<typeof ListPidsrCasesInputSchema>
export type PidsrCase = z.infer<typeof PidsrCaseSchema>
export type PidsrCaseDetail = z.infer<typeof PidsrCaseDetailSchema>

// ============================================================================
// PIDSR Weekly Report
// ============================================================================

export const GenerateWeeklyReportInputSchema = z.object({
	facilityId: z.string().uuid(),
	weekStartDate: z.string(),
})

export const WeeklyReportSummarySchema = z.object({
	weekStartDate: z.string(),
	weekEndDate: z.string(),
	totalCases: z.number(),
	confirmedCases: z.number(),
	diseaseBreakdown: z.array(
		z.object({
			diseaseCode: z.string(),
			diseaseName: z.string(),
			count: z.number(),
		})
	),
	status: z.enum(["generated", "submitted"]),
})

export type WeeklyReportSummary = z.infer<typeof WeeklyReportSummarySchema>

// ============================================================================
// AHSR Metrics
// ============================================================================

export const AhsrMetricsInputSchema = z.object({
	facilityId: z.string().uuid(),
	year: z.coerce.number().int().min(2000).max(2100),
	month: z.coerce.number().int().min(1).max(12).optional(),
})

export const MorbidityMortalityItemSchema = z.object({
	rank: z.number(),
	icdCode: z.string(),
	diseaseName: z.string(),
	count: z.number(),
	percentage: z.number(),
})

export const HaiMetricSchema = z.object({
	haiType: z.string(),
	count: z.number(),
	rate: z.number(),
})

export const AhsrMetricsResponseSchema = z.object({
	facilityId: z.string().uuid(),
	year: z.number(),
	month: z.number().nullable(),
	bedOccupancyRate: z.number().nullable(),
	totalAdmissions: z.number(),
	totalDischarges: z.number(),
	totalDeaths: z.number(),
	grossDeathRate: z.number().nullable(),
	netDeathRate: z.number().nullable(),
	topMorbidities: z.array(MorbidityMortalityItemSchema),
	topMortalities: z.array(MorbidityMortalityItemSchema),
	haiMetrics: z.array(HaiMetricSchema),
})

export const AhsrDrilldownInputSchema = z.object({
	facilityId: z.string().uuid(),
	year: z.coerce.number().int(),
	month: z.coerce.number().int().optional(),
	metric: z.enum(["admissions", "discharges", "deaths", "morbidity", "mortality", "hai"]),
	icdCode: z.string().optional(),
	haiType: z.string().optional(),
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(50),
})

export const AhsrDrilldownEncounterSchema = z.object({
	encounterId: z.string().uuid(),
	patientName: z.string(),
	patientMrn: z.string(),
	encounterType: z.string(),
	admissionDate: z.string(),
	dischargeDate: z.string().nullable(),
	disposition: z.string().nullable(),
	diagnosisCodes: z.array(z.string()),
})

export const AhsrDrilldownResponseSchema = PaginatedResponseSchema.extend({
	encounters: z.array(AhsrDrilldownEncounterSchema),
})

export type AhsrMetricsInput = z.infer<typeof AhsrMetricsInputSchema>
export type AhsrMetricsResponse = z.infer<typeof AhsrMetricsResponseSchema>
export type AhsrDrilldownInput = z.infer<typeof AhsrDrilldownInputSchema>

// ============================================================================
// AHSR Snapshot Export
// ============================================================================

export const ExportAhsrInputSchema = z.object({
	facilityId: z.string().uuid(),
	year: z.coerce.number().int(),
	month: z.coerce.number().int().optional(),
})

export const ExportAhsrResponseSchema = z.object({
	success: z.boolean(),
	message: z.string(),
	snapshotId: z.string().uuid().nullable(),
})

// ============================================================================
// Surveillance Scan (triggered internally or manually)
// ============================================================================

export const ScanEncounterInputSchema = z.object({
	encounterId: z.string().uuid(),
	facilityId: z.string().uuid(),
})

export const ScanEncounterResponseSchema = z.object({
	flagsCreated: z.number(),
	flags: z.array(
		z.object({
			id: z.string().uuid(),
			flagType: z.string(),
			triggeredBy: z.string(),
			triggerValue: z.string(),
		})
	),
})
