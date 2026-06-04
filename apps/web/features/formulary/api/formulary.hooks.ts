"use client"

import type { InferContractRouterOutputs } from "@orpc/contract"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { v1Contract } from "@repo/contracts"

import { orpc } from "@/services/orpc/client"

type V1Outputs = InferContractRouterOutputs<typeof v1Contract>
export type LoincCode = V1Outputs["formulary"]["loinc"]["search"]["data"][number]
export type CatalogType = "icd10" | "loinc" | "rxnorm" | "rvs" | "snomed_ct"

// ============================================================================
// Drug Generics
// ============================================================================

export function useDrugGenericsQuery(
	params: {
		search?: string
		isActive?: boolean
		page?: number
		limit?: number
	} = {}
) {
	return useQuery(
		orpc.formulary.drugGeneric.list.queryOptions({
			input: {
				search: params.search,
				isActive: params.isActive,
				page: params.page ?? 1,
				limit: params.limit ?? 50,
			},
			staleTime: 60 * 1000,
		})
	)
}

export function useCreateDrugGenericMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.formulary.drugGeneric.create.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.formulary.drugGeneric.key() }),
		})
	)
}

export function useUpdateDrugGenericMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.formulary.drugGeneric.update.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.formulary.drugGeneric.key() }),
		})
	)
}

// ============================================================================
// Drug Brands
// ============================================================================

export function useDrugBrandsQuery(
	params: {
		search?: string
		drugGenericId?: string
		isActive?: boolean
		page?: number
		limit?: number
	} = {}
) {
	return useQuery(
		orpc.formulary.drugBrand.list.queryOptions({
			input: {
				search: params.search,
				drugGenericId: params.drugGenericId,
				isActive: params.isActive,
				page: params.page ?? 1,
				limit: params.limit ?? 50,
			},
			staleTime: 60 * 1000,
		})
	)
}

export function useCreateDrugBrandMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.formulary.drugBrand.create.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.formulary.drugBrand.key() }),
		})
	)
}

export function useUpdateDrugBrandMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.formulary.drugBrand.update.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.formulary.drugBrand.key() }),
		})
	)
}

// ============================================================================
// Formulary Items
// ============================================================================

export function useFormularyItemsQuery(params: {
	facilityId: string
	search?: string
	drugGenericId?: string
	isActive?: boolean
	isHighAlert?: boolean
	isRestricted?: boolean
	page?: number
	limit?: number
}) {
	return useQuery(
		orpc.formulary.item.list.queryOptions({
			input: {
				facilityId: params.facilityId,
				search: params.search,
				drugGenericId: params.drugGenericId,
				isActive: params.isActive,
				isHighAlert: params.isHighAlert,
				isRestricted: params.isRestricted,
				page: params.page ?? 1,
				limit: params.limit ?? 50,
			},
			enabled: !!params.facilityId,
			staleTime: 30 * 1000,
		})
	)
}

export function useFormularyItemQuery(id: string) {
	return useQuery(
		orpc.formulary.item.get.queryOptions({
			input: { id },
			enabled: !!id,
			staleTime: 60 * 1000,
		})
	)
}

export function useCreateFormularyItemMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.formulary.item.create.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.formulary.item.key() }),
		})
	)
}

export function useUpdateFormularyItemMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.formulary.item.update.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.formulary.item.key() }),
		})
	)
}

export function useUpdateFormularyClinicalPolicyMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.formulary.item.updateClinicalPolicy.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.formulary.item.key() }),
		})
	)
}

export function useDeleteFormularyItemMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.formulary.item.delete.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.formulary.item.key() }),
		})
	)
}

// ============================================================================
// Clinical Code Sets
// ============================================================================

export function useIcd10SearchQuery(
	params: {
		search?: string
		category?: string
		page?: number
		limit?: number
	} = {}
) {
	return useQuery(
		orpc.formulary.icd10.search.queryOptions({
			input: {
				search: params.search,
				category: params.category,
				page: params.page ?? 1,
				limit: params.limit ?? 50,
			},
			staleTime: 5 * 60 * 1000,
		})
	)
}

export function useLoincSearchQuery(
	params: {
		search?: string
		page?: number
		limit?: number
	} = {}
) {
	return useQuery(
		orpc.formulary.loinc.search.queryOptions({
			input: {
				search: params.search,
				page: params.page ?? 1,
				limit: params.limit ?? 50,
			},
			staleTime: 5 * 60 * 1000,
		})
	)
}

export function useRxnormSearchQuery(
	params: {
		search?: string
		page?: number
		limit?: number
	} = {}
) {
	return useQuery(
		orpc.formulary.rxnorm.search.queryOptions({
			input: {
				search: params.search,
				page: params.page ?? 1,
				limit: params.limit ?? 50,
			},
			staleTime: 5 * 60 * 1000,
		})
	)
}

