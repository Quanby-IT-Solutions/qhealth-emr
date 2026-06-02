"use client"

import { useState } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Skeleton } from "@/core/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table"

// Placeholder data until ADM-BE-07 is implemented
interface ExchangeLogEntry {
	id: string
	resourceType: string
	direction: "push" | "pull"
	status: "success" | "error" | "pending"
	recordCount: number
	durationMs: number
	occurredAt: string
	errorMessage?: string
}

const MOCK_LOG: ExchangeLogEntry[] = []

const PAGE_SIZE = 100

export function ExchangeLogTable() {
	const [resourceFilter, setResourceFilter] = useState("")
	const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error" | "pending">("all")
	const [dateFrom, setDateFrom] = useState("")
	const [dateTo, setDateTo] = useState("")
	const [page, setPage] = useState(1)

	const filtered = MOCK_LOG.filter(e => {
		if (resourceFilter && !e.resourceType.toLowerCase().includes(resourceFilter.toLowerCase())) return false
		if (statusFilter !== "all" && e.status !== statusFilter) return false
		if (dateFrom && e.occurredAt < dateFrom) return false
		if (dateTo && e.occurredAt > `${dateTo}T23:59:59`) return false
		return true
	})

	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
	const visibleEntries = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap gap-2">
				<Input
					placeholder="Filter by resource type..."
					value={resourceFilter}
					onChange={e => setResourceFilter(e.target.value)}
					className="max-w-xs"
				/>
				<Select value={statusFilter} onValueChange={v => setStatusFilter((v ?? "all") as typeof statusFilter)}>
					<SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All statuses</SelectItem>
						<SelectItem value="success">Success</SelectItem>
						<SelectItem value="error">Error</SelectItem>
						<SelectItem value="pending">Pending</SelectItem>
					</SelectContent>
				</Select>
				<Input
					type="date"
					value={dateFrom}
					onChange={e => { setDateFrom(e.target.value); setPage(1) }}
					className="w-40"
					aria-label="From date"
				/>
				<Input
					type="date"
					value={dateTo}
					onChange={e => { setDateTo(e.target.value); setPage(1) }}
					className="w-40"
					aria-label="To date"
				/>
			</div>

			{filtered.length === 0 ? (
				<p className="text-sm text-muted-foreground py-8 text-center">No exchange log entries yet.</p>
			) : (
				<>
					{filtered.length > PAGE_SIZE && (
						<p className="text-xs text-muted-foreground">
							Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} entries
						</p>
					)}
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Resource</TableHead>
								<TableHead>Direction</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="text-right">Records</TableHead>
								<TableHead className="text-right">Duration</TableHead>
								<TableHead>Time</TableHead>
								<TableHead />
							</TableRow>
						</TableHeader>
						<TableBody>
							{visibleEntries.map(entry => (
								<TableRow key={entry.id}>
									<TableCell className="font-medium">{entry.resourceType}</TableCell>
									<TableCell>{entry.direction}</TableCell>
									<TableCell>
										<Badge variant={entry.status === "success" ? "default" : entry.status === "error" ? "destructive" : "secondary"}>
											{entry.status}
										</Badge>
									</TableCell>
									<TableCell className="text-right">{entry.recordCount}</TableCell>
									<TableCell className="text-right">{entry.durationMs}ms</TableCell>
									<TableCell className="text-xs text-muted-foreground">{entry.occurredAt}</TableCell>
									<TableCell>
										{entry.status === "error" && (
											<Button variant="ghost" size="sm">Retry</Button>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
					{totalPages > 1 && (
						<div className="flex items-center justify-between pt-2">
							<p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
							<div className="flex gap-2">
								<Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
								<Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
							</div>
						</div>
					)}
				</>
			)}
		</div>
	)
}
