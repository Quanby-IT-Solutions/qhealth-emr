"use client"

import { useEffect, useState } from "react"
import { Wifi, WifiOff } from "lucide-react"

import { Alert, AlertDescription } from "@/core/components/ui/alert"

import { useOfflineSync } from "../lib/use-offline-sync"

export function OfflineModeIndicator() {
	const { isOnline } = useOfflineSync()
	const [showSyncing, setShowSyncing] = useState(false)
	const [prevOnline, setPrevOnline] = useState(isOnline)

	useEffect(() => {
		if (!prevOnline && isOnline) {
			setShowSyncing(true)
			const timer = setTimeout(() => setShowSyncing(false), 3000)
			setPrevOnline(isOnline)
			return () => clearTimeout(timer)
		}
		setPrevOnline(isOnline)
	}, [isOnline, prevOnline])

	if (isOnline && !showSyncing) return null

	return (
		<Alert
			className={
				isOnline
					? "rounded-none border-x-0 border-t-0 border-green-300 bg-green-50 text-green-800"
					: "rounded-none border-x-0 border-t-0 border-amber-300 bg-amber-50 text-amber-800"
			}
		>
			{isOnline ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}
			<AlertDescription className="text-inherit">
				{isOnline ? "Back online — syncing…" : "You are offline — viewing cached data"}
			</AlertDescription>
		</Alert>
	)
}
