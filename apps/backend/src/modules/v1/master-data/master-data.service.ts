import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { and, count, eq, ilike, or } from "drizzle-orm"

import { masterDataCatalogs, masterDataItems } from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import { AuditService } from "@/modules/v1/audit/audit.service"

type CatalogRow = typeof masterDataCatalogs.$inferSelect
type RawItemRow = typeof masterDataItems.$inferSelect

// The DB schema infers jsonb as unknown; coerce to the contract-expected type
type ItemRow = Omit<RawItemRow, "attributes"> & {
	attributes: Record<string, unknown> | null
}

function coerceItem(row: RawItemRow): ItemRow {
	return {
		...row,
		attributes: (row.attributes as Record<string, unknown> | null) ?? null,
	}
}

type ListItemsOpts = {
	page: number
	limit: number
	search?: string
	includeDeprecated: boolean
}

type UpsertItemInput = {
	id?: string
	catalogId: string
	code: string
	name: string
	description?: string | null
	attributes?: Record<string, unknown> | null
	isActive?: boolean
}

type ImportResult = {
	imported: number
	errors: Array<{ row: number; message: string }>
}

@Injectable()
export class MasterDataService {
	constructor(private readonly auditService: AuditService) {}

	async listCatalogs(facilityId: string): Promise<Array<CatalogRow & { itemCount: number }>> {
		const catalogs = await db
			.select()
			.from(masterDataCatalogs)
			.where(eq(masterDataCatalogs.facilityId, facilityId))

		const results = await Promise.all(
			catalogs.map(async catalog => {
				const [countRow] = await db
					.select({ total: count() })
					.from(masterDataItems)
					.where(
						and(
							eq(masterDataItems.catalogId, catalog.id),
							eq(masterDataItems.isActive, true),
							eq(masterDataItems.isDeprecated, false)
						)
					)
				return { ...catalog, itemCount: countRow?.total ?? 0 }
			})
		)

		return results
	}

	async listItems(catalogId: string, opts: ListItemsOpts) {
		const { page, limit, search, includeDeprecated } = opts
		const offset = (page - 1) * limit

		const conditions = [eq(masterDataItems.catalogId, catalogId)]

		if (!includeDeprecated) {
			conditions.push(eq(masterDataItems.isDeprecated, false))
		}

		const whereBase = and(...conditions)
		const where = search
			? and(whereBase, or(ilike(masterDataItems.code, `%${search}%`), ilike(masterDataItems.name, `%${search}%`)))
			: whereBase

		const [rows, [countRow]] = await Promise.all([
			db
				.select()
				.from(masterDataItems)
				.where(where)
				.limit(limit)
				.offset(offset),
			db.select({ total: count() }).from(masterDataItems).where(where),
		])

		return {
			data: rows.map(coerceItem),
			total: countRow?.total ?? 0,
			page,
			limit,
		}
	}

	async getItem(id: string): Promise<ItemRow> {
		const [row] = await db
			.select()
			.from(masterDataItems)
			.where(eq(masterDataItems.id, id))

		if (!row) throw new NotFoundException(`Master data item ${id} not found`)
		return coerceItem(row)
	}

	async upsertItem(input: UpsertItemInput, actorId: string): Promise<ItemRow> {
		if (input.id) {
			const [existing] = await db
				.select()
				.from(masterDataItems)
				.where(and(eq(masterDataItems.id, input.id), eq(masterDataItems.catalogId, input.catalogId)))

			if (!existing) throw new NotFoundException(`Master data item ${input.id} not found`)

			const [updated] = await db
				.update(masterDataItems)
				.set({
					code: input.code,
					name: input.name,
					description: input.description !== undefined ? input.description : existing.description,
					attributes: input.attributes !== undefined ? input.attributes : existing.attributes,
					isActive: input.isActive !== undefined ? input.isActive : existing.isActive,
					updatedAt: new Date(),
				})
				.where(eq(masterDataItems.id, input.id))
				.returning()

			await this.auditService.log({
				facilityId: "",
				userId: actorId,
				staffProfileId: null,
				action: "update",
				entityType: "master_data_item",
				entityId: updated!.id,
				beforeState: { code: existing.code, name: existing.name },
				afterState: { code: updated!.code, name: updated!.name },
				ipAddress: null,
				userAgent: null,
				metadata: null,
			})

			return coerceItem(updated!)
		}

		const [created] = await db
			.insert(masterDataItems)
			.values({
				catalogId: input.catalogId,
				code: input.code,
				name: input.name,
				description: input.description ?? null,
				attributes: input.attributes ?? {},
				isActive: input.isActive ?? true,
				isDeprecated: false,
			})
			.returning()

		await this.auditService.log({
			facilityId: "",
			userId: actorId,
			staffProfileId: null,
			action: "create",
			entityType: "master_data_item",
			entityId: created!.id,
			beforeState: null,
			afterState: { code: created!.code, name: created!.name },
			ipAddress: null,
			userAgent: null,
			metadata: null,
		})

		return coerceItem(created!)
	}

