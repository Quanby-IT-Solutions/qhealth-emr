import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import { and, count, desc, eq, gte, inArray, lte, sql } from "drizzle-orm"

import {
	consentRecords,
	encounters,
	flowsheetEntries,
	haiTags,
	ioEntries,
	marEntries,
	medicationOrders,
	problems,
	shiftHandoffs,
	staffProfiles,
	tarEntries,
	vitalSigns,
} from "@repo/db/schema"

import { db } from "@/common/database/database.client"

// ============================================================================
// Input Types (explicit — avoids TypeScript depth limit on InferContractRouterInputs)
// ============================================================================

interface VitalSignListInput {
	page: number
	limit: number
	facilityId?: string
	encounterId?: string
	preEncounterId?: string
}

interface CreateVitalSignInput {
	facilityId: string
	encounterId?: string
	preEncounterId?: string
	temperature?: number
	bpSystolic?: number
	bpDiastolic?: number
	heartRate?: number
	respiratoryRate?: number
	spo2?: number
	painScore?: number
	weight?: number
	height?: number
}

interface MarEntryListInput {
	page: number
	limit: number
	facilityId?: string
	encounterId?: string
	preEncounterId?: string
	status?: "due" | "given" | "missed" | "held" | "refused"
	scheduledFrom?: string
	scheduledTo?: string
}

interface AdministerMarInput {
	id: string
	status: "due" | "given" | "missed" | "held" | "refused"
	administeredDose?: string
	administeredRoute?: string
	prnReason?: string
	notes?: string
}

interface TarEntryListInput {
	page: number
	limit: number
	facilityId?: string
	encounterId?: string
	preEncounterId?: string
	status?: "due" | "given" | "missed" | "held" | "refused"
}

interface CreateTarEntryInput {
	facilityId: string
	encounterId?: string
	preEncounterId?: string
	treatmentDescription: string
	scheduledTime: string
}

interface AdministerTarInput {
	id: string
	status: "due" | "given" | "missed" | "held" | "refused"
	notes?: string
}

interface IoEntryListInput {
	page: number
	limit: number
	facilityId?: string
	encounterId?: string
	preEncounterId?: string
	ioType?: "intake" | "output"
}

interface CreateIoEntryInput {
	facilityId: string
	encounterId?: string
	preEncounterId?: string
	ioType: "intake" | "output"
	route: string
	description?: string
	amountMl: number
}

interface IoBalanceInput {
	encounterId: string
	facilityId?: string
}

interface FlowsheetListInput {
	page: number
	limit: number
	encounterId: string
	facilityId?: string
	parameterName?: string
	dateFrom?: string
	dateTo?: string
}

interface HandoffListInput {
	page: number
	limit: number
	facilityId?: string
	encounterId?: string
	outgoingStaffId?: string
}

interface GenerateHandoffInput {
	encounterId: string
	facilityId?: string
}

interface CreateHandoffInput {
	facilityId: string
	encounterId: string
	incomingStaffId?: string
	handoffNotes?: string
}

interface FinalizeHandoffInput {
	id: string
}

interface HaiTagListInput {
	page: number
	limit: number
	facilityId?: string
	encounterId?: string
	haiType?: "clabsi" | "cauti" | "vap" | "ssi" | "cdiff"
	status?: "suspected" | "confirmed" | "resolved"
}

interface CreateHaiTagInput {
	facilityId: string
	encounterId: string
	haiType: "clabsi" | "cauti" | "vap" | "ssi" | "cdiff"
	onsetDate: string
	notes?: string
}

interface UpdateHaiTagInput {
	id: string
	status?: "suspected" | "confirmed" | "resolved"
	notes?: string
}

interface ConsentRecordListInput {
	page: number
	limit: number
	facilityId?: string
	encounterId?: string
	preEncounterId?: string
	consentType?: string
}

interface CreateConsentRecordInput {
	facilityId: string
	encounterId?: string
	preEncounterId?: string
	consentType: string
	consentText?: string
	patientSignature?: string
	guardianSignature?: string
	witnessSignature?: string
}

