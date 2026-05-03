"use client"

import { useState } from "react"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"

import { useSaveCewsSnapshotMutation, useListCewsSnapshotsQuery } from "../api/cews.hooks"
import { formatPin } from "../lib/pin-format"

interface SaveToEncounterCtaProps {
	encounterId: string
	memberPin: string
	currentResult: {
		memberName: string | null
		status: "active" | "lapsed" | "suspended" | "service_unavailable"
		benefitBalance: string | null
		dependents: Array<{ name: string; relationship: string; pin: string | null }>
	}
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
	active: "default",
	lapsed: "destructive",
	suspended: "destructive",
	service_unavailable: "outline",
}

export function SaveToEncounterCta({ encounterId, memberPin, currentResult }: SaveToEncounterCtaProps) {
	const [saved, setSaved] = useState(false)
	const { mutate: save, isPending } = useSaveCewsSnapshotMutation()
	const { data: snapshotsData } = useListCewsSnapshotsQuery(encounterId)

	const priorSnapshot = snapshotsData?.snapshots?.[0] ?? null

	const changes: string[] = []
	if (priorSnapshot) {
		if (priorSnapshot.status !== currentResult.status)
			changes.push(`Status: ${priorSnapshot.status} → ${currentResult.status}`)
		const priorBalance = Number(priorSnapshot.benefitBalance ?? 0)
		const currentBalance = Number(currentResult.benefitBalance ?? 0)
		if (priorBalance !== currentBalance)
			changes.push(
				`Benefit Balance: ₱${priorBalance.toLocaleString("en-PH")} → ₱${currentBalance.toLocaleString("en-PH")}`
			)
	}

	function handleSave() {
		save(
			{
				encounterId,
				memberPin: memberPin.replace(/-/g, ""),
				memberName: currentResult.memberName,
				status: currentResult.status,
				benefitBalance: currentResult.benefitBalance ? Number(currentResult.benefitBalance) : null,
			},
			{
				onSuccess: () => setSaved(true),
			}
		)
	}

	if (saved) {
		return (
			<Alert>
				<AlertDescription className="text-xs">
					Snapshot saved to encounter. Visible on CF4 and eSOA pages.
				</AlertDescription>
			</Alert>
		)
	}

	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm">Save to Encounter</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="rounded-md bg-muted p-3 space-y-1.5 text-sm">
					<div className="flex justify-between">
						<span className="text-muted-foreground">PIN</span>
						<span className="font-mono">{formatPin(memberPin)}</span>
					</div>
					<div className="flex justify-between items-center">
						<span className="text-muted-foreground">Status</span>
						<Badge variant={STATUS_VARIANT[currentResult.status] ?? "outline"}>
							{currentResult.status}
						</Badge>
					</div>
					{currentResult.benefitBalance !== null && (
						<div className="flex justify-between">
							<span className="text-muted-foreground">Benefit Balance</span>
							<span className="tabular-nums">
								₱{Number(currentResult.benefitBalance).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
							</span>
						</div>
					)}
				</div>

				{priorSnapshot && changes.length > 0 && (
					<>
						<Separator />
						<div className="space-y-1">
							<p className="text-xs font-medium text-muted-foreground">Changes from prior snapshot:</p>
							<ul className="list-disc list-inside text-xs space-y-0.5">
								{changes.map(c => <li key={c}>{c}</li>)}
							</ul>
						</div>
					</>
				)}

				{priorSnapshot && changes.length === 0 && (
					<p className="text-xs text-muted-foreground">No changes from prior snapshot.</p>
				)}

				<Button onClick={handleSave} disabled={isPending} size="sm" className="w-full">
					{isPending ? "Saving..." : "Save Snapshot to Encounter"}
				</Button>
			</CardContent>
		</Card>
	)
}
