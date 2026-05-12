"use client"

import { useState } from "react"

import Link from "next/link"
import { useParams } from "next/navigation"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/core/components/ui/collapsible"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/components/ui/dialog"
import { Label } from "@/core/components/ui/label"
import { Textarea } from "@/core/components/ui/textarea"
import {
	useApproveMutation,
	useBreakGlassEventQuery,
	useBreakGlassHistoryByClinician,
} from "@/features/auditor/break-glass-review/api/break-glass.hooks"
import { formatDateTime, STATUS_COLORS } from "@/features/auditor/break-glass-review/lib/break-glass.utils"
import { AddNoteDrawer } from "@/features/auditor/break-glass-review/components/add-note-drawer"
import { InvestigationFlagDrawer } from "@/features/auditor/break-glass-review/components/investigation-flag-drawer"

export default function BreakGlassReportPage() {
	const { eventId } = useParams<{ eventId: string }>()
	const { data: event, isLoading, error } = useBreakGlassEventQuery(eventId)

	const facilityId = event?.facilityId ?? ""
	const clinicianId = event?.clinicianStaffId ?? ""
	const { data: history } = useBreakGlassHistoryByClinician({ facilityId, clinicianId })

	const [historyOpen, setHistoryOpen] = useState(false)
	const [flagDrawer, setFlagDrawer] = useState(false)
	const [noteDrawer, setNoteDrawer] = useState(false)

	// Approve dialog state
	const [approveOpen, setApproveOpen] = useState(false)
	const [approveReason, setApproveReason] = useState("")
	const [approveError, setApproveError] = useState<string | null>(null)
	const approveMutation = useApproveMutation()

	function handleApprove() {
		setApproveError(null)
		approveMutation.mutate(
			{ eventId, reason: approveReason.trim() },
			{
				onSuccess: () => {
					setApproveOpen(false)
					setApproveReason("")
				},
				onError: err => setApproveError(err instanceof Error ? err.message : "Failed to approve"),
			}
		)
	}

	if (isLoading) {
		return <p className="p-4 text-muted-foreground">Loading break-glass event...</p>
	}

	if (error || !event) {
		return (
			<div className="space-y-4">
				<Button variant="outline" size="sm" nativeButton={false} render={<Link href="/auditor/break-glass" />}>
					← Back to Inbox
				</Button>
				<p className="text-destructive">Break-glass event not found or failed to load.</p>
			</div>
		)
	}

	const otherHistory = history?.recent.filter(e => e.id !== event.id) ?? []
	const isPending = event.reviewStatus === "pending"

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Button variant="outline" size="sm" nativeButton={false} render={<Link href="/auditor/break-glass" />}>
						← Back
					</Button>
					<div>
						<h1 className="text-xl font-bold">Break-Glass Event Report</h1>
						<p className="font-mono text-xs text-muted-foreground">{event.id}</p>
					</div>
				</div>
				{/* Reviewer action panel */}
				<div className="flex items-center gap-2">
					{isPending && (
						<Button
							size="sm"
							onClick={() => setApproveOpen(true)}
						>
							Approve
						</Button>
					)}
					<Button
						variant="outline"
						size="sm"
						onClick={() => setFlagDrawer(true)}
					>
						Flag for Investigation
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setNoteDrawer(true)}
					>
						Add Note
					</Button>
				</div>
			</div>

			{/* Event details */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>Event Details</CardTitle>
						<Badge variant="secondary" className={STATUS_COLORS[event.reviewStatus] ?? ""}>
							{event.reviewStatus}
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
					<div>
						<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Clinician Staff ID</p>
						<p className="font-mono">{event.clinicianStaffId}</p>
					</div>
					<div>
						<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Patient ID</p>
						<p className="font-mono">{event.patientId}</p>
					</div>
					<div>
						<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reason Category</p>
						<p className="capitalize">{event.reasonCategory.replace(/_/g, " ")}</p>
					</div>
					<div className="col-span-2 md:col-span-3">
						<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Justification</p>
						<p>{event.justification}</p>
					</div>
					<div>
						<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Access Granted</p>
						<p>{formatDateTime(event.accessGrantedAt)}</p>
					</div>
					<div>
						<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Access Expires</p>
						<p>{formatDateTime(event.accessExpiresAt)}</p>
					</div>
					<div>
						<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Requested</p>
						<p>{formatDateTime(event.createdAt)}</p>
					</div>
				</CardContent>
			</Card>

			{/* Accessed resources timeline */}
			{event.recordsAccessed != null && (
				<Card>
					<CardHeader>
						<CardTitle>Accessed Resources Timeline</CardTitle>
					</CardHeader>
					<CardContent>
						{Array.isArray(event.recordsAccessed) ? (
							<ol className="space-y-2">
								{(event.recordsAccessed as Array<Record<string, unknown>>).map((r, idx) => (
									<li key={idx} className="flex items-start gap-3 text-sm">
										<span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
											{idx + 1}
										</span>
										<div className="min-w-0 flex-1">
											{r.timestamp != null && (
												<p className="text-xs text-muted-foreground">{String(r.timestamp)}</p>
											)}
											<p className="font-mono text-xs break-all">
												{r.resourceType != null ? `${String(r.resourceType)}: ` : ""}
												{r.resourceId != null ? String(r.resourceId) : JSON.stringify(r)}
											</p>
										</div>
									</li>
								))}
							</ol>
						) : (
							<pre className="max-h-60 overflow-auto rounded border bg-muted p-3 text-xs">
								{JSON.stringify(event.recordsAccessed, null, 2)}
							</pre>
						)}
					</CardContent>
				</Card>
			)}

			{/* Review history */}
			{event.reviewedByStaffId && (
				<Card>
					<CardHeader>
						<CardTitle>Review</CardTitle>
					</CardHeader>
					<CardContent className="grid grid-cols-2 gap-4 text-sm">
						<div>
							<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reviewed By</p>
							<p className="font-mono">{event.reviewedByStaffId}</p>
						</div>
						<div>
							<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reviewed At</p>
							<p>{formatDateTime(event.reviewedAt)}</p>
						</div>
						{event.reviewNotes && (
							<div className="col-span-2">
								<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
								<p>{event.reviewNotes}</p>
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{/* Same-clinician history — collapsible */}
			{history && history.total > 0 && (
				<Card>
					<CardHeader>
						<Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
							<CollapsibleTrigger className="flex w-full items-center justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
								<CardTitle>
									Same-Clinician History
									<Badge variant="secondary" className="ml-2">
										{history.total}
									</Badge>
								</CardTitle>
								<span className="text-xs text-muted-foreground">{historyOpen ? "Collapse" : "Expand"}</span>
							</CollapsibleTrigger>
							<CollapsibleContent>
								<CardContent className="pt-4">
									{otherHistory.length === 0 ? (
										<p className="text-sm text-muted-foreground">No other break-glass events for this clinician.</p>
									) : (
										<ol className="space-y-2">
											{otherHistory.slice(0, 5).map(e => (
												<li key={e.id} className="flex items-center justify-between text-xs">
													<div>
														<span className="font-medium">{formatDateTime(e.createdAt)}</span>
														<span className="ml-2 capitalize text-muted-foreground">
															{e.reasonCategory.replace(/_/g, " ")}
														</span>
													</div>
													<div className="flex items-center gap-2">
														<Badge
															variant="secondary"
															className={STATUS_COLORS[e.reviewStatus] ?? ""}
														>
															{e.reviewStatus}
														</Badge>
														<Button
															variant="ghost"
															size="sm"
															nativeButton={false}
															render={<Link href={`/auditor/break-glass/${e.id}`} />}
															className="text-xs"
														>
															View →
														</Button>
													</div>
												</li>
											))}
										</ol>
									)}
								</CardContent>
							</CollapsibleContent>
						</Collapsible>
					</CardHeader>
				</Card>
			)}

			{/* Approve dialog */}
			<Dialog open={approveOpen} onOpenChange={open => { if (!open) { setApproveOpen(false); setApproveReason(""); setApproveError(null) } }}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Approve Break-Glass Access</DialogTitle>
						<DialogDescription>
							Confirm this emergency access was appropriate. A reason is required (min 10 characters).
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="space-y-2">
							<Label htmlFor="detail-approve-reason">
								Reason <span className="text-muted-foreground">(min 10 characters)</span>
							</Label>
							<Textarea
								id="detail-approve-reason"
								placeholder="Enter approval reason..."
								value={approveReason}
								onChange={e => setApproveReason(e.target.value)}
								rows={3}
							/>
							{approveReason.length > 0 && approveReason.length < 10 && (
								<p className="text-xs text-destructive">{10 - approveReason.length} more character(s) required</p>
							)}
						</div>
						{approveError && (
							<div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
								{approveError}
							</div>
						)}
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => { setApproveOpen(false); setApproveReason(""); setApproveError(null) }} disabled={approveMutation.isPending}>
							Cancel
						</Button>
						<Button
							onClick={handleApprove}
							disabled={approveMutation.isPending || approveReason.trim().length < 10}
						>
							{approveMutation.isPending ? "Approving..." : "Approve"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Drawers */}
			<InvestigationFlagDrawer
				open={flagDrawer}
				eventId={eventId}
				onClose={() => setFlagDrawer(false)}
			/>
			<AddNoteDrawer
				open={noteDrawer}
				eventId={eventId}
				onClose={() => setNoteDrawer(false)}
			/>
		</div>
	)
}
