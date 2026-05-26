import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { and, count, eq, inArray, sql } from "drizzle-orm"

import {
	beds,
	clinicalNotes,
	encounters,
	gatePasses,
	medicationOrders,
	patients,
	prescriptions,
	wards,
} from "@repo/db/schema"

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
				encounterType: encounters.encounterType,
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
			throw new BadRequestException(
				"Gate pass can only be issued for discharged or pending-discharge encounters"
			)
		}

		if (enc.encounterType === "inpatient") {
			const clinicalComplete = await this.inpatientClinicalChecklistComplete(encounterId)
			if (!clinicalComplete) {
				throw new BadRequestException(
					"Clinical discharge checklist must be completed before issuing a gate pass"
				)
			}
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
		const [encounter] = await db.select().from(encounters).where(eq(encounters.id, encounterId))

		if (!encounter) {
			throw new NotFoundException(`Encounter ${encounterId} not found`)
		}

		const [gatePass] = await db
			.select()
			.from(gatePasses)
			.where(eq(gatePasses.encounterId, encounterId))

		return gatePass ?? null
	}

	private async inpatientClinicalChecklistComplete(encounterId: string) {
		const [signedDischargeSummaryRow] = await db
			.select({ n: count() })
			.from(clinicalNotes)
			.where(
				and(
					eq(clinicalNotes.encounterId, encounterId),
					eq(clinicalNotes.noteType, "discharge_summary"),
					eq(clinicalNotes.status, "signed")
				)
			)

		const [finalDiagnosisRow] = await db
			.select({ n: count() })
			.from(clinicalNotes)
			.where(
				and(
					eq(clinicalNotes.encounterId, encounterId),
					eq(clinicalNotes.noteType, "discharge_summary"),
					eq(clinicalNotes.status, "signed"),
					sql`COALESCE((${clinicalNotes.structuredData}->'icd10_diagnosis'->>'icd10Code'), '') <> ''`
				)
			)

		const [followupRow] = await db
			.select({ n: count() })
			.from(clinicalNotes)
			.where(
				and(
					eq(clinicalNotes.encounterId, encounterId),
					eq(clinicalNotes.noteType, "discharge_summary"),
					eq(clinicalNotes.status, "signed"),
					sql`length(trim(COALESCE(${clinicalNotes.structuredData}->>'plan', ''))) > 0`
				)
			)

		const [activeMedRow] = await db
			.select({ n: count() })
			.from(medicationOrders)
			.where(
				and(
					eq(medicationOrders.encounterId, encounterId),
					inArray(medicationOrders.status, ["verified", "active"])
				)
			)

		const [signedPrescriptionRow] = await db
			.select({ n: count() })
			.from(prescriptions)
			.where(
				and(
					eq(prescriptions.encounterId, encounterId),
					inArray(prescriptions.status, ["signed", "issued"])
				)
			)

		const dischargeMedicationComplete =
			(signedPrescriptionRow?.n ?? 0) > 0 || (activeMedRow?.n ?? 0) === 0

		return (
			(signedDischargeSummaryRow?.n ?? 0) > 0 &&
			(finalDiagnosisRow?.n ?? 0) > 0 &&
			(followupRow?.n ?? 0) > 0 &&
			dischargeMedicationComplete
		)
	}
}
