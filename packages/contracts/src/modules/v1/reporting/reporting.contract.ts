import { oc } from "@orpc/contract"

import {
	AhsrDrilldownInputSchema,
	AhsrDrilldownResponseSchema,
	AhsrMetricsInputSchema,
	AhsrMetricsResponseSchema,
	AhsrRealTimeMetricsSchema,
	AhsrRealTimeQuerySchema,
	AutoDetectionResultSchema,
	DismissPidsrCaseInputSchema,
	DismissPidsrCaseResponseSchema,
	ExportAhsrInputSchema,
	ExportAhsrResponseSchema,
	ExportMmPdfInputSchema,
	ExportMmPdfResponseSchema,
	GenerateWeeklyReportInputSchema,
	GetPidsrCaseInputSchema,
	ListDetectionRulesQuerySchema,
	ListDetectionRulesResponseSchema,
	ListPidsrCasesInputSchema,
	ListPidsrCasesResponseSchema,
	ListSurveillanceFlagsInputSchema,
	ListSurveillanceFlagsResponseSchema,
	LockAhsrPeriodInputSchema,
	LockAhsrPeriodResponseSchema,
	MmConditionInputSchema,
	MmConditionResponseSchema,
	MmTop10InputSchema,
	MmTop10ResponseSchema,
	PidsrCaseDetailSchema,
	ReviewFlagInputSchema,
	ReviewFlagResponseSchema,
	RunAutoDetectionInputSchema,
	ScanEncounterInputSchema,
	ScanEncounterResponseSchema,
	SubmitPidsrCaseInputSchema,
	SubmitPidsrCaseResponseSchema,
	ValidateAhsrInputSchema,
	ValidateAhsrResponseSchema,
	WeeklyReportSummarySchema,
} from "./reporting.schema.js"

