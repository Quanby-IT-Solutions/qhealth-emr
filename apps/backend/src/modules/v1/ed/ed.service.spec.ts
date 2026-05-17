/**
 * Story 3.2 — ED dispose() and OECB billing routing unit tests.
 *
 * Covers:
 *  dispose():
 *   1. Discharge + oecbEligible:true  → ready_for_billing event inserted
 *   2. Discharge + oecbEligible:false → no billing event
 *   3. Admit + bed assignment          → inpatient encounter created, beds updated
 *   4. Transfer                        → discharged, no OECB event
 *   5. Deceased                        → discharged, no OECB event
 *   6. No signed note                  → BadRequestException, transaction skipped
 *   7. Encounter not found             → NotFoundException
 *   8. Encounter already discharged    → BadRequestException
 *
 *  listUnbilledEncounters():
 *   9.  oecbOnly:true  → WHERE includes oecbEligible + encounterType conditions
 *  10.  oecbOnly omitted → WHERE has no OECB conditions
 */

import { BadRequestException, NotFoundException } from "@nestjs/common"

import { db } from "@/common/database/database.client"

import { BillingService } from "../billing/billing.service"
import { EdService } from "./ed.service"

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock("@/common/database/database.client", () => ({
	db: {
		select: jest.fn(),
		insert: jest.fn(),
		update: jest.fn(),
		transaction: jest.fn(),
	},
}))

jest.mock("@repo/db/schema", () => ({
	// ED / core tables
	beds: {
		id: "id",
		status: "status",
		currentEncounterId: "currentEncounterId",
		updatedAt: "updatedAt",
	},
	clinicalNotes: { id: "id", encounterId: "encounterId", status: "status" },
	deathReports: {
		encounterId: "encounterId",
		reportType: "reportType",
		status: "status",
	},
	encounters: {
		id: "id",
		facilityId: "facilityId",
		patientId: "patientId",
		status: "status",
		bedId: "bedId",
		encounterType: "encounterType",
		oecbEligible: "oecbEligible",
		admissionDatetime: "admissionDatetime",
		dischargeDatetime: "dischargeDatetime",
		disposition: "disposition",
		updatedAt: "updatedAt",
		attendingStaffId: "attendingStaffId",
		admittingStaffId: "admittingStaffId",
		chiefComplaint: "chiefComplaint",
	},
	encounterStatusEvents: {
		id: "id",
		facilityId: "facilityId",
		encounterId: "encounterId",
		fromStatus: "fromStatus",
		toStatus: "toStatus",
		workflowType: "workflowType",
		staffId: "staffId",
		slaTargetMinutes: "slaTargetMinutes",
		notes: "notes",
		occurredAt: "occurredAt",
		actualMinutes: "actualMinutes",
	},
	imagingOrders: {},
	ioEntries: {},
	labOrders: {},
	marEntries: {},
	medicationOrders: {},
	preEncounters: {},
	staffProfiles: { id: "id", userId: "userId" },
	tarEntries: {},
	users: {},
	vitalSigns: {},
	wards: {},
	// Billing tables
	patients: {
		id: "id",
		firstName: "firstName",
		lastName: "lastName",
		mrn: "mrn",
		sex: "sex",
		dateOfBirth: "dateOfBirth",
	},
	charges: { id: "id", encounterId: "encounterId", totalAmount: "totalAmount" },
	invoices: { id: "id", encounterId: "encounterId" },
	cewsSnapshots: {},
	cf4Claims: {},
	cf4StatusLog: {},
	cf5Claims: {},
	cf5StatusLog: {},
	chargeMasterItems: {},
	drgMappings: {},
	eligibilityChecks: {},
	esoaStatements: {},
	invoiceLineItems: {},
	konsultaActivities: {},
	operationRecords: {},
	payments: {},
	problems: {},
	receipts: {},
	surgicalRvsAssignments: {},
	// Audit tables
	auditLogs: {},
	breakGlassEvents: {},
	rolePermissions: {},
	userRoles: {},
}))

