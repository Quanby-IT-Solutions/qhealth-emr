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

				const headers = [
					"id",
					"userId",
					"action",
					"entityType",
					"entityId",
					"ipAddress",
					"createdAt",
				]
				const rows = data.data.map(log =>
					headers
						.map(h => {
							const val = log[h as keyof AuditLog]
							return typeof val === "string" ? `"${val.replace(/"/g, '""')}"` : String(val ?? "")
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
	clinicianStaffId?: string
	patientId?: string
	dateFrom?: string
	dateTo?: string
	page?: number
	limit?: number
}) {
	return useQuery(
		orpc.audit.breakGlass.list.queryOptions({
			input: {
				facilityId: filter.facilityId,
				reviewStatus: filter.reviewStatus as BreakGlassEvent["reviewStatus"] | undefined,
				clinicianStaffId: filter.clinicianStaffId,
				patientId: filter.patientId,
				dateFrom: filter.dateFrom,
				dateTo: filter.dateTo,
				page: filter.page ?? 1,
				limit: filter.limit ?? 50,
			},
		})
	)
}

export function useCreateBreakGlassMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.audit.breakGlass.create.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.audit.breakGlass.list.key(),
				})
				queryClient.invalidateQueries({
					queryKey: orpc.audit.breakGlass.myActive.key(),
				})
			},
		})
	)
}

export function useBreakGlassEventDetailQuery(id: string | null) {
	return useQuery({
		...orpc.audit.breakGlass.get.queryOptions({ input: { id: id! } }),
		enabled: !!id,
	})
}

export function usePatientBreakGlassEventsQuery(params: {
	facilityId: string
	patientId: string
	reviewStatus?: string
}) {
	return useQuery(
		orpc.audit.breakGlass.list.queryOptions({
			input: {
				facilityId: params.facilityId,
				patientId: params.patientId,
				reviewStatus: params.reviewStatus as BreakGlassEvent["reviewStatus"] | undefined,
				page: 1,
				limit: 100,
			},
		})
	)
}

export function useBreakGlassExportMutation() {
	return useMutation(
		orpc.audit.breakGlass.exportCsv.mutationOptions({
			onSuccess: data => {
				if (data.data.length === 0) return

				const headers = [
					"id",
					"clinicianStaffId",
					"patientId",
					"reasonCategory",
					"justification",
					"accessGrantedAt",
					"accessExpiresAt",
					"reviewStatus",
					"reviewedByStaffId",
					"reviewNotes",
					"reviewedAt",
					"createdAt",
				]
				const rows = data.data.map(event =>
					headers
						.map(h => {
							const val = event[h as keyof typeof event]
							if (val == null) return ""
							const str = val instanceof Date ? val.toISOString() : String(val)
							return `"${str.replace(/"/g, '""')}"`
						})
						.join(",")
				)

				const csv = [headers.join(","), ...rows].join("\n")
				const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
				const url = URL.createObjectURL(blob)
				const a = document.createElement("a")
				a.href = url
				a.download = `break-glass-events-${new Date().toISOString().slice(0, 10)}.csv`
				a.click()
				URL.revokeObjectURL(url)
			},
		})
	)
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

export function useBreakGlassPatternsQuery(params: {
	facilityId: string
	days?: number
	topN?: number
}) {
	return useQuery(
		orpc.audit.breakGlass.patterns.queryOptions({
			input: {
				facilityId: params.facilityId,
				days: params.days ?? 30,
				topN: params.topN ?? 10,
			},
		})
	)
}

export function useConfigHistoryQuery(filter: {
	facilityId: string
	entityType?: string
	dateFrom?: string
	dateTo?: string
	page?: number
	limit?: number
}) {
	return useQuery(
		orpc.audit.log.configHistory.queryOptions({
			input: {
				facilityId: filter.facilityId,
				entityType: filter.entityType,
				dateFrom: filter.dateFrom,
				dateTo: filter.dateTo,
				page: filter.page ?? 1,
				limit: filter.limit ?? 50,
			},
		})
	)
}

/**
 * Check if the current user has an active break-glass session for a specific patient.
 * Returns the active event if found (accessExpiresAt > now), null otherwise.
 */
export function useMyActiveBreakGlassQuery(params: {
	facilityId: string | undefined
	patientId: string | undefined
	enabled?: boolean
}) {
	return useQuery({
		...orpc.audit.breakGlass.myActive.queryOptions({
			input: {
				facilityId: params.facilityId!,
				patientId: params.patientId!,
			},
		}),
		enabled: (params.enabled ?? true) && !!params.facilityId && !!params.patientId,
	})
}
