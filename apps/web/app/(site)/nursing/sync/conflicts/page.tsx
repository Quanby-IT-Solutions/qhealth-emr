"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { CheckCircle2 } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { useNursingSync } from "@/features/nursing/lib/use-nursing-sync"
import { SyncConflict } from "@/features/nursing/components/sync-conflict"
import type { ConflictRecord } from "@/features/nursing/components/sync-conflict"

export default function NursingConflictPage() {
	const router = useRouter()
	const { conflicts, resolveConflict } = useNursingSync()
	const [allResolved, setAllResolved] = useState(false)

	// Map IndexedDB ConflictEntry → SyncConflict ConflictRecord shape
	const conflictRecords: ConflictRecord[] = conflicts.map((c) => ({
		id: c.id,
		recordType: c.recordType,
		description: c.description,
		localUpdatedAt: c.localUpdatedAt,
		serverUpdatedAt: c.serverUpdatedAt,
		fields: c.fields,
	}))

	async function handleAllResolved() {
		// Persist each conflict resolution (remove from store)
		await Promise.all(conflicts.map((c) => resolveConflict(c.id)))
		setAllResolved(true)
	}

	if (allResolved || conflictRecords.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-20 text-center">
				<div className="rounded-full bg-green-100 p-3 dark:bg-green-900/20">
					<CheckCircle2 className="size-10 text-green-600" />
				</div>
				<h1 className="mt-4 text-2xl font-semibold">
					{conflictRecords.length === 0 && !allResolved
						? "No Conflicts"
						: "Conflicts Resolved"}
				</h1>
				<p className="mt-2 text-muted-foreground">
					{conflictRecords.length === 0 && !allResolved
						? "There are no pending sync conflicts."
						: "All documentation has been synchronized with the master record."}
				</p>
				<Button className="mt-6" onClick={() => router.push("/nursing")}>
					Return to Dashboard
				</Button>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Conflict Resolution</h1>
				<p className="text-sm text-muted-foreground">
					A data conflict was detected during synchronization. Please choose which version to keep.
				</p>
			</div>

			<div className="w-full">
				<SyncConflict
					conflicts={conflictRecords}
					onAllResolved={() => void handleAllResolved()}
				/>
			</div>
		</div>
	)
}
