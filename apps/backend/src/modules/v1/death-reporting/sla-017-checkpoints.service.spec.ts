/**
 * SLA-017 / SLA-023: Flow 7 certificate request, payment, and release checkpoint tests
 *
 * Covers:
 * - createFmdrf creates as status "submitted" with requestedAt/submittedAt but without completedAt
 * - createFndrf creates as status "submitted" with requestedAt/submittedAt
 * - markDeathReportPaid sets paidAt (SLA-017)
 * - markDeathReportReleased sets releasedAt, releasedByStaffId, completedAt, status "completed" (SLA-023)
 * - CivilRegistryService.createBirthRegistration sets requestedAt
 * - CivilRegistryService.markBirthRegistrationPaid sets paidAt
 * - MedicalRecordsService.createMedicalRecordsRequest creates correctly
 * - MedicalRecordsService.markMedicalRecordsPaid sets paidAt
 */

import { NotFoundException } from "@nestjs/common"
import { Test, type TestingModule } from "@nestjs/testing"

import { CivilRegistryService } from "../civil-registry/civil-registry.service"
import { MedicalRecordsService } from "../medical-records/medical-records.service"
import { DeathReportingService } from "./death-reporting.service"

// ---------------------------------------------------------------------------
// DB Mock shared by all services
// ---------------------------------------------------------------------------
const mockInsertValues = jest.fn()
const mockInsertReturning = jest.fn()
const mockInsert = jest.fn()
const mockUpdateSet = jest.fn()
const mockUpdateWhere = jest.fn()
const mockUpdateReturning = jest.fn()
const mockUpdate = jest.fn()
const mockSelectFrom = jest.fn()
const mockSelectWhere = jest.fn()
const mockSelectLimit = jest.fn()
const mockSelect = jest.fn()

const mockDb = {
	insert: mockInsert,
	update: mockUpdate,
	select: mockSelect,
}

jest.mock("@/common/database/database.client", () => ({
	// Use arrow-function wrappers so mockInsert/mockUpdate/mockSelect are accessed
	// lazily (at call time, not factory-creation time). This avoids the TDZ error
	// that occurs when jest.mock factories referencing const variables are hoisted.

	db: {
		insert: (...args: any[]) => mockInsert(...args),
		update: (...args: any[]) => mockUpdate(...args),
		select: (...args: any[]) => mockSelect(...args),
	},
}))

// Also mock the db schema symbols the services use
jest.mock("@repo/db/schema", () => ({
	deathReports: {
		id: "id",
		encounterId: "encounterId",
		reportType: "reportType",
		status: "status",
		paidAt: "paidAt",
		requestedAt: "requestedAt",
		updatedAt: "updatedAt",
	},
	patients: {
		id: "id",
		facilityId: "facilityId",
		sex: "sex",
		dateOfBirth: "dateOfBirth",
	},
	birthRegistrations: {
		id: "id",
		paidAt: "paidAt",
		requestedAt: "requestedAt",
		updatedAt: "updatedAt",
		facilityId: "facilityId",
		patientId: "patientId",
		encounterId: "encounterId",
		status: "status",
		createdAt: "createdAt",
	},
	medicalRecordsRequests: {
		id: "id",
		paidAt: "paidAt",
		updatedAt: "updatedAt",
		facilityId: "facilityId",
		patientId: "patientId",
		encounterId: "encounterId",
		requestType: "requestType",
		status: "status",
		createdAt: "createdAt",
	},
	staffProfiles: { id: "id", userId: "userId" },
	users: { id: "id" },
	encounters: { id: "id", facilityId: "facilityId", patientId: "patientId" },
	encounterStatusEvents: {},
	surveillanceFlags: {
		id: "id",
		encounterId: "encounterId",
		flagType: "flagType",
		triggerValue: "triggerValue",
	},
}))

// ---------------------------------------------------------------------------
// Chain helpers
// ---------------------------------------------------------------------------
function setupInsert(returnRow: Record<string, unknown>) {
	mockInsertReturning.mockResolvedValue([returnRow])
	mockInsertValues.mockReturnValue({ returning: mockInsertReturning })
	mockInsert.mockReturnValue({ values: mockInsertValues })
}