@Injectable()
export class NursingService {
	private readonly logger = new Logger(NursingService.name)

	// ========================================================================
	// NEWS Score Calculation
	// ========================================================================

	private calculateNEWS(vitals: {
		respiratoryRate?: number | null
		spo2?: number | string | null
		temperature?: number | string | null
		bpSystolic?: number | null
		heartRate?: number | null
	}): { newsScore: number; newsRiskLevel: "low" | "medium" | "high" } {
		let score = 0

		// Respiratory Rate
		const rr = vitals.respiratoryRate
		if (rr != null) {
			if (rr <= 8) score += 3
			else if (rr <= 11) score += 1
			else if (rr <= 20) score += 0
			else if (rr <= 24) score += 2
			else score += 3
		}

		// SpO2
		const spo2Val = vitals.spo2 != null ? Number(vitals.spo2) : null
		if (spo2Val != null) {
			if (spo2Val <= 91) score += 3
			else if (spo2Val <= 93) score += 2
			else if (spo2Val <= 95) score += 1
			else score += 0
		}

		// Temperature
		const tempVal = vitals.temperature != null ? Number(vitals.temperature) : null
		if (tempVal != null) {
			if (tempVal <= 35.0) score += 3
			else if (tempVal <= 36.0) score += 1
			else if (tempVal <= 38.0) score += 0
			else if (tempVal <= 39.0) score += 1
			else score += 2
		}

		// BP Systolic
		const bpSys = vitals.bpSystolic
		if (bpSys != null) {
			if (bpSys <= 90) score += 3
			else if (bpSys <= 100) score += 2
			else if (bpSys <= 110) score += 1
			else if (bpSys <= 219) score += 0
			else score += 3
		}

		// Heart Rate
		const hr = vitals.heartRate
		if (hr != null) {
			if (hr <= 40) score += 3
			else if (hr <= 50) score += 1
			else if (hr <= 90) score += 0
			else if (hr <= 110) score += 1
			else if (hr <= 130) score += 2
			else score += 3
		}

		// Consciousness — always 0 (not tracked yet)

		const newsRiskLevel: "low" | "medium" | "high" =
			score >= 7 ? "high" : score >= 5 ? "medium" : "low"

		return { newsScore: score, newsRiskLevel }
	}

	// ========================================================================
	// Helper: resolve staffProfileId from userId
	// ========================================================================

	private async getStaffProfileId(userId: string): Promise<string> {
		const [staff] = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(eq(staffProfiles.userId, userId))
			.limit(1)
		if (!staff) {
			throw new NotFoundException("Staff profile not found for current user")
		}
		return staff.id
	}

	// ========================================================================
	// Vital Signs
	// ========================================================================

	async findVitals(input: VitalSignListInput) {
		const conditions = []
		if (input.facilityId) conditions.push(eq(vitalSigns.facilityId, input.facilityId))
		if (input.encounterId) conditions.push(eq(vitalSigns.encounterId, input.encounterId))
		if (input.preEncounterId) conditions.push(eq(vitalSigns.preEncounterId, input.preEncounterId))

		const where = and(...conditions)
		const offset = (input.page - 1) * input.limit

		const [rows, [totalRow]] = await Promise.all([
			db
				.select()
				.from(vitalSigns)
				.where(where)
				.orderBy(desc(vitalSigns.recordedAt))
				.limit(input.limit)
				.offset(offset),
			db.select({ count: count() }).from(vitalSigns).where(where),
		])

		const total = totalRow?.count ?? 0
		return {
			data: rows,
			total,
			page: input.page,
			limit: input.limit,
			totalPages: Math.ceil(total / input.limit),
		}
	}

	async findVital(id: string) {
		const [row] = await db.select().from(vitalSigns).where(eq(vitalSigns.id, id)).limit(1)
		if (!row) throw new NotFoundException("Vital sign not found")
		return row
	}

