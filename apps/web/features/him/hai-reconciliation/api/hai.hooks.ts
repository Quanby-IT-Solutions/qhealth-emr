"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { himOrpc, orpc } from "@/services/orpc/client"

export function useHaiQuery(input: {
	facilityId: string
	page?: number
	limit?: number
	haiType?: "clabsi" | "cauti" | "vap" | "ssi" | "cdiff"
	wardId?: string
	dateFrom?: string
	dateTo?: string
}) {
	return useQuery(
		himOrpc.listHai.queryOptions({
			input: { page: 1, limit: 50, ...input },
		})
	)
}

export function useConfirmHaiMutation() {
	const qc = useQueryClient()
	return useMutation(
		himOrpc.confirmHai.mutationOptions({
			onSuccess: () => {
				qc.invalidateQueries({ queryKey: himOrpc.listHai.key() })
				qc.invalidateQueries({ queryKey: himOrpc.haiReport.key() })
				qc.invalidateQueries({ queryKey: orpc.adminDashboard.himOps.key() })
			},
		})
	)
}

export function useReclassifyHaiMutation() {
	const qc = useQueryClient()
	return useMutation(
		himOrpc.reclassifyHai.mutationOptions({
			onSuccess: () => {
				qc.invalidateQueries({ queryKey: himOrpc.listHai.key() })
				qc.invalidateQueries({ queryKey: himOrpc.haiReport.key() })
				qc.invalidateQueries({ queryKey: orpc.adminDashboard.himOps.key() })
			},
		})
	)
}

export function useDismissHaiMutation() {
	const qc = useQueryClient()
	return useMutation(
		himOrpc.dismissHai.mutationOptions({
			onSuccess: () => {
				qc.invalidateQueries({ queryKey: himOrpc.listHai.key() })
				qc.invalidateQueries({ queryKey: himOrpc.haiReport.key() })
				qc.invalidateQueries({ queryKey: orpc.adminDashboard.himOps.key() })
			},
		})
	)
}

export function useHaiReportQuery(input: { facilityId: string; periodStart: string; periodEnd: string }) {
	return useQuery(
		himOrpc.haiReport.queryOptions({
			input,
			enabled: !!input.facilityId && !!input.periodStart && !!input.periodEnd,
		})
	)
}

export function useHaiExportMutation() {
	return useMutation(himOrpc.haiExport.mutationOptions())
}
