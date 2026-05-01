import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common"
import { AuthService } from "@thallesp/nestjs-better-auth"
import { and, count, eq, ilike, inArray, or } from "drizzle-orm"

import {
	facilities,
	rolePermissions,
	roles,
	sessions,
	staffProfiles,
	userRoles,
	users,
} from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import { AuditService, type DBTransaction } from "@/modules/v1/audit/audit.service"
import type { V1Outputs } from "@/config/contract-types"

interface ListStaffInput {
	facilityId?: string
	search?: string
	isActive?: boolean
	page: number
	limit: number
}

interface CreateStaffInput {
	name: string
	email: string
	password: string
	facilityId: string
	department?: string
	employeeNumber?: string
	roleIds?: string[]
}

interface UpdateStaffInput {
	id: string
	department?: string
	employeeNumber?: string
	prcLicenseNumber?: string
	prcExpiry?: string
	ptrNumber?: string
	ptrExpiry?: string
	pdeaS2License?: string
	pdeaS2Expiry?: string
}

interface IdInput {
	id: string
}

interface ListRolesInput {
	facilityId: string
}

interface CreateRoleInput {
	facilityId: string
	name: string
	description?: string
}

interface UpdateRoleInput {
	id: string
	name?: string
	description?: string
}

interface UpdateRolePermissionsInput {
	id: string
	permissions: Array<{ module: PermissionEntry["module"]; action: PermissionEntry["action"] }>
}

interface AssignUserRolesInput {
	id: string
	roleIds: string[]
	primaryRoleId?: string
}

interface ResetPasswordInput {
	userId: string
}

interface ActorContext {
	userId: string
	staffProfileId: string | null
	facilityId: string
	ipAddress: string | null
	userAgent: string | null
}

interface FacilityMembershipEntry {
	facilityId: string
	roleIds: string[]
	isPrimary: boolean
}

interface CreateUserWithFacilitiesInput {
	name: string
	email: string
	password: string
	employeeNumber?: string
	prcLicenseNumber?: string
	prcExpiry?: string
	ptrNumber?: string
	ptrExpiry?: string
	pdeaS2License?: string
	pdeaS2Expiry?: string
	facilities: FacilityMembershipEntry[]
}

interface ReEnableUserInput {
	staffProfileId: string
}

interface AddFacilityMembershipInput {
	userId: string
	facilityId: string
	roleIds: string[]
	isPrimary: boolean
}

interface RemoveFacilityMembershipInput {
	staffProfileId: string
}

interface AddRoleAssignmentInput {
	staffProfileId: string
	roleId: string
}

interface RemoveRoleAssignmentInput {
	staffProfileId: string
	roleId: string
}

type MyProfileResponse = V1Outputs["rbac"]["me"]
type PermissionEntry = MyProfileResponse["activeRole"] extends infer T
	? T extends { permissions: infer P }
		? P extends Array<infer E>
			? E
			: never
		: never
	: never

@Injectable()
export class RbacService {
	private readonly logger = new Logger(RbacService.name)

	constructor(
		private readonly authService: AuthService,
		private readonly auditService: AuditService,
	) {}

