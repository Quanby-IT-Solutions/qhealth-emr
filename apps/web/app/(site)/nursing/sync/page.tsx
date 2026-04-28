"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { SyncStatus } from "@/features/nursing/components/sync-status"

export default function NursingSyncPage() {
	const { data: profile } = useMyProfile()
	// In a real implementation, we would fetch the actual queue from IndexedDB
	// For this demo/implementation template, we'll provide some mock data
	const mockQueue = [
		{
			id: "q1",
			type: "vital_sign" as const,
			description: "BP 120/80, HR 72",
			createdAt: new Date().toISOString(),
		},
		{
			id: "q2",
			type: "handoff" as const,
			description: "SBAR Shift Transition Note",
			createdAt: new Date().toISOString(),
		},
	]

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Offline Synchronization</h1>
				<p className="text-sm text-muted-foreground">
					Manage documentation queued while the system was offline.
				</p>
			</div>

			<div className="w-full">
				<SyncStatus initialQueue={mockQueue} />
			</div>
		</div>
	)
}