function setupUpdate(returnRow: Record<string, unknown>) {
	mockUpdateReturning.mockResolvedValue([returnRow])
	mockUpdateWhere.mockReturnValue({ returning: mockUpdateReturning })
	mockUpdateSet.mockReturnValue({ where: mockUpdateWhere })
	mockUpdate.mockReturnValue({ set: mockUpdateSet })
}

function setupSelectEmpty() {
	mockSelectLimit.mockResolvedValue([])
	mockSelectWhere.mockReturnValue({ limit: mockSelectLimit })
	mockSelectFrom.mockReturnValue({
		where: mockSelectWhere,
		leftJoin: jest.fn().mockReturnValue({ where: mockSelectWhere }),
	})
	mockSelect.mockReturnValue({ from: mockSelectFrom })
}

function setupSelectRow(row: Record<string, unknown>) {
	mockSelectLimit.mockResolvedValue([row])
	mockSelectWhere.mockReturnValue({ limit: mockSelectLimit })
	mockSelectFrom.mockReturnValue({
		where: mockSelectWhere,
		leftJoin: jest.fn().mockReturnValue({ where: mockSelectWhere }),
	})
	mockSelect.mockReturnValue({ from: mockSelectFrom })
}

function bypassFmdrfGuards(service: DeathReportingService) {
	jest
		.spyOn(
			service as unknown as { assertCanCreateFmdrf(input: unknown): Promise<void> },
			"assertCanCreateFmdrf"
		)
		.mockResolvedValue(undefined)
	jest
		.spyOn(
			service as unknown as {
				forwardSubmittedFmdrfToSurveillance(input: unknown, id: string): Promise<void>
			},
			"forwardSubmittedFmdrfToSurveillance"
		)
		.mockResolvedValue(undefined)
}

function bypassFndrfGuards(service: DeathReportingService) {
	jest
		.spyOn(
			service as unknown as { assertCanCreateFndrf(input: unknown): Promise<void> },
			"assertCanCreateFndrf"
		)
		.mockResolvedValue(undefined)
	jest
		.spyOn(
			service as unknown as {
				forwardSubmittedFndrfToSurveillance(input: unknown, id: string): Promise<void>
			},
			"forwardSubmittedFndrfToSurveillance"
		)
		.mockResolvedValue(undefined)
}

// ---------------------------------------------------------------------------
// DeathReportingService tests
// ---------------------------------------------------------------------------
describe("DeathReportingService — SLA-017 checkpoints", () => {
	let service: DeathReportingService

	beforeEach(async () => {
		jest.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			providers: [DeathReportingService],
		}).compile()

		service = module.get<DeathReportingService>(DeathReportingService)
	})

	describe("markDeathReportPaid", () => {
		it("sets paidAt on the death report", async () => {
			const id = "death-report-uuid"
			const expectedPaidAt = new Date()
			const returnRow = { id, paidAt: expectedPaidAt }

			setupUpdate(returnRow)

			const result = await service.markDeathReportPaid({ id })

			expect(mockUpdateSet).toHaveBeenCalledWith(
				expect.objectContaining({ paidAt: expect.any(Date) })
			)
			expect(result.paidAt).toBe(expectedPaidAt.toISOString())
		})

		it("uses provided paidAt when supplied", async () => {
			const id = "death-report-uuid"
			const customPaidAt = new Date("2024-06-15T10:00:00Z")
			const returnRow = { id, paidAt: customPaidAt }

			setupUpdate(returnRow)

			const result = await service.markDeathReportPaid({ id, paidAt: customPaidAt })

			expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ paidAt: customPaidAt }))
			expect(result.paidAt).toBe(customPaidAt.toISOString())
		})

		it("throws NotFoundException when report not found", async () => {
			mockUpdateReturning.mockResolvedValue([])
			mockUpdateWhere.mockReturnValue({ returning: mockUpdateReturning })
			mockUpdateSet.mockReturnValue({ where: mockUpdateWhere })
			mockUpdate.mockReturnValue({ set: mockUpdateSet })

			await expect(service.markDeathReportPaid({ id: "nonexistent" })).rejects.toThrow(
				NotFoundException
			)
		})
	})
})

