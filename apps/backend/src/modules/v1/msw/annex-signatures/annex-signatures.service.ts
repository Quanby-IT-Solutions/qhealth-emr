import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { createHash } from "crypto"
import { and, eq } from "drizzle-orm"

import { annexSignatures } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

@Injectable()
export class AnnexSignaturesService {
	private readonly db = db

	async capture(input: {
		encounterId: string
		annexType: "A" | "B"
		patientSignaturePngBase64: string
		witnessSignaturePngBase64?: string
		replace?: boolean
		replaceReason?: string
	}) {
		const existing = await this.db
			.select({ id: annexSignatures.id, replacedById: annexSignatures.replacedById })
			.from(annexSignatures)
			.where(
				and(
					eq(annexSignatures.encounterId, input.encounterId),
					eq(annexSignatures.annexType, input.annexType)
				)
			)
			.limit(1)

		const active = existing.find(r => !r.replacedById)

		if (active) {
			if (!input.replace) {
				throw new BadRequestException(
					`Annex ${input.annexType} already captured for this encounter. Pass replace=true with a reason to replace.`
				)
			}
			if (!input.replaceReason?.trim()) {
				throw new BadRequestException(
					"replaceReason is required when replacing an existing signature."
				)
			}

			await this.db
				.update(annexSignatures)
				.set({ replacedById: "pending" })
				.where(eq(annexSignatures.id, active.id))
		}

		const contentHash = createHash("sha256").update(input.patientSignaturePngBase64).digest("hex")

		const rows = await this.db
			.insert(annexSignatures)
			.values({
				encounterId: input.encounterId,
				annexType: input.annexType,
				patientSignatureUri: input.patientSignaturePngBase64,
				witnessSignatureUri: input.witnessSignaturePngBase64 ?? null,
				contentHash,
				replaceReason: input.replaceReason ?? null,
			})
			.returning()

		const created = rows[0]
		if (!created) throw new BadRequestException("Failed to insert annex signature.")

		if (active) {
			await this.db
				.update(annexSignatures)
				.set({ replacedById: created.id })
				.where(eq(annexSignatures.id, active.id))
		}

		return this.formatRow(created)
	}

	async list(input: { encounterId?: string; patientId?: string; annexType?: "A" | "B" }) {
		const conditions = []
		if (input.encounterId) conditions.push(eq(annexSignatures.encounterId, input.encounterId))
		if (input.annexType) conditions.push(eq(annexSignatures.annexType, input.annexType))

		const rows = await this.db
			.select()
			.from(annexSignatures)
			.where(conditions.length ? and(...conditions) : undefined)

		return rows.map(r => this.formatRow(r))
	}

	async get(id: string) {
		const [row] = await this.db
			.select()
			.from(annexSignatures)
			.where(eq(annexSignatures.id, id))
			.limit(1)
		if (!row) throw new NotFoundException("Annex signature not found")
		return this.formatRow(row)
	}

	private formatRow(row: typeof annexSignatures.$inferSelect) {
		return {
			id: row.id,
			encounterId: row.encounterId,
			annexType: row.annexType,
			patientSignatureUri: row.patientSignatureUri,
			witnessSignatureUri: row.witnessSignatureUri,
			pdfUri: row.pdfUri,
			contentHash: row.contentHash,
			replacedById: row.replacedById,
			replaceReason: row.replaceReason,
			signedAt: row.signedAt,
			createdAt: row.createdAt,
		}
	}
}
