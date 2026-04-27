"use client"

import { useState } from "react"

import { ArrowRight, Clock3, FlaskConical, ShieldCheck, TriangleAlert } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { cn } from "@/core/lib/utils"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { type LabOrder, useLabDashboardQuery } from "@/features/lab/api/lab.hooks"

import { LabResultDetail } from "./lab-result-detail"

// ============================================================================
// Helpers
// ============================================================================

function formatDateTime(d: string | null | undefined) {
	if (!d) return "—"
	return new Date(d).toLocaleString("en-PH", {
		hour: "2-digit",
		minute: "2-digit",
	})
}

function formatAccession(orderId: string) {
	return `L-${orderId.slice(0, 4).toUpperCase()}-${orderId.slice(4, 8).toUpperCase()}`
}

function priorityBadge(priority: LabOrder["priority"]) {
	switch (priority) {
		case "stat":
			return <Badge variant="destructive">STAT</Badge>
		case "urgent":
			return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Urgent</Badge>
		default:
			return <Badge variant="outline">Routine</Badge>
	}
}

function statusBadge(status: LabOrder["status"]) {
	switch (status) {
		case "pending":
			return <Badge variant="outline">Pending</Badge>
		case "in_progress":
			return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">In Progress</Badge>
		case "completed":
			return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Awaiting Validation</Badge>
		case "cancelled":
			return (
				<Badge variant="outline" className="text-muted-foreground">
					Cancelled
				</Badge>
			)
		default:
			return <Badge variant="outline">{status}</Badge>
	}
}

// ============================================================================
// Lab Order Row
// ============================================================================

function LabOrderRow({
	order,
	onEnter,
}: {
	order: LabOrder
	onEnter: (order: LabOrder) => void
}) {
	return (
		<TableRow>
			<TableCell>
				<span className="font-mono text-xs">{formatAccession(order.id)}</span>
			</TableCell>
			<TableCell>
				<div>
					<p className="font-medium">{order.patientName ?? "—"}</p>
					<p className="text-xs text-muted-foreground">MRN {order.patientId?.slice(0, 10) ?? "N/A"}</p>
				</div>
			</TableCell>
			<TableCell>{order.encounterId ? `ENC-${order.encounterId.slice(0, 4).toUpperCase()}` : "—"}</TableCell>
			<TableCell>{order.panelName ?? order.testName}</TableCell>
			<TableCell>{priorityBadge(order.priority)}</TableCell>
			<TableCell>{statusBadge(order.status)}</TableCell>
			<TableCell>{formatDateTime(order.collectionDatetime ?? order.createdAt)}</TableCell>
			<TableCell className="text-right">
				<Button variant="ghost" size="sm" onClick={() => onEnter(order)}>
					Enter
					<ArrowRight className="ml-1 size-4" />
				</Button>
			</TableCell>
		</TableRow>
	)
}

// ============================================================================
// Lab Orders Table
// ============================================================================

function LabOrdersTable({
	orders,
	isLoading,
	onEnter,
}: {
	orders: LabOrder[]
	isLoading: boolean
	onEnter: (order: LabOrder) => void
}) {
	if (isLoading) {
		return (
			<div className="py-12 text-center text-sm text-muted-foreground">
				Loading lab orders…
			</div>
		)
	}

	if (orders.length === 0) {
		return (
			<div className="flex flex-col items-center gap-2 py-12">
				<FlaskConical className="size-8 text-muted-foreground/40" />
				<p className="text-sm text-muted-foreground">No orders found.</p>
			</div>
		)
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Accession</TableHead>
					<TableHead>Patient</TableHead>
					<TableHead>Ward</TableHead>
					<TableHead>Panel</TableHead>
					<TableHead>Priority</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Collected</TableHead>
					<TableHead className="text-right" />
				</TableRow>
			</TableHeader>
			<TableBody>
				{orders.map((order) => (
					<LabOrderRow key={order.id} order={order} onEnter={onEnter} />
				))}
			</TableBody>
		</Table>
	)
}

