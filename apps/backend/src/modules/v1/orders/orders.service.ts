import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import { and, count, desc, eq, inArray, sql } from "drizzle-orm"

import {
	encounters,
	formularyItems,
	imagingOrders,
	labOrders,
	medicationOrders,
	orderVerifications,
	patients,
	prescriptions,
	staffProfiles,
	users,
} from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import type { V1Inputs } from "@/config/contract-types"

import { ProblemsAllergiesService } from "../problems-allergies/problems-allergies.service"

type CdsEvaluateInput = V1Inputs["orders"]["evaluateCds"]
type MedOrderListInput = V1Inputs["orders"]["listMedOrders"]
type CreateMedOrderInput = V1Inputs["orders"]["createMedOrder"]
type UpdateMedOrderInput = V1Inputs["orders"]["updateMedOrder"]
type LabOrderListInput = V1Inputs["orders"]["listLabOrders"]
type CreateLabOrderInput = V1Inputs["orders"]["createLabOrder"]
type ImagingOrderListInput = V1Inputs["orders"]["listImagingOrders"]
type CreateImagingOrderInput = V1Inputs["orders"]["createImagingOrder"]
type VerificationQueueInput = V1Inputs["orders"]["getVerificationQueue"]
type VerifyOrderInput = V1Inputs["orders"]["verifyOrder"]
type PrescriptionListInput = V1Inputs["orders"]["listPrescriptions"]
type CreatePrescriptionInput = V1Inputs["orders"]["createPrescription"]
type ActiveOrdersInput = V1Inputs["orders"]["getActiveOrders"]

@Injectable()
export class OrdersService {
	private readonly logger = new Logger(OrdersService.name)

	constructor(private readonly problemsAllergiesService: ProblemsAllergiesService) {}

	// ========================================================================
	// CDS Evaluation
	// ========================================================================

	async evaluateCds(input: CdsEvaluateInput) {
		const alerts: {
			type: "allergy_hard_block" | "allergy_soft_block" | "formulary_warning" | "high_alert" | "s2_license_block"
			severity: "hard_block" | "soft_block" | "warning" | "info"
			message: string
			details?: Record<string, unknown>
		}[] = []

		// Step 1: Allergy check
		const { allergies: activeAllergies } = await this.problemsAllergiesService.getActiveAllergies({
			patientId: input.patientId,
		})

		for (const allergy of activeAllergies) {
			if (allergy.allergenName.toLowerCase() === input.genericName.toLowerCase()) {
				if (allergy.severity === "severe") {
					alerts.push({
						type: "allergy_hard_block",
						severity: "hard_block",
						message: `Patient has a SEVERE allergy to ${allergy.allergenName}. This order cannot proceed.`,
						details: { allergenName: allergy.allergenName, allergenType: allergy.allergenType, severity: allergy.severity },
					})
				} else {
					alerts.push({
						type: "allergy_soft_block",
						severity: "soft_block",
						message: `Patient has a ${allergy.severity} allergy to ${allergy.allergenName}. Override required to proceed.`,
						details: { allergenName: allergy.allergenName, allergenType: allergy.allergenType, severity: allergy.severity },
					})
				}
			}
		}

		// Step 2 & 3: Formulary check + High-alert check
		if (input.formularyItemId) {
			const [formularyItem] = await db
				.select()
				.from(formularyItems)
				.where(eq(formularyItems.id, input.formularyItemId))

			if (!formularyItem || !formularyItem.isActive) {
				alerts.push({
					type: "formulary_warning",
					severity: "warning",
					message: "This drug is off-formulary or inactive at this facility.",
					details: formularyItem?.formularyNotes ? { formularyNotes: formularyItem.formularyNotes } : undefined,
				})
			} else if (formularyItem.isHighAlert) {
				// Step 3: High-alert check
				alerts.push({
					type: "high_alert",
					severity: "warning",
					message: "This is a HIGH-ALERT medication. Double verification by a pharmacist is required.",
					details: formularyItem.highAlertNotes ? { highAlertNotes: formularyItem.highAlertNotes } : undefined,
				})
			}
		}

		// Step 4: S-2 License check
		if (input.isControlledSubstance) {
			const [staff] = await db
				.select()
				.from(staffProfiles)
				.where(eq(staffProfiles.id, input.orderingStaffId))

			if (!staff?.pdeaS2License) {
				alerts.push({
					type: "s2_license_block",
					severity: "hard_block",
					message: "Ordering staff does not have a PDEA S-2 license. Cannot prescribe controlled substances.",
				})
			} else if (staff.pdeaS2Expiry) {
				const expiryDate = new Date(staff.pdeaS2Expiry)
				const today = new Date()
				today.setHours(0, 0, 0, 0)
				if (expiryDate < today) {
					alerts.push({
						type: "s2_license_block",
						severity: "hard_block",
						message: `PDEA S-2 license expired on ${staff.pdeaS2Expiry}. Cannot prescribe controlled substances.`,
					})
				}
			}
		}

		return {
			alerts,
			canProceed: !alerts.some(a => a.severity === "hard_block"),
			requiresOverride: alerts.some(a => a.severity === "soft_block"),
			requiresDoubleVerification: alerts.some(a => a.type === "high_alert"),
		}
	}

