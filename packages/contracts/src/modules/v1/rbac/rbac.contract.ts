import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	AddFacilityMembershipSchema,
	AddRoleAssignmentSchema,
	ArchiveRoleResponseSchema,
	AssignUserRolesSchema,
	CreateRoleSchema,
	CreateStaffProfileSchema,
	CreateUserSchema,
	CreateUserWithFacilitiesSchema,
	CreateUserWithFacilitiesResponseSchema,
	FacilitySchema,
	InitiatePasswordResetSchema,
	LicenseStatusSchema,
	ListRolesQuerySchema,
	ListUsersQuerySchema,
	PaginatedUsersSchema,
	ReEnableUserSchema,
	RemoveFacilityMembershipSchema,
	RemoveRoleAssignmentSchema,
	RoleIdSchema,
	RoleSchema,
	RoleWithPermissionsSchema,
	RbacActionEnum,
	RbacModuleEnum,
	SetRolePermissionsSchema,
	StaffProfileIdSchema,
	StaffProfileSchema,
	StaffProfileWithRolesSchema,
	UpdateRoleSchema,
	UpdateStaffProfileSchema,
	UserIdSchema,
	UserSummarySchema,
} from "./rbac.schema.js"

// ============================================================================
// Response Schemas
// ============================================================================

export const MyProfileResponseSchema = z.object({
	user: z.object({
		id: z.string(),
		name: z.string(),
		email: z.string(),
	}),
	staffProfiles: z.array(
		StaffProfileWithRolesSchema.extend({
			facility: FacilitySchema.pick({ id: true, name: true, facilityType: true }),
		})
	),
	activeRole: z
		.object({
			id: z.string().uuid(),
			name: z.string(),
			permissions: z.array(
				z.object({
					module: RbacModuleEnum,
					action: RbacActionEnum,
				})
			),
		})
		.nullable(),
})

// ============================================================================
// Input Schemas
// ============================================================================

export const SwitchRoleSchema = z.object({
	roleId: z.string().uuid(),
})

// ============================================================================
// Contract
// ============================================================================