// ============================================================================
// Main Dashboard
// ============================================================================

export function LabDashboard() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	const [priorityFilter, setPriorityFilter] = useState<string>("all")
	const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null)
	const [detailOpen, setDetailOpen] = useState(false)

	const buildParams = (status: "pending" | "in_progress" | "completed") => ({
		facilityId,
		status,
		priority: priorityFilter !== "all" ? priorityFilter : undefined,
		limit: 50,
	})

	const pendingQuery = useLabDashboardQuery(buildParams("pending"))
	const inProgressQuery = useLabDashboardQuery(buildParams("in_progress"))
	const completedQuery = useLabDashboardQuery(buildParams("completed"))

	function handleEnter(order: LabOrder) {
		setSelectedOrder(order)
		setDetailOpen(true)
	}

	const allOrders = [
		...(pendingQuery.data?.data ?? []),
		...(inProgressQuery.data?.data ?? []),
		...(completedQuery.data?.data ?? []),
	].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

	const releasedTodayCount = (completedQuery.data?.data ?? []).filter((order) => {
		if (!order.resultedDatetime) return false
		const today = new Date()
		const date = new Date(order.resultedDatetime)
		return (
			date.getFullYear() === today.getFullYear() &&
			date.getMonth() === today.getMonth() &&
			date.getDate() === today.getDate()
		)
	}).length

	const filterOptions: Array<{ value: string; label: string }> = [
		{ value: "all", label: "All" },
		{ value: "stat", label: "STAT" },
		{ value: "urgent", label: "Urgent" },
		{ value: "routine", label: "Routine" },
	]

	return (
		<div className="space-y-5">
			<div className="flex items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold">Lab Result Entry & Validation</h1>
					<p className="text-sm text-muted-foreground">
						Pending and in-progress orders requiring manual entry and validation
					</p>
				</div>

				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm">
						Filters
					</Button>
					<Button size="sm">New manual entry</Button>
				</div>
			</div>

			<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Pending</CardTitle>
					</CardHeader>
					<CardContent className="flex items-end justify-between">
						<p className="text-3xl font-semibold text-rose-600">{pendingQuery.data?.total ?? 0}</p>
						<Clock3 className="size-4 text-rose-500" />
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">In Progress</CardTitle>
					</CardHeader>
					<CardContent className="flex items-end justify-between">
						<p className="text-3xl font-semibold text-blue-600">{inProgressQuery.data?.total ?? 0}</p>
						<FlaskConical className="size-4 text-blue-500" />
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Awaiting Validation</CardTitle>
					</CardHeader>
					<CardContent className="flex items-end justify-between">
						<p className="text-3xl font-semibold">{completedQuery.data?.total ?? 0}</p>
						<TriangleAlert className="size-4 text-muted-foreground" />
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Released Today</CardTitle>
					</CardHeader>
					<CardContent className="flex items-end justify-between">
						<p className="text-3xl font-semibold text-emerald-600">{releasedTodayCount}</p>
						<ShieldCheck className="size-4 text-emerald-500" />
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardContent className="space-y-3 pt-4">
					<div className="flex items-center justify-between gap-2">
						<div className="inline-flex rounded-md border bg-muted/40 p-1">
							{filterOptions.map((filter) => (
								<button
									key={filter.value}
									type="button"
									onClick={() => setPriorityFilter(filter.value)}
									className={cn(
										"rounded px-3 py-1 text-xs font-medium transition",
										priorityFilter === filter.value
											? "bg-background text-foreground shadow-sm"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									{filter.label}
								</button>
							))}
						</div>
						<p className="text-xs text-muted-foreground">Updated just now</p>
					</div>
					<LabOrdersTable
						orders={allOrders}
						isLoading={pendingQuery.isLoading || inProgressQuery.isLoading || completedQuery.isLoading}
						onEnter={handleEnter}
					/>
				</CardContent>
			</Card>

			<LabResultDetail
				order={selectedOrder}
				open={detailOpen}
				onOpenChange={setDetailOpen}
			/>
		</div>
	)
}