	async deprecateItem(input: { id: string; replacedByItemId: string }, actorId: string): Promise<ItemRow> {
		const item = await this.getItem(input.id)

		if (item.isDeprecated) {
			throw new BadRequestException(`Item ${input.id} is already deprecated`)
		}

		const replacement = await this.getItem(input.replacedByItemId)

		if (replacement.isDeprecated) {
			throw new BadRequestException(`Replacement item ${input.replacedByItemId} is itself deprecated`)
		}

		const [updated] = await db
			.update(masterDataItems)
			.set({
				isDeprecated: true,
				replacedByItemId: input.replacedByItemId,
				updatedAt: new Date(),
			})
			.where(eq(masterDataItems.id, input.id))
			.returning()

		await this.auditService.log({
			facilityId: "",
			userId: actorId,
			staffProfileId: null,
			action: "update",
			entityType: "master_data_item",
			entityId: updated!.id,
			beforeState: { isDeprecated: false },
			afterState: { isDeprecated: true, replacedByItemId: input.replacedByItemId },
			ipAddress: null,
			userAgent: null,
			metadata: { operation: "item_deprecated" },
		})

		return coerceItem(updated!)
	}

	async importItems(catalogId: string, csv: string, actorId: string): Promise<ImportResult> {
		const [catalog] = await db
			.select()
			.from(masterDataCatalogs)
			.where(eq(masterDataCatalogs.id, catalogId))

		if (!catalog) throw new NotFoundException(`Catalog ${catalogId} not found`)

		const lines = csv
			.split("\n")
			.map(l => l.trim())
			.filter(l => l.length > 0)

		const errors: Array<{ row: number; message: string }> = []
		const valuesToInsert: Array<typeof masterDataItems.$inferInsert> = []

		for (let i = 0; i < lines.length; i++) {
			const rowNum = i + 1
			const line = lines[i]!
			const parts = line.split(",")

			const code = parts[0]?.trim()
			const name = parts[1]?.trim()

			if (!code) {
				errors.push({ row: rowNum, message: "Missing code value" })
				continue
			}

			if (!name) {
				errors.push({ row: rowNum, message: "Missing name value" })
				continue
			}

			const description = parts[2]?.trim() ?? null

			valuesToInsert.push({
				catalogId,
				code,
				name,
				description: description || null,
				attributes: {},
				isDeprecated: false,
				isActive: true,
			})
		}

		if (errors.length > 0) {
			return { imported: 0, errors }
		}

		// All rows valid — insert in one transaction, no partial commits
		await db.transaction(async tx => {
			if (valuesToInsert.length > 0) {
				await tx.insert(masterDataItems).values(valuesToInsert)
			}
		})

		await this.auditService.log({
			facilityId: catalog.facilityId,
			userId: actorId,
			staffProfileId: null,
			action: "create",
			entityType: "master_data_item",
			entityId: catalogId,
			beforeState: null,
			afterState: { imported: valuesToInsert.length },
			ipAddress: null,
			userAgent: null,
			metadata: { operation: "bulk_import", count: valuesToInsert.length },
		})

		return { imported: valuesToInsert.length, errors: [] }
	}
}
