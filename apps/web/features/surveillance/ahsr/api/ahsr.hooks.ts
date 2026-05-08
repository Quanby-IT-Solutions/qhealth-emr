"use client"

import { useMutation, useQuery } from "@tanstack/react-query"

import { reportingOrpc } from "@/services/orpc/client"

export function useValidateAhsrQuery(
	input: { facilityId: string; year: number; quarter?: 1 | 2 | 3 | 4 },
	options?: { enabled?: boolean }
) {
	return useQuery(
		reportingOrpc.validateAhsr.queryOptions({
			input: { page: 1, limit: 50, ...input },
			enabled: options?.enabled ?? true,
		})
	)
}

export function useExportAhsrMutation() {
	return useMutation(reportingOrpc.exportAhsr.mutationOptions())
}
