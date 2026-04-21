import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm"

import { auditLogs, breakGlassEvents, patients, staffProfiles } from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import type { V1Inputs } from "@/config/contract-types"

type AuditLogFilterInput = V1Inputs["audit"]["log"]["list"]
type BreakGlassFilterInput = V1Inputs["audit"]["breakGlass"]["list"]
type CreateBreakGlassInput = V1Inputs["audit"]["breakGlass"]["create"]
type ReviewBreakGlassInput = V1Inputs["audit"]["breakGlass"]["review"]

/**
 * Transaction handle type derived from the Drizzle client. Pass a transaction
 * handle here to make the audit insert participate in the caller's transaction
 * (so the audit row rolls back if the outer transaction rolls back).
 */
export type DBTransaction = Parameters<Parameters<typeof db["transaction"]>[0]>[0]

interface LogAuditEntry {
	facilityId: string
	userId: string
	staffProfileId: string | null
	action: "create" | "update" | "delete" | "sign" | "verify" | "override"
	entityType: string
	entityId: string
	beforeState: Record<string, unknown> | null
	afterState: Record<string, unknown> | null
	ipAddress: string | null
	userAgent: string | null
	metadata: Record<string, unknown> | null
}

@Injectable()
export class AuditService {
	private readonly logger = new Logger(AuditService.name)

	async resolveStaffProfileId(userId: string) {
		const [row] = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(eq(staffProfiles.userId, userId))
			.limit(1)

		if (!row) {
			throw new NotFoundException("Staff profile not found")
		}

		return row.id
	}

	/**
	 * Write an audit log entry. Called by @Audited() decorator and directly by services.
	 *
	 * @param entry   The audit entry to write.
	 * @param options Optional options object.
	 * @param options.tx When supplied the insert runs inside this Drizzle transaction
	 *                   so the audit row participates in the caller's transaction and
	 *                   rolls back together with the data change on failure. When
	 *                   omitted the singleton `db` client is used (existing behaviour).
	 */
	async log(entry: LogAuditEntry, options?: { tx?: DBTransaction }) {
		const client = options?.tx ?? db
		try {
			const [created] = await client
				.insert(auditLogs)
				.values({
					facilityId: entry.facilityId,
					userId: entry.userId,
					staffProfileId: entry.staffProfileId,
					action: entry.action,
					entityType: entry.entityType,
					entityId: entry.entityId,
					beforeState: entry.beforeState,
					afterState: entry.afterState,
					ipAddress: entry.ipAddress,
					userAgent: entry.userAgent,
					metadata: entry.metadata,
				})
				.returning()
			return created
		} catch (error) {
			this.logger.error(`Failed to write audit log: ${error}`)
			throw error
		}
	}

