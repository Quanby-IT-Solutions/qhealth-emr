import { Controller, Req, Res, Sse } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"
import type { Request, Response } from "express"
import { map, Observable } from "rxjs"

import { v1 } from "@/config/api-versions.config"
import { env } from "@/config/env.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { NotificationService } from "./notification.service"

interface MessageEvent {
	data: string | object
	id?: string
	type?: string
	retry?: number
}

@Controller()
export class NotificationController {
	constructor(private readonly notificationService: NotificationService) {}

	// ===========================================================================
	// SSE Stream — not an oRPC endpoint, registered directly as GET
	// ===========================================================================

	@RequirePermission("notifications", "view")
	@Sse("v1/notification/stream")
	stream(@Req() req: Request, @Res({ passthrough: true }) res: Response): Observable<MessageEvent> {
		// Set CORS headers explicitly for SSE streams (NestJS CORS middleware
		// may not propagate headers to streaming responses)
		const origin = req.headers.origin
		const allowedOrigins = env.CORS_ORIGINS.split(",").map(o => o.trim())
		if (origin && allowedOrigins.includes(origin)) {
			res.setHeader("Access-Control-Allow-Origin", origin)
			res.setHeader("Access-Control-Allow-Credentials", "true")
		}

		// The RbacGuard attaches the full RBAC profile to the request.
		// Use the active staff profile's UUID so the SSE connection key matches
		// the recipientStaffId used in send() — enabling real-time delivery.
		const rbacProfile = (req as unknown as Record<string, unknown>).rbacProfile as
			| {
					staffProfiles: Array<{ id: string; facilityId: string; roles: Array<{ id: string }> }>
					activeRole: { id: string } | null
			  }
			| undefined

		const activeProfile =
			rbacProfile?.staffProfiles?.find(p =>
				p.roles.some(r => r.id === rbacProfile?.activeRole?.id)
			) ?? rbacProfile?.staffProfiles?.[0]

		const staffProfileId = activeProfile?.id
		if (!staffProfileId) {
			throw new Error("No active staff profile found for SSE subscription")
		}

		const subject = this.notificationService.subscribe(staffProfileId)

		// Clean up on disconnect
		req.on("close", () => {
			this.notificationService.unsubscribe(staffProfileId)
		})

		return subject.pipe(
			map(event => ({
				data: JSON.stringify(event),
				id: event.id,
				type: event.topic,
			}))
		)
	}

	// ===========================================================================
	// oRPC Notification Endpoints
	// ===========================================================================

	@RequirePermission("notifications", "view")
	@Implement(v1.notification.list)
	async listNotifications(
		@Session()
		session: UserSession
	) {
		return implement(v1.notification.list).handler(async ({ input }) => {
			// TODO: Resolve staffProfileId from session.user.id + facilityId via RBAC
			return this.notificationService.findAll(session.user.id, input)
		})
	}

	// IMPORTANT: unreadCount must be declared BEFORE get so that the literal
	// path "/notifications/unread-count" is registered before the parameterized
	// path "/notifications/:id", which would otherwise greedily match it.
	@RequirePermission("notifications", "view")
	@Implement(v1.notification.unreadCount)
	async unreadCount(
		@Session()
		session: UserSession
	) {
		return implement(v1.notification.unreadCount).handler(async ({ input }) => {
			return this.notificationService.getUnreadCount(session.user.id, input.facilityId)
		})
	}

	@RequirePermission("notifications", "view")
	@Implement(v1.notification.get)
	async getNotification() {
		return implement(v1.notification.get).handler(async ({ input }) => {
			return this.notificationService.findOne(input.id)
		})
	}

	@RequirePermission("notifications", "view")
	@Implement(v1.notification.markRead)
	async markRead() {
		return implement(v1.notification.markRead).handler(async ({ input }) => {
			return this.notificationService.markRead(input.id)
		})
	}

	@RequirePermission("notifications", "view")
	@Implement(v1.notification.markAllRead)
	async markAllRead(
		@Session()
		session: UserSession
	) {
		return implement(v1.notification.markAllRead).handler(async ({ input }) => {
			return this.notificationService.markAllRead(session.user.id, input.facilityId)
		})
	}
}