// ---------------------------------------------------------------------------
// CivilRegistryService tests
// ---------------------------------------------------------------------------
describe("CivilRegistryService — SLA-017 checkpoints", () => {
	let service: CivilRegistryService

	beforeEach(async () => {
		jest.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			providers: [CivilRegistryService],
		}).compile()

		service = module.get<CivilRegistryService>(CivilRegistryService)
	})

	describe("createBirthRegistration", () => {
		it("sets requestedAt to now on creation (SLA-017 checkpoint)", async () => {
			const created = {
				id: "birth-reg-uuid",
				facilityId: "fac-001",
				patientId: "pat-001",
				encounterId: null,
				birthDatetime: new Date("2024-06-01"),
				registeredByStaffId: null,
				certificateNumber: null,
				status: "draft",
				requestedAt: new Date(),
				paidAt: null,
				completedAt: null,
				submittedAt: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			}

			setupInsert(created)

			let capturedValues: Record<string, unknown> = {}
			mockInsertValues.mockImplementation((vals: Record<string, unknown>) => {
				capturedValues = vals
				return { returning: mockInsertReturning }
			})
			mockInsertReturning.mockResolvedValue([created])

			await service.createBirthRegistration({
				facilityId: "fac-001",
				patientId: "pat-001",
				birthDatetime: "2024-06-01T00:00:00Z",
			})

			expect(capturedValues.requestedAt).toBeInstanceOf(Date)
		})
	})

	describe("markBirthRegistrationPaid", () => {
		it("sets paidAt on the birth registration", async () => {
			const id = "birth-reg-uuid"
			const paidAt = new Date()
			const returnRow = { id, paidAt }

			setupUpdate(returnRow)

			const result = await service.markBirthRegistrationPaid({ id })

			expect(mockUpdateSet).toHaveBeenCalledWith(
				expect.objectContaining({ paidAt: expect.any(Date) })
			)
			expect(result.paidAt).toBe(paidAt.toISOString())
		})

		it("throws NotFoundException when birth registration not found", async () => {
			mockUpdateReturning.mockResolvedValue([])
			mockUpdateWhere.mockReturnValue({ returning: mockUpdateReturning })
			mockUpdateSet.mockReturnValue({ where: mockUpdateWhere })
			mockUpdate.mockReturnValue({ set: mockUpdateSet })

			await expect(service.markBirthRegistrationPaid({ id: "nonexistent" })).rejects.toThrow(
				NotFoundException
			)
		})
	})
})

// ---------------------------------------------------------------------------
// MedicalRecordsService tests
// ---------------------------------------------------------------------------
describe("MedicalRecordsService — SLA-017 checkpoints", () => {
	let service: MedicalRecordsService

	beforeEach(async () => {
		jest.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			providers: [MedicalRecordsService],
		}).compile()

		service = module.get<MedicalRecordsService>(MedicalRecordsService)
	})

	describe("createMedicalRecordsRequest", () => {
		it("creates a request with status 'pending'", async () => {
			const created = {
				id: "med-req-uuid",
				facilityId: "fac-001",
				patientId: "pat-001",
				encounterId: null,
				requestType: "medical_certificate",
				requestedByName: "Jane Doe",
				requestedByRelationship: null,
				purpose: null,
				status: "pending",
				processedByStaffId: null,
				completedAt: null,
				paidAt: null,
				rejectionReason: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			}

			setupInsert(created)

			const result = await service.createMedicalRecordsRequest({
				facilityId: "fac-001",
				patientId: "pat-001",
				requestType: "medical_certificate",
				requestedByName: "Jane Doe",
			})

			expect(result.status).toBe("pending")
			expect(mockInsertValues).toHaveBeenCalledWith(expect.objectContaining({ status: "pending" }))
		})
	})

	describe("markMedicalRecordsPaid", () => {
		it("sets paidAt on the medical records request", async () => {
			const id = "med-req-uuid"
			const paidAt = new Date()
			const returnRow = { id, paidAt }

			setupUpdate(returnRow)

			const result = await service.markMedicalRecordsPaid({ id })

			expect(mockUpdateSet).toHaveBeenCalledWith(
				expect.objectContaining({ paidAt: expect.any(Date) })
			)
			expect(result.paidAt).toBe(paidAt.toISOString())
		})

		it("throws NotFoundException when request not found", async () => {
			mockUpdateReturning.mockResolvedValue([])
			mockUpdateWhere.mockReturnValue({ returning: mockUpdateReturning })
			mockUpdateSet.mockReturnValue({ where: mockUpdateWhere })
			mockUpdate.mockReturnValue({ set: mockUpdateSet })

			await expect(service.markMedicalRecordsPaid({ id: "nonexistent" })).rejects.toThrow(
				NotFoundException
			)
		})
	})
})

