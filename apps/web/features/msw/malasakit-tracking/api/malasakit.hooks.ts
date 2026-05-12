"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { mswOrpc } from "@/services/orpc/client"

export function useMalasakitCasesQuery(input: {
	source?: "DSWD" | "PCSO" | "DOH-MAIFIP"
	status?: "pending" | "approved" | "released" | "denied"
	patientId?: string
	encounterId?: string
	page?: number
	limit?: number
	dateFrom?: string
	dateTo?: string
}) {
	return useQuery(
		mswOrpc.malasakit.list.queryOptions({
			input: { ...input, page: input.page ?? 1, limit: input.limit ?? 25 },
		})
	)
}

export function useMalasakitCaseQuery(id: string) {
	return useQuery(
		mswOrpc.malasakit.get.queryOptions({
			input: { id },
			enabled: !!id,
		})
	)
}

export function useMalasakitStatusLogQuery(caseId: string) {
	return useQuery(
		mswOrpc.malasakit.statusLog.queryOptions({
			input: { caseId },
			enabled: !!caseId,
		})
	)
}

export function useCreateMalasakitCaseMutation() {
	const qc = useQueryClient()
	return useMutation(
		mswOrpc.malasakit.create.mutationOptions({
			onSuccess: () =>
				qc.invalidateQueries({ queryKey: mswOrpc.malasakit.list.key() }),
		})
	)
}

export function useUpdateMalasakitCaseMutation() {
	const qc = useQueryClient()
	return useMutation(
		mswOrpc.malasakit.update.mutationOptions({
			onSuccess: () =>
				Promise.all([
					qc.invalidateQueries({ queryKey: mswOrpc.malasakit.list.key() }),
					qc.invalidateQueries({ queryKey: mswOrpc.malasakit.get.key() }),
					qc.invalidateQueries({ queryKey: mswOrpc.malasakit.statusLog.key() }),
				]),
		})
	)
}

export function useReconcileMalasakitMutation() {
	const qc = useQueryClient()
	return useMutation(
		mswOrpc.malasakit.reconcile.mutationOptions({
			onSuccess: () =>
				qc.invalidateQueries({ queryKey: mswOrpc.malasakit.list.key() }),
		})
	)
}
