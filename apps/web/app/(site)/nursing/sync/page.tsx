"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { SyncStatus } from "@/features/nursing/components/sync-status"
import { useNursingSync } from "@/features/nursing/lib/use-nursing-sync"

export default function NursingSyncPage() {
	const router = useRouter()
	const { syncPhase, queue, progress, lastSyncedAt, triggerSync } = useNursingSync()

	const handleBack = () => {
		if (window.history.length > 1) {
			router.back()
			return
		}

		router.push("/nursing")
	}

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<Button variant="ghost" size="sm" onClick={handleBack} className="w-fit">
					<ArrowLeft className="size-4" />
					Back
				</Button>

				<div>
					<h1 className="text-2xl font-semibold">Offline Synchronization</h1>
					<p className="text-muted-foreground text-sm">
						Manage documentation queued while the system was offline.
					</p>
				</div>
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
