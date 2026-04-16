import { Injectable, NotFoundException } from "@nestjs/common"
import { and, count, desc, eq, sql } from "drizzle-orm"

import { fhirExports, staffProfiles, users } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

import type {
	FhirExport,
	FhirExportsQuery,
	FhirExportsResponse,
	FhirResourceType,
	FhirValidationReport,
	NhdrSubmission,
	NhdrSubmissionsQuery,
	CreateFhirExport,
} from "@repo/contracts"

@Injectable()
export class FhirService {
	private toFhirResourceType(value: string): FhirResourceType | null {
		return value === "Patient" ||
			value === "Encounter" ||
			value === "Observation" ||
			value === "DiagnosticReport" ||
			value === "MedicationRequest" ||
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
		status: (typeof fhirExports.$inferSelect)["submissionStatus"]
	): FhirExport["status"] {
		switch (status) {
			case "exporting":
				return "processing"
			case "exported":
				return "completed"
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

		const totalValidationIssues =
			(report?.errors?.length ?? 0) > 0 ? row.id : null

		return {
			id: row.id,
			facilityId: row.facilityId,
			status: this.mapExportStatus(row.submissionStatus),
			dateRangeStart: dateRange.startDate,
			dateRangeEnd: dateRange.endDate,
			resourceTypes,
			validateOnExport: report !== null,
			totalResources: row.totalResources,
			exportedResources: row.validResources,
			exportUrl: row.exportFileUrl,
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
				row.submissionStatus === "submitted" || row.submissionStatus === "accepted" || row.submissionStatus === "rejected"
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
				nhdrAcknowledgment: fhirExports.nhdrAcknowledgment,
				createdAt: fhirExports.createdAt,
				exportedAt: fhirExports.exportedAt,
				submittedAt: fhirExports.submittedAt,
				createdByName: sql<string>`coalesce(${users.name}, 'Unknown User')`,
			})
			.from(fhirExports)
			.leftJoin(staffProfiles, eq(fhirExports.initiatedByStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.where(eq(fhirExports.id, exportId))
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
		const whereClause = query.facilityId ? eq(fhirExports.facilityId, query.facilityId) : undefined

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

		const validationReport = input.validateOnExport
			? {
				errors: [],
				warnings: [],
				summary: Object.fromEntries(
					input.resourceTypes.map(resourceType => [resourceType, { total: 0, valid: 0, invalid: 0 }])
				),
			}
			: null

		const [created] = await db
			.insert(fhirExports)
			.values({
				facilityId: input.facilityId,
				exportDateRange: {
					startDate: input.dateRangeStart,
					endDate: input.dateRangeEnd,
				},
				resourceTypes: input.resourceTypes,
				validationReport: validationReport as typeof fhirExports.$inferInsert.validationReport,
				initiatedByStaffId: staff.id,
				submissionStatus: "pending",
				updatedAt: new Date(),
			})
			.returning({ id: fhirExports.id })

		if (!created) {
			throw new NotFoundException("Failed to create FHIR export")
		}

		const exportRecord = this.mapExport(await this.getExportRow(created.id))
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
				.map(issue => ({ severity: "error" as const, code: "validation", message: issue.error, count: 1 }))
			const warningIssues = (report.warnings ?? [])
				.filter(issue => issue.resourceType === mappedType)
				.map(issue => ({ severity: "warning" as const, code: "validation", message: issue.warning, count: 1 }))

			return [{
				resourceType: mappedType,
				total: values.total,
				valid: values.valid,
				errorCount: errorIssues.length,
				warningCount: warningIssues.length,
				issues: [...errorIssues, ...warningIssues],
			}]
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
		const ack = {
			receiptNumber: `NHDR-${exportId.slice(0, 8).toUpperCase()}`,
			submissionDate: now.toISOString(),
			responseCode: "PENDING",
			responseMessage: `Queued by ${submittedByName}`,
		}

		await db
			.update(fhirExports)
			.set({
				submissionStatus: "submitted",
				submittedAt: now,
				nhdrAcknowledgment: ack,
				updatedAt: now,
			})
			.where(eq(fhirExports.id, exportId))

		const dateRange = existing.exportDateRange ?? { startDate: now.toISOString().split("T")[0]!, endDate: now.toISOString().split("T")[0]! }

		void submittedBy

		return {
			id: exportId,
			exportId,
			facilityId: existing.facilityId,
			status: "submitted",
			submittedAt: now,
			acknowledgementId: ack.receiptNumber,
			responseMessage: ack.responseMessage,
			responseReceivedAt: null,
			submittedByName,
			periodStart: dateRange.startDate,
			periodEnd: dateRange.endDate,
		}
	}

	// ========================================================================
	// NHDR Submissions
	// ========================================================================

	async listNhdrSubmissions(query: NhdrSubmissionsQuery): Promise<NhdrSubmission[]> {
		const whereClause = query.facilityId
			? and(
				eq(fhirExports.facilityId, query.facilityId),
				sql`${fhirExports.submissionStatus} in ('submitted', 'accepted', 'rejected')`
			)
			: sql`${fhirExports.submissionStatus} in ('submitted', 'accepted', 'rejected')`

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
			responseReceivedAt:
				row.nhdrAcknowledgment?.submissionDate ? new Date(row.nhdrAcknowledgment.submissionDate) : null,
			submittedByName: row.createdByName,
			periodStart: row.exportDateRange?.startDate ?? "",
			periodEnd: row.exportDateRange?.endDate ?? "",
		}))
	}
}
