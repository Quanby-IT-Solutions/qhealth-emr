import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
	Logger,
	SetMetadata,
	UnauthorizedException,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { sql } from "drizzle-orm"
import type { UserSession } from "@thallesp/nestjs-better-auth"
import { fromNodeHeaders } from "better-auth/node"

import { getAuth } from "@repo/auth"

import { db } from "@/common/database/database.client"
import type { V1Outputs } from "@/config/contract-types"

import { RbacService } from "./rbac.service"

// ============================================================================
// Decorator: RequirePermission
// ============================================================================

/** Metadata key used by RequirePermission decorator. */
export const RBAC_PERMISSION_KEY = "rbac"

type PermissionEntry = NonNullable<V1Outputs["rbac"]["me"]["activeRole"]>["permissions"][number]

/** Require a specific RBAC module+action on a controller or handler. */
export const RequirePermission = (
	module: PermissionEntry["module"],
	action: PermissionEntry["action"]
) =>
	SetMetadata(RBAC_PERMISSION_KEY, { module, action })

// ============================================================================
// Guard
// ============================================================================

@Injectable()
export class RbacGuard implements CanActivate {
	private readonly logger = new Logger(RbacGuard.name)

	constructor(
		private readonly reflector: Reflector,
		private readonly rbacService: RbacService
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest()

		// Allow CORS preflight (OPTIONS) requests to pass through without auth
		// so the browser can complete the CORS handshake before sending the actual request
		if (request.method === "OPTIONS") {
			return true
		}

		// Routes decorated with @AllowAnonymous() use key "PUBLIC" (nestjs-better-auth)
		const isPublic = this.reflector.getAllAndOverride<boolean>("PUBLIC", [
			context.getHandler(),
			context.getClass(),
		])
		if (isPublic) return true

		// Try to get session from request (may be attached by library middleware)
		let session = request.session as UserSession | undefined

		// If session not attached, fetch it directly from Better Auth
		if (!session?.user?.id) {
			try {
				const auth = getAuth()
				const authSession = await auth.api.getSession({
					headers: fromNodeHeaders(request.headers),
				})
				if (authSession?.session && authSession?.user) {
					session = {
						session: authSession.session,
						user: authSession.user,
					} as UserSession
					// Attach to request for downstream use
					request.session = session
				}
			} catch (err) {
				this.logger.debug("Failed to fetch session from Better Auth", err)
			}
		}

		if (!session?.user?.id) {
			throw new UnauthorizedException("Authentication required")
		}

		const userId = session.user.id

		// Fetch the user's RBAC profile (active role + permissions)
		const profile = await this.rbacService.getMyProfile(userId)

		// Attach profile to the request so controllers can read it downstream
		request.rbacProfile = profile

		// Set PostgreSQL RLS session variable for facility isolation (session-scoped).
		// Using is_local=false so the setting persists for the entire database connection
		// and is visible to all subsequent queries in this request.
		if (profile.activeRole) {
			const activeProfile = profile.staffProfiles.find(p =>
				p.roles.some(r => r.id === profile.activeRole!.id)
			)
			if (activeProfile?.facilityId) {
				try {
					await db.execute(
						sql`SELECT set_config('app.current_facility_id', ${activeProfile.facilityId}, false)`
					)
				} catch (err) {
					this.logger.warn("Failed to set facility RLS context", err)
				}
			}
		}

		// Check route-level permission metadata
		const required = this.reflector.getAllAndOverride<
			{ module: PermissionEntry["module"]; action: PermissionEntry["action"] } | undefined
		>(RBAC_PERMISSION_KEY, [context.getHandler(), context.getClass()])

		// Reject deactivated accounts on permission-protected routes
		if (required && profile.staffProfiles.length === 0) {
			throw new ForbiddenException("Account is deactivated")
		}

		if (!required) {
			// No permission metadata — authenticated access is sufficient
			return true
		}

		const hasPermission =
			profile.activeRole?.permissions.some(
				p => p.module === required.module && p.action === required.action
			) ?? false

		if (!hasPermission) {
			this.logger.warn(
				`User ${userId} missing permission ${required.module}:${required.action}`
			)
			throw new ForbiddenException("Insufficient permissions")
		}

		return true
	}
}
