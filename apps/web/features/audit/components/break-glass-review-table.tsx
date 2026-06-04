"use client"

import { useCallback, useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Skeleton } from "@/core/components/ui/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import {
	useBreakGlassEventsQuery,
	useBreakGlassExportMutation,
	useBreakGlassPatternsQuery,
	useReviewBreakGlassMutation,
	type BreakGlassEvent,
} from "@/features/audit/api/audit.hooks"

const STATUS_COLORS: Record<string, string> = {
	pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
	appropriate: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
	flagged: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

// ============================================================================
// Access Log Detail Row
// ============================================================================

function formatDateTime(val: unknown): string {
	if (!val) return "—"
	try {
		return new Date(val as string).toLocaleString("en-PH", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		})
	} catch {
		return String(val)
	}
}

function AccessLogDetail({ event }: { event: BreakGlassEvent }) {
	return (
		<div className="bg-muted/40 grid grid-cols-2 gap-x-6 gap-y-2 px-4 py-3 text-xs">
			<div>
				<span className="text-muted-foreground font-semibold tracking-wide uppercase">
					Access Granted
				</span>
				<p className="mt-0.5">{formatDateTime(event.accessGrantedAt)}</p>
			</div>
			<div>
				<span className="text-muted-foreground font-semibold tracking-wide uppercase">
					Access Expires
				</span>
				<p className="mt-0.5">
					{formatDateTime(event.accessExpiresAt)}
					{event.accessExpiresAt &&
						new Date(event.accessExpiresAt as unknown as string) < new Date() && (
							<Badge variant="secondary" className="ml-2 text-[10px]">
								Expired
							</Badge>
						)}
				</p>
			</div>
			<div>
				<span className="text-muted-foreground font-semibold tracking-wide uppercase">
					Clinician Staff ID
				</span>
				<p className="mt-0.5 font-mono break-all">{event.clinicianStaffId}</p>
			</div>
			<div>
				<span className="text-muted-foreground font-semibold tracking-wide uppercase">
					Patient ID
				</span>
				<p className="mt-0.5 font-mono break-all">{event.patientId}</p>
			</div>
			{event.reviewedByStaffId && (
				<div>
					<span className="text-muted-foreground font-semibold tracking-wide uppercase">
						Reviewed By
					</span>
					<p className="mt-0.5 font-mono break-all">{event.reviewedByStaffId}</p>
				</div>
			)}
			{event.reviewedAt && (
				<div>
					<span className="text-muted-foreground font-semibold tracking-wide uppercase">
						Reviewed At
					</span>
					<p className="mt-0.5">{formatDateTime(event.reviewedAt)}</p>
				</div>
			)}
			{event.reviewNotes && (
				<div className="col-span-2">
					<span className="text-muted-foreground font-semibold tracking-wide uppercase">
						Review Notes
					</span>
					<p className="mt-0.5">{event.reviewNotes}</p>
				</div>
			)}
			{event.recordsAccessed != null && (
				<div className="col-span-2">
					<span className="text-muted-foreground font-semibold tracking-wide uppercase">
						Records Accessed
					</span>
					<pre className="bg-muted mt-0.5 max-h-32 overflow-y-auto rounded p-2 text-[11px]">
						{JSON.stringify(event.recordsAccessed, null, 2)}
					</pre>
				</div>
			)}
		</div>
	)
}

interface BreakGlassReviewTableProps {
	facilityId: string
}

// ============================================================================
// Patterns Panel (AD-005)
// ============================================================================