export function useRvsSearchQuery(
	params: {
		search?: string
		category?: string
		page?: number
		limit?: number
	} = {}
) {
	return useQuery(
		orpc.formulary.rvs.search.queryOptions({
			input: {
				search: params.search,
				category: params.category,
				page: params.page ?? 1,
				limit: params.limit ?? 50,
			},
			staleTime: 5 * 60 * 1000,
		})
	)
}

// ============================================================================
// SNOMED CT Codes
// ============================================================================

export function useSnomedCtSearchQuery(
	params: {
		search?: string
		semanticTag?: string
		page?: number
		limit?: number
	} = {}
) {
	return useQuery(
		orpc.formulary.snomedCt.search.queryOptions({
			input: {
				search: params.search,
				semanticTag: params.semanticTag,
				page: params.page ?? 1,
				limit: params.limit ?? 50,
			},
			staleTime: 5 * 60 * 1000,
		})
	)
}

// ============================================================================
// Code Set Admin — catalog uploads (FORM-001)
// ============================================================================

export function useCodeSetUploadsQuery(
	params: {
		catalogType?: CatalogType
		page?: number
		limit?: number
	} = {}
) {
	return useQuery(
		orpc.formulary.codeSetAdmin.listUploads.queryOptions({
			input: {
				catalogType: params.catalogType,
				page: params.page ?? 1,
				limit: params.limit ?? 50,
			},
			staleTime: 60 * 1000,
		})
	)
}

export function useRecordCatalogUploadMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.formulary.codeSetAdmin.recordUpload.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.formulary.codeSetAdmin.key() }),
		})
	)
}

export function useSetCodeActiveMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.formulary.codeSetAdmin.setCodeActive.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.formulary.key() }),
		})
	)
}

// ============================================================================
// Code Set Admin — deprecated code mappings (FORM-001)
// ============================================================================

export function useDeprecatedMappingsQuery(
	params: {
		catalogType?: CatalogType
		fromCode?: string
		isActive?: boolean
		page?: number
		limit?: number
	} = {}
) {
	return useQuery(
		orpc.formulary.codeSetAdmin.listDeprecations.queryOptions({
			input: {
				catalogType: params.catalogType,
				fromCode: params.fromCode,
				isActive: params.isActive,
				page: params.page ?? 1,
				limit: params.limit ?? 50,
			},
			staleTime: 60 * 1000,
		})
	)
}

export function useCreateDeprecationMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.formulary.codeSetAdmin.createDeprecation.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.formulary.codeSetAdmin.key() }),
		})
	)
}

export function useUpdateDeprecationMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.formulary.codeSetAdmin.updateDeprecation.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.formulary.codeSetAdmin.key() }),
		})
	)
}

export function useDeleteDeprecationMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.formulary.codeSetAdmin.deleteDeprecation.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.formulary.codeSetAdmin.key() }),
		})
	)
}

// ============================================================================
// Catalog Entry Editor — FORM-006
// ============================================================================

export function useAdminCatalogSearchQuery(
	params: {
		catalogType: "icd10" | "loinc" | "rxnorm" | "rvs" | "snomed_ct"
		search?: string
		isActive?: boolean
		page?: number
		limit?: number
	},
	options?: { enabled?: boolean }
) {
	return useQuery(
		orpc.formulary.codeSetAdmin.adminSearchEntries.queryOptions({
			input: {
				catalogType: params.catalogType,
				search: params.search,
				isActive: params.isActive,
				page: params.page ?? 1,
				limit: params.limit ?? 50,
			},
			staleTime: 30 * 1000,
			enabled: options?.enabled ?? true,
		})
	)
}

export function useCreateCatalogEntryMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.formulary.codeSetAdmin.createEntry.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.formulary.codeSetAdmin.key() }),
		})
	)
}

export function useUpdateCatalogEntryMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.formulary.codeSetAdmin.updateEntry.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.formulary.codeSetAdmin.key() }),
		})
	)
}

export function useDeleteCatalogEntryMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.formulary.codeSetAdmin.deleteEntry.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.formulary.codeSetAdmin.key() }),
		})
	)
}

// ============================================================================
// Catalog Versions — FORM-006
// ============================================================================

export function useCatalogVersionsQuery(
	params: {
		catalogType?: "icd10" | "loinc" | "rxnorm" | "rvs" | "snomed_ct"
		page?: number
		limit?: number
	} = {}
) {
	return useQuery(
		orpc.formulary.codeSetAdmin.listVersions.queryOptions({
			input: {
				catalogType: params.catalogType,
				page: params.page ?? 1,
				limit: params.limit ?? 20,
			},
			staleTime: 60 * 1000,
		})
	)
}

export function usePublishCatalogVersionMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.formulary.codeSetAdmin.publishVersion.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.formulary.codeSetAdmin.key() }),
		})
	)
}
