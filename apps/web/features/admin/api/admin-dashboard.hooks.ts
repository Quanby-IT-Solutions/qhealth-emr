"use client"

import { useQuery } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

export function useAdminDashboardSummaryQuery() {
	return useQuery(
		orpc.adminDashboard.summary.queryOptions({
			staleTime: 60 * 1000, // 1 minute — dashboard data is not real-time
		})
	)
}

export function useHimOpsQuery() {
	return useQuery(orpc.adminDashboard.himOps.queryOptions({ staleTime: 60 * 1000 }))
}

export function useExportComplianceQuery(params?: { page?: number; limit?: number }) {
	return useQuery(
		orpc.adminDashboard.exportCompliance.queryOptions({
			input: params ?? {},
			staleTime: 30 * 1000,
		})
	)
}

export function useCivilRegistryOpsQuery() {
	return useQuery(orpc.adminDashboard.civilRegistryOps.queryOptions({ staleTime: 60 * 1000 }))
}

export function useMedicationComplianceQuery() {
	return useQuery(orpc.adminDashboard.medicationCompliance.queryOptions({ staleTime: 60 * 1000 }))
}