// ---------------------------------------------------------------------------
// SLA-023: FMDRF lifecycle
// ---------------------------------------------------------------------------
describe("DeathReportingService — SLA-023 FMDRF lifecycle", () => {
	let service: DeathReportingService

	const baseDeathReport = {
		id: "fmdrf-uuid",
		encounterId: "enc-001",
		patientId: "pat-001",
		facilityId: "fac-001",
		reportType: "fmdrf",
		deathDatetime: new Date("2024-06-01T00:00:00Z"),
		causeOfDeath: "Hemorrhage",
		maternalHistory: null,
		physicianCertification: null,
		contributingFactors: [],
		neonatalDetails: null,
		status: "submitted",
		requestedAt: new Date(),
		submittedAt: new Date(),
		paidAt: null,
		releasedAt: null,
		releasedByStaffId: null,
		completedAt: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	}

	const minimalFmdrfInput = {
		encounterId: "enc-001",
		patientId: "pat-001",
		facilityId: "fac-001",
		patientName: "Jane Doe",
		patientMrn: "MRN-001",
		patientAge: 30,
		patientAddress: "123 Main St",
		dateOfDeath: "2024-06-01T00:00:00Z",
		placeOfDeath: "Ward 3",
		causeOfDeathImmediate: "Hemorrhage",
		causeOfDeathAntecedent: "",
		causeOfDeathUnderlying: "Postpartum hemorrhage",
		causeOfDeathContributing: null,
		gravidity: 1,
		parity: 0,
		lastMenstrualPeriod: null,
		gestationalAgeWeeks: null,
		antenatalCare: false,
		antenatalVisitCount: null,
		complicationType: null,
		factorHemorrhage: true,
		factorSepsis: false,
		factorEclampsia: false,
		factorObstructedLabor: false,
		factorUnsafeAbortion: false,
		factorOther: null,
		avoidableFactors: false,
		avoidableRemark: null,
		physicianName: "Dr. Smith",
		physicianLicenseNo: "PRC-001",
		physicianSignatureDataUrl: "data:image/png;base64,abc",
		certificationDate: "2024-06-01",
	}

	beforeEach(async () => {
		jest.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			providers: [DeathReportingService],
		}).compile()

		service = module.get<DeathReportingService>(DeathReportingService)
	})

	describe("createFmdrf", () => {
		it("creates with status 'submitted' after physician signature", async () => {
			bypassFmdrfGuards(service)
			let capturedValues: Record<string, unknown> = {}
			mockInsertValues.mockImplementation((vals: Record<string, unknown>) => {
				capturedValues = vals
				return { returning: mockInsertReturning }
			})
			mockInsertReturning.mockResolvedValue([baseDeathReport])
			mockInsert.mockReturnValue({ values: mockInsertValues })

			await service.createFmdrf(minimalFmdrfInput)

			expect(capturedValues.status).toBe("submitted")
		})

		it("does not set completedAt on physician submission", async () => {
			bypassFmdrfGuards(service)
			let capturedValues: Record<string, unknown> = {}
			mockInsertValues.mockImplementation((vals: Record<string, unknown>) => {
				capturedValues = vals
				return { returning: mockInsertReturning }
			})
			mockInsertReturning.mockResolvedValue([baseDeathReport])
			mockInsert.mockReturnValue({ values: mockInsertValues })

			await service.createFmdrf(minimalFmdrfInput)

			expect(capturedValues).not.toHaveProperty("completedAt")
		})

		it("sets requestedAt to now on creation (SLA-017: Step 1 evidence)", async () => {
			bypassFmdrfGuards(service)
			let capturedValues: Record<string, unknown> = {}
			mockInsertValues.mockImplementation((vals: Record<string, unknown>) => {
				capturedValues = vals
				return { returning: mockInsertReturning }
			})
			mockInsertReturning.mockResolvedValue([baseDeathReport])
			mockInsert.mockReturnValue({ values: mockInsertValues })

			await service.createFmdrf(minimalFmdrfInput)

			expect(capturedValues.requestedAt).toBeInstanceOf(Date)
		})

		it("sets submittedAt to now on physician submission", async () => {
			bypassFmdrfGuards(service)
			let capturedValues: Record<string, unknown> = {}
			mockInsertValues.mockImplementation((vals: Record<string, unknown>) => {
				capturedValues = vals
				return { returning: mockInsertReturning }
			})
			mockInsertReturning.mockResolvedValue([baseDeathReport])
			mockInsert.mockReturnValue({ values: mockInsertValues })

			await service.createFmdrf(minimalFmdrfInput)

			expect(capturedValues.submittedAt).toBeInstanceOf(Date)
		})
	})

	describe("markDeathReportReleased", () => {
		it("sets releasedAt, releasedByStaffId, completedAt, and status 'completed' (SLA-023: close lifecycle)", async () => {
			const id = "fmdrf-uuid"
			const releasedAt = new Date("2024-06-02T10:00:00Z")
			const releasedByStaffId = "staff-001"
			const returnRow = {
				id,
				releasedByStaffId,
				releasedAt,
				completedAt: releasedAt,
				status: "completed",
			}

			setupUpdate(returnRow)

			const result = await service.markDeathReportReleased({ id, releasedByStaffId, releasedAt })

			expect(mockUpdateSet).toHaveBeenCalledWith(
				expect.objectContaining({
					releasedByStaffId,
					releasedAt,
					completedAt: releasedAt,
					status: "completed",
				})
			)
			expect(result.status).toBe("completed")
			expect(result.releasedByStaffId).toBe(releasedByStaffId)
			expect(result.releasedAt).toBe(releasedAt.toISOString())
		})

		it("uses current time for releasedAt when not supplied", async () => {
			const id = "fmdrf-uuid"
			const returnRow = {
				id,
				releasedByStaffId: "staff-001",
				releasedAt: new Date(),
				completedAt: new Date(),
				status: "completed",
			}

			setupUpdate(returnRow)

			await service.markDeathReportReleased({ id, releasedByStaffId: "staff-001" })

			expect(mockUpdateSet).toHaveBeenCalledWith(
				expect.objectContaining({
					releasedAt: expect.any(Date),
					completedAt: expect.any(Date),
					status: "completed",
				})
			)
		})

		it("throws NotFoundException when report not found", async () => {
			mockUpdateReturning.mockResolvedValue([])
			mockUpdateWhere.mockReturnValue({ returning: mockUpdateReturning })
			mockUpdateSet.mockReturnValue({ where: mockUpdateWhere })
			mockUpdate.mockReturnValue({ set: mockUpdateSet })

			await expect(
				service.markDeathReportReleased({ id: "nonexistent", releasedByStaffId: "staff-001" })
			).rejects.toThrow(NotFoundException)
		})
	})
})

