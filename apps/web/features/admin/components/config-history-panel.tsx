"use client"

import { useState } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Skeleton } from "@/core/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table"
import { useActiveFacilityId } from "@/core/hooks/use-active-facility"
import { useConfigHistoryQuery } from "@/features/audit/api/audit.hooks"

const ENTITY_TYPES = [
	"feature_flag",
	"feature_flag_target",
	"system_settings",
	"sla_config",
	"integration",
	"role_permission",
	"user_role",
	"facility_profile",
]

const ACTION_COLORS: Record<string, string> = {
	create: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
	update: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
	delete: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
	sign: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
	verify: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
	override: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
}

function formatDateTime(val: unknown): string {
	if (!val) return "—"
	try {
		return new Date(val as string).toLocaleString("en-PH", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		})
	} catch {
		return String(val)
	}
}

export function ConfigHistoryPanel() {
	const facilityId = useActiveFacilityId()
	const [entityType, setEntityType] = useState<string>("all")
	const [dateFrom, setDateFrom] = useState("")
	const [dateTo, setDateTo] = useState("")
	const [page, setPage] = useState(1)
	const [expandedId, setExpandedId] = useState<string | null>(null)

	const { data, isLoading, error } = useConfigHistoryQuery({
		facilityId: facilityId ?? "",
		entityType: entityType === "all" ? undefined : entityType,
		dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
		dateTo: dateTo ? new Date(dateTo).toISOString() : undefined,
		page,
	})

	if (!facilityId) {
		return (
			<div className="rounded-md bg-muted/50 p-6 text-center text-sm text-muted-foreground">
				Select a facility to view configuration change history.
			</div>
		)
	}

	return (
		<div className="space-y-4">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Configuration Change History</h1>
				<p className="text-sm text-muted-foreground mt-1">
					Audit trail of all configuration changes. Use this log for governance forensics and compliance review.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Filter</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex flex-wrap items-end gap-3">
						<div className="flex flex-col gap-1">
							<Label className="text-xs">Entity type</Label>
							<Select
								value={entityType}
								onValueChange={v => { setEntityType(v ?? "all"); setPage(1) }}
							>
								<SelectTrigger className="w-44">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All types</SelectItem>
									{ENTITY_TYPES.map(t => (
										<SelectItem key={t} value={t}>
											{t.replace(/_/g, " ")}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="flex flex-col gap-1">
							<Label className="text-xs">From</Label>
							<Input
								type="date"
								className="w-36 text-xs h-9"
								value={dateFrom}
								onChange={e => { setDateFrom(e.target.value); setPage(1) }}
							/>
						</div>

						<div className="flex flex-col gap-1">
							<Label className="text-xs">To</Label>
							<Input
								type="date"
								className="w-36 text-xs h-9"
								value={dateTo}
								onChange={e => { setDateTo(e.target.value); setPage(1) }}
							/>
						</div>

						{(dateFrom || dateTo || entityType !== "all") && (
							<Button
								variant="ghost"
								size="sm"
								className="text-xs"
								onClick={() => {
									setDateFrom("")
									setDateTo("")
									setEntityType("all")
									setPage(1)
								}}
							>
								Clear filters
							</Button>
						)}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="pt-4">
					{error && (
						<div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
							{String(error)}
						</div>
					)}

					{isLoading ? (
						<div className="space-y-2">
							{Array.from({ length: 5 }).map((_, i) => (
								<Skeleton key={i} className="h-10 w-full" />
							))}
						</div>
					) : (
						<div className="overflow-x-auto rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Timestamp</TableHead>
										<TableHead>Entity Type</TableHead>
										<TableHead>Action</TableHead>
										<TableHead>Description</TableHead>
										<TableHead>Actor</TableHead>
										<TableHead className="w-8" />
									</TableRow>
								</TableHeader>
								<TableBody>
									{data?.data.map(entry => (
										<>
											<TableRow
												key={entry.id}
												className="cursor-pointer hover:bg-muted/50"
												onClick={() => setExpandedId(prev => prev === entry.id ? null : entry.id)}
											>
												<TableCell className="text-xs whitespace-nowrap">
													{formatDateTime(entry.at)}
												</TableCell>
												<TableCell className="text-xs">
													<span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
														{entry.entityType}
													</span>
												</TableCell>
												<TableCell>
													<Badge
														variant="secondary"
														className={`text-[10px] ${ACTION_COLORS[entry.action] ?? ""}`}
													>
														{entry.action}
													</Badge>
												</TableCell>
												<TableCell className="max-w-64 truncate text-xs">
													{entry.description}
												</TableCell>
												<TableCell className="font-mono text-[10px] truncate max-w-32" title={entry.actor}>
													{entry.actor.slice(0, 12)}…
												</TableCell>
												<TableCell className="text-muted-foreground text-xs">
													{expandedId === entry.id ? "▲" : "▼"}
												</TableCell>
											</TableRow>

											{expandedId === entry.id && (
												<TableRow key={`${entry.id}-detail`} className="bg-muted/20">
													<TableCell colSpan={6} className="p-4">
														<div className="grid grid-cols-2 gap-4 text-xs">
															<div>
																<p className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] mb-1">
																	Before
																</p>
																{entry.beforeState != null ? (
																	<pre className="max-h-40 overflow-y-auto rounded bg-muted p-2 text-[11px]">
																		{JSON.stringify(entry.beforeState, null, 2)}
																	</pre>
																) : (
																	<span className="italic text-muted-foreground">—</span>
																)}
															</div>
															<div>
																<p className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] mb-1">
																	After
																</p>
																{entry.afterState != null ? (
																	<pre className="max-h-40 overflow-y-auto rounded bg-muted p-2 text-[11px]">
																		{JSON.stringify(entry.afterState, null, 2)}
																	</pre>
																) : (
																	<span className="italic text-muted-foreground">—</span>
																)}
															</div>
														</div>
													</TableCell>
												</TableRow>
											)}
										</>
									))}

									{data?.data.length === 0 && (
										<TableRow>
											<TableCell colSpan={6} className="py-8 text-center text-muted-foreground text-sm">
												No configuration changes found for the selected filters.
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</div>
					)}

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
									onClick={() => setPage(p => p - 1)}
								>
									Previous
								</Button>
								<Button
									variant="outline"
									size="sm"
									disabled={data.page >= data.totalPages}
									onClick={() => setPage(p => p + 1)}
								>
									Next
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
