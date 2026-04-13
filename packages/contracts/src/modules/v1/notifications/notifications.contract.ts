import { oc } from "@orpc/contract"

import {
	MarkAllNotificationsReadSchema,
	MarkNotificationReadSchema,
	NotificationIdSchema,
	NotificationListFilterSchema,
	NotificationListResponseSchema,
	NotificationSchema,
	UnreadCountResponseSchema,
	UnreadCountSchema,
} from "./notifications.schema.js"

export const notificationContract = {
	list: oc
		.route({
			method: "GET",
			path: "/notifications",
			summary: "List notifications for the current user",
			tags: ["Notifications"],
		})
		.input(NotificationListFilterSchema)
		.output(NotificationListResponseSchema),

	get: oc
		.route({
			method: "GET",
			path: "/notifications/{id}",
			summary: "Get a single notification",
			tags: ["Notifications"],
		})
		.input(NotificationIdSchema)
		.output(NotificationSchema),

	unreadCount: oc
		.route({
			method: "GET",
			path: "/notifications/unread-count",
			summary: "Get unread notification count",
			tags: ["Notifications"],
		})
		.input(UnreadCountSchema)
		.output(UnreadCountResponseSchema),

	markRead: oc
		.route({
			method: "PUT",
			path: "/notifications/{id}/read",
			summary: "Mark a notification as read",
			tags: ["Notifications"],
		})
		.input(MarkNotificationReadSchema)
		.output(NotificationSchema),

	markAllRead: oc
		.route({
			method: "PUT",
			path: "/notifications/read-all",
			summary: "Mark all notifications as read",
			tags: ["Notifications"],
		})
		.input(MarkAllNotificationsReadSchema)
		.output(UnreadCountResponseSchema),
}
