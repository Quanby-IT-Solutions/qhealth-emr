"use client"

import { useQuery } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

export function useBorDashboardQuery(facilityId: string, enabled = true) {
	return useQuery(
		orpc.bed.dashboard.queryOptions({
			input: { facilityId },
			enabled: enabled && !!facilityId,
			staleTime: 30 * 1000,
			refetchInterval: 60 * 1000,
		})
	)
}

export function useBorCensusQuery(params: {
	facilityId: string
	date?: string
}) {
	return useQuery(
		orpc.bed.census.queryOptions({
			input: {
				facilityId: params.facilityId,
				date: params.date,
			},
			enabled: !!params.facilityId,
			staleTime: 30 * 1000,
		})
	)
}