// ---------------------------------------------------------------------------
// SLA-023: FNDRF lifecycle parity with FMDRF
// ---------------------------------------------------------------------------
describe("DeathReportingService — SLA-023 FNDRF lifecycle parity", () => {
	let service: DeathReportingService

	const baseFndrfReport = {
		id: "fndrf-uuid",
		encounterId: "enc-002",
		patientId: "pat-002",
		facilityId: "fac-001",
		reportType: "fndrf",
		deathDatetime: new Date("2024-06-01T00:00:00Z"),
		causeOfDeath: "Prematurity",
		maternalHistory: null,
		physicianCertification: null,
		contributingFactors: [],
		neonatalDetails: null,
		status: "submitted",
		requestedAt: new Date(),
		submittedAt: new Date(),
		paidAt: null,
		releasedAt: null,
		releasedByStaffId: null,
		completedAt: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	}

	const minimalFndrfInput = {
		encounterId: "enc-002",
		patientId: "pat-002",
		facilityId: "fac-001",
		newbornName: "Baby Doe",
		newbornMrn: "MRN-002",
		newbornDateOfBirth: "2024-06-01T00:00:00Z",
		gestationalAgeWeeks: 28,
		birthWeightGrams: 950,
		deliveryType: "svd" as const,
		apgarScore1Min: null,
		apgarScore5Min: null,
		resuscitationRequired: true,
		motherName: "Jane Doe",
		motherAge: 25,
		motherGravidity: 1,
		motherParity: 0,
		motherAncVisits: null,
		dateOfDeath: "2024-06-01T00:00:00Z",
		ageAtDeathHours: 6,
		ageAtDeathDays: null,
		placeOfDeath: "NICU",
		causePrematurity: true,
		causeBirthAsphyxia: false,
		causeSepsis: false,
		causeCongenitalAnomaly: false,
		causeRds: false,
		causeOther: null,
		contributingRemarks: null,
		physicianName: "Dr. Smith",
		physicianLicenseNo: "PRC-001",
		physicianSignatureDataUrl: "data:image/png;base64,abc",
		certificationDate: "2024-06-01",
	}

	beforeEach(async () => {
		jest.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			providers: [DeathReportingService],
		}).compile()

		service = module.get<DeathReportingService>(DeathReportingService)
	})

	describe("createFndrf", () => {
		it("creates with status 'submitted' after physician signature", async () => {
			bypassFndrfGuards(service)
			let capturedValues: Record<string, unknown> = {}
			mockInsertValues.mockImplementation((vals: Record<string, unknown>) => {
				capturedValues = vals
				return { returning: mockInsertReturning }
			})
			mockInsertReturning.mockResolvedValue([baseFndrfReport])
			mockInsert.mockReturnValue({ values: mockInsertValues })

			await service.createFndrf(minimalFndrfInput)

			expect(capturedValues.status).toBe("submitted")
		})

		it("does not set completedAt on creation (lifecycle stays open until release)", async () => {
			bypassFndrfGuards(service)
			let capturedValues: Record<string, unknown> = {}
			mockInsertValues.mockImplementation((vals: Record<string, unknown>) => {
				capturedValues = vals
				return { returning: mockInsertReturning }
			})
			mockInsertReturning.mockResolvedValue([baseFndrfReport])
			mockInsert.mockReturnValue({ values: mockInsertValues })

			await service.createFndrf(minimalFndrfInput)

			expect(capturedValues).not.toHaveProperty("completedAt")
		})

		it("sets requestedAt to now on creation (SLA-017: Step 1 evidence)", async () => {
			bypassFndrfGuards(service)
			let capturedValues: Record<string, unknown> = {}
			mockInsertValues.mockImplementation((vals: Record<string, unknown>) => {
				capturedValues = vals
				return { returning: mockInsertReturning }
			})
			mockInsertReturning.mockResolvedValue([baseFndrfReport])
			mockInsert.mockReturnValue({ values: mockInsertValues })

			await service.createFndrf(minimalFndrfInput)

			expect(capturedValues.requestedAt).toBeInstanceOf(Date)
		})

		it("sets submittedAt to now on physician submission", async () => {
			bypassFndrfGuards(service)
			let capturedValues: Record<string, unknown> = {}
			mockInsertValues.mockImplementation((vals: Record<string, unknown>) => {
				capturedValues = vals
				return { returning: mockInsertReturning }
			})
			mockInsertReturning.mockResolvedValue([baseFndrfReport])
			mockInsert.mockReturnValue({ values: mockInsertValues })

			await service.createFndrf(minimalFndrfInput)

			expect(capturedValues.submittedAt).toBeInstanceOf(Date)
		})

		it("persists mandated neonatal review details", async () => {
			bypassFndrfGuards(service)
			let capturedValues: Record<string, unknown> = {}
			mockInsertValues.mockImplementation((vals: Record<string, unknown>) => {
				capturedValues = vals
				return { returning: mockInsertReturning }
			})
			mockInsertReturning.mockResolvedValue([baseFndrfReport])
			mockInsert.mockReturnValue({ values: mockInsertValues })

			await service.createFndrf(minimalFndrfInput)

			expect(capturedValues.neonatalDetails).toEqual(
				expect.objectContaining({
					newbornName: "Baby Doe",
					newbornMrn: "MRN-002",
					birthWeight: 950,
					gestationalAgeWeeks: 28,
					resuscitationRequired: true,
					motherName: "Jane Doe",
					placeOfDeath: "NICU",
				})
			)
		})
	})
})
