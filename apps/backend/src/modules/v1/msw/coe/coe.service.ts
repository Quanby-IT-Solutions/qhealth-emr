import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { eq } from "drizzle-orm"

import { coeCertificates, mswEvaluations, staffProfiles } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

type CoeRow = typeof coeCertificates.$inferSelect

@Injectable()
export class CoeService {
	async issue(input: {
		evaluationId: string
		type: "malasakit" | "z_benefits" | "indigent"
		amountApproved?: number
		signatureData?: string
		witnessName?: string
		staffId: string
	}) {
		const staffResult = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(eq(staffProfiles.userId, input.staffId))
			.limit(1)
		const staffProfileId = staffResult[0]?.id
		if (!staffProfileId) throw new NotFoundException("Staff profile not found")

		const [evaluation] = await db
			.select({ id: mswEvaluations.id, coeIssued: mswEvaluations.coeIssued })
			.from(mswEvaluations)
			.where(eq(mswEvaluations.id, input.evaluationId))
			.limit(1)
		if (!evaluation) throw new NotFoundException("Evaluation not found")
		if (evaluation.coeIssued)
			throw new BadRequestException("CoE already issued for this evaluation")

		const coeProgram: "malasakit" | "philhealth_zbenefit" | "other" =
			input.type === "z_benefits"
				? "philhealth_zbenefit"
				: input.type === "malasakit"
					? "malasakit"
					: "other"

		return await db.transaction(async tx => {
			await tx
				.update(mswEvaluations)
				.set({ coeIssued: true, coeProgram, approvedAt: new Date() })
				.where(eq(mswEvaluations.id, input.evaluationId))

			const certResult = await tx
				.insert(coeCertificates)
				.values({
					evaluationId: input.evaluationId,
					type: input.type,
					amountApproved:
						input.amountApproved !== undefined ? String(input.amountApproved) : undefined,
					issuedByStaffId: staffProfileId,
					signedAt: new Date(),
				})
				.returning()
			const cert = certResult[0]
			if (!cert) throw new NotFoundException("CoE certificate creation failed")

			return this.formatCert(cert)
		})
	}

	async revoke(input: { certificateId: string; reason: string }) {
		const [cert] = await db
			.select()
			.from(coeCertificates)
			.where(eq(coeCertificates.id, input.certificateId))
			.limit(1)
		if (!cert) throw new NotFoundException("Certificate not found")
		if (cert.voidedAt) throw new BadRequestException("Certificate already revoked")

		return await db.transaction(async tx => {
			await tx
				.update(mswEvaluations)
				.set({ coeIssued: false, approvedAt: null })
				.where(eq(mswEvaluations.id, cert.evaluationId))

			const updateResult = await tx
				.update(coeCertificates)
				.set({ voidedAt: new Date(), voidReason: input.reason })
				.where(eq(coeCertificates.id, input.certificateId))
				.returning()
			const updated = updateResult[0]
			if (!updated) throw new NotFoundException("Certificate update failed")

			return this.formatCert(updated)
		})
	}

	async list(input: { evaluationId?: string; encounterId?: string; patientId?: string }) {
		if (!input.evaluationId && !input.encounterId && !input.patientId) {
			return []
		}

		const rows = await db
			.select()
			.from(coeCertificates)
			.where(input.evaluationId ? eq(coeCertificates.evaluationId, input.evaluationId) : undefined)

		return rows.map((r: CoeRow) => this.formatCert(r))
	}

	async get(id: string) {
		const [cert] = await db
			.select()
			.from(coeCertificates)
			.where(eq(coeCertificates.id, id))
			.limit(1)
		if (!cert) throw new NotFoundException("Certificate not found")
		return this.formatCert(cert)
	}

	private formatCert(cert: CoeRow) {
		return {
			id: cert.id,
			evaluationId: cert.evaluationId,
			type: cert.type,
			amountApproved: cert.amountApproved ? Number(cert.amountApproved) : null,
			issuedByStaffId: cert.issuedByStaffId,
			pdfUri: cert.pdfUri,
			signedAt: cert.signedAt,
			voidedAt: cert.voidedAt,
			voidReason: cert.voidReason,
			createdAt: cert.createdAt,
		}
	}
}
