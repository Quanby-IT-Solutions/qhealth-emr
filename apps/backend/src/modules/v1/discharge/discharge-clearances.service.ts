import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { and, eq } from "drizzle-orm"

import { dischargeClearances, encounters } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

@Injectable()
export class DischargeClearancesService {
	async getClearanceStatus(encounterId: string) {
		const [encounter] = await db.select().from(encounters).where(eq(encounters.id, encounterId))

		if (!encounter) {
			throw new NotFoundException(`Encounter ${encounterId} not found`)
		}

		const [row] = await db
			.select()
			.from(dischargeClearances)
			.where(eq(dischargeClearances.encounterId, encounterId))

		const pharmacyCleared = !!row?.pharmacyClearedAt
		const nursingCleared = !!row?.nursingClearedAt
		const billingSignedOff = !!row?.billingSignedOffAt

		return {
			encounterId,
			pharmacyCleared,
			pharmacyClearedAt: row?.pharmacyClearedAt?.toISOString() ?? null,
			nursingCleared,
			nursingClearedAt: row?.nursingClearedAt?.toISOString() ?? null,
			billingSignedOff,
			billingSignedOffAt: row?.billingSignedOffAt?.toISOString() ?? null,
			allConfirmed: pharmacyCleared && nursingCleared && billingSignedOff,
		}
	}

	async allClearancesConfirmed(encounterId: string): Promise<boolean> {
		const [row] = await db
			.select()
			.from(dischargeClearances)
			.where(eq(dischargeClearances.encounterId, encounterId))

		return !!(row?.pharmacyClearedAt && row.nursingClearedAt && row.billingSignedOffAt)
	}

	async confirmPharmacyClearance(encounterId: string, staffId: string) {
		await this.ensureEncounterPendingDischarge(encounterId)
		await this.upsertClearance(encounterId, {
			pharmacyClearedAt: new Date(),
			pharmacyClearedByStaffId: staffId,
		})
		return this.getClearanceStatus(encounterId)
	}

	async confirmNursingClearance(encounterId: string, staffId: string) {
		await this.ensureEncounterPendingDischarge(encounterId)
		await this.upsertClearance(encounterId, {
			nursingClearedAt: new Date(),
			nursingClearedByStaffId: staffId,
		})
		return this.getClearanceStatus(encounterId)
	}

	async confirmBillingSignOff(encounterId: string, staffId: string) {
		await this.ensureEncounterPendingDischarge(encounterId)
		await this.upsertClearance(encounterId, {
			billingSignedOffAt: new Date(),
			billingSignedOffByStaffId: staffId,
		})
		return this.getClearanceStatus(encounterId)
	}

	private async ensureEncounterPendingDischarge(encounterId: string) {
		const [encounter] = await db.select().from(encounters).where(eq(encounters.id, encounterId))

		if (!encounter) {
			throw new NotFoundException(`Encounter ${encounterId} not found`)
		}

		if (encounter.status !== "pending_discharge") {
			throw new BadRequestException(
				"Clearances can only be confirmed for encounters with status pending_discharge"
			)
		}

		return encounter
	}

	private async upsertClearance(
		encounterId: string,
		values: Partial<typeof dischargeClearances.$inferInsert>
	) {
		const [encounter] = await db
			.select({ facilityId: encounters.facilityId })
			.from(encounters)
			.where(eq(encounters.id, encounterId))

		await db
			.insert(dischargeClearances)
			.values({
				encounterId,
				facilityId: encounter!.facilityId,
				...values,
			})
			.onConflictDoUpdate({
				target: dischargeClearances.encounterId,
				set: {
					...values,
					updatedAt: new Date(),
				},
			})
	}
}
