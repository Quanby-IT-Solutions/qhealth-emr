import { Injectable } from "@nestjs/common"
import { and, desc, eq, gte, lt, lte, or, sql } from "drizzle-orm"
import { createHash } from "crypto"

import { auditExports, auditLogs, staffProfiles } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

const REDACTED = "[REDACTED]"

const SENSITIVE_KEYS = new Set([
	"password",
	"passwordHash",
	"otp",
	"otpSecret",
	"totp",
	"totpSecret",
	"signatureImage",
	"signatureBytes",
	"signatureData",
	"philhealthPin",
	"philHealthPin",
	"philhealthPIN",
	"philHealthPIN",
])

function redactSensitiveFields(value: unknown): unknown {
	if (value === null || value === undefined) return value
	if (typeof value !== "object") return value

	if (Array.isArray(value)) {
		return value.map(redactSensitiveFields)
	}

	const result: Record<string, unknown> = {}
	for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
		result[key] = SENSITIVE_KEYS.has(key) ? REDACTED : redactSensitiveFields(val)
	}
	return result
}

function encodeCursor(ts: Date, id: string): string {
	return Buffer.from(JSON.stringify({ ts: ts.toISOString(), id })).toString("base64url")
}

function decodeCursor(cursor: string): { ts: Date; id: string } | null {
	try {
		const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as { ts: string; id: string }
		return { ts: new Date(parsed.ts), id: parsed.id }
	} catch {
		return null
	}
}

interface AuditLogFilter {
	facilityId: string
	startDate?: string
	endDate?: string
	userId?: string
	action?: string
	entityType?: string
	entityId?: string
	sessionId?: string
	severity?: "info" | "warning" | "critical"
	outcome?: "success" | "failure"
	cursor?: string
	page?: number
	limit?: number
}

@Injectable()
export class AuditLogService {
	async list(filter: AuditLogFilter) {
		const limit = Number(filter.limit) || 50

		const conditions = [eq(auditLogs.facilityId, filter.facilityId)]

		if (filter.startDate) conditions.push(gte(auditLogs.createdAt, new Date(filter.startDate)))
		if (filter.endDate) conditions.push(lte(auditLogs.createdAt, new Date(filter.endDate)))
		if (filter.userId) conditions.push(eq(auditLogs.userId, filter.userId))
		if (filter.action) conditions.push(eq(auditLogs.action, filter.action as never))
		if (filter.entityType) conditions.push(eq(auditLogs.entityType, filter.entityType))
		if (filter.entityId) conditions.push(eq(auditLogs.entityId, filter.entityId))
		if (filter.sessionId) conditions.push(eq(auditLogs.sessionId, filter.sessionId))
		if (filter.severity) conditions.push(eq(auditLogs.severity, filter.severity))
		if (filter.outcome) conditions.push(eq(auditLogs.outcome, filter.outcome))

		// Cursor keyset: (createdAt DESC, id DESC)
		// After cursor point: createdAt < cursorTs OR (createdAt = cursorTs AND id < cursorId)
		const decoded = filter.cursor ? decodeCursor(filter.cursor) : null
		if (decoded) {
			conditions.push(
				or(
					lt(auditLogs.createdAt, decoded.ts),
					and(eq(auditLogs.createdAt, decoded.ts), lt(auditLogs.id, decoded.id))
				)!
			)
		}

		const where = and(...conditions)

		const [rows, countRows] = await Promise.all([
			db
				.select()
				.from(auditLogs)
				.where(where)
				.orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
				.limit(limit + 1),
			db.select({ total: sql<number>`count(*)::int` }).from(auditLogs).where(
				// Count without cursor condition for accurate total
				and(
					eq(auditLogs.facilityId, filter.facilityId),
					...(filter.startDate ? [gte(auditLogs.createdAt, new Date(filter.startDate))] : []),
					...(filter.endDate ? [lte(auditLogs.createdAt, new Date(filter.endDate))] : []),
					...(filter.userId ? [eq(auditLogs.userId, filter.userId)] : []),
					...(filter.action ? [eq(auditLogs.action, filter.action as never)] : []),
					...(filter.entityType ? [eq(auditLogs.entityType, filter.entityType)] : []),
					...(filter.sessionId ? [eq(auditLogs.sessionId, filter.sessionId)] : []),
					...(filter.severity ? [eq(auditLogs.severity, filter.severity)] : []),
					...(filter.outcome ? [eq(auditLogs.outcome, filter.outcome)] : []),
				)
			),
		])

		const total = countRows[0]?.total ?? 0
		const hasMore = rows.length > limit
		const page = rows.slice(0, limit)

		const lastRow = page[page.length - 1]
		const nextCursor = hasMore && lastRow ? encodeCursor(lastRow.createdAt, lastRow.id) : null

		const pageNum = filter.cursor ? null : (Number(filter.page) || 1)

		return {
			data: page.map(r => ({ ...r, metadata: redactSensitiveFields(r.metadata) })),
			total,
			page: pageNum ?? 1,
			totalPages: Math.ceil(total / limit),
			nextCursor,
		}
	}