	async createVital(input: CreateVitalSignInput, userId: string) {
		const staffProfileId = await this.getStaffProfileId(userId)

		const { newsScore, newsRiskLevel } = this.calculateNEWS({
			respiratoryRate: input.respiratoryRate,
			spo2: input.spo2,
			temperature: input.temperature,
			bpSystolic: input.bpSystolic,
			heartRate: input.heartRate,
		})

		const [row] = await db
			.insert(vitalSigns)
			.values({
				facilityId: input.facilityId,
				encounterId: input.encounterId,
				preEncounterId: input.preEncounterId,
				temperature: input.temperature?.toString(),
				bpSystolic: input.bpSystolic,
				bpDiastolic: input.bpDiastolic,
				heartRate: input.heartRate,
				respiratoryRate: input.respiratoryRate,
				spo2: input.spo2?.toString(),
				painScore: input.painScore,
				weight: input.weight?.toString(),
				height: input.height?.toString(),
				newsScore,
				newsRiskLevel,
				recordedByStaffId: staffProfileId,
				recordedAt: new Date(),
			})
			.returning()

		if (!row) throw new NotFoundException("Failed to create vital sign")

		// PS-021: materialize vitals into flowsheet entries so the flowsheet read model is populated
		if (input.encounterId) {
			const recordedAt = row.recordedAt
			const vitalsMap: Array<{ name: string; value: number | null | undefined; unit: string }> = [
				{ name: "Temperature", value: input.temperature, unit: "°C" },
				{ name: "BP Systolic", value: input.bpSystolic, unit: "mmHg" },
				{ name: "BP Diastolic", value: input.bpDiastolic, unit: "mmHg" },
				{ name: "Heart Rate", value: input.heartRate, unit: "bpm" },
				{ name: "Respiratory Rate", value: input.respiratoryRate, unit: "breaths/min" },
				{ name: "SpO2", value: input.spo2, unit: "%" },
				{ name: "Pain Score", value: input.painScore, unit: "/10" },
				{ name: "Weight", value: input.weight, unit: "kg" },
				{ name: "Height", value: input.height, unit: "cm" },
			]

			const entriesToInsert = vitalsMap
				.filter(v => v.value != null)
				.map(v => ({
					facilityId: input.facilityId,
					encounterId: input.encounterId!,
					parameterName: v.name,
					parameterValue: String(v.value),
					unit: v.unit,
					recordedByStaffId: staffProfileId,
					recordedAt,
				}))

			if (entriesToInsert.length > 0) {
				await db.insert(flowsheetEntries).values(entriesToInsert)
			}
		}

		return row
	}

	// ========================================================================
	// MAR Entries
	// ========================================================================

	async findMarEntries(input: MarEntryListInput) {
		const conditions = []
		if (input.facilityId) conditions.push(eq(marEntries.facilityId, input.facilityId))
		if (input.encounterId) conditions.push(eq(marEntries.encounterId, input.encounterId))
		if (input.preEncounterId) conditions.push(eq(marEntries.preEncounterId, input.preEncounterId))
		if (input.status) conditions.push(eq(marEntries.status, input.status))
		if (input.scheduledFrom) conditions.push(gte(marEntries.scheduledTime, new Date(input.scheduledFrom)))
		if (input.scheduledTo) conditions.push(lte(marEntries.scheduledTime, new Date(input.scheduledTo)))

		const where = and(...conditions)
		const offset = (input.page - 1) * input.limit

		const [rows, [totalRow]] = await Promise.all([
			db
				.select()
				.from(marEntries)
				.where(where)
				.orderBy(desc(marEntries.scheduledTime))
				.limit(input.limit)
				.offset(offset),
			db.select({ count: count() }).from(marEntries).where(where),
		])

		const total = totalRow?.count ?? 0
		return {
			data: rows,
			total,
			page: input.page,
			limit: input.limit,
			totalPages: Math.ceil(total / input.limit),
		}
	}

