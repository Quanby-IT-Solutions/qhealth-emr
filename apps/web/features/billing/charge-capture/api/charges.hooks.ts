"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { billingOrpc } from "@/services/orpc/client"

export function useChargesQuery(encounterId: string, facilityId: string) {
	return useQuery(
		billingOrpc.listCharges.queryOptions({
			input: { encounterId, facilityId, page: 1, limit: 200 },
		})
	)
}

export function useCreateChargeMutation(encounterId: string) {
	const qc = useQueryClient()
	void encounterId
	return useMutation(
		billingOrpc.createCharge.mutationOptions({
			onSuccess: () =>
				qc.invalidateQueries({ queryKey: billingOrpc.listCharges.key() }),
		})
	)
}

export function useUpdateChargeMutation() {
	const qc = useQueryClient()
	return useMutation(
		billingOrpc.updateCharge.mutationOptions({
			onSuccess: () =>
				qc.invalidateQueries({ queryKey: billingOrpc.listCharges.key() }),
		})
	)
}

export function useDeleteChargeMutation() {
	const qc = useQueryClient()
	return useMutation(
		billingOrpc.deleteCharge.mutationOptions({
			onSuccess: () =>
				qc.invalidateQueries({ queryKey: billingOrpc.listCharges.key() }),
		})
	)
}

export function useMarkReadyMutation() {
	const qc = useQueryClient()
	return useMutation(
		billingOrpc.markReadyForInvoicing.mutationOptions({
			onSuccess: () => {
				qc.invalidateQueries({ queryKey: billingOrpc.listCharges.key() })
				qc.invalidateQueries({ queryKey: billingOrpc.getBillingStatus.key() })
			},
		})
	)
}

type CatalogCategory = "laboratory" | "imaging" | "medication" | "procedure" | "room" | "other"

export function useServiceCatalogQuery(
	facilityId: string,
	query: string,
	category?: CatalogCategory
) {
	return useQuery(
		billingOrpc.searchServiceCatalog.queryOptions({
			input: { facilityId, query: query || undefined, category, page: 1, limit: 20 },
			enabled: !!facilityId,
		})
	)
}
