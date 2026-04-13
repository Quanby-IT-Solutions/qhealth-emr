"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

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
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.formulary.drugBrand.key() }),
		})
	)
}

export function useUpdateDrugBrandMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.formulary.drugBrand.update.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.formulary.drugBrand.key() }),
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
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.formulary.item.key() }),
		})
	)
}

export function useUpdateFormularyItemMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.formulary.item.update.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.formulary.item.key() }),
		})
	)
}

export function useDeleteFormularyItemMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.formulary.item.delete.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.formulary.item.key() }),
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