	async findMarEntry(id: string) {
		const [row] = await db.select().from(marEntries).where(eq(marEntries.id, id)).limit(1)
		if (!row) throw new NotFoundException("MAR entry not found")
		return row
	}

	async administerMar(input: AdministerMarInput, userId: string) {
		const staffProfileId = await this.getStaffProfileId(userId)

		const [row] = await db
			.update(marEntries)
			.set({
				status: input.status,
				administeredDose: input.administeredDose,
				administeredRoute: input.administeredRoute,
				prnReason: input.prnReason,
				notes: input.notes,
				administeredByStaffId: staffProfileId,
				administeredAt: new Date(),
			})
			.where(eq(marEntries.id, input.id))
			.returning()

		if (!row) throw new NotFoundException("MAR entry not found")
		return row
	}

	// ========================================================================
	// TAR Entries
	// ========================================================================

	async findTarEntries(input: TarEntryListInput) {
		const conditions = []
		if (input.facilityId) conditions.push(eq(tarEntries.facilityId, input.facilityId))
		if (input.encounterId) conditions.push(eq(tarEntries.encounterId, input.encounterId))
		if (input.preEncounterId) conditions.push(eq(tarEntries.preEncounterId, input.preEncounterId))
		if (input.status) conditions.push(eq(tarEntries.status, input.status))

		const where = and(...conditions)
		const offset = (input.page - 1) * input.limit

		const [rows, [totalRow]] = await Promise.all([
			db
				.select()
				.from(tarEntries)
				.where(where)
				.orderBy(desc(tarEntries.scheduledTime))
				.limit(input.limit)
				.offset(offset),
			db.select({ count: count() }).from(tarEntries).where(where),
		])

		const total = totalRow?.count ?? 0
		return {
			data: rows,
			total,
			page: input.page,
			limit: input.limit,
			totalPages: Math.ceil(total / input.limit),
		}
	}

	async findTarEntry(id: string) {
		const [row] = await db.select().from(tarEntries).where(eq(tarEntries.id, id)).limit(1)
		if (!row) throw new NotFoundException("TAR entry not found")
		return row
	}

	async createTarEntry(input: CreateTarEntryInput, userId: string) {
		const staffProfileId = await this.getStaffProfileId(userId)

		const [row] = await db
			.insert(tarEntries)
			.values({
				facilityId: input.facilityId,
				encounterId: input.encounterId,
				preEncounterId: input.preEncounterId,
				treatmentDescription: input.treatmentDescription,
				scheduledTime: new Date(input.scheduledTime),
				status: "due",
				administeredByStaffId: staffProfileId,
			})
			.returning()

		if (!row) throw new NotFoundException("Failed to create TAR entry")
		return row
	}

	async administerTar(input: AdministerTarInput, userId: string) {
		const staffProfileId = await this.getStaffProfileId(userId)

		const [row] = await db
			.update(tarEntries)
			.set({
				status: input.status,
				notes: input.notes,
				administeredByStaffId: staffProfileId,
				administeredAt: new Date(),
			})
			.where(eq(tarEntries.id, input.id))
			.returning()

		if (!row) throw new NotFoundException("TAR entry not found")
		return row
	}

	// ========================================================================
	// I/O Entries
	// ========================================================================

	async findIoEntries(input: IoEntryListInput) {
		const conditions = []
		if (input.facilityId) conditions.push(eq(ioEntries.facilityId, input.facilityId))
		if (input.encounterId) conditions.push(eq(ioEntries.encounterId, input.encounterId))
		if (input.preEncounterId) conditions.push(eq(ioEntries.preEncounterId, input.preEncounterId))
		if (input.ioType) conditions.push(eq(ioEntries.ioType, input.ioType))

		const where = and(...conditions)
		const offset = (input.page - 1) * input.limit

		const [rows, [totalRow]] = await Promise.all([
			db
				.select()
				.from(ioEntries)
				.where(where)
				.orderBy(desc(ioEntries.recordedAt))
				.limit(input.limit)
				.offset(offset),
			db.select({ count: count() }).from(ioEntries).where(where),
		])

		const total = totalRow?.count ?? 0
		return {
			data: rows,
			total,
			page: input.page,
			limit: input.limit,
			totalPages: Math.ceil(total / input.limit),
		}
	}