	async get(id: string) {
		const [row] = await db.select().from(auditLogs).where(eq(auditLogs.id, id)).limit(1)
		if (!row) return null
		return {
			...row,
			beforeState: redactSensitiveFields(row.beforeState),
			afterState: redactSensitiveFields(row.afterState),
			metadata: redactSensitiveFields(row.metadata),
		}
	}

	async getSessionEvents(sessionId: string, facilityId: string) {
		const rows = await db
			.select()
			.from(auditLogs)
			.where(and(eq(auditLogs.sessionId, sessionId), eq(auditLogs.facilityId, facilityId)))
			.orderBy(auditLogs.createdAt)

		return rows.map(r => ({
			...r,
			metadata: redactSensitiveFields(r.metadata),
		}))
	}

	async emitSelfAudit(params: {
		facilityId: string
		auditorUserId: string
		action: "read"
		entityType: string
		entityId: string
		metadata: Record<string, unknown>
	}) {
		await db.insert(auditLogs).values({
			facilityId: params.facilityId,
			userId: params.auditorUserId,
			staffProfileId: null,
			action: params.action,
			entityType: params.entityType,
			entityId: params.entityId,
			beforeState: null,
			afterState: null,
			ipAddress: null,
			userAgent: null,
			metadata: params.metadata,
			severity: "info",
			outcome: "success",
		})
	}

	async export(params: {
		facilityId: string
		exporterStaffId: string
		format: "csv" | "pdf"
		filterSnapshot: Record<string, unknown>
		filter: AuditLogFilter
		auditorUserId: string
	}) {
		const { data } = await this.list({ ...params.filter, cursor: undefined, page: 1, limit: 10000 })

		const headers = ["id", "userId", "action", "entityType", "entityId", "severity", "outcome", "ipAddress", "createdAt"]
		const rows = data.map(log =>
			headers
				.map(h => {
					const val = log[h as keyof typeof log]
					return typeof val === "string" ? `"${val.replace(/"/g, '""')}"` : String(val ?? "")
				})
				.join(",")
		)
		const csvContent = [headers.join(","), ...rows].join("\n")

		const contentHash = createHash("sha256").update(csvContent).digest("hex")

		await db.insert(auditExports).values({
			facilityId: params.facilityId,
			exporterStaffId: params.exporterStaffId,
			exportFormat: params.format,
			filterSnapshot: params.filterSnapshot,
			contentHash,
		})

		await this.emitSelfAudit({
			facilityId: params.facilityId,
			auditorUserId: params.auditorUserId,
			action: "read",
			entityType: "audit_log_export",
			entityId: contentHash,
			metadata: { format: params.format, rowCount: data.length, contentHash },
		})

		return { contentHash, rowCount: data.length }
	}

	async resolveStaffProfile(facilityId: string, userId: string) {
		const [row] = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(and(eq(staffProfiles.userId, userId), eq(staffProfiles.facilityId, facilityId)))
			.limit(1)
		return row?.id ?? null
	}
}