	async getMyProfile(userId: string, overrideRoleId?: string) {
		// 1. Get user info
		const [user] = await db
			.select({ id: users.id, name: users.name, email: users.email })
			.from(users)
			.where(eq(users.id, userId))

		if (!user) throw new NotFoundException("User not found")

		// 2. Get active staff profiles for the user (filter inactive profiles)
		const profileRows = await db
			.select()
			.from(staffProfiles)
			.where(and(eq(staffProfiles.userId, userId), eq(staffProfiles.isActive, true)))

		// 3. Batch-fetch roles and facilities for all profiles in two queries
		type RoleRow = { id: string; name: string; isPrimary: boolean; staffProfileId: string }
		let allRoleRows: RoleRow[] = []
		let allFacilityRows: { id: string; name: string; facilityType: "community" | "district" | "tertiary" }[] = []

		if (profileRows.length > 0) {
			const profileIds = profileRows.map(p => p.id)
			const facilityIds = profileRows.map(p => p.facilityId)

			allRoleRows = await db
				.select({
					id: roles.id,
					name: roles.name,
					isPrimary: userRoles.isPrimary,
					staffProfileId: userRoles.staffProfileId,
				})
				.from(userRoles)
				.innerJoin(roles, eq(userRoles.roleId, roles.id))
				.where(inArray(userRoles.staffProfileId, profileIds))

			allFacilityRows = await db
				.select({ id: facilities.id, name: facilities.name, facilityType: facilities.facilityType })
				.from(facilities)
				.where(inArray(facilities.id, facilityIds))
		}

		const rolesByProfileId = new Map<string, Array<{ id: string; name: string; isPrimary: boolean }>>()
		for (const row of allRoleRows) {
			const list = rolesByProfileId.get(row.staffProfileId) ?? []
			list.push({ id: row.id, name: row.name, isPrimary: row.isPrimary })
			rolesByProfileId.set(row.staffProfileId, list)
		}
		const facilitiesById = new Map(allFacilityRows.map(f => [f.id, f]))

		const profilesWithRoles = profileRows.map(p => ({
			...p,
			roles: rolesByProfileId.get(p.id) ?? [],
			facility: facilitiesById.get(p.facilityId)!,
		}))

		// 4. Determine active role
		let activeRole: MyProfileResponse["activeRole"] = null
		const allRoles = profilesWithRoles.flatMap(p => p.roles)

		if (allRoles.length > 0) {
			let selectedRole: (typeof allRoles)[number] | undefined

			if (overrideRoleId) {
				selectedRole = allRoles.find(r => r.id === overrideRoleId)
			}
			if (!selectedRole) {
				selectedRole = allRoles.find(r => r.isPrimary) ?? allRoles[0]
			}

			if (selectedRole) {
				const permRows = await db
					.select({ module: rolePermissions.module, action: rolePermissions.action })
					.from(rolePermissions)
					.where(eq(rolePermissions.roleId, selectedRole.id))

				activeRole = {
					id: selectedRole.id,
					name: selectedRole.name,
					permissions: permRows as PermissionEntry[],
				}
			}
		}

		return { user, staffProfiles: profilesWithRoles, activeRole }
	}

	async switchRole(userId: string, roleId: string) {
		// Validate the user actually has this role assigned
		const allUserRoles = await db
			.select({ roleId: userRoles.roleId })
			.from(userRoles)
			.innerJoin(staffProfiles, eq(userRoles.staffProfileId, staffProfiles.id))
			.where(eq(staffProfiles.userId, userId))

		const hasRole = allUserRoles.some(ur => ur.roleId === roleId)
		if (!hasRole) {
			throw new ForbiddenException("Role not assigned to this user")
		}

		// Persist selection atomically: clear all primary flags, then set the chosen one
		const profileIds = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(eq(staffProfiles.userId, userId))

		if (profileIds.length > 0) {
			const ids = profileIds.map(p => p.id)
			await db.transaction(async tx => {
				await tx
					.update(userRoles)
					.set({ isPrimary: false })
					.where(inArray(userRoles.staffProfileId, ids))
				await tx
					.update(userRoles)
					.set({ isPrimary: true })
					.where(and(eq(userRoles.roleId, roleId), inArray(userRoles.staffProfileId, ids)))
			})
		}

		return this.getMyProfile(userId)
	}

	// ── Staff Management ────────────────────────────────────────────────────

