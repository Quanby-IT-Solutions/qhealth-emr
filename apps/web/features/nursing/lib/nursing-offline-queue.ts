/**
 * Offline Queue — IndexedDB store for nursing records created while offline.
 *
 * Records are written here by form submit handlers when the browser is offline.
 * The useNursingSync hook drains this queue automatically when connectivity
 * is restored, POSTing each entry to the backend and removing it on success.
 * A 409 Conflict response moves the entry to the separate conflicts store so
 * the nurse can review both versions before proceeding.
 */

const DB_NAME = "qhealth_nursing_offline"
const DB_VERSION = 1
const QUEUE_STORE = "queue"
const CONFLICT_STORE = "conflicts"

// ============================================================================
// Types
// ============================================================================

export type NursingRecordType =
	| "vital_sign"
	| "mar_entry"
	| "tar_entry"
	| "io_entry"
	| "hai_tag"
	| "handoff"

export interface QueueEntry {
	id: string
	type: NursingRecordType
	description: string
	endpoint: string
	method: "POST" | "PUT" | "PATCH"
	payload: unknown
	encounterId: string
	facilityId: string
	createdAt: string
	retries: number
}

export interface ConflictEntry {
	id: string
	recordType: string
	description: string
	localUpdatedAt: string
	serverUpdatedAt: string
	fields: ConflictField[]
	queueEntryId: string
}

export interface ConflictField {
	field: string
	label: string
	localValue: string
	serverValue: string
}

// ============================================================================
// DB Initialisation
// ============================================================================

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
	if (dbPromise) return dbPromise
	dbPromise = new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION)

		req.onupgradeneeded = () => {
			const db = req.result
			if (!db.objectStoreNames.contains(QUEUE_STORE)) {
				db.createObjectStore(QUEUE_STORE, { keyPath: "id" })
			}
			if (!db.objectStoreNames.contains(CONFLICT_STORE)) {
				db.createObjectStore(CONFLICT_STORE, { keyPath: "id" })
			}
		}

		req.onsuccess = () => resolve(req.result)
		req.onerror = () => reject(req.error)
	})
	return dbPromise
}

// ============================================================================
// Queue Operations
// ============================================================================

export async function enqueueRecord(entry: Omit<QueueEntry, "retries">): Promise<void> {
	const db = await openDb()
	return new Promise((resolve, reject) => {
		const tx = db.transaction(QUEUE_STORE, "readwrite")
		tx.objectStore(QUEUE_STORE).put({ ...entry, retries: 0 })
		tx.oncomplete = () => resolve()
		tx.onerror = () => reject(tx.error)
	})
}

export async function getAllQueued(): Promise<QueueEntry[]> {
	const db = await openDb()
	return new Promise((resolve, reject) => {
		const tx = db.transaction(QUEUE_STORE, "readonly")
		const req = tx.objectStore(QUEUE_STORE).getAll()
		req.onsuccess = () => resolve((req.result as QueueEntry[]).sort(
			(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
		))
		req.onerror = () => reject(req.error)
	})
}

export async function removeQueued(id: string): Promise<void> {
	const db = await openDb()
	return new Promise((resolve, reject) => {
		const tx = db.transaction(QUEUE_STORE, "readwrite")
		tx.objectStore(QUEUE_STORE).delete(id)
		tx.oncomplete = () => resolve()
		tx.onerror = () => reject(tx.error)
	})
}

export async function incrementRetry(id: string): Promise<void> {
	const db = await openDb()
	return new Promise((resolve, reject) => {
		const tx = db.transaction(QUEUE_STORE, "readwrite")
		const store = tx.objectStore(QUEUE_STORE)
		const req = store.get(id)
		req.onsuccess = () => {
			const entry = req.result as QueueEntry | undefined
			if (entry) {
				store.put({ ...entry, retries: entry.retries + 1 })
			}
			resolve()
		}
		req.onerror = () => reject(req.error)
	})
}

export async function clearQueue(): Promise<void> {
	const db = await openDb()
	return new Promise((resolve, reject) => {
		const tx = db.transaction(QUEUE_STORE, "readwrite")
		tx.objectStore(QUEUE_STORE).clear()
		tx.oncomplete = () => resolve()
		tx.onerror = () => reject(tx.error)
	})
}

// ============================================================================
// Conflict Operations
// ============================================================================

export async function saveConflict(conflict: ConflictEntry): Promise<void> {
	const db = await openDb()
	return new Promise((resolve, reject) => {
		const tx = db.transaction(CONFLICT_STORE, "readwrite")
		tx.objectStore(CONFLICT_STORE).put(conflict)
		tx.oncomplete = () => resolve()
		tx.onerror = () => reject(tx.error)
	})
}

export async function getAllConflicts(): Promise<ConflictEntry[]> {
	const db = await openDb()
	return new Promise((resolve, reject) => {
		const tx = db.transaction(CONFLICT_STORE, "readonly")
		const req = tx.objectStore(CONFLICT_STORE).getAll()
		req.onsuccess = () => resolve(req.result as ConflictEntry[])
		req.onerror = () => reject(req.error)
	})
}

export async function removeConflict(id: string): Promise<void> {
	const db = await openDb()
	return new Promise((resolve, reject) => {
		const tx = db.transaction(CONFLICT_STORE, "readwrite")
		tx.objectStore(CONFLICT_STORE).delete(id)
		tx.oncomplete = () => resolve()
		tx.onerror = () => reject(tx.error)
	})
}