	private mapSafetyChecks(cdsAlerts: unknown) {
		if (!Array.isArray(cdsAlerts)) {
			return []
		}

		return cdsAlerts.flatMap((alert, index) => {
			if (!alert || typeof alert !== "object") {
				return []
			}

			const candidate = alert as {
				type?: string
				severity?: string
				message?: string
				details?: Record<string, unknown>
			}

			const typeMap = {
				allergy_hard_block: "allergy_cross_reactivity",
				allergy_soft_block: "allergy_cross_reactivity",
				formulary_warning: "duplicate_therapy",
				high_alert: "black_box_warning",
				s2_license_block: "pregnancy_category",
			} as const

			const severityMap = {
				hard_block: "critical",
				soft_block: "major",
				warning: "moderate",
				info: "info",
			} as const

			const titleMap = {
				allergy_hard_block: "Severe allergy conflict",
				allergy_soft_block: "Allergy override required",
				formulary_warning: "Formulary warning",
				high_alert: "High-alert medication",
				s2_license_block: "PDEA S-2 validation",
			} as const

			const mappedType =
				candidate.type && candidate.type in typeMap
					? typeMap[candidate.type as keyof typeof typeMap]
					: "duplicate_therapy"
			const mappedSeverity =
				candidate.severity && candidate.severity in severityMap
					? severityMap[candidate.severity as keyof typeof severityMap]
					: "info"
			const mappedTitle =
				candidate.type && candidate.type in titleMap
					? titleMap[candidate.type as keyof typeof titleMap]
					: "Clinical safety check"

			return [{
				id: `${candidate.type ?? "alert"}-${index}`,
				type: mappedType,
				severity: mappedSeverity,
				title: mappedTitle,
				message: candidate.message ?? "Clinical safety check triggered.",
				details: candidate.details,
				isHardBlock: candidate.severity === "hard_block",
				requiresOverride: candidate.severity === "soft_block",
			}]
		})
	}

	private getAlertCounts(cdsAlerts: unknown) {
		const safetyChecks = this.mapSafetyChecks(cdsAlerts)
		return {
			alertCount: safetyChecks.length,
			criticalAlertCount: safetyChecks.filter(check => check.isHardBlock).length,
			safetyChecks,
		}
	}

	// ========================================================================
	// Medication Orders
	// ========================================================================

