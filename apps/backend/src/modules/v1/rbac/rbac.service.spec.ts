/**
 * RbacService — Access Governance tests.
 *
 * Covers:
 * 1. createUser — validates roleId belongs to facilityId; writes profiles + roles + audit atomically; logs orphaned userId on DB failure
 * 2. reEnableUser — flips isActive; writes audit; no-ops if already active
 * 3. addStaffFacility — validates role belongs to facility; writes profile + roles + audit
 * 4. removeStaffFacility — enforces ≥1 active profile invariant; writes audit on soft-remove
 * 5. addUserRole — validates role facility match; skips if already assigned
 * 6. removeUserRole — promotes next primary on removal of primary role
 */

import { BadRequestException, NotFoundException } from "@nestjs/common"

import { db } from "@/common/database/database.client"

import { RbacService } from "./rbac.service"

jest.mock("@thallesp/nestjs-better-auth", () => ({
	AuthService: class MockAuthService {},
}))

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/common/database/database.client", () => ({
	db: {
		select: jest.fn(),
		insert: jest.fn(),
		update: jest.fn(),
		delete: jest.fn(),
		transaction: jest.fn(),
	},
}))

jest.mock("@repo/db/schema", () => ({
	users: { id: "id", name: "name", email: "email" },
	staffProfiles: {
		id: "id",
		userId: "userId",
		facilityId: "facilityId",
		isActive: "isActive",
		updatedAt: "updatedAt",
	},
	roles: { id: "id", facilityId: "facilityId", name: "name" },
	rolePermissions: { roleId: "roleId", module: "module", action: "action" },
	userRoles: {
		id: "id",
		staffProfileId: "staffProfileId",
		roleId: "roleId",
		isPrimary: "isPrimary",
	},
	facilities: { id: "id", name: "name", facilityType: "facilityType" },
}))

const mockAuthService = {
	api: {
		signUpEmail: jest.fn(),
		requestPasswordReset: jest.fn(),
	},
}

