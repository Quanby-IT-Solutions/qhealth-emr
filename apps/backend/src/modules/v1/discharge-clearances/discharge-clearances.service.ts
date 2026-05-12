import { Injectable, BadRequestException, NotFoundException, Logger } from "@nestjs/common"
import { and, eq } from "drizzle-orm"

import { dischargeClearances, encounters } from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import { AuditService } from "../audit/audit.service"

type ClearanceItem = {
    id: string
    encounterId: string
    type: "billing" | "pharmacy" | "nurse"
    clearedBy: string | null
    clearedAt: Date | null
    notes: string | null
    createdAt: Date
    updatedAt: Date
}

@Injectable()
export class DischargeClearancesService {
    private readonly logger = new Logger(DischargeClearancesService.name)

    constructor(private readonly auditService: AuditService) {}

    async listForEncounter(encounterId: string): Promise<{ pharmacy: ClearanceItem | null; nurse: ClearanceItem | null; billing: ClearanceItem | null }> {
        const rows = await db.select().from(dischargeClearances).where(eq(dischargeClearances.encounterId, encounterId))

        const map: { pharmacy: ClearanceItem | null; nurse: ClearanceItem | null; billing: ClearanceItem | null } = {
            pharmacy: null,
            nurse: null,
            billing: null,
        }
        for (const r of rows) {
            map[r.type as "pharmacy" | "nurse" | "billing"] = r as ClearanceItem
        }
        return map
    }

    private async ensureEncounterAcceptsClearance(encounterId: string) {
        const rows = await db.select({ status: encounters.status }).from(encounters).where(eq(encounters.id, encounterId))
        const [enc] = rows
        if (!enc) throw new NotFoundException(`Encounter ${encounterId} not found`)
        if (!(enc.status === "active" || enc.status === "pending_discharge")) {
            throw new BadRequestException(`Cannot modify clearances for encounter in status ${enc.status}`)
        }
    }

    async recordClearance(encounterId: string, type: "pharmacy" | "nurse" | "billing", notes: string | undefined, userId: string) {
        await this.ensureEncounterAcceptsClearance(encounterId)

        const now = new Date()

        const staffProfileId = await this.auditService.resolveStaffProfileId(userId)

        const [existing] = await db
            .select()
            .from(dischargeClearances)
            .where(and(eq(dischargeClearances.encounterId, encounterId), eq(dischargeClearances.type, type)))

        if (existing) {
            const [updated] = await db
                .update(dischargeClearances)
                .set({ clearedBy: staffProfileId, clearedAt: now, notes: notes ?? existing.notes })
                .where(eq(dischargeClearances.id, existing.id))
                .returning()

            if (!updated) {
                throw new Error("Failed to update discharge clearance")
            }

            this.logger.log(`Updated clearance ${updated.id} (${type}) for encounter ${encounterId} by ${staffProfileId}`)
            return updated
        }

        const [created] = await db
            .insert(dischargeClearances)
            .values({ encounterId, type, clearedBy: staffProfileId, clearedAt: now, notes: notes ?? null })
            .returning()

        if (!created) throw new Error("Failed to create discharge clearance")

        this.logger.log(`Created clearance ${created.id} (${type}) for encounter ${encounterId} by ${staffProfileId}`)
        return created
    }

    async revokeClearance(encounterId: string, type: "pharmacy" | "nurse" | "billing", userId: string) {
        await this.ensureEncounterAcceptsClearance(encounterId)

        const [existing] = await db
            .select()
            .from(dischargeClearances)
            .where(and(eq(dischargeClearances.encounterId, encounterId), eq(dischargeClearances.type, type)))

        if (!existing) throw new NotFoundException("Clearance not found")

        const [deleted] = await db.delete(dischargeClearances).where(eq(dischargeClearances.id, existing.id)).returning()

        if (!deleted) {
            throw new Error("Failed to delete discharge clearance")
        }

        try {
            // Resolve facilityId from the encounter so audit log has correct context
            // Prefer facilityId from the existing clearance row when available (tests/mocks provide this).
            let facilityId: string | null = (existing as any).facilityId ?? null
            if (!facilityId) {
                const rows = await db.select({ facilityId: encounters.facilityId }).from(encounters).where(eq(encounters.id, existing.encounterId))
                const [enc] = rows
                facilityId = enc?.facilityId ?? null
            }

            if (!facilityId) {
                this.logger.warn("Skipping audit log: could not resolve facilityId for revoked clearance")
            } else {
                const staffProfileId = await this.auditService.resolveStaffProfileId(userId)
                await this.auditService.log({
                    facilityId: facilityId,
                    userId: userId,
                    staffProfileId: staffProfileId,
                    action: "delete",
                    entityType: "discharge_clearance",
                    entityId: deleted.id,
                    beforeState: existing as unknown as Record<string, unknown>,
                    afterState: null,
                    ipAddress: null,
                    userAgent: null,
                    metadata: { revokedBy: staffProfileId },
                })
                // Explicitly return null after successful audit log to satisfy callers/tests
                return null
            }
        } catch (err) {
            this.logger.warn("Failed to write audit log for revoked clearance", err)
        }

        return null
    }
}