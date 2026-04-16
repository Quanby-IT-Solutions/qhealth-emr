import { z } from "zod"

// ============================================================================
// Enums
// ============================================================================

export const NotificationTopicEnum = z.enum([
	"pidsr",
	"news",
	"pharmacy",
	"break_glass",
	"system",
	"ed_queue",
	"sla_warning",
	"sla_exceeded",
])

// ============================================================================
// Timestamp helper
// ============================================================================

const dateOrString = z
	.union([z.date(), z.string()])
	.transform(v => (typeof v === "string" ? new Date(v) : v))

// ============================================================================
// Notification
// ============================================================================

export const NotificationSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	recipientStaffId: z.string().uuid(),
	topic: NotificationTopicEnum,
	title: z.string(),
	body: z.string(),
	data: z.unknown().nullable(),
	isRead: z.boolean(),
	createdAt: dateOrString,
})

export type Notification = z.infer<typeof NotificationSchema>

export const NotificationListFilterSchema = z.object({
	facilityId: z.string().uuid(),
	isRead: z
		.union([z.boolean(), z.string().transform(v => v === "true")])
		.optional(),
	topic: NotificationTopicEnum.optional(),
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
})

export const NotificationListResponseSchema = z.object({
	data: z.array(NotificationSchema),
	total: z.number(),
	unreadCount: z.number(),
	page: z.number(),
	limit: z.number(),
})

export const NotificationIdSchema = z.object({ id: z.string().uuid() })

export const MarkNotificationReadSchema = z.object({
	id: z.string().uuid(),
})

export const MarkAllNotificationsReadSchema = z.object({
	facilityId: z.string().uuid(),
})

export const UnreadCountSchema = z.object({
	facilityId: z.string().uuid(),
})

export const UnreadCountResponseSchema = z.object({
	count: z.number(),
})

// ============================================================================
// SSE Event Types (for frontend typing, not used in oRPC contract)
// ============================================================================

export const SseNotificationEventSchema = z.object({
	id: z.string().uuid(),
	topic: NotificationTopicEnum,
	title: z.string(),
	body: z.string(),
	data: z.unknown().nullable(),
	createdAt: dateOrString,
})

export type SseNotificationEvent = z.infer<typeof SseNotificationEventSchema>
