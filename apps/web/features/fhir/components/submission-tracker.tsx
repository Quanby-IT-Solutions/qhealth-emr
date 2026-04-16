"use client"

import {
	CheckCircle2,
	Clock,
	ExternalLink,
	Loader2,
	Send,
	XCircle,
} from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	type FhirExport,
	type NhdrSubmission,
	type NhdrSubmissionStatus,
	getNhdrStatusColor,
	useNhdrSubmissionsQuery,
	useSubmitToNhdrMutation,
} from "@/features/fhir/api/fhir.hooks"

// ============================================================================
// Helpers
// ============================================================================

function formatDate(val: string | null | undefined): string {
	if (!val) return "—"
	return new Date(val).toLocaleString("en-PH", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

function NhdrStatusIcon({ status }: { status: NhdrSubmissionStatus }) {
	switch (status) {
		case "pending":
			return <Clock className="size-4 text-blue-500" />
		case "submitted":
			return <Loader2 className="size-4 animate-spin text-purple-500" />
		case "accepted":
			return <CheckCircle2 className="size-4 text-green-500" />
		case "rejected":
		case "error":
			return <XCircle className="size-4 text-red-500" />
	}
}

function NhdrStatusBadge({ status }: { status: NhdrSubmissionStatus }) {
	const colorClass = getNhdrStatusColor(status)
	const label =
		status === "pending"
			? "Pending"
			: status === "submitted"
				? "Submitted"
				: status === "accepted"
					? "Accepted"
					: status === "rejected"
						? "Rejected"
						: "Error"

	if (status === "rejected" || status === "error") {
		return <Badge variant="destructive">{label}</Badge>
	}
	return <Badge className={colorClass}>{label}</Badge>
}

// ============================================================================
// Timeline Item
// ============================================================================

function SubmissionTimelineItem({
	submission,
	isLast,
}: {
	submission: NhdrSubmission
	isLast: boolean
}) {
	return (
		<div className="flex gap-4">
			{/* Timeline line */}
			<div className="flex flex-col items-center">
				<div className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-background">
					<NhdrStatusIcon status={submission.status} />
				</div>
				{!isLast && <div className="mt-1 h-full w-px bg-border" />}
			</div>

			{/* Content */}
			<div className={`pb-6 flex-1 min-w-0 ${isLast ? "pb-0" : ""}`}>
				<div className="flex flex-wrap items-start justify-between gap-2">
					<div>
						<div className="flex items-center gap-2">
							<p className="text-sm font-medium">
								{submission.periodStart} → {submission.periodEnd}
							</p>
							<NhdrStatusBadge status={submission.status} />
						</div>
						{submission.acknowledgementId && (
							<p className="mt-0.5 text-xs text-muted-foreground">
								Ack ID: <span className="font-mono">{submission.acknowledgementId}</span>
							</p>
						)}
					</div>
					<p className="text-xs text-muted-foreground">
						{formatDate(submission.submittedAt ?? submission.submittedAt)}
					</p>
				</div>

				{submission.responseMessage && (
					<div
						className={`mt-2 rounded-md border p-2.5 text-xs ${
							submission.status === "rejected" || submission.status === "error"
								? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
								: "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300"
						}`}
					>
						{submission.responseMessage}
					</div>
				)}

				<p className="mt-1 text-xs text-muted-foreground">
					Submitted by {submission.submittedByName}
				</p>
			</div>
		</div>
	)
}

// ============================================================================
// Submit-to-NHDR button (for a completed, non-submitted export)
// ============================================================================

interface SubmitNhdrButtonProps {
	exportId: string
	facilityId: string
}

export function SubmitNhdrButton({ exportId, facilityId }: SubmitNhdrButtonProps) {
	const mutation = useSubmitToNhdrMutation()

	return (
		<Button
			size="sm"
			onClick={() => mutation.mutate({ exportId, facilityId })}
			disabled={mutation.isPending}
		>
			<Send className="mr-2 size-4" />
			{mutation.isPending ? "Submitting…" : "Submit to NHDR"}
		</Button>
	)
}

// ============================================================================
// Main Submission Tracker
// ============================================================================

interface SubmissionTrackerProps {
	facilityId: string
	/** Optionally highlight submit action for a specific export */
	pendingExport?: FhirExport | null
}

export function SubmissionTracker({ facilityId, pendingExport }: SubmissionTrackerProps) {
	const { data: submissions, isLoading, error } = useNhdrSubmissionsQuery(facilityId)

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>NHDR Submission Tracker</CardTitle>
						<p className="mt-1 text-sm text-muted-foreground">
							PhilHealth / DOH National Health Data Repository submission history
						</p>
					</div>
					<Button
						variant="outline"
						size="sm"
						nativeButton={false}
						render={
							<a
								href="https://nhdr.doh.gov.ph"
								target="_blank"
								rel="noreferrer"
								className="flex items-center gap-1"
							/>
						}
					>
						NHDR Portal <ExternalLink className="size-3" />
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				{/* Pending export call-to-action */}
				{pendingExport && pendingExport.status === "completed" && !pendingExport.nhdrSubmissionId && (
					<div className="mb-6 flex items-center justify-between rounded-lg border bg-muted/40 p-4">
						<div>
							<p className="text-sm font-medium">Export ready for submission</p>
							<p className="text-xs text-muted-foreground">
								Export {pendingExport.id.slice(0, 8)}… ({pendingExport.exportedResources.toLocaleString()} resources)
							</p>
						</div>
						<SubmitNhdrButton exportId={pendingExport.id} facilityId={facilityId} />
					</div>
				)}

				{isLoading && (
					<div className="py-8 text-center text-sm text-muted-foreground">
						Loading submissions…
					</div>
				)}

				{error && (
					<div className="py-4 text-sm text-destructive">
						Failed to load NHDR submissions.
					</div>
				)}

				{!isLoading && !error && (!submissions || submissions.length === 0) && (
					<div className="py-8 text-center text-sm text-muted-foreground">
						No NHDR submissions yet.
					</div>
				)}

				{submissions && submissions.length > 0 && (
					<div className="pt-2">
						{submissions.map((sub, idx) => (
							<SubmissionTimelineItem
								key={sub.id}
								submission={sub}
								isLast={idx === submissions.length - 1}
							/>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	)
}
