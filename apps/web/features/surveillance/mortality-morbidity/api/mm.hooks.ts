"use client"

import { useMutation, useQuery } from "@tanstack/react-query"

import { reportingOrpc } from "@/services/orpc/client"

export function useMmTop10Query(input: {
	facilityId: string
	type: "mortality" | "morbidity"
	year: number
	quarter?: 1 | 2 | 3 | 4
	ward?: string
	sex?: "M" | "F"
	ageBand?: "<1" | "1-4" | "5-14" | "15-24" | "25-44" | "45-64" | "65+"
}) {
	return useQuery(reportingOrpc.getMmTop10.queryOptions({ input }))
}

export function useMmConditionQuery(
	input: { facilityId: string; icdCode: string; year: number; quarter?: 1 | 2 | 3 | 4 },
	options?: { enabled?: boolean }
) {
	return useQuery(
		reportingOrpc.getMmCondition.queryOptions({
			input,
			enabled: options?.enabled ?? true,
		})
	)
}

export function useExportMmPdfMutation() {
	return useMutation(reportingOrpc.exportMmPdf.mutationOptions())
}
