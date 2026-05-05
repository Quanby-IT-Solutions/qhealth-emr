import { Injectable, NotFoundException } from "@nestjs/common"
import { and, count, desc, eq, sql } from "drizzle-orm"

import type {
	CreateFhirExport,
	FhirExport,
	FhirExportsQuery,
	FhirExportsResponse,
	FhirResourceType,
	FhirSystemStatus,
	FhirValidationReport,
	NhdrSubmission,
	NhdrSubmissionsQuery,
} from "@repo/contracts"
import {
	auditLogs,
	dataExports,
	fhirExports,
	integrations,
	staffProfiles,
	users,
} from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import { env } from "@/config/env.config"

import { FhirBundleBuilderService } from "./fhir-bundle-builder.service"
import { FhirCanonicalValidatorService } from "./fhir-canonical-validator.service"
import { FhirValidatorService } from "./fhir-validator.service"
import { NhdrAdapterService } from "./nhdr-adapter.service"

@Injectable()
export class FhirService {
	constructor(
		private readonly bundleBuilder: FhirBundleBuilderService,
		private readonly validator: FhirValidatorService,
		private readonly canonicalValidator: FhirCanonicalValidatorService,
		private readonly nhdrAdapter: NhdrAdapterService
	) {}

	private toFhirResourceType(value: string): FhirResourceType | null {
		return value === "Patient" ||
			value === "Encounter" ||
			value === "Observation" ||
			value === "DiagnosticReport" ||
			value === "MedicationRequest" ||
			value === "NutritionOrder" ||
			value === "Procedure" ||
			value === "Condition" ||
			value === "Immunization" ||
			value === "AllergyIntolerance" ||
			value === "Coverage" ||
			value === "ClaimResponse" ||
			value === "Practitioner" ||
			value === "Organization" ||
			value === "Location"
			? value
			: null
	}

	private mapExportStatus(
		status: (typeof fhirExports.$inferSelect)["submissionStatus"],
		errorCount: number
	): FhirExport["status"] {
		switch (status) {
			case "exporting":
				return "processing"
			case "exported":
				// An exported bundle with blocking validation errors is NOT submission-ready
				// (TOR §4.1 — strict terminology enforcement required for NHDR)
				return errorCount > 0 ? "invalid" : "completed"
			case "submitted":
			case "accepted":
			case "rejected":
			case "pending":
				return status
			default:
				return "failed"
		}
	}

	private mapSubmissionStatus(
		status: (typeof fhirExports.$inferSelect)["submissionStatus"]
	): NhdrSubmission["status"] {
		switch (status) {
			case "accepted":
			case "rejected":
				return status
			case "submitted":
				return "submitted"
			case "pending":
			case "exporting":
			case "exported":
				return "pending"
			default:
				return "error"
		}
	}

	private mapExport(row: {
		id: string
		facilityId: string
		submissionStatus: (typeof fhirExports.$inferSelect)["submissionStatus"]
		exportDateRange: (typeof fhirExports.$inferSelect)["exportDateRange"]
		resourceTypes: (typeof fhirExports.$inferSelect)["resourceTypes"]
		totalResources: number
		validResources: number
		errorCount: number
		validationReport: (typeof fhirExports.$inferSelect)["validationReport"]
		exportFileUrl: string | null
		createdAt: Date
		exportedAt: Date | null
		createdByName: string
	}): FhirExport {
		const dateRange = row.exportDateRange ?? { startDate: "", endDate: "" }
		const report = row.validationReport ?? null
		const summary = report?.summary ?? {}
		const resourceTypes = (row.resourceTypes ?? []).flatMap(resourceType => {
			const mapped = this.toFhirResourceType(resourceType)
			return mapped ? [mapped] : []
		})

		const totalValidationIssues = (report?.errors?.length ?? 0) > 0 ? row.id : null

		// exportUrl is non-null whenever the bundle has been built — the frontend
		// uses it as a signal to show the download action, and composes the real
		// API URL itself using the export ID.
		const hasBundle =
			row.submissionStatus === "exported" ||
			row.submissionStatus === "submitted" ||
			row.submissionStatus === "accepted" ||
			row.submissionStatus === "rejected"

		return {
			id: row.id,
			facilityId: row.facilityId,
			status: this.mapExportStatus(row.submissionStatus, row.errorCount),
			dateRangeStart: dateRange.startDate,
			dateRangeEnd: dateRange.endDate,
			resourceTypes,
			validateOnExport: report !== null,
			totalResources: row.totalResources,
			exportedResources: row.validResources,
			exportUrl: hasBundle ? `bundle` : null,
			errorMessage:
				row.errorCount > 0
					? `Validation report contains ${row.errorCount} issue(s).`
					: totalValidationIssues
						? "Validation issues detected during export processing."
						: null,
			createdAt: row.createdAt,
			completedAt: row.exportedAt,
			createdByName: row.createdByName,
			nhdrSubmissionId:
				row.submissionStatus === "submitted" ||
				row.submissionStatus === "accepted" ||
				row.submissionStatus === "rejected"
					? row.id
					: null,
		}
	}