	async createIoEntry(input: CreateIoEntryInput, userId: string) {
		const staffProfileId = await this.getStaffProfileId(userId)

		const [row] = await db
			.insert(ioEntries)
			.values({
				facilityId: input.facilityId,
				encounterId: input.encounterId,
				preEncounterId: input.preEncounterId,
				ioType: input.ioType,
				route: input.route,
				description: input.description,
				amountMl: input.amountMl.toString(),
				recordedByStaffId: staffProfileId,
				recordedAt: new Date(),
			})
			.returning()

		if (!row) throw new NotFoundException("Failed to create I/O entry")
		return row
	}

	async getIoBalance(input: IoBalanceInput) {
		const periodEnd = new Date()
		const periodStart = new Date(periodEnd.getTime() - 24 * 60 * 60 * 1000)

		const conditions = [
			eq(ioEntries.encounterId, input.encounterId),
			gte(ioEntries.recordedAt, periodStart),
		]
		if (input.facilityId) conditions.push(eq(ioEntries.facilityId, input.facilityId))

		const rows = await db
			.select()
			.from(ioEntries)
			.where(and(...conditions))

		let totalIntake = 0
		let totalOutput = 0
		for (const row of rows) {
			const amount = Number(row.amountMl)
			if (row.ioType === "intake") totalIntake += amount
			else totalOutput += amount
		}

		return {
			totalIntake,
			totalOutput,
			netBalance: totalIntake - totalOutput,
			periodStart,
			periodEnd,
		}
	}

	// ========================================================================
	// Flowsheet Entries
	// ========================================================================

	async findFlowsheetEntries(input: FlowsheetListInput) {
		const conditions = [
			eq(flowsheetEntries.encounterId, input.encounterId),
		]
		if (input.facilityId) conditions.push(eq(flowsheetEntries.facilityId, input.facilityId))
		if (input.parameterName) conditions.push(eq(flowsheetEntries.parameterName, input.parameterName))
		if (input.dateFrom) conditions.push(gte(flowsheetEntries.recordedAt, new Date(input.dateFrom)))
		if (input.dateTo) conditions.push(lte(flowsheetEntries.recordedAt, new Date(input.dateTo)))

		const where = and(...conditions)
		const offset = (input.page - 1) * input.limit

		const [rows, [totalRow]] = await Promise.all([
			db
				.select()
				.from(flowsheetEntries)
				.where(where)
				.orderBy(desc(flowsheetEntries.recordedAt))
				.limit(input.limit)
				.offset(offset),
			db.select({ count: count() }).from(flowsheetEntries).where(where),
		])

		const total = totalRow?.count ?? 0
		return {
			data: rows,
			total,
			page: input.page,
			limit: input.limit,
			totalPages: Math.ceil(total / input.limit),
		}
	}

	// ========================================================================
	// Shift Handoffs
	// ========================================================================

	async findHandoffs(input: HandoffListInput) {
		const conditions = []
		if (input.facilityId) conditions.push(eq(shiftHandoffs.facilityId, input.facilityId))
		if (input.encounterId) conditions.push(eq(shiftHandoffs.encounterId, input.encounterId))
		if (input.outgoingStaffId) conditions.push(eq(shiftHandoffs.outgoingStaffId, input.outgoingStaffId))

		const where = and(...conditions)
		const offset = (input.page - 1) * input.limit

		const [rows, [totalRow]] = await Promise.all([
			db
				.select()
				.from(shiftHandoffs)
				.where(where)
				.orderBy(desc(shiftHandoffs.createdAt))
				.limit(input.limit)
				.offset(offset),
			db.select({ count: count() }).from(shiftHandoffs).where(where),
		])

		const total = totalRow?.count ?? 0
		return {
			data: rows,
			total,
			page: input.page,
			limit: input.limit,
			totalPages: Math.ceil(total / input.limit),
		}
	}

