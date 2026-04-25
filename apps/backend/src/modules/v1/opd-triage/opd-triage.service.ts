import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import { and, desc, eq, isNull } from "drizzle-orm"

import { opdTriageIntakes, patients, staffProfiles, users } from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import type { V1Inputs } from "@/config/contract-types"

type CreateOpdTriageInput = V1Inputs["opdTriage"]["create"]
type GetOpdTriageInput = V1Inputs["opdTriage"]["get"]
type ListPendingTriageInput = V1Inputs["opdTriage"]["listPending"]
type LinkOpdTriageToPatientInput = V1Inputs["opdTriage"]["linkToPatient"]

@Injectable()
export class OpdTriageService {
	private readonly logger = new Logger(OpdTriageService.name)

	async create(input: CreateOpdTriageInput) {
		// When patientId is provided, validate the patient exists
		if (input.patientId) {
			const [patient] = await db
				.select({ id: patients.id })
				.from(patients)
				.where(eq(patients.id, input.patientId))

			if (!patient) {
				throw new NotFoundException(`Patient ${input.patientId} not found`)
			}
		}

		const [intake] = await db
			.insert(opdTriageIntakes)
			.values({
				facilityId: input.facilityId,
				patientId: input.patientId ?? null,
				chiefComplaint: input.chiefComplaint,
				systolicBp: input.systolicBp ?? null,
				diastolicBp: input.diastolicBp ?? null,
				temperatureCelsius: input.temperatureCelsius ?? null,
				heartRateBpm: input.heartRateBpm ?? null,
				respiratoryRate: input.respiratoryRate ?? null,
				oxygenSatPct: input.oxygenSatPct ?? null,
				heightCm: input.heightCm ?? null,
				weightKg: input.weightKg ?? null,
				triageNurseStaffId: input.triageNurseStaffId ?? null,
				clinicianStaffId: input.clinicianStaffId ?? null,
			})
			.returning()

		this.logger.log(
			input.patientId
				? `Created OPD triage intake for patient ${input.patientId}`
				: `Created pre-registration OPD triage intake (no patient yet)`
		)
		return intake!
	}

	async findById(input: GetOpdTriageInput) {
		const triageNurseStaff = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("triage_nurse_staff")

		const clinicianStaff = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("clinician_staff")

		const [row] = await db
			.select({
				id: opdTriageIntakes.id,
				facilityId: opdTriageIntakes.facilityId,
				patientId: opdTriageIntakes.patientId,
				arrivalTime: opdTriageIntakes.arrivalTime,
				chiefComplaint: opdTriageIntakes.chiefComplaint,
				systolicBp: opdTriageIntakes.systolicBp,
				diastolicBp: opdTriageIntakes.diastolicBp,
				temperatureCelsius: opdTriageIntakes.temperatureCelsius,
				heartRateBpm: opdTriageIntakes.heartRateBpm,
				respiratoryRate: opdTriageIntakes.respiratoryRate,
				oxygenSatPct: opdTriageIntakes.oxygenSatPct,
				heightCm: opdTriageIntakes.heightCm,
				weightKg: opdTriageIntakes.weightKg,
				triageNurseStaffId: opdTriageIntakes.triageNurseStaffId,
				clinicianStaffId: opdTriageIntakes.clinicianStaffId,
				status: opdTriageIntakes.status,
				encounterId: opdTriageIntakes.encounterId,
				createdAt: opdTriageIntakes.createdAt,
				updatedAt: opdTriageIntakes.updatedAt,
				patientFirstName: patients.firstName,
				patientLastName: patients.lastName,
				patientMrn: patients.mrn,
				triageNurseName: triageNurseStaff.name,
				clinicianName: clinicianStaff.name,
			})
			.from(opdTriageIntakes)
			// leftJoin supports pre-registration intakes that have no patient yet
			.leftJoin(patients, eq(opdTriageIntakes.patientId, patients.id))
			.leftJoin(triageNurseStaff, eq(opdTriageIntakes.triageNurseStaffId, triageNurseStaff.id))
			.leftJoin(clinicianStaff, eq(opdTriageIntakes.clinicianStaffId, clinicianStaff.id))
			.where(eq(opdTriageIntakes.id, input.id))

		if (!row) {
			throw new NotFoundException(`OPD triage intake ${input.id} not found`)
		}

		return {
			...row,
			patientFirstName: row.patientFirstName ?? null,
			patientLastName: row.patientLastName ?? null,
			patientMrn: row.patientMrn ?? null,
			patientName:
				row.patientLastName && row.patientFirstName
					? `${row.patientLastName}, ${row.patientFirstName}`
					: null,
			triageNurseName: row.triageNurseName ?? null,
			clinicianName: row.clinicianName ?? null,
		}
	}

