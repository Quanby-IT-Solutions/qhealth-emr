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

import { ClaimStatusTimeline } from "@/features/billing/components/claim-status-timeline"
import { EncounterContextBar } from "@/features/billing/components/encounter-context-bar"
import { XmlPreviewPane } from "@/features/billing/components/xml-preview-pane"
import type { ClaimStatus } from "@/features/billing/components/claim-status-timeline"
import {
	useCf5WithBillingQuery,
	useGenerateCf5Mutation,
	useListCf5ClaimsQuery,
	usePollCf5StatusMutation,
	usePreviewCf5XmlQuery,
	useResubmitCf5Mutation,
	useSubmitCf5Mutation,
} from "../api/drg.hooks"

const CF5_TIMELINE_MAP: Record<string, ClaimStatus> = {
	draft: "draft",
	validated: "submitted",
	submitted: "submitted",
	rejected: "returned",
	approved: "paid",
}

interface Cf5PageProps {
	encounterId: string
}

export function Cf5Page({ encounterId }: Cf5PageProps) {
	const [resubmitOpen, setResubmitOpen] = useState(false)
	const [resubmitReason, setResubmitReason] = useState("")

	const { data: cf5Data, isLoading: cf5Loading } = useCf5WithBillingQuery(encounterId)
	const { data: claimsData, isLoading: claimsLoading } = useListCf5ClaimsQuery(encounterId)
	const latestClaim = claimsData?.claims?.[0] ?? null
	const { data: xmlData } = usePreviewCf5XmlQuery(latestClaim?.id ?? "")

	const {
		mutate: generateCf5,
		isPending: generating,
		error: generateError,
	} = useGenerateCf5Mutation()
	const {
		mutate: submitCf5,
		isPending: submitting,
		error: submitError,
	} = useSubmitCf5Mutation()
	const { mutate: pollCf5, isPending: polling } = usePollCf5StatusMutation()
	const { mutate: resubmitCf5, isPending: resubmitting } = useResubmitCf5Mutation()

	const handleResubmit = useCallback(() => {
		if (!latestClaim) return
		resubmitCf5(
			{ id: latestClaim.id, reason: resubmitReason },
			{ onSuccess: () => { setResubmitOpen(false); setResubmitReason("") } }
		)
	}, [resubmitCf5, latestClaim, resubmitReason])

	if (cf5Loading || claimsLoading) {
		return (
			<div className="space-y-4 px-4">
				<EncounterContextBar />
				<Skeleton className="h-20 w-full" />
				<Skeleton className="h-64 w-full" />
			</div>
		)
	}

	if (!cf5Data) {
		return (
			<div className="space-y-4 px-4">
				<EncounterContextBar />
				<Alert>
					<AlertDescription>No DRG mapping found. Complete the DRG mapping step first.</AlertDescription>
				</Alert>
			</div>
		)
	}

	const { cf5 } = cf5Data
	const surgicalReadiness = cf5Data.surgicalReadiness
	const claimStatus = latestClaim?.status ?? "draft"
	const timelineStatus: ClaimStatus = CF5_TIMELINE_MAP[claimStatus] ?? "draft"
	const isRejected = claimStatus === "rejected"
	const submittedAt = latestClaim?.submittedAt
		? (latestClaim.submittedAt instanceof Date ? latestClaim.submittedAt.toISOString() : String(latestClaim.submittedAt))
		: undefined

	return (
		<>
		<div className="space-y-4">
			<EncounterContextBar drgCode={cf5.drgCode} />

			<div className="px-4 grid gap-4 lg:grid-cols-2">
				{/* Left: CF5 details + controls */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-lg font-semibold">CF5 — DRG Shadow Billing</h1>
							<p className="text-sm text-muted-foreground">
								DRG: <span className="font-mono font-semibold">{cf5.drgCode}</span>
								{cf5.drgDescription && ` — ${cf5.drgDescription}`}
							</p>
						</div>
						{latestClaim && (
							<Badge variant={claimStatus === "approved" ? "default" : "secondary"} className="capitalize">
								{claimStatus}
							</Badge>
						)}
					</div>

					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm">Claim Status</CardTitle>
						</CardHeader>
						<CardContent>
							<ClaimStatusTimeline
								currentStatus={timelineStatus}
								timestamps={{ submitted: submittedAt }}
								resubmitCount={latestClaim?.resubmitCount ?? 0}
							/>
						</CardContent>
					</Card>

					{!surgicalReadiness.isReady ? (
						<Alert variant="destructive">
							<AlertDescription>
								CF5 is blocked until every signed operative procedure has a primary RVS code.
								Missing: {surgicalReadiness.missingProcedureLabels.join(", ")}.
							</AlertDescription>
						</Alert>
					) : (
						<Alert>
							<AlertDescription>
								Surgical prerequisite check passed. Each listed operative procedure has a
								primary RVS code.
							</AlertDescription>
						</Alert>
					)}

					{surgicalReadiness.procedures.length > 0 ? (
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm">Surgical RVS Readiness</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2">
								{surgicalReadiness.procedures.map(procedure => (
									<div
										key={`${procedure.operationRecordId}-${procedure.procedureLabel}`}
										className="flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm"
									>
										<div className="min-w-0">
											<p className="font-medium">{procedure.procedureLabel}</p>
											<p className="text-muted-foreground text-xs">
												{procedure.primaryCodeCount} primary • {procedure.adjunctCodeCount} adjunct
											</p>
										</div>
										<Badge variant={procedure.isReady ? "default" : "destructive"}>
											{procedure.isReady ? "Ready" : "Missing Primary"}
										</Badge>
									</div>
								))}
							</CardContent>
						</Card>
					) : null}

					{generateError ? (
						<Alert variant="destructive">
							<AlertDescription>
								{generateError instanceof Error
									? generateError.message
									: "Unable to generate CF5."}
							</AlertDescription>
						</Alert>
					) : null}

					{submitError ? (
						<Alert variant="destructive">
							<AlertDescription>
								{submitError instanceof Error
									? submitError.message
									: "Unable to submit CF5."}
							</AlertDescription>
						</Alert>
					) : null}

					<div className="flex flex-wrap gap-2">
						{!latestClaim && (
							<Button
								onClick={() => generateCf5({ facilityId: cf5.facilityId, encounterId, drgCode: cf5.drgCode })}
								disabled={generating || !surgicalReadiness.isReady}
							>
								{generating ? "Generating..." : "Generate CF5"}
							</Button>
						)}

						{latestClaim?.status === "draft" && (
							<Button
								onClick={() => submitCf5({ id: latestClaim.id })}
								disabled={submitting || !surgicalReadiness.isReady}
							>
								{submitting ? "Submitting..." : "Submit to PhilHealth"}
							</Button>
						)}

						{latestClaim?.status === "submitted" && (
							<Button
								variant="outline"
								onClick={() => pollCf5({ id: latestClaim.id })}
								disabled={polling}
							>
								{polling ? "Polling..." : "Refresh Status"}
							</Button>
						)}

						{isRejected && (
							<Button
								variant="destructive"
								onClick={() => setResubmitOpen(true)}
							>
								Resubmit CF5
							</Button>
						)}
					</div>

				</div>

				{/* Right: XML preview */}
				<div className="space-y-2">
					<h2 className="text-base font-medium">CF5 XML Preview</h2>
					{xmlData ? (
						<XmlPreviewPane
							xml={xmlData.xml}
							title={`CF5 XML — ${claimStatus}`}
							className="min-h-[400px]"
						/>
					) : (
						<div className="rounded-md border border-dashed flex items-center justify-center min-h-[200px] text-sm text-muted-foreground">
							{latestClaim ? "Loading XML..." : "Generate CF5 to see XML preview"}
						</div>
					)}
				</div>
			</div>
		</div>

		<Dialog open={resubmitOpen} onOpenChange={setResubmitOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Resubmit CF5 Claim</DialogTitle>
					<DialogDescription>
						Provide a reason for resubmission. This will be recorded in the audit log.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-2">
					<Label htmlFor="cf5-resubmit-reason">Reason for Resubmission</Label>
					<Input
						id="cf5-resubmit-reason"
						value={resubmitReason}
						onChange={e => setResubmitReason(e.target.value)}
						placeholder="e.g., DRG code corrected after final coding review..."
						aria-label="Reason for CF5 resubmission"
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
		</>
	)
}
