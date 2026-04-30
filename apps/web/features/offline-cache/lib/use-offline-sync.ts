"use client"

import { useEffect, useState } from "react"

import { useQueryClient } from "@tanstack/react-query"

/**
 * Tracks browser connectivity and performs reconnect synchronisation.
 *
 * On reconnect (`online` event) all TanStack Query caches are invalidated so
 * stale data is refreshed automatically — satisfying TOR §4.2 AC #3.
 *
 * Usage:
 * ```tsx
 * const { isOnline } = useOfflineSync()
 * if (!isOnline) return <OfflineBanner />
 * ```
 */
export function useOfflineSync() {
	const queryClient = useQueryClient()
	const [isOnline, setIsOnline] = useState<boolean>(
		typeof navigator !== "undefined" ? navigator.onLine : true
	)

	useEffect(() => {
		function handleOnline() {
			setIsOnline(true)
			// Reconnect synchronisation: invalidate all queries so the UI re-fetches
			// the latest server data now that connectivity has been restored.
			void queryClient.invalidateQueries()
		}

		function handleOffline() {
			setIsOnline(false)
		}

		window.addEventListener("online", handleOnline)
		window.addEventListener("offline", handleOffline)

		return () => {
			window.removeEventListener("online", handleOnline)
			window.removeEventListener("offline", handleOffline)
		}
	}, [queryClient])

	return { isOnline }
}