	async listPending(input: ListPendingTriageInput) {
		const conditions = [
			eq(opdTriageIntakes.facilityId, input.facilityId),
		]

		if (input.status) {
			conditions.push(eq(opdTriageIntakes.status, input.status))
		} else {
			conditions.push(eq(opdTriageIntakes.status, "pending_registration"))
		}

		if (input.clinicianStaffId) {
			conditions.push(eq(opdTriageIntakes.clinicianStaffId, input.clinicianStaffId))
		}

		const triageNurseStaff = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("triage_nurse_staff")

		const clinicianStaff = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("clinician_staff")

		const rows = await db
			.select({
				id: opdTriageIntakes.id,
				facilityId: opdTriageIntakes.facilityId,
				patientId: opdTriageIntakes.patientId,
				arrivalTime: opdTriageIntakes.arrivalTime,
				chiefComplaint: opdTriageIntakes.chiefComplaint,
				systolicBp: opdTriageIntakes.systolicBp,
				diastolicBp: opdTriageIntakes.diastolicBp,
				temperatureCelsius: opdTriageIntakes.temperatureCelsius,
				heartRateBpm: opdTriageIntakes.heartRateBpm,
				respiratoryRate: opdTriageIntakes.respiratoryRate,
				oxygenSatPct: opdTriageIntakes.oxygenSatPct,
				heightCm: opdTriageIntakes.heightCm,
				weightKg: opdTriageIntakes.weightKg,
				triageNurseStaffId: opdTriageIntakes.triageNurseStaffId,
				clinicianStaffId: opdTriageIntakes.clinicianStaffId,
				status: opdTriageIntakes.status,
				encounterId: opdTriageIntakes.encounterId,
				createdAt: opdTriageIntakes.createdAt,
				updatedAt: opdTriageIntakes.updatedAt,
				patientFirstName: patients.firstName,
				patientLastName: patients.lastName,
				patientMrn: patients.mrn,
				triageNurseName: triageNurseStaff.name,
				clinicianName: clinicianStaff.name,
			})
			.from(opdTriageIntakes)
			// leftJoin supports pre-registration intakes that have no patient yet
			.leftJoin(patients, eq(opdTriageIntakes.patientId, patients.id))
			.leftJoin(triageNurseStaff, eq(opdTriageIntakes.triageNurseStaffId, triageNurseStaff.id))
			.leftJoin(clinicianStaff, eq(opdTriageIntakes.clinicianStaffId, clinicianStaff.id))
			.where(and(...conditions))
			.orderBy(desc(opdTriageIntakes.arrivalTime))

		return rows.map(row => ({
			...row,
			patientFirstName: row.patientFirstName ?? null,
			patientLastName: row.patientLastName ?? null,
			patientMrn: row.patientMrn ?? null,
			patientName:
				row.patientLastName && row.patientFirstName
					? `${row.patientLastName}, ${row.patientFirstName}`
					: null,
			triageNurseName: row.triageNurseName ?? null,
			clinicianName: row.clinicianName ?? null,
		}))
	}

	async linkToPatient(input: LinkOpdTriageToPatientInput) {
		// Validate the triage intake exists and is still in pre-registration state
		const [existing] = await db
			.select({ id: opdTriageIntakes.id, patientId: opdTriageIntakes.patientId, status: opdTriageIntakes.status })
			.from(opdTriageIntakes)
			.where(eq(opdTriageIntakes.id, input.id))

		if (!existing) {
			throw new NotFoundException(`OPD triage intake ${input.id} not found`)
		}

		// Validate the target patient exists
		const [patient] = await db
			.select({ id: patients.id })
			.from(patients)
			.where(eq(patients.id, input.patientId))

		if (!patient) {
			throw new NotFoundException(`Patient ${input.patientId} not found`)
		}

		const [updated] = await db
			.update(opdTriageIntakes)
			.set({
				patientId: input.patientId,
				status: "registered",
				updatedAt: new Date(),
			})
			.where(eq(opdTriageIntakes.id, input.id))
			.returning()

		this.logger.log(`Linked triage intake ${input.id} to patient ${input.patientId}`)
		return updated!
	}
}
