import { BadRequestException, NotFoundException } from "@nestjs/common"

import { db } from "@/common/database/database.client"

import { DischargeClearancesService } from "./discharge-clearances.service"

jest.mock("@/common/database/database.client", () => ({
    db: {
        select: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
}))

jest.mock("@repo/db/schema", () => ({
    dischargeClearances: {
        id: "id",
        encounterId: "encounterId",
        type: "type",
        clearedBy: "clearedBy",
        clearedAt: "clearedAt",
        notes: "notes",
        createdAt: "createdAt",
        updatedAt: "updatedAt",
    },
    encounters: { id: "id", status: "status" },
}))

const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
    resolveStaffProfileId: jest.fn().mockResolvedValue("staff-profile-1"),
}

function mockSelectChain(rows: unknown[]) {
    return {
        from: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue(rows) }) }),
        where: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue(rows) }),
    }
}

function mockSelectSimple(rows: unknown[]) {
    return { from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(rows) }) }
}

function mockInsertChain(returnRow: unknown) {
    return { values: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([returnRow]) }) }
}

function mockUpdateWhereChain(returnRows: unknown[]) {
    return { set: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue(returnRows) }) }) }
}

function mockDeleteWhereChain(returnRows: unknown[]) {
    return { where: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue(returnRows) }) }
}

describe("DischargeClearancesService", () => {
    let service: DischargeClearancesService

    beforeEach(() => {
        jest.clearAllMocks()
        service = new DischargeClearancesService(mockAuditService as never)
    })

    it("lists empty clearances as nulls", async () => {
        ;(db.select as jest.Mock).mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) }) })

        const res = await service.listForEncounter("enc-1")
        expect(res).toEqual({ pharmacy: null, nurse: null, billing: null })
    })

    it("creates a clearance when none exists", async () => {
        ;(db.select as jest.Mock)
            .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([{ status: "active" }]) }) }) // ensureEncounter
            .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) }) }) // existing check

        const created = { id: "c1", encounterId: "enc-1", type: "pharmacy", clearedBy: "staff-profile-1", clearedAt: new Date(), notes: null }
        ;(db.insert as jest.Mock).mockReturnValueOnce(mockInsertChain(created))

        const out = await service.recordClearance("enc-1", "pharmacy", undefined, "user-1")

        expect(db.insert).toHaveBeenCalled()
        expect(out.id).toBe("c1")
    })

    it("updates existing clearance on re-post", async () => {
        const existing = { id: "c1", encounterId: "enc-1", type: "pharmacy", clearedBy: "staff-old", clearedAt: new Date(0), notes: null }

        ;(db.select as jest.Mock)
            .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([{ status: "active" }]) }) }) // encounter
            .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([existing]) }) }) // existing

        const updated = { ...existing, clearedBy: "staff-profile-1", clearedAt: new Date(), notes: "ok" }
        ;(db.update as jest.Mock).mockReturnValueOnce(mockUpdateWhereChain([updated]))

        const out = await service.recordClearance("enc-1", "pharmacy", "ok", "user-1")
        expect(db.update).toHaveBeenCalled()
        expect(out.clearedBy).toBe("staff-profile-1")
        expect(out.notes).toBe("ok")
    })

    it("rejects clearance when encounter status is discharged", async () => {
        ;(db.select as jest.Mock).mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([{ status: "discharged" }]) }) })

        await expect(service.recordClearance("enc-1", "pharmacy", undefined, "user-1")).rejects.toThrow(BadRequestException)
    })

    it("revokes an existing clearance and writes audit", async () => {
        const existing = { id: "c1", encounterId: "enc-1", type: "pharmacy", clearedBy: "staff-old", clearedAt: new Date(0), notes: null, facilityId: "fac-1" }

        ;(db.select as jest.Mock)
            .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([{ status: "active" }]) }) }) // encounter
            .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([existing]) }) }) // existing

        ;(db.delete as jest.Mock).mockReturnValueOnce(mockDeleteWhereChain([existing]))

        const res = await service.revokeClearance("enc-1", "pharmacy", "user-1")
        expect(db.delete).toHaveBeenCalled()
        expect(mockAuditService.log).toHaveBeenCalled()
        expect(res).toBeNull()
    })
})
