"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { billingOrpc } from "@/services/orpc/client"

export function useVerifyCewsMutation() {
	return useMutation(billingOrpc.verifyCewsMembership.mutationOptions())
}

export function useSaveCewsSnapshotMutation() {
	const qc = useQueryClient()
	return useMutation(
		billingOrpc.saveCewsSnapshot.mutationOptions({
			onSuccess: () => qc.invalidateQueries({ queryKey: billingOrpc.listCewsSnapshots.key() }),
		})
	)
}

export function useListCewsSnapshotsQuery(encounterId: string) {
	return useQuery(
		billingOrpc.listCewsSnapshots.queryOptions({
			input: { encounterId },
			enabled: !!encounterId,
		})
	)
}

export function useCheckCewsMutation() {
	return useMutation(billingOrpc.checkCews.mutationOptions())
}
