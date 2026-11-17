import { z } from "zod"

// ============================================================================
// Enums
// ============================================================================

export const RbacModuleEnum = z.enum([
	"adt",
	"clinical_docs",
	"orders",
	"nursing",
	"billing",
	"billing.charges",
	"billing.invoices",
	"billing.payments",
	"billing.cf4",
	"billing.drg",
	"billing.cf5",
	"billing.esoa",
	"billing.cews",
	"billing.konsulta",
	"formulary",
	"reporting",
	"notifications",
	"audit",
	"admin",
	"admin.users",
	"admin.feature-flags",
	"admin.licenses",
	"admin.bor",
	"admin.fhir",
	"admin.terminology",
	"admin.sla",
	"admin.master-data",
	"admin.integrations",
	"admin.facility",
	"admin.auth",
	"surgical",
	"opd",
	"nutrition",
	"laboratory",
	"radiology",
	"scheduling",
	"nbs",
	"consent",
	"fhir",
	"msw",
	"telemedicine",
	"ed",
	"death_reporting",
	"feature_flags",
	"system_settings",
	"facility_profile",
	"integration_registry",
	"civil_registry",
	"medical_records",
	"him.deficiencies",
	"him.coding",
	"him.records",
	"him.hai",
	"patients",
])

export const RbacActionEnum = z.enum([
	"view",
	"create",
	"edit",
	"sign",
	"delete",
	"verify",
	"export",
	"read",
	"write",
	"manage_catalog",
	"clinical_policy",
	"terminology_admin",
])

export const FacilityTypeEnum = z.enum(["community", "district", "tertiary"])

export const LicenseStatusEnum = z.enum(["valid", "expiring_soon", "expired", "not_set"])

// ============================================================================
// Facility
// ============================================================================

export const FacilitySchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	facilityType: FacilityTypeEnum,
	address: z.string().nullable(),
	dohLicenseNumber: z.string().nullable(),
	philhealthAccreditationId: z.string().nullable(),
	createdAt: z
		.union([z.date(), z.string()])
		.transform(v => (typeof v === "string" ? new Date(v) : v)),
	updatedAt: z
		.union([z.date(), z.string()])
		.transform(v => (typeof v === "string" ? new Date(v) : v)),
})

export const CreateFacilitySchema = z.object({
	name: z.string().min(1).max(255),
	facilityType: FacilityTypeEnum,
	address: z.string().optional(),
	dohLicenseNumber: z.string().optional(),
	philhealthAccreditationId: z.string().optional(),
})

export const FacilityIdSchema = z.object({ id: z.string().uuid() })

// ============================================================================
// Staff Profile
// ============================================================================

export const StaffProfileSchema = z.object({
	id: z.string().uuid(),
	userId: z.string(),
	facilityId: z.string().uuid(),
	employeeNumber: z.string().nullable(),
	department: z.string().nullable(),
	prcLicenseNumber: z.string().nullable(),
	prcExpiry: z.string().nullable(),
	ptrNumber: z.string().nullable(),
	ptrExpiry: z.string().nullable(),
	pdeaS2License: z.string().nullable(),
	pdeaS2Expiry: z.string().nullable(),
	isActive: z.boolean(),
	createdAt: z
		.union([z.date(), z.string()])
		.transform(v => (typeof v === "string" ? new Date(v) : v)),
	updatedAt: z
		.union([z.date(), z.string()])
		.transform(v => (typeof v === "string" ? new Date(v) : v)),
})

export const CreateStaffProfileSchema = z.object({
	userId: z.string(),
	facilityId: z.string().uuid(),
	employeeNumber: z.string().optional(),
	department: z.string().optional(),
	prcLicenseNumber: z.string().optional(),
	prcExpiry: z.string().date().optional(),
	ptrNumber: z.string().optional(),
	ptrExpiry: z.string().date().optional(),
	pdeaS2License: z.string().optional(),
	pdeaS2Expiry: z.string().date().optional(),
})

export const UpdateStaffProfileSchema = CreateStaffProfileSchema.omit({
	userId: true,
	facilityId: true,
}).partial()

export const StaffProfileIdSchema = z.object({ id: z.string().uuid() })

// ============================================================================
// Role
// ============================================================================

