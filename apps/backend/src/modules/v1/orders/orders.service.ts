import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	Logger,
	NotFoundException,
	UnauthorizedException,
} from "@nestjs/common"
import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm"

import {
	accounts,
	auditLogs,
	counselingLogs,
	dispenseLogs,
	drugBrands,
	drugGenerics,
	encounters,
	encounterStatusEvents,
	formularyItems,
	highAlertVerifications,
	imagingOrders,
	labOrders,
	marEntries,
	medicationOrders,
	orderVerifications,
	patients,
	preEncounters,
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
type OpdPrescriptionListInput = V1Inputs["orders"]["listOpdPrescriptions"]
type OpdDispenseInput = V1Inputs["orders"]["opdDispense"]
type OpdDispenseHistoryInput = V1Inputs["orders"]["listOpdDispenseHistory"]
type SaveCounselingLogInput = V1Inputs["orders"]["saveCounselingLog"]
type CounselingLogListInput = V1Inputs["orders"]["listCounselingLogs"]

const PDEA_TRANCHE_DAYS = 30
const PDEA_MAX_CONTROLLED_DAYS = 90

@Injectable()
export class OrdersService {
	private readonly logger = new Logger(OrdersService.name)

	constructor(private readonly problemsAllergiesService: ProblemsAllergiesService) {}

	private normalizeDrugName(value: string) {
		return value
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, " ")
			.replace(/\s+/g, " ")
			.trim()
	}

	private allergyClassRules = [
		{
			className: "Penicillin / beta-lactam",
			allergens: [
				"penicillin",
				"penicillins",
				"penicillin class",
				"beta lactam",
				"beta-lactam",
			],
			generics: [
				"amoxicillin",
				"ampicillin",
				"penicillin",
				"cloxacillin",
				"dicloxacillin",
				"piperacillin",
				"tazobactam",
				"amoxicillin clavulanate",
				"co amoxiclav",
				"ampicillin sulbactam",
			],
		},
		{
			className: "Cephalosporin",
			allergens: ["cephalosporin", "cephalosporins"],
			generics: [
				"cefazolin",
				"cefalexin",
				"cephalexin",
				"cefuroxime",
				"ceftriaxone",
				"cefixime",
				"cefepime",
			],
		},
		{
			className: "Sulfonamide",
			allergens: ["sulfa", "sulfonamide", "sulfonamides"],
			generics: ["sulfamethoxazole", "trimethoprim sulfamethoxazole", "co trimoxazole"],
		},
		{
			className: "NSAID",
			allergens: ["nsaid", "nsaids", "aspirin"],
			generics: ["aspirin", "ibuprofen", "naproxen", "diclofenac", "mefenamic acid", "ketorolac"],
		},
	]

	private getAllergyConflict(allergenName: string, genericName: string) {
		const normalizedAllergen = this.normalizeDrugName(allergenName)
		const normalizedGeneric = this.normalizeDrugName(genericName)

		if (normalizedAllergen === normalizedGeneric) {
			return { matchType: "exact" as const }
		}

		const rule = this.allergyClassRules.find(candidate => {
			const allergenMatches = candidate.allergens.some(
				allergen => this.normalizeDrugName(allergen) === normalizedAllergen
			)
			const drugMatches = candidate.generics.some(generic => {
				const normalizedRuleGeneric = this.normalizeDrugName(generic)
				return (
					normalizedRuleGeneric === normalizedGeneric ||
					normalizedGeneric.includes(normalizedRuleGeneric)
				)
			})

			return allergenMatches && drugMatches
		})

		return rule ? { matchType: "class" as const, className: rule.className } : null
	}

	private async resolveCanonicalGenericName(input: {
		facilityId: string
		formularyItemId?: string
		genericName: string
	}) {
		const requestedGenericName = input.genericName.trim()

		if (input.formularyItemId) {
			const [formularySelection] = await db
				.select({
					id: formularyItems.id,
					facilityId: formularyItems.facilityId,
					isActive: formularyItems.isActive,
					genericName: drugGenerics.genericName,
				})
				.from(formularyItems)
				.innerJoin(drugGenerics, eq(formularyItems.drugGenericId, drugGenerics.id))
				.where(eq(formularyItems.id, input.formularyItemId))
				.limit(1)

			if (!formularySelection) {
				throw new BadRequestException("Selected formulary item was not found.")
			}

			if (formularySelection.facilityId !== input.facilityId || !formularySelection.isActive) {
				throw new BadRequestException(
					"Selected formulary item is inactive or does not belong to this facility."
				)
			}

			if (
				this.normalizeDrugName(formularySelection.genericName) !==
				this.normalizeDrugName(requestedGenericName)
			) {
				throw new BadRequestException(
					`Generic name must match the selected formulary generic (${formularySelection.genericName}).`
				)
			}

			return formularySelection.genericName
		}

		const [brandMatch] = await db
			.select({
				brandName: drugBrands.brandName,
				genericName: drugGenerics.genericName,
			})
			.from(drugBrands)
			.innerJoin(drugGenerics, eq(drugBrands.drugGenericId, drugGenerics.id))
			.where(
				and(
					eq(drugBrands.isActive, true),
					sql`lower(${drugBrands.brandName}) = ${requestedGenericName.toLowerCase()}`
				)
			)
			.limit(1)

		if (brandMatch) {
			throw new BadRequestException(
				`${brandMatch.brandName} is a brand name. Select the generic name first (${brandMatch.genericName}); brand name is optional and subordinate.`
			)
		}

		const [genericMatch] = await db
			.select({ genericName: drugGenerics.genericName })
			.from(drugGenerics)
			.where(
				and(
					eq(drugGenerics.isActive, true),
					sql`lower(${drugGenerics.genericName}) = ${requestedGenericName.toLowerCase()}`
				)
			)
			.limit(1)

		if (!genericMatch) {
			throw new BadRequestException(
				"Select an active generic drug name from Drug Search before signing the medication order."
			)
		}

		return genericMatch.genericName
	}

	private async findFormularyItemForCds(
		input: Pick<CdsEvaluateInput, "facilityId" | "formularyItemId" | "genericName">
	) {
		if (input.formularyItemId) {
			const [formularyItem] = await db
				.select()
				.from(formularyItems)
				.where(
					and(
						eq(formularyItems.id, input.formularyItemId),
						eq(formularyItems.facilityId, input.facilityId)
					)
				)
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

	private getCdsOverrideEntries(cdsOverrides: unknown) {
		if (!cdsOverrides || typeof cdsOverrides !== "object") {
			return []
		}

		const overrides = (cdsOverrides as { overrides?: unknown }).overrides
		if (!Array.isArray(overrides)) {
			return []
		}

		return overrides.filter(
			(entry): entry is { alertId?: string; reason?: string } =>
				!!entry &&
				typeof entry === "object" &&
				typeof (entry as { reason?: unknown }).reason === "string" &&
				(entry as { reason: string }).reason.trim().length > 0
		)
	}

	private async getOrderingStaffProfile(userId: string, facilityId: string) {
		const [staff] = await db
			.select()
			.from(staffProfiles)
			.where(
				and(
					eq(staffProfiles.userId, userId),
					eq(staffProfiles.facilityId, facilityId),
					eq(staffProfiles.isActive, true)
				)
			)
			.limit(1)

		if (!staff) {
			throw new NotFoundException("Active staff profile not found for this facility")
		}

		return staff
	}

	private assertActivePrescriberCredentials(staff: {
		prcLicenseNumber?: string | null
		prcExpiry?: string | Date | null
		ptrNumber?: string | null
		ptrExpiry?: string | Date | null
	}) {
		if (!staff.prcLicenseNumber) {
			throw new NotFoundException("Prescriber does not have a PRC license number")
		}

		if (!staff.ptrNumber) {
			throw new NotFoundException("Prescriber does not have a PTR number")
		}

		this.assertCredentialNotExpired("PRC license", staff.prcExpiry)
		this.assertCredentialNotExpired("PTR number", staff.ptrExpiry)
	}

	private assertActivePdeaS2Credential(staff: {
		pdeaS2License?: string | null
		pdeaS2Expiry?: string | Date | null
	}) {
		const blockMessage = this.getPdeaS2CredentialBlockMessage(staff)
		if (blockMessage) {
			throw new BadRequestException(blockMessage)
		}
	}

	private getPdeaS2CredentialBlockMessage(staff?: {
		pdeaS2License?: string | null
		pdeaS2Expiry?: string | Date | null
	}) {
		if (!staff?.pdeaS2License) {
			return "Ordering staff does not have a PDEA S-2 license. Cannot prescribe controlled substances."
		}

		if (!staff.pdeaS2Expiry) {
			return "PDEA S-2 license expiry is not recorded. Cannot prescribe controlled substances."
		}

		if (this.isBeforeToday(staff.pdeaS2Expiry)) {
			return `PDEA S-2 license expired on ${this.formatDateOnly(staff.pdeaS2Expiry)}. Cannot prescribe controlled substances.`
		}

		return null
	}

	private normalizePdeaSchedule(value?: string | null) {
		const raw = value?.trim()
		if (!raw) {
			throw new BadRequestException("PDEA schedule is required for controlled substances.")
		}

		const compact = raw.toUpperCase().replace(/\s+/g, "")
		const romanScheduleMap: Record<string, string> = {
			I: "1",
			II: "2",
			III: "3",
			IV: "4",
			V: "5",
		}

		const romanMatch = compact.match(/^(?:SCHEDULE)?(I|II|III|IV|V)$/)
		if (romanMatch) {
			return `S-${romanScheduleMap[romanMatch[1]!]!}`
		}

		const numericMatch = compact.match(/^(?:SCHEDULE)?S?-?([1-5])$/)
		if (numericMatch) {
			return `S-${numericMatch[1]}`
		}

		throw new BadRequestException("PDEA schedule must be one of S-1, S-2, S-3, S-4, or S-5.")
	}

	private assertCredentialNotExpired(label: string, expiresAt?: string | Date | null) {
		if (!expiresAt) {
			throw new BadRequestException(`Physician ${label} expiry is not recorded`)
		}

		if (this.isBeforeToday(expiresAt)) {
			throw new BadRequestException(`Physician ${label} is expired`)
		}
	}

	private isBeforeToday(value: string | Date) {
		const expiryDate = new Date(value)
		expiryDate.setHours(0, 0, 0, 0)

		const today = new Date()
		today.setHours(0, 0, 0, 0)

		return expiryDate < today
	}

	private formatDateOnly(value: string | Date) {
		if (typeof value === "string") return value.split("T")[0] ?? value
		return value.toISOString().split("T")[0]!
	}

	private getPdeaDispenseDate(cdsAlerts: unknown) {
		if (!cdsAlerts || typeof cdsAlerts !== "object" || Array.isArray(cdsAlerts)) return null

		const value = (cdsAlerts as { pdeaDispenseDate?: unknown }).pdeaDispenseDate
		return typeof value === "string" && value.trim().length > 0 ? value : null
	}

	private getCdsAlertEntries(cdsAlerts: unknown) {
		if (Array.isArray(cdsAlerts)) {
			return cdsAlerts
		}

		if (!cdsAlerts || typeof cdsAlerts !== "object") {
			return []
		}

		const alerts = (cdsAlerts as { alerts?: unknown }).alerts
		return Array.isArray(alerts) ? alerts : []
	}

	private buildPdeaDispensingInstructions(input: {
		isControlledSubstance?: boolean
		pdeaTrancheNumber?: number | null
		pdeaTrancheTotal?: number | null
		pdeaDispenseDate?: string | null
	}) {
		if (!input.isControlledSubstance) return null

		const parts = ["No Refill."]
		if (input.pdeaTrancheNumber && input.pdeaTrancheTotal && input.pdeaTrancheTotal > 1) {
			parts.push(`Tranche ${input.pdeaTrancheNumber} of ${input.pdeaTrancheTotal}.`)
		}
		if (input.pdeaDispenseDate) {
			parts.push(`Earliest dispense date: ${input.pdeaDispenseDate}.`)
		}

		return parts.join(" ")
	}

	private async assertHighAlertCoSignCredentials(input: {
		verifyingStaffId: string
		facilityId: string
		password: string
	}) {
		const [profile] = await db
			.select({
				userId: staffProfiles.userId,
				facilityId: staffProfiles.facilityId,
			})
			.from(staffProfiles)
			.where(
				and(
					eq(staffProfiles.id, input.verifyingStaffId),
					eq(staffProfiles.isActive, true)
				)
			)
			.limit(1)

		if (!profile) {
			throw new NotFoundException("Co-signing staff profile not found or inactive")
		}

		if (profile.facilityId !== input.facilityId) {
			throw new BadRequestException(
				"Co-signing clinician does not belong to the medication order facility."
			)
		}

		const [account] = await db
			.select({ password: accounts.password })
			.from(accounts)
			.where(and(eq(accounts.userId, profile.userId), eq(accounts.providerId, "credential")))
			.limit(1)

		if (!account?.password) {
			throw new BadRequestException("Co-signer has no password credential on file")
		}

		const { getAuth } = await import("@repo/auth")
		const ctx = await getAuth().$context
		const valid = await ctx.password.verify({
			hash: account.password,
			password: input.password,
		})

		if (!valid) {
			throw new UnauthorizedException("Invalid co-sign credentials")
		}
	}

	private async resolveMedicationOrderPatientId(input: {
		patientId?: string
		encounterId?: string
		facilityId: string
	}) {
		if (!input.patientId && !input.encounterId) {
			throw new BadRequestException(
				"patientId or encounterId is required to run medication safety checks."
			)
		}

		if (input.encounterId) {
			const [encounter] = await db
				.select({
					patientId: encounters.patientId,
					facilityId: encounters.facilityId,
				})
				.from(encounters)
				.where(eq(encounters.id, input.encounterId))
				.limit(1)

			if (!encounter?.patientId) {
				throw new NotFoundException("Encounter patient not found for medication safety checks")
			}

			if (encounter.facilityId !== input.facilityId) {
				throw new BadRequestException(
					"Encounter does not belong to the medication order facility."
				)
			}

			if (input.patientId && input.patientId !== encounter.patientId) {
				throw new BadRequestException(
					"Medication order patientId does not match the selected encounter."
				)
			}

			return encounter.patientId
		}

		const [patient] = await db
			.select({ id: patients.id, facilityId: patients.facilityId })
			.from(patients)
			.where(eq(patients.id, input.patientId!))
			.limit(1)

		if (!patient) {
			throw new NotFoundException("Patient not found for medication safety checks")
		}

		if (patient.facilityId !== input.facilityId) {
			throw new BadRequestException("Patient does not belong to the medication order facility.")
		}

		return patient.id
	}

	private async assertAncillaryOrderContextInFacility(input: {
		facilityId: string
		encounterId?: string | null
		preEncounterId?: string | null
	}) {
		if (!input.encounterId && !input.preEncounterId) {
			throw new BadRequestException("encounterId or preEncounterId is required for ancillary orders.")
		}

		if (input.encounterId) {
			const [encounter] = await db
				.select({ id: encounters.id, facilityId: encounters.facilityId })
				.from(encounters)
				.where(eq(encounters.id, input.encounterId))
				.limit(1)

			if (!encounter) {
				throw new NotFoundException("Encounter not found for ancillary order")
			}

			if (encounter.facilityId !== input.facilityId) {
				throw new BadRequestException("Encounter does not belong to the ancillary order facility.")
			}
		}

		if (input.preEncounterId) {
			const [preEncounter] = await db
				.select({ id: preEncounters.id, facilityId: preEncounters.facilityId })
				.from(preEncounters)
				.where(eq(preEncounters.id, input.preEncounterId))
				.limit(1)

			if (!preEncounter) {
				throw new NotFoundException("Pre-encounter not found for ancillary order")
			}

			if (preEncounter.facilityId !== input.facilityId) {
				throw new BadRequestException(
					"Pre-encounter does not belong to the ancillary order facility."
				)
			}
		}
	}

	private async validateMedicationOrderCds(input: {
		patientId?: string
		encounterId?: string
		facilityId: string
		formularyItemId?: string
		genericName: string
		isControlledSubstance?: boolean
		orderingStaffId: string
		cdsOverrides?: unknown
	}) {
		const patientId = await this.resolveMedicationOrderPatientId(input)
		const cdsResult = await this.evaluateCdsForResolvedPatient({
			patientId,
			facilityId: input.facilityId,
			formularyItemId: input.formularyItemId,
			genericName: input.genericName,
			isControlledSubstance: input.isControlledSubstance,
			orderingStaffId: input.orderingStaffId,
		})

		const hardBlock = cdsResult.alerts.find(alert => alert.severity === "hard_block")
		if (hardBlock) {
			throw new BadRequestException(hardBlock.message)
		}

		const requiredOverrideCount = cdsResult.alerts.filter(
			alert => alert.severity === "soft_block"
		).length
		const providedOverrideCount = this.getCdsOverrideEntries(input.cdsOverrides).length

		if (requiredOverrideCount > providedOverrideCount) {
			throw new BadRequestException(
				"Provide clinical override justification for each CDS soft block before submitting the medication order."
			)
		}

		return cdsResult.alerts
	}

	private hasHighAlertAlert(cdsAlerts: unknown) {
		return this.getCdsAlertEntries(cdsAlerts).some(alert => {
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
		await this.assertCdsPatientInFacility(input.patientId, input.facilityId)
		const canonicalGenericName = await this.resolveCanonicalGenericName({
			facilityId: input.facilityId,
			formularyItemId: input.formularyItemId,
			genericName: input.genericName,
		})

		return this.evaluateCdsForResolvedPatient({
			...input,
			genericName: canonicalGenericName,
		})
	}

	private async assertCdsPatientInFacility(patientId: string, facilityId: string) {
		const [patient] = await db
			.select({ id: patients.id, facilityId: patients.facilityId })
			.from(patients)
			.where(eq(patients.id, patientId))
			.limit(1)

		if (!patient) {
			throw new NotFoundException("Patient not found for medication safety checks")
		}

		if (patient.facilityId !== facilityId) {
			throw new BadRequestException("Patient does not belong to the medication order facility.")
		}
	}

	private async evaluateCdsForResolvedPatient(input: CdsEvaluateInput) {
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
		// Flow D5: getActiveAllergies already filters to active + verified, but
		// we re-assert isVerified here so a future change to the upstream feed
		// cannot quietly start hard-blocking on unverified allergies.
		const { allergies: activeAllergies } = await this.problemsAllergiesService.getActiveAllergies({
			patientId: input.patientId,
		})

		for (const allergy of activeAllergies.filter(a => a.isActive && a.isVerified)) {
			const conflict = this.getAllergyConflict(allergy.allergenName, input.genericName)
			if (conflict) {
				if (allergy.severity === "severe") {
					alerts.push({
						type: "allergy_hard_block",
						severity: "hard_block",
						message:
							conflict.matchType === "class"
								? `Patient has a SEVERE ${conflict.className} allergy (${allergy.allergenName}). This ${input.genericName} order cannot proceed.`
								: `Patient has a SEVERE allergy to ${allergy.allergenName}. This order cannot proceed.`,
						details: {
							allergenName: allergy.allergenName,
							allergenType: allergy.allergenType,
							severity: allergy.severity,
							reactionType: allergy.reactionType ?? null,
							matchType: conflict.matchType,
							allergyClass: conflict.matchType === "class" ? conflict.className : null,
						},
					})
				} else {
					alerts.push({
						type: "allergy_soft_block",
						severity: "soft_block",
						message:
							conflict.matchType === "class"
								? `Patient has a ${allergy.severity} ${conflict.className} allergy (${allergy.allergenName}). Override required to proceed with ${input.genericName}.`
								: `Patient has a ${allergy.severity} allergy to ${allergy.allergenName}. Override required to proceed.`,
						details: {
							allergenName: allergy.allergenName,
							allergenType: allergy.allergenType,
							severity: allergy.severity,
							reactionType: allergy.reactionType ?? null,
							matchType: conflict.matchType,
							allergyClass: conflict.matchType === "class" ? conflict.className : null,
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
				severity: "soft_block",
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
				.where(and(eq(staffProfiles.id, input.orderingStaffId), eq(staffProfiles.isActive, true)))

			const s2BlockMessage = this.getPdeaS2CredentialBlockMessage(staff)
			if (s2BlockMessage) {
				alerts.push({
					type: "s2_license_block",
					severity: "hard_block",
					message: s2BlockMessage,
				})
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
		return this.getCdsAlertEntries(cdsAlerts).flatMap((alert, index) => {
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
				formulary_restricted: "duplicate_therapy",
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
				formulary_restricted: "Restricted formulary medication",
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
		const staff = await this.getOrderingStaffProfile(userId, input.facilityId)
		const isControlledOrder = input.isControlledSubstance ?? false
		const normalizedPdeaSchedule = isControlledOrder
			? this.normalizePdeaSchedule(input.pdeaSchedule)
			: null

		const repeatingFrequencies = ["q4h", "q6h", "q8h", "q12h", "daily", "bid", "tid", "qid"]
		if (repeatingFrequencies.includes(input.frequency) && !input.durationDays) {
			throw new BadRequestException(
				`durationDays is required for repeating frequency "${input.frequency}"`
			)
		}

		if (isControlledOrder) {
			this.assertActivePdeaS2Credential(staff)
			if (!input.durationDays) {
				throw new BadRequestException(
					"durationDays is required for controlled substance orders."
				)
			}
			if (input.durationDays > PDEA_MAX_CONTROLLED_DAYS) {
				throw new BadRequestException(
					`PDEA controlled substance orders cannot exceed ${PDEA_MAX_CONTROLLED_DAYS} days.`
				)
			}
			if (input.durationDays > PDEA_TRANCHE_DAYS) {
				throw new BadRequestException(
					`Controlled substance orders over ${PDEA_TRANCHE_DAYS} days must be submitted through PDEA tranching.`
				)
			}
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

		if (!Array.isArray(input.cdsAlerts)) {
			throw new BadRequestException(
				"Run the CDS safety check before submitting the medication order."
			)
		}

		const canonicalGenericName = await this.resolveCanonicalGenericName({
			facilityId: input.facilityId,
			formularyItemId: input.formularyItemId,
			genericName: input.genericName,
		})

		const evaluatedCdsAlerts = await this.validateMedicationOrderCds({
			patientId: input.patientId,
			encounterId: input.encounterId,
			facilityId: input.facilityId,
			formularyItemId: input.formularyItemId,
			genericName: canonicalGenericName,
			isControlledSubstance: isControlledOrder,
			orderingStaffId: staff.id,
			cdsOverrides: input.cdsOverrides,
		})

		const [created] = await db
			.insert(medicationOrders)
			.values({
				facilityId: input.facilityId,
				encounterId: input.encounterId ?? null,
				preEncounterId: input.preEncounterId ?? null,
				formularyItemId: input.formularyItemId ?? null,
				genericName: canonicalGenericName,
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
				isControlledSubstance: isControlledOrder,
				pdeaSchedule: normalizedPdeaSchedule,
				pdeaTrancheNumber: input.pdeaTrancheNumber ?? null,
				pdeaTrancheTotal: input.pdeaTrancheTotal ?? null,
				noRefillInscribed: isControlledOrder,
				status: "pending_verification",
				orderingStaffId: staff.id,
				cdsAlerts: evaluatedCdsAlerts,
				cdsOverrides: input.cdsOverrides ?? null,
			})
			.returning()

		if (created) {
			await this.writeAuditLog({
				facilityId: input.facilityId,
				userId,
				staffProfileId: staff.id,
				action: "sign",
				entityType: "medication_order",
				entityId: created.id,
				metadata: {
					patientId: input.patientId ?? null,
					encounterId: input.encounterId ?? null,
					genericName: canonicalGenericName,
					alertCount: evaluatedCdsAlerts.length,
				},
			})
		}

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

	private computeHasCriticalValues(results: unknown): boolean {
		if (!results || typeof results !== "object") return false
		const r = results as Record<string, unknown>
		if (!Array.isArray(r.items)) return false
		return r.items.some((item: unknown) => {
			if (!item || typeof item !== "object") return false
			const i = item as Record<string, unknown>
			return i.isCritical === true || i.flag === "C"
		})
	}

	async findLabOrders(input: LabOrderListInput) {
		const page = Number(input.page) || 1
		const limit = Number(input.limit) || 50
		const offset = (page - 1) * limit

		const conditions: ReturnType<typeof eq>[] = []
		if (input.facilityId) conditions.push(eq(labOrders.facilityId, input.facilityId))
		if (input.encounterId) conditions.push(eq(labOrders.encounterId, input.encounterId))
		if (input.preEncounterId) conditions.push(eq(labOrders.preEncounterId, input.preEncounterId))
		if (input.status) conditions.push(eq(labOrders.status, input.status))
		if (input.priority) conditions.push(eq(labOrders.priority, input.priority))

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
					clinicalIndication: labOrders.clinicalIndication,
					indicationIcd10Code: labOrders.indicationIcd10Code,
					indicationIcd10Display: labOrders.indicationIcd10Display,
					priority: labOrders.priority,
					status: labOrders.status,
					specimenType: labOrders.specimenType,
					orderingStaffId: labOrders.orderingStaffId,
					orderingStaffName: users.name,
					collectionDatetime: labOrders.collectionDatetime,
					resultedDatetime: labOrders.resultedDatetime,
					results: labOrders.results,
					cdsAlerts: labOrders.cdsAlerts,
					patientId: patients.id,
					patientFirstName: patients.firstName,
					patientLastName: patients.lastName,
					createdAt: labOrders.createdAt,
					updatedAt: labOrders.updatedAt,
				})
				.from(labOrders)
				.leftJoin(encounters, eq(labOrders.encounterId, encounters.id))
				.leftJoin(patients, eq(encounters.patientId, patients.id))
				.leftJoin(staffProfiles, eq(labOrders.orderingStaffId, staffProfiles.id))
				.leftJoin(users, eq(staffProfiles.userId, users.id))
				.where(whereClause)
				.orderBy(desc(labOrders.createdAt))
				.limit(limit)
				.offset(offset),
		])

		const total = totalResult?.count ?? 0

		return {
			data: rows.map(row => ({
				...row,
				patientId: row.patientId ?? null,
				patientName:
					row.patientLastName && row.patientFirstName
						? `${row.patientLastName}, ${row.patientFirstName}`
						: null,
				hasCriticalValues: this.computeHasCriticalValues(row.results),
			})),
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
				clinicalIndication: labOrders.clinicalIndication,
				indicationIcd10Code: labOrders.indicationIcd10Code,
				indicationIcd10Display: labOrders.indicationIcd10Display,
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
				patientId: patients.id,
				patientFirstName: patients.firstName,
				patientLastName: patients.lastName,
				createdAt: labOrders.createdAt,
				updatedAt: labOrders.updatedAt,
			})
			.from(labOrders)
			.leftJoin(encounters, eq(labOrders.encounterId, encounters.id))
			.leftJoin(patients, eq(encounters.patientId, patients.id))
			.leftJoin(staffProfiles, eq(labOrders.orderingStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.where(eq(labOrders.id, id))

		if (!row) throw new NotFoundException(`Lab order ${id} not found`)
		return {
			...row,
			patientId: row.patientId ?? null,
			patientName:
				row.patientLastName && row.patientFirstName
					? `${row.patientLastName}, ${row.patientFirstName}`
					: null,
			hasCriticalValues: this.computeHasCriticalValues(row.results),
		}
	}

	async createLabOrder(input: CreateLabOrderInput, userId: string) {
		const staff = await this.getOrderingStaffProfile(userId, input.facilityId)
		await this.assertAncillaryOrderContextInFacility(input)

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
				clinicalIndication: input.clinicalIndication ?? null,
				indicationIcd10Code: input.indicationIcd10Code ?? null,
				indicationIcd10Display: input.indicationIcd10Display ?? null,
				priority: input.priority ?? "routine",
				status: "ordered",
				specimenType: input.specimenType ?? null,
				orderingStaffId: staff.id,
			})
			.returning()

		this.logger.log(`Created lab order ${created!.id}`)

		await this.writeAuditLog({
			facilityId: input.facilityId,
			userId,
			staffProfileId: staff.id,
			action: "sign",
			entityType: "lab_order",
			entityId: created!.id,
			metadata: {
				encounterId: input.encounterId ?? null,
				preEncounterId: input.preEncounterId ?? null,
				testName: input.testName,
				priority: input.priority ?? "routine",
				indicationIcd10Code: input.indicationIcd10Code ?? null,
			},
		})

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
		if (input.facilityId) conditions.push(eq(imagingOrders.facilityId, input.facilityId))
		if (input.encounterId) conditions.push(eq(imagingOrders.encounterId, input.encounterId))
		if (input.preEncounterId)
			conditions.push(eq(imagingOrders.preEncounterId, input.preEncounterId))
		if (input.status) conditions.push(eq(imagingOrders.status, input.status))
		if (input.priority) conditions.push(eq(imagingOrders.priority, input.priority))

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
					indicationIcd10Code: imagingOrders.indicationIcd10Code,
					indicationIcd10Display: imagingOrders.indicationIcd10Display,
					priority: imagingOrders.priority,
					status: imagingOrders.status,
					orderingStaffId: imagingOrders.orderingStaffId,
					orderingStaffName: users.name,
					scheduledDatetime: imagingOrders.scheduledDatetime,
					completedDatetime: imagingOrders.completedDatetime,
					studyStartedAt: imagingOrders.studyStartedAt,
					imagingOrderReceivedAt: imagingOrders.imagingOrderReceivedAt,
					report: imagingOrders.report,
					structuredResults: imagingOrders.structuredResults,
					cdsAlerts: imagingOrders.cdsAlerts,
					patientId: patients.id,
					patientFirstName: patients.firstName,
					patientLastName: patients.lastName,
					patientMrn: patients.mrn,
					createdAt: imagingOrders.createdAt,
					updatedAt: imagingOrders.updatedAt,
				})
				.from(imagingOrders)
				.leftJoin(encounters, eq(imagingOrders.encounterId, encounters.id))
				.leftJoin(patients, eq(encounters.patientId, patients.id))
				.leftJoin(staffProfiles, eq(imagingOrders.orderingStaffId, staffProfiles.id))
				.leftJoin(users, eq(staffProfiles.userId, users.id))
				.where(whereClause)
				.orderBy(desc(imagingOrders.createdAt))
				.limit(limit)
				.offset(offset),
		])

		const total = totalResult?.count ?? 0

		return {
			data: rows.map(row => ({
				...row,
				patientId: row.patientId ?? null,
				patientName:
					row.patientLastName && row.patientFirstName
						? `${row.patientLastName}, ${row.patientFirstName}`
						: null,
				patientMrn: row.patientMrn ?? null,
			})),
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
				indicationIcd10Code: imagingOrders.indicationIcd10Code,
				indicationIcd10Display: imagingOrders.indicationIcd10Display,
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
				patientId: patients.id,
				patientFirstName: patients.firstName,
				patientLastName: patients.lastName,
				patientMrn: patients.mrn,
				createdAt: imagingOrders.createdAt,
				updatedAt: imagingOrders.updatedAt,
			})
			.from(imagingOrders)
			.leftJoin(encounters, eq(imagingOrders.encounterId, encounters.id))
			.leftJoin(patients, eq(encounters.patientId, patients.id))
			.leftJoin(staffProfiles, eq(imagingOrders.orderingStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.where(eq(imagingOrders.id, id))

		if (!row) throw new NotFoundException(`Imaging order ${id} not found`)
		return {
			...row,
			patientId: row.patientId ?? null,
			patientName:
				row.patientLastName && row.patientFirstName
					? `${row.patientLastName}, ${row.patientFirstName}`
					: null,
			patientMrn: row.patientMrn ?? null,
		}
	}

	async createImagingOrder(input: CreateImagingOrderInput, userId: string) {
		const staff = await this.getOrderingStaffProfile(userId, input.facilityId)
		await this.assertAncillaryOrderContextInFacility(input)

		const [created] = await db
			.insert(imagingOrders)
			.values({
				facilityId: input.facilityId,
				encounterId: input.encounterId ?? null,
				preEncounterId: input.preEncounterId ?? null,
				modality: input.modality,
				bodyPart: input.bodyPart,
				clinicalIndication: input.clinicalIndication ?? null,
				indicationIcd10Code: input.indicationIcd10Code ?? null,
				indicationIcd10Display: input.indicationIcd10Display ?? null,
				priority: input.priority ?? "routine",
				status: "ordered",
				orderingStaffId: staff.id,
			})
			.returning()

		this.logger.log(`Created imaging order ${created!.id}`)

		await this.writeAuditLog({
			facilityId: input.facilityId,
			userId,
			staffProfileId: staff.id,
			action: "sign",
			entityType: "imaging_order",
			entityId: created!.id,
			metadata: {
				encounterId: input.encounterId ?? null,
				preEncounterId: input.preEncounterId ?? null,
				modality: input.modality,
				bodyPart: input.bodyPart,
				priority: input.priority ?? "routine",
				indicationIcd10Code: input.indicationIcd10Code ?? null,
			},
		})

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

		// Enforce dual verification for high-alert medications before pharmacist approval
		if (input.action === "approved" && this.hasHighAlertAlert(medOrder.cdsAlerts)) {
			const dualVerification = await db
				.select()
				.from(highAlertVerifications)
				.where(eq(highAlertVerifications.medicationOrderId, input.medicationOrderId))
				.limit(1)
			if (dualVerification.length === 0) {
				throw new BadRequestException(
					"High-alert medication requires dual verification by a second clinician before pharmacist approval."
				)
			}
		}

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

		if (input.action === "approved" && medOrder.encounterId && !medOrder.isPrn) {
			try {
				await this.generateMarEntries(medOrder)
			} catch (err) {
				this.logger.error(`MAR generation failed for order ${input.medicationOrderId}: ${err}`)
			}
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

		await this.assertHighAlertCoSignCredentials({
			verifyingStaffId: input.verifyingStaffId,
			facilityId: order.facilityId,
			password: input.coSignerPassword,
		})

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
		if (!input.encounterId && !input.patientId) {
			throw new BadRequestException("encounterId or patientId is required to list prescriptions")
		}

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
		const staff = await this.getOrderingStaffProfile(userId, input.facilityId)
		this.assertActivePrescriberCredentials(staff)

		const [encounter] = await db
			.select({
				id: encounters.id,
				facilityId: encounters.facilityId,
				patientId: encounters.patientId,
			})
			.from(encounters)
			.where(eq(encounters.id, input.encounterId))
			.limit(1)

		if (!encounter) {
			throw new NotFoundException(`Encounter ${input.encounterId} not found`)
		}

		if (encounter.facilityId !== input.facilityId) {
			throw new BadRequestException("Encounter does not belong to the prescription facility.")
		}

		if (encounter.patientId !== input.patientId) {
			throw new BadRequestException("Prescription patientId does not match the selected encounter.")
		}

		// Fetch medication order details for prescription content
		const [medOrder] = await db
			.select()
			.from(medicationOrders)
			.where(eq(medicationOrders.id, input.medicationOrderId))
			.limit(1)

		if (!medOrder)
			throw new NotFoundException(`Medication order ${input.medicationOrderId} not found`)
		if (medOrder.facilityId !== input.facilityId) {
			throw new BadRequestException("Medication order does not belong to the prescription facility.")
		}
		if (medOrder.encounterId !== input.encounterId) {
			throw new BadRequestException("Medication order does not belong to the selected encounter.")
		}
		if (medOrder.status !== "verified" && medOrder.status !== "active") {
			throw new BadRequestException(
				"Only verified or active medication orders can generate a prescription"
			)
		}
		if (medOrder.isControlledSubstance) {
			this.assertActivePdeaS2Credential(staff)
			const isParentCourseOrder =
				medOrder.parentOrderId === null &&
				medOrder.pdeaTrancheNumber === null &&
				(medOrder.pdeaTrancheTotal ?? 0) > 1
			if (isParentCourseOrder) {
				throw new BadRequestException(
					"Generate prescriptions from the individual PDEA tranche orders, not the parent course order."
				)
			}
		}

		const [existingPrescription] = await db
			.select({ id: prescriptions.id, status: prescriptions.status })
			.from(prescriptions)
			.where(eq(prescriptions.medicationOrderId, input.medicationOrderId))
			.limit(1)

		if (existingPrescription) {
			throw new BadRequestException("A prescription already exists for this medication order.")
		}

		const pdeaDispenseDate = medOrder.isControlledSubstance
			? this.getPdeaDispenseDate(medOrder.cdsAlerts)
			: null
		const pdeaDispensingInstructions = this.buildPdeaDispensingInstructions({
			isControlledSubstance: medOrder.isControlledSubstance,
			pdeaTrancheNumber: medOrder.pdeaTrancheNumber,
			pdeaTrancheTotal: medOrder.pdeaTrancheTotal,
			pdeaDispenseDate,
		})
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
			isControlledSubstance: medOrder.isControlledSubstance,
			pdeaSchedule: medOrder.pdeaSchedule,
			pdeaTrancheNumber: medOrder.pdeaTrancheNumber,
			pdeaTrancheTotal: medOrder.pdeaTrancheTotal,
			noRefillInscribed: medOrder.noRefillInscribed,
			pdeaDispenseDate,
			pdeaDispensingInstructions,
		}
		const prcLicenseNumber = staff.prcLicenseNumber as string
		const ptrNumber = staff.ptrNumber as string

		const [created] = await db
			.insert(prescriptions)
			.values({
				facilityId: input.facilityId,
				encounterId: input.encounterId,
				medicationOrderId: input.medicationOrderId,
				patientId: input.patientId,
				prescriberStaffId: staff.id,
				prcLicenseNumber,
				ptrNumber,
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

	async signPrescription(id: string, userId: string) {
		const prescription = await this.findPrescription(id)
		if (prescription.status === "signed" || prescription.status === "issued") {
			throw new BadRequestException("Prescription is already signed")
		}

		const staff = await this.getOrderingStaffProfile(userId, prescription.facilityId)
		if (staff.id !== prescription.prescriberStaffId) {
			throw new ForbiddenException("Only the prescribing clinician can sign this prescription.")
		}
		this.assertActivePrescriberCredentials(staff)
		const prescriptionContent =
			prescription.prescriptionContent && typeof prescription.prescriptionContent === "object"
				? (prescription.prescriptionContent as { isControlledSubstance?: unknown })
				: null
		if (prescriptionContent?.isControlledSubstance === true) {
			this.assertActivePdeaS2Credential(staff)
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
					clinicalIndication: labOrders.clinicalIndication,
					indicationIcd10Code: labOrders.indicationIcd10Code,
					indicationIcd10Display: labOrders.indicationIcd10Display,
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
					indicationIcd10Code: imagingOrders.indicationIcd10Code,
					indicationIcd10Display: imagingOrders.indicationIcd10Display,
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
				and(
					eq(staffProfiles.id, input.staffId),
					eq(staffProfiles.facilityId, input.facilityId),
					eq(staffProfiles.isActive, true)
				)
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
		const errorMessage = this.getPdeaS2CredentialBlockMessage(staff)

		return {
			staffId: staff.id,
			staffName: userRow?.name ?? "Unknown",
			hasLicense,
			licenseNumber: staff.pdeaS2License ?? null,
			expiryDate: staff.pdeaS2Expiry ?? null,
			isExpired,
			daysUntilExpiry,
			canPrescribeControlled: !errorMessage,
			errorMessage,
		}
	}

	// ========================================================================
	// PDEA Tranche Preview (AD-010)
	// ========================================================================

	async previewTranches(input: TranchePreviewInput) {
		// PDEA regulations: S-2 controlled substances are limited to 30 days per prescription
		const normalizedPdeaSchedule = this.normalizePdeaSchedule(input.pdeaSchedule)
		if (input.durationDays > PDEA_MAX_CONTROLLED_DAYS) {
			throw new BadRequestException(
				`PDEA controlled substance orders cannot exceed ${PDEA_MAX_CONTROLLED_DAYS} days.`
			)
		}
		const requiresTranching = input.durationDays > PDEA_TRANCHE_DAYS

		if (!requiresTranching) {
			const startDate = input.startDate ? new Date(input.startDate) : new Date()
			const endDate = new Date(startDate)
			endDate.setDate(endDate.getDate() + input.durationDays - 1)

			return {
				requiresTranching: false,
				reason: null,
				totalDays: input.durationDays,
				maxDaysPerTranche: PDEA_TRANCHE_DAYS,
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

		const totalTranches = Math.ceil(input.durationDays / PDEA_TRANCHE_DAYS)
		const startDate = input.startDate ? new Date(input.startDate) : new Date()
		const tranches = []
		let remainingDays = input.durationDays
		let currentStart = new Date(startDate)

		for (let i = 1; i <= totalTranches; i++) {
			const trancheDays = Math.min(remainingDays, PDEA_TRANCHE_DAYS)
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
			reason: `PDEA ${normalizedPdeaSchedule} controlled substances may only be prescribed in ${PDEA_TRANCHE_DAYS}-day supply increments. This ${input.durationDays}-day order requires ${totalTranches} separate prescriptions.`,
			totalDays: input.durationDays,
			maxDaysPerTranche: PDEA_TRANCHE_DAYS,
			tranches,
		}
	}

	// ========================================================================
	// Create Tranched Orders (AD-010)
	// ========================================================================

	async createTranchedOrders(input: CreateTranchedOrdersInput, userId: string) {
		const staff = await this.getOrderingStaffProfile(userId, input.facilityId)
		const normalizedPdeaSchedule = this.normalizePdeaSchedule(input.pdeaSchedule)
		this.assertActivePdeaS2Credential(staff)

		if (input.durationDays <= PDEA_TRANCHE_DAYS) {
			throw new BadRequestException(
				`PDEA tranching is required only for controlled substance orders over ${PDEA_TRANCHE_DAYS} days.`
			)
		}
		if (input.durationDays > PDEA_MAX_CONTROLLED_DAYS) {
			throw new BadRequestException(
				`PDEA controlled substance orders cannot exceed ${PDEA_MAX_CONTROLLED_DAYS} days.`
			)
		}

		if (!Array.isArray(input.cdsAlerts)) {
			throw new BadRequestException(
				"Run the CDS safety check before submitting the medication order."
			)
		}

		const canonicalGenericName = await this.resolveCanonicalGenericName({
			facilityId: input.facilityId,
			formularyItemId: input.formularyItemId,
			genericName: input.genericName,
		})

		const evaluatedCdsAlerts = await this.validateMedicationOrderCds({
			patientId: input.patientId,
			encounterId: input.encounterId,
			facilityId: input.facilityId,
			formularyItemId: input.formularyItemId,
			genericName: canonicalGenericName,
			isControlledSubstance: true,
			orderingStaffId: staff.id,
			cdsOverrides: input.cdsOverrides,
		})

		const preview = await this.previewTranches({
			facilityId: input.facilityId,
			genericName: canonicalGenericName,
			dose: input.dose,
			frequency: input.frequency,
			durationDays: input.durationDays,
			pdeaSchedule: normalizedPdeaSchedule,
			startDate: input.startDate,
		})

		const totalTranches = preview.tranches.length
		const buildTrancheCdsAlerts = (dispenseDate: string) => {
			return {
				alerts: evaluatedCdsAlerts,
				pdeaDispenseDate: dispenseDate,
			}
		}

		// Create parent order (represents the full course; not dispensed directly)
		const [parentRow] = await db
			.insert(medicationOrders)
			.values({
				facilityId: input.facilityId,
				encounterId: input.encounterId ?? null,
				preEncounterId: input.preEncounterId ?? null,
				formularyItemId: input.formularyItemId ?? null,
				genericName: canonicalGenericName,
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
				pdeaSchedule: normalizedPdeaSchedule,
				pdeaTrancheNumber: null,
				pdeaTrancheTotal: totalTranches,
				noRefillInscribed: true,
				parentOrderId: null,
				status: "pending_verification",
				orderingStaffId: staff.id,
				cdsAlerts: evaluatedCdsAlerts,
				cdsOverrides: input.cdsOverrides ?? null,
			})
			.returning()

		if (!parentRow) throw new NotFoundException("Failed to create parent order")

		await this.writeAuditLog({
			facilityId: input.facilityId,
			userId,
			staffProfileId: staff.id,
			action: "sign",
			entityType: "medication_order",
			entityId: parentRow.id,
			metadata: {
				patientId: input.patientId ?? null,
				encounterId: input.encounterId ?? null,
				genericName: canonicalGenericName,
				alertCount: evaluatedCdsAlerts.length,
				totalTranches,
			},
		})

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
					genericName: canonicalGenericName,
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
					pdeaSchedule: normalizedPdeaSchedule,
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

	async listOpdPrescriptions(input: OpdPrescriptionListInput) {
		const page = Number(input.page) || 1
		const limit = Number(input.limit) || 20
		const offset = (page - 1) * limit

		const statusFilter =
			input.status === "all"
				? or(eq(prescriptions.status, "signed"), eq(prescriptions.status, "issued"))
				: eq(prescriptions.status, input.status ?? "signed")

		const facilityFilter = input.facilityId
			? eq(prescriptions.facilityId, input.facilityId)
			: undefined

		const whereClause = and(facilityFilter, statusFilter)

		const [totalRow] = await db
			.select({ count: count() })
			.from(prescriptions)
			.leftJoin(patients, eq(prescriptions.patientId, patients.id))
			.where(whereClause)

		const rows = await db
			.select({
				id: prescriptions.id,
				facilityId: prescriptions.facilityId,
				patientFirstName: patients.firstName,
				patientLastName: patients.lastName,
				patientMrn: patients.mrn,
				patientDateOfBirth: patients.dateOfBirth,
				prescriberName: users.name,
				prescribedAt: prescriptions.createdAt,
				status: prescriptions.status,
				medicationOrderId: prescriptions.medicationOrderId,
			})
			.from(prescriptions)
			.leftJoin(patients, eq(prescriptions.patientId, patients.id))
			.leftJoin(staffProfiles, eq(prescriptions.prescriberStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.where(whereClause)
			.orderBy(desc(prescriptions.createdAt))
			.limit(limit)
			.offset(offset)

		// Batch-fetch medication orders to build a summary string
		const medOrderIds = rows.map(r => r.medicationOrderId).filter(Boolean) as string[]
		const medOrderMap = new Map<string, { genericName: string; dose: string; doseUnit: string }>()
		if (medOrderIds.length > 0) {
			const medOrders = await db
				.select({
					id: medicationOrders.id,
					genericName: medicationOrders.genericName,
					dose: medicationOrders.dose,
					doseUnit: medicationOrders.doseUnit,
				})
				.from(medicationOrders)
				.where(inArray(medicationOrders.id, medOrderIds))
			for (const mo of medOrders) {
				medOrderMap.set(mo.id, mo)
			}
		}

		const data = rows.map(row => {
			const patientName =
				row.patientLastName && row.patientFirstName
					? `${row.patientLastName}, ${row.patientFirstName}`
					: "Unknown"

			const mo = row.medicationOrderId ? medOrderMap.get(row.medicationOrderId) : undefined
			const medicationSummary = mo ? `${mo.genericName} ${mo.dose} ${mo.doseUnit}` : "—"

			return {
				id: row.id,
				prescriptionNumber: `RX-${row.id.slice(-8).toUpperCase()}`,
				patientName,
				patientMrn: row.patientMrn ?? "-",
				patientDateOfBirth: row.patientDateOfBirth ? String(row.patientDateOfBirth) : null,
				prescriberName: row.prescriberName ?? null,
				prescribedAt: row.prescribedAt,
				status: row.status,
				medicationSummary,
			}
		})

		const total = Number(totalRow?.count ?? 0)
		return {
			data,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

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
					or(eq(prescriptions.status, "signed"), eq(prescriptions.status, "issued")),
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
			prescriberName: prescription.prescriberName ?? null,
			prescriberPrc: prescription.prcLicenseNumber ?? "",
			prescriptionNumber: `RX-${prescription.id.slice(-8).toUpperCase()}`,
			prescribedAt: prescription.prescribedAt,
			status: prescription.status,
			estimatedTotal: 0,
			philhealthPin: null,
			philhealthCoverage: 0,
			outOfPocket: 0,
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
							quantity: medOrder.durationDays ?? 30,
							durationDays: medOrder.durationDays,
							isControlledSubstance: medOrder.isControlledSubstance,
							pdeaSchedule: medOrder.pdeaSchedule,
							status: medOrder.status,
							unitPrice: 0,
							totalPrice: 0,
							dispensed: false,
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

		// Mark prescription as issued now that it has been dispensed
		if (createdItems.length > 0) {
			await db
				.update(prescriptions)
				.set({ status: "issued" })
				.where(eq(prescriptions.id, input.prescriptionId))
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

	private async generateMarEntries(medOrder: Awaited<ReturnType<typeof this.findMedOrder>>) {
		if (!medOrder.encounterId) return

		const [encounter] = await db
			.select({ encounterType: encounters.encounterType })
			.from(encounters)
			.where(eq(encounters.id, medOrder.encounterId))
			.limit(1)

		if (
			!encounter ||
			(encounter.encounterType !== "inpatient" && encounter.encounterType !== "emergency")
		) {
			return
		}

		const { frequency, firstDoseAt, durationDays } = medOrder
		const normalizedFrequency = frequency.trim().toLowerCase()
		const frequencyAliasMap: Record<string, string> = {
			od: "daily",
		}
		const marFrequency = frequencyAliasMap[normalizedFrequency] ?? normalizedFrequency

		if (marFrequency === "prn") return

		if (!firstDoseAt) {
			this.logger.warn(`firstDoseAt null for order ${medOrder.id}, skipping MAR generation`)
			return
		}

		const intervalHoursMap: Record<string, number | null> = {
			stat: null,
			once: null,
			q4h: 4,
			q6h: 6,
			q8h: 8,
			q12h: 12,
			daily: 24,
			bid: 12,
			tid: 8,
			qid: 6,
		}

		if (!(marFrequency in intervalHoursMap)) {
			this.logger.warn(
				`Unknown frequency "${frequency}" for order ${medOrder.id}, skipping MAR generation`
			)
			return
		}

		const scheduledTimes: Date[] = []

		if (marFrequency === "stat" || marFrequency === "once") {
			scheduledTimes.push(new Date(firstDoseAt))
		} else {
			if (!durationDays) {
				this.logger.warn(
					`durationDays null for order ${medOrder.id} (${frequency}), skipping MAR generation`
				)
				return
			}
			const intervalMs = intervalHoursMap[marFrequency]! * 60 * 60 * 1000
			const start = new Date(firstDoseAt).getTime()
			const end = start + durationDays * 24 * 60 * 60 * 1000
			for (let t = start; t < end; t += intervalMs) {
				scheduledTimes.push(new Date(t))
			}
		}

		if (scheduledTimes.length === 0) return

		const rows = scheduledTimes.map(scheduledTime => ({
			facilityId: medOrder.facilityId,
			encounterId: medOrder.encounterId!,
			preEncounterId: null as string | null,
			medicationOrderId: medOrder.id,
			scheduledTime,
			status: "due" as const,
			administeredDose: null as string | null,
			administeredRoute: null as string | null,
			prnReason: null as string | null,
			administeredByStaffId: null as string | null,
			administeredAt: null as Date | null,
			notes: null as string | null,
		}))

		await db.insert(marEntries).values(rows).onConflictDoNothing()
		this.logger.log(
			`Generated ${rows.length} MAR entries for order ${medOrder.id} (${marFrequency})`
		)
	}
}
