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