	async findMedOrders(input: MedOrderListInput) {
		const page = Number(input.page) || 1
		const limit = Number(input.limit) || 50
		const offset = (page - 1) * limit

		const conditions: ReturnType<typeof eq>[] = []
		if (input.encounterId) conditions.push(eq(medicationOrders.encounterId, input.encounterId))
		if (input.preEncounterId) conditions.push(eq(medicationOrders.preEncounterId, input.preEncounterId))
		if (input.status) conditions.push(eq(medicationOrders.status, input.status))

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined

		const [[totalResult], rows] = await Promise.all([
			db.select({ count: count() }).from(medicationOrders).where(whereClause),
			db
				.select({
					id: medicationOrders.id,
					facilityId: medicationOrders.facilityId,
					encounterId: medicationOrders.encounterId,
					preEncounterId: medicationOrders.preEncounterId,
					formularyItemId: medicationOrders.formularyItemId,
					genericName: medicationOrders.genericName,
					brandName: medicationOrders.brandName,
					rxnormCode: medicationOrders.rxnormCode,
					dose: medicationOrders.dose,
					doseUnit: medicationOrders.doseUnit,
					doseForm: medicationOrders.doseForm,
					route: medicationOrders.route,
					frequency: medicationOrders.frequency,
					durationDays: medicationOrders.durationDays,
					specialInstructions: medicationOrders.specialInstructions,
					isPrn: medicationOrders.isPrn,
					prnReason: medicationOrders.prnReason,
					isControlledSubstance: medicationOrders.isControlledSubstance,
					pdeaSchedule: medicationOrders.pdeaSchedule,
					pdeaTrancheNumber: medicationOrders.pdeaTrancheNumber,
					pdeaTrancheTotal: medicationOrders.pdeaTrancheTotal,
					parentOrderId: medicationOrders.parentOrderId,
					status: medicationOrders.status,
					orderingStaffId: medicationOrders.orderingStaffId,
					orderingStaffName: users.name,
					patientId: patients.id,
					patientFirstName: patients.firstName,
					patientLastName: patients.lastName,
					patientMrn: patients.mrn,
					patientDateOfBirth: patients.dateOfBirth,
					cdsAlerts: medicationOrders.cdsAlerts,
					cdsOverrides: medicationOrders.cdsOverrides,
					createdAt: medicationOrders.createdAt,
					updatedAt: medicationOrders.updatedAt,
				})
				.from(medicationOrders)
				.leftJoin(encounters, eq(medicationOrders.encounterId, encounters.id))
				.leftJoin(patients, eq(encounters.patientId, patients.id))
				.leftJoin(staffProfiles, eq(medicationOrders.orderingStaffId, staffProfiles.id))
				.leftJoin(users, eq(staffProfiles.userId, users.id))
				.where(whereClause)
				.orderBy(desc(medicationOrders.createdAt))
				.limit(limit)
				.offset(offset),
		])

		const total = totalResult?.count ?? 0

		return {
			data: rows.map(row => ({
				...row,
				isTranche: row.parentOrderId !== null,
				patientName:
					row.patientLastName && row.patientFirstName
						? `${row.patientLastName}, ${row.patientFirstName}`
						: null,
				priority: "routine" as const,
				receivedAt: row.createdAt,
			})),
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	async findMedOrder(id: string) {
		const [row] = await db
			.select({
				id: medicationOrders.id,
				facilityId: medicationOrders.facilityId,
				encounterId: medicationOrders.encounterId,
				preEncounterId: medicationOrders.preEncounterId,
				formularyItemId: medicationOrders.formularyItemId,
				genericName: medicationOrders.genericName,
				brandName: medicationOrders.brandName,
				rxnormCode: medicationOrders.rxnormCode,
				dose: medicationOrders.dose,
				doseUnit: medicationOrders.doseUnit,
				doseForm: medicationOrders.doseForm,
				route: medicationOrders.route,
				frequency: medicationOrders.frequency,
				durationDays: medicationOrders.durationDays,
				specialInstructions: medicationOrders.specialInstructions,
				isPrn: medicationOrders.isPrn,
				prnReason: medicationOrders.prnReason,
				isControlledSubstance: medicationOrders.isControlledSubstance,
				pdeaSchedule: medicationOrders.pdeaSchedule,
				pdeaTrancheNumber: medicationOrders.pdeaTrancheNumber,
				pdeaTrancheTotal: medicationOrders.pdeaTrancheTotal,
				parentOrderId: medicationOrders.parentOrderId,
				status: medicationOrders.status,
				orderingStaffId: medicationOrders.orderingStaffId,
				orderingStaffName: users.name,
				patientId: patients.id,
				patientFirstName: patients.firstName,
				patientLastName: patients.lastName,
				patientMrn: patients.mrn,
				patientDateOfBirth: patients.dateOfBirth,
				cdsAlerts: medicationOrders.cdsAlerts,
				cdsOverrides: medicationOrders.cdsOverrides,
				createdAt: medicationOrders.createdAt,
				updatedAt: medicationOrders.updatedAt,
			})
			.from(medicationOrders)
			.leftJoin(encounters, eq(medicationOrders.encounterId, encounters.id))
			.leftJoin(patients, eq(encounters.patientId, patients.id))
			.leftJoin(staffProfiles, eq(medicationOrders.orderingStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.where(eq(medicationOrders.id, id))

		if (!row) throw new NotFoundException(`Medication order ${id} not found`)
		const { alertCount, criticalAlertCount, safetyChecks } = this.getAlertCounts(row.cdsAlerts)
		return {
			...row,
			isTranche: row.parentOrderId !== null,
			patientName:
				row.patientLastName && row.patientFirstName
					? `${row.patientLastName}, ${row.patientFirstName}`
					: null,
			patientWeight: null,
			patientCreatinine: null,
			priority: "routine" as const,
			alertCount,
			criticalAlertCount,
			receivedAt: row.createdAt,
			safetyChecks,
		}
	}

	async createMedOrder(input: CreateMedOrderInput, userId: string) {
		const [staff] = await db.select().from(staffProfiles).where(eq(staffProfiles.userId, userId))
		if (!staff) throw new NotFoundException("Staff profile not found for user")

		const [created] = await db
			.insert(medicationOrders)
			.values({
				facilityId: input.facilityId,
				encounterId: input.encounterId ?? null,
				preEncounterId: input.preEncounterId ?? null,
				formularyItemId: input.formularyItemId ?? null,
				genericName: input.genericName,
				brandName: input.brandName ?? null,
				rxnormCode: input.rxnormCode ?? null,
				dose: input.dose,
				doseUnit: input.doseUnit,
				doseForm: input.doseForm,
				route: input.route,
				frequency: input.frequency,
				durationDays: input.durationDays ?? null,
				specialInstructions: input.specialInstructions ?? null,
				isPrn: input.isPrn ?? false,
				prnReason: input.prnReason ?? null,
				isControlledSubstance: input.isControlledSubstance ?? false,
				pdeaSchedule: input.pdeaSchedule ?? null,
				pdeaTrancheNumber: input.pdeaTrancheNumber ?? null,
				pdeaTrancheTotal: input.pdeaTrancheTotal ?? null,
				status: "pending_verification",
				orderingStaffId: staff.id,
				cdsAlerts: input.cdsAlerts ?? null,
				cdsOverrides: input.cdsOverrides ?? null,
			})
			.returning()

		this.logger.log(`Created medication order ${created!.id}`)

		return this.findMedOrder(created!.id)
	}

	async updateMedOrder(input: UpdateMedOrderInput) {
		const existing = await this.findMedOrder(input.id)

		const updateValues: Record<string, unknown> = { updatedAt: new Date() }
		if (input.dose !== undefined) updateValues.dose = input.dose
		if (input.doseUnit !== undefined) updateValues.doseUnit = input.doseUnit
		if (input.doseForm !== undefined) updateValues.doseForm = input.doseForm
		if (input.route !== undefined) updateValues.route = input.route
		if (input.frequency !== undefined) updateValues.frequency = input.frequency
		if (input.durationDays !== undefined) updateValues.durationDays = input.durationDays
		if (input.specialInstructions !== undefined) updateValues.specialInstructions = input.specialInstructions
		if (input.isPrn !== undefined) updateValues.isPrn = input.isPrn
		if (input.prnReason !== undefined) updateValues.prnReason = input.prnReason
		if (input.status !== undefined) updateValues.status = input.status

		await db.update(medicationOrders).set(updateValues).where(eq(medicationOrders.id, existing.id))

		return this.findMedOrder(input.id)
	}

	async discontinueMedOrder(id: string) {
		await this.findMedOrder(id)

		await db
			.update(medicationOrders)
			.set({ status: "discontinued", updatedAt: new Date() })
			.where(eq(medicationOrders.id, id))

		return this.findMedOrder(id)
	}

	// ========================================================================
	// Lab Orders
	// ========================================================================

	async findLabOrders(input: LabOrderListInput) {
		const page = Number(input.page) || 1
		const limit = Number(input.limit) || 50
		const offset = (page - 1) * limit

		const conditions: ReturnType<typeof eq>[] = []
		if (input.encounterId) conditions.push(eq(labOrders.encounterId, input.encounterId))
		if (input.preEncounterId) conditions.push(eq(labOrders.preEncounterId, input.preEncounterId))
		if (input.status) conditions.push(eq(labOrders.status, input.status))

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined

		const [[totalResult], rows] = await Promise.all([
			db.select({ count: count() }).from(labOrders).where(whereClause),
			db
				.select({
					id: labOrders.id,
					facilityId: labOrders.facilityId,
					encounterId: labOrders.encounterId,
					preEncounterId: labOrders.preEncounterId,
					loincCode: labOrders.loincCode,
					panelCode: labOrders.panelCode,
					testName: labOrders.testName,
					panelName: labOrders.panelName,
					priority: labOrders.priority,
					status: labOrders.status,
					specimenType: labOrders.specimenType,
					orderingStaffId: labOrders.orderingStaffId,
					orderingStaffName: users.name,
					collectionDatetime: labOrders.collectionDatetime,
					resultedDatetime: labOrders.resultedDatetime,
					results: labOrders.results,
					cdsAlerts: labOrders.cdsAlerts,
					createdAt: labOrders.createdAt,
					updatedAt: labOrders.updatedAt,
				})
				.from(labOrders)
				.leftJoin(staffProfiles, eq(labOrders.orderingStaffId, staffProfiles.id))
				.leftJoin(users, eq(staffProfiles.userId, users.id))
				.where(whereClause)
				.orderBy(desc(labOrders.createdAt))
				.limit(limit)
				.offset(offset),
		])

		const total = totalResult?.count ?? 0

		return {
			data: rows,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	async findLabOrder(id: string) {
		const [row] = await db
			.select({
				id: labOrders.id,
				facilityId: labOrders.facilityId,
				encounterId: labOrders.encounterId,
				preEncounterId: labOrders.preEncounterId,
				loincCode: labOrders.loincCode,
				panelCode: labOrders.panelCode,
				testName: labOrders.testName,
				panelName: labOrders.panelName,
				priority: labOrders.priority,
				status: labOrders.status,
				specimenType: labOrders.specimenType,
				orderingStaffId: labOrders.orderingStaffId,
				orderingStaffName: users.name,
				collectionDatetime: labOrders.collectionDatetime,
				resultedDatetime: labOrders.resultedDatetime,
				results: labOrders.results,
				cdsAlerts: labOrders.cdsAlerts,
				createdAt: labOrders.createdAt,
				updatedAt: labOrders.updatedAt,
			})
			.from(labOrders)
			.leftJoin(staffProfiles, eq(labOrders.orderingStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.where(eq(labOrders.id, id))

		if (!row) throw new NotFoundException(`Lab order ${id} not found`)
		return row
	}

	async createLabOrder(input: CreateLabOrderInput, userId: string) {
		const [staff] = await db.select().from(staffProfiles).where(eq(staffProfiles.userId, userId))
		if (!staff) throw new NotFoundException("Staff profile not found for user")

		const [created] = await db
			.insert(labOrders)
			.values({
				facilityId: input.facilityId,
				encounterId: input.encounterId ?? null,
				preEncounterId: input.preEncounterId ?? null,
				loincCode: input.loincCode ?? null,
				panelCode: input.panelCode ?? null,
				testName: input.testName,
				panelName: input.panelName ?? null,
				priority: input.priority ?? "routine",
				status: "ordered",
				specimenType: input.specimenType ?? null,
				orderingStaffId: staff.id,
			})
			.returning()

		this.logger.log(`Created lab order ${created!.id}`)

		return this.findLabOrder(created!.id)
	}

	// ========================================================================
	// Imaging Orders
	// ========================================================================

	async findImagingOrders(input: ImagingOrderListInput) {
		const page = Number(input.page) || 1
		const limit = Number(input.limit) || 50
		const offset = (page - 1) * limit

		const conditions: ReturnType<typeof eq>[] = []
		if (input.encounterId) conditions.push(eq(imagingOrders.encounterId, input.encounterId))
		if (input.preEncounterId) conditions.push(eq(imagingOrders.preEncounterId, input.preEncounterId))
		if (input.status) conditions.push(eq(imagingOrders.status, input.status))

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined

		const [[totalResult], rows] = await Promise.all([
			db.select({ count: count() }).from(imagingOrders).where(whereClause),
			db
				.select({
					id: imagingOrders.id,
					facilityId: imagingOrders.facilityId,
					encounterId: imagingOrders.encounterId,
					preEncounterId: imagingOrders.preEncounterId,
					modality: imagingOrders.modality,
					bodyPart: imagingOrders.bodyPart,
					clinicalIndication: imagingOrders.clinicalIndication,
					priority: imagingOrders.priority,
					status: imagingOrders.status,
					orderingStaffId: imagingOrders.orderingStaffId,
					orderingStaffName: users.name,
					scheduledDatetime: imagingOrders.scheduledDatetime,
					completedDatetime: imagingOrders.completedDatetime,
					report: imagingOrders.report,
					structuredResults: imagingOrders.structuredResults,
					cdsAlerts: imagingOrders.cdsAlerts,
					createdAt: imagingOrders.createdAt,
					updatedAt: imagingOrders.updatedAt,
				})
				.from(imagingOrders)
				.leftJoin(staffProfiles, eq(imagingOrders.orderingStaffId, staffProfiles.id))
				.leftJoin(users, eq(staffProfiles.userId, users.id))
				.where(whereClause)
				.orderBy(desc(imagingOrders.createdAt))
				.limit(limit)
				.offset(offset),
		])

		const total = totalResult?.count ?? 0

		return {
			data: rows,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	async findImagingOrder(id: string) {
		const [row] = await db
			.select({
				id: imagingOrders.id,
				facilityId: imagingOrders.facilityId,
				encounterId: imagingOrders.encounterId,
				preEncounterId: imagingOrders.preEncounterId,
				modality: imagingOrders.modality,
				bodyPart: imagingOrders.bodyPart,
				clinicalIndication: imagingOrders.clinicalIndication,
				priority: imagingOrders.priority,
				status: imagingOrders.status,
				orderingStaffId: imagingOrders.orderingStaffId,
				orderingStaffName: users.name,
				scheduledDatetime: imagingOrders.scheduledDatetime,
				completedDatetime: imagingOrders.completedDatetime,
				report: imagingOrders.report,
				structuredResults: imagingOrders.structuredResults,
				cdsAlerts: imagingOrders.cdsAlerts,
				createdAt: imagingOrders.createdAt,
				updatedAt: imagingOrders.updatedAt,
			})
			.from(imagingOrders)
			.leftJoin(staffProfiles, eq(imagingOrders.orderingStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.where(eq(imagingOrders.id, id))

		if (!row) throw new NotFoundException(`Imaging order ${id} not found`)
		return row
	}

	async createImagingOrder(input: CreateImagingOrderInput, userId: string) {
		const [staff] = await db.select().from(staffProfiles).where(eq(staffProfiles.userId, userId))
		if (!staff) throw new NotFoundException("Staff profile not found for user")

		const [created] = await db
			.insert(imagingOrders)
			.values({
				facilityId: input.facilityId,
				encounterId: input.encounterId ?? null,
				preEncounterId: input.preEncounterId ?? null,
				modality: input.modality,
				bodyPart: input.bodyPart,
				clinicalIndication: input.clinicalIndication ?? null,
				priority: input.priority ?? "routine",
				status: "ordered",
				orderingStaffId: staff.id,
			})
			.returning()

		this.logger.log(`Created imaging order ${created!.id}`)

		return this.findImagingOrder(created!.id)
	}

	// ========================================================================
	// Pharmacy Verification
	// ========================================================================

	async getVerificationQueue(input: VerificationQueueInput) {
		const page = Number(input.page) || 1
		const limit = Number(input.limit) || 50
		const offset = (page - 1) * limit

		const whereClause = and(
			eq(medicationOrders.facilityId, input.facilityId),
			eq(medicationOrders.status, "pending_verification"),
		)

		const [[totalResult], rows] = await Promise.all([
			db.select({ count: count() }).from(medicationOrders).where(whereClause),
			db
				.select({
					id: medicationOrders.id,
					facilityId: medicationOrders.facilityId,
					encounterId: medicationOrders.encounterId,
					preEncounterId: medicationOrders.preEncounterId,
					formularyItemId: medicationOrders.formularyItemId,
					genericName: medicationOrders.genericName,
					brandName: medicationOrders.brandName,
					rxnormCode: medicationOrders.rxnormCode,
					dose: medicationOrders.dose,
					doseUnit: medicationOrders.doseUnit,
					doseForm: medicationOrders.doseForm,
					route: medicationOrders.route,
					frequency: medicationOrders.frequency,
					durationDays: medicationOrders.durationDays,
					specialInstructions: medicationOrders.specialInstructions,
					isPrn: medicationOrders.isPrn,
					prnReason: medicationOrders.prnReason,
					isControlledSubstance: medicationOrders.isControlledSubstance,
					pdeaSchedule: medicationOrders.pdeaSchedule,
					pdeaTrancheNumber: medicationOrders.pdeaTrancheNumber,
					pdeaTrancheTotal: medicationOrders.pdeaTrancheTotal,
					parentOrderId: medicationOrders.parentOrderId,
					status: medicationOrders.status,
					orderingStaffId: medicationOrders.orderingStaffId,
					orderingStaffName: users.name,
					patientId: patients.id,
					patientFirstName: patients.firstName,
					patientLastName: patients.lastName,
					patientMrn: patients.mrn,
					patientDateOfBirth: patients.dateOfBirth,
					cdsAlerts: medicationOrders.cdsAlerts,
					cdsOverrides: medicationOrders.cdsOverrides,
					createdAt: medicationOrders.createdAt,
					updatedAt: medicationOrders.updatedAt,
				})
				.from(medicationOrders)
				.leftJoin(encounters, eq(medicationOrders.encounterId, encounters.id))
				.leftJoin(patients, eq(encounters.patientId, patients.id))
				.leftJoin(staffProfiles, eq(medicationOrders.orderingStaffId, staffProfiles.id))
				.leftJoin(users, eq(staffProfiles.userId, users.id))
				.where(whereClause)
				.orderBy(
					sql`CASE
						WHEN ${medicationOrders.isControlledSubstance} = true THEN 0
						ELSE 1
					END`,
					desc(medicationOrders.createdAt),
				)
				.limit(limit)
				.offset(offset),
		])

		const total = totalResult?.count ?? 0

		return {
			data: rows.map(row => {
				const { alertCount, criticalAlertCount } = this.getAlertCounts(row.cdsAlerts)

				return {
				...row,
				isTranche: row.parentOrderId !== null,
				patientName:
					row.patientLastName && row.patientFirstName
						? `${row.patientLastName}, ${row.patientFirstName}`
						: null,
				patientWeight: null,
				patientCreatinine: null,
				priority: "routine" as const,
				alertCount,
				criticalAlertCount,
				receivedAt: row.createdAt,
				}
			}),
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	async verifyOrder(input: VerifyOrderInput, userId: string) {
		const [pharmacist] = await db.select().from(staffProfiles).where(eq(staffProfiles.userId, userId))
		if (!pharmacist) throw new NotFoundException("Pharmacist staff profile not found for user")

		// Ensure medication order exists
		await this.findMedOrder(input.medicationOrderId)

		// Insert verification record
		const [verification] = await db
			.insert(orderVerifications)
			.values({
				medicationOrderId: input.medicationOrderId,
				action: input.action,
				pharmacistStaffId: pharmacist.id,
				rejectionReason: input.rejectionReason ?? null,
				modificationNotes: input.modificationNotes ?? null,
				verifiedAt: new Date(),
			})
			.returning()

		// Update medication order status based on action
		const statusMap = {
			approved: "active" as const,
			rejected: "rejected" as const,
			modified: "modified" as const,
		}

		await db
			.update(medicationOrders)
			.set({ status: statusMap[input.action], updatedAt: new Date() })
			.where(eq(medicationOrders.id, input.medicationOrderId))

		this.logger.log(`Order ${input.medicationOrderId} ${input.action} by pharmacist ${pharmacist.id}`)

		// Return verification with pharmacist name
		const [result] = await db
			.select({
				id: orderVerifications.id,
				medicationOrderId: orderVerifications.medicationOrderId,
				action: orderVerifications.action,
				pharmacistStaffId: orderVerifications.pharmacistStaffId,
				pharmacistStaffName: users.name,
				rejectionReason: orderVerifications.rejectionReason,
				modificationNotes: orderVerifications.modificationNotes,
				verifiedAt: orderVerifications.verifiedAt,
				createdAt: orderVerifications.createdAt,
			})
			.from(orderVerifications)
			.leftJoin(staffProfiles, eq(orderVerifications.pharmacistStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.where(eq(orderVerifications.id, verification!.id))

		return result!
	}

	// ========================================================================
	// Prescriptions
	// ========================================================================

	async findPrescriptions(input: PrescriptionListInput) {
		const page = Number(input.page) || 1
		const limit = Number(input.limit) || 50
		const offset = (page - 1) * limit

		const conditions: ReturnType<typeof eq>[] = []
		if (input.encounterId) conditions.push(eq(prescriptions.encounterId, input.encounterId))
		if (input.patientId) conditions.push(eq(prescriptions.patientId, input.patientId))

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined

		const [[totalResult], rows] = await Promise.all([
			db.select({ count: count() }).from(prescriptions).where(whereClause),
			db
				.select({
					id: prescriptions.id,
					facilityId: prescriptions.facilityId,
					encounterId: prescriptions.encounterId,
					medicationOrderId: prescriptions.medicationOrderId,
					patientId: prescriptions.patientId,
					prescriberStaffId: prescriptions.prescriberStaffId,
					prescriberStaffName: users.name,
					prcLicenseNumber: prescriptions.prcLicenseNumber,
					ptrNumber: prescriptions.ptrNumber,
					pdeaS2License: prescriptions.pdeaS2License,
					prescriptionContent: prescriptions.prescriptionContent,
					status: prescriptions.status,
					signedAt: prescriptions.signedAt,
					createdAt: prescriptions.createdAt,
				})
				.from(prescriptions)
				.leftJoin(staffProfiles, eq(prescriptions.prescriberStaffId, staffProfiles.id))
				.leftJoin(users, eq(staffProfiles.userId, users.id))
				.where(whereClause)
				.orderBy(desc(prescriptions.createdAt))
				.limit(limit)
				.offset(offset),
		])

		const total = totalResult?.count ?? 0

		return {
			data: rows,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	async findPrescription(id: string) {
		const [row] = await db
			.select({
				id: prescriptions.id,
				facilityId: prescriptions.facilityId,
				encounterId: prescriptions.encounterId,
				medicationOrderId: prescriptions.medicationOrderId,
				patientId: prescriptions.patientId,
				prescriberStaffId: prescriptions.prescriberStaffId,
				prescriberStaffName: users.name,
				prcLicenseNumber: prescriptions.prcLicenseNumber,
				ptrNumber: prescriptions.ptrNumber,
				pdeaS2License: prescriptions.pdeaS2License,
				prescriptionContent: prescriptions.prescriptionContent,
				status: prescriptions.status,
				signedAt: prescriptions.signedAt,
				createdAt: prescriptions.createdAt,
			})
			.from(prescriptions)
			.leftJoin(staffProfiles, eq(prescriptions.prescriberStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.where(eq(prescriptions.id, id))

		if (!row) throw new NotFoundException(`Prescription ${id} not found`)
		return row
	}

	async createPrescription(input: CreatePrescriptionInput, userId: string) {
		const [staff] = await db.select().from(staffProfiles).where(eq(staffProfiles.userId, userId))
		if (!staff) throw new NotFoundException("Staff profile not found for user")

		if (!staff.prcLicenseNumber) throw new NotFoundException("Prescriber does not have a PRC license number")
		if (!staff.ptrNumber) throw new NotFoundException("Prescriber does not have a PTR number")

		// Fetch medication order details for prescription content
		const [medOrder] = await db
			.select()
			.from(medicationOrders)
			.where(eq(medicationOrders.id, input.medicationOrderId))

		if (!medOrder) throw new NotFoundException(`Medication order ${input.medicationOrderId} not found`)

		const prescriptionContent = {
			genericName: medOrder.genericName,
			brandName: medOrder.brandName,
			dose: medOrder.dose,
			doseUnit: medOrder.doseUnit,
			doseForm: medOrder.doseForm,
			route: medOrder.route,
			frequency: medOrder.frequency,
			durationDays: medOrder.durationDays,
			specialInstructions: medOrder.specialInstructions,
			isPrn: medOrder.isPrn,
			prnReason: medOrder.prnReason,
		}

		const [created] = await db
			.insert(prescriptions)
			.values({
				facilityId: input.facilityId,
				encounterId: input.encounterId,
				medicationOrderId: input.medicationOrderId,
				patientId: input.patientId,
				prescriberStaffId: staff.id,
				prcLicenseNumber: staff.prcLicenseNumber,
				ptrNumber: staff.ptrNumber,
				pdeaS2License: staff.pdeaS2License ?? null,
				prescriptionContent,
				status: "draft",
			})
			.returning()

		this.logger.log(`Created prescription ${created!.id} from medication order ${input.medicationOrderId}`)

		return this.findPrescription(created!.id)
	}

	async signPrescription(id: string) {
		await this.findPrescription(id)

		await db
			.update(prescriptions)
			.set({ status: "signed", signedAt: new Date() })
			.where(eq(prescriptions.id, id))

		this.logger.log(`Signed prescription ${id}`)

		return this.findPrescription(id)
	}

	// ========================================================================
	// Active Orders (cross-module)
	// ========================================================================

	async getActiveOrders(input: ActiveOrdersInput) {
		const [activeMedOrders, activeLabOrders, activeImagingOrders] = await Promise.all([
			db
				.select({
					id: medicationOrders.id,
					facilityId: medicationOrders.facilityId,
					encounterId: medicationOrders.encounterId,
					preEncounterId: medicationOrders.preEncounterId,
					formularyItemId: medicationOrders.formularyItemId,
					genericName: medicationOrders.genericName,
					brandName: medicationOrders.brandName,
					rxnormCode: medicationOrders.rxnormCode,
					dose: medicationOrders.dose,
					doseUnit: medicationOrders.doseUnit,
					doseForm: medicationOrders.doseForm,
					route: medicationOrders.route,
					frequency: medicationOrders.frequency,
					durationDays: medicationOrders.durationDays,
					specialInstructions: medicationOrders.specialInstructions,
					isPrn: medicationOrders.isPrn,
					prnReason: medicationOrders.prnReason,
					isControlledSubstance: medicationOrders.isControlledSubstance,
					pdeaSchedule: medicationOrders.pdeaSchedule,
					pdeaTrancheNumber: medicationOrders.pdeaTrancheNumber,
					pdeaTrancheTotal: medicationOrders.pdeaTrancheTotal,
					parentOrderId: medicationOrders.parentOrderId,
					status: medicationOrders.status,
					orderingStaffId: medicationOrders.orderingStaffId,
					orderingStaffName: users.name,
					cdsAlerts: medicationOrders.cdsAlerts,
					cdsOverrides: medicationOrders.cdsOverrides,
					createdAt: medicationOrders.createdAt,
					updatedAt: medicationOrders.updatedAt,
				})
				.from(medicationOrders)
				.leftJoin(staffProfiles, eq(medicationOrders.orderingStaffId, staffProfiles.id))
				.leftJoin(users, eq(staffProfiles.userId, users.id))
				.where(
					and(
						eq(medicationOrders.encounterId, input.encounterId),
						inArray(medicationOrders.status, ["pending_verification", "verified", "active"]),
					),
				)
				.orderBy(desc(medicationOrders.createdAt)),
			db
				.select({
					id: labOrders.id,
					facilityId: labOrders.facilityId,
					encounterId: labOrders.encounterId,
					preEncounterId: labOrders.preEncounterId,
					loincCode: labOrders.loincCode,
					panelCode: labOrders.panelCode,
					testName: labOrders.testName,
					panelName: labOrders.panelName,
					priority: labOrders.priority,
					status: labOrders.status,
					specimenType: labOrders.specimenType,
					orderingStaffId: labOrders.orderingStaffId,
					orderingStaffName: users.name,
					collectionDatetime: labOrders.collectionDatetime,
					resultedDatetime: labOrders.resultedDatetime,
					results: labOrders.results,
					cdsAlerts: labOrders.cdsAlerts,
					createdAt: labOrders.createdAt,
					updatedAt: labOrders.updatedAt,
				})
				.from(labOrders)
				.leftJoin(staffProfiles, eq(labOrders.orderingStaffId, staffProfiles.id))
				.leftJoin(users, eq(staffProfiles.userId, users.id))
				.where(
					and(
						eq(labOrders.encounterId, input.encounterId),
						inArray(labOrders.status, ["ordered", "collected"]),
					),
				)
				.orderBy(desc(labOrders.createdAt)),
			db
				.select({
					id: imagingOrders.id,
					facilityId: imagingOrders.facilityId,
					encounterId: imagingOrders.encounterId,
					preEncounterId: imagingOrders.preEncounterId,
					modality: imagingOrders.modality,
					bodyPart: imagingOrders.bodyPart,
					clinicalIndication: imagingOrders.clinicalIndication,
					priority: imagingOrders.priority,
					status: imagingOrders.status,
					orderingStaffId: imagingOrders.orderingStaffId,
					orderingStaffName: users.name,
					scheduledDatetime: imagingOrders.scheduledDatetime,
					completedDatetime: imagingOrders.completedDatetime,
					report: imagingOrders.report,
					structuredResults: imagingOrders.structuredResults,
					cdsAlerts: imagingOrders.cdsAlerts,
					createdAt: imagingOrders.createdAt,
					updatedAt: imagingOrders.updatedAt,
				})
				.from(imagingOrders)
				.leftJoin(staffProfiles, eq(imagingOrders.orderingStaffId, staffProfiles.id))
				.leftJoin(users, eq(staffProfiles.userId, users.id))
				.where(
					and(
						eq(imagingOrders.encounterId, input.encounterId),
						inArray(imagingOrders.status, ["ordered", "scheduled", "in_progress"]),
					),
				)
				.orderBy(desc(imagingOrders.createdAt)),
		])

		return {
			medicationOrders: activeMedOrders.map(order => ({
				...order,
				isTranche: order.parentOrderId !== null,
			})),
			labOrders: activeLabOrders,
			imagingOrders: activeImagingOrders,
		}
	}
}