export const rbacContract = {
	me: oc
		.route({
			method: "GET",
			path: "/me",
			summary: "Get current user profile with roles and permissions",
			tags: ["RBAC"],
		})
		.output(MyProfileResponseSchema),

	switchRole: oc
		.route({
			method: "PUT",
			path: "/switch-role",
			summary: "Switch active role",
			tags: ["RBAC"],
		})
		.input(SwitchRoleSchema)
		.output(MyProfileResponseSchema),

	// ── Staff Management ──────────────────────────────────────────────

	listStaff: oc
		.route({
			method: "GET",
			path: "/staff",
			summary: "List staff members (admin only)",
			tags: ["RBAC"],
		})
		.input(ListUsersQuerySchema)
		.output(PaginatedUsersSchema),

	createStaff: oc
		.route({
			method: "POST",
			path: "/staff",
			summary: "Create staff member with profile (admin only)",
			tags: ["RBAC"],
		})
		.input(CreateUserSchema)
		.output(z.object({ userId: z.string(), staffProfileId: z.string().uuid() })),

	updateStaff: oc
		.route({
			method: "PATCH",
			path: "/staff/{id}",
			summary: "Update staff profile (admin only)",
			tags: ["RBAC"],
		})
		.input(StaffProfileIdSchema.extend(UpdateStaffProfileSchema.shape))
		.output(StaffProfileSchema),

	deactivateStaff: oc
		.route({
			method: "DELETE",
			path: "/staff/{id}",
			summary: "Deactivate a staff profile (admin only)",
			tags: ["RBAC"],
		})
		.input(StaffProfileIdSchema)
		.output(z.object({ success: z.boolean() })),

	// ── Role Management ────────────────────────────────────────────────

	listRoles: oc
		.route({
			method: "GET",
			path: "/roles",
			summary: "List roles for a facility (admin only)",
			tags: ["RBAC"],
		})
		.input(ListRolesQuerySchema)
		.output(z.array(RoleWithPermissionsSchema)),

	createRole: oc
		.route({
			method: "POST",
			path: "/roles",
			summary: "Create a new role (admin only)",
			tags: ["RBAC"],
		})
		.input(CreateRoleSchema)
		.output(RoleSchema),

	updateRole: oc
		.route({
			method: "PATCH",
			path: "/roles/{id}",
			summary: "Update role metadata (admin only)",
			tags: ["RBAC"],
		})
		.input(RoleIdSchema.extend(UpdateRoleSchema.shape))
		.output(RoleSchema),

	updateRolePermissions: oc
		.route({
			method: "PUT",
			path: "/roles/{id}/permissions",
			summary: "Replace the full permission matrix for a role (admin only)",
			tags: ["RBAC"],
		})
		.input(RoleIdSchema.extend(SetRolePermissionsSchema.shape))
		.output(RoleWithPermissionsSchema),

	archiveRole: oc
		.route({
			method: "DELETE",
			path: "/roles/{id}",
			summary: "Archive a role (admin only). System default roles cannot be archived.",
			tags: ["RBAC"],
		})
		.input(RoleIdSchema)
		.output(ArchiveRoleResponseSchema),

	// ── User-Role Assignment ────────────────────────────────────────────

	assignUserRoles: oc
		.route({
			method: "PUT",
			path: "/staff/{id}/roles",
			summary: "Assign roles to a staff profile (admin only)",
			tags: ["RBAC"],
		})
		.input(StaffProfileIdSchema.extend(AssignUserRolesSchema.shape))
		.output(z.object({ success: z.boolean() })),

	// ── License Status ─────────────────────────────────────────────────

	getLicenseStatus: oc
		.route({
			method: "GET",
			path: "/staff/{id}/license-status",
			summary: "Get license expiry status for a staff profile",
			tags: ["RBAC"],
		})
		.input(StaffProfileIdSchema)
		.output(LicenseStatusSchema),

	// ── Password Reset ──────────────────────────────────────────────────

	resetPassword: oc
		.route({
			method: "POST",
			path: "/staff/reset-password",
			summary: "Initiate password reset for a user (admin only)",
			tags: ["RBAC"],
		})
		.input(InitiatePasswordResetSchema)
		.output(z.object({ success: z.boolean() })),

	// ── Staff Profile Summary ────────────────────────────────────────────

	getStaffUser: oc
		.route({
			method: "GET",
			path: "/staff/{id}",
			summary: "Get a staff member with their profiles",
			tags: ["RBAC"],
		})
		.input(UserIdSchema)
		.output(z.object({ user: UserSummarySchema, staffProfiles: z.array(StaffProfileWithRolesSchema) })),

	// ── Access Governance — Multi-facility user creation ────────────────

	createUser: oc
		.route({
			method: "POST",
			path: "/users",
			summary: "Create a user with multi-facility memberships (admin only)",
			tags: ["RBAC"],
		})
		.input(CreateUserWithFacilitiesSchema)
		.output(CreateUserWithFacilitiesResponseSchema),

	// ── Access Governance — Re-enable user ─────────────────────────────

	reEnableUser: oc
		.route({
			method: "POST",
			path: "/staff/{staffProfileId}/re-enable",
			summary: "Re-enable a deactivated staff profile (admin only)",
			tags: ["RBAC"],
		})
		.input(ReEnableUserSchema)
		.output(z.object({ success: z.boolean() })),

	// ── Access Governance — Facility membership ─────────────────────────

	addStaffFacility: oc
		.route({
			method: "POST",
			path: "/users/{userId}/facilities",
			summary: "Add a facility membership for a user (admin only)",
			tags: ["RBAC"],
		})
		.input(AddFacilityMembershipSchema)
		.output(z.object({ staffProfileId: z.string().uuid() })),

	removeStaffFacility: oc
		.route({
			method: "DELETE",
			path: "/staff/{staffProfileId}/facilities",
			summary: "Remove a facility membership (admin only)",
			tags: ["RBAC"],
		})
		.input(RemoveFacilityMembershipSchema)
		.output(z.object({ success: z.boolean() })),

	// ── Access Governance — Role assignment ─────────────────────────────

	addUserRole: oc
		.route({
			method: "POST",
			path: "/staff/{staffProfileId}/roles",
			summary: "Add a role to a staff profile (admin only)",
			tags: ["RBAC"],
		})
		.input(AddRoleAssignmentSchema)
		.output(z.object({ success: z.boolean() })),

	removeUserRole: oc
		.route({
			method: "DELETE",
			path: "/staff/{staffProfileId}/roles/{roleId}",
			summary: "Remove a role from a staff profile (admin only)",
			tags: ["RBAC"],
		})
		.input(RemoveRoleAssignmentSchema)
		.output(z.object({ success: z.boolean() })),

	// ── Resend Activation ────────────────────────────────────────────────

	resendActivation: oc
		.route({
			method: "POST",
			path: "/staff/{id}/resend-activation",
			summary: "Resend activation / password reset email for a user (admin only)",
			tags: ["RBAC"],
		})
		.input(UserIdSchema)
		.output(z.object({ success: z.boolean() })),

	// ── Get Single Role ──────────────────────────────────────────────────

	getRole: oc
		.route({
			method: "GET",
			path: "/roles/{id}",
			summary: "Get a single role with its permissions (admin only)",
			tags: ["RBAC"],
		})
		.input(RoleIdSchema)
		.output(RoleWithPermissionsSchema),

	// ── List All Permissions ─────────────────────────────────────────────

	listPermissions: oc
		.route({
			method: "GET",
			path: "/permissions",
			summary: "List all available permission tokens in the system",
			tags: ["RBAC"],
		})
		.output(
			z.array(
				z.object({
					module: RbacModuleEnum,
					action: RbacActionEnum,
					description: z.string().optional(),
				})
			)
		),
}
