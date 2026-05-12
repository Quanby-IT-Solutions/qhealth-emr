"use client"

import { Fragment, useCallback, useState } from "react"

import { BellRing, ChevronDown, ChevronRight } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table"
import { Textarea } from "@/core/components/ui/textarea"

import type { BreakGlassEvent } from "@/features/auditor/break-glass-review/api/break-glass.hooks"
import {
	useApproveMutation,
	useBreakGlassInboxQuery,
} from "@/features/auditor/break-glass-review/api/break-glass.hooks"
import { formatDateTime, isSlaBreached, STATUS_COLORS } from "@/features/auditor/break-glass-review/lib/break-glass.utils"

import { AddNoteDrawer } from "./add-note-drawer"
import { BreakGlassExportModal } from "./break-glass-export-modal"
import { InvestigationFlagDrawer } from "./investigation-flag-drawer"

function AccessLogDetail({ event }: { event: BreakGlassEvent }) {
	return (
		<div className="grid grid-cols-2 gap-x-6 gap-y-2 bg-muted/40 px-4 py-3 text-xs">
			<div>
				<span className="font-semibold uppercase tracking-wide text-muted-foreground">Clinician Staff ID</span>
				<p className="mt-0.5 break-all font-mono">{event.clinicianStaffId}</p>
			</div>
			<div>
				<span className="font-semibold uppercase tracking-wide text-muted-foreground">Patient ID</span>
				<p className="mt-0.5 break-all font-mono">{event.patientId}</p>
			</div>
			{event.reviewedByStaffId && (
				<div>
					<span className="font-semibold uppercase tracking-wide text-muted-foreground">Reviewed By</span>
					<p className="mt-0.5 break-all font-mono">{event.reviewedByStaffId}</p>
				</div>
			)}
			{event.reviewedAt && (
				<div>
					<span className="font-semibold uppercase tracking-wide text-muted-foreground">Reviewed At</span>
					<p className="mt-0.5">{formatDateTime(event.reviewedAt)}</p>
				</div>
			)}
			{event.reviewNotes && (
				<div className="col-span-2">
					<span className="font-semibold uppercase tracking-wide text-muted-foreground">Review Notes</span>
					<p className="mt-0.5">{event.reviewNotes}</p>
				</div>
			)}
			{event.recordsAccessed != null && (
				<div className="col-span-2">
					<span className="font-semibold uppercase tracking-wide text-muted-foreground">Records Accessed</span>
					<pre className="mt-0.5 max-h-32 overflow-y-auto rounded bg-muted p-2 text-[11px]">
						{JSON.stringify(event.recordsAccessed, null, 2)}
					</pre>
				</div>
			)}
		</div>
	)
}

interface BreakGlassInboxProps {
	facilityId: string
}

