import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common"
import { and, count, desc, eq, isNull, sql } from "drizzle-orm"

import {
	chargeMasterItems,
	charges,
	cf4Claims,
	clinicalNotes,
	eligibilityChecks,
	encounters,
	invoiceLineItems,
	invoices,
	patients,
	payments,
	problems,
	staffProfiles,
	vitalSigns,
} from "@repo/db/schema"

import { db } from "@/common/database/database.client"

// ============================================================================
// Input Types (explicit — avoids TypeScript depth limit with InferContractRouterInputs)
// ============================================================================

interface ListChargeMasterInput {
	page: number
	limit: number
	facilityId: string
	category?: "laboratory" | "imaging" | "medication" | "procedure" | "room" | "other"
	search?: string
	isActive?: boolean
}

interface ListChargesInput {
	page: number
	limit: number
	facilityId: string
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
	description?: string
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
	paymentMethod: "cash" | "philhealth" | "hmo" | "credit_card" | "bank_transfer" | "other"
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

@Injectable()
export class BillingService {
	private readonly logger = new Logger(BillingService.name)

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

	// ========================================================================
	// Charge Master
	// ========================================================================

	async listChargeMasterItems(input: ListChargeMasterInput) {
		const { page, limit, facilityId, category, search, isActive } = input
		const offset = (page - 1) * limit

		const conditions = [eq(chargeMasterItems.facilityId, facilityId)]
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

		const conditions = [
			eq(charges.facilityId, facilityId),
			eq(charges.encounterId, encounterId),
		]
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
		return charge
	}

	async updateCharge(input: UpdateChargeInput) {
		const [existing] = await db
			.select()
			.from(charges)
			.where(eq(charges.id, input.id))

		if (!existing) throw new NotFoundException("Charge not found")

		const newQuantity = input.quantity !== undefined ? String(input.quantity) : existing.quantity
		const newDescription = input.description ?? existing.description
		const newTotal = (Number(newQuantity) * Number(existing.unitPrice)).toFixed(2)

		const [updated] = await db
			.update(charges)
			.set({
				quantity: newQuantity,
				description: newDescription,
				totalAmount: newTotal,
			})
			.where(eq(charges.id, input.id))
			.returning()

		if (!updated) throw new NotFoundException("Charge not found after update")
		return updated
	}

	async deleteCharge(id: string) {
		const [existing] = await db.select().from(charges).where(eq(charges.id, id))
		if (!existing) throw new NotFoundException("Charge not found")
		if (existing.sourceType !== "manual") {
			throw new BadRequestException("Cannot delete auto-captured charges")
		}

		await db.delete(charges).where(eq(charges.id, id))
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

		const [payment] = await db
			.insert(payments)
			.values({
				facilityId: input.facilityId,
				invoiceId: input.invoiceId,
				amount: String(input.amount),
				paymentMethod: input.paymentMethod,
				referenceNumber: input.referenceNumber ?? null,
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

		// Create CF4 draft
		const [cf4] = await db
			.insert(cf4Claims)
			.values({
				facilityId: input.facilityId,
				encounterId: input.encounterId,
				patientId: input.patientId,
				status: "draft",
				submissionData: {
					chiefComplaint,
					briefHistory,
					vitalSigns: vitalData,
					diagnoses,
					procedures,
					managementPlan,
				},
			})
			.returning()

		if (!cf4) throw new NotFoundException("Failed to create CF4 claim")

		const cf4WithCast = {
			...cf4,
			submissionData: cf4.submissionData as Record<string, unknown> | null,
			responseData: cf4.responseData as Record<string, unknown> | null,
		}

		return {
			cf4: cf4WithCast,
			extractedData: {
				chiefComplaint,
				briefHistory,
				vitalSigns: vitalData,
				diagnoses,
				procedures,
				managementPlan,
			},
			missingFields,
		}
	}

	async finalizeCf4(input: FinalizeCf4Input) {
		const [existing] = await db.select().from(cf4Claims).where(eq(cf4Claims.id, input.id))
		if (!existing) throw new NotFoundException("CF4 claim not found")
		if (existing.status !== "draft") throw new BadRequestException("Only draft CF4 claims can be finalized")

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
		return {
			...updated,
			submissionData: updated.submissionData as Record<string, unknown> | null,
			responseData: updated.responseData as Record<string, unknown> | null,
		}
	}

	// ========================================================================
	// Eligibility Check (CEWS — stubbed)
	// ========================================================================

	async checkEligibility(input: CheckEligibilityInput) {
		// Stubbed: returns mock eligibility data
		const [check] = await db
			.insert(eligibilityChecks)
			.values({
				facilityId: input.facilityId,
				patientId: input.patientId,
				philhealthMemberId: input.philhealthMemberId,
				checkStatus: "eligible",
				checkResponse: {
					isEligible: true,
					benefitType: "All Case Rate",
					remainingCoverage: 45000,
					memberType: "Member",
					effectiveDate: "2025-01-01",
					expiryDate: "2026-12-31",
				},
			})
			.returning()

		if (!check) throw new NotFoundException("Failed to create eligibility check")

		return {
			eligibilityCheck: {
				...check,
				checkResponse: check.checkResponse as Record<string, unknown> | null,
			},
			result: {
				isEligible: true,
				benefitType: "All Case Rate",
				remainingCoverage: 45000,
				message: "Member is eligible for PhilHealth benefits. (Stubbed response)",
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
}
