import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"

import { v1 } from "@/config/api-versions.config"

import { FormularyService } from "./formulary.service"

@Controller()
export class FormularyController {
	constructor(private readonly formularyService: FormularyService) {}

	// ========================================================================
	// Drug Generics
	// ========================================================================

	@Implement(v1.formulary.drugGeneric.list)
	async listDrugGenerics() {
		return implement(v1.formulary.drugGeneric.list).handler(async ({ input }) => {
			return this.formularyService.findDrugGenerics(input)
		})
	}

	@Implement(v1.formulary.drugGeneric.create)
	async createDrugGeneric() {
		return implement(v1.formulary.drugGeneric.create).handler(async ({ input }) => {
			return this.formularyService.createDrugGeneric(input)
		})
	}

	@Implement(v1.formulary.drugGeneric.update)
	async updateDrugGeneric() {
		return implement(v1.formulary.drugGeneric.update).handler(async ({ input }) => {
			return this.formularyService.updateDrugGeneric(input)
		})
	}

	// ========================================================================
	// Drug Brands
	// ========================================================================

	@Implement(v1.formulary.drugBrand.list)
	async listDrugBrands() {
		return implement(v1.formulary.drugBrand.list).handler(async ({ input }) => {
			return this.formularyService.findDrugBrands(input)
		})
	}

	@Implement(v1.formulary.drugBrand.create)
	async createDrugBrand() {
		return implement(v1.formulary.drugBrand.create).handler(async ({ input }) => {
			return this.formularyService.createDrugBrand(input)
		})
	}

	@Implement(v1.formulary.drugBrand.update)
	async updateDrugBrand() {
		return implement(v1.formulary.drugBrand.update).handler(async ({ input }) => {
			return this.formularyService.updateDrugBrand(input)
		})
	}

	// ========================================================================
	// Formulary Items
	// ========================================================================

	@Implement(v1.formulary.item.list)
	async listFormularyItems() {
		return implement(v1.formulary.item.list).handler(async ({ input }) => {
			return this.formularyService.findFormularyItems(input)
		})
	}

	@Implement(v1.formulary.item.get)
	async getFormularyItem() {
		return implement(v1.formulary.item.get).handler(async ({ input }) => {
			return this.formularyService.findFormularyItem(input.id)
		})
	}

	@Implement(v1.formulary.item.create)
	async createFormularyItem() {
		return implement(v1.formulary.item.create).handler(async ({ input }) => {
			return this.formularyService.createFormularyItem(input)
		})
	}

	@Implement(v1.formulary.item.update)
	async updateFormularyItem() {
		return implement(v1.formulary.item.update).handler(async ({ input }) => {
			return this.formularyService.updateFormularyItem(input)
		})
	}

	@Implement(v1.formulary.item.delete)
	async deleteFormularyItem() {
		return implement(v1.formulary.item.delete).handler(async ({ input }) => {
			return this.formularyService.deleteFormularyItem(input.id)
		})
	}

	// ========================================================================
	// Clinical Code Sets
	// ========================================================================

	@Implement(v1.formulary.icd10.search)
	async searchIcd10() {
		return implement(v1.formulary.icd10.search).handler(async ({ input }) => {
			return this.formularyService.searchIcd10(input)
		})
	}

	@Implement(v1.formulary.loinc.search)
	async searchLoinc() {
		return implement(v1.formulary.loinc.search).handler(async ({ input }) => {
			return this.formularyService.searchLoinc(input)
		})
	}

	@Implement(v1.formulary.rxnorm.search)
	async searchRxnorm() {
		return implement(v1.formulary.rxnorm.search).handler(async ({ input }) => {
			return this.formularyService.searchRxnorm(input)
		})
	}

	@Implement(v1.formulary.rvs.search)
	async searchRvs() {
		return implement(v1.formulary.rvs.search).handler(async ({ input }) => {
			return this.formularyService.searchRvs(input)
		})
	}
}
