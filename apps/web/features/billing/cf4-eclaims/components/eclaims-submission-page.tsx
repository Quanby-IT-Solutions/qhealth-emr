"use client"

import { useCallback, useState } from "react"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Skeleton } from "@/core/components/ui/skeleton"

import { type ClaimStatus, ClaimStatusTimeline } from "@/features/billing/components/claim-status-timeline"
import { EncounterContextBar } from "@/features/billing/components/encounter-context-bar"
import { useCf4Query, useFinalizeCf4Mutation, usePollCf4StatusMutation, useResubmitCf4Mutation } from "../api/cf4.hooks"

type Cf4Status = "draft" | "submitted" | "returned" | "resubmitted" | "approved" | "rejected"
const TIMELINE_STATUS_MAP: Record<string, ClaimStatus> = {
	draft: "draft",
	submitted: "submitted",
	returned: "returned",
	rejected: "returned",
	resubmitted: "resubmitted",
	approved: "paid",
}

interface EclaimsSubmissionPageProps {
	cf4Id: string
}

export function EclaimsSubmissionPage({ cf4Id }: EclaimsSubmissionPageProps) {
	const [resubmitOpen, setResubmitOpen] = useState(false)
	const [resubmitReason, setResubmitReason] = useState("")

	const { data: claim, isLoading } = useCf4Query(cf4Id)
	const { mutate: finalizeCf4, isPending: finalizing } = useFinalizeCf4Mutation()
	const { mutate: pollStatus, isPending: polling } = usePollCf4StatusMutation()
	const { mutate: resubmitCf4, isPending: resubmitting } = useResubmitCf4Mutation()

	const handleResubmit = useCallback(() => {
		resubmitCf4(
			{ id: cf4Id, reason: resubmitReason },
			{ onSuccess: () => { setResubmitOpen(false); setResubmitReason("") } }
		)
	}, [resubmitCf4, cf4Id, resubmitReason])

	if (isLoading) {
		return <div className="space-y-4 px-4"><EncounterContextBar /><Skeleton className="h-64 w-full" /></div>
	}

	if (!claim) {
		return (
			<div className="space-y-4 px-4">
				<EncounterContextBar />
				<Alert>
					<AlertDescription>No CF4 claim found. Generate a CF4 first.</AlertDescription>
				</Alert>
			</div>
		)
	}

	const currentStatus = claim.status as Cf4Status
	const isReturned = currentStatus === "returned" || currentStatus === "rejected"
	const timelineStatus: ClaimStatus = TIMELINE_STATUS_MAP[currentStatus] ?? "draft"
	const submittedAt = claim.submittedAt
		? (claim.submittedAt instanceof Date ? claim.submittedAt.toISOString() : String(claim.submittedAt))
		: undefined

	return (
		<div className="space-y-4">
			<EncounterContextBar />

			<div className="px-4 space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-lg font-semibold">eClaims Submission</h1>
						{claim.claimNumber && (
							<p className="text-sm text-muted-foreground">Claim #: {claim.claimNumber}</p>
						)}
					</div>
					<Badge variant={currentStatus === "approved" ? "default" : "secondary"} className="capitalize">
						{currentStatus}
					</Badge>
				</div>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm">Claim Status</CardTitle>
					</CardHeader>
					<CardContent>
						<ClaimStatusTimeline
							currentStatus={timelineStatus}
							timestamps={{ submitted: submittedAt }}
							resubmitCount={claim.resubmitCount ?? 0}
						/>
					</CardContent>
				</Card>

				<div className="flex flex-wrap gap-2">
					{currentStatus === "draft" && (
						<Button
							onClick={() => finalizeCf4({ id: cf4Id })}
							disabled={finalizing}
						>
							{finalizing ? "Submitting..." : "Submit to PhilHealth"}
						</Button>
					)}

					{currentStatus === "submitted" && (
						<Button
							variant="outline"
							onClick={() => pollStatus({ id: cf4Id })}
							disabled={polling}
						>
							{polling ? "Polling..." : "Refresh Status"}
						</Button>
					)}

					{isReturned && (
						<Button
							variant="destructive"
							onClick={() => setResubmitOpen(true)}
						>
							Resubmit Claim
						</Button>
					)}
				</div>
			</div>

			<Dialog open={resubmitOpen} onOpenChange={setResubmitOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Resubmit CF4 Claim</DialogTitle>
						<DialogDescription>
							Provide a reason for resubmission. This will be recorded in the audit log.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-2">
						<Label htmlFor="resubmit-reason">Reason for Resubmission</Label>
						<Input
							id="resubmit-reason"
							value={resubmitReason}
							onChange={e => setResubmitReason(e.target.value)}
							placeholder="e.g., Missing diagnosis code, incorrect benefit amount..."
							aria-label="Reason for resubmission"
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setResubmitOpen(false)}>Cancel</Button>
						<Button
							onClick={handleResubmit}
							disabled={!resubmitReason.trim() || resubmitting}
						>
							{resubmitting ? "Resubmitting..." : "Confirm Resubmit"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
