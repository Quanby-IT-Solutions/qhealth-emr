import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common"
import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm"

import {
	auditLogs,
	counselingLogs,
	dispenseLogs,
	drugGenerics,
	encounters,
	encounterStatusEvents,
	formularyItems,
	highAlertVerifications,
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
import { closeOpenSlaStep } from "@/utils/sla-events"
import { resolveStepTarget } from "@/utils/sla-step-target"

import { ProblemsAllergiesService } from "../problems-allergies/problems-allergies.service"

type CdsEvaluateInput = V1Inputs["orders"]["evaluateCds"]
type MedOrderListInput = V1Inputs["orders"]["listMedOrders"]
type CreateMedOrderInput = V1Inputs["orders"]["createMedOrder"]
type UpdateMedOrderInput = V1Inputs["orders"]["updateMedOrder"]
type LabOrderListInput = V1Inputs["orders"]["listLabOrders"]
type CreateLabOrderInput = V1Inputs["orders"]["createLabOrder"]
type UpdateLabOrderInput = V1Inputs["orders"]["updateLabOrder"]
type ImagingOrderListInput = V1Inputs["orders"]["listImagingOrders"]
type CreateImagingOrderInput = V1Inputs["orders"]["createImagingOrder"]
type UpdateImagingOrderInput = V1Inputs["orders"]["updateImagingOrder"]
type VerificationQueueInput = V1Inputs["orders"]["getVerificationQueue"]
type VerifyOrderInput = V1Inputs["orders"]["verifyOrder"]
type CreateHighAlertVerificationInput = V1Inputs["orders"]["createHighAlertVerification"]
type PrescriptionListInput = V1Inputs["orders"]["listPrescriptions"]
type CreatePrescriptionInput = V1Inputs["orders"]["createPrescription"]
type ActiveOrdersInput = V1Inputs["orders"]["getActiveOrders"]
type PdeaLicenseCheckInput = V1Inputs["orders"]["checkPdeaLicense"]
type TranchePreviewInput = V1Inputs["orders"]["previewTranches"]
type CreateTranchedOrdersInput = V1Inputs["orders"]["createTranchedOrders"]
type DispenseOrderInput = V1Inputs["orders"]["dispenseOrder"]
type DispenseLogListInput = V1Inputs["orders"]["listDispenseLogs"]
type OpdPrescriptionSearchInput = V1Inputs["orders"]["searchOpdPrescription"]
type OpdDispenseInput = V1Inputs["orders"]["opdDispense"]
type OpdDispenseHistoryInput = V1Inputs["orders"]["listOpdDispenseHistory"]
type SaveCounselingLogInput = V1Inputs["orders"]["saveCounselingLog"]
type CounselingLogListInput = V1Inputs["orders"]["listCounselingLogs"]

@Injectable()
export class OrdersService {
	private readonly logger = new Logger(OrdersService.name)

	constructor(private readonly problemsAllergiesService: ProblemsAllergiesService) {}

	private async findFormularyItemForCds(
		input: Pick<CdsEvaluateInput, "facilityId" | "formularyItemId" | "genericName">
	) {
		if (input.formularyItemId) {
			const [formularyItem] = await db
				.select()
				.from(formularyItems)
				.where(eq(formularyItems.id, input.formularyItemId))
				.limit(1)

			return formularyItem ?? null
		}

		const [formularyItem] = await db
			.select({
				id: formularyItems.id,
				facilityId: formularyItems.facilityId,
				drugGenericId: formularyItems.drugGenericId,
				drugBrandId: formularyItems.drugBrandId,
				doseForm: formularyItems.doseForm,
				strength: formularyItems.strength,
				route: formularyItems.route,
				isActive: formularyItems.isActive,
				isHighAlert: formularyItems.isHighAlert,
				highAlertNotes: formularyItems.highAlertNotes,
				isRestricted: formularyItems.isRestricted,
				restrictionNotes: formularyItems.restrictionNotes,
				formularyNotes: formularyItems.formularyNotes,
				createdAt: formularyItems.createdAt,
				updatedAt: formularyItems.updatedAt,
			})
			.from(formularyItems)
			.innerJoin(drugGenerics, eq(formularyItems.drugGenericId, drugGenerics.id))
			.where(
				and(
					eq(formularyItems.facilityId, input.facilityId),
					eq(formularyItems.isActive, true),
					sql`lower(${drugGenerics.genericName}) = ${input.genericName.trim().toLowerCase()}`
				)
			)
			.orderBy(desc(formularyItems.createdAt))
			.limit(1)

		return formularyItem ?? null
	}

	private hasNonEmptyCdsOverrides(cdsOverrides: unknown) {
		if (!cdsOverrides) {
			return false
		}

		if (Array.isArray(cdsOverrides)) {
			return cdsOverrides.length > 0
		}

		if (typeof cdsOverrides === "object") {
			const overrides = (cdsOverrides as { overrides?: unknown }).overrides
			if (Array.isArray(overrides)) {
				return overrides.length > 0
			}

			return Object.keys(cdsOverrides as Record<string, unknown>).length > 0
		}

		return false
	}

	private hasHighAlertAlert(cdsAlerts: unknown) {
		if (!Array.isArray(cdsAlerts)) {
			return false
		}

		return cdsAlerts.some(alert => {
			if (!alert || typeof alert !== "object") {
				return false
			}

			return (alert as { type?: unknown }).type === "high_alert"
		})
	}

	private async writeAuditLog(input: {
		facilityId: string
		userId: string
		staffProfileId?: string | null
		action: "create" | "read" | "update" | "delete" | "sign" | "verify" | "override"
		entityType: string
		entityId: string
		metadata?: unknown
	}) {
		await db.insert(auditLogs).values({
			facilityId: input.facilityId,
			userId: input.userId,
			staffProfileId: input.staffProfileId ?? null,
			action: input.action,
			entityType: input.entityType,
			entityId: input.entityId,
			metadata: input.metadata ?? null,
		})
	}

	// ========================================================================
	// CDS Evaluation
	// ========================================================================

	async evaluateCds(input: CdsEvaluateInput) {
		const alerts: {
			type:
				| "allergy_hard_block"
				| "allergy_soft_block"
				| "formulary_warning"
				| "formulary_restricted"
				| "high_alert"
				| "s2_license_block"
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
						details: {
							allergenName: allergy.allergenName,
							allergenType: allergy.allergenType,
							severity: allergy.severity,
						},
					})
				} else {
					alerts.push({
						type: "allergy_soft_block",
						severity: "soft_block",
						message: `Patient has a ${allergy.severity} allergy to ${allergy.allergenName}. Override required to proceed.`,
						details: {
							allergenName: allergy.allergenName,
							allergenType: allergy.allergenType,
							severity: allergy.severity,
						},
					})
				}
			}
		}

		// Step 2 & 3: Formulary check + High-alert check
		const formularyItem = await this.findFormularyItemForCds(input)

		if (!formularyItem || !formularyItem.isActive) {
			alerts.push({
				type: "formulary_warning",
				severity: "warning",
				message: "This drug is off-formulary or inactive at this facility.",
				details: formularyItem?.formularyNotes
					? { formularyNotes: formularyItem.formularyNotes }
					: undefined,
			})
		} else {
			// Step 2a: Restricted-state check (FORM-002)
			if (formularyItem.isRestricted) {
				alerts.push({
					type: "formulary_restricted",
					severity: "soft_block",
					message:
						"This drug is RESTRICTED at this facility. Pharmacist authorisation is required before proceeding.",
					details: formularyItem.restrictionNotes
						? { restrictionNotes: formularyItem.restrictionNotes }
						: undefined,
				})
			}

			// Step 3: High-alert check
			if (formularyItem.isHighAlert) {
				alerts.push({
					type: "high_alert",
					severity: "warning",
					message:
						"This is a HIGH-ALERT medication. Double verification by a pharmacist is required.",
					details: formularyItem.highAlertNotes
						? { highAlertNotes: formularyItem.highAlertNotes }
						: undefined,
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
					message:
						"Ordering staff does not have a PDEA S-2 license. Cannot prescribe controlled substances.",
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

			return [
				{
					id: `${candidate.type ?? "alert"}-${index}`,
					type: mappedType,
					severity: mappedSeverity,
					title: mappedTitle,
					message: candidate.message ?? "Clinical safety check triggered.",
					details: candidate.details,
					isHardBlock: candidate.severity === "hard_block",
					requiresOverride: candidate.severity === "soft_block",
				},
			]
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
		if (input.preEncounterId)
			conditions.push(eq(medicationOrders.preEncounterId, input.preEncounterId))
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
					firstDoseAt: medicationOrders.firstDoseAt,
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
				firstDoseAt: medicationOrders.firstDoseAt,
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

		const repeatingFrequencies = ["q4h", "q6h", "q8h", "q12h", "daily", "bid", "tid", "qid"]
		if (repeatingFrequencies.includes(input.frequency) && !input.durationDays) {
			throw new BadRequestException(
				`durationDays is required for repeating frequency "${input.frequency}"`
			)
		}

		const isPrn = input.frequency === "prn" ? true : (input.isPrn ?? false)

		if (input.encounterId) {
			const [encounter] = await db
				.select({ encounterType: encounters.encounterType })
				.from(encounters)
				.where(eq(encounters.id, input.encounterId))
				.limit(1)

			if (
				encounter &&
				(encounter.encounterType === "inpatient" || encounter.encounterType === "emergency") &&
				!input.firstDoseAt
			) {
				throw new BadRequestException(
					"firstDoseAt is required for inpatient and emergency encounter orders"
				)
			}
		}

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
				firstDoseAt: input.firstDoseAt ? new Date(input.firstDoseAt) : null,
				durationDays: input.durationDays ?? null,
				specialInstructions: input.specialInstructions ?? null,
				isPrn,
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

		if (created && this.hasNonEmptyCdsOverrides(input.cdsOverrides)) {
			await this.writeAuditLog({
				facilityId: input.facilityId,
				userId,
				staffProfileId: staff.id,
				action: "override",
				entityType: "medication_order",
				entityId: created.id,
				metadata: input.cdsOverrides,
			})
		}

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
		if (input.firstDoseAt !== undefined) updateValues.firstDoseAt = new Date(input.firstDoseAt)
		if (input.durationDays !== undefined) updateValues.durationDays = input.durationDays
		if (input.specialInstructions !== undefined)
			updateValues.specialInstructions = input.specialInstructions
		if (input.isPrn !== undefined) updateValues.isPrn = input.isPrn
		if (input.prnReason !== undefined) updateValues.prnReason = input.prnReason
		if (input.status !== undefined) updateValues.status = input.status

		await db.update(medicationOrders).set(updateValues).where(eq(medicationOrders.id, existing.id))

		return this.findMedOrder(input.id)
	}

	async discontinueMedOrder(id: string) {
		const order = await this.findMedOrder(id)

		await db
			.update(medicationOrders)
			.set({ status: "discontinued", updatedAt: new Date() })
			.where(eq(medicationOrders.id, id))

		// SLA-004: Track pharmacy lifecycle — close any open step then write discontinue event
		if (order.encounterId) {
			const slaMins = await resolveStepTarget(order.facilityId, "pharmacy", "discontinued")
			await closeOpenSlaStep(db, order.encounterId, "pharmacy")
			await db.insert(encounterStatusEvents).values({
				facilityId: order.facilityId,
				encounterId: order.encounterId,
				fromStatus: order.status,
				toStatus: "discontinued",
				workflowType: "pharmacy" as const,
				staffId: null,
				slaTargetMinutes: slaMins,
				notes: `Medication order ${id} discontinued`,
				occurredAt: new Date(),
			})
		}

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
				specimenReceivedAt: labOrders.specimenReceivedAt,
				billingClearedAt: labOrders.billingClearedAt,
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

		// SLA-003/SLA-004: Track ancillary work from the moment the order is placed.
		// Only encounter-linked orders carry an SLA clock.
		if (input.encounterId) {
			const slaMins = await resolveStepTarget(input.facilityId, "ancillary", "lab_ordered")
			await db.insert(encounterStatusEvents).values({
				facilityId: input.facilityId,
				encounterId: input.encounterId,
				fromStatus: null,
				toStatus: "lab_ordered",
				workflowType: "ancillary" as const,
				staffId: staff.id,
				slaTargetMinutes: slaMins,
				notes: `Lab order: ${input.testName ?? input.panelName ?? "Unknown"}`,
				occurredAt: new Date(),
			})
		}

		return this.findLabOrder(created!.id)
	}

	/**
	 * SLA-016: Update a lab order.
	 * - When status transitions to "collected", auto-sets specimenReceivedAt if not already set.
	 * - billingClearedAt is accepted explicitly from billing staff (Flow 3 Step 2).
	 */
	async updateLabOrder(input: UpdateLabOrderInput) {
		const existing = await this.findLabOrder(input.id)

		const updateData: Record<string, unknown> = { updatedAt: new Date() }

		if (input.status !== undefined) {
			updateData.status = input.status
			// Auto-set specimenReceivedAt when lab acknowledges specimen receipt (SLA-016 Step 1)
			if (input.status === "collected" && !existing.specimenReceivedAt) {
				updateData.specimenReceivedAt = new Date()
			}
		}
		if (input.collectionDatetime !== undefined)
			updateData.collectionDatetime = input.collectionDatetime
		if (input.resultedDatetime !== undefined) updateData.resultedDatetime = input.resultedDatetime
		if (input.results !== undefined) updateData.results = input.results
		// SLA-016 Step 2: billing clearance timestamp persisted explicitly
		if (input.billingClearedAt !== undefined) updateData.billingClearedAt = input.billingClearedAt

		await db.update(labOrders).set(updateData).where(eq(labOrders.id, input.id))

		return this.findLabOrder(input.id)
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
		if (input.preEncounterId)
			conditions.push(eq(imagingOrders.preEncounterId, input.preEncounterId))
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
				studyStartedAt: imagingOrders.studyStartedAt,
				imagingOrderReceivedAt: imagingOrders.imagingOrderReceivedAt,
				billingClearedAt: imagingOrders.billingClearedAt,
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

		// SLA-003/SLA-004: Track ancillary work from the moment the imaging order is placed.
		if (input.encounterId) {
			const slaMins = await resolveStepTarget(input.facilityId, "ancillary", "imaging_ordered")
			await db.insert(encounterStatusEvents).values({
				facilityId: input.facilityId,
				encounterId: input.encounterId,
				fromStatus: null,
				toStatus: "imaging_ordered",
				workflowType: "ancillary" as const,
				staffId: staff.id,
				slaTargetMinutes: slaMins,
				notes: `Imaging order: ${input.modality} — ${input.bodyPart}`,
				occurredAt: new Date(),
			})
		}

		return this.findImagingOrder(created!.id)
	}

	/**
	 * SLA-016/SLA-019: Update an imaging order.
	 * - When status transitions to "in_progress", auto-sets studyStartedAt if not already set.
	 * - When status transitions to "scheduled", auto-sets imagingOrderReceivedAt if not already set (SLA-019 Step 1).
	 * - imagingOrderReceivedAt can also be provided explicitly by radiology staff.
	 * - billingClearedAt is accepted explicitly from billing staff (Flow 3 Step 2).
	 */
	async updateImagingOrder(input: UpdateImagingOrderInput) {
		// Check order exists (throws NotFoundException if not)
		await this.findImagingOrder(input.id)

		const updateData: Record<string, unknown> = { updatedAt: new Date() }

		if (input.status !== undefined) {
			updateData.status = input.status
			// Auto-set studyStartedAt when radiology begins the study (SLA-016 Step 3)
			if (input.status === "in_progress") {
				// Fetch current to avoid overwriting an existing timestamp
				const [current] = await db
					.select({
						studyStartedAt: imagingOrders.studyStartedAt,
						imagingOrderReceivedAt: imagingOrders.imagingOrderReceivedAt,
					})
					.from(imagingOrders)
					.where(eq(imagingOrders.id, input.id))
					.limit(1)
				if (!current?.studyStartedAt) {
					updateData.studyStartedAt = new Date()
				}
				// SLA-019: also auto-set imagingOrderReceivedAt on in_progress if not yet captured
				if (!current?.imagingOrderReceivedAt && input.imagingOrderReceivedAt === undefined) {
					updateData.imagingOrderReceivedAt = new Date()
				}
			}
			// SLA-019: auto-set imagingOrderReceivedAt when order is acknowledged as scheduled
			if (input.status === "scheduled") {
				const [current] = await db
					.select({ imagingOrderReceivedAt: imagingOrders.imagingOrderReceivedAt })
					.from(imagingOrders)
					.where(eq(imagingOrders.id, input.id))
					.limit(1)
				if (!current?.imagingOrderReceivedAt && input.imagingOrderReceivedAt === undefined) {
					updateData.imagingOrderReceivedAt = new Date()
				}
			}
		}
		if (input.scheduledDatetime !== undefined)
			updateData.scheduledDatetime = input.scheduledDatetime
		if (input.completedDatetime !== undefined)
			updateData.completedDatetime = input.completedDatetime
		if (input.report !== undefined) updateData.report = input.report
		if (input.structuredResults !== undefined)
			updateData.structuredResults = input.structuredResults
		// SLA-019: explicit receipt timestamp from radiology staff (overrides auto-set)
		if (input.imagingOrderReceivedAt !== undefined)
			updateData.imagingOrderReceivedAt = input.imagingOrderReceivedAt
		// SLA-016 Step 2: billing clearance timestamp persisted explicitly
		if (input.billingClearedAt !== undefined) updateData.billingClearedAt = input.billingClearedAt

		await db.update(imagingOrders).set(updateData).where(eq(imagingOrders.id, input.id))

		return this.findImagingOrder(input.id)
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
			eq(medicationOrders.status, "pending_verification")
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
					firstDoseAt: medicationOrders.firstDoseAt,
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
					desc(medicationOrders.createdAt)
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
		const [pharmacist] = await db
			.select()
			.from(staffProfiles)
			.where(eq(staffProfiles.userId, userId))
		if (!pharmacist) throw new NotFoundException("Pharmacist staff profile not found for user")

		// Capture the order before status update so we have facilityId/encounterId/fromStatus
		const medOrder = await this.findMedOrder(input.medicationOrderId)

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

		this.logger.log(
			`Order ${input.medicationOrderId} ${input.action} by pharmacist ${pharmacist.id}`
		)

		// SLA-004: Write durable pharmacy SLA event for all verification outcomes.
		// Only encounter-linked orders are tracked; pre-encounter orders have no encounter ID.
		if (medOrder.encounterId) {
			const toStatus = statusMap[input.action]
			const slaMins = await resolveStepTarget(medOrder.facilityId, "pharmacy", toStatus)
			await closeOpenSlaStep(db, medOrder.encounterId, "pharmacy")
			await db.insert(encounterStatusEvents).values({
				facilityId: medOrder.facilityId,
				encounterId: medOrder.encounterId,
				fromStatus: medOrder.status,
				toStatus,
				workflowType: "pharmacy" as const,
				staffId: pharmacist.id,
				slaTargetMinutes: slaMins,
				notes: `Medication order ${input.medicationOrderId} ${input.action}`,
				occurredAt: new Date(),
			})
		}

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

	async createHighAlertVerification(input: CreateHighAlertVerificationInput, userId: string) {
		const [sessionStaff] = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(eq(staffProfiles.userId, userId))
			.limit(1)

		const [order] = await db
			.select({
				id: medicationOrders.id,
				facilityId: medicationOrders.facilityId,
				orderingStaffId: medicationOrders.orderingStaffId,
				cdsAlerts: medicationOrders.cdsAlerts,
			})
			.from(medicationOrders)
			.where(eq(medicationOrders.id, input.medicationOrderId))
			.limit(1)

		if (!order || !this.hasHighAlertAlert(order.cdsAlerts)) {
			throw new NotFoundException("High-alert medication order not found")
		}

		if (input.verifyingStaffId === order.orderingStaffId) {
			throw new BadRequestException("A clinician cannot co-sign their own high-alert order")
		}

		const [verification] = await db
			.insert(highAlertVerifications)
			.values({
				medicationOrderId: input.medicationOrderId,
				requestingStaffId: order.orderingStaffId,
				verifyingStaffId: input.verifyingStaffId,
				verifiedAt: new Date(),
				notes: input.notes ?? null,
			})
			.returning()

		if (!verification) {
			throw new NotFoundException("High-alert verification could not be created")
		}

		await this.writeAuditLog({
			facilityId: order.facilityId,
			userId,
			staffProfileId: sessionStaff?.id ?? null,
			action: "verify",
			entityType: "high_alert_verification",
			entityId: verification.id,
			metadata: {
				medicationOrderId: input.medicationOrderId,
				verifyingStaffId: input.verifyingStaffId,
				notes: input.notes ?? null,
			},
		})

		return verification
	}

	async getHighAlertVerification(medicationOrderId: string) {
		const [verification] = await db
			.select()
			.from(highAlertVerifications)
			.where(eq(highAlertVerifications.medicationOrderId, medicationOrderId))
			.orderBy(desc(highAlertVerifications.verifiedAt))
			.limit(1)

		return verification ?? null
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

		if (!staff.prcLicenseNumber)
			throw new NotFoundException("Prescriber does not have a PRC license number")
		if (!staff.ptrNumber) throw new NotFoundException("Prescriber does not have a PTR number")
		if (staff.prcExpiry && new Date(staff.prcExpiry) < new Date()) {
			throw new BadRequestException("Physician PRC license is expired")
		}
		if (staff.ptrExpiry && new Date(staff.ptrExpiry) < new Date()) {
			throw new BadRequestException("Physician PTR number is expired")
		}

		// Fetch medication order details for prescription content
		const [medOrder] = await db
			.select()
			.from(medicationOrders)
			.where(eq(medicationOrders.id, input.medicationOrderId))

		if (!medOrder)
			throw new NotFoundException(`Medication order ${input.medicationOrderId} not found`)
		if (medOrder.status !== "verified" && medOrder.status !== "active") {
			throw new BadRequestException(
				"Only verified or active medication orders can generate a prescription"
			)
		}

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

		this.logger.log(
			`Created prescription ${created!.id} from medication order ${input.medicationOrderId}`
		)

		return this.findPrescription(created!.id)
	}

	async signPrescription(id: string) {
		const prescription = await this.findPrescription(id)
		if (prescription.status === "signed" || prescription.status === "issued") {
			throw new BadRequestException("Prescription is already signed")
		}

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
					firstDoseAt: medicationOrders.firstDoseAt,
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
						inArray(medicationOrders.status, ["pending_verification", "verified", "active"])
					)
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
						inArray(labOrders.status, ["ordered", "collected"])
					)
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
						inArray(imagingOrders.status, ["ordered", "scheduled", "in_progress"])
					)
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

	// ========================================================================
	// PDEA License Check (AD-010)
	// ========================================================================

	async checkPdeaLicense(input: PdeaLicenseCheckInput) {
		const [staff] = await db
			.select({
				id: staffProfiles.id,
				pdeaS2License: staffProfiles.pdeaS2License,
				pdeaS2Expiry: staffProfiles.pdeaS2Expiry,
				userId: staffProfiles.userId,
			})
			.from(staffProfiles)
			.where(
				and(eq(staffProfiles.id, input.staffId), eq(staffProfiles.facilityId, input.facilityId))
			)
			.limit(1)

		if (!staff) {
			return {
				staffId: input.staffId,
				staffName: "Unknown",
				hasLicense: false,
				licenseNumber: null,
				expiryDate: null,
				isExpired: false,
				daysUntilExpiry: null,
				canPrescribeControlled: false,
				errorMessage: "Staff profile not found in this facility",
			}
		}

		const [userRow] = await db
			.select({ name: users.name })
			.from(users)
			.where(eq(users.id, staff.userId))
			.limit(1)

		const hasLicense = !!staff.pdeaS2License
		let isExpired = false
		let daysUntilExpiry: number | null = null

		if (hasLicense && staff.pdeaS2Expiry) {
			const expiryDate = new Date(staff.pdeaS2Expiry)
			const today = new Date()
			today.setHours(0, 0, 0, 0)
			isExpired = expiryDate < today
			daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
		}

		return {
			staffId: staff.id,
			staffName: userRow?.name ?? "Unknown",
			hasLicense,
			licenseNumber: staff.pdeaS2License ?? null,
			expiryDate: staff.pdeaS2Expiry ?? null,
			isExpired,
			daysUntilExpiry,
			canPrescribeControlled: hasLicense && !isExpired,
			errorMessage: isExpired ? `PDEA S-2 license expired on ${staff.pdeaS2Expiry}` : null,
		}
	}

	// ========================================================================
	// PDEA Tranche Preview (AD-010)
	// ========================================================================

	async previewTranches(input: TranchePreviewInput) {
		// PDEA regulations: S-2 controlled substances are limited to 30 days per prescription
		const MAX_DAYS_PER_TRANCHE = 30
		const requiresTranching = input.durationDays > MAX_DAYS_PER_TRANCHE

		if (!requiresTranching) {
			const startDate = input.startDate ? new Date(input.startDate) : new Date()
			const endDate = new Date(startDate)
			endDate.setDate(endDate.getDate() + input.durationDays - 1)

			return {
				requiresTranching: false,
				reason: null,
				totalDays: input.durationDays,
				maxDaysPerTranche: MAX_DAYS_PER_TRANCHE,
				tranches: [
					{
						trancheNumber: 1,
						startDate: startDate.toISOString().split("T")[0]!,
						endDate: endDate.toISOString().split("T")[0]!,
						durationDays: input.durationDays,
						quantityPerTranche: null,
						noRefill: true,
					},
				],
			}
		}

		const totalTranches = Math.ceil(input.durationDays / MAX_DAYS_PER_TRANCHE)
		const startDate = input.startDate ? new Date(input.startDate) : new Date()
		const tranches = []
		let remainingDays = input.durationDays
		let currentStart = new Date(startDate)

		for (let i = 1; i <= totalTranches; i++) {
			const trancheDays = Math.min(remainingDays, MAX_DAYS_PER_TRANCHE)
			const trancheEnd = new Date(currentStart)
			trancheEnd.setDate(trancheEnd.getDate() + trancheDays - 1)

			tranches.push({
				trancheNumber: i,
				startDate: currentStart.toISOString().split("T")[0]!,
				endDate: trancheEnd.toISOString().split("T")[0]!,
				durationDays: trancheDays,
				quantityPerTranche: null,
				noRefill: true,
			})

			currentStart = new Date(trancheEnd)
			currentStart.setDate(currentStart.getDate() + 1)
			remainingDays -= trancheDays
		}

		return {
			requiresTranching: true,
			reason: `PDEA ${input.pdeaSchedule} controlled substances may only be prescribed in ${MAX_DAYS_PER_TRANCHE}-day supply increments. This ${input.durationDays}-day order requires ${totalTranches} separate prescriptions.`,
			totalDays: input.durationDays,
			maxDaysPerTranche: MAX_DAYS_PER_TRANCHE,
			tranches,
		}
	}

	// ========================================================================
	// Create Tranched Orders (AD-010)
	// ========================================================================

	async createTranchedOrders(input: CreateTranchedOrdersInput, userId: string) {
		const [staff] = await db.select().from(staffProfiles).where(eq(staffProfiles.userId, userId))
		if (!staff) throw new NotFoundException("Staff profile not found for user")

		const preview = await this.previewTranches({
			facilityId: input.facilityId,
			genericName: input.genericName,
			dose: input.dose,
			frequency: input.frequency,
			durationDays: input.durationDays,
			pdeaSchedule: input.pdeaSchedule,
			startDate: input.startDate,
		})

		const totalTranches = preview.tranches.length
		const buildTrancheCdsAlerts = (dispenseDate: string) => {
			if (
				input.cdsAlerts &&
				typeof input.cdsAlerts === "object" &&
				!Array.isArray(input.cdsAlerts)
			) {
				return {
					...(input.cdsAlerts as Record<string, unknown>),
					pdeaDispenseDate: dispenseDate,
				}
			}

			if (input.cdsAlerts != null) {
				return {
					alerts: input.cdsAlerts,
					pdeaDispenseDate: dispenseDate,
				}
			}

			return { pdeaDispenseDate: dispenseDate }
		}

		// Create parent order (represents the full course; not dispensed directly)
		const [parentRow] = await db
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
				durationDays: input.durationDays,
				specialInstructions: input.specialInstructions ?? null,
				isPrn: input.isPrn ?? false,
				prnReason: input.prnReason ?? null,
				isControlledSubstance: true,
				pdeaSchedule: input.pdeaSchedule,
				pdeaTrancheNumber: null,
				pdeaTrancheTotal: totalTranches,
				noRefillInscribed: true,
				parentOrderId: null,
				status: "pending_verification",
				orderingStaffId: staff.id,
				cdsAlerts: input.cdsAlerts ?? null,
				cdsOverrides: input.cdsOverrides ?? null,
			})
			.returning()

		if (!parentRow) throw new NotFoundException("Failed to create parent order")

		// Create one child order per tranche
		const childIds: string[] = []
		for (const tranche of preview.tranches) {
			const [childRow] = await db
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
					durationDays: tranche.durationDays,
					specialInstructions: input.specialInstructions ?? null,
					isPrn: input.isPrn ?? false,
					prnReason: input.prnReason ?? null,
					isControlledSubstance: true,
					pdeaSchedule: input.pdeaSchedule,
					pdeaTrancheNumber: tranche.trancheNumber,
					pdeaTrancheTotal: totalTranches,
					noRefillInscribed: true,
					parentOrderId: parentRow.id,
					status: "pending_verification",
					orderingStaffId: staff.id,
					cdsAlerts: buildTrancheCdsAlerts(tranche.startDate),
					cdsOverrides: input.cdsOverrides ?? null,
				})
				.returning()

			if (childRow) childIds.push(childRow.id)
		}

		const [parentOrder, ...childOrders] = await Promise.all([
			this.findMedOrder(parentRow.id),
			...childIds.map(id => this.findMedOrder(id)),
		])

		this.logger.log(
			`Created PDEA tranched order: parent=${parentRow.id}, tranches=${totalTranches}`
		)

		return {
			parentOrder: parentOrder!,
			childOrders,
			totalTranches,
		}
	}

	// ========================================================================
	// Get Child Tranche Orders (AD-010)
	// ========================================================================

	async getChildOrders(parentOrderId: string) {
		const rows = await db
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
				firstDoseAt: medicationOrders.firstDoseAt,
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
			.where(eq(medicationOrders.parentOrderId, parentOrderId))
			.orderBy(medicationOrders.pdeaTrancheNumber)

		return rows.map(row => ({
			...row,
			isTranche: true,
			patientName:
				row.patientLastName && row.patientFirstName
					? `${row.patientLastName}, ${row.patientFirstName}`
					: null,
			priority: "routine" as const,
			receivedAt: row.createdAt,
		}))
	}

	// ========================================================================
	// Dispense Logs (Inpatient)
	// ========================================================================

	private async getPharmacistStaffId(userId: string): Promise<string> {
		const [profile] = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(eq(staffProfiles.userId, userId))
			.limit(1)
		if (!profile) throw new NotFoundException("Staff profile not found for user")
		return profile.id
	}

	async dispenseOrder(input: DispenseOrderInput, userId: string) {
		const pharmacistStaffId = await this.getPharmacistStaffId(userId)

		// Get medication order to retrieve patient info
		const [order] = await db
			.select({
				encounterId: medicationOrders.encounterId,
				facilityId: medicationOrders.facilityId,
			})
			.from(medicationOrders)
			.where(eq(medicationOrders.id, input.medicationOrderId))
			.limit(1)
		if (!order) throw new NotFoundException("Medication order not found")

		// Resolve patientId from encounter
		let patientId: string | null = null
		if (order.encounterId) {
			const [enc] = await db
				.select({ patientId: encounters.patientId })
				.from(encounters)
				.where(eq(encounters.id, order.encounterId))
				.limit(1)
			patientId = enc?.patientId ?? null
		}

		const [row] = await db
			.insert(dispenseLogs)
			.values({
				facilityId: order.facilityId,
				medicationOrderId: input.medicationOrderId,
				patientId,
				dispensedQuantity: String(input.dispensedQuantity),
				quantityUnit: input.quantityUnit,
				lotNumber: input.lotNumber,
				expiryDate: input.expiryDate,
				counselingNotes: input.counselingNotes,
				patientEducation: input.patientEducation ?? [],
				pharmacistStaffId,
				dispensedAt: new Date(),
			})
			.returning()

		if (!row) throw new NotFoundException("Failed to create dispense log")
		return row
	}

	async findDispenseLogs(input: DispenseLogListInput) {
		const page = Number(input.page) || 1
		const limit = Number(input.limit) || 50
		const conditions = []
		if (input.facilityId) conditions.push(eq(dispenseLogs.facilityId, input.facilityId))
		if (input.medicationOrderId)
			conditions.push(eq(dispenseLogs.medicationOrderId, input.medicationOrderId))
		if (input.patientId) conditions.push(eq(dispenseLogs.patientId, input.patientId))

		const where = and(...conditions)
		const offset = (page - 1) * limit

		const [rows, [totalRow]] = await Promise.all([
			db
				.select()
				.from(dispenseLogs)
				.where(where)
				.orderBy(desc(dispenseLogs.dispensedAt))
				.limit(limit)
				.offset(offset),
			db.select({ count: count() }).from(dispenseLogs).where(where),
		])

		const total = totalRow?.count ?? 0
		return {
			data: rows,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	async findDispenseLog(id: string) {
		const [row] = await db.select().from(dispenseLogs).where(eq(dispenseLogs.id, id)).limit(1)
		if (!row) throw new NotFoundException("Dispense log not found")
		return row
	}

	// ========================================================================
	// OPD Dispensing
	// ========================================================================

	async searchOpdPrescription(input: OpdPrescriptionSearchInput) {
		const search = input.q.trim().toLowerCase()

		// Find signed/issued prescriptions where patient MRN or name matches
		const [prescription] = await db
			.select({
				id: prescriptions.id,
				facilityId: prescriptions.facilityId,
				encounterId: prescriptions.encounterId,
				patientId: prescriptions.patientId,
				patientFirstName: patients.firstName,
				patientLastName: patients.lastName,
				patientMrn: patients.mrn,
				patientDateOfBirth: patients.dateOfBirth,
				prescriberName: users.name,
				prcLicenseNumber: prescriptions.prcLicenseNumber,
				prescribedAt: prescriptions.createdAt,
				status: prescriptions.status,
				medicationOrderId: prescriptions.medicationOrderId,
			})
			.from(prescriptions)
			.leftJoin(patients, eq(prescriptions.patientId, patients.id))
			.leftJoin(staffProfiles, eq(prescriptions.prescriberStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.where(
				and(
					input.facilityId ? eq(prescriptions.facilityId, input.facilityId) : undefined,
					or(
						ilike(patients.mrn, `%${search}%`),
						ilike(patients.firstName, `%${search}%`),
						ilike(patients.lastName, `%${search}%`)
					)
				)
			)
			.orderBy(desc(prescriptions.createdAt))
			.limit(1)

		if (!prescription) throw new NotFoundException("No prescription found for the search query")

		// Get related medication order for the prescription item
		const [medOrder] = await db
			.select()
			.from(medicationOrders)
			.where(eq(medicationOrders.id, prescription.medicationOrderId))
			.limit(1)

		const patientName =
			prescription.patientLastName && prescription.patientFirstName
				? `${prescription.patientLastName}, ${prescription.patientFirstName}`
				: null

		return {
			id: prescription.id,
			facilityId: prescription.facilityId,
			encounterId: prescription.encounterId,
			patientId: prescription.patientId,
			patientName: patientName ?? "Unknown",
			patientMrn: prescription.patientMrn ?? "-",
			patientDateOfBirth: prescription.patientDateOfBirth
				? String(prescription.patientDateOfBirth)
				: null,
			prescriberName: prescription.prescriberName,
			prescriberPrc: prescription.prcLicenseNumber,
			prescribedAt: prescription.prescribedAt,
			status: prescription.status,
			items: medOrder
				? [
						{
							id: medOrder.id,
							genericName: medOrder.genericName,
							brandName: medOrder.brandName,
							dose: medOrder.dose,
							doseUnit: medOrder.doseUnit,
							doseForm: medOrder.doseForm,
							route: medOrder.route,
							frequency: medOrder.frequency,
							durationDays: medOrder.durationDays,
							isControlledSubstance: medOrder.isControlledSubstance,
							pdeaSchedule: medOrder.pdeaSchedule,
							status: medOrder.status,
						},
					]
				: [],
		}
	}

	async opdDispense(input: OpdDispenseInput, userId: string) {
		const pharmacistStaffId = await this.getPharmacistStaffId(userId)

		// Resolve patient from prescription
		const [prescription] = await db
			.select({ patientId: prescriptions.patientId, facilityId: prescriptions.facilityId })
			.from(prescriptions)
			.where(eq(prescriptions.id, input.prescriptionId))
			.limit(1)

		const patientId = prescription?.patientId ?? null

		// Get patient name
		let patientName: string | null = null
		if (patientId) {
			const [patient] = await db
				.select({ firstName: patients.firstName, lastName: patients.lastName })
				.from(patients)
				.where(eq(patients.id, patientId))
				.limit(1)
			if (patient) {
				patientName =
					patient.lastName && patient.firstName ? `${patient.lastName}, ${patient.firstName}` : null
			}
		}

		// Create a dispense log per item
		const createdItems: Array<{
			medicationOrderId: string
			genericName: string
			dispensedQuantity: string
			lotNumber: string | null
		}> = []

		for (const item of input.items) {
			const [order] = await db
				.select({
					genericName: medicationOrders.genericName,
					facilityId: medicationOrders.facilityId,
				})
				.from(medicationOrders)
				.where(eq(medicationOrders.id, item.medicationOrderId))
				.limit(1)

			if (!order) continue

			const [log] = await db
				.insert(dispenseLogs)
				.values({
					facilityId: input.facilityId,
					medicationOrderId: item.medicationOrderId,
					patientId,
					dispensedQuantity: String(item.dispensedQuantity),
					quantityUnit: "tablet",
					lotNumber: item.lotNumber,
					expiryDate: undefined,
					counselingNotes: input.counselingNotes,
					patientEducation: input.patientEducation ?? [],
					pharmacistStaffId,
					dispensedAt: new Date(),
				})
				.returning()

			if (log) {
				createdItems.push({
					medicationOrderId: item.medicationOrderId,
					genericName: order.genericName,
					dispensedQuantity: String(item.dispensedQuantity),
					lotNumber: item.lotNumber ?? null,
				})
			}
		}

		return {
			id: crypto.randomUUID(),
			prescriptionId: input.prescriptionId,
			facilityId: input.facilityId,
			patientId,
			patientName,
			items: createdItems,
			counselingNotes: input.counselingNotes ?? null,
			pharmacistStaffId,
			dispensedAt: new Date(),
		}
	}

	async listOpdDispenseHistory(input: OpdDispenseHistoryInput) {
		const page = Number(input.page) || 1
		const limit = Number(input.limit) || 50
		const conditions = [eq(dispenseLogs.facilityId, input.facilityId)]

		const where = and(...conditions)
		const offset = (page - 1) * limit

		const [rows, [totalRow]] = await Promise.all([
			db
				.select()
				.from(dispenseLogs)
				.where(where)
				.orderBy(desc(dispenseLogs.dispensedAt))
				.limit(limit)
				.offset(offset),
			db.select({ count: count() }).from(dispenseLogs).where(where),
		])

		// Group dispense logs into OPD-style records
		const total = totalRow?.count ?? 0
		return {
			data: rows.map(log => ({
				id: log.id,
				prescriptionId: log.medicationOrderId,
				facilityId: log.facilityId,
				patientId: log.patientId,
				patientName: null,
				items: [
					{
						medicationOrderId: log.medicationOrderId,
						genericName: "",
						dispensedQuantity: log.dispensedQuantity,
						lotNumber: log.lotNumber,
					},
				],
				counselingNotes: log.counselingNotes,
				pharmacistStaffId: log.pharmacistStaffId,
				dispensedAt: log.dispensedAt,
			})),
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	// ========================================================================
	// Patient Counseling Logs
	// ========================================================================

	async saveCounselingLog(input: SaveCounselingLogInput, userId: string) {
		const pharmacistStaffId = await this.getPharmacistStaffId(userId)

		const [row] = await db
			.insert(counselingLogs)
			.values({
				facilityId: input.facilityId,
				encounterId: input.encounterId,
				patientId: input.patientId,
				medicationOrderId: input.medicationOrderId,
				checklistItems: input.checklistItems,
				patientSignature: input.patientSignature,
				pharmacistStaffId,
				counseledAt: new Date(),
			})
			.returning()

		if (!row) throw new NotFoundException("Failed to save counseling log")
		return {
			...row,
			checklistItems: (row.checklistItems as Array<{ item: string; checked: boolean }>) ?? [],
		}
	}

	async findCounselingLogs(input: CounselingLogListInput) {
		const page = Number(input.page) || 1
		const limit = Number(input.limit) || 50
		const conditions = []
		if (input.facilityId) conditions.push(eq(counselingLogs.facilityId, input.facilityId))
		if (input.encounterId) conditions.push(eq(counselingLogs.encounterId, input.encounterId))
		if (input.patientId) conditions.push(eq(counselingLogs.patientId, input.patientId))

		const where = and(...conditions)
		const offset = (page - 1) * limit

		const [rows, [totalRow]] = await Promise.all([
			db
				.select()
				.from(counselingLogs)
				.where(where)
				.orderBy(desc(counselingLogs.counseledAt))
				.limit(limit)
				.offset(offset),
			db.select({ count: count() }).from(counselingLogs).where(where),
		])

		const total = totalRow?.count ?? 0
		return {
			data: rows.map(row => ({
				...row,
				checklistItems: (row.checklistItems as Array<{ item: string; checked: boolean }>) ?? [],
			})),
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}
}