	/**
	 * Query audit logs with filtering and pagination.
	 */
	async findAll(filter: AuditLogFilterInput) {
		const { facilityId, startDate, endDate, userId, action, entityType, patientMrn } = filter
		const page = Number(filter.page) || 1
		const limit = Number(filter.limit) || 50

		const conditions = [eq(auditLogs.facilityId, facilityId)]

		if (startDate) {
			conditions.push(gte(auditLogs.createdAt, new Date(startDate)))
		}
		if (endDate) {
			conditions.push(lte(auditLogs.createdAt, new Date(endDate)))
		}
		if (userId) {
			conditions.push(eq(auditLogs.userId, userId))
		}
		if (action) {
			conditions.push(eq(auditLogs.action, action))
		}
		if (entityType) {
			conditions.push(eq(auditLogs.entityType, entityType))
		}
		if (patientMrn) {
			conditions.push(sql`exists (
				select 1
				from ${breakGlassEvents}
				inner join ${patients} on ${patients.id} = ${breakGlassEvents.patientId}
				where ${breakGlassEvents.id} = ${auditLogs.entityId}
				and ${auditLogs.entityType} = 'break_glass_event'
				and ${patients.mrn} = ${patientMrn}
			)`)
		}

		const whereClause = and(...conditions)
		const offset = (page - 1) * limit

		const [data, totalResult] = await Promise.all([
			db
				.select()
				.from(auditLogs)
				.where(whereClause)
				.orderBy(desc(auditLogs.createdAt))
				.limit(limit)
				.offset(offset),
			db
				.select({ count: count() })
				.from(auditLogs)
				.where(whereClause),
		])

		const total = totalResult[0]?.count ?? 0

		return {
			data,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	/**
	 * Get a single audit log by ID.
	 */
	async findOne(id: string) {
		const [log] = await db
			.select()
			.from(auditLogs)
			.where(eq(auditLogs.id, id))

		if (!log) throw new NotFoundException(`Audit log ${id} not found`)
		return log
	}

	/**
	 * Export audit logs (no pagination, respects filters).
	 */
	async exportLogs(filter: Omit<AuditLogFilterInput, "page" | "limit">) {
		const { facilityId, startDate, endDate, userId, action, entityType, patientMrn } = filter

		const conditions = [eq(auditLogs.facilityId, facilityId)]

		if (startDate) {
			conditions.push(gte(auditLogs.createdAt, new Date(startDate)))
		}
		if (endDate) {
			conditions.push(lte(auditLogs.createdAt, new Date(endDate)))
		}
		if (userId) {
			conditions.push(eq(auditLogs.userId, userId))
		}
		if (action) {
			conditions.push(eq(auditLogs.action, action))
		}
		if (entityType) {
			conditions.push(eq(auditLogs.entityType, entityType))
		}
		if (patientMrn) {
			conditions.push(sql`exists (
				select 1
				from ${breakGlassEvents}
				inner join ${patients} on ${patients.id} = ${breakGlassEvents.patientId}
				where ${breakGlassEvents.id} = ${auditLogs.entityId}
				and ${auditLogs.entityType} = 'break_glass_event'
				and ${patients.mrn} = ${patientMrn}
			)`)
		}

		const data = await db
			.select()
			.from(auditLogs)
			.where(and(...conditions))
			.orderBy(desc(auditLogs.createdAt))
			.limit(10000)

		return {
			data,
			total: data.length,
			page: 1,
			limit: data.length,
			totalPages: 1,
		}
	}

	// ===========================================================================
	// Break Glass Events
	// ===========================================================================

	/**
	 * Create a break-glass emergency access event.
	 */
	async createBreakGlass(input: CreateBreakGlassInput & { clinicianStaffId: string; userId: string }) {
		const accessGrantedAt = new Date()
		const accessExpiresAt = new Date(
			accessGrantedAt.getTime() + (input.durationHours ?? 4) * 60 * 60 * 1000
		)

		const [event] = await db
			.insert(breakGlassEvents)
			.values({
				facilityId: input.facilityId,
				clinicianStaffId: input.clinicianStaffId,
				patientId: input.patientId,
				reasonCategory: input.reasonCategory,
				justification: input.justification,
				accessGrantedAt,
				accessExpiresAt,
				reviewStatus: "pending",
			})
			.returning()

		if (!event) throw new Error("Failed to create break-glass event")

		// Log the break-glass as an audit entry
		await this.log({
			facilityId: input.facilityId,
			userId: input.userId,
			staffProfileId: input.clinicianStaffId,
			action: "override",
			entityType: "break_glass_event",
			entityId: event.id,
			beforeState: null,
			afterState: event as unknown as Record<string, unknown>,
			ipAddress: null,
			userAgent: null,
			metadata: {
				reasonCategory: input.reasonCategory,
				patientId: input.patientId,
			},
		})

		return event
	}

	/**
	 * List break-glass events with filtering.
	 */
	async findBreakGlassEvents(filter: BreakGlassFilterInput) {
		const { facilityId, reviewStatus, clinicianStaffId, patientId } = filter
		const page = Number(filter.page) || 1
		const limit = Number(filter.limit) || 50

		const conditions = [eq(breakGlassEvents.facilityId, facilityId)]

		if (reviewStatus) {
			conditions.push(eq(breakGlassEvents.reviewStatus, reviewStatus))
		}
		if (clinicianStaffId) {
			conditions.push(eq(breakGlassEvents.clinicianStaffId, clinicianStaffId))
		}
		if (patientId) {
			conditions.push(eq(breakGlassEvents.patientId, patientId))
		}

		const whereClause = and(...conditions)
		const offset = (page - 1) * limit

		const [data, totalResult] = await Promise.all([
			db
				.select()
				.from(breakGlassEvents)
				.where(whereClause)
				.orderBy(desc(breakGlassEvents.createdAt))
				.limit(limit)
				.offset(offset),
			db
				.select({ count: count() })
				.from(breakGlassEvents)
				.where(whereClause),
		])

		const total = totalResult[0]?.count ?? 0

		return {
			data,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	/**
	 * Get a single break-glass event by ID.
	 */
	async findBreakGlassEvent(id: string) {
		const [event] = await db
			.select()
			.from(breakGlassEvents)
			.where(eq(breakGlassEvents.id, id))

		if (!event) throw new NotFoundException(`Break-glass event ${id} not found`)
		return event
	}

	/**
	 * Review a break-glass event (Privacy Officer action).
	 */
	async reviewBreakGlass(input: ReviewBreakGlassInput & { reviewerStaffId: string }) {
		const [event] = await db
			.update(breakGlassEvents)
			.set({
				reviewStatus: input.reviewStatus,
				reviewNotes: input.reviewNotes ?? null,
				reviewedByStaffId: input.reviewerStaffId,
				reviewedAt: new Date(),
			})
			.where(eq(breakGlassEvents.id, input.id))
			.returning()

		if (!event) throw new NotFoundException(`Break-glass event ${input.id} not found`)
		return event
	}

	/**
	 * Check if a clinician has active break-glass access for a patient.
	 */
	async hasActiveBreakGlassAccess(clinicianStaffId: string, patientId: string): Promise<boolean> {
		const now = new Date()
		const [event] = await db
			.select()
			.from(breakGlassEvents)
			.where(
				and(
					eq(breakGlassEvents.clinicianStaffId, clinicianStaffId),
					eq(breakGlassEvents.patientId, patientId),
					gte(breakGlassEvents.accessExpiresAt, now)
				)
			)
			.limit(1)

		return !!event
	}
}