jest.mock("drizzle-orm", () => ({
	and: (...args: unknown[]) => ({ op: "and", args }),
	count: (col?: unknown) => ({ op: "count", col }),
	desc: (col: unknown) => ({ op: "desc", col }),
	eq: (left: unknown, right: unknown) => ({ op: "eq", left, right }),
	ilike: (col: unknown, pattern: unknown) => ({ op: "ilike", col, pattern }),
	inArray: (col: unknown, vals: unknown) => ({ op: "inArray", col, vals }),
	isNull: (col: unknown) => ({ op: "isNull", col }),
	like: (col: unknown, pattern: unknown) => ({ op: "like", col, pattern }),
	or: (...args: unknown[]) => ({ op: "or", args }),
	sql: Object.assign(
		(strings: TemplateStringsArray, ...vals: unknown[]) => ({ op: "sql", strings, vals }),
		{}
	),
	countDistinct: (col: unknown) => ({ op: "countDistinct", col }),
	gte: (col: unknown, val: unknown) => ({ op: "gte", col, val }),
	lte: (col: unknown, val: unknown) => ({ op: "lte", col, val }),
}))

jest.mock("@/config/env.config", () => ({
	env: { PHILHEALTH_BASE_URL: "https://example.test" },
}))

jest.mock("@/utils/sla-step-target", () => ({
	resolveStepTarget: jest.fn().mockResolvedValue(30),
}))

jest.mock("@/utils/sla-events", () => ({
	closeOpenSlaStep: jest.fn(),
}))

jest.mock("@nestjs/schedule", () => ({
	Cron: () => () => {},
}))

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FACILITY = "fac-00000001-0000-0000-0000-000000000001"
const ENCOUNTER_ID = "enc-00000001-0000-0000-0000-000000000001"

const ACTIVE_ENCOUNTER = {
	id: ENCOUNTER_ID,
	facilityId: FACILITY,
	patientId: "pat-00000001-0000-0000-0000-000000000001",
	status: "active",
	bedId: "bed-00000001-0000-0000-0000-000000000001",
	encounterType: "emergency",
	attendingStaffId: "staff-00000001-0000-0000-0000-000000000001",
	chiefComplaint: "chest pain",
}

const SIGNED_NOTE = { id: "note-00000001-0000-0000-0000-000000000001" }

// ---------------------------------------------------------------------------
// Helpers — EdService
// ---------------------------------------------------------------------------

function makeEdService() {
	const notificationService = { broadcast: jest.fn() }
	return new EdService(notificationService as never)
}

/**
 * Mock the two sequential pre-transaction db.select() calls in dispose():
 *  1st: encounter lookup → [encounter] or []
 *  2nd: signed note check → [signedNote] or []
 */
function mockPreTransactionSelects(
	encounter: object | null,
	signedNote: object | null,
	options?: { patient?: object | null; deathReports?: object[] }
) {
	;(db.select as jest.Mock)
		.mockReturnValueOnce({
			from: jest.fn().mockReturnValue({
				where: jest.fn().mockResolvedValue(encounter ? [encounter] : []),
			}),
		})
		.mockReturnValueOnce({
			from: jest.fn().mockReturnValue({
				where: jest.fn().mockReturnValue({
					limit: jest.fn().mockResolvedValue(signedNote ? [signedNote] : []),
				}),
			}),
		})

	if (options && "patient" in options) {
		;(db.select as jest.Mock).mockReturnValueOnce({
			from: jest.fn().mockReturnValue({
				where: jest.fn().mockReturnValue({
					limit: jest.fn().mockResolvedValue(options.patient ? [options.patient] : []),
				}),
			}),
		})
	}

	if (options?.deathReports) {
		;(db.select as jest.Mock).mockReturnValueOnce({
			from: jest.fn().mockReturnValue({
				where: jest.fn().mockResolvedValue(options.deathReports),
			}),
		})
	}
}

/**
 * Build a minimal transaction mock. insertedValues[] captures every .values() arg
 * so tests can assert which rows were written to encounterStatusEvents.
 */
