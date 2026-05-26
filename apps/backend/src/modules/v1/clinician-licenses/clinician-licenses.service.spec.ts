/**
 * ClinicianLicensesService — unit tests for ADM-BE-02, ADM-BE-05
 *
 * Covers:
 * 1. add — inserts a new license record
 * 2. verify — sets status to "verified"; propagates PRC/PTR/S2 to staffProfile credentials
 * 3. sweepExpiredLicenses — bulk-sets expired verified licenses to "expired"
 */

import { NotFoundException } from "@nestjs/common"

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

	// ── verify ───────────────────────────────────────────────────────────────

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
