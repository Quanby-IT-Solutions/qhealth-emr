"use client"

import { useState } from "react"

import { AlertCircle, FlaskConical } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { type LabOrder, useLabDashboardQuery } from "@/features/lab/api/lab.hooks"

import { LabResultDetail } from "./lab-result-detail"

// ============================================================================
// Helpers
// ============================================================================

function formatDateTime(d: string | null | undefined) {
	if (!d) return "—"
	return new Date(d).toLocaleString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

function priorityBadge(priority: string) {
	switch (priority) {
		case "stat":
			return <Badge variant="destructive">STAT</Badge>
		case "urgent":
			return <Badge variant="secondary">Urgent</Badge>
		default:
			return <Badge variant="outline">Routine</Badge>
	}
}

function statusBadge(status: string) {
	switch (status) {
		case "pending":
			return <Badge variant="outline">Pending</Badge>
		case "in_progress":
			return <Badge variant="secondary">In Progress</Badge>
		case "completed":
			return <Badge variant="default">Completed</Badge>
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
	onViewResult,
}: {
	order: LabOrder
	onViewResult: (order: LabOrder) => void
}) {
	return (
		<TableRow>
			<TableCell>
				<div className="flex items-center gap-1">
					{order.hasCriticalValues && (
						<AlertCircle className="size-4 shrink-0 text-destructive" />
					)}
					<span className="font-medium">{order.patientName ?? "—"}</span>
				</div>
			</TableCell>
			<TableCell>
				<div>
					<p className="font-medium">{order.panelName ?? order.testName}</p>
					{order.panelName && (
						<p className="text-xs text-muted-foreground">{order.testName}</p>
					)}
				</div>
			</TableCell>
			<TableCell>{order.specimenType ?? "—"}</TableCell>
			<TableCell>{priorityBadge(order.priority)}</TableCell>
			<TableCell>{formatDateTime(order.createdAt)}</TableCell>
			<TableCell>{formatDateTime(order.collectionDatetime)}</TableCell>
			<TableCell>{statusBadge(order.status)}</TableCell>
			<TableCell>
				{order.status === "completed" && (
					<Button
						variant="outline"
						size="sm"
						onClick={() => onViewResult(order)}
					>
						View Results
					</Button>
				)}
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
	onViewResult,
}: {
	orders: LabOrder[]
	isLoading: boolean
	onViewResult: (order: LabOrder) => void
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
					<TableHead>Patient</TableHead>
					<TableHead>Test / Panel</TableHead>
					<TableHead>Specimen</TableHead>
					<TableHead>Priority</TableHead>
					<TableHead>Ordered</TableHead>
					<TableHead>Collection</TableHead>
					<TableHead>Status</TableHead>
					<TableHead />
				</TableRow>
			</TableHeader>
			<TableBody>
				{orders.map((order) => (
					<LabOrderRow key={order.id} order={order} onViewResult={onViewResult} />
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

	function handleViewResult(order: LabOrder) {
		setSelectedOrder(order)
		setDetailOpen(true)
	}

	const criticalCount =
		(completedQuery.data?.data.filter((o) => o.hasCriticalValues).length ?? 0) +
		(inProgressQuery.data?.data.filter((o) => o.hasCriticalValues).length ?? 0)

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Laboratory Orders</h1>
					<p className="text-sm text-muted-foreground">
						Facility-wide lab order tracking and results
					</p>
				</div>

				<div className="flex items-center gap-2">
					{criticalCount > 0 && (
						<div className="flex items-center gap-1 rounded-md border border-destructive bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive">
							<AlertCircle className="size-4" />
							{criticalCount} critical value{criticalCount > 1 ? "s" : ""}
						</div>
					)}
					<Select value={priorityFilter} onValueChange={setPriorityFilter}>
						<SelectTrigger className="w-36">
							<SelectValue placeholder="All priorities" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All priorities</SelectItem>
							<SelectItem value="stat">STAT only</SelectItem>
							<SelectItem value="urgent">Urgent only</SelectItem>
							<SelectItem value="routine">Routine only</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Tabs */}
			<Card>
				<CardHeader className="pb-0">
					<CardTitle className="text-base">Lab Orders</CardTitle>
				</CardHeader>
				<CardContent className="pt-0">
					<Tabs defaultValue="pending">
						<TabsList className="mb-4 mt-2">
							<TabsTrigger value="pending">
								Pending
								{(pendingQuery.data?.total ?? 0) > 0 && (
									<Badge
										variant="secondary"
										className="ml-1.5 text-[10px]"
									>
										{pendingQuery.data?.total}
									</Badge>
								)}
							</TabsTrigger>
							<TabsTrigger value="in_progress">
								In Progress
								{(inProgressQuery.data?.total ?? 0) > 0 && (
									<Badge
										variant="secondary"
										className="ml-1.5 text-[10px]"
									>
										{inProgressQuery.data?.total}
									</Badge>
								)}
							</TabsTrigger>
							<TabsTrigger value="completed">
								Completed
								{(completedQuery.data?.total ?? 0) > 0 && (
									<Badge
										variant="outline"
										className="ml-1.5 text-[10px]"
									>
										{completedQuery.data?.total}
									</Badge>
								)}
							</TabsTrigger>
						</TabsList>

						<TabsContent value="pending">
							<LabOrdersTable
								orders={pendingQuery.data?.data ?? []}
								isLoading={pendingQuery.isLoading}
								onViewResult={handleViewResult}
							/>
						</TabsContent>

						<TabsContent value="in_progress">
							<LabOrdersTable
								orders={inProgressQuery.data?.data ?? []}
								isLoading={inProgressQuery.isLoading}
								onViewResult={handleViewResult}
							/>
						</TabsContent>

						<TabsContent value="completed">
							<LabOrdersTable
								orders={completedQuery.data?.data ?? []}
								isLoading={completedQuery.isLoading}
								onViewResult={handleViewResult}
							/>
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>

			{/* Result Detail Modal */}
			<LabResultDetail
				order={selectedOrder}
				open={detailOpen}
				onOpenChange={setDetailOpen}
			/>
		</div>
	)
}
