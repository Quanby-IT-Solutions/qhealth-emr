"use client"

import { useNursingSync } from "@/features/nursing/lib/use-nursing-sync"
import { SyncStatus } from "@/features/nursing/components/sync-status"

export default function NursingSyncPage() {
	const { syncPhase, queue, progress, lastSyncedAt, triggerSync } = useNursingSync()

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Offline Synchronization</h1>
				<p className="text-sm text-muted-foreground">
					Manage documentation queued while the system was offline.
				</p>
			</div>

			<div className="w-full">
				<SyncStatus
					syncState={syncPhase}
					queue={queue}
					progress={progress}
					lastSyncedAt={lastSyncedAt}
					onSync={triggerSync}
				/>
			</div>
		</div>
	)
}
