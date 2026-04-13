import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import { and, count, desc, eq } from "drizzle-orm"
import { Subject } from "rxjs"

import { notifications, staffProfiles } from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import type { V1Inputs } from "@/config/contract-types"

type NotificationListFilter = V1Inputs["notification"]["list"]

interface SendNotificationInput {
	facilityId: string
	recipientStaffId: string
	topic: "pidsr" | "news" | "pharmacy" | "break_glass" | "system" | "ed_queue"
	title: string
	body: string
	data?: unknown
}

interface SseEvent {
	id: string
	topic: string
	title: string
	body: string
	data: unknown
	createdAt: Date
}

@Injectable()
export class NotificationService {
	private readonly logger = new Logger(NotificationService.name)
	/** Map of staffProfileId → SSE subject for pushing real-time events */
	private readonly connections = new Map<string, Subject<SseEvent>>()

	/**
	 * Resolve a Better Auth userId + facilityId to the staff_profiles.id UUID.
	 */
	private async resolveStaffProfileId(userId: string, facilityId: string): Promise<string> {
		const [profile] = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(
				and(
					eq(staffProfiles.userId, userId),
					eq(staffProfiles.facilityId, facilityId)
				)
			)
			.limit(1)

		if (!profile) throw new NotFoundException(`Staff profile not found for user ${userId} at facility ${facilityId}`)
		return profile.id
	}

	/**
	 * Store a notification and dispatch via SSE if recipient is connected.
	 */
	async send(input: SendNotificationInput) {
		const [notification] = await db
			.insert(notifications)
			.values({
				facilityId: input.facilityId,
				recipientStaffId: input.recipientStaffId,
				topic: input.topic,
				title: input.title,
				body: input.body,
				data: input.data ?? null,
				isRead: false,
			})
			.returning()

		if (!notification) {
			this.logger.error("Failed to create notification")
			return
		}

		// Dispatch to SSE if connected
		const subject = this.connections.get(input.recipientStaffId)
		if (subject) {
			subject.next({
				id: notification.id,
				topic: notification.topic,
				title: notification.title,
				body: notification.body,
				data: notification.data,
				createdAt: notification.createdAt,
			})
		}

		return notification
	}

	/**
	 * Subscribe to SSE events for a specific staff member.
	 * Returns an Observable that emits notification events.
	 */
	subscribe(staffId: string): Subject<SseEvent> {
		// Clean up any existing connection
		const existing = this.connections.get(staffId)
		if (existing) {
			existing.complete()
		}

		const subject = new Subject<SseEvent>()
		this.connections.set(staffId, subject)

		this.logger.log(`SSE connection established for staff ${staffId}`)
		return subject
	}

	/**
	 * Broadcast a transient SSE event to all currently-connected staff.
	 * Does NOT persist to the database — use for live queue / workflow updates.
	 */
	broadcast(topic: string, title: string, body: string, data?: unknown) {
		const sseEvent: SseEvent = {
			id: crypto.randomUUID(),
			topic,
			title,
			body,
			data: data ?? null,
			createdAt: new Date(),
		}
		this.connections.forEach(subject => subject.next(sseEvent))
		this.logger.log(`SSE broadcast on topic '${topic}' to ${this.connections.size} connections`)
	}

	/**
	 * Remove an SSE connection when the client disconnects.
	 */
	unsubscribe(staffId: string) {
		const subject = this.connections.get(staffId)
		if (subject) {
			subject.complete()
			this.connections.delete(staffId)
			this.logger.log(`SSE connection closed for staff ${staffId}`)
		}
	}

	/**
	 * List notifications for a staff member with filtering and pagination.
	 */
	async findAll(userId: string, filter: NotificationListFilter) {
		const { facilityId, topic } = filter
		const isRead = filter.isRead === undefined ? undefined : Boolean(filter.isRead)
		const page = Number(filter.page) || 1
		const limit = Number(filter.limit) || 50

		const staffProfileId = await this.resolveStaffProfileId(userId, facilityId)

		const conditions = [
			eq(notifications.facilityId, facilityId),
			eq(notifications.recipientStaffId, staffProfileId),
		]

		if (isRead !== undefined) {
			conditions.push(eq(notifications.isRead, isRead))
		}
		if (topic) {
			conditions.push(eq(notifications.topic, topic))
		}

		const whereClause = and(...conditions)
		const offset = (page - 1) * limit

		const [data, totalResult, unreadResult] = await Promise.all([
			db
				.select()
				.from(notifications)
				.where(whereClause)
				.orderBy(desc(notifications.createdAt))
				.limit(limit)
				.offset(offset),
			db
				.select({ count: count() })
				.from(notifications)
				.where(whereClause),
			db
				.select({ count: count() })
				.from(notifications)
				.where(
					and(
						eq(notifications.facilityId, facilityId),
						eq(notifications.recipientStaffId, staffProfileId),
						eq(notifications.isRead, false)
					)
				),
		])

		const total = Number(totalResult[0]?.count ?? 0)
		const unreadCount = Number(unreadResult[0]?.count ?? 0)

		return {
			data,
			total,
			unreadCount,
			page,
			limit,
		}
	}

	/**
	 * Get a single notification.
	 */
	async findOne(id: string) {
		const [notification] = await db
			.select()
			.from(notifications)
			.where(eq(notifications.id, id))

		if (!notification) throw new NotFoundException(`Notification ${id} not found`)
		return notification
	}

	/**
	 * Get unread count for a staff member.
	 */
	async getUnreadCount(userId: string, facilityId: string) {
		const staffProfileId = await this.resolveStaffProfileId(userId, facilityId)

		const [result] = await db
			.select({ count: count() })
			.from(notifications)
			.where(
				and(
					eq(notifications.facilityId, facilityId),
					eq(notifications.recipientStaffId, staffProfileId),
					eq(notifications.isRead, false)
				)
			)

		return { count: Number(result?.count ?? 0) }
	}

	/**
	 * Mark a single notification as read.
	 */
	async markRead(id: string) {
		const [notification] = await db
			.update(notifications)
			.set({ isRead: true })
			.where(eq(notifications.id, id))
			.returning()

		if (!notification) throw new NotFoundException(`Notification ${id} not found`)
		return notification
	}

	/**
	 * Mark all notifications as read for a staff member.
	 */
	async markAllRead(userId: string, facilityId: string) {
		const staffProfileId = await this.resolveStaffProfileId(userId, facilityId)

		await db
			.update(notifications)
			.set({ isRead: true })
			.where(
				and(
					eq(notifications.facilityId, facilityId),
					eq(notifications.recipientStaffId, staffProfileId),
					eq(notifications.isRead, false)
				)
			)

		return { count: 0 }
	}
}
