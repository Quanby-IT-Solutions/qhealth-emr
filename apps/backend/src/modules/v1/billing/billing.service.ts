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
		return {
			...soa,
			status: "final" as const,
		}
	}

	// ========================================================================
	// CF5 / DRG Shadow Billing
	// ========================================================================

	// Sample DRG codes (in production, load from database or PhilHealth API)
	private readonly sampleDrgCodes = [
		{ code: "A01", description: "Craniotomy for trauma", mdrg: "MDC01", weight: 3.5, baseRate: 32000 },
		{ code: "A02", description: "Spinal procedures", mdrg: "MDC01", weight: 2.8, baseRate: 32000 },
		{ code: "B01", description: "Lens procedures", mdrg: "MDC02", weight: 1.2, baseRate: 32000 },
		{ code: "C01", description: "Major chest procedures", mdrg: "MDC04", weight: 2.5, baseRate: 32000 },
		{ code: "D01", description: "Cardiac valve procedures", mdrg: "MDC05", weight: 4.0, baseRate: 32000 },
		{ code: "E01", description: "Appendectomy", mdrg: "MDC06", weight: 1.5, baseRate: 32000 },
		{ code: "F01", description: "Hip replacement", mdrg: "MDC08", weight: 2.2, baseRate: 32000 },
		{ code: "G01", description: "Normal delivery", mdrg: "MDC14", weight: 0.8, baseRate: 32000 },
		{ code: "G02", description: "Cesarean section", mdrg: "MDC14", weight: 1.4, baseRate: 32000 },
		{ code: "H01", description: "Newborn care", mdrg: "MDC15", weight: 0.5, baseRate: 32000 },
	]

	async getCf5(input: GetCf5Input) {
		// In production, this would query a cf5_assignments table
		// For now, return null (no assignment yet)
		return null
	}

	async searchDrgCodes(input: SearchDrgInput) {
		const { search } = input
		const lower = search.toLowerCase()
		return this.sampleDrgCodes.filter(
			d => d.code.toLowerCase().includes(lower) || d.description.toLowerCase().includes(lower)
		)
	}

	async assignDrg(input: AssignDrgInput) {
		const { facilityId, encounterId, patientId, drgCode } = input

		const drg = this.sampleDrgCodes.find(d => d.code === drgCode)
		if (!drg) {
			throw new BadRequestException(`Invalid DRG code: ${drgCode}`)
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
		const updated: typeof benefit & { status: "active" | "exhausted" | "inactive" } = { ...benefit }
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
}
