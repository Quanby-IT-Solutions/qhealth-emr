"use client"

import { useEffect } from "react"

import { env } from "@/env"

const SW_URL = "/offline-sw.js"
const OFFLINE_CACHE_PREFIX = "juanmeds-emr-offline-"

async function unregisterStaleWorkers() {
	if (!("serviceWorker" in navigator)) return
	try {
		const registrations = await navigator.serviceWorker.getRegistrations()
		await Promise.all(
			registrations
				.filter(reg => reg.active?.scriptURL.endsWith(SW_URL) || reg.installing || reg.waiting)
				.map(reg => reg.unregister().catch(() => undefined))
		)
	} catch {
		// best-effort
	}
	if ("caches" in self) {
		try {
			const keys = await caches.keys()
			await Promise.all(
				keys
					.filter(key => key.startsWith(OFFLINE_CACHE_PREFIX))
					.map(key => caches.delete(key).catch(() => undefined))
			)
		} catch {
			// best-effort
		}
	}
}

export function OfflineServiceWorkerRegistrar() {
	useEffect(() => {
		if (!("serviceWorker" in navigator)) return

		if (env.NODE_ENV !== "production") {
			void unregisterStaleWorkers()
			return
		}

		const register = async () => {
			try {
				const registration = await navigator.serviceWorker.register(SW_URL)
				await registration.update()
			} catch {
				// Offline support remains best-effort if the browser blocks service workers.
			}
		}

		void register()
	}, [])

	return null
}
