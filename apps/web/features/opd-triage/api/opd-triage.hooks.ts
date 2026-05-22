"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

export function useCreateOpdTriageMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.opdTriage.create.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.opdTriage.key() }),
		})
	)
}

export function useOpdTriageQuery(id: string, options?: { enabled?: boolean }) {
	return useQuery(
		orpc.opdTriage.get.queryOptions({
			input: { id },
			enabled: (options?.enabled ?? true) && !!id,
		})
	)
}

export function useListPendingTriageQuery(
	params: {
		facilityId: string
		clinicianStaffId?: string
		status?: "pending_registration" | "registered"
	},
	options?: { enabled?: boolean }
) {
	return useQuery(
		orpc.opdTriage.listPending.queryOptions({
			input: params,
			enabled: (options?.enabled ?? true) && !!params.facilityId,
			staleTime: 30_000,
		})
	)
}

export function useLinkTriageToPatientMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.opdTriage.linkToPatient.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.opdTriage.key() }),
		})
	)
}

export function useCreateOpdRemoteTriageMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.opdTriage.createRemoteIntake.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.opdTriage.key() }),
		})
	)
}

export function useOpdRemoteTriageListQuery(
	params: {
		facilityId: string
		status?: "pending_arrival" | "arrived" | "cancelled" | "no_show"
	},
	options?: { enabled?: boolean }
) {
	return useQuery(
		orpc.opdTriage.listRemoteIntakes.queryOptions({
			input: params,
			enabled: (options?.enabled ?? true) && !!params.facilityId,
			refetchInterval: 30_000,
			staleTime: 15_000,
		})
	)
}

export function useMarkOpdRemoteArrivedMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.opdTriage.markRemoteArrived.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.opdTriage.key() }),
		})
	)
}

export function useCancelOpdRemoteTriageMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.opdTriage.cancelRemoteIntake.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.opdTriage.key() }),
		})
	)
}

export function useJoinOpdRemoteLiveKitRoomMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.opdTriage.joinRemoteLiveKitRoom.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.opdTriage.key() }),
		})
	)
}

export function useEndOpdRemoteLiveKitSessionMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.opdTriage.endRemoteLiveKitSession.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.opdTriage.key() }),
		})
	)
}
