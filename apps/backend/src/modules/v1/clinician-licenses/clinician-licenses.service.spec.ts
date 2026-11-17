/**
 * ClinicianLicensesService — unit tests for ADM-BE-02, ADM-BE-05
 *
 * Covers:
 * 1. add — inserts a new license record
 * 2. verify — sets status to "verified"; propagates PRC/PTR/S2 to staffProfile credentials
 * 3. sweepExpiredLicenses — bulk-sets expired verified licenses to "expired"
 */

import { ForbiddenException, NotFoundException } from "@nestjs/common"

import { db } from "@/common/database/database.client"

import { ClinicianLicensesService } from "./clinician-licenses.service"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/common/database/database.client", () => ({
	db: {
		select: jest.fn(),
		insert: jest.fn(),
		update: jest.fn(),
		delete: jest.fn(),
	},
}))

jest.mock("@repo/db/schema", () => ({
	clinicianLicenses: {
		id: "id",
		staffProfileId: "staffProfileId",
		licenseType: "licenseType",
		status: "status",
		expiryDate: "expiryDate",
		updatedAt: "updatedAt",
	},
	staffProfiles: {
		id: "id",
		userId: "userId",
		facilityId: "facilityId",
		prcLicenseNumber: "prcLicenseNumber",
		prcExpiry: "prcExpiry",
		ptrNumber: "ptrNumber",
		ptrExpiry: "ptrExpiry",
		pdeaS2License: "pdeaS2License",
		pdeaS2Expiry: "pdeaS2Expiry",
		s2VerifiedUntil: "s2VerifiedUntil",
		updatedAt: "updatedAt",
	},
	userRoles: {
		staffProfileId: "staffProfileId",
		roleId: "roleId",
		isPrimary: "isPrimary",
	},
	roles: { id: "id", name: "name" },
	users: { id: "id", name: "name" },
}))