	async findHandoff(id: string) {
		const [row] = await db.select().from(shiftHandoffs).where(eq(shiftHandoffs.id, id)).limit(1)
		if (!row) throw new NotFoundException("Shift handoff not found")
		return row
	}

	async generateHandoffSummary(input: GenerateHandoffInput) {
		// Get patientId from encounter
		const [enc] = await db
			.select({ patientId: encounters.patientId })
			.from(encounters)
			.where(eq(encounters.id, input.encounterId))
			.limit(1)

		if (!enc) throw new NotFoundException("Encounter not found")

		// Active problems
		const activeProblems = await db
			.select({
				description: problems.description,
				icd10Code: problems.icd10Code,
			})
			.from(problems)
			.where(and(eq(problems.patientId, enc.patientId), eq(problems.status, "active")))

		// Current medications
		const currentMedications = await db
			.select({
				genericName: medicationOrders.genericName,
				dose: medicationOrders.dose,
				frequency: medicationOrders.frequency,
			})
			.from(medicationOrders)
			.where(
				and(
					eq(medicationOrders.encounterId, input.encounterId),
					inArray(medicationOrders.status, ["active", "pending_verification", "verified"])
				)
			)

		// Most recent vital signs
		const [recentVitals] = await db
			.select()
			.from(vitalSigns)
			.where(eq(vitalSigns.encounterId, input.encounterId))
			.orderBy(desc(vitalSigns.recordedAt))
			.limit(1)

		// I/O balance
		let ioBalance = null
		try {
			ioBalance = await this.getIoBalance(input)
		} catch {
			// No I/O data available
		}

		// Pending orders count
		const [pendingRow] = await db
			.select({ count: count() })
			.from(medicationOrders)
			.where(
				and(
					eq(medicationOrders.encounterId, input.encounterId),
					eq(medicationOrders.status, "pending_verification")
				)
			)

		return {
			activeProblems,
			currentMedications,
			recentVitals: recentVitals ?? null,
			newsScore: recentVitals?.newsScore ?? null,
			newsRiskLevel: recentVitals?.newsRiskLevel ?? null,
			ioBalance,
			pendingOrders: pendingRow?.count ?? 0,
		}
	}

	async createHandoff(input: CreateHandoffInput, userId: string) {
		const staffProfileId = await this.getStaffProfileId(userId)

		const [row] = await db
			.insert(shiftHandoffs)
			.values({
				facilityId: input.facilityId,
				encounterId: input.encounterId,
				outgoingStaffId: staffProfileId,
				incomingStaffId: input.incomingStaffId,
				handoffNotes: input.handoffNotes ?? "",
				status: "draft",
			})
			.returning()

		if (!row) throw new NotFoundException("Failed to create handoff")
		return row
	}

	async finalizeHandoff(input: FinalizeHandoffInput, userId: string) {
		const [row] = await db
			.update(shiftHandoffs)
			.set({
				status: "signed",
				signedAt: new Date(),
			})
			.where(eq(shiftHandoffs.id, input.id))
			.returning()

		if (!row) throw new NotFoundException("Shift handoff not found")
		return row
	}

	// ========================================================================
	// HAI Tags
	// ========================================================================

	async findHaiTags(input: HaiTagListInput) {
		const conditions = []
		if (input.facilityId) conditions.push(eq(haiTags.facilityId, input.facilityId))
		if (input.encounterId) conditions.push(eq(haiTags.encounterId, input.encounterId))
		if (input.haiType) conditions.push(eq(haiTags.haiType, input.haiType))
		if (input.status) conditions.push(eq(haiTags.status, input.status))

		const where = and(...conditions)
		const offset = (input.page - 1) * input.limit

		const [rows, [totalRow]] = await Promise.all([
			db
				.select()
				.from(haiTags)
				.where(where)
				.orderBy(desc(haiTags.createdAt))
				.limit(input.limit)
				.offset(offset),
			db.select({ count: count() }).from(haiTags).where(where),
		])

		const total = totalRow?.count ?? 0
		return {
			data: rows,
			total,
			page: input.page,
			limit: input.limit,
			totalPages: Math.ceil(total / input.limit),
		}
	}

