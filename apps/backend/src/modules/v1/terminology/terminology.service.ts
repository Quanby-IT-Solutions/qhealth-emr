import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { and, count, eq, ilike, or } from "drizzle-orm"

import { codeSystems, codeSetVersions, codes } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

type CodeRow = typeof codes.$inferSelect
type CodeSystemRow = typeof codeSystems.$inferSelect
type CodeSetVersionRow = typeof codeSetVersions.$inferSelect

type SearchCodesInput = {
	codeSystemId: string
	query: string
	includeDeprecated: boolean
	page: number
	limit: number
}

type ImportCodesInput = {
	codeSystemId: string
	versionId: string
	csv: string
}

type ImportResult = {
	imported: number
	errors: Array<{ row: number; message: string }>
}

type CodeSystemWithStats = CodeSystemRow & {
	totalCodes: number
	deprecatedCount: number
	activeVersionId: string | null
	activeVersion: string | null
}

@Injectable()
export class TerminologyService {
	async listSystems(): Promise<CodeSystemWithStats[]> {
		const rows = await db.select().from(codeSystems)

		const results: CodeSystemWithStats[] = []

		for (const system of rows) {
			const [totalRow] = await db
				.select({ total: count() })
				.from(codes)
				.where(eq(codes.codeSystemId, system.id))

			const [deprecatedRow] = await db
				.select({ total: count() })
				.from(codes)
				.where(and(eq(codes.codeSystemId, system.id), eq(codes.isDeprecated, true)))

			let activeVersionId: string | null = null
			let activeVersion: string | null = null

			if (system.currentVersionId) {
				const [versionRow] = await db
					.select({ id: codeSetVersions.id, version: codeSetVersions.version })
					.from(codeSetVersions)
					.where(eq(codeSetVersions.id, system.currentVersionId))

				activeVersionId = versionRow?.id ?? null
				activeVersion = versionRow?.version ?? null
			}

			results.push({
				...system,
				totalCodes: totalRow?.total ?? 0,
				deprecatedCount: deprecatedRow?.total ?? 0,
				activeVersionId,
				activeVersion,
			})
		}

		return results
	}

	async searchCodes(input: SearchCodesInput) {
		const { codeSystemId, query, includeDeprecated, page, limit } = input
		const offset = (page - 1) * limit

		const conditions = [
			eq(codes.codeSystemId, codeSystemId),
			or(
				ilike(codes.code, `%${query}%`),
				ilike(codes.displayName, `%${query}%`)
			),
		]

		if (!includeDeprecated) {
			conditions.push(eq(codes.isDeprecated, false))
		}

		const where = and(...conditions)

		const [rows, [countRow]] = await Promise.all([
			db
				.select()
				.from(codes)
				.where(where)
				.limit(limit)
				.offset(offset),
			db.select({ total: count() }).from(codes).where(where),
		])

		return {
			data: rows,
			total: countRow?.total ?? 0,
			page,
			limit,
		}
	}

	async getCode(id: string): Promise<CodeRow> {
		const [row] = await db.select().from(codes).where(eq(codes.id, id))
		if (!row) throw new NotFoundException(`Code ${id} not found`)
		return row
	}

	async deprecate(input: { id: string; replacedByCodeId: string }): Promise<CodeRow> {
		const code = await this.getCode(input.id)

		if (code.isDeprecated) {
			throw new BadRequestException(`Code ${input.id} is already deprecated`)
		}

		const replacement = await this.getCode(input.replacedByCodeId)

		if (replacement.isDeprecated) {
			throw new BadRequestException(`Replacement code ${input.replacedByCodeId} is itself deprecated`)
		}

		const [updated] = await db
			.update(codes)
			.set({ isDeprecated: true, replacedByCodeId: input.replacedByCodeId })
			.where(eq(codes.id, input.id))
			.returning()

		return updated!
	}

	async diffVersions(input: { codeSystemId: string; fromVersionId: string; toVersionId: string }) {
		const [fromCodes, toCodes] = await Promise.all([
			db.select().from(codes).where(and(eq(codes.codeSystemId, input.codeSystemId), eq(codes.versionId, input.fromVersionId))),
			db.select().from(codes).where(and(eq(codes.codeSystemId, input.codeSystemId), eq(codes.versionId, input.toVersionId))),
		])

		const fromMap = new Map(fromCodes.map(c => [c.code, c]))
		const toMap = new Map(toCodes.map(c => [c.code, c]))

		let added = 0
		let removed = 0
		let displayChanged = 0
		let deprecationAdded = 0

		for (const [code, toRow] of toMap) {
			const fromRow = fromMap.get(code)
			if (!fromRow) {
				added++
			} else {
				if (fromRow.displayName !== toRow.displayName) displayChanged++
				if (!fromRow.isDeprecated && toRow.isDeprecated) deprecationAdded++
			}
		}

		for (const code of fromMap.keys()) {
			if (!toMap.has(code)) removed++
		}

		return { added, removed, displayChanged, deprecationAdded }
	}

	async import(input: ImportCodesInput): Promise<ImportResult> {
		// Verify code system and version exist
		const [system] = await db
			.select()
			.from(codeSystems)
			.where(eq(codeSystems.id, input.codeSystemId))

		if (!system) throw new NotFoundException(`Code system ${input.codeSystemId} not found`)

		const [version] = await db
			.select()
			.from(codeSetVersions)
			.where(
				and(
					eq(codeSetVersions.id, input.versionId),
					eq(codeSetVersions.codeSystemId, input.codeSystemId)
				)
			)

		if (!version) throw new NotFoundException(`Version ${input.versionId} not found for this code system`)

		const lines = input.csv
			.split("\n")
			.map(l => l.trim())
			.filter(l => l.length > 0)

		const errors: Array<{ row: number; message: string }> = []
		const valuesToInsert: Array<typeof codes.$inferInsert> = []

		for (let i = 0; i < lines.length; i++) {
			const rowNum = i + 1
			const line = lines[i]!
			const parts = line.split(",")

			const code = parts[0]?.trim()
			const displayName = parts[1]?.trim()

			if (!code) {
				errors.push({ row: rowNum, message: "Missing code value" })
				continue
			}

			if (!displayName) {
				errors.push({ row: rowNum, message: "Missing display name" })
				continue
			}

			const description = parts[2]?.trim() ?? null

			valuesToInsert.push({
				codeSystemId: input.codeSystemId,
				versionId: input.versionId,
				code,
				displayName,
				description: description || null,
				isDeprecated: false,
			})
		}

		if (errors.length > 0) {
			return { imported: 0, errors }
		}

		// All valid — insert in one transaction, no partial commits
		await db.transaction(async tx => {
			if (valuesToInsert.length > 0) {
				await tx
					.insert(codes)
					.values(valuesToInsert)
					.onConflictDoNothing({
						target: [codes.codeSystemId, codes.versionId, codes.code],
					})
			}
		})

		return { imported: valuesToInsert.length, errors: [] }
	}
}
