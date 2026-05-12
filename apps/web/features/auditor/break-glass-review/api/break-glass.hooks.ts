"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { BreakGlassEvent } from "@repo/contracts"

import { orpc } from "@/services/orpc/client"

export type { BreakGlassEvent }

export function useBreakGlassInboxQuery(filter: {
	facilityId: string
	status?: string
	clinicianId?: string
	dateFrom?: string
	dateTo?: string
	slaBreached?: boolean
	page?: number
	limit?: number
}) {
	return useQuery(
		orpc.auditor.breakGlass.inboxList.queryOptions({
			input: {
				facilityId: filter.facilityId,
				status: filter.status as "pending" | "appropriate" | "flagged" | undefined,
				clinicianId: filter.clinicianId,
				dateFrom: filter.dateFrom,
				dateTo: filter.dateTo,
				slaBreached: filter.slaBreached,
				page: filter.page ?? 1,
				limit: filter.limit ?? 50,
			},
		})
	)
}

export function useBreakGlassEventQuery(eventId: string | null) {
	return useQuery({
		...orpc.auditor.breakGlass.eventGet.queryOptions({ input: { eventId: eventId! } }),
		enabled: !!eventId,
	})
}

export function useBreakGlassHistoryByClinician(params: {
	facilityId: string
	clinicianId: string
}) {
	const enabled = !!(params.facilityId && params.clinicianId)
	return useQuery({
		...orpc.auditor.breakGlass.historyByClinician.queryOptions({
			input: { facilityId: params.facilityId, clinicianId: params.clinicianId },
		}),
		enabled,
	})
}

export function useApproveMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.auditor.breakGlass.reviewApprove.mutationOptions({
			onSuccess: () => Promise.all([
				queryClient.invalidateQueries({ queryKey: orpc.auditor.breakGlass.inboxList.key() }),
				queryClient.invalidateQueries({ queryKey: orpc.auditor.breakGlass.eventGet.key() }),
			]),
		})
	)
}

export function useFlagMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.auditor.breakGlass.reviewFlag.mutationOptions({
			onSuccess: () => Promise.all([
				queryClient.invalidateQueries({ queryKey: orpc.auditor.breakGlass.inboxList.key() }),
				queryClient.invalidateQueries({ queryKey: orpc.auditor.breakGlass.eventGet.key() }),
			]),
		})
	)
}

export function useAddNoteMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.auditor.breakGlass.reviewAddNote.mutationOptions({
			onSuccess: () => Promise.all([
				queryClient.invalidateQueries({ queryKey: orpc.auditor.breakGlass.inboxList.key() }),
				queryClient.invalidateQueries({ queryKey: orpc.auditor.breakGlass.eventGet.key() }),
			]),
		})
	)
}
