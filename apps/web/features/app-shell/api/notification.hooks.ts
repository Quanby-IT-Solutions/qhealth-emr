"use client"

import { useQuery } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

export function useUnreadNotificationCount(facilityId: string | undefined) {
	return useQuery(
		orpc.notification.unreadCount.queryOptions({
			input: { facilityId: facilityId! },
			enabled: !!facilityId,
			refetchInterval: 30_000,
			staleTime: 10_000,
		})
	)
}
