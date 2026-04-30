"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

export function useFacilityProfileQuery() {
	return useQuery(orpc.facilityProfile.get.queryOptions())
}

export function useUpdateFacilityProfileMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.facilityProfile.update.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({
					queryKey: orpc.facilityProfile.key(),
				}),
		})
	)
}