export const RoleSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	name: z.string(),
	// Stable machine key for seeded system roles ("clinic_coordinator", ...).
	// Gating matches this, never the display name. Null for custom roles.
	systemKey: z.string().nullable().optional(),
	description: z.string().nullable(),
	isSystemDefault: z.boolean(),
	isArchived: z.boolean(),
	archivedAt: z
		.union([z.date(), z.string()])
		.transform(v => (typeof v === "string" ? new Date(v) : v))
		.nullable(),
	createdAt: z
		.union([z.date(), z.string()])
		.transform(v => (typeof v === "string" ? new Date(v) : v)),
})

export const CreateRoleSchema = z.object({
	facilityId: z.string().uuid(),
	name: z.string().min(1).max(100),
	description: z.string().optional(),
})

export const UpdateRoleSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	description: z.string().optional(),
})

export const RoleIdSchema = z.object({ id: z.string().uuid() })

export const ArchiveRoleResponseSchema = z.object({
	success: z.boolean(),
	conflict: z
		.object({
			assignedUserCount: z.number().int(),
		})
		.optional(),
})

// ============================================================================
// Role Permissions
// ============================================================================

export const RolePermissionSchema = z.object({
	id: z.string().uuid(),
	roleId: z.string().uuid(),
	module: RbacModuleEnum,
	action: RbacActionEnum,
	createdAt: z
		.union([z.date(), z.string()])
		.transform(v => (typeof v === "string" ? new Date(v) : v)),
})

export const PermissionEntrySchema = z.object({
	module: RbacModuleEnum,
	action: RbacActionEnum,
})

export const SetRolePermissionsSchema = z.object({
	permissions: z.array(PermissionEntrySchema),
})

export const RoleWithPermissionsSchema = RoleSchema.extend({
	permissions: z.array(RolePermissionSchema),
})

// ============================================================================
// User Roles
// ============================================================================

export const UserRoleSchema = z.object({
	id: z.string().uuid(),
	staffProfileId: z.string().uuid(),
	roleId: z.string().uuid(),
	isPrimary: z.boolean(),
	createdAt: z
		.union([z.date(), z.string()])
		.transform(v => (typeof v === "string" ? new Date(v) : v)),
})

export const AssignUserRolesSchema = z.object({
	roleIds: z.array(z.string().uuid()),
	primaryRoleId: z.string().uuid().optional(),
})

// ============================================================================
// User (with staff profile)
// ============================================================================

export const UserSummarySchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string().email(),
	createdAt: z
		.union([z.date(), z.string()])
		.transform(v => (typeof v === "string" ? new Date(v) : v)),
})

export const StaffProfileWithRolesSchema = StaffProfileSchema.extend({
	roles: z.array(
		z.object({
			id: z.string().uuid(),
			name: z.string(),
			isPrimary: z.boolean(),
		})
	),
})

export const UserWithProfileSchema = UserSummarySchema.extend({
	staffProfiles: z.array(StaffProfileWithRolesSchema),
})

export const CreateUserSchema = z.object({
	name: z.string().min(1).max(255),
	email: z.string().email(),
	password: z.string().min(8),
	facilityId: z.string().uuid(),
	department: z.string().optional(),
	employeeNumber: z.string().optional(),
	roleIds: z.array(z.string().uuid()).optional(),
})

export const UpdateUserSchema = z.object({
	name: z.string().min(1).max(255).optional(),
	email: z.string().email().optional(),
})

export const UserIdSchema = z.object({ id: z.string() })

// ============================================================================
// License Status
// ============================================================================

const SingleLicenseStatusSchema = z.object({
	status: LicenseStatusEnum,
	daysUntilExpiry: z.number().nullable(),
})

export const LicenseStatusSchema = z.object({
	staffProfileId: z.string().uuid(),
	prc: SingleLicenseStatusSchema,
	ptr: SingleLicenseStatusSchema,
	pdeaS2: SingleLicenseStatusSchema,
})

// ============================================================================
// Password Reset
// ============================================================================

export const InitiatePasswordResetSchema = z.object({
	userId: z.string(),
})

// ============================================================================
// Access Governance — Multi-facility user creation
// ============================================================================

const FacilityMembershipInputSchema = z.object({
	facilityId: z.string().uuid(),
	roleIds: z.array(z.string().uuid()).min(1, "At least one role required"),
	isPrimary: z.boolean(),
})