	async findHaiTag(id: string) {
		const [row] = await db.select().from(haiTags).where(eq(haiTags.id, id)).limit(1)
		if (!row) throw new NotFoundException("HAI tag not found")
		return row
	}

	async createHaiTag(input: CreateHaiTagInput, userId: string) {
		const staffProfileId = await this.getStaffProfileId(userId)

		const [row] = await db
			.insert(haiTags)
			.values({
				facilityId: input.facilityId,
				encounterId: input.encounterId,
				haiType: input.haiType,
				onsetDate: input.onsetDate,
				notes: input.notes,
				documentedByStaffId: staffProfileId,
				status: "suspected",
			})
			.returning()

		if (!row) throw new NotFoundException("Failed to create HAI tag")
		return row
	}

	async updateHaiTag(input: UpdateHaiTagInput) {
		const updates: Record<string, unknown> = { updatedAt: new Date() }
		if (input.status !== undefined) updates.status = input.status
		if (input.notes !== undefined) updates.notes = input.notes

		// Set confirmedAt/resolvedAt timestamps based on status
		if (input.status === "confirmed") updates.confirmedAt = new Date()
		if (input.status === "resolved") updates.resolvedAt = new Date()

		const [row] = await db
			.update(haiTags)
			.set(updates)
			.where(eq(haiTags.id, input.id))
			.returning()

		if (!row) throw new NotFoundException("HAI tag not found")
		return row
	}

	// ========================================================================
	// Consent Records
	// ========================================================================

	async findConsentRecords(input: ConsentRecordListInput) {
		const conditions = []
		if (input.facilityId) conditions.push(eq(consentRecords.facilityId, input.facilityId))
		if (input.encounterId) conditions.push(eq(consentRecords.encounterId, input.encounterId))
		if (input.preEncounterId) conditions.push(eq(consentRecords.preEncounterId, input.preEncounterId))
		if (input.consentType) conditions.push(eq(consentRecords.consentType, input.consentType))

		const where = and(...conditions)
		const offset = (input.page - 1) * input.limit

		const [rows, [totalRow]] = await Promise.all([
			db
				.select()
				.from(consentRecords)
				.where(where)
				.orderBy(desc(consentRecords.signedAt))
				.limit(input.limit)
				.offset(offset),
			db.select({ count: count() }).from(consentRecords).where(where),
		])

		const total = totalRow?.count ?? 0
		return {
			data: rows,
			total,
			page: input.page,
			limit: input.limit,
			totalPages: Math.ceil(total / input.limit),
		}
	}

	async findConsentRecord(id: string) {
		const [row] = await db.select().from(consentRecords).where(eq(consentRecords.id, id)).limit(1)
		if (!row) throw new NotFoundException("Consent record not found")
		return row
	}

	async createConsentRecord(input: CreateConsentRecordInput, userId: string) {
		const staffProfileId = await this.getStaffProfileId(userId)

		const [row] = await db
			.insert(consentRecords)
			.values({
				facilityId: input.facilityId,
				encounterId: input.encounterId,
				preEncounterId: input.preEncounterId,
				consentType: input.consentType,
				consentText: input.consentText ?? "",
				patientSignature: input.patientSignature,
				guardianSignature: input.guardianSignature,
				witnessSignature: input.witnessSignature,
				capturedByStaffId: staffProfileId,
				signedAt: new Date(),
			})
			.returning()

		if (!row) throw new NotFoundException("Failed to create consent record")
		return row
	}
}