function makeTxMock() {
	const insertedValues: unknown[] = []

	const txInsert = jest.fn().mockImplementation(() => ({
		values: jest.fn().mockImplementation((vals: unknown) => {
			insertedValues.push(vals)
			return {
				returning: jest.fn().mockResolvedValue([{ id: "inpatient-enc-id" }]),
			}
		}),
	}))

	const txUpdate = jest.fn().mockReturnValue({
		set: jest.fn().mockReturnValue({
			where: jest.fn().mockResolvedValue(undefined),
		}),
	})

	const txSelect = jest.fn().mockReturnValue({
		from: jest.fn().mockReturnValue({
			where: jest.fn().mockReturnValue({
				orderBy: jest.fn().mockReturnValue({
					limit: jest.fn().mockResolvedValue([]),
				}),
			}),
		}),
	})

	const tx = { select: txSelect, insert: txInsert, update: txUpdate }
	return { tx, insertedValues, txInsert, txUpdate }
}

function mockTransaction(tx: object) {
	;(db.transaction as jest.Mock).mockImplementation(
		async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)
	)
}

// ---------------------------------------------------------------------------
// Helpers — BillingService
// ---------------------------------------------------------------------------

function makeBillingService() {
	return new BillingService(null as never, null as never)
}

type WhereArg = { op: string; args?: WhereArg[]; left?: unknown; right?: unknown; col?: unknown }

/**
 * Mock both db.select() calls for listUnbilledEncounters (data + count).
 * Returns the captured WHERE argument from the data query for inspection.
 */
function mockUnbilledSelects(rows: unknown[], total: number) {
	const captured: { where: WhereArg | undefined } = { where: undefined }

	;(db.select as jest.Mock)
		.mockReturnValueOnce({
			from: jest.fn().mockReturnValue({
				innerJoin: jest.fn().mockReturnValue({
					leftJoin: jest.fn().mockReturnValue({
						leftJoin: jest.fn().mockReturnValue({
							where: jest.fn().mockImplementation((cond: WhereArg) => {
								captured.where = cond
								return {
									groupBy: jest.fn().mockReturnValue({
										orderBy: jest.fn().mockReturnValue({
											limit: jest.fn().mockReturnValue({
												offset: jest.fn().mockResolvedValue(rows),
											}),
										}),
									}),
								}
							}),
						}),
					}),
				}),
			}),
		})
		.mockReturnValueOnce({
			from: jest.fn().mockReturnValue({
				leftJoin: jest.fn().mockReturnValue({
					leftJoin: jest.fn().mockReturnValue({
						where: jest.fn().mockResolvedValue([{ total }]),
					}),
				}),
			}),
		})

	return captured
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
	jest.clearAllMocks()
})

// ============================================================================
// EdService.dispose()
// ============================================================================

