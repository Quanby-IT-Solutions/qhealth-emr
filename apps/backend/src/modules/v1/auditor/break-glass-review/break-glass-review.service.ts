import { Injectable, NotFoundException } from "@nestjs/common"
import { and, desc, eq, gte, lt, lte, or, sql } from "drizzle-orm"

import { auditLogs, breakGlassEvents, breakGlassReviews, staffProfiles } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

const SLA_HOURS = 24

interface InboxFilter {
	facilityId: string
	status?: string
	clinicianId?: string
	dateFrom?: string
	dateTo?: string
	slaBreached?: boolean
	page?: number
	limit?: number
}

interface ReviewInput {
	eventId: string
	reviewerStaffId: string
	auditorUserId: string
	action: "approve" | "flag" | "note"
	reason: string
}

@Injectable()
export class BreakGlassReviewService {
	async inbox(filter: InboxFilter) {
		const page = Number(filter.page) || 1
		const limit = Number(filter.limit) || 50
		const offset = (page - 1) * limit

		const conditions = [eq(breakGlassEvents.facilityId, filter.facilityId)]

		if (filter.status) {
			conditions.push(eq(breakGlassEvents.reviewStatus, filter.status as never))
		}
		if (filter.clinicianId) {
			conditions.push(eq(breakGlassEvents.clinicianStaffId, filter.clinicianId))
		}
		if (filter.dateFrom) {
			conditions.push(gte(breakGlassEvents.createdAt, new Date(filter.dateFrom)))
		}
		if (filter.dateTo) {
			conditions.push(lte(breakGlassEvents.createdAt, new Date(filter.dateTo)))
		}
		if (filter.slaBreached) {
			const slaThreshold = new Date(Date.now() - SLA_HOURS * 60 * 60 * 1000)
			conditions.push(
				and(
					eq(breakGlassEvents.reviewStatus, "pending"),
					lt(breakGlassEvents.accessExpiresAt, slaThreshold)
				)!
			)
		}

		const where = and(...conditions)

		const [rows, countRows] = await Promise.all([
			db
				.select()
				.from(breakGlassEvents)
				.where(where)
				.orderBy(desc(breakGlassEvents.createdAt))
				.limit(limit)
				.offset(offset),
			db
				.select({ total: sql<number>`count(*)::int` })
				.from(breakGlassEvents)
				.where(where),
		])

		const total = countRows[0]?.total ?? 0

		return { data: rows, total, page, totalPages: Math.ceil(total / limit) }
	}

	async getEvent(eventId: string) {
		const [event] = await db
			.select()
			.from(breakGlassEvents)
			.where(eq(breakGlassEvents.id, eventId))
			.limit(1)

		if (!event) throw new NotFoundException("Break-glass event not found")
		return event
	}

	async approve(input: ReviewInput) {
		return this.writeReview({ ...input, action: "approve" })
	}

	async flag(input: ReviewInput) {
		return this.writeReview({ ...input, action: "flag" })
	}

	async addNote(input: ReviewInput) {
		return this.writeReview({ ...input, action: "note" })
	}

	async historyByClinician(params: { facilityId: string; clinicianId: string }) {
		const rows = await db
			.select()
			.from(breakGlassEvents)
			.where(
				and(
					eq(breakGlassEvents.facilityId, params.facilityId),
					eq(breakGlassEvents.clinicianStaffId, params.clinicianId)
				)
			)
			.orderBy(desc(breakGlassEvents.createdAt))
			.limit(25)

		return {
			clinicianId: params.clinicianId,
			total: rows.length,
			recent: rows,
		}
	}

	async resolveStaffProfile(facilityId: string, userId: string) {
		const [row] = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(and(eq(staffProfiles.userId, userId), eq(staffProfiles.facilityId, facilityId)))
			.limit(1)
		return row?.id ?? null
	}

	private async writeReview(input: ReviewInput) {
		const event = await this.getEvent(input.eventId)

		// Insert immutable review row
		const [review] = await db
			.insert(breakGlassReviews)
			.values({
				breakGlassEventId: input.eventId,
				reviewerStaffId: input.reviewerStaffId,
				action: input.action,
				reason: input.reason,
			})
			.returning()

		if (!review) throw new Error("Failed to write review row")

		// Update latest review status on the event (approve/flag only, not note)
		if (input.action === "approve" || input.action === "flag") {
			await db
				.update(breakGlassEvents)
				.set({
					reviewStatus: input.action === "approve" ? "appropriate" : "flagged",
					reviewedByStaffId: input.reviewerStaffId,
					reviewedAt: new Date(),
					reviewNotes: input.reason,
				})
				.where(eq(breakGlassEvents.id, input.eventId))
		}

		// Emit self-audit row for the review action
		await db.insert(auditLogs).values({
			facilityId: event.facilityId,
			userId: input.auditorUserId,
			staffProfileId: input.reviewerStaffId,
			action: "update",
			entityType: "break_glass_review",
			entityId: review.id,
			beforeState: null,
			afterState: { action: input.action, reason: input.reason } as Record<string, unknown>,
			ipAddress: null,
			userAgent: null,
			metadata: { breakGlassEventId: input.eventId, reviewAction: input.action },
			severity: input.action === "flag" ? "warning" : "info",
			outcome: "success",
		})

		return review
	}
}
