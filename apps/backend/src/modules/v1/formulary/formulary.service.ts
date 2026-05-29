import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common"
import { and, count, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm"

import {
	catalogVersions,
	codeSetCatalogUploads,
	deprecatedCodeMappings,
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
import { AUDIT_ENTITY_TYPES } from "@/modules/v1/audit/audit-entity-types"
import { AuditService } from "@/modules/v1/audit/audit.service"

type DrugGenericSearchInput = V1Inputs["formulary"]["drugGeneric"]["list"]
type CreateDrugGenericInput = V1Inputs["formulary"]["drugGeneric"]["create"]
type UpdateDrugGenericInput = V1Inputs["formulary"]["drugGeneric"]["update"]

type DrugBrandSearchInput = V1Inputs["formulary"]["drugBrand"]["list"]
type CreateDrugBrandInput = V1Inputs["formulary"]["drugBrand"]["create"]
type UpdateDrugBrandInput = V1Inputs["formulary"]["drugBrand"]["update"]

type FormularyItemFilterInput = V1Inputs["formulary"]["item"]["list"]
type CreateFormularyItemInput = V1Inputs["formulary"]["item"]["create"]
type UpdateFormularyItemInput = V1Inputs["formulary"]["item"]["update"]
type UpdateFormularyClinicalPolicyInput = V1Inputs["formulary"]["item"]["updateClinicalPolicy"]

type Icd10SearchInput = V1Inputs["formulary"]["icd10"]["search"]
type LoincSearchInput = V1Inputs["formulary"]["loinc"]["search"]
type RxnormSearchInput = V1Inputs["formulary"]["rxnorm"]["search"]
type RvsSearchInput = V1Inputs["formulary"]["rvs"]["search"]
type SnomedCtSearchInput = V1Inputs["formulary"]["snomedCt"]["search"]
type CatalogUploadFilterInput = V1Inputs["formulary"]["codeSetAdmin"]["listUploads"]
type RecordCatalogUploadInput = V1Inputs["formulary"]["codeSetAdmin"]["recordUpload"]
type SetCodeActiveInput = V1Inputs["formulary"]["codeSetAdmin"]["setCodeActive"]
type DeprecatedMappingFilterInput = V1Inputs["formulary"]["codeSetAdmin"]["listDeprecations"]
type CreateDeprecatedMappingInput = V1Inputs["formulary"]["codeSetAdmin"]["createDeprecation"]
type UpdateDeprecatedMappingInput = V1Inputs["formulary"]["codeSetAdmin"]["updateDeprecation"]
type DeleteDeprecatedMappingInput = V1Inputs["formulary"]["codeSetAdmin"]["deleteDeprecation"]

type AdminCatalogSearchInput = V1Inputs["formulary"]["codeSetAdmin"]["adminSearchEntries"]
type CreateCatalogEntryInput = V1Inputs["formulary"]["codeSetAdmin"]["createEntry"]
type UpdateCatalogEntryInput = V1Inputs["formulary"]["codeSetAdmin"]["updateEntry"]
type DeleteCatalogEntryInput = V1Inputs["formulary"]["codeSetAdmin"]["deleteEntry"]
type CatalogVersionFilterInput = V1Inputs["formulary"]["codeSetAdmin"]["listVersions"]
type PublishCatalogVersionInput = V1Inputs["formulary"]["codeSetAdmin"]["publishVersion"]

type CatalogType = "icd10" | "loinc" | "rxnorm" | "rvs" | "snomed_ct"
type CatalogUploadStatus = "completed" | "failed"

type CatalogUploadRow<T> = T & { catalogType: CatalogType; status: CatalogUploadStatus }
type CatalogTypedRow<T> = T & { catalogType: CatalogType }

export interface FormularyActor {
	userId: string
	facilityId: string
	staffProfileId: string | null
	ipAddress: string | null
	userAgent: string | null
}

@Injectable()
export class FormularyService {
	private readonly logger = new Logger(FormularyService.name)

	constructor(private readonly auditService: AuditService) {}

	// ========================================================================
	// Utilities
	// ========================================================================

	private escapeLikePattern(input: string): string {
		return input.replace(/[\\%_]/g, "\\$&")
	}

	private normalizeDrugGenericName(input: string): string {
		return input.trim().replace(/\s+/g, " ").toLowerCase()
	}

	private async findDrugGenericByNormalizedName(genericName: string, excludeId?: string) {
		const normalizedName = this.normalizeDrugGenericName(genericName)
		if (!normalizedName) return null

		const conditions = [
			sql`lower(regexp_replace(trim(${drugGenerics.genericName}), '\s+', ' ', 'g')) = ${normalizedName}`,
		]

		if (excludeId) {
			conditions.push(sql`${drugGenerics.id} <> ${excludeId}`)
		}

		const [existing] = await db
			.select({ id: drugGenerics.id, genericName: drugGenerics.genericName })
			.from(drugGenerics)
			.where(and(...conditions))
			.limit(1)

		return existing ?? null
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

	async createDrugGeneric(input: CreateDrugGenericInput, actor: FormularyActor) {
		const genericName = input.genericName.trim().replace(/\s+/g, " ")
		const duplicate = await this.findDrugGenericByNormalizedName(genericName)
		if (duplicate) {
			throw new BadRequestException(
				`Drug generic "${duplicate.genericName}" already exists in the catalog.`
			)
		}

		// FORM-003: Validate rxnormCode against catalog if provided
		if (input.rxnormCode) {
			const [rxRow] = await db
				.select({ id: rxnormCodes.id })
				.from(rxnormCodes)
				.where(eq(rxnormCodes.rxcui, input.rxnormCode))
				.limit(1)
			if (!rxRow) {
				throw new BadRequestException(
					`RxNorm code "${input.rxnormCode}" is not present in the active RxNorm catalog. Select a valid RXCUI from the code-set browser.`
				)
			}
		}

		const [created] = await db
			.insert(drugGenerics)
			.values({
				genericName,
				rxnormCode: input.rxnormCode ?? null,
				atcCode: input.atcCode ?? null,
			})
			.returning()

		this.logger.log(`Created drug generic: ${created!.genericName}`)

		await this.auditService.log({
			facilityId: actor.facilityId,
			userId: actor.userId,
			staffProfileId: actor.staffProfileId,
			action: "create",
			entityType: AUDIT_ENTITY_TYPES.DRUG_GENERIC,
			entityId: created!.id,
			beforeState: null,
			afterState: { ...created },
			ipAddress: actor.ipAddress,
			userAgent: actor.userAgent,
			metadata: null,
		})

		return created!
	}

	async updateDrugGeneric(input: UpdateDrugGenericInput, actor: FormularyActor) {
		const { id, ...updates } = input
		const sanitizedUpdates = { ...updates }

		if (sanitizedUpdates.genericName !== undefined) {
			sanitizedUpdates.genericName = sanitizedUpdates.genericName.trim().replace(/\s+/g, " ")
			const duplicate = await this.findDrugGenericByNormalizedName(sanitizedUpdates.genericName, id)
			if (duplicate) {
				throw new BadRequestException(
					`Drug generic "${duplicate.genericName}" already exists in the catalog.`
				)
			}
		}

		// FORM-003: Validate new rxnormCode against catalog if being changed
		if (sanitizedUpdates.rxnormCode !== null && sanitizedUpdates.rxnormCode !== undefined) {
			const [rxRow] = await db
				.select({ id: rxnormCodes.id })
				.from(rxnormCodes)
				.where(eq(rxnormCodes.rxcui, sanitizedUpdates.rxnormCode))
				.limit(1)
			if (!rxRow) {
				throw new BadRequestException(
					`RxNorm code "${sanitizedUpdates.rxnormCode}" is not present in the active RxNorm catalog. Select a valid RXCUI from the code-set browser.`
				)
			}
		}

		const [before] = await db.select().from(drugGenerics).where(eq(drugGenerics.id, id))

		const [updated] = await db
			.update(drugGenerics)
			.set(sanitizedUpdates)
			.where(eq(drugGenerics.id, id))
			.returning()

		if (!updated) {
			throw new NotFoundException(`Drug generic ${id} not found`)
		}

		await this.auditService.log({
			facilityId: actor.facilityId,
			userId: actor.userId,
			staffProfileId: actor.staffProfileId,
			action: "update",
			entityType: AUDIT_ENTITY_TYPES.DRUG_GENERIC,
			entityId: id,
			beforeState: before ? { ...before } : null,
			afterState: { ...updated },
			ipAddress: actor.ipAddress,
			userAgent: actor.userAgent,
			metadata: null,
		})

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

	async createDrugBrand(input: CreateDrugBrandInput, actor: FormularyActor) {
		const [created] = await db
			.insert(drugBrands)
			.values({
				drugGenericId: input.drugGenericId,
				brandName: input.brandName,
				manufacturer: input.manufacturer ?? null,
			})
			.returning()

		this.logger.log(`Created drug brand: ${created!.brandName}`)

		await this.auditService.log({
			facilityId: actor.facilityId,
			userId: actor.userId,
			staffProfileId: actor.staffProfileId,
			action: "create",
			entityType: AUDIT_ENTITY_TYPES.DRUG_BRAND,
			entityId: created!.id,
			beforeState: null,
			afterState: { ...created },
			ipAddress: actor.ipAddress,
			userAgent: actor.userAgent,
			metadata: null,
		})

		return created!
	}

	async updateDrugBrand(input: UpdateDrugBrandInput, actor: FormularyActor) {
		const { id, ...updates } = input

		const [before] = await db.select().from(drugBrands).where(eq(drugBrands.id, id))

		const [updated] = await db
			.update(drugBrands)
			.set(updates)
			.where(eq(drugBrands.id, id))
			.returning()

		if (!updated) {
			throw new NotFoundException(`Drug brand ${id} not found`)
		}

		await this.auditService.log({
			facilityId: actor.facilityId,
			userId: actor.userId,
			staffProfileId: actor.staffProfileId,
			action: "update",
			entityType: AUDIT_ENTITY_TYPES.DRUG_BRAND,
			entityId: id,
			beforeState: before ? { ...before } : null,
			afterState: { ...updated },
			ipAddress: actor.ipAddress,
			userAgent: actor.userAgent,
			metadata: null,
		})

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
				ilike(drugBrands.brandName, `%${escaped}%`),
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
					brandName: drugBrands.brandName,
				})
				.from(formularyItems)
				.innerJoin(drugGenerics, eq(formularyItems.drugGenericId, drugGenerics.id))
				.leftJoin(drugBrands, eq(formularyItems.drugBrandId, drugBrands.id))
				.where(whereClause)
				.orderBy(desc(formularyItems.createdAt))
				.limit(limit)
				.offset(offset),
			db
				.select({ count: count() })
				.from(formularyItems)
				.innerJoin(drugGenerics, eq(formularyItems.drugGenericId, drugGenerics.id))
				.leftJoin(drugBrands, eq(formularyItems.drugBrandId, drugBrands.id))
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
				brandName: drugBrands.brandName,
			})
			.from(formularyItems)
			.innerJoin(drugGenerics, eq(formularyItems.drugGenericId, drugGenerics.id))
			.leftJoin(drugBrands, eq(formularyItems.drugBrandId, drugBrands.id))
			.where(eq(formularyItems.id, id))

		if (!item) {
			throw new NotFoundException(`Formulary item ${id} not found`)
		}

		return item
	}

	async createFormularyItem(input: CreateFormularyItemInput, actor: FormularyActor) {
		const [created] = await db
			.insert(formularyItems)
			.values({
				facilityId: input.facilityId,
				drugGenericId: input.drugGenericId,
				drugBrandId: input.drugBrandId ?? null,
				doseForm: input.doseForm,
				strength: input.strength,
				route: input.route,
				// Clinical policy defaults — pharmacist sets these via updateClinicalPolicy
				isHighAlert: false,
				highAlertNotes: null,
				isRestricted: false,
				restrictionNotes: null,
				formularyNotes: null,
			})
			.returning()

		this.logger.log(`Created formulary item: ${created!.id}`)

		const full = await this.findFormularyItem(created!.id)

		await this.auditService.log({
			facilityId: actor.facilityId,
			userId: actor.userId,
			staffProfileId: actor.staffProfileId,
			action: "create",
			entityType: AUDIT_ENTITY_TYPES.FORMULARY_ITEM,
			entityId: created!.id,
			beforeState: null,
			afterState: { ...full },
			ipAddress: actor.ipAddress,
			userAgent: actor.userAgent,
			metadata: null,
		})

		return full
	}

	async updateFormularyItem(input: UpdateFormularyItemInput, actor: FormularyActor) {
		const { id, ...updates } = input

		const before = await this.findFormularyItem(id)

		// Only master-data fields are accepted — clinical policy is NOT touched here
		const masterDataUpdates: Record<string, unknown> = {}
		if (updates.doseForm !== undefined) masterDataUpdates.doseForm = updates.doseForm
		if (updates.strength !== undefined) masterDataUpdates.strength = updates.strength
		if (updates.route !== undefined) masterDataUpdates.route = updates.route
		if (updates.isActive !== undefined) masterDataUpdates.isActive = updates.isActive
		if ("drugBrandId" in updates) masterDataUpdates.drugBrandId = updates.drugBrandId

		const [updated] = await db
			.update(formularyItems)
			.set({ ...masterDataUpdates, updatedAt: new Date() })
			.where(eq(formularyItems.id, id))
			.returning()

		if (!updated) {
			throw new NotFoundException(`Formulary item ${id} not found`)
		}

		const full = await this.findFormularyItem(id)

		await this.auditService.log({
			facilityId: actor.facilityId,
			userId: actor.userId,
			staffProfileId: actor.staffProfileId,
			action: "update",
			entityType: AUDIT_ENTITY_TYPES.FORMULARY_ITEM,
			entityId: id,
			beforeState: { ...before },
			afterState: { ...full },
			ipAddress: actor.ipAddress,
			userAgent: actor.userAgent,
			metadata: null,
		})

		return full
	}

	async updateFormularyClinicalPolicy(
		input: UpdateFormularyClinicalPolicyInput,
		actor: FormularyActor
	) {
		const { id, ...clinicalUpdates } = input

		const before = await this.findFormularyItem(id)

		// Only pharmacist-owned clinical policy fields are accepted here
		const policyUpdates: Record<string, unknown> = {}
		if (clinicalUpdates.isHighAlert !== undefined)
			policyUpdates.isHighAlert = clinicalUpdates.isHighAlert
		if ("highAlertNotes" in clinicalUpdates)
			policyUpdates.highAlertNotes = clinicalUpdates.highAlertNotes
		if (clinicalUpdates.isRestricted !== undefined)
			policyUpdates.isRestricted = clinicalUpdates.isRestricted
		if ("restrictionNotes" in clinicalUpdates)
			policyUpdates.restrictionNotes = clinicalUpdates.restrictionNotes
		if ("formularyNotes" in clinicalUpdates)
			policyUpdates.formularyNotes = clinicalUpdates.formularyNotes

		const [updated] = await db
			.update(formularyItems)
			.set({ ...policyUpdates, updatedAt: new Date() })
			.where(eq(formularyItems.id, id))
			.returning()

		if (!updated) {
			throw new NotFoundException(`Formulary item ${id} not found`)
		}

		const full = await this.findFormularyItem(id)

		await this.auditService.log({
			facilityId: actor.facilityId,
			userId: actor.userId,
			staffProfileId: actor.staffProfileId,
			action: "update",
			entityType: AUDIT_ENTITY_TYPES.FORMULARY_ITEM,
			entityId: id,
			beforeState: { ...before },
			afterState: { ...full },
			ipAddress: actor.ipAddress,
			userAgent: actor.userAgent,
			metadata: { clinicalPolicyUpdate: true },
		})

		return full
	}

	async deleteFormularyItem(id: string, actor: FormularyActor) {
		const item = await this.findFormularyItem(id)
		await db.delete(formularyItems).where(eq(formularyItems.id, id))
		this.logger.log(`Deleted formulary item: ${id}`)

		await this.auditService.log({
			facilityId: actor.facilityId,
			userId: actor.userId,
			staffProfileId: actor.staffProfileId,
			action: "delete",
			entityType: AUDIT_ENTITY_TYPES.FORMULARY_ITEM,
			entityId: id,
			beforeState: { ...item },
			afterState: null,
			ipAddress: actor.ipAddress,
			userAgent: actor.userAgent,
			metadata: null,
		})

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
				or(ilike(icd10Codes.code, `%${escaped}%`), ilike(icd10Codes.description, `%${escaped}%`))
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
				or(ilike(rxnormCodes.rxcui, `%${escaped}%`), ilike(rxnormCodes.name, `%${escaped}%`))
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
				or(ilike(rvsCodes.rvsCode, `%${escaped}%`), ilike(rvsCodes.procedureName, `%${escaped}%`))
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

	// ========================================================================
	// Code Set Admin — Catalog uploads (FORM-001)
	// ========================================================================

	async listCatalogUploads(filter: CatalogUploadFilterInput) {
		const page = Number(filter.page) || 1
		const limit = Number(filter.limit) || 50
		const offset = (page - 1) * limit

		const conditions = []
		if (filter.catalogType) {
			conditions.push(eq(codeSetCatalogUploads.catalogType, filter.catalogType))
		}

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined

		const [data, totalResult] = await Promise.all([
			db
				.select()
				.from(codeSetCatalogUploads)
				.where(whereClause)
				.orderBy(desc(codeSetCatalogUploads.createdAt))
				.limit(limit)
				.offset(offset),
			db.select({ count: count() }).from(codeSetCatalogUploads).where(whereClause),
		])

		const total = totalResult[0]?.count ?? 0
		return {
			data: data as Array<CatalogUploadRow<(typeof data)[number]>>,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	async recordCatalogUpload(input: RecordCatalogUploadInput, actor: FormularyActor) {
		const [created] = await db
			.insert(codeSetCatalogUploads)
			.values({
				catalogType: input.catalogType,
				version: input.version ?? null,
				notes: input.notes ?? null,
				entryCount: input.entryCount,
				uploadedByUserId: actor.userId,
				status: input.status ?? "completed",
			})
			.returning()

		this.logger.log(
			`Recorded catalog upload: ${created!.catalogType} v${created!.version ?? "unversioned"} (${created!.entryCount} entries)`
		)

		await this.auditService.log({
			facilityId: actor.facilityId,
			userId: actor.userId,
			staffProfileId: actor.staffProfileId,
			action: "create",
			entityType: AUDIT_ENTITY_TYPES.CODE_SET_UPLOAD,
			entityId: created!.id,
			beforeState: null,
			afterState: { ...created },
			ipAddress: actor.ipAddress,
			userAgent: actor.userAgent,
			metadata: { catalogType: created!.catalogType, entryCount: created!.entryCount },
		})

		return created! as CatalogUploadRow<NonNullable<typeof created>>
	}

	async setCodeActive(input: SetCodeActiveInput, actor: FormularyActor) {
		const tableMap = {
			icd10: icd10Codes,
			loinc: loincCodes,
			rxnorm: rxnormCodes,
			rvs: rvsCodes,
			snomed_ct: snomedCtCodes,
		} as const

		const table = tableMap[input.catalogType]
		if (!table) {
			throw new BadRequestException(`Unknown catalog type: ${input.catalogType}`)
		}

		const [updated] = await db
			.update(table)
			.set({ isActive: input.isActive })
			.where(eq(table.id, input.codeId))
			.returning()

		if (!updated) {
			throw new NotFoundException(`Code ${input.codeId} not found in ${input.catalogType} catalog`)
		}

		await this.auditService.log({
			facilityId: actor.facilityId,
			userId: actor.userId,
			staffProfileId: actor.staffProfileId,
			action: "update",
			entityType: AUDIT_ENTITY_TYPES.CODE_SET_UPLOAD,
			entityId: input.codeId,
			beforeState: null,
			afterState: {
				catalogType: input.catalogType,
				codeId: input.codeId,
				isActive: input.isActive,
			},
			ipAddress: actor.ipAddress,
			userAgent: actor.userAgent,
			metadata: { catalogType: input.catalogType, action: "setCodeActive" },
		})

		return { success: true, codeId: input.codeId, isActive: input.isActive }
	}

	// ========================================================================
	// Code Set Admin — Deprecated code mappings (FORM-001)
	// ========================================================================

	async listDeprecatedMappings(filter: DeprecatedMappingFilterInput) {
		const page = Number(filter.page) || 1
		const limit = Number(filter.limit) || 50
		const offset = (page - 1) * limit

		const conditions = []

		if (filter.catalogType) {
			conditions.push(eq(deprecatedCodeMappings.catalogType, filter.catalogType))
		}

		if (filter.fromCode) {
			const escaped = this.escapeLikePattern(filter.fromCode)
			conditions.push(ilike(deprecatedCodeMappings.fromCode, `%${escaped}%`))
		}

		if (filter.isActive !== undefined) {
			conditions.push(eq(deprecatedCodeMappings.isActive, Boolean(filter.isActive)))
		}

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined

		const [data, totalResult] = await Promise.all([
			db
				.select()
				.from(deprecatedCodeMappings)
				.where(whereClause)
				.orderBy(deprecatedCodeMappings.catalogType, deprecatedCodeMappings.fromCode)
				.limit(limit)
				.offset(offset),
			db.select({ count: count() }).from(deprecatedCodeMappings).where(whereClause),
		])

		const total = totalResult[0]?.count ?? 0
		return {
			data: data as Array<CatalogTypedRow<(typeof data)[number]>>,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	async createDeprecatedMapping(input: CreateDeprecatedMappingInput, actor: FormularyActor) {
		const [created] = await db
			.insert(deprecatedCodeMappings)
			.values({
				catalogType: input.catalogType,
				fromCode: input.fromCode,
				toCode: input.toCode ?? null,
				notes: input.notes ?? null,
				createdByUserId: actor.userId,
			})
			.returning()

		await this.auditService.log({
			facilityId: actor.facilityId,
			userId: actor.userId,
			staffProfileId: actor.staffProfileId,
			action: "create",
			entityType: AUDIT_ENTITY_TYPES.DEPRECATED_CODE_MAPPING,
			entityId: created!.id,
			beforeState: null,
			afterState: { ...created },
			ipAddress: actor.ipAddress,
			userAgent: actor.userAgent,
			metadata: null,
		})

		return created! as CatalogTypedRow<NonNullable<typeof created>>
	}

	async updateDeprecatedMapping(input: UpdateDeprecatedMappingInput, actor: FormularyActor) {
		const { id, ...updates } = input

		const [before] = await db
			.select()
			.from(deprecatedCodeMappings)
			.where(eq(deprecatedCodeMappings.id, id))

		const [updated] = await db
			.update(deprecatedCodeMappings)
			.set({ ...updates, updatedAt: new Date() })
			.where(eq(deprecatedCodeMappings.id, id))
			.returning()

		if (!updated) {
			throw new NotFoundException(`Deprecated code mapping ${id} not found`)
		}

		await this.auditService.log({
			facilityId: actor.facilityId,
			userId: actor.userId,
			staffProfileId: actor.staffProfileId,
			action: "update",
			entityType: AUDIT_ENTITY_TYPES.DEPRECATED_CODE_MAPPING,
			entityId: id,
			beforeState: before ? { ...before } : null,
			afterState: { ...updated },
			ipAddress: actor.ipAddress,
			userAgent: actor.userAgent,
			metadata: null,
		})

		return updated as CatalogTypedRow<typeof updated>
	}

	async deleteDeprecatedMapping(input: DeleteDeprecatedMappingInput, actor: FormularyActor) {
		const [existing] = await db
			.select()
			.from(deprecatedCodeMappings)
			.where(eq(deprecatedCodeMappings.id, input.id))

		if (!existing) {
			throw new NotFoundException(`Deprecated code mapping ${input.id} not found`)
		}

		await db.delete(deprecatedCodeMappings).where(eq(deprecatedCodeMappings.id, input.id))

		await this.auditService.log({
			facilityId: actor.facilityId,
			userId: actor.userId,
			staffProfileId: actor.staffProfileId,
			action: "delete",
			entityType: AUDIT_ENTITY_TYPES.DEPRECATED_CODE_MAPPING,
			entityId: input.id,
			beforeState: { ...existing },
			afterState: null,
			ipAddress: actor.ipAddress,
			userAgent: actor.userAgent,
			metadata: null,
		})

		return { success: true, id: input.id }
	}

	// ========================================================================
	// Catalog Entry Editor — FORM-006
	// ========================================================================

	/** Map a catalog type string to its Drizzle table */
	private getCatalogTable(catalogType: CatalogType) {
		const tableMap: Record<
			CatalogType,
			| typeof icd10Codes
			| typeof loincCodes
			| typeof rxnormCodes
			| typeof rvsCodes
			| typeof snomedCtCodes
		> = {
			icd10: icd10Codes,
			loinc: loincCodes,
			rxnorm: rxnormCodes,
			rvs: rvsCodes,
			snomed_ct: snomedCtCodes,
		}
		const table = tableMap[catalogType]
		if (!table) throw new BadRequestException(`Unknown catalog type: ${catalogType}`)
		return table
	}

	/** Project any catalog row to the flat CatalogEntry response shape */
	private projectCatalogRow(row: Record<string, unknown>, catalogType: CatalogType) {
		return {
			id: row["id"] as string,
			catalogType,
			isActive: (row["isActive"] as boolean) ?? true,
			createdAt: row["createdAt"] as Date,
			// ICD-10
			code: (row["code"] ?? null) as string | null,
			description: (row["description"] ?? null) as string | null,
			// LOINC
			loincNum: (row["loincNum"] ?? null) as string | null,
			longCommonName: (row["longCommonName"] ?? null) as string | null,
			component: (row["component"] ?? null) as string | null,
			property: (row["property"] ?? null) as string | null,
			timeAspect: (row["timeAspect"] ?? null) as string | null,
			system: (row["system"] ?? null) as string | null,
			scale: (row["scale"] ?? null) as string | null,
			method: (row["method"] ?? null) as string | null,
			// RxNorm
			rxcui: (row["rxcui"] ?? null) as string | null,
			name: (row["name"] ?? null) as string | null,
			tty: (row["tty"] ?? null) as string | null,
			// RVS
			rvsCode: (row["rvsCode"] ?? null) as string | null,
			procedureName: (row["procedureName"] ?? null) as string | null,
			rvsValue: (row["rvsValue"] ?? null) as string | null,
			effectiveDate: (row["effectiveDate"] ?? null) as string | null,
			// SNOMED CT
			conceptId: (row["conceptId"] ?? null) as string | null,
			fsn: (row["fsn"] ?? null) as string | null,
			preferredTerm: (row["preferredTerm"] ?? null) as string | null,
			semanticTag: (row["semanticTag"] ?? null) as string | null,
			// Shared
			category: (row["category"] ?? null) as string | null,
		}
	}

	async adminSearchCatalogEntries(filter: AdminCatalogSearchInput) {
		const page = Number(filter.page) || 1
		const limit = Number(filter.limit) || 50
		const offset = (page - 1) * limit

		const table = this.getCatalogTable(filter.catalogType)
		const conditions = []

		if (filter.isActive !== undefined) {
			conditions.push(eq(table.isActive, Boolean(filter.isActive)))
		}

		if (filter.search) {
			const escaped = this.escapeLikePattern(filter.search)
			const searchPattern = `%${escaped}%`

			if (filter.catalogType === "icd10") {
				const t = table as typeof icd10Codes
				conditions.push(or(ilike(t.code, searchPattern), ilike(t.description, searchPattern)))
			} else if (filter.catalogType === "loinc") {
				const t = table as typeof loincCodes
				conditions.push(
					or(ilike(t.loincNum, searchPattern), ilike(t.longCommonName, searchPattern))
				)
			} else if (filter.catalogType === "rxnorm") {
				const t = table as typeof rxnormCodes
				conditions.push(or(ilike(t.rxcui, searchPattern), ilike(t.name, searchPattern)))
			} else if (filter.catalogType === "rvs") {
				const t = table as typeof rvsCodes
				conditions.push(or(ilike(t.rvsCode, searchPattern), ilike(t.procedureName, searchPattern)))
			} else if (filter.catalogType === "snomed_ct") {
				const t = table as typeof snomedCtCodes
				conditions.push(
					or(
						ilike(t.conceptId, searchPattern),
						ilike(t.fsn, searchPattern),
						ilike(t.preferredTerm, searchPattern)
					)
				)
			}
		}

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined

		const [rows, totalResult] = await Promise.all([
			db
				.select()
				.from(table)
				.where(whereClause)
				.orderBy(desc(table.createdAt))
				.limit(limit)
				.offset(offset),
			db.select({ count: count() }).from(table).where(whereClause),
		])

		const total = totalResult[0]?.count ?? 0
		const data = rows.map(r =>
			this.projectCatalogRow(r as Record<string, unknown>, filter.catalogType)
		)

		return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
	}

	async createCatalogEntry(input: CreateCatalogEntryInput, actor: FormularyActor) {
		const { catalogType, ...fields } = input as Record<string, unknown> & {
			catalogType: CatalogType
		}

		const table: any = this.getCatalogTable(catalogType)

		const rows = (await db
			.insert(table)
			.values({ ...fields, createdByUserId: actor.userId })
			.returning()) as Array<Record<string, unknown>>
		const created = rows[0]!

		await this.auditService.log({
			facilityId: actor.facilityId,
			userId: actor.userId,
			staffProfileId: actor.staffProfileId,
			action: "create",
			entityType: AUDIT_ENTITY_TYPES.CATALOG_ENTRY,
			entityId: (created as { id: string }).id,
			beforeState: null,
			afterState: { catalogType, ...created },
			ipAddress: actor.ipAddress,
			userAgent: actor.userAgent,
			metadata: { catalogType },
		})

		return this.projectCatalogRow({ ...(created as Record<string, unknown>) }, catalogType)
	}

	async updateCatalogEntry(input: UpdateCatalogEntryInput, actor: FormularyActor) {
		const { id, catalogType, ...updates } = input

		const table: any = this.getCatalogTable(catalogType)

		const [before] = await db.select().from(table).where(eq(table.id, id))

		if (!before) {
			throw new NotFoundException(`Catalog entry ${id} not found in ${catalogType}`)
		}

		// Remove undefined fields — only pass truly provided fields to update
		const setFields = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined))

		const [updated] = await db
			.update(table)
			.set({ ...setFields, updatedAt: new Date() })
			.where(eq(table.id, id))
			.returning()

		await this.auditService.log({
			facilityId: actor.facilityId,
			userId: actor.userId,
			staffProfileId: actor.staffProfileId,
			action: "update",
			entityType: AUDIT_ENTITY_TYPES.CATALOG_ENTRY,
			entityId: id,
			beforeState: { catalogType, ...before },
			afterState: { catalogType, ...updated },
			ipAddress: actor.ipAddress,
			userAgent: actor.userAgent,
			metadata: { catalogType },
		})

		return this.projectCatalogRow({ ...(updated as Record<string, unknown>) }, catalogType)
	}

	async deleteCatalogEntry(input: DeleteCatalogEntryInput, actor: FormularyActor) {
		const { id, catalogType } = input

		const table: any = this.getCatalogTable(catalogType)

		const [existing] = await db.select().from(table).where(eq(table.id, id))

		if (!existing) {
			throw new NotFoundException(`Catalog entry ${id} not found in ${catalogType}`)
		}

		await db.delete(table).where(eq(table.id, id))

		await this.auditService.log({
			facilityId: actor.facilityId,
			userId: actor.userId,
			staffProfileId: actor.staffProfileId,
			action: "delete",
			entityType: AUDIT_ENTITY_TYPES.CATALOG_ENTRY,
			entityId: id,
			beforeState: { catalogType, ...existing },
			afterState: null,
			ipAddress: actor.ipAddress,
			userAgent: actor.userAgent,
			metadata: { catalogType },
		})

		return { success: true, id }
	}

	// ========================================================================
	// Catalog Versions — publish workflow (FORM-006)
	// ========================================================================

	async publishCatalogVersion(input: PublishCatalogVersionInput, actor: FormularyActor) {
		const table: any = this.getCatalogTable(input.catalogType)
		const [countResult] = await db.select({ count: count() }).from(table)
		const entryCount = countResult?.count ?? 0

		const [version] = await db
			.insert(catalogVersions)
			.values({
				catalogType: input.catalogType,
				versionTag: input.versionTag,
				publishedByUserId: actor.userId,
				publishedAt: new Date(),
				entryCount,
				notes: input.notes ?? null,
			})
			.returning()

		await this.auditService.log({
			facilityId: actor.facilityId,
			userId: actor.userId,
			staffProfileId: actor.staffProfileId,
			action: "create",
			entityType: AUDIT_ENTITY_TYPES.CATALOG_VERSION,
			entityId: version!.id,
			beforeState: null,
			afterState: { ...version },
			ipAddress: actor.ipAddress,
			userAgent: actor.userAgent,
			metadata: { catalogType: input.catalogType, versionTag: input.versionTag },
		})

		return version! as CatalogTypedRow<NonNullable<typeof version>>
	}

	async listCatalogVersions(filter: CatalogVersionFilterInput) {
		const page = Number(filter.page) || 1
		const limit = Number(filter.limit) || 50
		const offset = (page - 1) * limit

		const conditions = []
		if (filter.catalogType) {
			conditions.push(eq(catalogVersions.catalogType, filter.catalogType))
		}
		const whereClause = conditions.length > 0 ? and(...conditions) : undefined

		const [data, totalResult] = await Promise.all([
			db
				.select()
				.from(catalogVersions)
				.where(whereClause)
				.orderBy(desc(catalogVersions.publishedAt))
				.limit(limit)
				.offset(offset),
			db.select({ count: count() }).from(catalogVersions).where(whereClause),
		])

		const total = totalResult[0]?.count ?? 0
		return {
			data: data as Array<CatalogTypedRow<(typeof data)[number]>>,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}
}