export const CreateUserWithFacilitiesSchema = z
	.object({
		name: z.string().min(1).max(255),
		email: z.string().email(),
		employeeNumber: z.string().optional(),
		password: z.string().min(8),
		facilities: z.array(FacilityMembershipInputSchema).min(1, "At least one facility required"),
		prcLicenseNumber: z.string().optional(),
		prcExpiry: z.string().date().optional(),
		ptrNumber: z.string().optional(),
		ptrExpiry: z.string().date().optional(),
		pdeaS2License: z.string().optional(),
		pdeaS2Expiry: z.string().date().optional(),
	})
	.refine(data => data.facilities.filter(f => f.isPrimary).length === 1, {
		message: "Exactly one facility must be marked as primary",
		path: ["facilities"],
	})
	.refine(data => new Set(data.facilities.map(f => f.facilityId)).size === data.facilities.length, {
		message: "Duplicate facilityId values are not allowed",
		path: ["facilities"],
	})

export const CreateUserWithFacilitiesResponseSchema = z.object({
	userId: z.string(),
	staffProfileIds: z.array(z.string().uuid()),
})

// ============================================================================
// Access Governance — Re-enable user
// ============================================================================

export const ReEnableUserSchema = z.object({
	staffProfileId: z.string().uuid(),
})

// ============================================================================
// Access Governance — Facility membership
// ============================================================================

export const AddFacilityMembershipSchema = z.object({
	userId: z.string(),
	facilityId: z.string().uuid(),
	roleIds: z.array(z.string().uuid()).min(1),
	isPrimary: z.boolean().default(false),
})

export const RemoveFacilityMembershipSchema = z.object({
	staffProfileId: z.string().uuid(),
})

// ============================================================================
// Access Governance — Role assignment
// ============================================================================

export const AddRoleAssignmentSchema = z.object({
	staffProfileId: z.string().uuid(),
	roleId: z.string().uuid(),
})

export const RemoveRoleAssignmentSchema = z.object({
	staffProfileId: z.string().uuid(),
	roleId: z.string().uuid(),
})

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Coerces query string "true"/"false" to boolean for GET params.
 * Also accepts actual booleans for JSON transport.
 */
const queryBoolean = z
	.union([z.boolean(), z.enum(["true", "false"]).transform(v => v === "true")])
	.optional()

// ============================================================================
// List Queries
// ============================================================================

export const ListUsersQuerySchema = z.object({
	facilityId: z.string().uuid().optional(),
	search: z.string().optional(),
	isActive: queryBoolean,
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
})

export const ListRolesQuerySchema = z.object({
	facilityId: z.string().uuid(),
})

export const PaginatedUsersSchema = z.object({
	data: z.array(UserWithProfileSchema),
	total: z.number(),
	page: z.number(),
	limit: z.number(),
})

// ============================================================================
// Co-Sign Workflows
// ============================================================================

export const SearchCliniciansQuerySchema = z.object({
	facilityId: z.string().uuid(),
	search: z.string().optional(),
	excludeStaffProfileId: z.string().uuid().optional(),
})

export const ClinicianSummarySchema = z.object({
	staffProfileId: z.string().uuid(),
	name: z.string(),
	department: z.string().nullable(),
	primaryRole: z.string().nullable(),
})

export const CoSignVerifyInputSchema = z.object({
	staffProfileId: z.string().uuid(),
	password: z.string().min(1),
})

export const CoSignVerifyResponseSchema = z.object({
	verified: z.boolean(),
	staffName: z.string(),
})

// ============================================================================
// Inferred Types
// ============================================================================

export type Facility = z.infer<typeof FacilitySchema>
export type CreateFacilityInput = z.infer<typeof CreateFacilitySchema>
export type StaffProfile = z.infer<typeof StaffProfileSchema>
export type CreateStaffProfileInput = z.infer<typeof CreateStaffProfileSchema>
export type UpdateStaffProfileInput = z.infer<typeof UpdateStaffProfileSchema>
export type Role = z.infer<typeof RoleSchema>
export type CreateRoleInput = z.infer<typeof CreateRoleSchema>
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>
export type ArchiveRoleResponse = z.infer<typeof ArchiveRoleResponseSchema>
export type RoleWithPermissions = z.infer<typeof RoleWithPermissionsSchema>
export type SetRolePermissionsInput = z.infer<typeof SetRolePermissionsSchema>
export type AssignUserRolesInput = z.infer<typeof AssignUserRolesSchema>
export type UserWithProfile = z.infer<typeof UserWithProfileSchema>
export type CreateUserInput = z.infer<typeof CreateUserSchema>
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>
export type LicenseStatus = z.infer<typeof LicenseStatusSchema>
export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>
export type PaginatedUsers = z.infer<typeof PaginatedUsersSchema>
export type RbacModule = z.infer<typeof RbacModuleEnum>
export type RbacAction = z.infer<typeof RbacActionEnum>
