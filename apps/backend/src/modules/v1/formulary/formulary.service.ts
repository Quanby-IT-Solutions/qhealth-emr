import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import { and, count, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm"

import {
	drugBrands,
	drugGenerics,
	formularyItems,
	icd10Codes,
	loincCodes,
	rvsCodes,
	rxnormCodes,
	snomedCtCodes,
} from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import type { V1Inputs } from "@/config/contract-types"

type DrugGenericSearchInput = V1Inputs["formulary"]["drugGeneric"]["list"]
type CreateDrugGenericInput = V1Inputs["formulary"]["drugGeneric"]["create"]
type UpdateDrugGenericInput = V1Inputs["formulary"]["drugGeneric"]["update"]

type DrugBrandSearchInput = V1Inputs["formulary"]["drugBrand"]["list"]
type CreateDrugBrandInput = V1Inputs["formulary"]["drugBrand"]["create"]
type UpdateDrugBrandInput = V1Inputs["formulary"]["drugBrand"]["update"]

type FormularyItemFilterInput = V1Inputs["formulary"]["item"]["list"]
type CreateFormularyItemInput = V1Inputs["formulary"]["item"]["create"]
type UpdateFormularyItemInput = V1Inputs["formulary"]["item"]["update"]

type Icd10SearchInput = V1Inputs["formulary"]["icd10"]["search"]
type LoincSearchInput = V1Inputs["formulary"]["loinc"]["search"]
type RxnormSearchInput = V1Inputs["formulary"]["rxnorm"]["search"]
type RvsSearchInput = V1Inputs["formulary"]["rvs"]["search"]
type SnomedCtSearchInput = V1Inputs["formulary"]["snomedCt"]["search"]

@Injectable()
export class FormularyService {
	private readonly logger = new Logger(FormularyService.name)

	// ========================================================================
	// Utilities
	// ========================================================================

	private escapeLikePattern(input: string): string {
		return input.replace(/[\\%_]/g, "\\$&")
	}

	// ========================================================================
	// Drug Generics
	// ========================================================================


	async findDrugGenerics(filter: DrugGenericSearchInput) {
		const page = Number(filter.page) || 1
		const limit = Number(filter.limit) || 50
		const offset = (page - 1) * limit

		const conditions = []

		if (filter.search) {
			const escaped = this.escapeLikePattern(filter.search)
			conditions.push(
				or(
					ilike(drugGenerics.genericName, `%${escaped}%`),
					ilike(drugGenerics.rxnormCode, `%${escaped}%`),
					ilike(drugGenerics.atcCode, `%${escaped}%`)
				)
			)
		}

		if (filter.isActive !== undefined) {
			conditions.push(eq(drugGenerics.isActive, Boolean(filter.isActive)))
		}

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined

		const [data, totalResult] = await Promise.all([
			db
				.select()
				.from(drugGenerics)
				.where(whereClause)
				.orderBy(drugGenerics.genericName)
				.limit(limit)
				.offset(offset),
			db.select({ count: count() }).from(drugGenerics).where(whereClause),
		])

		const total = totalResult[0]?.count ?? 0

		return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
	}

	async createDrugGeneric(input: CreateDrugGenericInput) {
		const [created] = await db
			.insert(drugGenerics)
			.values({
				genericName: input.genericName,
				rxnormCode: input.rxnormCode ?? null,
				atcCode: input.atcCode ?? null,
			})
			.returning()

		this.logger.log(`Created drug generic: ${created!.genericName}`)
		return created!
	}

	async updateDrugGeneric(input: UpdateDrugGenericInput) {
		const { id, ...updates } = input

		const [updated] = await db
			.update(drugGenerics)
			.set(updates)
			.where(eq(drugGenerics.id, id))
			.returning()

		if (!updated) {
			throw new NotFoundException(`Drug generic ${id} not found`)
		}

		return updated
	}

	// ========================================================================
	// Drug Brands
	// ========================================================================

	async findDrugBrands(filter: DrugBrandSearchInput) {
		const page = Number(filter.page) || 1
		const limit = Number(filter.limit) || 50
		const offset = (page - 1) * limit

		const conditions = []

		if (filter.search) {
			const escaped = this.escapeLikePattern(filter.search)
			conditions.push(
				or(
					ilike(drugBrands.brandName, `%${escaped}%`),
					ilike(drugBrands.manufacturer, `%${escaped}%`)
				)
			)
		}

		if (filter.drugGenericId) {
			conditions.push(eq(drugBrands.drugGenericId, filter.drugGenericId))
		}

		if (filter.isActive !== undefined) {
			conditions.push(eq(drugBrands.isActive, Boolean(filter.isActive)))
		}

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined

		const [data, totalResult] = await Promise.all([
			db
				.select()
				.from(drugBrands)
				.where(whereClause)
				.orderBy(drugBrands.brandName)
				.limit(limit)
				.offset(offset),
			db.select({ count: count() }).from(drugBrands).where(whereClause),
		])

		const total = totalResult[0]?.count ?? 0

		return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
	}

	async createDrugBrand(input: CreateDrugBrandInput) {
		const [created] = await db
			.insert(drugBrands)
			.values({
				drugGenericId: input.drugGenericId,
				brandName: input.brandName,
				manufacturer: input.manufacturer ?? null,
			})
			.returning()

		this.logger.log(`Created drug brand: ${created!.brandName}`)
		return created!
	}

	async updateDrugBrand(input: UpdateDrugBrandInput) {
		const { id, ...updates } = input

		const [updated] = await db
			.update(drugBrands)
			.set(updates)
			.where(eq(drugBrands.id, id))
			.returning()

		if (!updated) {
			throw new NotFoundException(`Drug brand ${id} not found`)
		}

		return updated
	}

	// ========================================================================
	// Formulary Items
	// ========================================================================

	async findFormularyItems(filter: FormularyItemFilterInput) {
		const page = Number(filter.page) || 1
		const limit = Number(filter.limit) || 50
		const offset = (page - 1) * limit

		const conditions = [eq(formularyItems.facilityId, filter.facilityId)]

		if (filter.drugGenericId) {
			conditions.push(eq(formularyItems.drugGenericId, filter.drugGenericId))
		}

		if (filter.isActive !== undefined) {
			conditions.push(eq(formularyItems.isActive, Boolean(filter.isActive)))
		}

		if (filter.isHighAlert !== undefined) {
			conditions.push(eq(formularyItems.isHighAlert, Boolean(filter.isHighAlert)))
		}

		if (filter.isRestricted !== undefined) {
			conditions.push(eq(formularyItems.isRestricted, Boolean(filter.isRestricted)))
		}

		if (filter.search) {
			const escaped = this.escapeLikePattern(filter.search)
			const searchCondition = or(
				ilike(drugGenerics.genericName, `%${escaped}%`),
				ilike(formularyItems.doseForm, `%${escaped}%`),
				ilike(formularyItems.strength, `%${escaped}%`),
				ilike(formularyItems.route, `%${escaped}%`)
			)
			if (searchCondition) {
				conditions.push(searchCondition)
			}
		}

		const whereClause = and(...conditions)

		const [data, totalResult] = await Promise.all([
			db
				.select({
					...getTableColumns(formularyItems),
					genericName: drugGenerics.genericName,
				})
				.from(formularyItems)
				.innerJoin(drugGenerics, eq(formularyItems.drugGenericId, drugGenerics.id))
				.where(whereClause)
				.orderBy(desc(formularyItems.createdAt))
				.limit(limit)
				.offset(offset),
			db
				.select({ count: count() })
				.from(formularyItems)
				.innerJoin(drugGenerics, eq(formularyItems.drugGenericId, drugGenerics.id))
				.where(whereClause),
		])

		const total = totalResult[0]?.count ?? 0

		return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
	}

	async findFormularyItem(id: string) {
		const [item] = await db
			.select({
				...getTableColumns(formularyItems),
				genericName: drugGenerics.genericName,
			})
			.from(formularyItems)
			.innerJoin(drugGenerics, eq(formularyItems.drugGenericId, drugGenerics.id))
			.where(eq(formularyItems.id, id))

		if (!item) {
			throw new NotFoundException(`Formulary item ${id} not found`)
		}

		return item
	}

	async createFormularyItem(input: CreateFormularyItemInput) {
		const [created] = await db
			.insert(formularyItems)
			.values({
				facilityId: input.facilityId,
				drugGenericId: input.drugGenericId,
				drugBrandId: input.drugBrandId ?? null,
				doseForm: input.doseForm,
				strength: input.strength,
				route: input.route,
				isHighAlert: input.isHighAlert ?? false,
				highAlertNotes: input.highAlertNotes ?? null,
				isRestricted: input.isRestricted ?? false,
				restrictionNotes: input.restrictionNotes ?? null,
				formularyNotes: input.formularyNotes ?? null,
			})
			.returning()

		this.logger.log(`Created formulary item: ${created!.id}`)
		return this.findFormularyItem(created!.id)
	}

	async updateFormularyItem(input: UpdateFormularyItemInput) {
		const { id, ...updates } = input

		const [updated] = await db
			.update(formularyItems)
			.set({ ...updates, updatedAt: new Date() })
			.where(eq(formularyItems.id, id))
			.returning()

		if (!updated) {
			throw new NotFoundException(`Formulary item ${id} not found`)
		}

		return this.findFormularyItem(id)
	}

	async deleteFormularyItem(id: string) {
		const item = await this.findFormularyItem(id)
		await db.delete(formularyItems).where(eq(formularyItems.id, id))
		this.logger.log(`Deleted formulary item: ${id}`)
		return item
	}

	// ========================================================================
	// ICD-10 Codes
	// ========================================================================

	async searchIcd10(filter: Icd10SearchInput) {
		const page = Number(filter.page) || 1
		const limit = Number(filter.limit) || 50
		const offset = (page - 1) * limit

		const conditions = []

		if (filter.search) {
			const escaped = this.escapeLikePattern(filter.search)
			conditions.push(
				or(
					ilike(icd10Codes.code, `%${escaped}%`),
					ilike(icd10Codes.description, `%${escaped}%`)
				)
			)
		}

		if (filter.category) {
			conditions.push(eq(icd10Codes.category, filter.category))
		}

		conditions.push(eq(icd10Codes.isActive, true))

		const whereClause = and(...conditions)

		const [data, totalResult] = await Promise.all([
			db
				.select()
				.from(icd10Codes)
				.where(whereClause)
				.orderBy(icd10Codes.code)
				.limit(limit)
				.offset(offset),
			db.select({ count: count() }).from(icd10Codes).where(whereClause),
		])

		const total = totalResult[0]?.count ?? 0

		return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
	}

	// ========================================================================
	// LOINC Codes
	// ========================================================================

	async searchLoinc(filter: LoincSearchInput) {
		const page = Number(filter.page) || 1
		const limit = Number(filter.limit) || 50
		const offset = (page - 1) * limit

		const conditions = []

		if (filter.search) {
			const escaped = this.escapeLikePattern(filter.search)
			conditions.push(
				or(
					ilike(loincCodes.loincNum, `%${escaped}%`),
					ilike(loincCodes.longCommonName, `%${escaped}%`),
					ilike(loincCodes.component, `%${escaped}%`)
				)
			)
		}

		conditions.push(eq(loincCodes.isActive, true))

		const whereClause = and(...conditions)

		const [data, totalResult] = await Promise.all([
			db
				.select()
				.from(loincCodes)
				.where(whereClause)
				.orderBy(loincCodes.loincNum)
				.limit(limit)
				.offset(offset),
			db.select({ count: count() }).from(loincCodes).where(whereClause),
		])

		const total = totalResult[0]?.count ?? 0

		return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
	}

	// ========================================================================
	// RxNorm Codes
	// ========================================================================

	async searchRxnorm(filter: RxnormSearchInput) {
		const page = Number(filter.page) || 1
		const limit = Number(filter.limit) || 50
		const offset = (page - 1) * limit

		const conditions = []

		if (filter.search) {
			const escaped = this.escapeLikePattern(filter.search)
			conditions.push(
				or(
					ilike(rxnormCodes.rxcui, `%${escaped}%`),
					ilike(rxnormCodes.name, `%${escaped}%`)
				)
			)
		}

		conditions.push(eq(rxnormCodes.isActive, true))

		const whereClause = and(...conditions)

		const [data, totalResult] = await Promise.all([
			db
				.select()
				.from(rxnormCodes)
				.where(whereClause)
				.orderBy(rxnormCodes.name)
				.limit(limit)
				.offset(offset),
			db.select({ count: count() }).from(rxnormCodes).where(whereClause),
		])

		const total = totalResult[0]?.count ?? 0

		return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
	}

	// ========================================================================
	// RVS Codes
	// ========================================================================

	async searchRvs(filter: RvsSearchInput) {
		const page = Number(filter.page) || 1
		const limit = Number(filter.limit) || 50
		const offset = (page - 1) * limit

		const conditions = []

		if (filter.search) {
			const escaped = this.escapeLikePattern(filter.search)
			conditions.push(
				or(
					ilike(rvsCodes.rvsCode, `%${escaped}%`),
					ilike(rvsCodes.procedureName, `%${escaped}%`)
				)
			)
		}

		if (filter.category) {
			conditions.push(eq(rvsCodes.category, filter.category))
		}

		conditions.push(eq(rvsCodes.isActive, true))

		const whereClause = and(...conditions)

		const [data, totalResult] = await Promise.all([
			db
				.select()
				.from(rvsCodes)
				.where(whereClause)
				.orderBy(rvsCodes.rvsCode)
				.limit(limit)
				.offset(offset),
			db.select({ count: count() }).from(rvsCodes).where(whereClause),
		])

		const total = totalResult[0]?.count ?? 0

		return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
	}

	// ========================================================================
	// SNOMED CT Codes
	// ========================================================================

	async searchSnomedCt(filter: SnomedCtSearchInput) {
		const page = Number(filter.page) || 1
		const limit = Number(filter.limit) || 50
		const offset = (page - 1) * limit

		const conditions = []

		if (filter.search) {
			const escaped = this.escapeLikePattern(filter.search)
			conditions.push(
				or(
					ilike(snomedCtCodes.conceptId, `%${escaped}%`),
					ilike(snomedCtCodes.preferredTerm, `%${escaped}%`),
					ilike(snomedCtCodes.fsn, `%${escaped}%`)
				)
			)
		}

		if (filter.semanticTag) {
			conditions.push(eq(snomedCtCodes.semanticTag, filter.semanticTag))
		}

		conditions.push(eq(snomedCtCodes.isActive, true))

		const whereClause = and(...conditions)

		const [data, totalResult] = await Promise.all([
			db
				.select()
				.from(snomedCtCodes)
				.where(whereClause)
				.orderBy(snomedCtCodes.preferredTerm)
				.limit(limit)
				.offset(offset),
			db.select({ count: count() }).from(snomedCtCodes).where(whereClause),
		])

		const total = totalResult[0]?.count ?? 0

		return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
	}

	// ========================================================================
	// Formulary Lookup Helpers
	// ========================================================================

	async isOnFormulary(genericName: string, facilityId: string): Promise<boolean> {
		const result = await db
			.select({ id: formularyItems.id })
			.from(formularyItems)
			.innerJoin(drugGenerics, eq(formularyItems.drugGenericId, drugGenerics.id))
			.where(
				and(
					eq(formularyItems.facilityId, facilityId),
					eq(formularyItems.isActive, true),
					ilike(drugGenerics.genericName, this.escapeLikePattern(genericName))
				)
			)
			.limit(1)
		return result.length > 0
	}

	async getFormularyNote(genericName: string): Promise<string | null> {
		const [row] = await db
			.select({ formularyNotes: formularyItems.formularyNotes })
			.from(formularyItems)
			.innerJoin(drugGenerics, eq(formularyItems.drugGenericId, drugGenerics.id))
			.where(
				and(
					eq(formularyItems.isActive, true),
					ilike(drugGenerics.genericName, this.escapeLikePattern(genericName))
				)
			)
			.limit(1)
		return row?.formularyNotes ?? null
	}

	async search(query: string) {
		const escaped = this.escapeLikePattern(query)
		return db
			.select({
				...getTableColumns(formularyItems),
				genericName: drugGenerics.genericName,
			})
			.from(formularyItems)
			.innerJoin(drugGenerics, eq(formularyItems.drugGenericId, drugGenerics.id))
			.where(
				and(
					eq(formularyItems.isActive, true),
					or(
						ilike(drugGenerics.genericName, `%${escaped}%`),
						ilike(formularyItems.doseForm, `%${escaped}%`),
						ilike(formularyItems.strength, `%${escaped}%`),
						ilike(formularyItems.route, `%${escaped}%`)
					)
				)
			)
			.orderBy(drugGenerics.genericName)
			.limit(50)
	}
}
