"use client"

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { AuditorEventListFilter } from "@repo/contracts"

import { orpc } from "@/services/orpc/client"

export type { AuditorEventListFilter }

export function useAuditLogsQuery(filter: AuditorEventListFilter) {
	return useQuery(orpc.auditor.events.list.queryOptions({ input: filter }))
}

// Cursor-based infinite query for large datasets (Load More pattern)
export function useInfiniteAuditLogsQuery(filter: Omit<AuditorEventListFilter, "cursor" | "page">) {
	return useInfiniteQuery(
		orpc.auditor.events.list.infiniteOptions({
			input: (cursor: string | undefined) => ({ ...filter, cursor, page: 1 }),
			initialPageParam: undefined as string | undefined,
			getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
		})
	)
}

export function useAuditLogDetailQuery(id: string | null) {
	return useQuery({
		...orpc.auditor.events.get.queryOptions({ input: { id: id! } }),
		enabled: !!id,
	})
}

export function useAuditEventSessionQuery(sessionId: string, facilityId: string) {
	return useQuery({
		...orpc.auditor.events.session.queryOptions({ input: { sessionId, facilityId } }),
		enabled: !!sessionId,
	})
}

export function useAuditLogExportMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.auditor.events.export.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({
					queryKey: orpc.auditor.events.list.key(),
				}),
		})
	)
}
