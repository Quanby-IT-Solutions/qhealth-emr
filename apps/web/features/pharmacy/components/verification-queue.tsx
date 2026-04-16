"use client"

import { useState } from "react"

import { AlertTriangle, ChevronRight, Filter, RefreshCw, Search, ShieldAlert } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

import {
	type OrderPriority,
	type PharmacyQueueItem,
	type QueueStatus,
	usePharmacyQueueQuery,
} from "../api/pharmacy.hooks"

// ── Helpers ──────────────────────────────────────────────────────────────────

function priorityBadge(priority: OrderPriority) {
	if (priority === "stat")
		return <Badge variant="destructive">STAT</Badge>
	if (priority === "urgent")
		return <Badge variant="secondary" className="border-amber-400 text-amber-700">Urgent</Badge>
	return <Badge variant="outline">Routine</Badge>
}

function statusBadge(status: QueueStatus) {
	switch (status) {
		case "pending_verification":
			return <Badge variant="secondary">Pending</Badge>
		case "on_hold":
			return <Badge variant="outline">On Hold</Badge>
		case "verified":
			return <Badge variant="default">Verified</Badge>
		case "rejected":
			return <Badge variant="destructive">Rejected</Badge>
	}
}

function formatAge(dateOfBirth: string | null) {
	if (!dateOfBirth) return null
	const age = Math.floor(
		(Date.now() - new Date(dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
	)
	return `${age}y`
}

function formatTime(dateStr: string) {
	return new Date(dateStr).toLocaleString("en-PH", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

function minutesSince(dateStr: string) {
	return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000)
}

// ── Queue row ─────────────────────────────────────────────────────────────────

interface QueueRowProps {
	item: PharmacyQueueItem
	onReview: (id: string) => void
}

function QueueRow({ item, onReview }: QueueRowProps) {
	const age = formatAge(item.patientDateOfBirth)
	const waitMinutes = minutesSince(item.receivedAt)

	return (
		<TableRow
			className="cursor-pointer hover:bg-muted/50"
			onClick={() => onReview(item.id)}
		>
			<TableCell>
				<div>
					<p className="font-medium">{item.patientName}</p>
					<p className="text-muted-foreground text-xs">
						MRN: {item.patientMrn}
						{age ? ` · ${age}` : ""}
					</p>
				</div>
			</TableCell>
			<TableCell>
				<div>
					<p className="text-sm font-medium">{item.genericName}</p>
					{item.brandName && (
						<p className="text-muted-foreground text-xs">({item.brandName})</p>
					)}
					<p className="text-muted-foreground text-xs">
						{item.dose} {item.doseUnit} · {item.route} · {item.frequency}
					</p>
				</div>
			</TableCell>
			<TableCell>{priorityBadge(item.priority)}</TableCell>
			<TableCell>{statusBadge(item.status)}</TableCell>
			<TableCell>
				<div className="flex items-center gap-1">
					{item.criticalAlertCount > 0 && (
						<span className="flex items-center gap-0.5 text-xs text-red-600">
							<ShieldAlert className="size-3.5" />
							{item.criticalAlertCount} critical
						</span>
					)}
					{item.alertCount > 0 && item.criticalAlertCount === 0 && (
						<span className="flex items-center gap-0.5 text-xs text-amber-600">
							<AlertTriangle className="size-3.5" />
							{item.alertCount} alert{item.alertCount > 1 ? "s" : ""}
						</span>
					)}
					{item.alertCount === 0 && (
						<span className="text-muted-foreground text-xs">None</span>
					)}
				</div>
			</TableCell>
			<TableCell>
				<div>
					<p className="text-xs">{item.orderingStaffName ?? "Unknown"}</p>
				</div>
			</TableCell>
			<TableCell>
				<div>
					<p className="text-xs">{formatTime(item.receivedAt)}</p>
					{waitMinutes >= 60 && (
						<p className="text-xs text-amber-600">{Math.floor(waitMinutes / 60)}h {waitMinutes % 60}m wait</p>
					)}
					{waitMinutes < 60 && (
						<p className="text-muted-foreground text-xs">{waitMinutes}m ago</p>
					)}
				</div>
			</TableCell>
			{item.isControlledSubstance && (
				<TableCell>
					<Badge variant="outline" className="text-xs">
						S{item.pdeaSchedule ?? "?"}
					</Badge>
				</TableCell>
			)}
			{!item.isControlledSubstance && <TableCell />}
			<TableCell>
				<Button
					size="sm"
					variant="ghost"
					onClick={(e) => {
						e.stopPropagation()
						onReview(item.id)
					}}
				>
					Review <ChevronRight className="ml-1 size-3.5" />
				</Button>
			</TableCell>
		</TableRow>
	)
}

// ── Main component ────────────────────────────────────────────────────────────

interface VerificationQueueProps {
	onSelectOrder: (orderId: string) => void
}

export function VerificationQueue({ onSelectOrder }: VerificationQueueProps) {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	const [search, setSearch] = useState("")
	const [statusFilter, setStatusFilter] = useState<QueueStatus | "all">("pending_verification")
	const [priorityFilter, setPriorityFilter] = useState<OrderPriority | "all">("all")
	const [csOnly, setCsOnly] = useState(false)

	const queue = usePharmacyQueueQuery({
		facilityId,
		status: statusFilter,
		priority: priorityFilter === "all" ? undefined : priorityFilter,
		search: search.trim() || undefined,
		isControlledSubstance: csOnly || undefined,
		limit: 50,
	})

	const items = queue.data?.data ?? []

	// Stat orders always appear first in UI even if API doesn't sort
	const sorted = [...items].sort((a, b) => {
		const priorityOrder = { stat: 0, urgent: 1, routine: 2 }
		return priorityOrder[a.priority] - priorityOrder[b.priority]
	})

	return (
		<div className="space-y-4">
			{/* Controls */}
			<Card>
				<CardContent className="flex flex-wrap items-end gap-4 pt-4">
					<div className="min-w-52 flex-1">
						<Label htmlFor="qSearch" className="mb-1 block text-sm">
							Search patient or drug
						</Label>
						<div className="relative">
							<Search className="text-muted-foreground absolute left-2.5 top-2.5 size-4" />
							<Input
								id="qSearch"
								className="pl-8"
								placeholder="Name, MRN, or drug name…"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
						</div>
					</div>

					<div>
						<Label className="mb-1 block text-sm">Status</Label>
						<Select
							value={statusFilter}
							onValueChange={(v) => setStatusFilter(v as QueueStatus | "all")}
						>
							<SelectTrigger className="w-40">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="pending_verification">Pending</SelectItem>
								<SelectItem value="on_hold">On Hold</SelectItem>
								<SelectItem value="verified">Verified</SelectItem>
								<SelectItem value="rejected">Rejected</SelectItem>
								<SelectItem value="all">All</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div>
						<Label className="mb-1 block text-sm">Priority</Label>
						<Select
							value={priorityFilter}
							onValueChange={(v) => setPriorityFilter(v as OrderPriority | "all")}
						>
							<SelectTrigger className="w-32">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All</SelectItem>
								<SelectItem value="stat">STAT</SelectItem>
								<SelectItem value="urgent">Urgent</SelectItem>
								<SelectItem value="routine">Routine</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="flex items-center gap-2 self-end pb-0.5">
						<Filter className="size-4" />
						<label className="flex cursor-pointer items-center gap-1.5 text-sm">
							<input
								type="checkbox"
								checked={csOnly}
								onChange={(e) => setCsOnly(e.target.checked)}
								className="accent-primary"
							/>
							Controlled only
						</label>
					</div>

					<Button
						variant="outline"
						size="sm"
						className="self-end"
						onClick={() => queue.refetch()}
						disabled={queue.isFetching}
					>
						<RefreshCw className={`mr-1.5 size-3.5 ${queue.isFetching ? "animate-spin" : ""}`} />
						Refresh
					</Button>
				</CardContent>
			</Card>

			{/* Stats strip */}
			<div className="flex flex-wrap gap-3">
				{(["stat", "urgent", "routine"] as const).map((p) => {
					const count = items.filter((i) => i.priority === p).length
					if (count === 0) return null
					return (
						<div key={p} className="text-sm">
							{priorityBadge(p)}{" "}
							<span className="font-medium">{count}</span>
						</div>
					)
				})}
				{queue.data && (
					<p className="text-muted-foreground text-sm">
						Total: {queue.data.total} orders
					</p>
				)}
			</div>

			{/* Table */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Verification Queue</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					{queue.isLoading ? (
						<div className="p-6 text-center">
							<div className="mx-auto size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
						</div>
					) : sorted.length === 0 ? (
						<p className="text-muted-foreground p-8 text-center text-sm">
							No orders match the current filters.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Patient</TableHead>
									<TableHead>Medication</TableHead>
									<TableHead>Priority</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Alerts</TableHead>
									<TableHead>Ordered By</TableHead>
									<TableHead>Received</TableHead>
									<TableHead>CS</TableHead>
									<TableHead />
								</TableRow>
							</TableHeader>
							<TableBody>
								{sorted.map((item) => (
									<QueueRow key={item.id} item={item} onReview={onSelectOrder} />
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