describe("EdService.dispose()", () => {
	it("throws NotFoundException when encounter not found", async () => {
		;(db.select as jest.Mock).mockReturnValueOnce({
			from: jest.fn().mockReturnValue({
				where: jest.fn().mockResolvedValue([]),
			}),
		})

		const service = makeEdService()
		await expect(
			service.dispose({ encounterId: ENCOUNTER_ID, disposition: "discharge" })
		).rejects.toThrow(NotFoundException)

		expect(db.transaction).not.toHaveBeenCalled()
	})

	it("throws BadRequestException when encounter already discharged", async () => {
		;(db.select as jest.Mock).mockReturnValueOnce({
			from: jest.fn().mockReturnValue({
				where: jest.fn().mockResolvedValue([{ ...ACTIVE_ENCOUNTER, status: "discharged" }]),
			}),
		})

		const service = makeEdService()
		await expect(
			service.dispose({ encounterId: ENCOUNTER_ID, disposition: "discharge" })
		).rejects.toThrow(BadRequestException)

		expect(db.transaction).not.toHaveBeenCalled()
	})

	it("throws BadRequestException when encounter is not an emergency type", async () => {
		;(db.select as jest.Mock).mockReturnValueOnce({
			from: jest.fn().mockReturnValue({
				where: jest.fn().mockResolvedValue([{ ...ACTIVE_ENCOUNTER, encounterType: "inpatient" }]),
			}),
		})

		const service = makeEdService()
		await expect(
			service.dispose({ encounterId: ENCOUNTER_ID, disposition: "discharge" })
		).rejects.toThrow(BadRequestException)

		expect(db.transaction).not.toHaveBeenCalled()
	})

	it("throws BadRequestException and skips transaction when no signed note", async () => {
		mockPreTransactionSelects(ACTIVE_ENCOUNTER, null)

		const service = makeEdService()
		await expect(
			service.dispose({ encounterId: ENCOUNTER_ID, disposition: "discharge" })
		).rejects.toThrow(BadRequestException)

		expect(db.transaction).not.toHaveBeenCalled()
	})

	it("inserts ready_for_billing event for OECB-tagged discharge", async () => {
		mockPreTransactionSelects(ACTIVE_ENCOUNTER, SIGNED_NOTE)
		const { tx, insertedValues } = makeTxMock()
		mockTransaction(tx)

		const service = makeEdService()
		const result = await service.dispose({
			encounterId: ENCOUNTER_ID,
			disposition: "discharge",
			oecbEligible: true,
		})

		expect(result.disposition).toBe("discharge")
		expect(result.oecbEligible).toBe(true)
		expect(insertedValues).toEqual(
			expect.arrayContaining([expect.objectContaining({ toStatus: "ready_for_billing" })])
		)
	})

	it("does not insert billing event for non-OECB discharge", async () => {
		mockPreTransactionSelects(ACTIVE_ENCOUNTER, SIGNED_NOTE)
		const { tx, insertedValues } = makeTxMock()
		mockTransaction(tx)

		const service = makeEdService()
		const result = await service.dispose({
			encounterId: ENCOUNTER_ID,
			disposition: "discharge",
			oecbEligible: false,
		})

		expect(result.disposition).toBe("discharge")
		expect(result.oecbEligible).toBe(false)
		expect(insertedValues).not.toEqual(
			expect.arrayContaining([expect.objectContaining({ toStatus: "ready_for_billing" })])
		)
	})

	it("creates inpatient encounter and updates beds on admit", async () => {
		mockPreTransactionSelects(ACTIVE_ENCOUNTER, SIGNED_NOTE)
		const { tx, txInsert, txUpdate } = makeTxMock()
		mockTransaction(tx)

		const service = makeEdService()
		const result = await service.dispose({
			encounterId: ENCOUNTER_ID,
			disposition: "admit",
			admitWardId: "ward-00000001-0000-0000-0000-000000000001",
			admitBedId: "bed-admit-00000001-0000-0000-0000-000000000001",
		})

		expect(result.inpatientEncounterId).toBe("inpatient-enc-id")
		expect(txInsert).toHaveBeenCalled()
		// Beds updated at least twice (admit bed occupied + ED bed released) plus encounter update
		expect(txUpdate.mock.calls.length).toBeGreaterThanOrEqual(2)
	})

	it("sets disposition transfer with no OECB billing event", async () => {
		mockPreTransactionSelects(ACTIVE_ENCOUNTER, SIGNED_NOTE)
		const { tx, insertedValues } = makeTxMock()
		mockTransaction(tx)

		const service = makeEdService()
		const result = await service.dispose({
			encounterId: ENCOUNTER_ID,
			disposition: "transfer",
		})

		expect(result.disposition).toBe("transfer")
		expect(result.oecbEligible).toBe(false)
		expect(insertedValues).not.toEqual(
			expect.arrayContaining([expect.objectContaining({ toStatus: "ready_for_billing" })])
		)
	})

	it("sets disposition deceased with no OECB billing event", async () => {
		mockPreTransactionSelects(ACTIVE_ENCOUNTER, SIGNED_NOTE, {
			patient: { sex: "male", dateOfBirth: "1980-01-01" },
		})
		const { tx, insertedValues } = makeTxMock()
		mockTransaction(tx)

		const service = makeEdService()
		const result = await service.dispose({
			encounterId: ENCOUNTER_ID,
			disposition: "deceased",
		})

		expect(result.disposition).toBe("deceased")
		expect(insertedValues).not.toEqual(
			expect.arrayContaining([expect.objectContaining({ toStatus: "ready_for_billing" })])
		)
	})

	it("blocks deceased disposition for reproductive-age female without submitted FMDRF", async () => {
		mockPreTransactionSelects(ACTIVE_ENCOUNTER, SIGNED_NOTE, {
			patient: { sex: "female", dateOfBirth: "1995-01-01" },
			deathReports: [],
		})

		const service = makeEdService()
		await expect(
			service.dispose({
				encounterId: ENCOUNTER_ID,
				disposition: "deceased",
			})
		).rejects.toThrow(BadRequestException)

		expect(db.transaction).not.toHaveBeenCalled()
	})

	it("allows deceased disposition for reproductive-age female with submitted FMDRF", async () => {
		mockPreTransactionSelects(ACTIVE_ENCOUNTER, SIGNED_NOTE, {
			patient: { sex: "female", dateOfBirth: "1995-01-01" },
			deathReports: [{ reportType: "fmdrf", status: "submitted" }],
		})
		const { tx, insertedValues } = makeTxMock()
		mockTransaction(tx)

		const service = makeEdService()
		const result = await service.dispose({
			encounterId: ENCOUNTER_ID,
			disposition: "deceased",
		})

		expect(result.disposition).toBe("deceased")
		expect(insertedValues).not.toEqual(
			expect.arrayContaining([expect.objectContaining({ toStatus: "ready_for_billing" })])
		)
	})
})