	async listStaff(input: ListStaffInput) {
		const { facilityId, search, isActive, page, limit } = input
		const offset = (page - 1) * limit

		// Build filter conditions
		const conditions = [facilityId ? eq(staffProfiles.facilityId, facilityId) : undefined]
		if (typeof isActive === "boolean") {
			conditions.push(eq(staffProfiles.isActive, isActive))
		}

		// get distinct user IDs for the filtered profiles
		const profileQuery = db
			.selectDistinct({ userId: staffProfiles.userId })
			.from(staffProfiles)
			.where(and(...conditions.filter(Boolean)))

		const userConditions = [inArray(users.id, profileQuery)]
		if (search) {
			userConditions.push(
				or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`))!
			)
		}

		const totalRows = await db
			.select({ total: count() })
			.from(users)
			.where(and(...userConditions))
		const total = totalRows[0]?.total ?? 0

		const userRows = await db
			.select({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt })
			.from(users)
			.where(and(...userConditions))
			.limit(limit)
			.offset(offset)

		if (userRows.length === 0) return { data: [], total, page, limit }

		const userIds = userRows.map(u => u.id)

		// Batch-fetch all matching profiles for this page of users
		const allProfiles = await db
			.select()
			.from(staffProfiles)
			.where(and(inArray(staffProfiles.userId, userIds), ...conditions.filter(Boolean)))

		const profileIds = allProfiles.map(p => p.id)

		// Batch-fetch all roles for those profiles
		type ProfileRoleRow = { id: string; name: string; isPrimary: boolean; staffProfileId: string }
		let allRoleRows: ProfileRoleRow[] = []
		if (profileIds.length > 0) {
			allRoleRows = await db
				.select({
					id: roles.id,
					name: roles.name,
					isPrimary: userRoles.isPrimary,
					staffProfileId: userRoles.staffProfileId,
				})
				.from(userRoles)
				.innerJoin(roles, eq(userRoles.roleId, roles.id))
				.where(inArray(userRoles.staffProfileId, profileIds))
		}

		const rolesByProfileId = new Map<string, Array<{ id: string; name: string; isPrimary: boolean }>>()
		for (const row of allRoleRows) {
			const list = rolesByProfileId.get(row.staffProfileId) ?? []
			list.push({ id: row.id, name: row.name, isPrimary: row.isPrimary })
			rolesByProfileId.set(row.staffProfileId, list)
		}

		const profilesByUserId = new Map<string, typeof allProfiles>()
		for (const p of allProfiles) {
			const list = profilesByUserId.get(p.userId) ?? []
			list.push(p)
			profilesByUserId.set(p.userId, list)
		}

		const data = userRows.map(u => ({
			...u,
			staffProfiles: (profilesByUserId.get(u.id) ?? []).map(p => ({
				...p,
				roles: rolesByProfileId.get(p.id) ?? [],
			})),
		}))

		return { data, total, page, limit }
	}

	async createStaff(input: CreateStaffInput) {
		const { name, email, password, facilityId, department, employeeNumber, roleIds } = input

		// 1. Create the user via Better Auth (external call — cannot participate in DB transaction)
		const ctx = await this.authService.api.signUpEmail({
			body: { name, email, password },
		})
		if (!ctx?.user) {
			throw new Error("Failed to create user account")
		}
		const userId = ctx.user.id

		// 2 & 3. Create staff profile and assign roles atomically
		try {
			return await db.transaction(async tx => {
				const [profile] = await tx
					.insert(staffProfiles)
					.values({
						userId,
						facilityId,
						department: department ?? null,
						employeeNumber: employeeNumber ?? null,
					})
					.returning()
				if (!profile) throw new Error("Failed to create staff profile")

				if (roleIds && roleIds.length > 0) {
					await tx.insert(userRoles).values(
						roleIds.map((roleId, idx) => ({
							staffProfileId: profile.id,
							roleId,
							isPrimary: idx === 0,
						}))
					)
				}

				this.logger.log(`audit.staff.create userId=${userId} facilityId=${facilityId}`)
				return { userId, staffProfileId: profile.id }
			})
		} catch (err) {
			// DB transaction failed — the Better Auth user was already created.
			// Log the orphaned user ID so it can be cleaned up manually.
			this.logger.error(
				`DB setup failed after Better Auth user creation. Orphaned userId=${userId}`,
				err
			)
			throw err
		}
	}

	async updateStaff(input: UpdateStaffInput) {
		const { id, ...updates } = input

		const [updated] = await db
			.update(staffProfiles)
			.set({ ...updates, updatedAt: new Date() })
			.where(eq(staffProfiles.id, id))
			.returning()

		if (!updated) throw new NotFoundException("Staff profile not found")
		this.logger.log(`audit.staff.update staffProfileId=${id}`)
		return updated
	}

	async deactivateStaff(input: IdInput) {
		const [updated] = await db
			.update(staffProfiles)
			.set({ isActive: false, updatedAt: new Date() })
			.where(eq(staffProfiles.id, input.id))
			.returning()

		if (!updated) throw new NotFoundException("Staff profile not found")
		this.logger.log(`audit.staff.deactivate staffProfileId=${input.id}`)
		return { success: true }
	}

	async getStaffUser(input: IdInput) {
		const [user] = await db
			.select({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt })
			.from(users)
			.where(eq(users.id, input.id))

		if (!user) throw new NotFoundException("User not found")

		const profileRows = await db
			.select()
			.from(staffProfiles)
			.where(eq(staffProfiles.userId, input.id))

		let staffProfilesWithRoles: Array<(typeof profileRows)[number] & { roles: Array<{ id: string; name: string; isPrimary: boolean }> }> = []

		if (profileRows.length > 0) {
			const profileIds = profileRows.map(p => p.id)
			const roleRows = await db
				.select({ id: roles.id, name: roles.name, isPrimary: userRoles.isPrimary, staffProfileId: userRoles.staffProfileId })
				.from(userRoles)
				.innerJoin(roles, eq(userRoles.roleId, roles.id))
				.where(inArray(userRoles.staffProfileId, profileIds))

			const rolesByProfileId = new Map<string, Array<{ id: string; name: string; isPrimary: boolean }>>()
			for (const row of roleRows) {
				const list = rolesByProfileId.get(row.staffProfileId) ?? []
				list.push({ id: row.id, name: row.name, isPrimary: row.isPrimary })
				rolesByProfileId.set(row.staffProfileId, list)
			}
			staffProfilesWithRoles = profileRows.map(p => ({ ...p, roles: rolesByProfileId.get(p.id) ?? [] }))
		}

		return { user, staffProfiles: staffProfilesWithRoles }
	}

	// ── Role Management ─────────────────────────────────────────────────────

	async listRoles(input: ListRolesInput) {
		const roleRows = await db
			.select()
			.from(roles)
			.where(and(eq(roles.facilityId, input.facilityId), eq(roles.isArchived, false)))

		if (roleRows.length === 0) return []

		const roleIds = roleRows.map(r => r.id)
		const allPerms = await db
			.select()
			.from(rolePermissions)
			.where(inArray(rolePermissions.roleId, roleIds))

		const permsByRoleId = new Map<string, typeof allPerms>()
		for (const perm of allPerms) {
			const list = permsByRoleId.get(perm.roleId) ?? []
			list.push(perm)
			permsByRoleId.set(perm.roleId, list)
		}

		return roleRows.map(role => ({ ...role, permissions: permsByRoleId.get(role.id) ?? [] }))
	}

	async createRole(input: CreateRoleInput) {
		const [role] = await db
			.insert(roles)
			.values({
				facilityId: input.facilityId,
				name: input.name,
				description: input.description ?? null,
			})
			.returning()

		if (!role) throw new Error("Failed to create role")
		this.logger.log(`audit.role.create roleId=${role.id} facilityId=${input.facilityId}`)
		return role
	}

	async updateRole(input: UpdateRoleInput) {
		const { id, ...updates } = input

		const [existing] = await db.select().from(roles).where(eq(roles.id, id))
		if (!existing) throw new NotFoundException("Role not found")

		if (existing.isSystemDefault) {
			throw new ForbiddenException("Cannot modify a system default role")
		}

		const [updated] = await db
			.update(roles)
			.set(updates)
			.where(eq(roles.id, id))
			.returning()

		if (!updated) throw new NotFoundException("Role not found")
		return updated
	}

	async updateRolePermissions(input: UpdateRolePermissionsInput) {
		const { id, permissions } = input

		const [role] = await db.select().from(roles).where(eq(roles.id, id))
		if (!role) throw new NotFoundException("Role not found")

		// Self-protection: system default roles must retain critical admin permissions
		if (role.isSystemDefault) {
			const CRITICAL: Array<{ module: PermissionEntry["module"]; action: PermissionEntry["action"] }> = [
				{ module: "admin", action: "view" },
				{ module: "admin", action: "edit" },
				{ module: "admin", action: "create" },
			]
			const missingCritical = CRITICAL.some(
				c => !permissions.some(p => p.module === c.module && p.action === c.action)
			)
			if (missingCritical) {
				throw new ForbiddenException(
					"Cannot remove critical permissions from a system default role"
				)
			}
		}

		// Replace the entire permission matrix atomically
		const newPerms = await db.transaction(async tx => {
			await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, id))

			if (permissions.length > 0) {
				await tx.insert(rolePermissions).values(
					permissions.map(p => ({
						roleId: id,
						module: p.module,
						action: p.action,
					}))
				)
			}

			return tx
				.select()
				.from(rolePermissions)
				.where(eq(rolePermissions.roleId, id))
		})

		return { ...role, permissions: newPerms }
	}

	async archiveRole(id: string) {
		const [role] = await db.select().from(roles).where(eq(roles.id, id))
		if (!role) throw new NotFoundException("Role not found")

		if (role.isSystemDefault) {
			throw new ForbiddenException("System default roles cannot be archived")
		}

		if (role.isArchived) {
			throw new BadRequestException("Role is already archived")
		}

		// Count active users currently assigned this role
		const [assignmentRow] = await db
			.select({ assignedCount: count() })
			.from(userRoles)
			.where(eq(userRoles.roleId, id))

		const assignedUserCount = assignmentRow?.assignedCount ?? 0

		if (assignedUserCount > 0) {
			// Return conflict instead of throwing so the UI can guide remediation
			return { success: false, conflict: { assignedUserCount } }
		}

		await db
			.update(roles)
			.set({ isArchived: true, archivedAt: new Date() })
			.where(eq(roles.id, id))

		this.logger.log(`audit.role.archive roleId=${id}`)
		return { success: true }
	}

	// ── User-Role Assignment ─────────────────────────────────────────────────

	async assignUserRoles(input: AssignUserRolesInput) {
		const { id: staffProfileId, roleIds, primaryRoleId } = input

		const [profile] = await db
			.select()
			.from(staffProfiles)
			.where(eq(staffProfiles.id, staffProfileId))

		if (!profile) throw new NotFoundException("Staff profile not found")

		// Remove existing assignments for this profile
		await db.delete(userRoles).where(eq(userRoles.staffProfileId, staffProfileId))

		if (roleIds.length > 0) {
			const effectivePrimaryId = primaryRoleId ?? roleIds[0]
			await db.insert(userRoles).values(
				roleIds.map(roleId => ({
					staffProfileId,
					roleId,
					isPrimary: roleId === effectivePrimaryId,
				}))
			)
		}

		this.logger.log(`audit.user.role-change staffProfileId=${staffProfileId} roleIds=${roleIds.join(",")}`)
		return { success: true }
	}

	// ── License Status ──────────────────────────────────────────────────────

	async getLicenseStatus(input: IdInput) {
		const [profile] = await db
			.select()
			.from(staffProfiles)
			.where(eq(staffProfiles.id, input.id))

		if (!profile) throw new NotFoundException("Staff profile not found")

		const today = new Date()
		const EXPIRING_THRESHOLD_DAYS = 30

		const checkLicense = (expiry: string | null) => {
			if (!expiry) return { status: "not_set" as const, daysUntilExpiry: null }
			const expiryDate = new Date(expiry)
			const msUntil = expiryDate.getTime() - today.getTime()
			const daysUntilExpiry = Math.ceil(msUntil / (1000 * 60 * 60 * 24))
			if (daysUntilExpiry < 0) return { status: "expired" as const, daysUntilExpiry }
			if (daysUntilExpiry <= EXPIRING_THRESHOLD_DAYS)
				return { status: "expiring_soon" as const, daysUntilExpiry }
			return { status: "valid" as const, daysUntilExpiry }
		}

		return {
			staffProfileId: profile.id,
			prc: checkLicense(profile.prcExpiry),
			ptr: checkLicense(profile.ptrExpiry),
			pdeaS2: checkLicense(profile.pdeaS2Expiry),
		}
	}

	// ── Password Reset ──────────────────────────────────────────────────────

	async resetPassword(input: ResetPasswordInput) {
		const [user] = await db
			.select({ id: users.id, email: users.email })
			.from(users)
			.where(eq(users.id, input.userId))

		if (!user) throw new NotFoundException("User not found")

		// Revoke all active sessions for this user before sending the reset email.
		// This prevents a compromised session from remaining valid after a forced reset.
		await db.delete(sessions).where(eq(sessions.userId, input.userId))

		// Anti-enumeration: requestPasswordReset returns 200 regardless of whether
		// the email exists in Better Auth — do not branch on the result.
		await this.authService.api.requestPasswordReset({
			body: { email: user.email, redirectTo: "/" },
		})

		return { success: true }
	}

	// ── Access Governance — Multi-facility user creation ────────────────────

	/**
	 * Creates a user account + N staff profiles + N×M user_roles in one transaction.
	 * Better Auth signup happens OUTSIDE the transaction; on DB failure the orphan
	 * userId is logged for manual cleanup.
	 */
	async createUser(input: CreateUserWithFacilitiesInput, actor: ActorContext) {
		const {
			name, email, password, employeeNumber,
			prcLicenseNumber, prcExpiry, ptrNumber, ptrExpiry, pdeaS2License, pdeaS2Expiry,
			facilities: facilityEntries,
		} = input

		// Server-side: every roleId must belong to its facilityId
		if (facilityEntries.length > 0) {
			const allRoleIds = facilityEntries.flatMap(f => f.roleIds)
			const roleRows = await db
				.select({ id: roles.id, facilityId: roles.facilityId })
				.from(roles)
				.where(inArray(roles.id, allRoleIds))

			const roleFacilityMap = new Map(roleRows.map(r => [r.id, r.facilityId]))
			for (const entry of facilityEntries) {
				for (const roleId of entry.roleIds) {
					const roleFacility = roleFacilityMap.get(roleId)
					if (roleFacility !== entry.facilityId) {
						throw new BadRequestException(
							`Role ${roleId} does not belong to facility ${entry.facilityId}`
						)
					}
				}
			}
		}

		// Create Better Auth user (external, outside DB transaction)
		const ctx = await this.authService.api.signUpEmail({
			body: { name, email, password },
		})
		if (!ctx?.user) {
			throw new Error("Failed to create user account")
		}
		const userId = ctx.user.id

		try {
			const staffProfileIds = await db.transaction(async (tx: DBTransaction) => {
				const createdProfileIds: string[] = []

				for (const entry of facilityEntries) {
					const [profile] = await tx
						.insert(staffProfiles)
						.values({
							userId,
							facilityId: entry.facilityId,
							employeeNumber: employeeNumber ?? null,
							prcLicenseNumber: prcLicenseNumber ?? null,
							prcExpiry: prcExpiry ?? null,
							ptrNumber: ptrNumber ?? null,
							ptrExpiry: ptrExpiry ?? null,
							pdeaS2License: pdeaS2License ?? null,
							pdeaS2Expiry: pdeaS2Expiry ?? null,
						})
						.returning()

					if (!profile) throw new Error("Failed to create staff profile")
					createdProfileIds.push(profile.id)

					if (entry.roleIds.length > 0) {
						await tx.insert(userRoles).values(
							entry.roleIds.map((roleId, idx) => ({
								staffProfileId: profile.id,
								roleId,
								isPrimary: entry.isPrimary && idx === 0,
							}))
						)
					}

					await this.auditService.log(
						{
							facilityId: actor.facilityId,
							userId: actor.userId,
							staffProfileId: actor.staffProfileId,
							action: "create",
							entityType: "staff_profile",
							entityId: profile.id,
							beforeState: null,
							afterState: {
								userId,
								facilityId: entry.facilityId,
								isPrimary: entry.isPrimary,
								roleIds: entry.roleIds,
							},
							ipAddress: actor.ipAddress,
							userAgent: actor.userAgent,
							metadata: null,
						},
						{ tx }
					)
				}

				return createdProfileIds
			})

			return { userId, staffProfileIds }
		} catch (err) {
			this.logger.error(
				`DB setup failed after Better Auth user creation. Orphaned userId=${userId}`,
				err
			)
			throw err
		}
	}

	// ── Access Governance — Re-enable user ─────────────────────────────────

	async reEnableUser(input: ReEnableUserInput, actor: ActorContext) {
		const [profile] = await db
			.select()
			.from(staffProfiles)
			.where(eq(staffProfiles.id, input.staffProfileId))

		if (!profile) throw new NotFoundException("Staff profile not found")
		if (profile.isActive) return { success: true }

		await db.transaction(async (tx: DBTransaction) => {
			await tx
				.update(staffProfiles)
				.set({ isActive: true, updatedAt: new Date() })
				.where(eq(staffProfiles.id, input.staffProfileId))

			await this.auditService.log(
				{
					facilityId: actor.facilityId,
					userId: actor.userId,
					staffProfileId: actor.staffProfileId,
					action: "update",
					entityType: "staff_profile",
					entityId: input.staffProfileId,
					beforeState: { isActive: false },
					afterState: { isActive: true },
					ipAddress: actor.ipAddress,
					userAgent: actor.userAgent,
					metadata: { changes: [{ path: "isActive", before: false, after: true }] },
				},
				{ tx }
			)
		})

		return { success: true }
	}

	// ── Access Governance — Facility membership ─────────────────────────────

	async addStaffFacility(input: AddFacilityMembershipInput, actor: ActorContext) {
		const { userId, facilityId, roleIds, isPrimary } = input

		// Verify the user exists
		const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId))
		if (!user) throw new NotFoundException("User not found")

		// Server-side: every roleId must belong to the facilityId
		if (roleIds.length > 0) {
			const roleRows = await db
				.select({ id: roles.id, facilityId: roles.facilityId })
				.from(roles)
				.where(inArray(roles.id, roleIds))

			for (const roleId of roleIds) {
				const row = roleRows.find(r => r.id === roleId)
				if (!row || row.facilityId !== facilityId) {
					throw new BadRequestException(
						`Role ${roleId} does not belong to facility ${facilityId}`
					)
				}
			}
		}

		const staffProfileId = await db.transaction(async (tx: DBTransaction) => {
			const [profile] = await tx
				.insert(staffProfiles)
				.values({ userId, facilityId })
				.returning()

			if (!profile) throw new Error("Failed to create staff profile")

			if (roleIds.length > 0) {
				await tx.insert(userRoles).values(
					roleIds.map((roleId, idx) => ({
						staffProfileId: profile.id,
						roleId,
						isPrimary: isPrimary && idx === 0,
					}))
				)
			}

			await this.auditService.log(
				{
					facilityId: actor.facilityId,
					userId: actor.userId,
					staffProfileId: actor.staffProfileId,
					action: "create",
					entityType: "staff_profile",
					entityId: profile.id,
					beforeState: null,
					afterState: { userId, facilityId, isPrimary, roleIds },
					ipAddress: actor.ipAddress,
					userAgent: actor.userAgent,
					metadata: null,
				},
				{ tx }
			)

			return profile.id
		})

		return { staffProfileId }
	}

	async removeStaffFacility(input: RemoveFacilityMembershipInput, actor: ActorContext) {
		const [profile] = await db
			.select()
			.from(staffProfiles)
			.where(eq(staffProfiles.id, input.staffProfileId))

		if (!profile) throw new NotFoundException("Staff profile not found")

		// Invariant: user must always retain ≥1 active profile
		const activeCount = await db
			.select({ total: count() })
			.from(staffProfiles)
			.where(and(eq(staffProfiles.userId, profile.userId), eq(staffProfiles.isActive, true)))

		const activeTotal = activeCount[0]?.total ?? 0
		if (activeTotal <= 1) {
			throw new BadRequestException(
				"Cannot remove the last active facility membership — user would lose access"
			)
		}

		await db.transaction(async (tx: DBTransaction) => {
			await tx
				.update(staffProfiles)
				.set({ isActive: false, updatedAt: new Date() })
				.where(eq(staffProfiles.id, input.staffProfileId))

			await this.auditService.log(
				{
					facilityId: actor.facilityId,
					userId: actor.userId,
					staffProfileId: actor.staffProfileId,
					action: "delete",
					entityType: "staff_profile",
					entityId: input.staffProfileId,
					beforeState: { isActive: true },
					afterState: { isActive: false },
					ipAddress: actor.ipAddress,
					userAgent: actor.userAgent,
					metadata: null,
				},
				{ tx }
			)
		})

		return { success: true }
	}

	// ── Access Governance — Role assignment ─────────────────────────────────

	async addUserRole(input: AddRoleAssignmentInput, actor: ActorContext) {
		const { staffProfileId, roleId } = input

		const [profile] = await db
			.select()
			.from(staffProfiles)
			.where(eq(staffProfiles.id, staffProfileId))

		if (!profile) throw new NotFoundException("Staff profile not found")

		// Role must belong to the same facility as the profile
		const [role] = await db.select().from(roles).where(eq(roles.id, roleId))
		if (!role) throw new NotFoundException("Role not found")
		if (role.facilityId !== profile.facilityId) {
			throw new BadRequestException("Role does not belong to the same facility as the staff profile")
		}

		// Check if already assigned
		const [existing] = await db
			.select()
			.from(userRoles)
			.where(and(eq(userRoles.staffProfileId, staffProfileId), eq(userRoles.roleId, roleId)))

		if (existing) return { success: true }

		// Determine if this should be primary (first role for this profile)
		const existingRoles = await db
			.select()
			.from(userRoles)
			.where(eq(userRoles.staffProfileId, staffProfileId))

		const isPrimary = existingRoles.length === 0

		await db.transaction(async (tx: DBTransaction) => {
			await tx.insert(userRoles).values({ staffProfileId, roleId, isPrimary })

			await this.auditService.log(
				{
					facilityId: actor.facilityId,
					userId: actor.userId,
					staffProfileId: actor.staffProfileId,
					action: "create",
					entityType: "user_role_assignment",
					entityId: `${staffProfileId}:${roleId}`,
					beforeState: null,
					afterState: { staffProfileId, roleId, isPrimary },
					ipAddress: actor.ipAddress,
					userAgent: actor.userAgent,
					metadata: null,
				},
				{ tx }
			)
		})

		return { success: true }
	}

	// ── Resend Activation ────────────────────────────────────────────────────

	async resendActivation(input: IdInput) {
		const [user] = await db
			.select({ id: users.id, email: users.email })
			.from(users)
			.where(eq(users.id, input.id))

		if (!user) throw new NotFoundException("User not found")

		// Anti-enumeration: same 200 response whether or not email is found
		await this.authService.api.requestPasswordReset({
			body: { email: user.email, redirectTo: "/" },
		})

		this.logger.log(`audit.user.activation-resent userId=${input.id}`)

		return { success: true }
	}

	// ── Get Single Role ──────────────────────────────────────────────────────

	async getRole(input: IdInput) {
		const [role] = await db.select().from(roles).where(eq(roles.id, input.id))
		if (!role) throw new NotFoundException("Role not found")

		const perms = await db
			.select()
			.from(rolePermissions)
			.where(eq(rolePermissions.roleId, input.id))

		return { ...role, permissions: perms }
	}

	// ── List All Permissions ─────────────────────────────────────────────────

	listPermissions() {
		const MODULES = [
			"adt", "clinical_docs", "orders", "nursing", "billing", "formulary",
			"reporting", "notifications", "audit", "admin", "surgical", "opd",
			"nutrition", "laboratory", "radiology", "scheduling", "nbs", "consent",
			"fhir", "msw", "telemedicine", "ed", "death_reporting", "feature_flags",
			"system_settings", "facility_profile", "integration_registry",
			"civil_registry", "medical_records", "patients",
		] as const

		const ACTIONS = [
			"view", "create", "edit", "sign", "delete", "verify", "export",
			"manage_catalog", "clinical_policy", "terminology_admin",
		] as const

		return MODULES.flatMap(module =>
			ACTIONS.map(action => ({ module, action }))
		)
	}

	async removeUserRole(input: RemoveRoleAssignmentInput, actor: ActorContext) {
		const { staffProfileId, roleId } = input

		const [existing] = await db
			.select()
			.from(userRoles)
			.where(and(eq(userRoles.staffProfileId, staffProfileId), eq(userRoles.roleId, roleId)))

		if (!existing) throw new NotFoundException("Role assignment not found")

		await db.transaction(async (tx: DBTransaction) => {
			await tx
				.delete(userRoles)
				.where(and(eq(userRoles.staffProfileId, staffProfileId), eq(userRoles.roleId, roleId)))

			// If we removed the primary role, promote the next role
			if (existing.isPrimary) {
				const remaining = await tx
					.select()
					.from(userRoles)
					.where(eq(userRoles.staffProfileId, staffProfileId))
					.limit(1)

				if (remaining[0]) {
					await tx
						.update(userRoles)
						.set({ isPrimary: true })
						.where(and(
							eq(userRoles.staffProfileId, staffProfileId),
							eq(userRoles.roleId, remaining[0].roleId)
						))
				}
			}

			await this.auditService.log(
				{
					facilityId: actor.facilityId,
					userId: actor.userId,
					staffProfileId: actor.staffProfileId,
					action: "delete",
					entityType: "user_role_assignment",
					entityId: `${staffProfileId}:${roleId}`,
					beforeState: { staffProfileId, roleId },
					afterState: null,
					ipAddress: actor.ipAddress,
					userAgent: actor.userAgent,
					metadata: null,
				},
				{ tx }
			)
		})

		return { success: true }
	}
}
