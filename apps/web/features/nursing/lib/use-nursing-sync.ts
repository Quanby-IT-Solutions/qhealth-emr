"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { env } from "@/env"

import {
	getAllConflicts,
	getAllQueued,
	incrementRetry,
	removeConflict,
	removeQueued,
	saveConflict,
	type ConflictEntry,
	type QueueEntry,
} from "./nursing-offline-queue"

export type SyncPhase = "online" | "offline" | "syncing" | "conflict"

export interface NursingSyncState {
	isOnline: boolean
	syncPhase: SyncPhase
	queue: QueueEntry[]
	conflicts: ConflictEntry[]
	progress: number
	lastSyncedAt: string | null
	/** Manually trigger a sync attempt. No-op when offline or already syncing. */
	triggerSync: () => void
	/** Remove a resolved conflict from the store. */
	resolveConflict: (conflictId: string) => Promise<void>
	/** Reload queue + conflicts from IndexedDB (call after enqueuing). */
	refresh: () => Promise<void>
}

const API_BASE = `${env.NEXT_PUBLIC_API_BASE_URL}/v1/nursing`
const CLINICAL_DOCS_API_BASE = `${env.NEXT_PUBLIC_API_BASE_URL}/v1/clinical-docs`

const MAX_RETRIES = 3

// ============================================================================
// Hook
// ============================================================================

export function useNursingSync(): NursingSyncState {
	const queryClient = useQueryClient()
	const [isOnline, setIsOnline] = useState<boolean>(
		typeof navigator !== "undefined" ? navigator.onLine : true
	)
	const [queue, setQueue] = useState<QueueEntry[]>([])
	const [conflicts, setConflicts] = useState<ConflictEntry[]>([])
	const [syncPhase, setSyncPhase] = useState<SyncPhase>("online")
	const [progress, setProgress] = useState(0)
	const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
	const isSyncing = useRef(false)

	// ---- helpers -------------------------------------------------------

	const loadFromDb = useCallback(async () => {
		const [q, c] = await Promise.all([getAllQueued(), getAllConflicts()])
		setQueue(q)
		setConflicts(c)
		if (c.length > 0) {
			setSyncPhase("conflict")
		} else if (!navigator.onLine) {
			setSyncPhase(q.length > 0 ? "offline" : "offline")
		} else if (q.length > 0) {
			// Online with pending items — will be picked up by sync
			setSyncPhase("online")
		} else {
			setSyncPhase("online")
		}
	}, [])

	// ---- initial load --------------------------------------------------

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		void loadFromDb()
	}, [loadFromDb])

	// ---- sync engine ---------------------------------------------------

	const runSync = useCallback(async () => {
		if (isSyncing.current) return
		const current = await getAllQueued()
		if (current.length === 0) return

		isSyncing.current = true
		setSyncPhase("syncing")
		setProgress(0)

		let completed = 0
		const newConflicts: ConflictEntry[] = []

		for (const entry of current) {
			if (entry.retries >= MAX_RETRIES) {
				// Give up on this entry — move it to conflicts as unresolvable
				const conflict: ConflictEntry = {
					id: `conflict-${entry.id}`,
					recordType: entry.type,
					description: `${entry.description} (max retries exceeded)`,
					localUpdatedAt: entry.createdAt,
					serverUpdatedAt: new Date().toISOString(),
					fields: [],
					queueEntryId: entry.id,
				}
				await saveConflict(conflict)
				await removeQueued(entry.id)
				newConflicts.push(conflict)
				completed++
				setProgress(Math.round((completed / current.length) * 100))
				continue
			}

			try {
				const res = await fetch(endpointUrl(entry), {
					method: entry.method,
					credentials: "include",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(entry.payload),
				})

				if (res.ok) {
					await removeQueued(entry.id)
				} else if (res.status === 409) {
					// Server conflict — read server state from response
					let serverData: Record<string, unknown> = {}
					try {
						serverData = (await res.json()) as Record<string, unknown>
					} catch {
						// ignore parse errors
					}
					const conflict = buildConflict(entry, serverData)
					await saveConflict(conflict)
					await removeQueued(entry.id)
					newConflicts.push(conflict)
				} else {
					// Transient error — increment retry, leave in queue
					await incrementRetry(entry.id)
				}
			} catch {
				// Network error mid-sync — increment retry
				await incrementRetry(entry.id)
			}

			completed++
			setProgress(Math.round((completed / current.length) * 100))
		}

		isSyncing.current = false

		const remaining = await getAllQueued()
		const allConflicts = await getAllConflicts()
		setQueue(remaining)
		setConflicts(allConflicts)

		if (allConflicts.length > 0) {
			setSyncPhase("conflict")
		} else if (remaining.length > 0) {
			setSyncPhase(navigator.onLine ? "online" : "offline")
		} else {
			const now = new Date().toISOString()
			setLastSyncedAt(now)
			setSyncPhase("online")
			// Refresh server data so UI shows the newly uploaded records
			void queryClient.invalidateQueries()
		}
	}, [queryClient])

	// ---- online / offline listeners ------------------------------------

	useEffect(() => {
		function handleOnline() {
			setIsOnline(true)
			setSyncPhase(prev => (prev !== "conflict" ? "online" : "conflict"))
			void runSync()
		}

		function handleOffline() {
			setIsOnline(false)
			setSyncPhase("offline")
		}

		window.addEventListener("online", handleOnline)
		window.addEventListener("offline", handleOffline)
		return () => {
			window.removeEventListener("online", handleOnline)
			window.removeEventListener("offline", handleOffline)
		}
	}, [runSync])

	// ---- public API ----------------------------------------------------

	const triggerSync = useCallback(() => {
		if (!isOnline || isSyncing.current) return
		void runSync()
	}, [isOnline, runSync])

	const resolveConflict = useCallback(
		async (conflictId: string) => {
			await removeConflict(conflictId)
			const remaining = await getAllConflicts()
			setConflicts(remaining)
			if (remaining.length === 0) {
				setSyncPhase(isOnline ? "online" : "offline")
			}
		},
		[isOnline]
	)

	const refresh = useCallback(async () => {
		await loadFromDb()
	}, [loadFromDb])

	return {
		isOnline,
		syncPhase,
		queue,
		conflicts,
		progress,
		lastSyncedAt,
		triggerSync,
		resolveConflict,
		refresh,
	}
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Maps a queue entry type to the API endpoint that can accept it on reconnect.
 */
