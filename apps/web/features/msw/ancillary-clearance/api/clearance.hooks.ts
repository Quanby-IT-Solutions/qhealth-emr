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

export function useAncillaryProcedureLogQuery(input: {
	facilityId?: string
	limit?: number
	enabled?: boolean
}) {
	const { enabled = true, facilityId, limit } = input

	return useQuery(
		mswOrpc.ancillaryClearance.procedureLog.queryOptions({
			input: {
				...(facilityId ? { facilityId } : {}),
				...(limit ? { limit } : {}),
			},
			enabled,
			refetchInterval: 30_000,
		})
	)
}

export function useAncillaryProcedureClearanceByMrnQuery(input: {
	facilityId?: string
	patientMrn: string
	scanType: "start" | "end"
	enabled?: boolean
}) {
	const { enabled = true, facilityId, patientMrn, scanType } = input

	return useQuery(
		mswOrpc.ancillaryClearance.resolveProcedureClearance.queryOptions({
			input: {
				...(facilityId ? { facilityId } : {}),
				patientMrn,
				scanType,
			},
			enabled: enabled && Boolean(patientMrn.trim()),
			staleTime: 0,
		})
	)
}

export function useSaveAncillaryProcedureClearanceMutation() {
	const qc = useQueryClient()
	return useMutation(
		mswOrpc.ancillaryClearance.saveProcedureClearance.mutationOptions({
			onSuccess: () => {
				qc.invalidateQueries({ queryKey: mswOrpc.ancillaryClearance.procedureLog.key() })
				qc.invalidateQueries({
					queryKey: mswOrpc.ancillaryClearance.resolveProcedureClearance.key(),
				})
				qc.invalidateQueries({ queryKey: mswOrpc.ancillaryClearance.queue.key() })
			},
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
			onSuccess: () => qc.invalidateQueries({ queryKey: mswOrpc.ancillaryClearance.queue.key() }),
		})
	)
}

export function useOverrideClearanceMutation() {
	const qc = useQueryClient()
	return useMutation(
		mswOrpc.ancillaryClearance.override.mutationOptions({
			onSuccess: () => qc.invalidateQueries({ queryKey: mswOrpc.ancillaryClearance.queue.key() }),
		})
	)
}

export function useAncillaryProcedureScanMutation() {
	const qc = useQueryClient()
	return useMutation(
		mswOrpc.ancillaryClearance.procedureScan.mutationOptions({
			onSuccess: () => {
				qc.invalidateQueries({ queryKey: mswOrpc.ancillaryClearance.procedureLog.key() })
				qc.invalidateQueries({ queryKey: mswOrpc.ancillaryClearance.queue.key() })
			},
		})
	)
}
