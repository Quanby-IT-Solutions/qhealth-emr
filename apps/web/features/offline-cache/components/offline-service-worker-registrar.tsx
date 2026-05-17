"use client"

import { useEffect } from "react"

export function OfflineServiceWorkerRegistrar() {
	useEffect(() => {
		if (!("serviceWorker" in navigator)) return

		const register = async () => {
			try {
				const registration = await navigator.serviceWorker.register("/offline-sw.js")
				await registration.update()
			} catch {
				// Offline support remains best-effort if the browser blocks service workers.
			}
		}

		void register()
	}, [])

	return null
}
