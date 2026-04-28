"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { CheckCircle2 } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { SyncConflict } from "@/features/nursing/components/sync-conflict"

export default function NursingConflictPage() {
	const router = useRouter()
	const [isResolved, setIsResolved] = useState(false)

	// Mock conflicts for Story 18.2 verification
	const mockConflicts = [
		{
			id: "c1",
			recordType: "Vital Signs",
			description: "Temperature conflict for Encounter #102",
			localUpdatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
			serverUpdatedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
			fields: [
				{
					field: "temperature",
					label: "Temperature (°C)",
					localValue: "38.5",
					serverValue: "38.2",
				},
				{
					field: "recordedAt",
					label: "Time of Recording",
					localValue: "10:45 AM",
					serverValue: "10:48 AM",
				},
			],
		},
	]

	if (isResolved) {
		return (
			<div className="flex flex-col items-center justify-center py-20 text-center">
				<div className="rounded-full bg-green-100 p-3 dark:bg-green-900/20">
					<CheckCircle2 className="size-10 text-green-600" />
				</div>
				<h1 className="mt-4 text-2xl font-semibold">Conflicts Resolved</h1>
				<p className="mt-2 text-muted-foreground">
					All documentation has been synchronized with the master record.
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
					conflicts={mockConflicts} 
					onAllResolved={() => setIsResolved(true)} 
				/>
			</div>
		</div>
	)
}