const mockAuditService = {
	log: jest.fn().mockResolvedValue(undefined),
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PROFILE_ID = "profile-uuid-0001"
const LICENSE_ID = "license-uuid-0001"
const COORDINATOR_ROLE_ID = "role-clinic-coordinator"
const PHYSICIAN_ROLE_ID = "role-physician"

function makeLicense(overrides: Record<string, unknown> = {}) {
	return {
		id: LICENSE_ID,
		staffProfileId: PROFILE_ID,
		licenseType: "PRC" as const,
		licenseNumber: "PRC-123456",
		status: "pending" as const,
		issueDate: null,
		expiryDate: "2025-12-31",
		documentUri: null,
		verificationProof: null,
		verifiedAt: null,
		createdAt: new Date(),
		updatedAt: new Date(),
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

function mockSelectOrderByChain(rows: unknown[]) {
	return {
		from: jest.fn().mockReturnValue({
			where: jest.fn().mockReturnValue({
				orderBy: jest.fn().mockResolvedValue(rows),
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

function mockUpdateWhereChain(returnRows: unknown[]) {
	return {
		set: jest.fn().mockReturnValue({
			where: jest.fn().mockReturnValue({
				returning: jest.fn().mockResolvedValue(returnRows),
			}),
		}),
	}
}

function mockUpdateSetWhereChain() {
	return {
		set: jest.fn().mockReturnValue({
			where: jest.fn().mockResolvedValue(undefined),
		}),
	}
}

function mockDeleteWhereChain() {
	return {
		where: jest.fn().mockResolvedValue(undefined),
	}
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ClinicianLicensesService", () => {
	let service: ClinicianLicensesService

	beforeEach(() => {
		jest.clearAllMocks()
		// Prevent the bootstrap timer from running
		jest.useFakeTimers()
		service = new ClinicianLicensesService(mockAuditService as never)
		// onApplicationBootstrap is called manually if needed; skip scheduling here
	})

	afterEach(() => {
		jest.useRealTimers()
	})

	// ── add ──────────────────────────────────────────────────────────────────

	describe("add", () => {
		it("throws NotFoundException when staff profile does not exist", async () => {
			;(db.select as jest.Mock).mockReturnValueOnce(mockSelectChain([]))

			await expect(
				service.add({
					staffProfileId: PROFILE_ID,
					licenseType: "PRC",
					licenseNumber: "PRC-99999",
				})
			).rejects.toThrow(NotFoundException)
		})

		it("inserts and returns a new license record", async () => {
			const newLicense = makeLicense()
			;(db.select as jest.Mock).mockReturnValueOnce(mockSelectChain([{ id: PROFILE_ID }]))
			;(db.insert as jest.Mock).mockReturnValueOnce(mockInsertChain(newLicense))

			const result = await service.add({
				staffProfileId: PROFILE_ID,
				licenseType: "PRC",
				licenseNumber: "PRC-123456",
				expiryDate: "2025-12-31",
			})

			expect(result).toMatchObject({ id: LICENSE_ID, status: "pending" })
			expect(db.insert).toHaveBeenCalled()
		})
	})

	// ── get ──────────────────────────────────────────────────────────────────

	describe("get", () => {
		it("backfills editable license records from active staff profile credentials", async () => {
			const profile = {
				id: PROFILE_ID,
				userId: "user-uuid-0001",
				facilityId: "facility-uuid-0001",
				prcLicenseNumber: "PRC-123456",
				prcExpiry: "2027-12-31",
				ptrNumber: "PTR-123456",
				ptrExpiry: "2027-12-31",
				pdeaS2License: "S2-123456",
				pdeaS2Expiry: "2027-12-31",
			}
			const backfilledLicenses = [
				makeLicense({
					id: "license-prc",
					licenseType: "PRC",
					licenseNumber: "PRC-123456",
					status: "verified",
					expiryDate: "2027-12-31",
				}),
				makeLicense({
					id: "license-ptr",
					licenseType: "PTR",
					licenseNumber: "PTR-123456",
					status: "verified",
					expiryDate: "2027-12-31",
				}),
				makeLicense({
					id: "license-s2",
					licenseType: "S2",
					licenseNumber: "S2-123456",
					status: "verified",
					expiryDate: "2027-12-31",
				}),
			]

			;(db.select as jest.Mock)
				.mockReturnValueOnce(mockSelectChain([profile]))
				.mockReturnValueOnce(mockSelectChain([{ name: "Dr. Ronnie Estillero" }]))
				.mockReturnValueOnce(mockSelectOrderByChain([]))
				.mockReturnValueOnce(mockSelectOrderByChain(backfilledLicenses))
			;(db.insert as jest.Mock).mockReturnValueOnce(mockInsertChain(backfilledLicenses[0]))

			const result = await service.get(PROFILE_ID)

			expect(result.licenses).toHaveLength(3)
			expect((db.insert as jest.Mock).mock.results[0]?.value.values).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({
						licenseType: "PRC",
						licenseNumber: "PRC-123456",
						status: "verified",
					}),
					expect.objectContaining({
						licenseType: "PTR",
						licenseNumber: "PTR-123456",
						status: "verified",
					}),
					expect.objectContaining({
						licenseType: "S2",
						licenseNumber: "S2-123456",
						status: "verified",
					}),
				])
			)
		})
	})

	describe("update", () => {
		it("throws NotFoundException when license does not exist", async () => {
			;(db.select as jest.Mock).mockReturnValueOnce(mockSelectChain([]))

			await expect(service.update({ id: LICENSE_ID, licenseNumber: "PRC-99999" })).rejects.toThrow(
				NotFoundException
			)
		})

		it("updates license fields and propagates when status is verified", async () => {
			const license = makeLicense({ status: "verified", licenseNumber: "PRC-123456" })
			const updated = makeLicense({
				status: "verified",
				licenseNumber: "PRC-654321",
				expiryDate: "2026-12-31",
			})

			;(db.select as jest.Mock).mockReturnValueOnce(mockSelectChain([license]))
			;(db.update as jest.Mock)
				.mockReturnValueOnce(mockUpdateWhereChain([updated]))
				.mockReturnValueOnce(mockUpdateSetWhereChain())

			const result = await service.update({
				id: LICENSE_ID,
				licenseNumber: "PRC-654321",
				expiryDate: "2026-12-31",
			})

			expect(result.licenseNumber).toBe("PRC-654321")
			expect(db.update).toHaveBeenCalledTimes(2)
			expect((db.update as jest.Mock).mock.results[1]?.value.set).toHaveBeenCalledWith(
				expect.objectContaining({
					prcLicenseNumber: "PRC-654321",
					prcExpiry: "2026-12-31",
				})
			)
		})

		it("updates pending license without propagating to staff profile", async () => {
			const license = makeLicense({ status: "pending" })
			const updated = makeLicense({ status: "pending", licenseNumber: "PRC-NEW" })

			;(db.select as jest.Mock).mockReturnValueOnce(mockSelectChain([license]))
			;(db.update as jest.Mock).mockReturnValueOnce(mockUpdateWhereChain([updated]))

			const result = await service.update({ id: LICENSE_ID, licenseNumber: "PRC-NEW" })

			expect(result.licenseNumber).toBe("PRC-NEW")
			expect(db.update).toHaveBeenCalledTimes(1)
		})
	})

	// ── updateMine ───────────────────────────────────────────────────────────

	describe("updateMine", () => {
		it("forbids updating another clinician's license", async () => {
			const userId = "user-uuid-0001"
			const otherProfileId = "profile-uuid-0002"
			const license = makeLicense({ staffProfileId: otherProfileId })

			;(db.select as jest.Mock)
				.mockReturnValueOnce(mockSelectChain([{ id: PROFILE_ID }]))
				.mockReturnValueOnce(
					mockSelectChain([
						{ staffProfileId: PROFILE_ID, roleId: COORDINATOR_ROLE_ID, isPrimary: true },
					])
				)
				.mockReturnValueOnce(
					mockSelectChain([{ id: COORDINATOR_ROLE_ID, name: "Clinic Coordinator" }])
				)
				.mockReturnValueOnce(mockSelectChain([license]))

			await expect(
				service.updateMine(userId, { id: LICENSE_ID, licenseNumber: "PRC-99999" })
			).rejects.toThrow(ForbiddenException)
		})

		it("rejects non-coordinators before managing their own licenses", async () => {
			const userId = "user-uuid-0001"

			;(db.select as jest.Mock)
				.mockReturnValueOnce(mockSelectChain([{ id: PROFILE_ID }]))
				.mockReturnValueOnce(
					mockSelectChain([
						{ staffProfileId: PROFILE_ID, roleId: PHYSICIAN_ROLE_ID, isPrimary: true },
					])
				)
				.mockReturnValueOnce(mockSelectChain([{ id: PHYSICIAN_ROLE_ID, name: "Physician" }]))

			await expect(
				service.updateMine(userId, { id: LICENSE_ID, licenseNumber: "PRC-99999" })
			).rejects.toThrow(ForbiddenException)
			expect(db.select).toHaveBeenCalledTimes(3)
		})
	})

	// ── verify ───────────────────────────────────────────────────────────────

	describe("deleteLicense", () => {
		it("clears the active staff profile credential when deleting the last verified license", async () => {
			const verifiedLicense = makeLicense({
				status: "verified",
				licenseType: "PTR",
				licenseNumber: "PTR-123456",
				expiryDate: "2027-12-31",
			})

			;(db.select as jest.Mock)
				.mockReturnValueOnce(mockSelectChain([verifiedLicense]))
				.mockReturnValueOnce(mockSelectOrderByChain([]))
			;(db.delete as jest.Mock).mockReturnValueOnce(mockDeleteWhereChain())
			;(db.update as jest.Mock).mockReturnValueOnce(mockUpdateSetWhereChain())

			const result = await service.deleteLicense(LICENSE_ID)

			expect(result).toEqual({ success: true })
			expect(db.delete).toHaveBeenCalled()
			expect(db.update).toHaveBeenCalledTimes(1)
			expect((db.update as jest.Mock).mock.results[0]?.value.set).toHaveBeenCalledWith(
				expect.objectContaining({
					ptrNumber: null,
					ptrExpiry: null,
				})
			)
		})
	})

	describe("verify", () => {
		it("throws NotFoundException when license does not exist", async () => {
			;(db.select as jest.Mock).mockReturnValueOnce(mockSelectChain([]))

			await expect(service.verify({ id: LICENSE_ID })).rejects.toThrow(NotFoundException)
		})

		it("sets status to 'verified' and propagates a PRC license to the staff profile", async () => {
			const license = makeLicense({ status: "pending" })
			const updated = makeLicense({ status: "verified", verifiedAt: new Date() })

			;(db.select as jest.Mock).mockReturnValueOnce(mockSelectChain([license]))
			;(db.update as jest.Mock)
				.mockReturnValueOnce(mockUpdateWhereChain([updated]))
				.mockReturnValueOnce(mockUpdateSetWhereChain())

			const result = await service.verify({ id: LICENSE_ID })

			expect(result.status).toBe("verified")
			expect(db.update).toHaveBeenCalledTimes(2)
			expect((db.update as jest.Mock).mock.results[1]?.value.set).toHaveBeenCalledWith(
				expect.objectContaining({
					prcLicenseNumber: "PRC-123456",
					prcExpiry: "2025-12-31",
				})
			)
		})

		it("propagates PTR verification to the staff profile", async () => {
			const ptrLicense = makeLicense({
				licenseType: "PTR",
				licenseNumber: "PTR-987654",
				status: "pending",
				expiryDate: "2026-01-31",
			})
			const updatedLicense = makeLicense({
				licenseType: "PTR",
				licenseNumber: "PTR-987654",
				status: "verified",
			})

			;(db.select as jest.Mock).mockReturnValueOnce(mockSelectChain([ptrLicense]))
			;(db.update as jest.Mock)
				.mockReturnValueOnce(mockUpdateWhereChain([updatedLicense]))
				.mockReturnValueOnce(mockUpdateSetWhereChain())

			const result = await service.verify({ id: LICENSE_ID })

			expect(result.status).toBe("verified")
			expect((db.update as jest.Mock).mock.results[1]?.value.set).toHaveBeenCalledWith(
				expect.objectContaining({
					ptrNumber: "PTR-987654",
					ptrExpiry: "2026-01-31",
				})
			)
		})

		it("propagates S2 verification to staff profile PDEA credentials", async () => {
			const s2License = makeLicense({
				licenseType: "S2",
				licenseNumber: "S2-222222",
				status: "pending",
				expiryDate: "2026-06-30",
			})
			const updatedLicense = makeLicense({
				licenseType: "S2",
				licenseNumber: "S2-222222",
				status: "verified",
				verifiedAt: new Date(),
			})

			;(db.select as jest.Mock).mockReturnValueOnce(mockSelectChain([s2License]))
			// First update: license status
			;(db.update as jest.Mock)
				.mockReturnValueOnce(mockUpdateWhereChain([updatedLicense]))
				// Second update: staffProfile.s2VerifiedUntil
				.mockReturnValueOnce(mockUpdateSetWhereChain())

			const result = await service.verify({ id: LICENSE_ID })

			expect(result.status).toBe("verified")
			// db.update should have been called twice: once for license, once for staff profile
			expect(db.update).toHaveBeenCalledTimes(2)
			expect((db.update as jest.Mock).mock.results[1]?.value.set).toHaveBeenCalledWith(
				expect.objectContaining({
					pdeaS2License: "S2-222222",
					pdeaS2Expiry: "2026-06-30",
					s2VerifiedUntil: new Date("2026-06-30"),
				})
			)
		})
	})

	// ── sweepExpiredLicenses ─────────────────────────────────────────────────

	describe("sweepExpiredLicenses", () => {
		it("updates verified licenses past expiry date to 'expired'", async () => {
			;(db.update as jest.Mock).mockReturnValueOnce(mockUpdateSetWhereChain())

			await service.sweepExpiredLicenses()

			expect(db.update).toHaveBeenCalledWith(expect.objectContaining({ status: "status" }))
		})
	})
})