	private async getExportRow(exportId: string) {
		const [row] = await db
			.select({
				id: fhirExports.id,
				facilityId: fhirExports.facilityId,
				submissionStatus: fhirExports.submissionStatus,
				exportDateRange: fhirExports.exportDateRange,
				resourceTypes: fhirExports.resourceTypes,
				totalResources: fhirExports.totalResources,
				validResources: fhirExports.validResources,
				errorCount: fhirExports.errorCount,
				validationReport: fhirExports.validationReport,
				exportFileUrl: fhirExports.exportFileUrl,
				bundleData: fhirExports.bundleData,
				nhdrAcknowledgment: fhirExports.nhdrAcknowledgment,
				createdAt: fhirExports.createdAt,
				exportedAt: fhirExports.exportedAt,
				submittedAt: fhirExports.submittedAt,
				createdByName: sql<string>`coalesce(${users.name}, 'Unknown User')`,
			})
			.from(fhirExports)
			.leftJoin(staffProfiles, eq(fhirExports.initiatedByStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.where(
				and(
					eq(fhirExports.id, exportId),
					// Defense-in-depth: explicitly scope to the active facility so that
					// cross-facility lookups return "not found" even if RLS is misconfigured.
					sql`${fhirExports.facilityId}::text = current_setting('app.current_facility_id', true)`
				)
			)
			.limit(1)

		if (!row) {
			throw new NotFoundException(`FHIR export with id ${exportId} not found`)
		}

		return row
	}

	// ========================================================================
	// Exports
	// ========================================================================

	async listExports(query: FhirExportsQuery): Promise<FhirExportsResponse> {
		const page = query.page ?? 1
		const limit = query.limit ?? 20
		const offset = (page - 1) * limit
		// Facility is derived from the active RLS session variable set by the RBAC guard;
		// the client-supplied query.facilityId is intentionally ignored here to prevent
		// privilege-escalation via query parameter manipulation.
		const whereClause = sql`${fhirExports.facilityId}::text = current_setting('app.current_facility_id', true)`

		const [rows, totalRows] = await Promise.all([
			db
				.select({
					id: fhirExports.id,
					facilityId: fhirExports.facilityId,
					submissionStatus: fhirExports.submissionStatus,
					exportDateRange: fhirExports.exportDateRange,
					resourceTypes: fhirExports.resourceTypes,
					totalResources: fhirExports.totalResources,
					validResources: fhirExports.validResources,
					errorCount: fhirExports.errorCount,
					validationReport: fhirExports.validationReport,
					exportFileUrl: fhirExports.exportFileUrl,
					createdAt: fhirExports.createdAt,
					exportedAt: fhirExports.exportedAt,
					createdByName: sql<string>`coalesce(${users.name}, 'Unknown User')`,
				})
				.from(fhirExports)
				.leftJoin(staffProfiles, eq(fhirExports.initiatedByStaffId, staffProfiles.id))
				.leftJoin(users, eq(staffProfiles.userId, users.id))
				.where(whereClause)
				.orderBy(desc(fhirExports.createdAt))
				.limit(limit)
				.offset(offset),
			db.select({ total: count() }).from(fhirExports).where(whereClause),
		])

		const total = totalRows[0]?.total ?? 0

		return {
			data: rows.map(row => this.mapExport(row)),
			total,
			page,
			totalPages: Math.ceil(total / limit),
		}
	}

	async getExport(exportId: string): Promise<FhirExport> {
		return this.mapExport(await this.getExportRow(exportId))
	}

	async createExport(
		input: CreateFhirExport,
		createdBy: string,
		createdByName: string
	): Promise<FhirExport> {
		const [staff] = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(eq(staffProfiles.userId, createdBy))
			.limit(1)

		if (!staff) {
			throw new NotFoundException("Staff profile not found")
		}

		// ── Create the export row in "exporting" state ──────────────────────
		const [created] = await db
			.insert(fhirExports)
			.values({
				facilityId: input.facilityId,
				exportDateRange: {
					startDate: input.dateRangeStart,
					endDate: input.dateRangeEnd,
				},
				resourceTypes: input.resourceTypes,
				initiatedByStaffId: staff.id,
				submissionStatus: "exporting",
				updatedAt: new Date(),
			})
			.returning({ id: fhirExports.id })

		if (!created) {
			throw new NotFoundException("Failed to create FHIR export")
		}

		const exportId = created.id

		// ── Build the FHIR R4 bundle ─────────────────────────────────────────
		const buildResult = await this.bundleBuilder.build(
			input.facilityId,
			exportId,
			input.dateRangeStart,
			input.dateRangeEnd,
			input.resourceTypes as FhirResourceType[]
		)

		// ── Validation is mandatory for every admin FHIR export (TOR §4.1) ─────
		const vResult = this.validator.validate(buildResult.bundle)

		// ── Canonical terminology membership check (FHIR-004) ────────────────
		// Run after structural validation so that only format-valid codes are
		// looked up in the DB, keeping the canonical check focused on membership.
		const canonicalIssues = await this.canonicalValidator.validateCanonical(buildResult.bundle)
		const canonicalErrors = canonicalIssues
			.filter(i => i.severity === "error")
			.map(i => ({
				resourceType: i.resourceType,
				resourceId: i.resourceId,
				error: `[${i.field}] ${i.error}`,
			}))
		const canonicalWarnings = canonicalIssues
			.filter(i => i.severity === "warning")
			.map(i => ({
				resourceType: i.resourceType,
				resourceId: i.resourceId,
				warning: `[${i.field}] ${i.error}`,
			}))

		const allErrors = [...vResult.errors, ...canonicalErrors]
		const allWarnings = [...vResult.warnings, ...canonicalWarnings]

		const validationReport: typeof fhirExports.$inferInsert.validationReport = {
			errors: allErrors,
			warnings: allWarnings,
			summary: vResult.summary as Record<string, { total: number; valid: number; invalid: number }>,
		}
		const totalErrors = allErrors.length
		const validResources = Object.values(vResult.summary).reduce((sum, s) => sum + s.valid, 0)

		const now = new Date()

		// ── Persist the bundle and update export record ──────────────────────
		await db
			.update(fhirExports)
			.set({
				submissionStatus: "exported",
				exportedAt: now,
				totalResources: buildResult.totalResources,
				validResources,
				errorCount: totalErrors,
				validationReport,
				bundleData: buildResult.ndjson,
				exportFormat: "ndjson",
				updatedAt: now,
			})
			.where(eq(fhirExports.id, exportId))

		const exportRecord = this.mapExport(await this.getExportRow(exportId))

		// ── Audit trail (TOR §4.2 — comprehensive auditability for bulk export) ─
		await Promise.all([
			db.insert(auditLogs).values({
				facilityId: input.facilityId,
				userId: createdBy,
				staffProfileId: staff.id,
				action: "create",
				entityType: "fhir_export",
				entityId: exportId,
				metadata: {
					resourceTypes: input.resourceTypes,
					dateRangeStart: input.dateRangeStart,
					dateRangeEnd: input.dateRangeEnd,
					totalResources: exportRecord.totalResources,
					errorCount: exportRecord.errorMessage ? 1 : 0,
				},
			}),
			db.insert(dataExports).values({
				facilityId: input.facilityId,
				actorUserId: createdBy,
				actorStaffId: staff.id,
				entityType: "bulk_report",
				entityId: exportId,
				destination: "local",
				transmissionScope: "bulk",
				consentGated: false,
				consentOutcome: "granted",
				status: "completed",
			}),
		])

		return { ...exportRecord, createdByName }
	}

	async getValidationReport(exportId: string): Promise<FhirValidationReport> {
		const row = await this.getExportRow(exportId)
		const report = row.validationReport ?? { errors: [], warnings: [], summary: {} }
		const summary = report.summary ?? {}
		const resources = Object.entries(summary).flatMap(([resourceType, values]) => {
			const mappedType = this.toFhirResourceType(resourceType)

			if (!mappedType) {
				return []
			}

			const errorIssues = (report.errors ?? [])
				.filter(issue => issue.resourceType === mappedType)
				.map(issue => ({
					severity: "error" as const,
					code: "validation",
					message: issue.error,
					count: 1,
				}))
			const warningIssues = (report.warnings ?? [])
				.filter(issue => issue.resourceType === mappedType)
				.map(issue => ({
					severity: "warning" as const,
					code: "validation",
					message: issue.warning,
					count: 1,
				}))

			return [
				{
					resourceType: mappedType,
					total: values.total,
					valid: values.valid,
					errorCount: errorIssues.length,
					warningCount: warningIssues.length,
					issues: [...errorIssues, ...warningIssues],
				},
			]
		})

		return {
			exportId,
			validatedAt: row.exportedAt ?? row.createdAt,
			totalResources: row.totalResources,
			totalValid: row.validResources,
			totalErrors: row.errorCount,
			totalWarnings: (report.warnings ?? []).length,
			isValid: row.errorCount === 0,
			resources,
		}
	}

	async submitToNhdr(
		exportId: string,
		submittedBy: string,
		submittedByName: string
	): Promise<NhdrSubmission> {
		const existing = await this.getExportRow(exportId)
		const now = new Date()

		// Guard: export must have been validated (TOR §4.1 — no unvalidated submissions)
		if (existing.validationReport === null) {
			throw new Error(
				`Cannot submit export ${exportId} to NHDR: export has not been validated. Re-create the export to run mandatory validation.`
			)
		}

		// Guard: validation must pass before submission
		if (existing.errorCount > 0) {
			throw new Error(
				`Cannot submit export ${exportId} to NHDR: validation report contains ${existing.errorCount} error(s). Resolve all errors before submitting.`
			)
		}

		if (!existing.bundleData) {
			throw new Error(
				`Cannot submit export ${exportId} to NHDR: bundle has not been generated. Please re-create the export.`
			)
		}

		const dateRange = existing.exportDateRange ?? {
			startDate: now.toISOString().split("T")[0]!,
			endDate: now.toISOString().split("T")[0]!,
		}

		// ── Resolve NHDR config from Integration Registry (authoritative source) ─
		// The registry row is facility-scoped and takes precedence over global env vars.
		// If no enabled registry row is found, the adapter falls back to NHDR_BASE_URL / NHDR_API_KEY.
		const [nhdrRegistryRow] = await db
			.select({
				id: integrations.id,
				endpointUrl: integrations.endpointUrl,
				credentialsRef: integrations.credentialsRef,
			})
			.from(integrations)
			.where(
				and(
					eq(integrations.facilityId, existing.facilityId),
					eq(integrations.kind, "nhdr"),
					eq(integrations.enabled, true)
				)
			)
			.limit(1)

		if (!nhdrRegistryRow) {
			throw new Error(
				"NHDR submission blocked: no enabled NHDR integration is configured for this facility " +
					"in the Integration Registry. Configure one at Admin \u2192 Integration Registry."
			)
		}

		const nhdrRuntimeConfig = {
			baseUrl: nhdrRegistryRow.endpointUrl,
			apiKey: nhdrRegistryRow.credentialsRef
				? process.env[nhdrRegistryRow.credentialsRef]
				: undefined,
		}

		// ── Submit via NHDR adapter ──────────────────────────────────────────
		const ack = await this.nhdrAdapter.submit(
			{
				exportId,
				facilityId: existing.facilityId,
				periodStart: dateRange.startDate,
				periodEnd: dateRange.endDate,
				ndjsonContent: existing.bundleData,
				submittedByName,
			},
			nhdrRuntimeConfig
		)

		const [submittedByStaff] = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(eq(staffProfiles.userId, submittedBy))
			.limit(1)

		await db
			.update(fhirExports)
			.set({
				submissionStatus: "submitted",
				submittedAt: now,
				nhdrAcknowledgment: ack,
				updatedAt: now,
			})
			.where(eq(fhirExports.id, exportId))

		// ── Audit trail (TOR §4.2 — NHDR submission must be durably recorded) ─
		await Promise.all([
			db.insert(auditLogs).values({
				facilityId: existing.facilityId,
				userId: submittedBy,
				staffProfileId: submittedByStaff?.id ?? null,
				action: "create",
				entityType: "nhdr_submission",
				entityId: exportId,
				metadata: {
					receiptNumber: ack.receiptNumber,
					periodStart: dateRange.startDate,
					periodEnd: dateRange.endDate,
				},
			}),
			db.insert(dataExports).values({
				facilityId: existing.facilityId,
				actorUserId: submittedBy,
				actorStaffId: submittedByStaff?.id ?? null,
				entityType: "bulk_report",
				entityId: exportId,
				destination: "nhdr",
				transmissionScope: "bulk",
				consentGated: false,
				consentOutcome: "granted",
				status: "completed",
			}),
			// ── INTREG-014: Write sync outcome back to the integration row ──────
			db
				.update(integrations)
				.set({ lastSyncAt: now, lastSyncStatus: "ok", updatedAt: now })
				.where(eq(integrations.id, nhdrRegistryRow.id)),
		])

		return {
			id: exportId,
			exportId,
			facilityId: existing.facilityId,
			status: "submitted",
			submittedAt: now,
			acknowledgementId: ack.receiptNumber || null,
			responseMessage: ack.responseMessage,
			responseReceivedAt: null,
			submittedByName,
			periodStart: dateRange.startDate,
			periodEnd: dateRange.endDate,
		}
	}

	// ========================================================================
	// Bundle download
	// ========================================================================

	async getBundleData(
		exportId: string,
		actorUserId: string
	): Promise<{ ndjson: string; filename: string }> {
		const row = await this.getExportRow(exportId)
		if (!row.bundleData) {
			throw new NotFoundException(
				`No bundle data found for export ${exportId}. The export may still be processing or failed.`
			)
		}
		const dateRange = row.exportDateRange
		const suffix = dateRange ? `_${dateRange.startDate}_${dateRange.endDate}` : ""

		// ── Audit trail (TOR §4.2 — every bundle download must be logged) ──────
		const [actorStaff] = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(eq(staffProfiles.userId, actorUserId))
			.limit(1)

		await Promise.all([
			db.insert(auditLogs).values({
				facilityId: row.facilityId,
				userId: actorUserId,
				staffProfileId: actorStaff?.id ?? null,
				action: "read",
				entityType: "fhir_export",
				entityId: exportId,
				metadata: { filename: `fhir_export_${exportId.slice(0, 8)}${suffix}.ndjson` },
			}),
			db.insert(dataExports).values({
				facilityId: row.facilityId,
				actorUserId,
				actorStaffId: actorStaff?.id ?? null,
				entityType: "bulk_report",
				entityId: exportId,
				destination: "local_download",
				transmissionScope: "bulk",
				consentGated: false,
				consentOutcome: "granted",
				status: "completed",
			}),
		])

		return {
			ndjson: row.bundleData,
			filename: `fhir_export_${exportId.slice(0, 8)}${suffix}.ndjson`,
		}
	}

	// ========================================================================
	// NHDR Submissions
	// ========================================================================

	async listNhdrSubmissions(query: NhdrSubmissionsQuery): Promise<NhdrSubmission[]> {
		// Facility is derived from the active RLS session variable set by the RBAC guard;
		// the client-supplied query.facilityId is intentionally ignored here.
		const whereClause = and(
			sql`${fhirExports.facilityId}::text = current_setting('app.current_facility_id', true)`,
			sql`${fhirExports.submissionStatus} in ('submitted', 'accepted', 'rejected')`
		)

		const rows = await db
			.select({
				id: fhirExports.id,
				facilityId: fhirExports.facilityId,
				submissionStatus: fhirExports.submissionStatus,
				exportDateRange: fhirExports.exportDateRange,
				nhdrAcknowledgment: fhirExports.nhdrAcknowledgment,
				submittedAt: fhirExports.submittedAt,
				createdByName: sql<string>`coalesce(${users.name}, 'Unknown User')`,
			})
			.from(fhirExports)
			.leftJoin(staffProfiles, eq(fhirExports.initiatedByStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.where(whereClause)
			.orderBy(desc(fhirExports.submittedAt), desc(fhirExports.createdAt))

		return rows.map(row => ({
			id: row.id,
			exportId: row.id,
			facilityId: row.facilityId,
			status: this.mapSubmissionStatus(row.submissionStatus),
			submittedAt: row.submittedAt,
			acknowledgementId: row.nhdrAcknowledgment?.receiptNumber ?? null,
			responseMessage: row.nhdrAcknowledgment?.responseMessage ?? null,
			responseReceivedAt: row.nhdrAcknowledgment?.submissionDate
				? new Date(row.nhdrAcknowledgment.submissionDate)
				: null,
			submittedByName: row.createdByName,
			periodStart: row.exportDateRange?.startDate ?? "",
			periodEnd: row.exportDateRange?.endDate ?? "",
		}))
	}

	// ========================================================================
	// System status
	// ========================================================================

	async getSystemStatus(facilityId: string): Promise<FhirSystemStatus> {
		const nhdrMode = env.NHDR_MODE

		// Scope the NHDR registry lookup to the active facility only.
		// A different facility's enabled NHDR row must not influence this result.
		const [registryNhdr] = await db
			.select({
				endpointUrl: integrations.endpointUrl,
				credentialsRef: integrations.credentialsRef,
			})
			.from(integrations)
			.where(
				and(
					eq(integrations.facilityId, facilityId),
					eq(integrations.kind, "nhdr"),
					eq(integrations.enabled, true)
				)
			)
			.limit(1)

		const nhdrConfigured = nhdrMode === "real" && registryNhdr !== undefined

		let nhdrEndpointNote: string
		if (nhdrMode === "real") {
			if (registryNhdr) {
				const hasKey = registryNhdr.credentialsRef && process.env[registryNhdr.credentialsRef]
				nhdrEndpointNote = hasKey
					? "NHDR integration is active and configured via the Integration Registry."
					: "NHDR integration is configured in the Integration Registry but the credential environment variable is not set. Submissions will fail."
			} else {
				nhdrEndpointNote =
					"NHDR mode is set to 'real' but no active NHDR integration is configured. " +
					"Configure one in Admin \u2192 Integration Registry."
			}
		} else {
			nhdrEndpointNote =
				"NHDR integration is in mock mode. Submissions return a PENDING acknowledgement and are not forwarded to the NHDR."
		}

		return {
			nhdrMode,
			nhdrConfigured,
			nhdrBaseUrl: registryNhdr?.endpointUrl ?? null,
			nhdrEndpointNote,
		}
	}
}
