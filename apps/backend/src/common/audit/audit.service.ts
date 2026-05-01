import { Injectable, Logger } from "@nestjs/common"

import { auditLogs } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

export type DBTransaction = Parameters<Parameters<typeof db["transaction"]>[0]>[0]

export interface AuditLogEntry {
	facilityId: string
	userId: string
	staffProfileId: string | null
	action: "create" | "read" | "update" | "delete" | "sign" | "verify" | "override"
	entityType: string
	entityId: string
	beforeState: Record<string, unknown> | null
	afterState: Record<string, unknown> | null
	ipAddress: string | null
	userAgent: string | null
	metadata: Record<string, unknown> | null
	severity?: "info" | "warning" | "critical"
	sessionId?: string | null
	outcome?: "success" | "failure"
}

@Injectable()
export class CommonAuditService {
	private readonly logger = new Logger(CommonAuditService.name)

	/**
	 * Write an immutable audit log entry. Called by feature services and the
	 * @Audited() decorator. Pass a Drizzle transaction handle via `options.tx`
	 * to make the row participate in the caller's transaction.
	 */
	async log(entry: AuditLogEntry, options?: { tx?: DBTransaction }) {
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
					severity: entry.severity ?? "info",
					sessionId: entry.sessionId ?? null,
					outcome: entry.outcome ?? "success",
				})
				.returning()
			return created
		} catch (error) {
			this.logger.error(`Failed to write audit log: ${error}`)
			throw error
		}
	}
}
