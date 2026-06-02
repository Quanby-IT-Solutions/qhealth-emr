"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { env } from "@/env"
import { orpc } from "@/services/orpc/client"

export function useWardsQuery(facilityId: string) {
	return useQuery(
		orpc.bed.listWards.queryOptions({
			input: { facilityId },
			enabled: !!facilityId,
			staleTime: 60_000,
		})
	)
}

export function useBedListQuery(
	params: { facilityId: string; wardId?: string; status?: "available" | "occupied" | "out_of_service" | "dirty" | "reserved" | "cleaning" | "pending_transfer" },
	options?: { enabled?: boolean }
) {
	return useQuery(
		orpc.bed.listBeds.queryOptions({
			input: params,
			enabled: (options?.enabled ?? true) && !!params.facilityId,
		})
	)
}

export function useCreateWardMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.bed.createWard.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.bed.key() }),
		})
	)
}

export function useCreateBedMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.bed.createBed.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.bed.key() }),
		})
	)
}

export function useUpdateBedStatusMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.bed.updateBedStatus.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.bed.key() }),
		})
	)
}

export function useBedCensusQuery(
	params: { facilityId: string; date?: string },
	options?: { enabled?: boolean }
) {
	return useQuery(
		orpc.bed.census.queryOptions({
			input: params,
			enabled: (options?.enabled ?? true) && !!params.facilityId,
		})
	)
}

// ============================================================================
// Bed Suggestion (AI-assisted assignment)
// ============================================================================

interface BedSuggestionInput {
	facilityId: string
	patientId: string
	encounterId?: string
	admissionType: "inpatient" | "observation" | "icu" | "er"
	primaryDiagnosis?: string
	isolationRequired?: boolean
	telemetryRequired?: boolean
	preferredWardId?: string
}

interface SuggestedBed {
	bedId: string
	bedNumber: string
	wardId: string
	wardName: string
	score: number // 0-100 match score
	reasons: string[]
}

interface BedSuggestionResponse {
	suggestions: SuggestedBed[]
	availableCount: number
	message: string | null
}

export function useBedSuggestionMutation() {
	return useMutation({
		mutationFn: async (data: BedSuggestionInput) => {
			const res = await fetch(
				`${env.NEXT_PUBLIC_API_BASE_URL}/v1/beds/suggest`,
				{
					method: "POST",
					credentials: "include",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(data),
				}
			)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			return res.json() as Promise<BedSuggestionResponse>
		},
	})
}

// ============================================================================
// Census Metrics (detailed dashboard metrics)
// ============================================================================

interface CensusMetrics {
	facilityId: string
	date: string
	totalBeds: number
	occupiedBeds: number
	availableBeds: number
	outOfServiceBeds: number
	occupancyRate: number // percentage
	byWard: Array<{
		wardId: string
		wardName: string
		wardType: string
		totalBeds: number
		occupiedBeds: number
		availableBeds: number
		occupancyRate: number
	}>
	byBedClass: Array<{
		bedClass: string
		totalBeds: number
		occupiedBeds: number
		availableBeds: number
	}>
	admissionsToday: number
	dischargesToday: number
	transfersToday: number
	pendingDischarges: number
}

export function useCensusMetricsQuery(
	params: { facilityId: string; date?: string },
	options?: { enabled?: boolean }
) {
	return useQuery({
		queryKey: ["beds", "census-metrics", params] as const,
		queryFn: async () => {
			const queryParams = new URLSearchParams({ facilityId: params.facilityId })
			if (params.date) queryParams.set("date", params.date)
			const res = await fetch(
				`${env.NEXT_PUBLIC_API_BASE_URL}/v1/beds/census/metrics?${queryParams}`,
				{ credentials: "include" }
			)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			return res.json() as Promise<CensusMetrics>
		},
		enabled: (options?.enabled ?? true) && !!params.facilityId,
		refetchInterval: 60_000, // Auto-refresh every minute
	})
}