function endpointUrl(entry: QueueEntry): string {
	switch (entry.type) {
		case "clinical_note":
			return `${CLINICAL_DOCS_API_BASE}/notes`
		case "vital_sign":
			return `${API_BASE}/vitals`
		case "mar_entry":
			return `${API_BASE}/mar/${entry.id}/administer`
		case "tar_entry":
			return `${API_BASE}/tar/${entry.id}/administer`
		case "io_entry":
			return `${API_BASE}/io`
		case "hai_tag":
			return `${API_BASE}/hai-tags`
		case "handoff":
			return `${API_BASE}/handoffs`
	}
}

/**
 * Constructs a ConflictEntry from a failed 409 response.
 * Attempts to extract differing fields from the server response body.
 */
function buildConflict(entry: QueueEntry, serverData: Record<string, unknown>): ConflictEntry {
	const localPayload = (entry.payload ?? {}) as Record<string, unknown>
	const fields = Object.keys(localPayload)
		.filter(k => k in serverData && String(serverData[k]) !== String(localPayload[k]))
		.slice(0, 8) // cap at 8 fields for readability
		.map(k => ({
			field: k,
			label: humanizeKey(k),
			localValue: String(localPayload[k] ?? ""),
			serverValue: String(serverData[k] ?? ""),
		}))

	return {
		id: `conflict-${entry.id}`,
		recordType: humanizeType(entry.type),
		description: entry.description,
		localUpdatedAt: entry.createdAt,
		serverUpdatedAt: (serverData.updatedAt as string | undefined) ?? new Date().toISOString(),
		fields,
		queueEntryId: entry.id,
	}
}

function humanizeKey(key: string): string {
	return key
		.replace(/([A-Z])/g, " $1")
		.replace(/_/g, " ")
		.replace(/^\s/, "")
		.split(" ")
		.map(w => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ")
}

function humanizeType(type: QueueEntry["type"]): string {
	const map: Record<QueueEntry["type"], string> = {
		clinical_note: "Clinical Note",
		vital_sign: "Vital Signs",
		mar_entry: "MAR Administration",
		tar_entry: "TAR Treatment",
		io_entry: "I/O Entry",
		hai_tag: "HAI Tag",
		handoff: "Shift Handoff",
	}
	return map[type]
}
