import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { and, eq } from "drizzle-orm"

import { beds, encounters, gatePasses, patients, staffProfiles, wards } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

import { DischargeClearancesService } from "./discharge-clearances.service"

@Injectable()
export class GatePassService {
	constructor(private readonly clearancesService: DischargeClearancesService) {}

	async generateGatePass(encounterId: string, issuedByStaffId: string) {
		const allConfirmed = await this.clearancesService.allClearancesConfirmed(encounterId)
		if (!allConfirmed) {
			throw new BadRequestException(
				"All three clearances (pharmacy, nursing, billing) must be confirmed before issuing a gate pass"
			)
		}

		// Check for existing gate pass
		const [existing] = await db
			.select()
			.from(gatePasses)
			.where(eq(gatePasses.encounterId, encounterId))

		if (existing) {
			return existing
		}

		const [enc] = await db
			.select({
				id: encounters.id,
				facilityId: encounters.facilityId,
				patientId: encounters.patientId,
				bedId: encounters.bedId,
				status: encounters.status,
				admissionDatetime: encounters.admissionDatetime,
				dischargeDatetime: encounters.dischargeDatetime,
				disposition: encounters.disposition,
			})
			.from(encounters)
			.where(eq(encounters.id, encounterId))

		if (!enc) {
			throw new NotFoundException(`Encounter ${encounterId} not found`)
		}

		if (enc.status !== "discharged" && enc.status !== "pending_discharge") {
			throw new BadRequestException("Gate pass can only be issued for discharged or pending-discharge encounters")
		}

		// Fetch patient name
		const [patient] = await db
			.select({ firstName: patients.firstName, lastName: patients.lastName })
			.from(patients)
			.where(eq(patients.id, enc.patientId))

		const patientName = patient
			? `${patient.firstName} ${patient.lastName}`.trim()
			: "Unknown Patient"

		// Fetch bed and ward info
		let wardName = "Unknown Ward"
		let bedNumber = "N/A"

		if (enc.bedId) {
			const [bedRow] = await db
				.select({ bedNumber: beds.bedNumber, wardId: beds.wardId })
				.from(beds)
				.where(eq(beds.id, enc.bedId))

			if (bedRow) {
				bedNumber = bedRow.bedNumber
				const [wardRow] = await db
					.select({ name: wards.name })
					.from(wards)
					.where(eq(wards.id, bedRow.wardId))

				if (wardRow) wardName = wardRow.name
			}
		}

		const admissionDatetime = enc.admissionDatetime ?? new Date()
		const dischargeDatetime = enc.dischargeDatetime ?? new Date()

		const losMs = dischargeDatetime.getTime() - admissionDatetime.getTime()
		const lengthOfStayDays = Math.max(1, Math.ceil(losMs / 86_400_000))

		// Classify death if applicable
		let deathClassification: "gross" | "net" | null = null
		if (enc.disposition === "deceased") {
			const hoursAdmitted = losMs / 3_600_000
			deathClassification = hoursAdmitted <= 48 ? "gross" : "net"
		}

		const gatePassId = crypto.randomUUID()
		const qrCodePayload = JSON.stringify({
			gatePassId,
			patientName,
			encounterId,
			issuedAt: new Date().toISOString(),
			disposition: enc.disposition,
		})

		const [gatePass] = await db
			.insert(gatePasses)
			.values({
				id: gatePassId,
				encounterId,
				facilityId: enc.facilityId,
				issuedByStaffId,
				patientName,
				wardName,
				bedNumber,
				admissionDatetime,
				dischargeDatetime,
				lengthOfStayDays,
				disposition: enc.disposition ?? "home",
				deathClassification,
				qrCodePayload,
			})
			.returning()

		return gatePass!
	}

	async getGatePass(encounterId: string) {
		const [encounter] = await db
			.select()
			.from(encounters)
			.where(eq(encounters.id, encounterId))

		if (!encounter) {
			throw new NotFoundException(`Encounter ${encounterId} not found`)
		}

		const [gatePass] = await db
			.select()
			.from(gatePasses)
			.where(eq(gatePasses.encounterId, encounterId))

		return gatePass ?? null
	}
}
