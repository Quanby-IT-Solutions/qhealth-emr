import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { and, desc, eq, isNotNull, sql } from "drizzle-orm"

import type {
	CreateNbsConsent,
	CreateNbsReferral,
	CreateNbsScreening,
	NbsConsent,
	NbsLogbookQuery,
	NbsLogbookResponse,
	NbsReferral,
	NbsScreening,
	UpdateNbsReferral,
	UpdateNbsScreening,
} from "@repo/contracts"
import { consentRecords, nbsLogEntries, patients, staffProfiles } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

type NbsScreeningResultCondition = {
	condition: string
	result: "normal" | "abnormal" | "inconclusive"
	value?: string
}

type NbsScreeningResultJson = {
	sampleId?: string
	testType?: "heel_prick" | "cord_blood"
	conditions?: NbsScreeningResultCondition[]
	labName?: string
	labReportDate?: string
}

type NbsReferralJson = {
	id: string
	referredCondition: string
	referralFacility: string
	referralDatetime: string
	referralStatus: "pending" | "accepted" | "completed" | "declined"
	acceptedAt?: string | null
	completedAt?: string | null
	referralNotes?: string | null
	performedBy: string
	performedByName: string
	createdAt: string
	updatedAt: string
}

function parseReferralDatetime(value: string): Date {
	const parsed = new Date(value)
	if (!Number.isNaN(parsed.getTime())) return parsed

	// Fallback for UI values like "04/30/2026, 05:26 AM"
	const normalized = value.replace(",", "")
	const fallback = new Date(normalized)
	if (!Number.isNaN(fallback.getTime())) return fallback

	throw new BadRequestException("Invalid referral date/time")
}

function parseReferralHistory(referralNotes: string | null): NbsReferralJson[] {
	if (!referralNotes) return []
	try {
		const parsed = JSON.parse(referralNotes) as { referrals?: NbsReferralJson[] }
		return parsed.referrals ?? []
	} catch {
		// Backward compatibility: legacy text notes were stored directly in referral_notes.
		return []
	}
}