export const reportingContract = {
	// ========================================================================
	// Surveillance Flags
	// ========================================================================

	listSurveillanceFlags: oc
		.route({
			method: "GET",
			path: "/surveillance-flags",
			summary: "List surveillance flags",
			tags: ["Reporting"],
		})
		.input(ListSurveillanceFlagsInputSchema)
		.output(ListSurveillanceFlagsResponseSchema),

	reviewSurveillanceFlag: oc
		.route({
			method: "POST",
			path: "/surveillance-flags/review",
			summary: "Confirm or dismiss a surveillance flag",
			tags: ["Reporting"],
		})
		.input(ReviewFlagInputSchema)
		.output(ReviewFlagResponseSchema),

	scanEncounter: oc
		.route({
			method: "POST",
			path: "/surveillance-flags/scan",
			summary: "Scan an encounter for notifiable diseases",
			tags: ["Reporting"],
		})
		.input(ScanEncounterInputSchema)
		.output(ScanEncounterResponseSchema),

	// ========================================================================
	// PIDSR Cases
	// ========================================================================

	listPidsrCases: oc
		.route({ method: "GET", path: "/pidsr", summary: "List PIDSR cases", tags: ["Reporting"] })
		.input(ListPidsrCasesInputSchema)
		.output(ListPidsrCasesResponseSchema),

	getPidsrCase: oc
		.route({
			method: "GET",
			path: "/pidsr/{id}",
			summary: "Get PIDSR case detail",
			tags: ["Reporting"],
		})
		.input(GetPidsrCaseInputSchema)
		.output(PidsrCaseDetailSchema),

	submitPidsrCase: oc
		.route({
			method: "POST",
			path: "/pidsr/{id}/submit",
			summary: "Submit PIDSR case (stubbed)",
			tags: ["Reporting"],
		})
		.input(SubmitPidsrCaseInputSchema)
		.output(SubmitPidsrCaseResponseSchema),

	dismissPidsrCase: oc
		.route({
			method: "POST",
			path: "/pidsr/{id}/dismiss",
			summary: "Dismiss a PIDSR case with a required reason",
			tags: ["Reporting"],
		})
		.input(DismissPidsrCaseInputSchema)
		.output(DismissPidsrCaseResponseSchema),

	// ========================================================================
	// PIDSR Weekly Report
	// ========================================================================

	generateWeeklyReport: oc
		.route({
			method: "POST",
			path: "/pidsr/weekly",
			summary: "Generate PIDSR weekly report",
			tags: ["Reporting"],
		})
		.input(GenerateWeeklyReportInputSchema)
		.output(WeeklyReportSummarySchema),

	// ========================================================================
	// PIDSR Auto-Detection
	// ========================================================================

	listDetectionRules: oc
		.route({
			method: "GET",
			path: "/pidsr/detection-rules",
			summary: "List disease detection rules",
			tags: ["Reporting"],
		})
		.input(ListDetectionRulesQuerySchema)
		.output(ListDetectionRulesResponseSchema),

	runAutoDetection: oc
		.route({
			method: "POST",
			path: "/pidsr/auto-detect",
			summary: "Run auto-detection on an encounter",
			tags: ["Reporting"],
		})
		.input(RunAutoDetectionInputSchema)
		.output(AutoDetectionResultSchema),

	// ========================================================================
	// AHSR Metrics
	// ========================================================================

	getAhsrMetrics: oc
		.route({
			method: "GET",
			path: "/ahsr",
			summary: "Get AHSR metrics dashboard data",
			tags: ["Reporting"],
		})
		.input(AhsrMetricsInputSchema)
		.output(AhsrMetricsResponseSchema),

	getAhsrRealTime: oc
		.route({
			method: "GET",
			path: "/ahsr/realtime",
			summary: "Get real-time AHSR dashboard metrics",
			tags: ["Reporting"],
		})
		.input(AhsrRealTimeQuerySchema)
		.output(AhsrRealTimeMetricsSchema),

	drilldownAhsr: oc
		.route({
			method: "GET",
			path: "/ahsr/drilldown",
			summary: "Drill down into AHSR metric",
			tags: ["Reporting"],
		})
		.input(AhsrDrilldownInputSchema)
		.output(AhsrDrilldownResponseSchema),

	exportAhsr: oc
		.route({
			method: "POST",
			path: "/ahsr/export",
			summary: "Export AHSR report (stubbed)",
			tags: ["Reporting"],
		})
		.input(ExportAhsrInputSchema)
		.output(ExportAhsrResponseSchema),

	validateAhsr: oc
		.route({
			method: "GET",
			path: "/ahsr/validate",
			summary: "Validate AHSR period — returns readiness % and issues",
			tags: ["Reporting"],
		})
		.input(ValidateAhsrInputSchema)
		.output(ValidateAhsrResponseSchema),

	lockAhsrPeriod: oc
		.route({
			method: "POST",
			path: "/ahsr/lock-period",
			summary: "Lock an AHSR reporting period",
			tags: ["Reporting"],
		})
		.input(LockAhsrPeriodInputSchema)
		.output(LockAhsrPeriodResponseSchema),

	// ========================================================================
	// Mortality & Morbidity
	// ========================================================================

	getMmTop10: oc
		.route({
			method: "GET",
			path: "/mm/top10",
			summary: "Get Top-10 mortality or morbidity causes",
			tags: ["Reporting"],
		})
		.input(MmTop10InputSchema)
		.output(MmTop10ResponseSchema),

	getMmCondition: oc
		.route({
			method: "GET",
			path: "/mm/condition/{icdCode}",
			summary: "Get demographic breakdown for a specific ICD-10 condition",
			tags: ["Reporting"],
		})
		.input(MmConditionInputSchema)
		.output(MmConditionResponseSchema),

	exportMmPdf: oc
		.route({
			method: "POST",
			path: "/mm/export-pdf",
			summary: "Export mortality/morbidity report as PDF for DOH",
			tags: ["Reporting"],
		})
		.input(ExportMmPdfInputSchema)
		.output(ExportMmPdfResponseSchema),
}
