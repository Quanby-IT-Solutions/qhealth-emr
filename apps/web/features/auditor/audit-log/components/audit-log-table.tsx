"use client"

import { Fragment, useCallback, useEffect, useRef, useState } from "react"

import { useRouter, useSearchParams } from "next/navigation"

import { useVirtualizer } from "@tanstack/react-virtual"

import type { AuditorEventListFilter } from "@repo/contracts"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"

import { useAuditLogDetailQuery, useAuditLogsQuery } from "@/features/auditor/audit-log/api/audit-log.hooks"
import { ACTION_COLORS, formatDateTime, OUTCOME_COLORS, SEVERITY_COLORS } from "@/features/auditor/audit-log/lib/audit-log.utils"

import { ExportModal } from "./export-modal"

interface AuditLogTableProps {
	facilityId: string
}

const COL_WIDTHS = ["160px", "160px", "100px", "90px", "160px", "160px", "90px", "120px"]
const COL_HEADERS = ["Timestamp", "User", "Action", "Severity", "Resource Type", "Resource ID", "Outcome", "IP"]

export function AuditLogTable({ facilityId }: AuditLogTableProps) {
	const router = useRouter()
	const searchParams = useSearchParams()

	const [filters, setFilters] = useState<AuditorEventListFilter>({
		facilityId,
		startDate: searchParams.get("startDate") ?? undefined,
		endDate: searchParams.get("endDate") ?? undefined,
		userId: searchParams.get("userId") ?? undefined,
		action: (searchParams.get("action") as AuditorEventListFilter["action"]) ?? undefined,
		severity: (searchParams.get("severity") as AuditorEventListFilter["severity"]) ?? undefined,
		outcome: (searchParams.get("outcome") as AuditorEventListFilter["outcome"]) ?? undefined,
		resourceType: searchParams.get("resourceType") ?? undefined,
		page: Number(searchParams.get("page") ?? 1),
		limit: 50,
	})

	const [expandedRow, setExpandedRow] = useState<string | null>(null)
	const [showExport, setShowExport] = useState(false)

	const { data, isLoading: loading, error } = useAuditLogsQuery(filters)
	const { data: detail, isLoading: detailLoading } = useAuditLogDetailQuery(expandedRow)

	// Sync filters → URL
	useEffect(() => {
		const params = new URLSearchParams()
		if (filters.startDate) params.set("startDate", filters.startDate)
		if (filters.endDate) params.set("endDate", filters.endDate)
		if (filters.userId) params.set("userId", filters.userId)
		if (filters.action) params.set("action", filters.action)
		if (filters.severity) params.set("severity", filters.severity)
		if (filters.outcome) params.set("outcome", filters.outcome)
		if (filters.resourceType) params.set("resourceType", filters.resourceType)
		if (filters.page && filters.page > 1) params.set("page", String(filters.page))
		router.replace(`?${params.toString()}`, { scroll: false })
	}, [filters, router])

	const handlePageChange = useCallback((newPage: number) => {
		setFilters(prev => ({ ...prev, page: newPage }))
	}, [])

	const handleRowClick = useCallback((id: string) => {
		setExpandedRow(prev => (prev === id ? null : id))
	}, [])

	const rows = data?.data ?? []

	// Virtualize body rows — each row is ~45px, expanded detail ~200px
	const scrollRef = useRef<HTMLDivElement>(null)
	const rowVirtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: i => (rows[i]?.id === expandedRow ? 245 : 45),
		overscan: 8,
	})

	return (
		<>
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>Audit Log</CardTitle>
						<Button variant="outline" size="sm" onClick={() => setShowExport(true)}>
							Export
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{/* Filters */}
					<div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
						<Input
							type="date"
							placeholder="Start Date"
							value={filters.startDate ?? ""}
							onChange={e =>
								setFilters(prev => ({ ...prev, startDate: e.target.value || undefined, page: 1 }))
							}
						/>
						<Input
							type="date"
							placeholder="End Date"
							value={filters.endDate ?? ""}
							onChange={e =>
								setFilters(prev => ({ ...prev, endDate: e.target.value || undefined, page: 1 }))
							}
						/>
						<Input
							placeholder="User ID"
							value={filters.userId ?? ""}
							onChange={e =>
								setFilters(prev => ({ ...prev, userId: e.target.value || undefined, page: 1 }))
							}
						/>
						<Select
							value={filters.action ?? "all"}
							onValueChange={v =>
								setFilters(prev => ({
									...prev,
									action: (!v || v === "all" ? undefined : v) as AuditorEventListFilter["action"],
									page: 1,
								}))
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Actions</SelectItem>
								<SelectItem value="create">Create</SelectItem>
								<SelectItem value="read">Read</SelectItem>
								<SelectItem value="update">Update</SelectItem>
								<SelectItem value="delete">Delete</SelectItem>
								<SelectItem value="sign">Sign</SelectItem>
								<SelectItem value="verify">Verify</SelectItem>
								<SelectItem value="override">Override</SelectItem>
							</SelectContent>
						</Select>
						<Select
							value={filters.severity ?? "all"}
							onValueChange={v =>
								setFilters(prev => ({
									...prev,
									severity: (!v || v === "all" ? undefined : v) as AuditorEventListFilter["severity"],
									page: 1,
								}))
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Severities</SelectItem>
								<SelectItem value="info">Info</SelectItem>
								<SelectItem value="warning">Warning</SelectItem>
								<SelectItem value="critical">Critical</SelectItem>
							</SelectContent>
						</Select>
						<Select
							value={filters.outcome ?? "all"}
							onValueChange={v =>
								setFilters(prev => ({
									...prev,
									outcome: (!v || v === "all" ? undefined : v) as AuditorEventListFilter["outcome"],
									page: 1,
								}))
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Outcomes</SelectItem>
								<SelectItem value="success">Success</SelectItem>
								<SelectItem value="failure">Failure</SelectItem>
							</SelectContent>
						</Select>
						<Input
							placeholder="Resource Type"
							value={filters.resourceType ?? ""}
							onChange={e =>
								setFilters(prev => ({ ...prev, resourceType: e.target.value || undefined, page: 1 }))
							}
						/>
						<Button
							variant="ghost"
							size="sm"
							onClick={() =>
								setFilters({
									facilityId,
									startDate: undefined,
									endDate: undefined,
									userId: undefined,
									action: undefined,
									severity: undefined,
									outcome: undefined,
									resourceType: undefined,
									page: 1,
									limit: 50,
								})
							}
						>
							Clear
						</Button>
					</div>

					{error && (
						<div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
							{String(error)}
						</div>
					)}

					{/* Virtualized table */}
					<div className="rounded-md border">
						{/* Fixed header */}
						<div className="flex border-b bg-muted/50 text-xs font-medium text-muted-foreground">
							{COL_HEADERS.map((h, i) => (
								<div
									key={h}
									className="shrink-0 px-4 py-2"
									style={{ width: COL_WIDTHS[i], minWidth: COL_WIDTHS[i] }}
								>
									{h}
								</div>
							))}
						</div>

						{/* Scrollable body */}
						<div ref={scrollRef} className="overflow-auto" style={{ height: rows.length === 0 ? "auto" : "600px" }}>
							{loading && !data && (
								<div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
							)}

							{data?.data.length === 0 && (
								<div className="py-8 text-center text-sm text-muted-foreground">No audit logs found.</div>
							)}

							{rows.length > 0 && (
								<div
									style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}
								>
									{rowVirtualizer.getVirtualItems().map(virtualRow => {
										const log = rows[virtualRow.index]!
										const isExpanded = expandedRow === log.id

										return (
											<Fragment key={log.id}>
												<div
													data-index={virtualRow.index}
													ref={rowVirtualizer.measureElement}
													style={{
														position: "absolute",
														top: virtualRow.start,
														left: 0,
														width: "100%",
													}}
												>
													{/* Main row */}
													<div
														className="flex cursor-pointer items-center border-b text-xs hover:bg-muted/50"
														onClick={() => handleRowClick(log.id)}
													>
														<div className="shrink-0 px-4 py-2.5" style={{ width: COL_WIDTHS[0], minWidth: COL_WIDTHS[0] }}>
															{formatDateTime(log.createdAt)}
														</div>
														<div className="shrink-0 truncate px-4 py-2.5" style={{ width: COL_WIDTHS[1], minWidth: COL_WIDTHS[1] }}>
															{log.userId}
														</div>
														<div className="shrink-0 px-4 py-2.5" style={{ width: COL_WIDTHS[2], minWidth: COL_WIDTHS[2] }}>
															<Badge variant="secondary" className={ACTION_COLORS[log.action] ?? ""}>
																{log.action}
															</Badge>
														</div>
														<div className="shrink-0 px-4 py-2.5" style={{ width: COL_WIDTHS[3], minWidth: COL_WIDTHS[3] }}>
															<Badge variant="secondary" className={SEVERITY_COLORS[log.severity ?? "info"] ?? ""}>
																{log.severity ?? "info"}
															</Badge>
														</div>
														<div className="shrink-0 px-4 py-2.5" style={{ width: COL_WIDTHS[4], minWidth: COL_WIDTHS[4] }}>
															{log.entityType}
														</div>
														<div className="shrink-0 truncate px-4 py-2.5 font-mono" style={{ width: COL_WIDTHS[5], minWidth: COL_WIDTHS[5] }}>
															{log.entityId}
														</div>
														<div className="shrink-0 px-4 py-2.5" style={{ width: COL_WIDTHS[6], minWidth: COL_WIDTHS[6] }}>
															<Badge variant="secondary" className={OUTCOME_COLORS[log.outcome ?? "success"] ?? ""}>
																{log.outcome ?? "success"}
															</Badge>
														</div>
														<div className="shrink-0 px-4 py-2.5 font-mono" style={{ width: COL_WIDTHS[7], minWidth: COL_WIDTHS[7] }}>
															{log.ipAddress ?? "—"}
														</div>
													</div>

													{/* Expanded detail */}
													{isExpanded && (
														<div className="border-b bg-muted/30 px-4 py-3">
															{detailLoading ? (
																<p className="text-sm text-muted-foreground">Loading detail...</p>
															) : detail ? (
																<div className="grid grid-cols-2 gap-4">
																	<div>
																		<h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Before</h4>
																		<pre className="max-h-40 overflow-auto rounded bg-red-50 p-2 text-xs dark:bg-red-900/20">
																			{detail.beforeState ? JSON.stringify(detail.beforeState, null, 2) : "—"}
																		</pre>
																	</div>
																	<div>
																		<h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">After</h4>
																		<pre className="max-h-40 overflow-auto rounded bg-green-50 p-2 text-xs dark:bg-green-900/20">
																			{detail.afterState ? JSON.stringify(detail.afterState, null, 2) : "—"}
																		</pre>
																	</div>
																</div>
															) : null}
														</div>
													)}
												</div>
											</Fragment>
										)
									})}
								</div>
							)}
						</div>
					</div>

					{data && data.totalPages > 1 && (
						<div className="mt-4 flex items-center justify-between">
							<p className="text-sm text-muted-foreground">
								Page {data.page} of {data.totalPages} ({data.total} total)
							</p>
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									disabled={data.page <= 1}
									onClick={() => handlePageChange(data.page - 1)}
								>
									Previous
								</Button>
								<Button
									variant="outline"
									size="sm"
									disabled={data.page >= data.totalPages}
									onClick={() => handlePageChange(data.page + 1)}
								>
									Next
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			<ExportModal
				open={showExport}
				onClose={() => setShowExport(false)}
				facilityId={facilityId}
				currentFilters={filters}
			/>
		</>
	)
}
