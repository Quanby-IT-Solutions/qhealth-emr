import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { SignJWT } from "jose"

import { db } from "@/common/database/database.client"
import { gatePasses, encounters, patients } from "@repo/db/schema"
import { eq } from "drizzle-orm"

@Injectable()
export class GatePassesService {
    private readonly logger = new Logger(GatePassesService.name)

    constructor(private readonly eventEmitter: EventEmitter2) {}

    private getJwtSecret(): Uint8Array {
        const secret = process.env.GATE_PASS_JWT_SECRET ?? process.env.JWT_SECRET
        if (!secret) throw new Error("GATE_PASS_JWT_SECRET is not configured")
        return new TextEncoder().encode(secret)
    }

    async create(encounterId: string, deliveredVia: "print" | "qr" | "both", issuedBy?: string) {
        // Verify encounter exists and is discharged
        const [enc] = await db.select().from(encounters).where(eq(encounters.id, encounterId))
        if (!enc) throw new NotFoundException(`Encounter ${encounterId} not found`)
        if (enc.status !== "discharged") {
            throw new BadRequestException("Gate pass can only be created for discharged encounters")
        }

        // Idempotency: return existing gate pass for this encounter
        const existing = await db.select().from(gatePasses).where(eq(gatePasses.encounterId, encounterId))
        if (existing.length > 0) {
            return existing[0]
        }

        // Create placeholder row first to have an id
        const [created] = await db
            .insert(gatePasses)
            .values({ encounterId, deliveredVia, issuedBy: issuedBy ?? null })
            .returning()

        // Sign JWT token containing gatePassId and encounterId
        const jwtSecret = this.getJwtSecret()
        const token = await new SignJWT({ gatePassId: created.id, encounterId })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("7d")
            .sign(jwtSecret)

        // Persist token
        const [updated] = await db
            .update(gatePasses)
            .set({ qrToken: token, updatedAt: new Date() })
            .where(eq(gatePasses.id, created.id))
            .returning()

        this.logger.log(`Created gate pass ${updated.id} for encounter ${encounterId}`)

        // Emit gate-pass.released for downstream consumers (beds, printing workflows)
        this.eventEmitter.emit("gate-pass.released", {
            gatePassId: updated.id,
            encounterId,
            bedId: enc.bedId ?? null,
        })

        return updated
    }

    async getById(id: string) {
        const [row] = await db
            .select()
            .from(gatePasses)
            .where(eq(gatePasses.id, id))

        if (!row) throw new NotFoundException(`Gate pass ${id} not found`)

        // Join encounter + patient minimal info
        const [enc] = await db
            .select({ id: encounters.id, patientId: encounters.patientId, bedId: encounters.bedId })
            .from(encounters)
            .where(eq(encounters.id, row.encounterId))

        const [pat] = await db
            .select({ id: patients.id, firstName: patients.firstName, lastName: patients.lastName, mrn: patients.mrn })
            .from(patients)
            .where(eq(patients.id, enc.patientId))

        return {
            ...row,
            encounter: enc ?? null,
            patient: pat ?? null,
        }
    }

    async markPrinted(id: string, printedBy?: string) {
        const [row] = await db.select().from(gatePasses).where(eq(gatePasses.id, id))
        if (!row) throw new NotFoundException(`Gate pass ${id} not found`)

        const [updated] = await db
            .update(gatePasses)
            .set({ printedAt: new Date(), updatedAt: new Date() })
            .where(eq(gatePasses.id, id))
            .returning()

        return updated
    }
}