function isUuid(value: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function calculateHoursElapsed(birthDatetime: Date, screeningDatetime: Date | null) {
	if (!screeningDatetime) return null
	return Math.round((screeningDatetime.getTime() - birthDatetime.getTime()) / 3_600_000)
}

function mapLogEntryToScreening(row: {
	id: string
	encounterId: string | null
	patientId: string
	facilityId: string
	birthDatetime: Date
	screeningDatetime: Date | null
	status: "pending" | "screened" | "referred" | "completed"
	screeningResult: unknown
	consentStatus: "pending" | "consented" | "waived" | "refused"
	waiverReason: string | null
	referralStatus: "none" | "referred" | "completed"
	referralFacility: string | null
	referralDate: Date | string | null
	referralNotes: string | null
	screenedByStaffId: string | null
	createdAt: Date
	updatedAt: Date
	patientName?: string
	patientMrn?: string
}) {
	const screeningResult = row.screeningResult as NbsScreeningResultJson | null | undefined
	const conditions = screeningResult?.conditions ?? []
	const hasAbnormal = conditions.some(condition => condition.result === "abnormal")
	const hasBorderline = conditions.some(condition => condition.result === "inconclusive")
	const resultOverall: "normal" | "abnormal" | "borderline" | null = hasAbnormal
		? "abnormal"
		: hasBorderline
			? "borderline"
			: conditions.length > 0
				? "normal"
				: null

	return {
		id: row.id,
		encounterId: row.encounterId ?? crypto.randomUUID(),
		patientId: row.patientId,
		facilityId: row.facilityId,
		birthDatetime: row.birthDatetime,
		specimenCollectedAt: row.screeningDatetime,
		specimenSentAt: null,
		resultReceivedAt: null,
		specimenType: screeningResult?.testType ?? null,
		specimenBarcode: screeningResult?.sampleId ?? null,
		specimenCollectedBy: row.screenedByStaffId,
		specimenCollectedByName: null,
		status:
			row.status === "screened"
				? "collected"
				: row.status === "referred"
					? "sent"
					: row.status === "completed"
						? "resulted"
						: "pending",
		result_ch: null,
		result_cah: null,
		result_g6pd: null,
		result_gal: null,
		result_pku: null,
		result_msud: null,
		result_overall: resultOverall,
		notes: null,
		performedBy: row.screenedByStaffId ?? row.patientId,
		performedByName: "System User",
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		hoursElapsed: calculateHoursElapsed(row.birthDatetime, row.screeningDatetime),
		patientName: row.patientName,
		patientMrn: row.patientMrn,
	}
}

@Injectable()
export class NbsService {
	// ========================================================================
	// Screening
	// ========================================================================

	async getScreeningByEncounter(encounterId: string): Promise<NbsScreening | null> {
		const [row] = await db
			.select({
				id: nbsLogEntries.id,
				encounterId: nbsLogEntries.encounterId,
				patientId: nbsLogEntries.patientId,
				facilityId: nbsLogEntries.facilityId,
				birthDatetime: nbsLogEntries.birthDatetime,
				screeningDatetime: nbsLogEntries.screeningDatetime,
				status: nbsLogEntries.status,
				screeningResult: nbsLogEntries.screeningResult,
				consentStatus: nbsLogEntries.consentStatus,
				waiverReason: nbsLogEntries.waiverReason,
				referralStatus: nbsLogEntries.referralStatus,
				referralFacility: nbsLogEntries.referralFacility,
				referralDate: nbsLogEntries.referralDate,
				referralNotes: nbsLogEntries.referralNotes,
				screenedByStaffId: nbsLogEntries.screenedByStaffId,
				createdAt: nbsLogEntries.createdAt,
				updatedAt: nbsLogEntries.updatedAt,
			})
			.from(nbsLogEntries)
			.where(eq(nbsLogEntries.encounterId, encounterId))

		return row ? (mapLogEntryToScreening(row) as NbsScreening) : null
	}

	async createScreening(input: CreateNbsScreening, performedBy: string): Promise<NbsScreening> {
		const now = new Date()
		const screeningDatetime = input.specimenCollectedAt ? new Date(input.specimenCollectedAt) : null
		const [capturingStaff] = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(
				and(eq(staffProfiles.userId, performedBy), eq(staffProfiles.facilityId, input.facilityId))
			)

		const [created] = await db
			.insert(nbsLogEntries)
			.values({
				facilityId: input.facilityId,
				encounterId: input.encounterId,
				patientId: input.patientId,
				birthDatetime: new Date(input.birthDatetime),
				screeningDatetime,
				hoursElapsed: calculateHoursElapsed(new Date(input.birthDatetime), screeningDatetime),
				screeningResult: input.specimenType
					? {
							sampleId: input.specimenBarcode ?? undefined,
							testType:
								input.specimenType === "heel_prick" || input.specimenType === "cord_blood"
									? input.specimenType
									: undefined,
						}
					: null,
				consentStatus: "pending",
				referralStatus: "none",
				screenedByStaffId: capturingStaff?.id ?? null,
				status: screeningDatetime ? "screened" : "pending",
				createdAt: now,
				updatedAt: now,
			})
			.returning({
				id: nbsLogEntries.id,
				encounterId: nbsLogEntries.encounterId,
				patientId: nbsLogEntries.patientId,
				facilityId: nbsLogEntries.facilityId,
				birthDatetime: nbsLogEntries.birthDatetime,
				screeningDatetime: nbsLogEntries.screeningDatetime,
				status: nbsLogEntries.status,
				screeningResult: nbsLogEntries.screeningResult,
				consentStatus: nbsLogEntries.consentStatus,
				waiverReason: nbsLogEntries.waiverReason,
				referralStatus: nbsLogEntries.referralStatus,
				referralFacility: nbsLogEntries.referralFacility,
				referralDate: nbsLogEntries.referralDate,
				referralNotes: nbsLogEntries.referralNotes,
				screenedByStaffId: nbsLogEntries.screenedByStaffId,
				createdAt: nbsLogEntries.createdAt,
				updatedAt: nbsLogEntries.updatedAt,
			})

		if (!created) {
			throw new NotFoundException("Failed to create NBS screening")
		}

		return mapLogEntryToScreening(created) as NbsScreening
	}

	async updateScreening(input: UpdateNbsScreening): Promise<NbsScreening> {
		const [existing] = await db.select().from(nbsLogEntries).where(eq(nbsLogEntries.id, input.id))

		if (!existing) {
			throw new NotFoundException(`NBS screening with id ${input.id} not found`)
		}

		const screeningDatetime = input.specimenCollectedAt
			? new Date(input.specimenCollectedAt)
			: existing.screeningDatetime

		const existingScreeningResult = (existing.screeningResult ?? {}) as NbsScreeningResultJson
		const screeningResult: NbsScreeningResultJson = {
			...existingScreeningResult,
			...(input.specimenBarcode ? { sampleId: input.specimenBarcode } : {}),
			...(input.specimenType
				? {
						testType:
							input.specimenType === "heel_prick" || input.specimenType === "cord_blood"
								? input.specimenType
								: undefined,
					}
				: {}),
			conditions: [
				...(existingScreeningResult.conditions ?? []),
				...(input.result_ch
					? [
							{
								condition: "CH",
								result: (input.result_ch === "positive" ? "abnormal" : "normal") as
									| "normal"
									| "abnormal",
							},
						]
					: []),
				...(input.result_cah
					? [
							{
								condition: "CAH",
								result: (input.result_cah === "positive" ? "abnormal" : "normal") as
									| "normal"
									| "abnormal",
							},
						]
					: []),
				...(input.result_g6pd
					? [
							{
								condition: "G6PD",
								result: (input.result_g6pd === "positive" ? "abnormal" : "normal") as
									| "normal"
									| "abnormal",
							},
						]
					: []),
				...(input.result_gal
					? [
							{
								condition: "GAL",
								result: (input.result_gal === "positive" ? "abnormal" : "normal") as
									| "normal"
									| "abnormal",
							},
						]
					: []),
				...(input.result_pku
					? [
							{
								condition: "PKU",
								result: (input.result_pku === "positive" ? "abnormal" : "normal") as
									| "normal"
									| "abnormal",
							},
						]
					: []),
				...(input.result_msud
					? [
							{
								condition: "MSUD",
								result: (input.result_msud === "positive" ? "abnormal" : "normal") as
									| "normal"
									| "abnormal",
							},
						]
					: []),
			],
		}

		const [updated] = await db
			.update(nbsLogEntries)
			.set({
				screeningDatetime,
				hoursElapsed: calculateHoursElapsed(existing.birthDatetime, screeningDatetime),
				screeningResult,
				status: input.status
					? input.status === "collected"
						? "screened"
						: input.status === "sent"
							? "referred"
							: input.status === "resulted"
								? "completed"
								: existing.status
					: existing.status,
				waiverReason: existing.waiverReason,
				referralStatus: existing.referralStatus,
				referralFacility: existing.referralFacility,
				referralDate: existing.referralDate,
				referralNotes: existing.referralNotes,
				updatedAt: new Date(),
			})
			.where(eq(nbsLogEntries.id, input.id))
			.returning({
				id: nbsLogEntries.id,
				encounterId: nbsLogEntries.encounterId,
				patientId: nbsLogEntries.patientId,
				facilityId: nbsLogEntries.facilityId,
				birthDatetime: nbsLogEntries.birthDatetime,
				screeningDatetime: nbsLogEntries.screeningDatetime,
				status: nbsLogEntries.status,
				screeningResult: nbsLogEntries.screeningResult,
				consentStatus: nbsLogEntries.consentStatus,
				waiverReason: nbsLogEntries.waiverReason,
				referralStatus: nbsLogEntries.referralStatus,
				referralFacility: nbsLogEntries.referralFacility,
				referralDate: nbsLogEntries.referralDate,
				referralNotes: nbsLogEntries.referralNotes,
				screenedByStaffId: nbsLogEntries.screenedByStaffId,
				createdAt: nbsLogEntries.createdAt,
				updatedAt: nbsLogEntries.updatedAt,
			})

		if (!updated) {
			throw new NotFoundException(`NBS screening with id ${input.id} not found`)
		}

		return mapLogEntryToScreening(updated) as NbsScreening
	}

	// ========================================================================
	// Consent
	// ========================================================================

	async getConsentByNbsId(nbsId: string): Promise<NbsConsent | null> {
		const [entry] = await db
			.select({
				id: nbsLogEntries.id,
				encounterId: nbsLogEntries.encounterId,
				patientId: nbsLogEntries.patientId,
				consentRecordId: nbsLogEntries.consentRecordId,
				consentStatus: nbsLogEntries.consentStatus,
				waiverReason: nbsLogEntries.waiverReason,
			})
			.from(nbsLogEntries)
			.where(eq(nbsLogEntries.id, nbsId))

		if (!entry?.consentRecordId) return null

		const [record] = await db
			.select({
				id: consentRecords.id,
				signedByName: consentRecords.signedByName,
				relationship: consentRecords.relationship,
				signatureData: consentRecords.signatureData,
				signedAt: consentRecords.signedAt,
				witnessSignature: consentRecords.witnessSignature,
				capturedByStaffId: consentRecords.capturedByStaffId,
				createdAt: consentRecords.createdAt,
			})
			.from(consentRecords)
			.where(eq(consentRecords.id, entry.consentRecordId))

		if (!record || !entry.encounterId) return null

		const signatureData = record.signatureData as { dataUrl?: string } | null
		const consentType: "consent" | "waiver" =
			entry.consentStatus === "waived" || entry.consentStatus === "refused" ? "waiver" : "consent"

		return {
			id: record.id,
			nbsId,
			encounterId: entry.encounterId,
			patientId: entry.patientId,
			consentType,
			parentName: record.signedByName,
			relationship: record.relationship,
			waiverReason: entry.waiverReason,
			signatureDataUrl: signatureData?.dataUrl ?? null,
			signedAt: record.signedAt ?? record.createdAt,
			witnessName: record.witnessSignature,
			performedBy: record.capturedByStaffId ?? entry.patientId,
			performedByName: "System User",
			createdAt: record.createdAt,
		}
	}

	async createConsent(input: CreateNbsConsent, performedBy: string): Promise<NbsConsent> {
		const [entry] = await db
			.select({
				id: nbsLogEntries.id,
				facilityId: nbsLogEntries.facilityId,
				encounterId: nbsLogEntries.encounterId,
				patientId: nbsLogEntries.patientId,
			})
			.from(nbsLogEntries)
			.where(eq(nbsLogEntries.id, input.nbsId))

		if (!entry || !entry.encounterId) {
			throw new NotFoundException(`NBS screening with id ${input.nbsId} not found`)
		}

		const [capturingStaff] = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(
				and(eq(staffProfiles.userId, performedBy), eq(staffProfiles.facilityId, entry.facilityId))
			)

		const normalizedRelationship = input.relationship.trim().toLowerCase()
		const relationship: "self" | "parent" | "guardian" | "spouse" | "other" =
			normalizedRelationship === "self"
				? "self"
				: normalizedRelationship === "mother" ||
					  normalizedRelationship === "father" ||
					  normalizedRelationship === "parent"
					? "parent"
					: normalizedRelationship === "guardian"
						? "guardian"
						: normalizedRelationship === "spouse"
							? "spouse"
							: "other"

		const now = new Date()
		const [created] = await db
			.insert(consentRecords)
			.values({
				facilityId: entry.facilityId,
				encounterId: entry.encounterId,
				patientId: entry.patientId,
				consentType: "nbs",
				signedByName: input.parentName.trim(),
				relationship,
				signatureData: input.signatureDataUrl ? { dataUrl: input.signatureDataUrl } : null,
				signedAt: now,
				witnessSignature: input.witnessName?.trim() || null,
				capturedByStaffId: capturingStaff?.id,
				consentText:
					input.consentType === "waiver"
						? "NBS waiver documented."
						: "NBS parental consent documented.",
				patientSignature: input.signatureDataUrl ?? null,
				createdAt: now,
				updatedAt: now,
			})
			.returning({
				id: consentRecords.id,
				signedByName: consentRecords.signedByName,
				relationship: consentRecords.relationship,
				signatureData: consentRecords.signatureData,
				signedAt: consentRecords.signedAt,
				witnessSignature: consentRecords.witnessSignature,
				capturedByStaffId: consentRecords.capturedByStaffId,
				createdAt: consentRecords.createdAt,
			})

		if (!created) {
			throw new NotFoundException("Failed to create NBS consent")
		}

		await db
			.update(nbsLogEntries)
			.set({
				consentRecordId: created.id,
				consentStatus: input.consentType === "waiver" ? "waived" : "consented",
				waiverReason: input.consentType === "waiver" ? (input.waiverReason ?? null) : null,
				updatedAt: now,
			})
			.where(eq(nbsLogEntries.id, input.nbsId))

		const signatureData = created.signatureData as { dataUrl?: string } | null
		return {
			id: created.id,
			nbsId: input.nbsId,
			encounterId: entry.encounterId,
			patientId: entry.patientId,
			consentType: input.consentType,
			parentName: created.signedByName,
			relationship: created.relationship,
			waiverReason: input.consentType === "waiver" ? (input.waiverReason ?? null) : null,
			signatureDataUrl: signatureData?.dataUrl ?? null,
			signedAt: created.signedAt ?? now,
			witnessName: created.witnessSignature,
			performedBy: created.capturedByStaffId ?? entry.patientId,
			performedByName: "System User",
			createdAt: created.createdAt,
		}
	}

	// ========================================================================
	// Referrals
	// ========================================================================

	async getReferralsByNbsId(nbsId: string): Promise<NbsReferral[]> {
		const [entry] = await db
			.select({
				id: nbsLogEntries.id,
				encounterId: nbsLogEntries.encounterId,
				patientId: nbsLogEntries.patientId,
				referralNotes: nbsLogEntries.referralNotes,
			})
			.from(nbsLogEntries)
			.where(eq(nbsLogEntries.id, nbsId))

		if (!entry?.referralNotes) return []

		return parseReferralHistory(entry.referralNotes).map(referral => ({
			id: referral.id,
			referralDatetime: new Date(referral.referralDatetime),
			acceptedAt: referral.acceptedAt ? new Date(referral.acceptedAt) : null,
			completedAt: referral.completedAt ? new Date(referral.completedAt) : null,
			referredCondition: referral.referredCondition,
			referralFacility: referral.referralFacility,
			referralStatus: referral.referralStatus,
			referralNotes: referral.referralNotes ?? null,
			performedBy: isUuid(referral.performedBy) ? referral.performedBy : entry.patientId,
			performedByName: referral.performedByName ?? "System User",
			createdAt: new Date(referral.createdAt),
			updatedAt: new Date(referral.updatedAt),
			nbsId,
			encounterId: entry.encounterId ?? entry.id,
			patientId: entry.patientId,
		}))
	}

	async createReferral(input: CreateNbsReferral, performedBy: string): Promise<NbsReferral> {
		const [entry] = await db
			.select({
				id: nbsLogEntries.id,
				facilityId: nbsLogEntries.facilityId,
				encounterId: nbsLogEntries.encounterId,
				patientId: nbsLogEntries.patientId,
				referralNotes: nbsLogEntries.referralNotes,
			})
			.from(nbsLogEntries)
			.where(eq(nbsLogEntries.id, input.nbsId))

		if (!entry) {
			throw new NotFoundException(`NBS screening with id ${input.nbsId} not found`)
		}

		const now = new Date()
		const existingReferrals = parseReferralHistory(entry.referralNotes)
		const referralDatetime = parseReferralDatetime(input.referralDatetime)
		const [capturingStaff] = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(
				and(eq(staffProfiles.userId, performedBy), eq(staffProfiles.facilityId, entry.facilityId))
			)
		const actorId = capturingStaff?.id ?? entry.patientId

		const createdReferral: NbsReferralJson = {
			id: crypto.randomUUID(),
			referredCondition: input.referredCondition,
			referralFacility: input.referralFacility,
			referralDatetime: referralDatetime.toISOString(),
			referralStatus: "pending",
			acceptedAt: null,
			completedAt: null,
			referralNotes: input.referralNotes ?? null,
			performedBy: actorId,
			performedByName: "System User",
			createdAt: now.toISOString(),
			updatedAt: now.toISOString(),
		}

		await db
			.update(nbsLogEntries)
			.set({
				referralStatus: "referred",
				referralFacility: input.referralFacility,
				referralDate: createdReferral.referralDatetime.slice(0, 10),
				referralNotes: JSON.stringify({
					referrals: [...existingReferrals, createdReferral],
				}),
				status: "referred",
				updatedAt: now,
			})
			.where(eq(nbsLogEntries.id, input.nbsId))

		return {
			id: createdReferral.id,
			nbsId: input.nbsId,
			encounterId: entry.encounterId ?? input.encounterId,
			patientId: entry.patientId,
			referredCondition: createdReferral.referredCondition,
			referralFacility: createdReferral.referralFacility,
			referralDatetime: new Date(createdReferral.referralDatetime),
			referralStatus: createdReferral.referralStatus,
			acceptedAt: null,
			completedAt: null,
			referralNotes: createdReferral.referralNotes ?? null,
			performedBy: createdReferral.performedBy,
			performedByName: createdReferral.performedByName,
			createdAt: new Date(createdReferral.createdAt),
			updatedAt: new Date(createdReferral.updatedAt),
		}
	}

	async updateReferral(input: UpdateNbsReferral): Promise<NbsReferral> {
		const rows = await db
			.select({
				id: nbsLogEntries.id,
				encounterId: nbsLogEntries.encounterId,
				patientId: nbsLogEntries.patientId,
				referralNotes: nbsLogEntries.referralNotes,
			})
			.from(nbsLogEntries)
			.where(isNotNull(nbsLogEntries.referralNotes))

		let matchedEntry:
			| {
					id: string
					encounterId: string | null
					patientId: string
					referralNotes: string | null
			  }
			| undefined
		let matchedReferral: NbsReferralJson | undefined

		for (const row of rows) {
			if (!row.referralNotes) continue
			const referrals = parseReferralHistory(row.referralNotes)
			const found = referrals.find(referral => referral.id === input.id)
			if (found) {
				matchedEntry = row
				matchedReferral = found
				break
			}
		}

		if (!matchedEntry || !matchedReferral) {
			throw new NotFoundException(`NBS referral with id ${input.id} not found`)
		}

		const now = new Date()
		const updatedReferrals = parseReferralHistory(matchedEntry.referralNotes).map(referral =>
			referral.id === input.id
				? {
						...referral,
						referralStatus: input.referralStatus ?? referral.referralStatus,
						acceptedAt: input.acceptedAt ?? referral.acceptedAt ?? null,
						completedAt: input.completedAt ?? referral.completedAt ?? null,
						referralNotes: input.referralNotes ?? referral.referralNotes ?? null,
						updatedAt: now.toISOString(),
					}
				: referral
		)
		const updatedReferral = updatedReferrals.find(referral => referral.id === input.id)!

		await db
			.update(nbsLogEntries)
			.set({
				referralStatus: updatedReferral.referralStatus === "completed" ? "completed" : "referred",
				referralFacility: updatedReferral.referralFacility,
				referralDate: updatedReferral.referralDatetime.slice(0, 10),
				referralNotes: JSON.stringify({ referrals: updatedReferrals }),
				status: updatedReferral.referralStatus === "completed" ? "completed" : "referred",
				updatedAt: now,
			})
			.where(eq(nbsLogEntries.id, matchedEntry.id))

		return {
			id: updatedReferral.id,
			nbsId: matchedEntry.id,
			encounterId: matchedEntry.encounterId ?? matchedEntry.id,
			patientId: matchedEntry.patientId,
			referredCondition: updatedReferral.referredCondition,
			referralFacility: updatedReferral.referralFacility,
			referralDatetime: new Date(updatedReferral.referralDatetime),
			referralStatus: updatedReferral.referralStatus,
			acceptedAt: updatedReferral.acceptedAt ? new Date(updatedReferral.acceptedAt) : null,
			completedAt: updatedReferral.completedAt ? new Date(updatedReferral.completedAt) : null,
			referralNotes: updatedReferral.referralNotes ?? null,
			performedBy: updatedReferral.performedBy,
			performedByName: updatedReferral.performedByName,
			createdAt: new Date(updatedReferral.createdAt),
			updatedAt: new Date(updatedReferral.updatedAt),
		}
	}

	// ========================================================================
	// Logbook
	// ========================================================================

	async getLogbook(query: NbsLogbookQuery): Promise<NbsLogbookResponse> {
		const page = query.page ?? 1
		const limit = query.limit ?? 25
		const offset = (page - 1) * limit
		const facilityId = query.facilityId

		if (!facilityId) {
			return {
				data: [],
				total: 0,
				page,
				limit,
				totalPages: 0,
			}
		}

		const whereClause = and(
			eq(nbsLogEntries.facilityId, facilityId),
			isNotNull(nbsLogEntries.encounterId)
		)

		const countRows = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(nbsLogEntries)
			.where(whereClause)

		const total = countRows[0]?.count ?? 0

		const rows = await db
			.select({
				id: nbsLogEntries.id,
				encounterId: nbsLogEntries.encounterId,
				patientId: nbsLogEntries.patientId,
				facilityId: nbsLogEntries.facilityId,
				birthDatetime: nbsLogEntries.birthDatetime,
				screeningDatetime: nbsLogEntries.screeningDatetime,
				status: nbsLogEntries.status,
				screeningResult: nbsLogEntries.screeningResult,
				createdAt: nbsLogEntries.createdAt,
				firstName: patients.firstName,
				middleName: patients.middleName,
				lastName: patients.lastName,
				mrn: patients.mrn,
			})
			.from(nbsLogEntries)
			.innerJoin(patients, eq(nbsLogEntries.patientId, patients.id))
			.where(whereClause)
			.orderBy(desc(nbsLogEntries.createdAt))
			.limit(limit)
			.offset(offset)

		const data: NbsLogbookResponse["data"] = rows.map(row => {
			const statusMap: Record<string, NbsLogbookResponse["data"][number]["status"]> = {
				pending: "pending",
				screened: "collected",
				referred: "sent",
				completed: "resulted",
			}

			const conditions =
				(row.screeningResult?.conditions as Array<{
					condition: string
					result: "normal" | "abnormal" | "inconclusive"
					value?: string
				}>) ?? []
			const hasAbnormal = conditions.some(c => c.result === "abnormal")
			const hasBorderline = conditions.some(c => c.result === "inconclusive")
			const resultOverall = hasAbnormal
				? "abnormal"
				: hasBorderline
					? "borderline"
					: conditions.length > 0
						? "normal"
						: null

			const middle = row.middleName ? ` ${row.middleName}` : ""
			return {
				id: row.id,
				encounterId: row.encounterId!,
				patientId: row.patientId,
				patientName: `${row.firstName}${middle} ${row.lastName}`.trim(),
				patientMrn: row.mrn,
				birthDatetime: row.birthDatetime,
				specimenCollectedAt: row.screeningDatetime,
				status: statusMap[row.status] ?? "pending",
				result_overall: resultOverall,
				facilityId: row.facilityId,
				createdAt: row.createdAt,
			}
		})

		return {
			data,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}
}
