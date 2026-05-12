"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { mswOrpc } from "@/services/orpc/client"

export function useAncillaryQueueQuery(input: {
	ancillaryType?: "Lab" | "Imaging" | "Pharmacy"
	encounterId?: string
}) {
	return useQuery(
		mswOrpc.ancillaryClearance.queue.queryOptions({
			input,
			refetchInterval: 30_000,
		})
	)
}

export function useAncillaryClearanceHistoryQuery(orderId: string) {
	return useQuery(
		mswOrpc.ancillaryClearance.history.queryOptions({
			input: { orderId },
			enabled: !!orderId,
		})
	)
}

export function useApplyCoverageMutation() {
	const qc = useQueryClient()
	return useMutation(
		mswOrpc.ancillaryClearance.applyCoverage.mutationOptions({
			onSuccess: () =>
				qc.invalidateQueries({ queryKey: mswOrpc.ancillaryClearance.queue.key() }),
		})
	)
}

export function useOverrideClearanceMutation() {
	const qc = useQueryClient()
	return useMutation(
		mswOrpc.ancillaryClearance.override.mutationOptions({
			onSuccess: () =>
				qc.invalidateQueries({ queryKey: mswOrpc.ancillaryClearance.queue.key() }),
		})
	)
}
