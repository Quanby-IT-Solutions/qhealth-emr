"use client"

import { Fragment, useCallback, useState } from "react"

import type { AuditLogFilter } from "@repo/contracts"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import {
	useAuditLogDetailQuery,
	useAuditLogExportMutation,
	useAuditLogsQuery,
} from "@/features/audit/api/audit.hooks"

const ACTION_COLORS: Record<string, string> = {
	create: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
	update: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
	delete: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
	sign: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
	verify: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
	override: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
}

interface AuditLogTableProps {
	facilityId: string
	initialEntityType?: string
	initialEntityId?: string
}

export function AuditLogTable({
	facilityId,
	initialEntityType,
	initialEntityId,
}: AuditLogTableProps) {
	const [filters, setFilters] = useState<AuditLogFilter>({
		facilityId,
		startDate: undefined,
		endDate: undefined,
		userId: undefined,
		action: undefined,
		entityType: initialEntityType,
		entityId: initialEntityId,
		patientMrn: undefined,
		page: 1,
		limit: 50,
	})

	const [expandedRow, setExpandedRow] = useState<string | null>(null)

	const { data, isLoading: loading, error } = useAuditLogsQuery(filters)
	const { data: detail, isLoading: detailLoading } = useAuditLogDetailQuery(expandedRow)
	const exportMutation = useAuditLogExportMutation()

	const handleFilter = useCallback(() => {
		setFilters(prev => ({ ...prev, page: 1 }))
	}, [])

	const handlePageChange = useCallback((newPage: number) => {
		setFilters(prev => ({ ...prev, page: newPage }))
	}, [])

	const handleRowClick = useCallback((id: string) => {
		setExpandedRow(prev => (prev === id ? null : id))
	}, [])

	const handleExport = useCallback(() => {
		const { page: _page, limit: _limit, ...exportFilter } = filters
		exportMutation.mutate(exportFilter)
	}, [exportMutation, filters])

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle>Audit Logs</CardTitle>
					<Button
						variant="outline"
						size="sm"
						onClick={handleExport}
						disabled={exportMutation.isPending}
					>
						{exportMutation.isPending ? "Exporting..." : "Export CSV"}
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				{/* Filters */}
				<div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
					<Input
						type="date"
						placeholder="Start Date"
						value={filters.startDate ?? ""}
						onChange={e =>
							setFilters(prev => ({
								...prev,
								startDate: e.target.value || undefined,
							}))
						}
					/>
					<Input
						type="date"
						placeholder="End Date"
						value={filters.endDate ?? ""}
						onChange={e =>
							setFilters(prev => ({
								...prev,
								endDate: e.target.value || undefined,
							}))
						}
					/>
					<Input
						placeholder="User ID"
						value={filters.userId ?? ""}
						onChange={e =>
							setFilters(prev => ({
								...prev,
								userId: e.target.value || undefined,
							}))
						}
					/>
					<Select
						value={filters.action ?? "all"}
						onValueChange={v =>
							setFilters(prev => ({
								...prev,
								action: (!v || v === "all" ? undefined : v) as AuditLogFilter["action"],
							}))
						}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Actions</SelectItem>
							<SelectItem value="create">Create</SelectItem>
							<SelectItem value="update">Update</SelectItem>
							<SelectItem value="delete">Delete</SelectItem>
							<SelectItem value="sign">Sign</SelectItem>
							<SelectItem value="verify">Verify</SelectItem>
							<SelectItem value="override">Override</SelectItem>
						</SelectContent>
					</Select>
					<Input
						placeholder="Entity Type"
						value={filters.entityType ?? ""}
						onChange={e =>
							setFilters(prev => ({
								...prev,
								entityType: e.target.value || undefined,
							}))
						}
					/>
					<Button onClick={handleFilter} disabled={loading}>
						{loading ? "Searching..." : "Search"}
					</Button>
				</div>

				{error && (
					<div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
						{String(error)}
					</div>
				)}

				{/* Table */}
				<div className="overflow-x-auto rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Timestamp</TableHead>
								<TableHead>User</TableHead>
								<TableHead>Action</TableHead>
								<TableHead>Entity Type</TableHead>
								<TableHead>Entity ID</TableHead>
								<TableHead>IP Address</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data?.data.map(log => (
								<Fragment key={log.id}>
									<TableRow
										className="hover:bg-muted/50 cursor-pointer"
										onClick={() => handleRowClick(log.id)}
									>
										<TableCell className="text-xs">
											{new Date(log.createdAt as unknown as string).toLocaleString()}
										</TableCell>
										<TableCell className="max-w-32 truncate text-xs">{log.userId}</TableCell>
										<TableCell>
											<Badge variant="secondary" className={ACTION_COLORS[log.action] ?? ""}>
												{log.action}
											</Badge>
										</TableCell>
										<TableCell className="text-xs">{log.entityType}</TableCell>
										<TableCell className="max-w-24 truncate font-mono text-xs">
											{log.entityId}
										</TableCell>
										<TableCell className="text-xs">{log.ipAddress ?? "—"}</TableCell>
									</TableRow>

									{/* Expanded row for before/after detail */}
									{expandedRow === log.id && (
										<TableRow key={`${log.id}-detail`}>
											<TableCell colSpan={6} className="bg-muted/30 p-4">
												{detailLoading ? (
													<p className="text-muted-foreground text-sm">Loading detail...</p>
												) : detail ? (
													<div className="grid grid-cols-2 gap-4">
														<div>
															<h4 className="mb-2 text-sm font-semibold">Before State</h4>
															<pre className="bg-muted max-h-60 overflow-auto rounded p-2 text-xs">
																{detail.beforeState
																	? JSON.stringify(detail.beforeState, null, 2)
																	: "—"}
															</pre>
														</div>
														<div>
															<h4 className="mb-2 text-sm font-semibold">After State</h4>
															<pre className="bg-muted max-h-60 overflow-auto rounded p-2 text-xs">
																{detail.afterState
																	? JSON.stringify(detail.afterState, null, 2)
																	: "—"}
															</pre>
														</div>
													</div>
												) : null}
											</TableCell>
										</TableRow>
									)}
								</Fragment>
							))}

							{data?.data.length === 0 && (
								<TableRow>
									<TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
										No audit logs found.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>

				{/* Pagination */}
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
	)
}
