"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

// ============================================================================
// ED Queue
// ============================================================================

export function useEdQueueQuery(facilityId: string) {
	return useQuery(
		orpc.ed.getQueue.queryOptions({
			input: { facilityId },
			enabled: !!facilityId,
			refetchInterval: 30_000, // Auto-refresh every 30 s (SSE events refresh sooner)
		})
	)
}

// ============================================================================
// Pre-Encounter CRUD
// ============================================================================

interface PreEncounterListParams {
	facilityId: string
	status?: "active" | "merged" | "cancelled"
	page?: number
	limit?: number
}

export function usePreEncounterListQuery(params: PreEncounterListParams) {
	return useQuery(
		orpc.ed.listPreEncounters.queryOptions({
			input: {
				facilityId: params.facilityId,
				status: params.status,
				page: params.page ?? 1,
				limit: params.limit ?? 50,
			},
			enabled: !!params.facilityId,
		})
	)
}

export function usePreEncounterDetailQuery(id: string) {
	return useQuery(
		orpc.ed.getPreEncounter.queryOptions({
			input: { id },
			enabled: !!id,
		})
	)
}

export function useCreatePreEncounterMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.ed.createPreEncounter.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.ed.key() }),
		})
	)
}

export function useUpdatePreEncounterMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.ed.updatePreEncounter.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.ed.key() }),
		})
	)
}

export function useCancelPreEncounterMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.ed.cancelPreEncounter.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.ed.key() }),
		})
	)
}

// ============================================================================
// Merge
// ============================================================================

export function useMergePreviewQuery(preEncounterId: string, patientId: string) {
	return useQuery(
		orpc.ed.mergePreview.queryOptions({
			input: { preEncounterId, patientId },
			enabled: !!preEncounterId && !!patientId,
		})
	)
}

export function useMergePreEncounterMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.ed.merge.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.ed.key() }),
		})
	)
}

// ============================================================================
// Queue Status Update (tracking board drag)
// ============================================================================

export function useUpdateQueueStatusMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.ed.updateQueueStatus.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.ed.key() }),
		})
	)
}

// ============================================================================
// ED Disposition
// ============================================================================

export function useEdDispositionMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.ed.dispose.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.ed.key() }),
		})
	)
}

// ============================================================================
// Tele-Triage — Inbound Patient Management
// ============================================================================

export function useInboundTriageListQuery(
	facilityId: string,
	status?: "queued" | "arrived" | "cancelled"
) {
	return useQuery(
		orpc.ed.listInboundTriage.queryOptions({
			input: { facilityId, status },
			enabled: !!facilityId,
			refetchInterval: 30_000,
		})
	)
}

export function useCreateInboundTriageMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.ed.createInboundTriage.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.ed.key() }),
		})
	)
}

export function useMarkInboundArrivedMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.ed.markInboundArrived.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.ed.key() }),
		})
	)
}

export function useCancelInboundTriageMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.ed.cancelInboundTriage.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.ed.key() }),
		})
	)
}