// ============================================================================
// BillingService.listUnbilledEncounters()
// ============================================================================

describe("BillingService.listUnbilledEncounters()", () => {
	const UNBILLED_ROW = {
		encounterId: "enc-00000001-0000-0000-0000-000000000001",
		patientId: "pat-00000001-0000-0000-0000-000000000001",
		patientName: "Juan Dela Cruz",
		mrn: "MRN-0001",
		encounterType: "emergency",
		oecbEligible: true,
		admittedAt: new Date("2026-01-01"),
		totalCharges: 5000,
		chargeCount: 3,
	}

	it("returns all unbilled encounters with oecbEligible field when oecbOnly is omitted", async () => {
		const captured = mockUnbilledSelects([UNBILLED_ROW], 1)

		const service = makeBillingService()
		const result = await service.listUnbilledEncounters({
			page: 1,
			limit: 20,
			facilityId: FACILITY,
		})

		expect(result.encounters).toHaveLength(1)
		expect(result.encounters[0]).toHaveProperty("oecbEligible")
		expect(result.total).toBe(1)
		expect(result.page).toBe(1)

		// WHERE should have 2 base conditions (facilityId + isNull) and no OECB conditions
		const where = captured.where!
		expect(where.op).toBe("and")
		const oecbCond = where.args?.find(a => a.op === "eq" && a.left === "oecbEligible")
		expect(oecbCond).toBeUndefined()
	})

	it("applies OECB filter conditions when oecbOnly is true", async () => {
		const oecbRow = { ...UNBILLED_ROW, oecbEligible: true, encounterType: "emergency" }
		const captured = mockUnbilledSelects([oecbRow], 1)

		const service = makeBillingService()
		const result = await service.listUnbilledEncounters({
			page: 1,
			limit: 20,
			facilityId: FACILITY,
			oecbOnly: true,
		})

		expect(result.encounters).toHaveLength(1)
		expect(result.encounters[0]!.oecbEligible).toBe(true)
		expect(result.total).toBe(1)

		// WHERE should include eq(oecbEligible, true) and eq(encounterType, "emergency")
		const where = captured.where!
		expect(where.op).toBe("and")

		const oecbCond = where.args?.find(
			a => a.op === "eq" && a.left === "oecbEligible" && a.right === true
		)
		expect(oecbCond).toBeDefined()

		const typeCond = where.args?.find(
			a => a.op === "eq" && a.left === "encounterType" && a.right === "emergency"
		)
		expect(typeCond).toBeDefined()
	})
})
