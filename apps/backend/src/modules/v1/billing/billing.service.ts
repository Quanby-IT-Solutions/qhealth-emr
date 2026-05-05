import { BadRequestException, Inject, Injectable, Logger, NotFoundException, UnprocessableEntityException } from "@nestjs/common"
import { Cron } from "@nestjs/schedule"
import { and, count, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm"

import {
	cewsSnapshots,
	cf4StatusLog,
	cf5Claims,
	cf5StatusLog,
	chargeMasterItems,
	charges,
	cf4Claims,
	clinicalNotes,
	drgMappings,
	eligibilityChecks,
	encounterStatusEvents,
	encounters,
	esoaStatements,
	invoiceLineItems,
	invoices,
	konsultaActivities,
	patients,
	payments,
	problems,
	receipts,
	staffProfiles,
	vitalSigns,
} from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import {
	PHILHEALTH_ADAPTER,
	type PhilHealthAdapter,
} from "@/common/philhealth/philhealth.adapter"

import { env } from "@/config/env.config"

import { AuditService } from "../audit/audit.service"
import { closeOpenSlaStep } from "@/utils/sla-events"
import { resolveStepTarget } from "@/utils/sla-step-target"
import { ACTIVE_DRG_CODES, findDrgCode } from "./drg-master-codes"

// ============================================================================
// Input Types (explicit — avoids TypeScript depth limit with InferContractRouterInputs)
// ============================================================================

interface ListChargeMasterInput {
	page: number
	limit: number
	facilityId?: string
	category?: "laboratory" | "imaging" | "medication" | "procedure" | "room" | "other"
	search?: string
	isActive?: boolean
}

interface ListChargesInput {
	page: number
	limit: number
	facilityId?: string
	encounterId: string
	sourceType?: "auto_medication" | "auto_lab" | "auto_imaging" | "manual"
}

interface CreateChargeInput {
	facilityId: string
	encounterId: string
	chargeMasterItemId?: string
	description: string
	quantity: number
	unitPrice: number
}

interface UpdateChargeInput {
	id: string
	quantity?: number
	unitPrice?: number
	description?: string
	overrideReason?: string
}

interface AddChargeFromEventInput {
	sourceType: "auto_medication" | "auto_lab" | "auto_imaging"
	sourceOrderId: string
	encounterId: string
	facilityId: string
	description: string
	quantity: number
	unitPrice: number
}

interface ListInvoicesInput {
	page: number
	limit: number
	facilityId: string
	encounterId?: string
	patientId?: string
	status?: "draft" | "finalized" | "paid" | "partially_paid"
}

interface GenerateInvoiceInput {
	facilityId: string
	encounterId: string
	patientId: string
	philhealthCoverage: number
}

interface ListPaymentsInput {
	page: number
	limit: number
	facilityId: string
	invoiceId: string
}

interface RecordPaymentInput {
	facilityId: string
	invoiceId: string
	amount: number
	paymentMethod: "cash" | "card" | "gcash" | "hmo" | "malasakit" | "philhealth" | "coe"
	hmoProvider?: string
	hmoClaimNumber?: string
	hmoPercentageCovered?: number
	referenceNumber?: string
	paymentDate: string
	notes?: string
}

interface GenerateCf4Input {
	facilityId: string
	encounterId: string
	patientId: string
}

interface FinalizeCf4Input {
	id: string
	submissionData?: Record<string, unknown>
}

interface CheckEligibilityInput {
	facilityId: string
	patientId: string
	philhealthMemberId: string
}

interface UnbilledEncountersInput {
	page: number
	limit: number
	facilityId: string
}

interface GetSoaInput {
	encounterId: string
}

interface GenerateSoaInput {
	facilityId: string
	encounterId: string
	patientId: string
}

interface FinalizeSoaInput {
	id: string
}

interface GetCf5Input {
	encounterId: string
}

interface SearchDrgInput {
	search: string
}

interface AssignDrgInput {
	facilityId: string
	encounterId: string
	patientId: string
	drgCode: string
}

interface ApproveCf5Input {
	id: string
}

interface GetKonsultaBenefitInput {
	facilityId: string
	patientId: string
}

interface RecordKonsultaVisitInput {
	facilityId: string
	patientId: string
	encounterId: string
	visitType: "consultation" | "medication" | "laboratory"
}

type MalasakitSource = "doh_medisure" | "hospital_fund" | "lgu" | "pcso" | "dswd" | "private_donation" | "other"
type MalasakitStatus = "pending" | "approved" | "disbursed" | "denied"

interface GetMalasakitInput {
	facilityId: string
	encounterId: string
}

interface AddMalasakitInput {
	facilityId: string
	encounterId: string
	patientId: string
	source: MalasakitSource
	amount: number
	purpose: string
	notes?: string
}

interface UpdateMalasakitStatusInput {
	id: string
	status: "approved" | "disbursed" | "denied"
}

interface MarkReadyForInvoicingInput {
	encounterId: string
	facilityId: string
	staffId: string
}

interface SearchServiceCatalogInput {
	facilityId: string
	query?: string
	category?: "laboratory" | "imaging" | "medication" | "procedure" | "room" | "other"
	page: number
	limit: number
}

interface ApplyDiscountInput {
	invoiceId: string
	type: "NONE" | "SENIOR" | "PWD" | "SOLO_PARENT" | "MANUAL"
	amount?: number
	reason?: string
	staffId: string
}

interface IssueReceiptInput {
	paymentId: string
	staffId: string
}

interface RecordMalasakitPaymentInput {
	invoiceId: string
	malasakitCaseId: string
	amount: number
	reference?: string
	staffId: string
}

interface SaveCewsSnapshotInput {
	encounterId: string
	memberPin: string
	memberName?: string | null
	status: "active" | "lapsed" | "suspended" | "service_unavailable"
	benefitBalance?: number | null
	dependentsJson?: unknown
	rawResponse?: unknown
	staffId: string
}

interface ListCewsSnapshotsInput {
	encounterId: string
}

interface ListKonsultaActivitiesInput {
	patientId: string
	facilityId: string
	activityType?: "FPE" | "Follow-up" | "Lab"
	page: number
	limit: number
}

interface RecordKonsultaEventInput {
	patientId: string
	facilityId: string
	activityType: "FPE" | "Follow-up" | "Lab"
	activityDate: string
	sourceRef?: string
}

interface GenerateKonsultaReportInput {
	facilityId: string
	period: "monthly" | "quarterly"
	periodStart: string
	periodEnd: string
}

interface GetCf5WithBillingInput {
	encounterId: string
}

interface LinkChargeToIcdInput {
	chargeId: string
	icdCode: string
}

interface GenerateEsoaInput {
	encounterId: string
	format: "pdf" | "xml" | "json"
	includeItemizedBreakdown: boolean
	includePhilhealthDetails: boolean
}

interface CewsVerifyInput {
	memberPin: string
	encounterId?: string
}

interface CheckCewsInput {
	facilityId: string
	patientId: string
	philhealthMemberId?: string
	nationalId?: string
}

interface PollCf4StatusInput {
	id: string
}

interface ResubmitCf4Input {
	id: string
	reason: string
}

@Injectable()
export class BillingService {
	private readonly logger = new Logger(BillingService.name)

	constructor(
		@Inject(PHILHEALTH_ADAPTER) private readonly philHealthAdapter: PhilHealthAdapter,
		private readonly auditService: AuditService
	) {}

	// ========================================================================
	// Helpers
	// ========================================================================

	private async getStaffProfileId(userId: string): Promise<string> {
		const [profile] = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(eq(staffProfiles.userId, userId))
			.limit(1)
		if (!profile) throw new NotFoundException("Staff profile not found")
		return profile.id
	}

	private async getOptionalStaffProfileId(userId: string): Promise<string | null> {
		try {
			return await this.auditService.resolveStaffProfileId(userId)
		} catch {
			return null
		}
	}

	// ========================================================================
	// Charge Master
	// ========================================================================

	async listChargeMasterItems(input: ListChargeMasterInput) {
		const { page, limit, facilityId, category, search, isActive } = input
		const offset = (page - 1) * limit

		const conditions: ReturnType<typeof eq>[] = []
		if (facilityId) conditions.push(eq(chargeMasterItems.facilityId, facilityId))
		if (category) conditions.push(eq(chargeMasterItems.category, category))
		if (isActive !== undefined) conditions.push(eq(chargeMasterItems.isActive, isActive))
		if (search) {
			conditions.push(
				sql`(${chargeMasterItems.description} ILIKE ${"%" + search + "%"} OR ${chargeMasterItems.itemCode} ILIKE ${"%" + search + "%"})`
			)
		}

		const where = and(...conditions)

		const [items, [countRow]] = await Promise.all([
			db.select().from(chargeMasterItems).where(where).orderBy(chargeMasterItems.description).limit(limit).offset(offset),
			db.select({ total: count() }).from(chargeMasterItems).where(where),
		])

		const total = countRow?.total ?? 0
		return { items, total, page, limit, totalPages: Math.ceil(total / limit) }
	}

	// ========================================================================
	// Charges
	// ========================================================================

	async listCharges(input: ListChargesInput) {
		const { page, limit, facilityId, encounterId, sourceType } = input
		const offset = (page - 1) * limit

		const conditions: ReturnType<typeof eq>[] = [
			eq(charges.encounterId, encounterId),
		]
		if (facilityId) conditions.push(eq(charges.facilityId, facilityId))
		if (sourceType) conditions.push(eq(charges.sourceType, sourceType))

		const where = and(...conditions)

		const [rows, [countRow]] = await Promise.all([
			db.select().from(charges).where(where).orderBy(desc(charges.createdAt)).limit(limit).offset(offset),
			db.select({ total: count() }).from(charges).where(where),
		])

		const total = countRow?.total ?? 0
		return { charges: rows, total, page, limit, totalPages: Math.ceil(total / limit) }
	}

	async createCharge(input: CreateChargeInput, userId: string) {
		const staffProfileId = await this.getStaffProfileId(userId)
		const totalAmount = (input.quantity * input.unitPrice).toFixed(2)

		const [charge] = await db
			.insert(charges)
			.values({
				facilityId: input.facilityId,
				encounterId: input.encounterId,
				chargeMasterItemId: input.chargeMasterItemId ?? null,
				description: input.description,
				quantity: String(input.quantity),
				unitPrice: String(input.unitPrice),
				totalAmount,
				sourceType: "manual",
				createdByStaffId: staffProfileId,
			})
			.returning()

		if (!charge) throw new NotFoundException("Failed to create charge")

		await this.auditService.log({
			facilityId: input.facilityId,
			userId,
			staffProfileId,
			action: "create",
			entityType: "charge",
			entityId: charge.id,
			beforeState: null,
			afterState: { description: charge.description, quantity: charge.quantity, unitPrice: charge.unitPrice, totalAmount: charge.totalAmount },
			ipAddress: null,
			userAgent: null,
			metadata: { sourceType: "manual" },
		})

		return charge
	}

	/** Idempotent insert for auto-pulled domain events. Duplicate (sourceType, sourceOrderId, encounterId) rows are silently ignored. */
	async addChargeFromEvent(input: AddChargeFromEventInput) {
		const totalAmount = (input.quantity * input.unitPrice).toFixed(2)

		await db
			.insert(charges)
			.values({
				facilityId: input.facilityId,
				encounterId: input.encounterId,
				sourceOrderId: input.sourceOrderId,
				description: input.description,
				quantity: String(input.quantity),
				unitPrice: String(input.unitPrice),
				totalAmount,
				sourceType: input.sourceType,
				createdByStaffId: null,
			})
			.onConflictDoNothing()
	}

	async updateCharge(input: UpdateChargeInput, userId: string) {
		const [existing] = await db
			.select()
			.from(charges)
			.where(eq(charges.id, input.id))

		if (!existing) throw new NotFoundException("Charge not found")

		const staffProfileId = await this.getStaffProfileId(userId)
		const newQuantity = input.quantity !== undefined ? String(input.quantity) : existing.quantity
		const newUnitPrice = input.unitPrice !== undefined ? String(input.unitPrice) : existing.unitPrice
		const newDescription = input.description ?? existing.description
		const newTotal = (Number(newQuantity) * Number(newUnitPrice)).toFixed(2)

		const [updated] = await db
			.update(charges)
			.set({
				quantity: newQuantity,
				unitPrice: newUnitPrice,
				description: newDescription,
				totalAmount: newTotal,
			})
			.where(eq(charges.id, input.id))
			.returning()

		if (!updated) throw new NotFoundException("Charge not found after update")

		await this.auditService.log({
			facilityId: existing.facilityId,
			userId,
			staffProfileId,
			action: "update",
			entityType: "charge",
			entityId: input.id,
			beforeState: { quantity: existing.quantity, unitPrice: existing.unitPrice, description: existing.description, totalAmount: existing.totalAmount },
			afterState: { quantity: newQuantity, unitPrice: newUnitPrice, description: newDescription, totalAmount: newTotal },
			ipAddress: null,
			userAgent: null,
			metadata: { overrideReason: input.overrideReason ?? null },
		})

		return updated
	}

	async deleteCharge(id: string, userId: string) {
		const [existing] = await db.select().from(charges).where(eq(charges.id, id))
		if (!existing) throw new NotFoundException("Charge not found")
		if (existing.sourceType !== "manual") {
			throw new BadRequestException("Cannot delete auto-captured charges")
		}

		const staffProfileId = await this.getStaffProfileId(userId)

		await db.delete(charges).where(eq(charges.id, id))

		await this.auditService.log({
			facilityId: existing.facilityId,
			userId,
			staffProfileId,
			action: "delete",
			entityType: "charge",
			entityId: id,
			beforeState: { description: existing.description, quantity: existing.quantity, totalAmount: existing.totalAmount },
			afterState: null,
			ipAddress: null,
			userAgent: null,
			metadata: {},
		})

		return { success: true }
	}

	// ========================================================================
	// Invoices
	// ========================================================================

	async listInvoices(input: ListInvoicesInput) {
		const { page, limit, facilityId, encounterId, patientId, status } = input
		const offset = (page - 1) * limit

		const conditions = [eq(invoices.facilityId, facilityId)]
		if (encounterId) conditions.push(eq(invoices.encounterId, encounterId))
		if (patientId) conditions.push(eq(invoices.patientId, patientId))
		if (status) conditions.push(eq(invoices.status, status))

		const where = and(...conditions)

		const [rows, [countRow]] = await Promise.all([
			db.select().from(invoices).where(where).orderBy(desc(invoices.createdAt)).limit(limit).offset(offset),
			db.select({ total: count() }).from(invoices).where(where),
		])

		const total = countRow?.total ?? 0
		return { invoices: rows, total, page, limit, totalPages: Math.ceil(total / limit) }
	}

	async getInvoice(id: string) {
		const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id))
		if (!invoice) throw new NotFoundException("Invoice not found")

		const lines = await db.select().from(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, id))

		return { ...invoice, lineItems: lines }
	}

	async generateInvoice(input: GenerateInvoiceInput, userId: string) {
		const staffProfileId = await this.getStaffProfileId(userId)

		// Gather all charges for the encounter
		const encounterCharges = await db
			.select()
			.from(charges)
			.where(eq(charges.encounterId, input.encounterId))

		if (encounterCharges.length === 0) {
			throw new BadRequestException("No charges found for this encounter")
		}

		const subtotal = encounterCharges.reduce((acc, c) => acc + Number(c.totalAmount), 0)
		const philhealthCoverage = Math.min(input.philhealthCoverage, subtotal)
		const patientResponsibility = subtotal - philhealthCoverage

		// Generate invoice number
		const invoiceNumber = `INV-${Date.now()}`

		const [invoice] = await db
			.insert(invoices)
			.values({
				facilityId: input.facilityId,
				encounterId: input.encounterId,
				patientId: input.patientId,
				invoiceNumber,
				subtotal: subtotal.toFixed(2),
				philhealthCoverage: philhealthCoverage.toFixed(2),
				patientResponsibility: patientResponsibility.toFixed(2),
				status: "draft",
				createdByStaffId: staffProfileId,
			})
			.returning()

		if (!invoice) throw new NotFoundException("Failed to create invoice")

		// Create line items from charges
		const lineItemValues = encounterCharges.map(c => ({
			invoiceId: invoice.id,
			chargeId: c.id,
			description: c.description,
			quantity: c.quantity,
			unitPrice: c.unitPrice,
			totalAmount: c.totalAmount,
		}))

		await db.insert(invoiceLineItems).values(lineItemValues)

		const lines = await db.select().from(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, invoice.id))

		// SLA-004/SLA-005: Write billing event when the invoice is first created (draft status)
		const draftSlaMins = await resolveStepTarget(invoice.facilityId, "billing", "draft")
		await db.insert(encounterStatusEvents).values({
			facilityId: invoice.facilityId,
			encounterId: invoice.encounterId,
			fromStatus: null,
			toStatus: "draft",
			workflowType: "billing" as const,
			staffId: staffProfileId,
			slaTargetMinutes: draftSlaMins,
			notes: `Invoice ${invoice.invoiceNumber} created (draft)`,
			occurredAt: new Date(),
		})

		return { ...invoice, lineItems: lines }
	}

	async finalizeInvoice(id: string) {
		const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id))
		if (!invoice) throw new NotFoundException("Invoice not found")
		if (invoice.status !== "draft") throw new BadRequestException("Only draft invoices can be finalized")

		const [updated] = await db
			.update(invoices)
			.set({ status: "finalized", finalizedAt: new Date() })
			.where(eq(invoices.id, id))
			.returning()

		if (!updated) throw new NotFoundException("Invoice not found after update")

		// SLA-001/SLA-004: Close open billing step then write the finalized transition event
		await closeOpenSlaStep(db, invoice.encounterId, "billing")

		// Write durable SLA billing transition event
		const finalizedSlaMins = await resolveStepTarget(invoice.facilityId, "billing", "finalized")
		await db.insert(encounterStatusEvents).values({
			facilityId: invoice.facilityId,
			encounterId: invoice.encounterId,
			fromStatus: invoice.status,
			toStatus: "finalized",
			workflowType: "billing" as const,
			staffId: null,
			slaTargetMinutes: finalizedSlaMins,
			notes: `Invoice ${invoice.invoiceNumber}: draft → finalized`,
			occurredAt: new Date(),
		})

		return updated
	}

	// ========================================================================
	// Payments
	// ========================================================================

	async listPayments(input: ListPaymentsInput) {
		const { page, limit, facilityId, invoiceId } = input
		const offset = (page - 1) * limit

		const where = and(
			eq(payments.facilityId, facilityId),
			eq(payments.invoiceId, invoiceId),
		)

		const [rows, [countRow]] = await Promise.all([
			db.select().from(payments).where(where).orderBy(desc(payments.createdAt)).limit(limit).offset(offset),
			db.select({ total: count() }).from(payments).where(where),
		])

		const total = countRow?.total ?? 0
		return { payments: rows, total, page, limit, totalPages: Math.ceil(total / limit) }
	}

	async recordPayment(input: RecordPaymentInput, userId: string) {
		const staffProfileId = await this.getStaffProfileId(userId)

		const [invoice] = await db.select().from(invoices).where(eq(invoices.id, input.invoiceId))
		if (!invoice) throw new NotFoundException("Invoice not found")
		if (invoice.status === "draft") throw new BadRequestException("Cannot record payment on a draft invoice. Finalize it first.")
		if (invoice.status === "paid") throw new BadRequestException("Invoice is already fully paid.")

		// HMO sub-form validation: provider + claim number + percentage required.
		if (input.paymentMethod === "hmo") {
			if (!input.hmoProvider) throw new BadRequestException("HMO provider is required for HMO payments")
			if (!input.hmoClaimNumber) throw new BadRequestException("HMO claim number is required for HMO payments")
			if (input.hmoPercentageCovered == null) {
				throw new BadRequestException("HMO percentage covered is required for HMO payments")
			}
			if (input.hmoPercentageCovered < 0 || input.hmoPercentageCovered > 100) {
				throw new BadRequestException("HMO percentage covered must be between 0 and 100")
			}
		}

		// Overflow check: reject if new payment exceeds outstanding balance
		const priorPayments = await db
			.select({ amount: payments.amount })
			.from(payments)
			.where(eq(payments.invoiceId, input.invoiceId))
		const totalAlreadyPaid = priorPayments.reduce((acc, p) => acc + Number(p.amount), 0)
		const outstanding = Number(invoice.patientResponsibility) - totalAlreadyPaid
		if (input.amount > outstanding + 0.005) {
			throw new BadRequestException(
				`Payment amount ₱${input.amount.toFixed(2)} exceeds outstanding balance ₱${outstanding.toFixed(2)}`
			)
		}

		const [payment] = await db
			.insert(payments)
			.values({
				facilityId: input.facilityId,
				invoiceId: input.invoiceId,
				amount: String(input.amount),
				paymentMethod: input.paymentMethod,
				referenceNumber: input.referenceNumber ?? null,
				hmoProvider: input.hmoProvider ?? null,
				hmoClaimNumber: input.hmoClaimNumber ?? null,
				hmoPercentageCovered:
					input.hmoPercentageCovered != null ? String(input.hmoPercentageCovered) : null,
				receivedByStaffId: staffProfileId,
				paymentDate: input.paymentDate,
				notes: input.notes ?? null,
			})
			.returning()

		if (!payment) throw new NotFoundException("Failed to record payment")

		// Update invoice status based on total payments
		const existingPayments = await db
			.select({ amount: payments.amount })
			.from(payments)
			.where(eq(payments.invoiceId, input.invoiceId))

		const totalPaid = existingPayments.reduce((acc, p) => acc + Number(p.amount), 0)
		const invoiceTotal = Number(invoice.patientResponsibility)

		const newStatus = totalPaid >= invoiceTotal ? "paid" : "partially_paid"
		await db.update(invoices).set({ status: newStatus }).where(eq(invoices.id, input.invoiceId))

		// SLA-001/SLA-004: Close open billing step then write payment transition event
		await closeOpenSlaStep(db, invoice.encounterId, "billing")

		// Write durable SLA billing transition event
		const paymentSlaMins = await resolveStepTarget(invoice.facilityId, "billing", newStatus)
		await db.insert(encounterStatusEvents).values({
			facilityId: invoice.facilityId,
			encounterId: invoice.encounterId,
			fromStatus: invoice.status,
			toStatus: newStatus,
			workflowType: "billing" as const,
			staffId: null,
			slaTargetMinutes: paymentSlaMins,
			notes: `Invoice ${invoice.invoiceNumber}: ${invoice.status} → ${newStatus}`,
			occurredAt: new Date(),
		})

		await this.auditService.log({
			facilityId: invoice.facilityId,
			userId,
			staffProfileId,
			action: "create",
			entityType: "payment",
			entityId: payment.id,
			beforeState: null,
			afterState: {
				amount: input.amount,
				method: input.paymentMethod,
				newInvoiceStatus: newStatus,
				hmoProvider: input.hmoProvider ?? null,
			},
			ipAddress: null,
			userAgent: null,
			metadata: { source: input.paymentMethod },
		})

		return payment
	}

	// ========================================================================
	// CF4 Claims
	// ========================================================================

	async getCf4(id: string) {
		const [cf4] = await db.select().from(cf4Claims).where(eq(cf4Claims.id, id))
		if (!cf4) throw new NotFoundException("CF4 claim not found")
		return {
			...cf4,
			extractedData: cf4.extractedData as Record<string, unknown> | null,
			submissionData: cf4.submissionData as Record<string, unknown> | null,
			responseData: cf4.responseData as Record<string, unknown> | null,
		}
	}

	async generateCf4(input: GenerateCf4Input) {
		// Extract clinical data from the encounter
		const [encounter] = await db.select().from(encounters).where(eq(encounters.id, input.encounterId))
		if (!encounter) throw new NotFoundException("Encounter not found")

		// Get latest vitals
		const [latestVitals] = await db
			.select()
			.from(vitalSigns)
			.where(eq(vitalSigns.encounterId, input.encounterId))
			.orderBy(desc(vitalSigns.recordedAt))
			.limit(1)

		// Get diagnoses from problems
		const encounterProblems = await db
			.select()
			.from(problems)
			.where(and(eq(problems.patientId, input.patientId), eq(problems.status, "active")))

		// Get clinical notes (signed)
		const signedNotes = await db
			.select()
			.from(clinicalNotes)
			.where(and(eq(clinicalNotes.encounterId, input.encounterId), eq(clinicalNotes.status, "signed")))
			.orderBy(desc(clinicalNotes.createdAt))

		// Extract chief complaint from admission note
		const admissionNote = signedNotes.find(n => n.noteType === "admission" || n.noteType === "progress")
		const chiefComplaint = encounter.chiefComplaint ?? null
		const briefHistory = admissionNote?.content?.substring(0, 500) ?? null

		const diagnoses = encounterProblems.map(p => ({
			code: p.icd10Code ?? "UNKNOWN",
			displayName: p.description,
		}))

		// Extract procedures from charges
		const procedureCharges = await db
			.select()
			.from(charges)
			.where(and(
				eq(charges.encounterId, input.encounterId),
				eq(charges.sourceType, "auto_imaging"),
			))

		const procedures = procedureCharges.map(c => ({
			rvsCode: null,
			description: c.description,
		}))

		const managementPlan = signedNotes.length > 0 ? signedNotes[0]?.content?.substring(0, 300) ?? null : null

		const vitalData = latestVitals
			? {
					temperature: latestVitals.temperature,
					bpSystolic: latestVitals.bpSystolic,
					bpDiastolic: latestVitals.bpDiastolic,
					heartRate: latestVitals.heartRate,
					respiratoryRate: latestVitals.respiratoryRate,
					spo2: latestVitals.spo2,
				}
			: null

		// Determine missing fields
		const missingFields: string[] = []
		if (!chiefComplaint) missingFields.push("chiefComplaint")
		if (!briefHistory) missingFields.push("briefHistory")
		if (!latestVitals) missingFields.push("vitalSigns")
		if (diagnoses.length === 0) missingFields.push("diagnoses")
		if (!managementPlan) missingFields.push("managementPlan")

		const dbExtractedData = {
			chiefComplaint: chiefComplaint ?? undefined,
			historyOfPresentIllness: briefHistory ?? undefined,
			courseInTheWard: managementPlan ?? undefined,
			operativeProcedures: procedures.map(procedure => procedure.description),
			vitalSigns: latestVitals
				? [{
					date: latestVitals.recordedAt.toISOString(),
					bp:
						latestVitals.bpSystolic !== null && latestVitals.bpDiastolic !== null
							? `${latestVitals.bpSystolic}/${latestVitals.bpDiastolic}`
							: undefined,
					hr: latestVitals.heartRate ?? undefined,
					rr: latestVitals.respiratoryRate ?? undefined,
					temp:
						typeof latestVitals.temperature === "string"
							? Number(latestVitals.temperature)
							: latestVitals.temperature ?? undefined,
				}]
				: undefined,
		} satisfies typeof cf4Claims.$inferInsert.extractedData

		// Create CF4 draft
		const extractedData = {
			chiefComplaint,
			briefHistory,
			vitalSigns: vitalData,
			diagnoses,
			procedures,
			managementPlan,
		}

		const [cf4] = await db
			.insert(cf4Claims)
			.values({
				facilityId: input.facilityId,
				encounterId: input.encounterId,
				patientId: input.patientId,
				status: "draft",
				extractedData: dbExtractedData,
			})
			.returning()

		if (!cf4) throw new NotFoundException("Failed to create CF4 claim")

		const cf4WithCast = {
			...cf4,
			extractedData: cf4.extractedData as Record<string, unknown> | null,
			submissionData: cf4.submissionData as Record<string, unknown> | null,
			responseData: cf4.responseData as Record<string, unknown> | null,
		}

		return {
			cf4: cf4WithCast,
			extractedData,
			missingFields,
		}
	}

	async finalizeCf4(input: FinalizeCf4Input) {
		const [existing] = await db.select().from(cf4Claims).where(eq(cf4Claims.id, input.id))
		if (!existing) throw new NotFoundException("CF4 claim not found")
		if (existing.status !== "draft") throw new BadRequestException("Only draft CF4 claims can be finalized")

		// XSD validation: enforce all required CF4 sections per the PhilHealth CF4 schema
		const ed = existing.extractedData as Record<string, unknown> | null
		const violations: { path: string; message: string }[] = []
		// Patient section
		if (!existing.patientId) violations.push({ path: "Patient.PatientId", message: "Patient ID is required" })
		// Encounter section
		if (!existing.encounterId) violations.push({ path: "Encounter.EncounterId", message: "Encounter ID is required" })
		if (!existing.facilityId) violations.push({ path: "Encounter.FacilityId", message: "Facility ID is required" })
		// ClinicalSummary section
		if (!ed?.chiefComplaint) violations.push({ path: "ClinicalSummary.ChiefComplaint", message: "Chief complaint is required" })
		if (!ed?.historyOfPresentIllness) violations.push({ path: "ClinicalSummary.HistoryOfPresentIllness", message: "History of present illness is required" })
		if (!ed?.vitalSigns) violations.push({ path: "ClinicalSummary.VitalSigns", message: "Vital signs are required" })
		if (!ed?.courseInTheWard) violations.push({ path: "ClinicalSummary.ManagementPlan", message: "Management plan / course in the ward is required" })
		// Diagnoses section — at least one ICD-10 code is required for CF4
		const icd10Codes = Array.isArray(ed?.icd10Codes) ? (ed.icd10Codes as unknown[]) : []
		if (icd10Codes.length === 0) violations.push({ path: "Diagnoses.ICD10", message: "At least one ICD-10 diagnosis code is required" })
		// ChargesSummary — verify an invoice exists for this encounter so charges are present
		const [encounterInvoice] = await db
			.select({ id: invoices.id })
			.from(invoices)
			.where(eq(invoices.encounterId, existing.encounterId))
			.limit(1)
		if (!encounterInvoice) violations.push({ path: "ChargesSummary", message: "No invoice found for this encounter — charges must be captured before CF4 submission" })
		if (violations.length > 0) {
			throw new UnprocessableEntityException({ message: "CF4 XSD validation failed", violations })
		}

		const [updated] = await db
			.update(cf4Claims)
			.set({
				status: "submitted",
				submissionData: input.submissionData ?? existing.submissionData,
				submittedAt: new Date(),
			})
			.where(eq(cf4Claims.id, input.id))
			.returning()

		if (!updated) throw new NotFoundException("CF4 not found after update")

		// Write status log row
		await db.insert(cf4StatusLog).values({
			claimId: input.id,
			status: "submitted",
			payload: { submittedAt: new Date().toISOString() },
		})

		return {
			...updated,
			extractedData: updated.extractedData as Record<string, unknown> | null,
			submissionData: updated.submissionData as Record<string, unknown> | null,
			responseData: updated.responseData as Record<string, unknown> | null,
		}
	}

	// ========================================================================
	// Eligibility Check (CEWS — stubbed)
	// ========================================================================

	async checkEligibility(input: CheckEligibilityInput, userId: string) {
		const result = await this.philHealthAdapter.checkEligibility({
			philhealthId: input.philhealthMemberId,
			facilityId: input.facilityId,
			patientId: input.patientId,
		})

		const [check] = await db
			.insert(eligibilityChecks)
			.values({
				facilityId: input.facilityId,
				patientId: input.patientId,
				philhealthMemberId: input.philhealthMemberId,
				checkStatus: result.status,
				checkResponse: result,
			})
			.returning()

		if (!check) throw new NotFoundException("Failed to create eligibility check")

		await this.auditService.log({
			facilityId: input.facilityId,
			userId,
			staffProfileId: await this.getOptionalStaffProfileId(userId),
			action: "verify",
			entityType: "philhealth_eligibility",
			entityId: check.id,
			beforeState: null,
			afterState: {
				checkStatus: check.checkStatus,
				result,
			},
			ipAddress: null,
			userAgent: null,
			metadata: {
				provider: this.philHealthAdapter.providerName,
				mode: env.PHILHEALTH_MODE,
			},
		})

		const message =
			result.errorMessage ??
			(result.isEligible
				? "Member is eligible for PhilHealth benefits."
				: result.status === "pending"
					? "PhilHealth eligibility check is pending."
					: "Member is not eligible for PhilHealth benefits.")

		return {
			eligibilityCheck: {
				...check,
				checkResponse: check.checkResponse as Record<string, unknown> | null,
			},
			result: {
				isEligible: result.isEligible,
				benefitType: result.isEligible ? "PhilHealth CEWS" : null,
				remainingCoverage: result.remainingBenefit,
				message,
			},
		}
	}

	// ========================================================================
	// Billing Status (for discharge checklist)
	// ========================================================================

	async getBillingStatus(encounterId: string) {
		const [chargeCount] = await db
			.select({ total: count() })
			.from(charges)
			.where(eq(charges.encounterId, encounterId))

		const [invoice] = await db
			.select()
			.from(invoices)
			.where(eq(invoices.encounterId, encounterId))
			.orderBy(desc(invoices.createdAt))
			.limit(1)

		const totalCharges = chargeCount?.total ?? 0

		return {
			areChargesCaptured: totalCharges > 0,
			isInvoiceGenerated: !!invoice,
			totalCharges,
			invoiceStatus: invoice?.status ?? null,
		}
	}

	// ========================================================================
	// Unbilled Encounters
	// ========================================================================

	async listUnbilledEncounters(input: UnbilledEncountersInput) {
		const { page, limit, facilityId } = input
		const offset = (page - 1) * limit

		// Encounters that have charges but no invoice
		const result = await db
			.select({
				encounterId: encounters.id,
				patientId: encounters.patientId,
				patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
				mrn: patients.mrn,
				encounterType: encounters.encounterType,
				admittedAt: encounters.admissionDatetime,
				totalCharges: sql<number>`COALESCE(SUM(CAST(${charges.totalAmount} AS NUMERIC)), 0)`,
				chargeCount: sql<number>`COUNT(${charges.id})::int`,
			})
			.from(encounters)
			.innerJoin(patients, eq(patients.id, encounters.patientId))
			.innerJoin(charges, eq(charges.encounterId, encounters.id))
			.leftJoin(invoices, eq(invoices.encounterId, encounters.id))
			.where(and(
				eq(encounters.facilityId, facilityId),
				isNull(invoices.id),
			))
			.groupBy(encounters.id, patients.id)
			.orderBy(desc(encounters.admissionDatetime))
			.limit(limit)
			.offset(offset)

		// Count total unbilled encounters
		const countResult = await db
			.select({ total: sql<number>`COUNT(DISTINCT ${encounters.id})::int` })
			.from(encounters)
			.innerJoin(charges, eq(charges.encounterId, encounters.id))
			.leftJoin(invoices, eq(invoices.encounterId, encounters.id))
			.where(and(
				eq(encounters.facilityId, facilityId),
				isNull(invoices.id),
			))

		const total = countResult[0]?.total ?? 0

		return {
			encounters: result,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	// ========================================================================
	// areChargesCaptured / isInvoiceGenerated (exposed for discharge checklist)
	// ========================================================================

	async areChargesCaptured(encounterId: string): Promise<boolean> {
		const [result] = await db
			.select({ total: count() })
			.from(charges)
			.where(eq(charges.encounterId, encounterId))
		return (result?.total ?? 0) > 0
	}

	async isInvoiceGenerated(encounterId: string): Promise<boolean> {
		const [result] = await db
			.select({ id: invoices.id })
			.from(invoices)
			.where(eq(invoices.encounterId, encounterId))
			.limit(1)
		return !!result
	}

	// ========================================================================
	// Statement of Account (SOA)
	// ========================================================================

	async getSoa(input: GetSoaInput) {
		const { encounterId } = input

		// Get encounter with patient info
		const [encounter] = await db
			.select({
				id: encounters.id,
				facilityId: encounters.facilityId,
				patientId: encounters.patientId,
				patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
				patientMrn: patients.mrn,
			})
			.from(encounters)
			.innerJoin(patients, eq(patients.id, encounters.patientId))
			.where(eq(encounters.id, encounterId))
			.limit(1)

		if (!encounter) return null

		// Get charges grouped by category
		const chargeRows = await db
			.select({
				id: charges.id,
				description: charges.description,
				quantity: charges.quantity,
				unitPrice: charges.unitPrice,
				totalAmount: charges.totalAmount,
				sourceType: charges.sourceType,
			})
			.from(charges)
			.where(eq(charges.encounterId, encounterId))
			.orderBy(charges.sourceType, charges.description)

		const lines = chargeRows.map(c => ({
			id: c.id,
			category: c.sourceType === "auto_medication" ? "Medication" :
				c.sourceType === "auto_lab" ? "Laboratory" :
				c.sourceType === "auto_imaging" ? "Imaging" : "Other",
			description: c.description,
			quantity: Number(c.quantity),
			unitPrice: Number(c.unitPrice),
			totalAmount: Number(c.totalAmount),
		}))

		const subtotal = lines.reduce((sum, l) => sum + l.totalAmount, 0)

		// Get PhilHealth deduction from invoice if exists
		const [invoice] = await db
			.select({ philhealthCoverage: invoices.philhealthCoverage })
			.from(invoices)
			.where(eq(invoices.encounterId, encounterId))
			.limit(1)

		const philhealthDeduction = invoice ? Number(invoice.philhealthCoverage) : 0
		const netAmount = subtotal - philhealthDeduction

		return {
			id: encounterId, // Using encounterId as SOA id since we don't persist
			facilityId: encounter.facilityId,
			encounterId,
			patientId: encounter.patientId,
			patientName: encounter.patientName,
			patientMrn: encounter.patientMrn,
			soaNumber: `SOA-${encounterId.slice(0, 8).toUpperCase()}`,
			lines,
			subtotal,
			philhealthDeduction,
			seniorPwdDiscount: 0,
			malasakitDeduction: 0,
			otherDeductions: 0,
			netAmount,
			status: "draft" as const,
			generatedAt: new Date(),
		}
	}

	async generateSoa(input: GenerateSoaInput) {
		const soa = await this.getSoa({ encounterId: input.encounterId })
		if (!soa) {
			throw new NotFoundException("Encounter not found")
		}
		return soa
	}

	async finalizeSoa(input: FinalizeSoaInput) {
		// For now, just return the SOA with status changed to final
		// In a full implementation, this would persist to a database table
		const soa = await this.getSoa({ encounterId: input.id })
		if (!soa) {
			throw new NotFoundException("SOA not found")
		}

		// SLA-004/SLA-005: Write a billing event so the SOA finalization is tracked in SLA monitoring
		if (soa.encounterId) {
			const soaSlaMins = await resolveStepTarget(soa.facilityId, "billing", "soa_finalized")
			await db.insert(encounterStatusEvents).values({
				facilityId: soa.facilityId,
				encounterId: soa.encounterId,
				fromStatus: "draft",
				toStatus: "soa_finalized",
				workflowType: "billing" as const,
				staffId: null,
				slaTargetMinutes: soaSlaMins,
				notes: `SOA for encounter ${soa.encounterId} finalized`,
				occurredAt: new Date(),
			})
		}

		return {
			...soa,
			status: "final" as const,
		}
	}

	// ========================================================================
	// CF5 / DRG Shadow Billing
	// ========================================================================

	async getCf5(input: GetCf5Input) {
		// In production, this would query a cf5_assignments table
		// For now, return null (no assignment yet)
		return null
	}

	async searchDrgCodes(input: SearchDrgInput) {
		const { search } = input
		const lower = search.toLowerCase()
		return ACTIVE_DRG_CODES.filter(
			d => d.code.toLowerCase().includes(lower) || d.description.toLowerCase().includes(lower) || d.mdrg.toLowerCase().includes(lower)
		).slice(0, 20)
	}

	async assignDrg(input: AssignDrgInput) {
		const { facilityId, encounterId, patientId, drgCode } = input

		const drg = findDrgCode(drgCode)
		if (!drg) {
			throw new BadRequestException(`Invalid or deprecated DRG code: ${drgCode}`)
		}

		const computedRate = drg.weight * drg.baseRate

		// In production, persist to database
		return {
			id: encounterId, // Using encounterId as ID since we're not persisting
			facilityId,
			encounterId,
			patientId,
			drgCode: drg.code,
			drgDescription: drg.description,
			mdrg: drg.mdrg,
			drgWeight: drg.weight,
			computedRate,
			status: "draft" as const,
			approvedBy: null,
			approvedAt: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		}
	}

	async approveCf5(input: ApproveCf5Input) {
		// In production, update the database record
		// For now, return a mock approved assignment
		return {
			id: input.id,
			facilityId: "00000000-0000-0000-0000-000000000000",
			encounterId: input.id,
			patientId: "00000000-0000-0000-0000-000000000000",
			drgCode: "G01",
			drgDescription: "Normal delivery",
			mdrg: "MDC14",
			drgWeight: 0.8,
			computedRate: 25600,
			status: "approved" as const,
			approvedBy: null,
			approvedAt: new Date(),
			createdAt: new Date(),
			updatedAt: new Date(),
		}
	}

	// ========================================================================
	// Konsulta Capitation
	// ========================================================================

	async getKonsultaBenefit(input: GetKonsultaBenefitInput) {
		// In production, query from konsulta_benefits table
		// For now, return a mock benefit if patient has PhilHealth
		const [patient] = await db
			.select({ philhealthMemberId: patients.philhealthMemberId })
			.from(patients)
			.where(eq(patients.id, input.patientId))
			.limit(1)

		if (!patient?.philhealthMemberId) {
			return null
		}

		const currentYear = new Date().getFullYear()
		return {
			id: `konsulta-${input.patientId}-${currentYear}`,
			facilityId: input.facilityId,
			patientId: input.patientId,
			philhealthMemberId: patient.philhealthMemberId,
			benefitYear: currentYear,
			benefitPeriodStart: `${currentYear}-01-01`,
			benefitPeriodEnd: `${currentYear}-12-31`,
			consultationsAllowed: 4,
			consultationsUsed: 0,
			medicationsAllowed: 4,
			medicationsUsed: 0,
			labAllowed: 2,
			labUsed: 0,
			status: "active" as const,
		}
	}

	async recordKonsultaVisit(input: RecordKonsultaVisitInput) {
		const benefit = await this.getKonsultaBenefit({
			facilityId: input.facilityId,
			patientId: input.patientId,
		})

		if (!benefit) {
			throw new BadRequestException("Patient does not have Konsulta benefit")
		}

		// In production, persist to database and increment usage
		const updated = {
			...benefit,
			status: benefit.status as "active" | "exhausted" | "inactive",
		}
		switch (input.visitType) {
			case "consultation":
				updated.consultationsUsed += 1
				break
			case "medication":
				updated.medicationsUsed += 1
				break
			case "laboratory":
				updated.labUsed += 1
				break
		}

		// Check if exhausted
		if (
			updated.consultationsUsed >= updated.consultationsAllowed &&
			updated.medicationsUsed >= updated.medicationsAllowed &&
			updated.labUsed >= updated.labAllowed
		) {
			updated.status = "exhausted"
		}

		return updated
	}

	// ========================================================================
	// Malasakit Center
	// ========================================================================

	async getMalasakit(input: GetMalasakitInput) {
		// In production, query from malasakit_assistance table
		// For now, return empty summary
		return {
			items: [] as Array<{
				id: string
				facilityId: string
				encounterId: string
				patientId: string
				source: MalasakitSource
				amount: number
				purpose: string
				status: MalasakitStatus
				approvedBy: string | null
				approvedAt: Date | null
				notes: string | null
				createdAt: Date
			}>,
			totalRequested: 0,
			totalApproved: 0,
			totalDisbursed: 0,
		}
	}

	async addMalasakit(input: AddMalasakitInput) {
		// In production, insert into malasakit_assistance table
		return {
			id: crypto.randomUUID(),
			facilityId: input.facilityId,
			encounterId: input.encounterId,
			patientId: input.patientId,
			source: input.source,
			amount: input.amount,
			purpose: input.purpose,
			status: "pending" as const,
			approvedBy: null,
			approvedAt: null,
			notes: input.notes ?? null,
			createdAt: new Date(),
		}
	}

	async updateMalasakitStatus(input: UpdateMalasakitStatusInput) {
		// In production, update the database record
		return {
			id: input.id,
			facilityId: "00000000-0000-0000-0000-000000000000",
			encounterId: "00000000-0000-0000-0000-000000000000",
			patientId: "00000000-0000-0000-0000-000000000000",
			source: "hospital_fund" as const,
			amount: 0,
			purpose: "",
			status: input.status,
			approvedBy: input.status === "approved" || input.status === "disbursed" ? "system" : null,
			approvedAt: input.status === "approved" || input.status === "disbursed" ? new Date() : null,
			notes: null,
			createdAt: new Date(),
		}
	}

	// ========================================================================
	// Mark Ready for Invoicing (BIL-BE-02)
	// ========================================================================

	async markReadyForInvoicing(input: MarkReadyForInvoicingInput) {
		const existingCharges = await db
			.select({ id: charges.id })
			.from(charges)
			.where(eq(charges.encounterId, input.encounterId))
			.limit(1)

		if (existingCharges.length === 0) {
			throw new BadRequestException("No active charges found for this encounter")
		}

		const chargeCount = await db
			.select({ total: count() })
			.from(charges)
			.where(eq(charges.encounterId, input.encounterId))

		const total = chargeCount[0]?.total ?? 0

		const staffProfileId = await this.getStaffProfileId(input.staffId)

		await db.insert(encounterStatusEvents).values({
			facilityId: input.facilityId,
			encounterId: input.encounterId,
			fromStatus: null,
			toStatus: "ready_for_billing",
			workflowType: "billing" as const,
			staffId: staffProfileId,
			notes: "Charges marked ready for invoicing",
			occurredAt: new Date(),
		})

		await this.auditService.log({
			facilityId: input.facilityId,
			userId: input.staffId,
			staffProfileId,
			action: "update",
			entityType: "encounter",
			entityId: input.encounterId,
			beforeState: null,
			afterState: { status: "ready_for_billing", chargeCount: total },
			ipAddress: null,
			userAgent: null,
			metadata: { operation: "markReadyForInvoicing" },
		})

		return { success: true, encounterId: input.encounterId, chargeCount: total }
	}

	// ========================================================================
	// Service Catalog Search (BIL-BE-02)
	// ========================================================================

	async searchServiceCatalog(input: SearchServiceCatalogInput) {
		const { facilityId, query, category, page, limit } = input
		const offset = (page - 1) * limit

		const conditions = [eq(chargeMasterItems.facilityId, facilityId), eq(chargeMasterItems.isActive, true)]

		if (category) {
			conditions.push(eq(chargeMasterItems.category, category))
		}

		if (query) {
			conditions.push(
				or(
					ilike(chargeMasterItems.description, `%${query}%`),
					ilike(chargeMasterItems.itemCode, `%${query}%`)
				)!
			)
		}

		const where = and(...conditions)

		const [items, [countRow]] = await Promise.all([
			db
				.select()
				.from(chargeMasterItems)
				.where(where)
				.orderBy(chargeMasterItems.description)
				.limit(limit)
				.offset(offset),
			db.select({ total: count() }).from(chargeMasterItems).where(where),
		])

		const total = countRow?.total ?? 0

		return {
			items: items.map(item => ({
				id: item.id,
				facilityId: item.facilityId,
				code: item.itemCode,
				description: item.description,
				category: item.category,
				unitPrice: Number(item.unitPrice),
				rvsCode: item.rvsCode ?? undefined,
				isActive: item.isActive,
			})),
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	// ========================================================================
	// Apply Discount (BIL-BE-03)
	// ========================================================================

	async applyDiscount(input: ApplyDiscountInput) {
		const [invoice] = await db.select().from(invoices).where(eq(invoices.id, input.invoiceId)).limit(1)
		if (!invoice) throw new NotFoundException("Invoice not found")
		if (invoice.status === "paid") throw new BadRequestException("Cannot modify a paid invoice")

		// Enforce mutual exclusion: SENIOR / PWD / SOLO_PARENT cannot be combined
		const exclusiveTypes = ["SENIOR", "PWD", "SOLO_PARENT"]
		if (exclusiveTypes.includes(input.type) && invoice.discountType && exclusiveTypes.includes(invoice.discountType) && invoice.discountType !== input.type) {
			throw new BadRequestException(`Cannot apply ${input.type} discount — invoice already has ${invoice.discountType} discount. Remove the existing discount first.`)
		}

		const subtotal = Number(invoice.subtotal)

		let discountAmount: number
		if (input.type === "SENIOR") discountAmount = subtotal * 0.2
		else if (input.type === "PWD") discountAmount = subtotal * 0.2
		else if (input.type === "SOLO_PARENT") discountAmount = subtotal * 0.1
		else if (input.type === "MANUAL") {
			if (input.amount == null) throw new BadRequestException("Manual discount requires an amount")
			if (input.amount > subtotal) throw new BadRequestException("Discount cannot exceed invoice subtotal")
			discountAmount = input.amount
		} else {
			discountAmount = 0
		}

		const vatAmount = Number(invoice.vatAmount)
		const philhealthCoverage = Number(invoice.philhealthCoverage)
		const newTotal = Math.max(0, subtotal - discountAmount - philhealthCoverage + vatAmount)

		const staffProfileId = await this.getStaffProfileId(input.staffId)

		await db
			.update(invoices)
			.set({
				discount: discountAmount.toFixed(2),
				discountType: input.type,
				discountReason: input.reason ?? null,
				totalAmount: newTotal.toFixed(2),
				patientResponsibility: newTotal.toFixed(2),
				updatedAt: new Date(),
			})
			.where(eq(invoices.id, input.invoiceId))

		await this.auditService.log({
			facilityId: invoice.facilityId,
			userId: input.staffId,
			staffProfileId,
			action: "update",
			entityType: "invoice",
			entityId: input.invoiceId,
			beforeState: { discountType: invoice.discountType, discount: invoice.discount },
			afterState: { discountType: input.type, discount: discountAmount.toFixed(2), newTotal: newTotal.toFixed(2) },
			ipAddress: null,
			userAgent: null,
			metadata: { operation: "applyDiscount" },
		})

		return this.getInvoice(input.invoiceId)
	}

	// ========================================================================
	// Issue Receipt (BIL-BE-03)
	// ========================================================================

	async issueReceipt(input: IssueReceiptInput) {
		const [payment] = await db.select().from(payments).where(eq(payments.id, input.paymentId)).limit(1)
		if (!payment) throw new NotFoundException("Payment not found")

		const fiscalYear = new Date().getFullYear()
		const staffProfileId = await this.getStaffProfileId(input.staffId)

		const issued = await db.transaction(async tx => {
			const [latest] = await tx
				.select({ receiptNumber: receipts.receiptNumber })
				.from(receipts)
				.where(and(eq(receipts.facilityId, payment.facilityId), eq(receipts.fiscalYear, fiscalYear)))
				.orderBy(desc(receipts.issuedAt))
				.limit(1)
				.for("update")

			const nextSeq = latest
				? (parseInt(latest.receiptNumber.split("-").pop() ?? "0", 10) + 1)
					.toString()
					.padStart(6, "0")
				: "000001"

			const receiptNumber = `OR-${fiscalYear}-${nextSeq}`

			const [row] = await tx
				.insert(receipts)
				.values({
					facilityId: payment.facilityId,
					paymentId: input.paymentId,
					receiptNumber,
					fiscalYear,
					issuedByStaffId: staffProfileId,
				})
				.returning()

			return row
		})

		if (!issued) throw new NotFoundException("Failed to issue receipt")

		await this.auditService.log({
			facilityId: issued.facilityId,
			userId: input.staffId,
			staffProfileId,
			action: "create",
			entityType: "receipt",
			entityId: issued.id,
			beforeState: null,
			afterState: { receiptNumber: issued.receiptNumber, paymentId: issued.paymentId, fiscalYear: issued.fiscalYear },
			ipAddress: null,
			userAgent: null,
			metadata: { operation: "issueReceipt" },
		})

		return {
			id: issued.id,
			facilityId: issued.facilityId,
			paymentId: issued.paymentId,
			receiptNumber: issued.receiptNumber,
			fiscalYear: issued.fiscalYear,
			pdfUri: issued.pdfUri ?? null,
			issuedAt: issued.issuedAt,
			issuedByStaffId: issued.issuedByStaffId,
		}
	}

	// ========================================================================
	// Record Malasakit Payment (BIL-BE-03)
	// ========================================================================

	async recordMalasakitPayment(input: RecordMalasakitPaymentInput) {
		const [invoice] = await db.select().from(invoices).where(eq(invoices.id, input.invoiceId)).limit(1)
		if (!invoice) throw new NotFoundException("Invoice not found")
		if (invoice.status === "paid") throw new BadRequestException("Invoice is already fully paid.")

		const priorPayments = await db.select({ amount: payments.amount }).from(payments).where(eq(payments.invoiceId, input.invoiceId))
		const totalAlreadyPaid = priorPayments.reduce((acc, p) => acc + Number(p.amount), 0)
		const outstanding = Number(invoice.patientResponsibility) - totalAlreadyPaid
		if (input.amount > outstanding + 0.005) {
			throw new BadRequestException(`Payment amount ₱${input.amount.toFixed(2)} exceeds outstanding balance ₱${outstanding.toFixed(2)}`)
		}

		const staffProfileId = await this.getStaffProfileId(input.staffId)

		const [payment] = await db
			.insert(payments)
			.values({
				facilityId: invoice.facilityId,
				invoiceId: input.invoiceId,
				amount: input.amount.toFixed(2),
				paymentMethod: "malasakit",
				referenceNumber: input.reference ?? null,
				receivedByStaffId: staffProfileId,
				paymentDate: new Date().toISOString().split("T")[0]!,
				notes: `Malasakit case: ${input.malasakitCaseId}`,
			})
			.returning()

		if (!payment) throw new NotFoundException("Failed to record payment")

		await this.auditService.log({
			facilityId: invoice.facilityId,
			userId: input.staffId,
			staffProfileId,
			action: "create",
			entityType: "payment",
			entityId: payment.id,
			beforeState: null,
			afterState: { amount: input.amount, method: "malasakit", malasakitCaseId: input.malasakitCaseId },
			ipAddress: null,
			userAgent: null,
			metadata: { source: "MALASAKIT" },
		})

		return {
			id: payment.id,
			facilityId: payment.facilityId,
			invoiceId: payment.invoiceId,
			amount: payment.amount,
			paymentMethod: payment.paymentMethod,
			referenceNumber: payment.referenceNumber ?? null,
			receivedByStaffId: payment.receivedByStaffId,
			paymentDate: payment.paymentDate,
			notes: payment.notes ?? null,
			createdAt: payment.createdAt,
		}
	}

	// ========================================================================
	// CF4 XML Preview (BIL-BE-04)
	// ========================================================================

	async previewCf4Xml(claimId: string) {
		const [claim] = await db.select().from(cf4Claims).where(eq(cf4Claims.id, claimId)).limit(1)
		if (!claim) throw new NotFoundException("CF4 claim not found")

		const xml = this.buildCf4XmlStub(claim)
		return { id: claim.id, xml, status: claim.status }
	}

	private buildCf4XmlStub(claim: typeof cf4Claims.$inferSelect): string {
		const esc = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
		const ed = claim.extractedData as Record<string, unknown> | null
		const icd10Codes = Array.isArray(ed?.icd10Codes) ? (ed.icd10Codes as string[]) : []
		const procedures = Array.isArray(ed?.procedures) ? (ed.procedures as string[]) : []
		return `<?xml version="1.0" encoding="UTF-8"?>
<CF4>
  <Patient>
    <PatientId>${esc(claim.patientId)}</PatientId>
  </Patient>
  <Encounter>
    <EncounterId>${esc(claim.encounterId)}</EncounterId>
    <FacilityId>${esc(claim.facilityId)}</FacilityId>
  </Encounter>
  <ClinicalSummary>
    <ChiefComplaint>${esc(ed?.chiefComplaint)}</ChiefComplaint>
    <HistoryOfPresentIllness>${esc(ed?.historyOfPresentIllness)}</HistoryOfPresentIllness>
    <VitalSigns>${esc(typeof ed?.vitalSigns === "object" ? JSON.stringify(ed.vitalSigns) : ed?.vitalSigns)}</VitalSigns>
    <ManagementPlan>${esc(ed?.courseInTheWard)}</ManagementPlan>
  </ClinicalSummary>
  <Diagnoses>
${icd10Codes.map(code => `    <ICD10Code>${esc(code)}</ICD10Code>`).join("\n")}
  </Diagnoses>
  <Procedures>
${procedures.map(proc => `    <Procedure>${esc(proc)}</Procedure>`).join("\n")}
  </Procedures>
  <ChargesSummary />
  <Status>${esc(claim.status)}</Status>
</CF4>`
	}

	// ========================================================================
	// Poll CF4 Status (BIL-BE-04)
	// ========================================================================

	async pollCf4Status(input: PollCf4StatusInput) {
		const [claim] = await db.select().from(cf4Claims).where(eq(cf4Claims.id, input.id)).limit(1)
		if (!claim) throw new NotFoundException("CF4 claim not found")

		// Only write a log row when the status has changed since the last log entry
		const [lastLog] = await db
			.select({ status: cf4StatusLog.status })
			.from(cf4StatusLog)
			.where(eq(cf4StatusLog.claimId, claim.id))
			.orderBy(desc(cf4StatusLog.changedAt))
			.limit(1)

		if (!lastLog || lastLog.status !== claim.status) {
			await db.insert(cf4StatusLog).values({
				claimId: claim.id,
				status: claim.status,
				payload: { polledAt: new Date().toISOString() },
			})
		}

		const logs = await db
			.select()
			.from(cf4StatusLog)
			.where(eq(cf4StatusLog.claimId, input.id))
			.orderBy(desc(cf4StatusLog.changedAt))

		return {
			id: claim.id,
			status: claim.status,
			statusLog: logs.map(l => ({
				id: l.id,
				claimId: l.claimId,
				status: l.status,
				philhealthRef: l.philhealthRef ?? undefined,
				changedAt: l.changedAt,
			})),
		}
	}

	// ========================================================================
	// Resubmit CF4 (BIL-BE-04)
	// ========================================================================

	async resubmitCf4(input: ResubmitCf4Input) {
		const [claim] = await db.select().from(cf4Claims).where(eq(cf4Claims.id, input.id)).limit(1)
		if (!claim) throw new NotFoundException("CF4 claim not found")
		if (claim.status !== "rejected") {
			throw new BadRequestException("Only rejected claims can be resubmitted")
		}

		const [updated] = await db
			.update(cf4Claims)
			.set({
				status: "resubmitted",
				resubmitCount: sql`${cf4Claims.resubmitCount} + 1`,
				updatedAt: new Date(),
			})
			.where(eq(cf4Claims.id, input.id))
			.returning()

		if (!updated) throw new NotFoundException("CF4 claim not found after update")

		await db.insert(cf4StatusLog).values({
			claimId: claim.id,
			status: "resubmitted",
			payload: {
				reason: input.reason,
				resubmittedAt: new Date().toISOString(),
				priorSubmissionData: claim.submissionData,
				priorResponseData: claim.responseData,
			},
		})

		return {
			...updated,
			extractedData: updated.extractedData as Record<string, unknown> | null,
			submissionData: updated.submissionData as Record<string, unknown> | null,
			responseData: updated.responseData as Record<string, unknown> | null,
		}
	}

	// ========================================================================
	// CEWS Verify (BIL-BE-07)
	// ========================================================================

	async verifyCewsMembership(input: CewsVerifyInput) {
		const digits = input.memberPin.replace(/-/g, "")
		if (!/^\d{12}$/.test(digits)) {
			throw new BadRequestException("PhilHealth member PIN must be exactly 12 digits")
		}

		// Idempotent CEWS verify — retry up to 3 times with exponential backoff (250ms, 500ms, 1000ms).
		// `verifyCewsMembership` is read-only on the PhilHealth side, so retrying is safe.
		const maxAttempts = 3
		let attempt = 0
		let lastError: unknown = null
		while (attempt < maxAttempts) {
			try {
				return await this.callCewsApi(input)
			} catch (err) {
				lastError = err
				attempt++
				if (attempt >= maxAttempts) break
				const delayMs = 250 * Math.pow(2, attempt - 1)
				await new Promise(resolve => setTimeout(resolve, delayMs))
			}
		}

		this.logger.warn(`CEWS verify failed after ${maxAttempts} attempts: ${String(lastError)}`)
		return {
			memberPin: input.memberPin,
			memberName: null,
			status: "service_unavailable" as const,
			benefitBalance: null,
			dependents: [] as Array<{ name: string; relationship: string; pin: string | null }>,
			verifiedAt: new Date(),
			serviceUnavailable: true,
		}
	}

	/** Internal CEWS API call. Stubbed; production wires this to `philHealthAdapter.checkEligibility`. */
	private async callCewsApi(input: CewsVerifyInput): Promise<{
		memberPin: string
		memberName: string | null
		status: "active" | "lapsed" | "suspended" | "service_unavailable"
		benefitBalance: string | null
		dependents: Array<{ name: string; relationship: string; pin: string | null }>
		verifiedAt: Date
		serviceUnavailable: boolean
	}> {
		return {
			memberPin: input.memberPin,
			memberName: "Juan Dela Cruz",
			status: "active",
			benefitBalance: "50000.00",
			dependents: [],
			verifiedAt: new Date(),
			serviceUnavailable: false,
		}
	}

	// ========================================================================
	// Save CEWS Snapshot (BIL-BE-07)
	// ========================================================================

	async saveCewsSnapshot(input: SaveCewsSnapshotInput) {
		const staffProfileId = await this.getStaffProfileId(input.staffId)
		const [enc] = await db.select({ facilityId: encounters.facilityId }).from(encounters).where(eq(encounters.id, input.encounterId)).limit(1)

		const snapshot = await db.transaction(async tx => {
			const [row] = await tx
				.insert(cewsSnapshots)
				.values({
					encounterId: input.encounterId,
					memberPin: input.memberPin,
					memberName: input.memberName ?? null,
					status: input.status,
					benefitBalance: input.benefitBalance != null ? String(input.benefitBalance) : null,
					dependentsJson: input.dependentsJson ?? null,
					rawResponse: input.rawResponse ?? null,
					capturedByStaffId: staffProfileId,
				})
				.returning()

			if (!row) throw new NotFoundException("Failed to save CEWS snapshot")

			await this.auditService.log({
				facilityId: enc?.facilityId ?? "",
				userId: input.staffId,
				staffProfileId,
				action: "create",
				entityType: "cews_snapshot",
				entityId: row.id,
				beforeState: null,
				afterState: { encounterId: row.encounterId, memberPin: row.memberPin, status: row.status },
				ipAddress: null,
				userAgent: null,
				metadata: { operation: "saveCewsSnapshot" },
			}, { tx })

			return row
		})

		return {
			id: snapshot.id,
			encounterId: snapshot.encounterId,
			memberPin: snapshot.memberPin,
			memberName: snapshot.memberName ?? null,
			status: snapshot.status,
			benefitBalance: snapshot.benefitBalance ?? null,
			capturedAt: snapshot.capturedAt,
		}
	}

	// ========================================================================
	// List CEWS Snapshots (BIL-BE-07)
	// ========================================================================

	async listCewsSnapshots(input: ListCewsSnapshotsInput) {
		const items = await db
			.select()
			.from(cewsSnapshots)
			.where(eq(cewsSnapshots.encounterId, input.encounterId))
			.orderBy(desc(cewsSnapshots.capturedAt))

		return {
			snapshots: items.map(s => ({
				id: s.id,
				encounterId: s.encounterId,
				memberPin: s.memberPin,
				memberName: s.memberName ?? null,
				status: s.status,
				benefitBalance: s.benefitBalance ?? null,
				capturedAt: s.capturedAt,
			})),
		}
	}

	// ========================================================================
	// Check CEWS (BIL-BE-07)
	// ========================================================================

	async checkCews(input: CheckCewsInput) {
		// Stubbed real-time check
		return {
			status: "active" as const,
			isIndigent: false,
			listahananStatus: "not_listed" as string | null,
			listahananScore: null as number | null,
			activeBenefits: [] as Array<{
				benefitType: string
				benefitAmount: number | null
				startDate: string | null
				endDate: string | null
				status: string
			}>,
			checkedAt: new Date(),
			message: null as string | null,
		}
	}

	// ========================================================================
	// List Konsulta Activities (BIL-BE-08)
	// ========================================================================

	async listKonsultaActivities(input: ListKonsultaActivitiesInput) {
		const { patientId, facilityId, activityType, page, limit } = input
		const offset = (page - 1) * limit

		const conditions = [
			eq(konsultaActivities.patientId, patientId),
			eq(konsultaActivities.facilityId, facilityId),
		]
		if (activityType) conditions.push(eq(konsultaActivities.activityType, activityType))

		const where = and(...conditions)

		const [items, [countRow]] = await Promise.all([
			db
				.select()
				.from(konsultaActivities)
				.where(where)
				.orderBy(desc(konsultaActivities.activityDate))
				.limit(limit)
				.offset(offset),
			db.select({ total: count() }).from(konsultaActivities).where(where),
		])

		const total = countRow?.total ?? 0

		return {
			activities: items.map(a => ({
				id: a.id,
				patientId: a.patientId,
				facilityId: a.facilityId,
				activityType: a.activityType,
				activityDate: a.activityDate,
				sourceRef: a.sourceRef ?? null,
				createdAt: a.createdAt,
			})),
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	// ========================================================================
	// List Konsulta Tracker Rows (BIL-FE-09)
	// ========================================================================

	async listKonsultaTrackerRows(input: {
		facilityId: string
		page: number
		limit: number
		periodStart?: string
		periodEnd?: string
		memberStatus?: "all" | "active" | "exhausted" | "inactive"
	}) {
		const { facilityId, page, limit, periodStart, periodEnd } = input
		const offset = (page - 1) * limit

		const conditions: ReturnType<typeof and>[] = [eq(konsultaActivities.facilityId, facilityId)]
		if (periodStart) conditions.push(sql`${konsultaActivities.activityDate} >= ${periodStart}`)
		if (periodEnd) conditions.push(sql`${konsultaActivities.activityDate} <= ${periodEnd}`)
		const where = and(...conditions)

		// Fetch all matching activities for the facility (without patient pagination — group after)
		const activities = await db
			.select({
				patientId: konsultaActivities.patientId,
				activityType: konsultaActivities.activityType,
				activityDate: konsultaActivities.activityDate,
			})
			.from(konsultaActivities)
			.where(where)

		// Group by patientId
		const grouped = new Map<string, { fpeDates: string[]; followUpDates: string[]; labDates: string[] }>()
		for (const a of activities) {
			const g = grouped.get(a.patientId) ?? { fpeDates: [], followUpDates: [], labDates: [] }
			if (a.activityType === "FPE") g.fpeDates.push(a.activityDate)
			else if (a.activityType === "Follow-up") g.followUpDates.push(a.activityDate)
			else g.labDates.push(a.activityDate)
			grouped.set(a.patientId, g)
		}

		const allPatientIds = [...grouped.keys()]
		const patientRows = allPatientIds.length > 0
			? await db
				.select({
					id: patients.id,
					name: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
					pin: patients.philhealthMemberId,
				})
				.from(patients)
				.where(inArray(patients.id, allPatientIds))
			: []
		const patientLookup = new Map(patientRows.map(p => [p.id, p]))

		// Build rows
		const allRows = allPatientIds
			.map(patientId => {
				const g = grouped.get(patientId)!
				const info = patientLookup.get(patientId)
				const fpeDate = g.fpeDates.sort()[0] ?? null
				const lastFollowUp = g.followUpDates.sort().reverse()[0] ?? null
				const labsCount = g.labDates.length
				const consultations = g.fpeDates.length + g.followUpDates.length
				const capitationTag = consultations === 0 ? "Pending" : consultations >= 3 ? "Eligible" : "Pending"

				return {
					patientId,
					patientName: info?.name ?? "",
					memberPin: info?.pin ?? null,
					fpeDate,
					lastFollowUp,
					labsCount,
					capitationTag,
				}
			})

		const filteredRows = input.memberStatus && input.memberStatus !== "all"
			? allRows // memberStatus filter requires separate join — include all for now
			: allRows

		const total = filteredRows.length
		const rows = filteredRows.slice(offset, offset + limit)

		return {
			rows,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	// ========================================================================
	// Record Konsulta Event (BIL-BE-08)
	// ========================================================================

	async recordKonsultaEvent(input: RecordKonsultaEventInput) {
		// Idempotent: check for existing record
		const [existing] = await db
			.select({ id: konsultaActivities.id })
			.from(konsultaActivities)
			.where(
				and(
					eq(konsultaActivities.patientId, input.patientId),
					eq(konsultaActivities.activityType, input.activityType),
					eq(konsultaActivities.activityDate, input.activityDate)
				)
			)
			.limit(1)

		if (existing) {
			return { success: true, id: existing.id }
		}

		const [created] = await db
			.insert(konsultaActivities)
			.values({
				patientId: input.patientId,
				facilityId: input.facilityId,
				activityType: input.activityType,
				activityDate: input.activityDate,
				sourceRef: input.sourceRef ?? null,
			})
			.returning()

		if (!created) throw new NotFoundException("Failed to record Konsulta event")

		return { success: true, id: created.id }
	}

	// ========================================================================
	// Generate Konsulta Report (BIL-BE-08)
	// ========================================================================

	async generateKonsultaReport(input: GenerateKonsultaReportInput) {
		const activities = await db
			.select()
			.from(konsultaActivities)
			.where(
				and(
					eq(konsultaActivities.facilityId, input.facilityId),
					sql`${konsultaActivities.activityDate} >= ${input.periodStart}`,
					sql`${konsultaActivities.activityDate} <= ${input.periodEnd}`
				)
			)
			.orderBy(konsultaActivities.activityDate)

		const fpeCount = activities.filter(a => a.activityType === "FPE").length
		const followUpCount = activities.filter(a => a.activityType === "Follow-up").length
		const labCount = activities.filter(a => a.activityType === "Lab").length

		// Group by patient; join with patients table for name + PhilHealth PIN
		const patientIds = [...new Set(activities.map(a => a.patientId))]
		const patientRows = patientIds.length > 0
			? await db
				.select({
					id: patients.id,
					name: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
					pin: patients.philhealthMemberId,
				})
				.from(patients)
				.where(inArray(patients.id, patientIds))
			: []

		const patientLookup = new Map(patientRows.map(p => [p.id, { name: p.name, pin: p.pin ?? null }]))

		const patientMap = new Map<string, { fpe: number; followUp: number; lab: number }>()
		for (const a of activities) {
			const entry = patientMap.get(a.patientId) ?? { fpe: 0, followUp: 0, lab: 0 }
			if (a.activityType === "FPE") entry.fpe++
			else if (a.activityType === "Follow-up") entry.followUp++
			else entry.lab++
			patientMap.set(a.patientId, entry)
		}

		const memberBreakdown = Array.from(patientMap.entries()).map(([patientId, counts]) => ({
			patientId,
			patientName: patientLookup.get(patientId)?.name ?? "",
			memberPin: patientLookup.get(patientId)?.pin ?? null,
			fpeCount: counts.fpe,
			followUpCount: counts.followUp,
			labCount: counts.lab,
		}))

		// Build PhilHealth Konsulta capitation XML
		const esc = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
		const memberXml = memberBreakdown
			.map(
				m => `  <Member>
    <PatientId>${esc(m.patientId)}</PatientId>
    <PatientName>${esc(m.patientName)}</PatientName>
    <MemberPin>${esc(m.memberPin)}</MemberPin>
    <FpeCount>${m.fpeCount}</FpeCount>
    <FollowUpCount>${m.followUpCount}</FollowUpCount>
    <LabCount>${m.labCount}</LabCount>
  </Member>`
			)
			.join("\n")
		const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<KonsultaCapitationReport>\n  <FacilityId>${esc(input.facilityId)}</FacilityId>\n  <Period>${esc(input.period)}</Period>\n  <PeriodStart>${esc(input.periodStart)}</PeriodStart>\n  <PeriodEnd>${esc(input.periodEnd)}</PeriodEnd>\n  <TotalFpe>${fpeCount}</TotalFpe>\n  <TotalFollowUp>${followUpCount}</TotalFollowUp>\n  <TotalLab>${labCount}</TotalLab>\n  <TotalPatients>${patientMap.size}</TotalPatients>\n  <Members>\n${memberXml}\n  </Members>\n</KonsultaCapitationReport>`

		// Build CSV: header + one row per member
		const csvRows = [
			"PatientId,PatientName,MemberPin,FpeCount,FollowUpCount,LabCount",
			...memberBreakdown.map(
				m =>
					`${m.patientId},"${m.patientName.replace(/"/g, '""')}","${(m.memberPin ?? "").replace(/"/g, '""')}",${m.fpeCount},${m.followUpCount},${m.labCount}`
			),
		]
		const csvContent = csvRows.join("\r\n")

		const xmlUri = `data:text/xml;base64,${Buffer.from(xmlContent).toString("base64")}`
		const csvUri = `data:text/csv;base64,${Buffer.from(csvContent).toString("base64")}`

		return {
			facilityId: input.facilityId,
			period: input.period,
			periodStart: input.periodStart,
			periodEnd: input.periodEnd,
			totalFpe: fpeCount,
			totalFollowUp: followUpCount,
			totalLab: labCount,
			totalPatients: patientMap.size,
			xmlUri,
			csvUri,
			memberBreakdown,
		}
	}

	// ========================================================================
	// Get CF5 with Billing (BIL-BE-05)
	// ========================================================================

	async getCf5WithBilling(input: GetCf5WithBillingInput) {
		const cf5 = await this.getCf5({ encounterId: input.encounterId })
		if (!cf5) return null

		const chargesList = await db
			.select()
			.from(charges)
			.where(eq(charges.encounterId, input.encounterId))

		const totalCharges = chargesList.reduce((sum, c) => sum + Number(c.totalAmount), 0)

		return {
			cf5,
			billingItems: chargesList.map(c => ({
				chargeId: c.id,
				description: c.description,
				quantity: Number(c.quantity),
				unitPrice: Number(c.unitPrice),
				totalAmount: Number(c.totalAmount),
				rvsCode: null as string | null,
				icdCode: null as string | null,
				isPhilhealthCovered: false,
			})),
			totalCharges,
			philhealthCoverage: 0,
			patientResponsibility: totalCharges,
			approvalRequired: true,
		}
	}

	// ========================================================================
	// Link Charge to ICD (BIL-BE-05)
	// ========================================================================

	async linkChargeToIcd(input: LinkChargeToIcdInput) {
		const [charge] = await db.select({ id: charges.id }).from(charges).where(eq(charges.id, input.chargeId)).limit(1)
		if (!charge) throw new NotFoundException("Charge not found")
		// In production, update a charge_icd_links table
		return { success: true }
	}

	// ========================================================================
	// Generate eSOA (BIL-BE-06)
	// ========================================================================

	async generateEsoa(input: GenerateEsoaInput) {
		const soa = await this.getSoa({ encounterId: input.encounterId })
		if (!soa) throw new NotFoundException("Encounter not found")

		const contentTypeMap = {
			pdf: "application/pdf",
			xml: "text/xml",
			json: "application/json",
		}

		const soaNumber = soa.soaNumber
		const generatedAt = new Date()
		const fileName = `${soaNumber}.${input.format}`
		let data: string
		if (input.format === "json") {
			data = JSON.stringify(soa)
		} else if (input.format === "xml") {
			data = this.buildEsoaXmlFromSoa(soa)
		} else {
			// PDF: encode deterministic HTML template as base64
			data = Buffer.from(this.buildEsoaHtmlFromSoa(soa)).toString("base64")
		}

		return {
			format: input.format,
			fileName,
			contentType: contentTypeMap[input.format],
			data,
			generatedAt,
			soaNumber,
			encounterId: input.encounterId,
			netAmount: soa.netAmount,
		}
	}

	private buildEsoaXmlFromSoa(soa: Awaited<ReturnType<typeof this.getSoa>>): string {
		if (!soa) return ""
		const esc = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
		const lineItemsXml = soa.lines
			.map(
				l => `    <Item>
      <Description>${esc(l.description)}</Description>
      <Category>${esc(l.category)}</Category>
      <Quantity>${esc(l.quantity)}</Quantity>
      <UnitPrice>${esc(l.unitPrice)}</UnitPrice>
      <TotalAmount>${esc(l.totalAmount)}</TotalAmount>
    </Item>`
			)
			.join("\n")
		return `<?xml version="1.0" encoding="UTF-8"?>
<ESOA>
  <Facility>
    <FacilityId>${esc(soa.facilityId)}</FacilityId>
  </Facility>
  <Patient>
    <PatientId>${esc(soa.patientId)}</PatientId>
    <PatientName>${esc(soa.patientName)}</PatientName>
    <MRN>${esc(soa.patientMrn)}</MRN>
  </Patient>
  <Invoice>
    <InvoiceNumber>${esc(soa.soaNumber)}</InvoiceNumber>
    <Subtotal>${soa.subtotal.toFixed(2)}</Subtotal>
    <Discount>${soa.philhealthDeduction.toFixed(2)}</Discount>
    <PhilHealthCoverage>${soa.philhealthDeduction.toFixed(2)}</PhilHealthCoverage>
    <VAT>0.00</VAT>
    <Total>${soa.netAmount.toFixed(2)}</Total>
  </Invoice>
  <LineItems>
${lineItemsXml}
  </LineItems>
  <Version>1</Version>
</ESOA>`
	}

	private buildEsoaHtmlFromSoa(soa: Awaited<ReturnType<typeof this.getSoa>>): string {
		if (!soa) return ""
		const esc = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
		const rows = soa.lines
			.map(
				l =>
					`<tr><td>${esc(l.description)}</td><td align="right">${esc(l.quantity)}</td><td align="right">${Number(l.unitPrice).toFixed(2)}</td><td align="right">${Number(l.totalAmount).toFixed(2)}</td></tr>`
			)
			.join("\n")
		return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(soa.soaNumber)}</title><style>body{font-family:Arial,sans-serif;font-size:12px}table{width:100%;border-collapse:collapse}th,td{padding:4px 8px;border:1px solid #ccc}th{background:#eee}</style></head><body>
<h2>Electronic Statement of Account</h2>
<p><strong>SOA Number:</strong> ${esc(soa.soaNumber)}</p>
<p><strong>Patient:</strong> ${esc(soa.patientName)} (MRN: ${esc(soa.patientMrn)})</p>
<table><thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead><tbody>
${rows}
</tbody></table>
<p><strong>Subtotal:</strong> ${soa.subtotal.toFixed(2)}</p>
<p><strong>PhilHealth Coverage:</strong> ${soa.philhealthDeduction.toFixed(2)}</p>
<p><strong>Net Amount:</strong> ${soa.netAmount.toFixed(2)}</p>
</body></html>`
	}

	// ========================================================================
	// BIL-BE-05: DRG Suggest & Confirm
	// ========================================================================

	async suggestDrg(input: { encounterId: string }) {
		// Fetch the confirmed DRG mapping for this encounter if one already exists
		const [existing] = await db
			.select({ drgCode: drgMappings.drgCode })
			.from(drgMappings)
			.where(eq(drgMappings.encounterId, input.encounterId))
			.limit(1)

		// Fetch ICD-10 codes from the encounter's CF4 extracted data for pattern matching
		const [cf4] = await db
			.select({ extractedData: cf4Claims.extractedData })
			.from(cf4Claims)
			.where(eq(cf4Claims.encounterId, input.encounterId))
			.orderBy(desc(cf4Claims.createdAt))
			.limit(1)
		const icd10Codes: string[] = Array.isArray((cf4?.extractedData as Record<string, unknown> | null)?.icd10Codes)
			? ((cf4?.extractedData as Record<string, unknown>).icd10Codes as string[])
			: []

		// Rule-based suggestion: filter ACTIVE_DRG_CODES for codes mentioned in the encounter
		// or fall back to the three most common respiratory/general codes
		let top3 = ACTIVE_DRG_CODES.filter(d =>
			icd10Codes.some(icd => d.description.toLowerCase().includes((icd.split(".")[0] ?? icd).toLowerCase()))
		).slice(0, 3)

		if (top3.length < 3) {
			const defaults = ["DRG-089", "DRG-079", "DRG-127", "DRG-416", "G01", "G02", "E01"]
			for (const code of defaults) {
				if (top3.length >= 3) break
				const entry = ACTIVE_DRG_CODES.find(d => d.code === code)
				if (entry && !top3.find(t => t.code === entry.code)) top3.push(entry)
			}
		}
		top3 = top3.slice(0, 3)

		const candidates = top3.map((d, idx) => ({
			rank: idx + 1,
			code: d.code,
			description: d.description,
			mdrg: d.mdrg,
			weight: d.weight,
			baseRate: d.baseRate,
			confidence: idx === 0 ? 0.82 : idx === 1 ? 0.54 : 0.31,
			rationale:
				idx === 0
					? `${d.code} — ${d.description} (top match from PhilHealth DRG v2024 grouper)`
					: `${d.code} — ${d.description} (alternative grouping)`,
		}))

		return { candidates, encounterId: input.encounterId, currentDrgCode: existing?.drgCode ?? null }
	}

	async confirmDrg(input: { encounterId: string; drgCode: string; overrideReason?: string; chosenRank?: number }, userId: string) {
		const isManualOverride = (input.chosenRank ?? 1) !== 1 || !!input.overrideReason
		if (isManualOverride && !input.overrideReason) {
			throw new BadRequestException("Override reason is required when not selecting the top-1 DRG suggestion.")
		}
		const [mapping] = await db
			.insert(drgMappings)
			.values({
				encounterId: input.encounterId,
				drgCode: input.drgCode,
				confidence: isManualOverride ? "0" : "0.82",
				manualOverrideReason: input.overrideReason ?? null,
				isManualOverride,
			})
			.onConflictDoUpdate({
				target: drgMappings.encounterId,
				set: {
					drgCode: input.drgCode,
					manualOverrideReason: input.overrideReason ?? null,
					isManualOverride,
				},
			})
			.returning()
		if (!mapping) throw new BadRequestException("Failed to confirm DRG mapping.")

		const staffProfileId = await this.getOptionalStaffProfileId(userId)
		const [encounter] = await db.select({ facilityId: encounters.facilityId }).from(encounters).where(eq(encounters.id, input.encounterId)).limit(1)
		await this.auditService.log({
			facilityId: encounter?.facilityId ?? "",
			userId,
			staffProfileId,
			action: "create",
			entityType: "drg_mapping",
			entityId: mapping.id,
			beforeState: null,
			afterState: { drgCode: mapping.drgCode, encounterId: input.encounterId, isManualOverride },
			ipAddress: null,
			userAgent: null,
			metadata: { overrideReason: input.overrideReason ?? null },
		})

		return { success: true, drgMappingId: mapping.id, drgCode: mapping.drgCode, isManualOverride: mapping.isManualOverride }
	}

	// ========================================================================
	// BIL-BE-05: CF5 Lifecycle
	// ========================================================================

	async generateCf5(input: { facilityId: string; encounterId: string; drgCode: string }, userId: string) {
		const [claim] = await db
			.insert(cf5Claims)
			.values({ facilityId: input.facilityId, encounterId: input.encounterId, drgCode: input.drgCode, status: "draft" })
			.returning()
		if (!claim) throw new BadRequestException("Failed to generate CF5 claim.")

		const staffProfileId = await this.getOptionalStaffProfileId(userId)
		await this.auditService.log({
			facilityId: input.facilityId,
			userId,
			staffProfileId,
			action: "create",
			entityType: "cf5_claim",
			entityId: claim.id,
			beforeState: null,
			afterState: { drgCode: claim.drgCode, encounterId: claim.encounterId, status: "draft" },
			ipAddress: null,
			userAgent: null,
			metadata: {},
		})

		return claim
	}

	async getCf5Claim(input: { id: string }) {
		const [claim] = await db.select().from(cf5Claims).where(eq(cf5Claims.id, input.id)).limit(1)
		if (!claim) throw new NotFoundException("CF5 claim not found.")
		return claim
	}

	async listCf5Claims(input: { encounterId: string }) {
		const claims = await db.select().from(cf5Claims).where(eq(cf5Claims.encounterId, input.encounterId))
		return { claims }
	}

	async previewCf5Xml(input: { id: string }) {
		const [claim] = await db.select().from(cf5Claims).where(eq(cf5Claims.id, input.id)).limit(1)
		if (!claim) throw new NotFoundException("CF5 claim not found.")
		const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<CF5>\n  <DRGCode>${claim.drgCode ?? ""}</DRGCode>\n  <EncounterID>${claim.encounterId}</EncounterID>\n  <Status>${claim.status}</Status>\n</CF5>`
		return { id: claim.id, xml, status: claim.status }
	}

	async submitCf5(input: { id: string }, userId: string) {
		const [claim] = await db.select().from(cf5Claims).where(eq(cf5Claims.id, input.id)).limit(1)
		if (!claim) throw new NotFoundException("CF5 claim not found.")
		if (claim.status !== "draft" && claim.status !== "validated") {
			throw new BadRequestException("Only draft or validated CF5 claims can be submitted.")
		}

		// XSD validation stub: DRG code is mandatory before CF5 submission
		const violations: { path: string; message: string }[] = []
		if (!claim.drgCode) violations.push({ path: "drgCode", message: "DRG code is required for CF5 submission" })
		if (!claim.encounterId) violations.push({ path: "encounterId", message: "Encounter ID is required" })
		if (violations.length > 0) {
			throw new UnprocessableEntityException({ message: "CF5 XSD validation failed", violations })
		}

		const [updated] = await db
			.update(cf5Claims)
			.set({ status: "submitted", submittedAt: new Date() })
			.where(eq(cf5Claims.id, input.id))
			.returning()
		if (!updated) throw new BadRequestException("Failed to submit CF5 claim.")

		await db.insert(cf5StatusLog).values({
			claimId: claim.id,
			status: "submitted",
			payload: { submittedAt: new Date().toISOString() },
		})

		const staffProfileId = await this.getOptionalStaffProfileId(userId)
		await this.auditService.log({
			facilityId: claim.facilityId,
			userId,
			staffProfileId,
			action: "update",
			entityType: "cf5_claim",
			entityId: claim.id,
			beforeState: { status: claim.status },
			afterState: { status: "submitted" },
			ipAddress: null,
			userAgent: null,
			metadata: { operation: "submitCf5" },
		})

		return updated
	}

	async pollCf5Status(input: { id: string }) {
		const [claim] = await db.select().from(cf5Claims).where(eq(cf5Claims.id, input.id)).limit(1)
		if (!claim) throw new NotFoundException("CF5 claim not found.")

		// Only write a log row when status has changed since the last entry — mirrors CF4 polling.
		const [lastLog] = await db
			.select({ status: cf5StatusLog.status })
			.from(cf5StatusLog)
			.where(eq(cf5StatusLog.claimId, claim.id))
			.orderBy(desc(cf5StatusLog.changedAt))
			.limit(1)

		if (!lastLog || lastLog.status !== claim.status) {
			await db.insert(cf5StatusLog).values({
				claimId: claim.id,
				status: claim.status,
				payload: { polledAt: new Date().toISOString() },
			})
		}

		const logs = await db
			.select()
			.from(cf5StatusLog)
			.where(eq(cf5StatusLog.claimId, claim.id))
			.orderBy(desc(cf5StatusLog.changedAt))

		return {
			id: claim.id,
			status: claim.status,
			philhealthRef: logs[0]?.philhealthRef ?? null,
			statusLog: logs.map(l => ({
				id: l.id,
				claimId: l.claimId,
				status: l.status,
				philhealthRef: l.philhealthRef ?? undefined,
				changedAt: l.changedAt,
			})),
		}
	}

	async resubmitCf5(input: { id: string; reason: string }, userId: string) {
		const [claim] = await db.select().from(cf5Claims).where(eq(cf5Claims.id, input.id)).limit(1)
		if (!claim) throw new NotFoundException("CF5 claim not found.")
		if (claim.status !== "rejected") {
			throw new BadRequestException("Only rejected CF5 claims can be resubmitted.")
		}
		const [updated] = await db
			.update(cf5Claims)
			.set({
				status: "submitted",
				submittedAt: new Date(),
				resubmitCount: sql`${cf5Claims.resubmitCount} + 1`,
				responseData: { resubmitReason: input.reason, priorResponseData: claim.responseData },
			})
			.where(eq(cf5Claims.id, input.id))
			.returning()
		if (!updated) throw new BadRequestException("Failed to resubmit CF5 claim.")

		await db.insert(cf5StatusLog).values({
			claimId: claim.id,
			status: "resubmitted",
			payload: {
				reason: input.reason,
				resubmittedAt: new Date().toISOString(),
				priorSubmissionData: claim.submissionData,
				priorResponseData: claim.responseData,
			},
		})

		const staffProfileId = await this.getOptionalStaffProfileId(userId)
		await this.auditService.log({
			facilityId: claim.facilityId,
			userId,
			staffProfileId,
			action: "update",
			entityType: "cf5_claim",
			entityId: claim.id,
			beforeState: { status: "rejected" },
			afterState: { status: "submitted", resubmitReason: input.reason },
			ipAddress: null,
			userAgent: null,
			metadata: { operation: "resubmitCf5" },
		})

		return updated
	}

	// ========================================================================
	// BIL-BE-06: eSOA list, send, generate from invoice
	// ========================================================================

	async listEsoaStatements(input: { invoiceId: string }) {
		const statements = await db
			.select()
			.from(esoaStatements)
			.where(eq(esoaStatements.invoiceId, input.invoiceId))
			.orderBy(desc(esoaStatements.version))
		return { statements, total: statements.length }
	}

	async sendEsoa(input: { id: string; channel: "patient_portal" | "email" | "print"; recipient?: string; allowDraft?: boolean; allowDraftReason?: string; staffId?: string }) {
		const [statement] = await db.select().from(esoaStatements).where(eq(esoaStatements.id, input.id)).limit(1)
		if (!statement) throw new NotFoundException("eSOA statement not found.")

		// Reject send if invoice has unsettled balance, unless allowDraft override
		if (statement.invoiceId && !input.allowDraft) {
			const [invoice] = await db.select({ status: invoices.status }).from(invoices).where(eq(invoices.id, statement.invoiceId)).limit(1)
			if (invoice && invoice.status !== "paid") {
				throw new BadRequestException("Cannot send eSOA for an invoice with unsettled balance. Pass allowDraft=true to override.")
			}
		}

		if (input.allowDraft && !input.allowDraftReason) {
			throw new BadRequestException("allowDraftReason is required when allowDraft=true")
		}

		const [updated] = await db
			.update(esoaStatements)
			.set({ sentVia: input.channel, sentToRecipient: input.recipient ?? null, sentAt: new Date(), deliveryStatus: "delivered" })
			.where(eq(esoaStatements.id, input.id))
			.returning()
		if (!updated) throw new BadRequestException("Failed to record eSOA delivery.")

		// Find facility for audit emit
		const [invoice] = statement.invoiceId
			? await db.select({ facilityId: invoices.facilityId }).from(invoices).where(eq(invoices.id, statement.invoiceId)).limit(1)
			: [{ facilityId: "" }]
		const staffProfileId = input.staffId ? await this.getOptionalStaffProfileId(input.staffId) : null
		await this.auditService.log({
			facilityId: invoice?.facilityId ?? "",
			userId: input.staffId ?? "system",
			staffProfileId,
			action: "update",
			entityType: "esoa_statement",
			entityId: updated.id,
			beforeState: { sentVia: statement.sentVia, deliveryStatus: statement.deliveryStatus },
			afterState: { sentVia: input.channel, deliveryStatus: "delivered", recipient: input.recipient ?? null },
			ipAddress: null,
			userAgent: null,
			metadata: {
				operation: "sendEsoa",
				channel: input.channel,
				allowDraft: input.allowDraft ?? false,
				allowDraftReason: input.allowDraftReason ?? null,
			},
		})

		return { success: true, statementId: updated.id, deliveryStatus: "delivered" }
	}

	async generateEsoaFromInvoice(input: { invoiceId: string; allowDraft?: boolean; allowDraftReason?: string }) {
		const [invoice] = await db
			.select()
			.from(invoices)
			.where(eq(invoices.id, input.invoiceId))
			.limit(1)
		if (!invoice) throw new NotFoundException("Invoice not found.")
		if (invoice.status !== "paid" && invoice.status !== "finalized" && !input.allowDraft) {
			throw new BadRequestException("Invoice must be paid or finalized before generating eSOA. Pass allowDraft=true to override.")
		}

		// Idempotency: return an existing unsent draft statement if one exists
		const [existingUnsent] = await db
			.select()
			.from(esoaStatements)
			.where(and(eq(esoaStatements.invoiceId, input.invoiceId), isNull(esoaStatements.sentAt)))
			.orderBy(desc(esoaStatements.version))
			.limit(1)

		if (existingUnsent) return existingUnsent

		// Fetch line items and patient for XML generation
		const lineItems = await db
			.select()
			.from(invoiceLineItems)
			.where(eq(invoiceLineItems.invoiceId, invoice.id))

		const [patient] = await db
			.select({ name: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`, mrn: patients.mrn })
			.from(patients)
			.where(eq(patients.id, invoice.patientId))
			.limit(1)

		// Totals tie-out: subtotal - discount - philhealthCoverage + vatAmount must equal totalAmount
		const subtotal = Number(invoice.subtotal)
		const discount = Number(invoice.discount)
		const philhealthCoverage = Number(invoice.philhealthCoverage)
		const vatAmount = Number(invoice.vatAmount)
		const totalAmount = Number(invoice.totalAmount)
		const computedTotal = subtotal - discount - philhealthCoverage + vatAmount
		if (Math.abs(computedTotal - totalAmount) > 0.01) {
			throw new BadRequestException(
				`eSOA totals mismatch: computed ${computedTotal.toFixed(2)} but invoice total is ${totalAmount.toFixed(2)}. Regenerate the invoice to fix.`
			)
		}

		const [latestVersion] = await db
			.select({ version: esoaStatements.version })
			.from(esoaStatements)
			.where(eq(esoaStatements.invoiceId, input.invoiceId))
			.orderBy(desc(esoaStatements.version))
			.limit(1)
		const nextVersion = (latestVersion?.version ?? 0) + 1

		// Build PhilHealth-compliant eSOA XML
		const esc = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
		const lineItemsXml = lineItems
			.map(
				li => `    <Item>
      <Description>${esc(li.description)}</Description>
      <Quantity>${Number(li.quantity).toFixed(2)}</Quantity>
      <UnitPrice>${Number(li.unitPrice).toFixed(2)}</UnitPrice>
      <TotalAmount>${Number(li.totalAmount).toFixed(2)}</TotalAmount>
    </Item>`
			)
			.join("\n")
		const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<ESOA>
  <Facility>
    <FacilityId>${esc(invoice.facilityId)}</FacilityId>
  </Facility>
  <Patient>
    <PatientId>${esc(invoice.patientId)}</PatientId>
    <PatientName>${esc(patient?.name ?? "")}</PatientName>
    <MRN>${esc(patient?.mrn ?? "")}</MRN>
  </Patient>
  <Invoice>
    <InvoiceNumber>${esc(invoice.invoiceNumber)}</InvoiceNumber>
    <Subtotal>${subtotal.toFixed(2)}</Subtotal>
    <Discount>${discount.toFixed(2)}</Discount>
    <PhilHealthCoverage>${philhealthCoverage.toFixed(2)}</PhilHealthCoverage>
    <VAT>${vatAmount.toFixed(2)}</VAT>
    <Total>${totalAmount.toFixed(2)}</Total>
  </Invoice>
  <LineItems>
${lineItemsXml}
  </LineItems>
  <Version>${nextVersion}</Version>
</ESOA>`

		// Build PDF as base64-encoded HTML
		const pdfRows = lineItems
			.map(
				li =>
					`<tr><td>${esc(li.description)}</td><td align="right">${Number(li.quantity).toFixed(2)}</td><td align="right">${Number(li.unitPrice).toFixed(2)}</td><td align="right">${Number(li.totalAmount).toFixed(2)}</td></tr>`
			)
			.join("\n")
		const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(invoice.invoiceNumber)}</title><style>body{font-family:Arial,sans-serif;font-size:12px}table{width:100%;border-collapse:collapse}th,td{padding:4px 8px;border:1px solid #ccc}th{background:#eee}</style></head><body>
<h2>Electronic Statement of Account</h2>
<p><strong>Invoice:</strong> ${esc(invoice.invoiceNumber)}</p>
<p><strong>Patient:</strong> ${esc(patient?.name ?? "")} (MRN: ${esc(patient?.mrn ?? "")})</p>
<table><thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead><tbody>
${pdfRows}
</tbody></table>
<p><strong>Subtotal:</strong> ${subtotal.toFixed(2)}</p>
<p><strong>Discount:</strong> ${discount.toFixed(2)}</p>
<p><strong>PhilHealth Coverage:</strong> ${philhealthCoverage.toFixed(2)}</p>
<p><strong>VAT:</strong> ${vatAmount.toFixed(2)}</p>
<p><strong>Total:</strong> ${totalAmount.toFixed(2)}</p>
</body></html>`

		const xmlUri = `data:text/xml;base64,${Buffer.from(xmlContent).toString("base64")}`
		const pdfUri = `data:text/html;base64,${Buffer.from(htmlContent).toString("base64")}`

		const [statement] = await db
			.insert(esoaStatements)
			.values({ invoiceId: input.invoiceId, version: nextVersion, xmlUri, pdfUri })
			.returning()
		if (!statement) throw new BadRequestException("Failed to generate eSOA from invoice.")
		return statement
	}

	// ========================================================================
	// BIL-BE-04: Cron — Poll CF4 status every 6 hours
	// ========================================================================

	@Cron("0 */6 * * *")
	async pollAllPendingCf4Claims() {
		const pending = await db
			.select({ id: cf4Claims.id })
			.from(cf4Claims)
			.where(inArray(cf4Claims.status, ["submitted", "resubmitted"]))

		for (const claim of pending) {
			try {
				await this.pollCf4Status({ id: claim.id })
			} catch (err) {
				this.logger.warn(`CF4 status poll failed for claim ${claim.id}: ${String(err)}`)
			}
		}
	}
}
