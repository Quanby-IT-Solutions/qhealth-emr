"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { AuditLog, AuditLogFilter, BreakGlassEvent } from "@repo/contracts"

import { orpc } from "@/services/orpc/client"

export type { AuditLog, AuditLogFilter, BreakGlassEvent }

// ===========================================================================
// Audit Log Hooks
// ===========================================================================

export function useAuditLogsQuery(filter: AuditLogFilter) {
	return useQuery(orpc.audit.log.list.queryOptions({ input: filter }))
}

export function useAuditLogDetailQuery(id: string | null) {
	return useQuery({
		...orpc.audit.log.get.queryOptions({ input: { id: id! } }),
		enabled: !!id,
	})
}

export function useAuditLogExportMutation() {
	return useMutation(
		orpc.audit.log.exportCsv.mutationOptions({
			onSuccess: data => {
				if (data.data.length === 0) return

				const headers = ["id", "userId", "action", "entityType", "entityId", "ipAddress", "createdAt"]
				const rows = data.data.map(log =>
					headers
						.map(h => {
							const val = log[h as keyof AuditLog]
							return typeof val === "string"
								? `"${val.replace(/"/g, '""')}"`
								: String(val ?? "")
						})
						.join(",")
				)

				const csv = [headers.join(","), ...rows].join("\n")
				const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
				const url = URL.createObjectURL(blob)
				const a = document.createElement("a")
				a.href = url
				a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
				a.click()
				URL.revokeObjectURL(url)
			},
		})
	)
}

// ===========================================================================
// Break Glass Hooks
// ===========================================================================

export function useBreakGlassEventsQuery(filter: {
	facilityId: string
	reviewStatus?: string
	page?: number
	limit?: number
}) {
	return useQuery(
		orpc.audit.breakGlass.list.queryOptions({
			input: {
				facilityId: filter.facilityId,
				reviewStatus: filter.reviewStatus as BreakGlassEvent["reviewStatus"] | undefined,
				page: filter.page ?? 1,
				limit: filter.limit ?? 50,
			},
		})
	)
}

export function useCreateBreakGlassMutation() {
	return useMutation(orpc.audit.breakGlass.create.mutationOptions())
}

export function useReviewBreakGlassMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.audit.breakGlass.review.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({
					queryKey: orpc.audit.breakGlass.list.key(),
				}),
		})
	)
}