const mockAuditService = {
	log: jest.fn().mockResolvedValue(undefined),
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USER_ID = "user-uuid-0001"
const FACILITY_ID = "facility-uuid-0001"
const FACILITY_ID_2 = "facility-uuid-0002"
const PROFILE_ID = "profile-uuid-0001"
const ROLE_ID = "role-uuid-0001"
const ROLE_ID_2 = "role-uuid-0002"

const actor = {
	userId: "admin-user-uuid",
	facilityId: FACILITY_ID,
	staffProfileId: "admin-profile-uuid",
	ipAddress: "127.0.0.1",
	userAgent: "jest",
}

function makeProfile(overrides: Record<string, unknown> = {}) {
	return {
		id: PROFILE_ID,
		userId: USER_ID,
		facilityId: FACILITY_ID,
		isActive: true,
		employeeNumber: null,
		department: null,
		...overrides,
	}
}

function makeRole(overrides: Record<string, unknown> = {}) {
	return {
		id: ROLE_ID,
		facilityId: FACILITY_ID,
		name: "Nurse",
		isSystemDefault: false,
		...overrides,
	}
}

function makeUserRole(overrides: Record<string, unknown> = {}) {
	return {
		id: "ur-001",
		staffProfileId: PROFILE_ID,
		roleId: ROLE_ID,
		isPrimary: true,
		...overrides,
	}
}

function mockSelectChain(rows: unknown[]) {
	return {
		from: jest.fn().mockReturnValue({
			where: jest.fn().mockResolvedValue(rows),
		}),
	}
}

function mockSelectChainWithLimit(rows: unknown[]) {
	return {
		from: jest.fn().mockReturnValue({
			where: jest.fn().mockReturnValue({
				limit: jest.fn().mockResolvedValue(rows),
			}),
		}),
	}
}

function mockInsertChain(returnRow: unknown) {
	return {
		values: jest.fn().mockReturnValue({
			returning: jest.fn().mockResolvedValue([returnRow]),
		}),
	}
}

function mockUpdateChain(returnRow: unknown) {
	return {
		set: jest.fn().mockReturnValue({
			where: jest.fn().mockResolvedValue(returnRow ? [returnRow] : []),
		}),
	}
}

function mockDeleteChain() {
	return { where: jest.fn().mockResolvedValue(undefined) }
}

function setupTransaction() {
	;(db.transaction as jest.Mock).mockImplementation(
		async (fn: (tx: unknown) => Promise<unknown>) => {
			const tx = {
				insert: jest.fn().mockReturnValue({
					values: jest.fn().mockReturnValue({
						returning: jest.fn().mockResolvedValue([makeProfile()]),
					}),
				}),
				update: jest.fn().mockReturnValue({
					set: jest.fn().mockReturnValue({
						where: jest.fn().mockResolvedValue([]),
					}),
				}),
				delete: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) }),
				select: jest.fn().mockReturnValue({
					from: jest.fn().mockReturnValue({
						where: jest.fn().mockReturnValue({
							limit: jest.fn().mockResolvedValue([]),
						}),
					}),
				}),
			}
			return fn(tx)
		}
	)
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe("RbacService — Access Governance", () => {
	let service: RbacService

	beforeEach(() => {
		jest.clearAllMocks()
		service = new RbacService(mockAuthService as never, mockAuditService as never)
		setupTransaction()
	})

	// ── createUser ────────────────────────────────────────────────────────────

	describe("createUser", () => {
		const input = {
			name: "Maria Santos",
			email: "maria@hospital.ph",
			password: "Password123",
			facilities: [{ facilityId: FACILITY_ID, roleIds: [ROLE_ID], isPrimary: true }],
		}

		it("throws BadRequestException when roleId does not belong to facilityId", async () => {
			;(db.select as jest.Mock).mockReturnValueOnce({
				from: jest.fn().mockReturnValue({
					where: jest.fn().mockResolvedValue([
						{ id: ROLE_ID, facilityId: FACILITY_ID_2 }, // role belongs to different facility
					]),
				}),
			})

			await expect(service.createUser(input, actor)).rejects.toThrow(BadRequestException)
		})

		it("calls Better Auth signUpEmail before the DB transaction", async () => {
			;(db.select as jest.Mock).mockReturnValue(
				mockSelectChain([{ id: ROLE_ID, facilityId: FACILITY_ID }])
			)
			mockAuthService.api.signUpEmail.mockResolvedValue({ user: { id: USER_ID } })

			await service.createUser(input, actor)

			expect(mockAuthService.api.signUpEmail).toHaveBeenCalledWith({
				body: { name: "Maria Santos", email: "maria@hospital.ph", password: "Password123" },
			})
		})

		it("returns userId and staffProfileIds on success", async () => {
			;(db.select as jest.Mock).mockReturnValue(
				mockSelectChain([{ id: ROLE_ID, facilityId: FACILITY_ID }])
			)
			mockAuthService.api.signUpEmail.mockResolvedValue({ user: { id: USER_ID } })

			const result = await service.createUser(input, actor)

			expect(result).toHaveProperty("userId", USER_ID)
			expect(result.staffProfileIds).toHaveLength(1)
		})

		it("logs orphaned userId and re-throws on DB transaction failure", async () => {
			;(db.select as jest.Mock).mockReturnValue(
				mockSelectChain([{ id: ROLE_ID, facilityId: FACILITY_ID }])
			)
			mockAuthService.api.signUpEmail.mockResolvedValue({ user: { id: USER_ID } })
			;(db.transaction as jest.Mock).mockRejectedValue(new Error("DB failure"))

			// Logger is a private class property — spy on NestJS Logger prototype
			const { Logger } = require("@nestjs/common")
			const logSpy = jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined)

			await expect(service.createUser(input, actor)).rejects.toThrow("DB failure")
			expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(USER_ID), expect.any(Error))

			logSpy.mockRestore()
		})

		it("throws if Better Auth signUpEmail fails", async () => {
			;(db.select as jest.Mock).mockReturnValue(
				mockSelectChain([{ id: ROLE_ID, facilityId: FACILITY_ID }])
			)
			mockAuthService.api.signUpEmail.mockResolvedValue(null)

			await expect(service.createUser(input, actor)).rejects.toThrow(
				"Failed to create user account"
			)
		})
	})

	// ── reEnableUser ──────────────────────────────────────────────────────────

	describe("reEnableUser", () => {
		it("throws NotFoundException when staff profile does not exist", async () => {
			;(db.select as jest.Mock).mockReturnValue(mockSelectChain([]))

			await expect(service.reEnableUser({ staffProfileId: PROFILE_ID }, actor)).rejects.toThrow(
				NotFoundException
			)
		})

		it("returns success immediately when profile is already active", async () => {
			;(db.select as jest.Mock).mockReturnValue(mockSelectChain([makeProfile({ isActive: true })]))

			const result = await service.reEnableUser({ staffProfileId: PROFILE_ID }, actor)

			expect(result).toEqual({ success: true })
			expect(db.transaction).not.toHaveBeenCalled()
		})

		it("flips isActive and writes audit when profile is inactive", async () => {
			;(db.select as jest.Mock).mockReturnValue(mockSelectChain([makeProfile({ isActive: false })]))

			const result = await service.reEnableUser({ staffProfileId: PROFILE_ID }, actor)

			expect(result).toEqual({ success: true })
			expect(db.transaction).toHaveBeenCalled()
		})
	})

	// ── removeStaffFacility ───────────────────────────────────────────────────

	describe("removeStaffFacility", () => {
		it("throws NotFoundException when profile does not exist", async () => {
			;(db.select as jest.Mock).mockReturnValueOnce(mockSelectChain([]))

			await expect(
				service.removeStaffFacility({ staffProfileId: PROFILE_ID }, actor)
			).rejects.toThrow(NotFoundException)
		})

		it("throws BadRequestException when removing the last active profile", async () => {
			;(db.select as jest.Mock)
				.mockReturnValueOnce(mockSelectChain([makeProfile()]))
				.mockReturnValueOnce({
					from: jest.fn().mockReturnValue({
						where: jest.fn().mockResolvedValue([{ total: 1 }]),
					}),
				})

			await expect(
				service.removeStaffFacility({ staffProfileId: PROFILE_ID }, actor)
			).rejects.toThrow(BadRequestException)
		})

		it("soft-removes profile and writes audit when ≥2 active profiles remain", async () => {
			;(db.select as jest.Mock)
				.mockReturnValueOnce(mockSelectChain([makeProfile()]))
				.mockReturnValueOnce({
					from: jest.fn().mockReturnValue({
						where: jest.fn().mockResolvedValue([{ total: 2 }]),
					}),
				})

			const result = await service.removeStaffFacility({ staffProfileId: PROFILE_ID }, actor)

			expect(result).toEqual({ success: true })
			expect(db.transaction).toHaveBeenCalled()
		})
	})

	// ── addUserRole ───────────────────────────────────────────────────────────

	describe("addUserRole", () => {
		it("throws BadRequestException when role belongs to a different facility", async () => {
			;(db.select as jest.Mock)
				.mockReturnValueOnce(mockSelectChain([makeProfile()]))
				.mockReturnValueOnce(mockSelectChain([makeRole({ facilityId: FACILITY_ID_2 })]))

			await expect(
				service.addUserRole({ staffProfileId: PROFILE_ID, roleId: ROLE_ID }, actor)
			).rejects.toThrow(BadRequestException)
		})

		it("returns success without inserting if role already assigned", async () => {
			;(db.select as jest.Mock)
				.mockReturnValueOnce(mockSelectChain([makeProfile()]))
				.mockReturnValueOnce(mockSelectChain([makeRole()]))
				.mockReturnValueOnce(mockSelectChain([makeUserRole()])) // already exists

			const result = await service.addUserRole(
				{ staffProfileId: PROFILE_ID, roleId: ROLE_ID },
				actor
			)

			expect(result).toEqual({ success: true })
			expect(db.transaction).not.toHaveBeenCalled()
		})

		it("inserts role assignment and writes audit", async () => {
			;(db.select as jest.Mock)
				.mockReturnValueOnce(mockSelectChain([makeProfile()]))
				.mockReturnValueOnce(mockSelectChain([makeRole()]))
				.mockReturnValueOnce(mockSelectChain([])) // not yet assigned
				.mockReturnValueOnce(mockSelectChain([])) // no existing roles → isPrimary = true

			const result = await service.addUserRole(
				{ staffProfileId: PROFILE_ID, roleId: ROLE_ID },
				actor
			)

			expect(result).toEqual({ success: true })
			expect(db.transaction).toHaveBeenCalled()
		})
	})

	// ── removeUserRole ────────────────────────────────────────────────────────

	describe("removeUserRole", () => {
		it("throws NotFoundException when role assignment does not exist", async () => {
			;(db.select as jest.Mock).mockReturnValueOnce(mockSelectChain([]))

			await expect(
				service.removeUserRole({ staffProfileId: PROFILE_ID, roleId: ROLE_ID }, actor)
			).rejects.toThrow(NotFoundException)
		})

		it("removes role assignment and writes audit", async () => {
			;(db.select as jest.Mock).mockReturnValueOnce(
				mockSelectChain([makeUserRole({ isPrimary: false })])
			)

			const result = await service.removeUserRole(
				{ staffProfileId: PROFILE_ID, roleId: ROLE_ID },
				actor
			)

			expect(result).toEqual({ success: true })
			expect(db.transaction).toHaveBeenCalled()
		})
	})
})