function PatternsPanel({ facilityId, days }: { facilityId: string; days: number }) {
	const { data, isLoading } = useBreakGlassPatternsQuery({ facilityId, days })

	if (isLoading) {
		return (
			<div className="space-y-2">
				<Skeleton className="h-4 w-48" />
				<Skeleton className="h-24 w-full" />
			</div>
		)
	}

	if (!data) return null

	return (
		<div className="bg-muted/30 space-y-4 rounded-md border p-4">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold">Pattern Analysis ({days}d window)</h3>
				<div className="text-muted-foreground flex gap-3 text-xs">
					<span>
						Total: <strong>{data.totalEventsInWindow}</strong>
					</span>
					<span>
						Pending:{" "}
						<strong className={data.pendingReviewCount > 0 ? "text-yellow-600" : ""}>
							{data.pendingReviewCount}
						</strong>
					</span>
					<span>
						Flagged:{" "}
						<strong className={data.flaggedCount > 0 ? "text-destructive" : ""}>
							{data.flaggedCount}
						</strong>
					</span>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					<p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wide uppercase">
						Top Repeat Requesters
					</p>
					{data.topRepeatRequesters.length === 0 ? (
						<p className="text-muted-foreground text-xs italic">
							No repeated access in this period
						</p>
					) : (
						<ul className="space-y-1.5">
							{data.topRepeatRequesters.slice(0, 5).map(r => (
								<li
									key={r.clinicianStaffId}
									className="flex items-start justify-between gap-2 text-xs"
								>
									<span
										className="max-w-[140px] truncate font-mono text-[10px]"
										title={r.clinicianStaffId}
									>
										{r.clinicianStaffId.slice(0, 8)}…
									</span>
									<div className="flex gap-1.5 text-[10px]">
										<span>{r.eventCount} events</span>
										<span className="text-muted-foreground">· {r.distinctPatients} patient(s)</span>
										{r.flaggedCount > 0 && (
											<span className="text-destructive">· {r.flaggedCount} flagged</span>
										)}
									</div>
								</li>
							))}
						</ul>
					)}
				</div>

				<div>
					<p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wide uppercase">
						Most Accessed Patients
					</p>
					{data.topRepeatPatients.length === 0 ? (
						<p className="text-muted-foreground text-xs italic">
							No repeated access in this period
						</p>
					) : (
						<ul className="space-y-1.5">
							{data.topRepeatPatients.slice(0, 5).map(p => (
								<li key={p.patientId} className="flex items-start justify-between gap-2 text-xs">
									<span
										className="max-w-[140px] truncate font-mono text-[10px]"
										title={p.patientId}
									>
										{p.patientId.slice(0, 8)}…
									</span>
									<div className="flex gap-1.5 text-[10px]">
										<span>{p.eventCount} accesses</span>
										<span className="text-muted-foreground">
											· {p.distinctClinicians} clinician(s)
										</span>
										{p.flaggedCount > 0 && (
											<span className="text-destructive">· {p.flaggedCount} flagged</span>
										)}
									</div>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</div>
	)
}

export function BreakGlassReviewTable({ facilityId }: BreakGlassReviewTableProps) {
	const [statusFilter, setStatusFilter] = useState<string>("pending")
	const [dateFrom, setDateFrom] = useState<string>("")
	const [dateTo, setDateTo] = useState<string>("")
	const [showPatterns, setShowPatterns] = useState(false)
	const [patternsDays, setPatternsDays] = useState(30)
	const [page, setPage] = useState(1)
	const {
		data,
		isLoading: loading,
		error,
	} = useBreakGlassEventsQuery({
		facilityId,
		reviewStatus: statusFilter === "all" ? undefined : statusFilter,
		dateFrom: dateFrom || undefined,
		dateTo: dateTo || undefined,
		page,
	})

	const exportMutation = useBreakGlassExportMutation()

	const [expandedId, setExpandedId] = useState<string | null>(null)

	const [reviewDialog, setReviewDialog] = useState<{
		open: boolean
		eventId: string
		clinicianStaffId: string
	}>({ open: false, eventId: "", clinicianStaffId: "" })
	const [reviewStatus, setReviewStatus] = useState<"appropriate" | "flagged">("appropriate")
	const [reviewNotes, setReviewNotes] = useState("")
	const reviewMutation = useReviewBreakGlassMutation()
	const [reviewError, setReviewError] = useState<string | null>(null)

	const openReview = useCallback((eventId: string, clinicianStaffId: string) => {
		setReviewDialog({ open: true, eventId, clinicianStaffId })
		setReviewStatus("appropriate")
		setReviewNotes("")
	}, [])

	const handleReview = useCallback(async () => {
		setReviewError(null)
		reviewMutation.mutate(
			{
				id: reviewDialog.eventId,
				reviewStatus,
				reviewNotes: reviewNotes.trim() || undefined,
			},
			{
				onSuccess: () => setReviewDialog({ open: false, eventId: "", clinicianStaffId: "" }),
				onError: err =>
					setReviewError(err instanceof Error ? err.message : "Failed to submit review"),
			}
		)
	}, [reviewMutation, reviewDialog.eventId, reviewStatus, reviewNotes])

	const handleStatusFilterChange = useCallback((val: string | null) => {
		const v = val ?? "all"
		setStatusFilter(v)
		setPage(1)
	}, [])

	function toggleExpand(id: string) {
		setExpandedId(prev => (prev === id ? null : id))
	}

	return (
		<>
			<Card>
				<CardHeader>
					<div className="flex flex-col gap-3">
						<div className="flex items-center justify-between">
							<CardTitle>Break-Glass Event Review</CardTitle>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									disabled={exportMutation.isPending}
									onClick={() =>
										exportMutation.mutate({
											facilityId,
											reviewStatus:
												statusFilter === "all"
													? undefined
													: (statusFilter as "pending" | "appropriate" | "flagged"),
											dateFrom: dateFrom || undefined,
											dateTo: dateTo || undefined,
										})
									}
								>
									{exportMutation.isPending ? "Exporting…" : "Export CSV"}
								</Button>
								<Button
									variant={showPatterns ? "secondary" : "outline"}
									size="sm"
									onClick={() => setShowPatterns(v => !v)}
								>
									{showPatterns ? "Hide" : "Show"} Pattern Analysis
								</Button>
							</div>
						</div>

						{showPatterns && (
							<div className="mb-1">
								<div className="mb-2 flex items-center gap-2">
									<span className="text-muted-foreground text-xs">Analysis window:</span>
									{[7, 14, 30, 60, 90].map(d => (
										<button
											key={d}
											onClick={() => setPatternsDays(d)}
											className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
												patternsDays === d
													? "bg-primary text-primary-foreground"
													: "bg-muted text-muted-foreground hover:bg-muted/80"
											}`}
										>
											{d}d
										</button>
									))}
								</div>
								<PatternsPanel facilityId={facilityId} days={patternsDays} />
							</div>
						)}

						<div className="flex flex-wrap items-end gap-3">
							<div className="flex flex-col gap-1">
								<Label className="text-xs">Status</Label>
								<Select value={statusFilter} onValueChange={handleStatusFilterChange}>
									<SelectTrigger className="w-36">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All</SelectItem>
										<SelectItem value="pending">Pending</SelectItem>
										<SelectItem value="appropriate">Appropriate</SelectItem>
										<SelectItem value="flagged">Flagged</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="flex flex-col gap-1">
								<Label className="text-xs">From</Label>
								<Input
									type="date"
									className="h-9 w-36 text-xs"
									value={dateFrom}
									onChange={e => {
										setDateFrom(e.target.value)
										setPage(1)
									}}
								/>
							</div>
							<div className="flex flex-col gap-1">
								<Label className="text-xs">To</Label>
								<Input
									type="date"
									className="h-9 w-36 text-xs"
									value={dateTo}
									onChange={e => {
										setDateTo(e.target.value)
										setPage(1)
									}}
								/>
							</div>
							{(dateFrom || dateTo) && (
								<Button
									variant="ghost"
									size="sm"
									className="text-xs"
									onClick={() => {
										setDateFrom("")
										setDateTo("")
										setPage(1)
									}}
								>
									Clear dates
								</Button>
							)}
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{error && (
						<div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
							{String(error)}
						</div>
					)}

					<div className="overflow-x-auto rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-8" />
									<TableHead>Date</TableHead>
									<TableHead>Clinician</TableHead>
									<TableHead>Patient</TableHead>
									<TableHead>Reason</TableHead>
									<TableHead>Justification</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{loading && !data && (
									<TableRow>
										<TableCell colSpan={8} className="text-muted-foreground py-8 text-center">
											Loading...
										</TableCell>
									</TableRow>
								)}

								{data?.data.map((event: BreakGlassEvent) => (
									<>
										<TableRow
											key={event.id}
											className="hover:bg-muted/50 cursor-pointer"
											onClick={() => toggleExpand(event.id)}
										>
											<TableCell className="text-muted-foreground w-8">
												{expandedId === event.id ? (
													<ChevronDown className="size-4" />
												) : (
													<ChevronRight className="size-4" />
												)}
											</TableCell>
											<TableCell className="text-xs">
												{new Date(event.createdAt as unknown as string).toLocaleString()}
											</TableCell>
											<TableCell className="max-w-28 truncate text-xs">
												{event.clinicianStaffId}
											</TableCell>
											<TableCell className="max-w-28 truncate text-xs">{event.patientId}</TableCell>
											<TableCell className="text-xs capitalize">
												{event.reasonCategory.replace(/_/g, " ")}
											</TableCell>
											<TableCell className="max-w-40 truncate text-xs">
												{event.justification}
											</TableCell>
											<TableCell>
												<Badge
													variant="secondary"
													className={STATUS_COLORS[event.reviewStatus] ?? ""}
												>
													{event.reviewStatus}
												</Badge>
											</TableCell>
											<TableCell>
												{event.reviewStatus === "pending" && (
													<Button
														variant="outline"
														size="sm"
														onClick={e => {
															e.stopPropagation()
															openReview(event.id, event.clinicianStaffId)
														}}
													>
														Review
													</Button>
												)}
											</TableCell>
										</TableRow>

										{expandedId === event.id && (
											<TableRow key={`${event.id}-detail`} className="bg-muted/20">
												<TableCell colSpan={8} className="p-0">
													<AccessLogDetail event={event} />
												</TableCell>
											</TableRow>
										)}
									</>
								))}

								{data?.data.length === 0 && (
									<TableRow>
										<TableCell colSpan={8} className="text-muted-foreground py-8 text-center">
											No break-glass events found.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>

					{data && data.totalPages > 1 && (
						<div className="mt-4 flex items-center justify-between">
							<p className="text-muted-foreground text-sm">
								Page {data.page} of {data.totalPages} ({data.total} total)
							</p>
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									disabled={data.page <= 1}
									onClick={() => setPage(data.page - 1)}
								>
									Previous
								</Button>
								<Button
									variant="outline"
									size="sm"
									disabled={data.page >= data.totalPages}
									onClick={() => setPage(data.page + 1)}
								>
									Next
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Review Dialog */}
			<Dialog
				open={reviewDialog.open}
				onOpenChange={open => {
					if (!open) setReviewDialog({ open: false, eventId: "", clinicianStaffId: "" })
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Review Break-Glass Event</DialogTitle>
						<DialogDescription>
							Review this emergency override access and mark it as appropriate or flagged for
							follow-up.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-2">
						<div className="space-y-2">
							<Label>Review Decision</Label>
							<Select
								value={reviewStatus}
								onValueChange={v => {
									if (v) setReviewStatus(v as "appropriate" | "flagged")
								}}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="appropriate">Appropriate</SelectItem>
									<SelectItem value="flagged">Flagged for Follow-Up</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="review-notes">Review Notes</Label>
							<Input
								id="review-notes"
								placeholder="Optional review notes..."
								value={reviewNotes}
								onChange={e => setReviewNotes(e.target.value)}
							/>
						</div>

						{reviewError && (
							<div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
								{reviewError}
							</div>
						)}
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setReviewDialog({ open: false, eventId: "", clinicianStaffId: "" })}
							disabled={reviewMutation.isPending}
						>
							Cancel
						</Button>
						<Button onClick={handleReview} disabled={reviewMutation.isPending}>
							{reviewMutation.isPending ? "Submitting..." : "Submit Review"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