export function BreakGlassInbox({ facilityId }: BreakGlassInboxProps) {
	const [statusFilter, setStatusFilter] = useState<string>("pending")
	const [dateFrom, setDateFrom] = useState("")
	const [dateTo, setDateTo] = useState("")
	const [page, setPage] = useState(1)
	const [expandedId, setExpandedId] = useState<string | null>(null)

	const { data, isLoading: loading, error } = useBreakGlassInboxQuery({
		facilityId,
		status: statusFilter === "all" ? undefined : statusFilter,
		dateFrom: dateFrom || undefined,
		dateTo: dateTo || undefined,
		page,
	})

	// Approve dialog state
	const [approveDialog, setApproveDialog] = useState<{ open: boolean; eventId: string }>({ open: false, eventId: "" })
	const [approveReason, setApproveReason] = useState("")
	const [approveError, setApproveError] = useState<string | null>(null)
	const approveMutation = useApproveMutation()

	// Flag drawer state
	const [flagDrawer, setFlagDrawer] = useState<{ open: boolean; eventId: string }>({ open: false, eventId: "" })

	// Add Note drawer state
	const [noteDrawer, setNoteDrawer] = useState<{ open: boolean; eventId: string }>({ open: false, eventId: "" })

	// Export modal state
	const [showExport, setShowExport] = useState(false)

	const openApprove = useCallback((eventId: string) => {
		setApproveDialog({ open: true, eventId })
		setApproveReason("")
		setApproveError(null)
	}, [])

	const closeApprove = useCallback(() => {
		setApproveDialog({ open: false, eventId: "" })
	}, [])

	const handleApprove = useCallback(() => {
		setApproveError(null)
		approveMutation.mutate(
			{ eventId: approveDialog.eventId, reason: approveReason.trim() },
			{
				onSuccess: closeApprove,
				onError: err => setApproveError(err instanceof Error ? err.message : "Failed to approve"),
			}
		)
	}, [approveMutation, approveDialog.eventId, approveReason, closeApprove])

	return (
		<>
			<Card>
				<CardHeader>
					<div className="flex flex-col gap-3">
						<div className="flex items-center justify-between">
							<CardTitle>Break-Glass Event Review</CardTitle>
							<Button variant="outline" size="sm" onClick={() => setShowExport(true)}>
								Export PDF
							</Button>
						</div>

						<div className="flex flex-wrap items-end gap-3">
							<div className="flex flex-col gap-1">
								<Label className="text-xs">Status</Label>
								<Select
									value={statusFilter}
									onValueChange={v => {
										setStatusFilter(v ?? "all")
										setPage(1)
									}}
								>
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
									onChange={e => { setDateFrom(e.target.value); setPage(1) }}
								/>
							</div>
							<div className="flex flex-col gap-1">
								<Label className="text-xs">To</Label>
								<Input
									type="date"
									className="h-9 w-36 text-xs"
									value={dateTo}
									onChange={e => { setDateTo(e.target.value); setPage(1) }}
								/>
							</div>
							{(dateFrom || dateTo) && (
								<Button variant="ghost" size="sm" className="text-xs" onClick={() => { setDateFrom(""); setDateTo(""); setPage(1) }}>
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
									<TableHead>Access Window</TableHead>
									<TableHead>Severity</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{loading && !data && (
									<TableRow>
										<TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
											Loading...
										</TableCell>
									</TableRow>
								)}

								{data?.data.map((event: BreakGlassEvent) => {
									const overdue = event.reviewStatus === "pending" && isSlaBreached(event.accessExpiresAt)
									const severity = overdue ? "critical" : event.reviewStatus === "flagged" ? "warning" : "info"
									const severityColor = severity === "critical"
										? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
										: severity === "warning"
										? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
										: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"

									return (
										<Fragment key={event.id}>
											<TableRow
												className="cursor-pointer hover:bg-muted/50"
												onClick={() => setExpandedId(prev => (prev === event.id ? null : event.id))}
											>
												<TableCell className="w-8 text-muted-foreground">
													{expandedId === event.id ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
												</TableCell>
												<TableCell className="text-xs">
													{new Date(event.createdAt as unknown as string).toLocaleString()}
												</TableCell>
												<TableCell className="max-w-28 truncate text-xs">{event.clinicianStaffId}</TableCell>
												<TableCell className="max-w-28 truncate text-xs">{event.patientId}</TableCell>
												<TableCell className="text-xs capitalize">
													{event.reasonCategory.replace(/_/g, " ")}
												</TableCell>
												<TableCell className="text-xs">
													<span className="block">{formatDateTime(event.accessGrantedAt)}</span>
													<span className="block text-muted-foreground">→ {formatDateTime(event.accessExpiresAt)}</span>
												</TableCell>
												<TableCell>
													<Badge variant="secondary" className={severityColor}>
														{severity}
													</Badge>
												</TableCell>
												<TableCell>
													<div className="flex items-center gap-1.5">
														<Badge variant="secondary" className={STATUS_COLORS[event.reviewStatus] ?? ""}>
															{event.reviewStatus}
														</Badge>
														{event.reviewStatus === "pending" && (
															<BellRing
																className={`size-3.5 ${overdue ? "text-destructive" : "text-yellow-500"}`}
																aria-label={overdue ? "Overdue" : "Pending review"}
															/>
														)}
														{overdue && (
															<Badge variant="destructive" className="text-[10px]">
																Overdue
															</Badge>
														)}
													</div>
												</TableCell>
												<TableCell>
													<div className="flex items-center gap-1">
														{event.reviewStatus === "pending" && (
															<Button
																variant="outline"
																size="sm"
																onClick={e => { e.stopPropagation(); openApprove(event.id) }}
															>
																Approve
															</Button>
														)}
														<Button
															variant="outline"
															size="sm"
															onClick={e => { e.stopPropagation(); setFlagDrawer({ open: true, eventId: event.id }) }}
														>
															Flag
														</Button>
														<Button
															variant="ghost"
															size="sm"
															onClick={e => { e.stopPropagation(); setNoteDrawer({ open: true, eventId: event.id }) }}
														>
															Note
														</Button>
													</div>
												</TableCell>
											</TableRow>

											{expandedId === event.id && (
												<TableRow className="bg-muted/20">
													<TableCell colSpan={9} className="p-0">
														<AccessLogDetail event={event} />
													</TableCell>
												</TableRow>
											)}
										</Fragment>
									)
								})}

								{data?.data.length === 0 && (
									<TableRow>
										<TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
											No break-glass events found.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>

					{data && data.totalPages > 1 && (
						<div className="mt-4 flex items-center justify-between">
							<p className="text-sm text-muted-foreground">
								Page {data.page} of {data.totalPages} ({data.total} total)
							</p>
							<div className="flex gap-2">
								<Button variant="outline" size="sm" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)}>
									Previous
								</Button>
								<Button variant="outline" size="sm" disabled={data.page >= data.totalPages} onClick={() => setPage(data.page + 1)}>
									Next
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Approve dialog */}
			<Dialog open={approveDialog.open} onOpenChange={open => !open && closeApprove()}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Approve Break-Glass Access</DialogTitle>
						<DialogDescription>
							Confirm this emergency access was appropriate. Reason required (min 10 characters).
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="space-y-2">
							<Label htmlFor="approve-reason">
								Reason <span className="text-muted-foreground">(min 10 characters)</span>
							</Label>
							<Textarea
								id="approve-reason"
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
						<Button variant="outline" onClick={closeApprove} disabled={approveMutation.isPending}>
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

			{/* Flag drawer */}
			<InvestigationFlagDrawer
				open={flagDrawer.open}
				eventId={flagDrawer.eventId}
				onClose={() => setFlagDrawer({ open: false, eventId: "" })}
			/>

			{/* Add Note drawer */}
			<AddNoteDrawer
				open={noteDrawer.open}
				eventId={noteDrawer.eventId}
				onClose={() => setNoteDrawer({ open: false, eventId: "" })}
			/>

			{/* DPA export modal */}
			<BreakGlassExportModal
				open={showExport}
				onClose={() => setShowExport(false)}
				facilityId={facilityId}
			/>
		</>
	)
}
