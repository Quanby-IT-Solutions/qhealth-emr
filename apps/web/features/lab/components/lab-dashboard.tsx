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
import { useActiveFacilityId } from "@/core/hooks/use-active-facility"
import { type LabOrder, type LabOrderStatus, useLabDashboardQuery } from "@/features/lab/api/lab.hooks"

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

function formatTAT(orderedAt: string, resultedAt: string | null): string {
	if (!resultedAt) return "—"
	const diffMs = new Date(resultedAt).getTime() - new Date(orderedAt).getTime()
	const diffMins = Math.floor(diffMs / 60000)
	if (diffMins < 1) return "<1m"
	if (diffMins < 60) return `${diffMins}m`
	const hours = Math.floor(diffMins / 60)
	const mins = diffMins % 60
	return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
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

function statusBadge(status: LabOrderStatus) {
	switch (status) {
		case "ordered":
			return <Badge variant="outline">Ordered</Badge>
		case "pending":
			return <Badge variant="outline">Pending</Badge>
		case "collected":
			return <Badge variant="secondary">Collected</Badge>
		case "in_progress":
			return <Badge variant="secondary">In Progress</Badge>
		case "resulted":
			return <Badge variant="secondary">Resulted</Badge>
		case "completed":
			return <Badge variant="default">Completed</Badge>
		case "cancelled":
			return (
				<Badge variant="outline" className="text-muted-foreground">
					Cancelled
				</Badge>
			)
	}
}

function indicationSummary(order: LabOrder) {
	const diagnosis = [order.indicationIcd10Code, order.indicationIcd10Display]
		.filter(Boolean)
		.join(" - ")
	return {
		clinical: order.clinicalIndication,
		diagnosis: diagnosis || null,
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
	const indication = indicationSummary(order)

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
			<TableCell>
				<div className="max-w-[220px]">
					<p className="truncate text-sm">{indication.clinical ?? "—"}</p>
					{indication.diagnosis && (
						<p className="truncate text-xs text-muted-foreground">{indication.diagnosis}</p>
					)}
				</div>
			</TableCell>
			<TableCell>{priorityBadge(order.priority)}</TableCell>
			<TableCell>{formatDateTime(order.createdAt)}</TableCell>
			<TableCell>{formatDateTime(order.collectionDatetime)}</TableCell>
			<TableCell>{statusBadge(order.status)}</TableCell>
			<TableCell className="text-xs text-muted-foreground">
				{formatTAT(order.createdAt, order.resultedDatetime)}
			</TableCell>
			<TableCell>
				{(order.status === "resulted" || order.status === "completed") && (
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
					<TableHead>Indication</TableHead>
					<TableHead>Priority</TableHead>
					<TableHead>Ordered</TableHead>
					<TableHead>Collection</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>TAT</TableHead>
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
// Status classification — single rule mapping every backend status to a tab
// ============================================================================

type DashboardTab = "pending" | "in_progress" | "completed"

// Every lab order status maps to exactly one visible tab; none are omitted.
const STATUS_TAB: Record<LabOrderStatus, DashboardTab> = {
	ordered:    "pending",
	pending:    "pending",
	collected:  "in_progress",
	in_progress:"in_progress",
	resulted:   "in_progress",
	completed:  "completed",
	cancelled:  "completed",
}

const TAB_STATUSES = (Object.entries(STATUS_TAB) as [LabOrderStatus, DashboardTab][]).reduce(
	(acc, [status, tab]) => ({ ...acc, [tab]: [...(acc[tab] ?? []), status] }),
	{} as Record<DashboardTab, LabOrderStatus[]>,
)

// ============================================================================
// Main Dashboard
// ============================================================================

export function LabDashboard() {
	const facilityId = useActiveFacilityId() ?? ""

	const [priorityFilter, setPriorityFilter] = useState<string>("all")
	const [activeTab, setActiveTab] = useState<DashboardTab>("pending")
	const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null)
	const [detailOpen, setDetailOpen] = useState(false)

	const buildParams = (status: LabOrderStatus) => ({
		facilityId,
		status,
		priority: priorityFilter !== "all" ? priorityFilter : undefined,
		limit: 50,
	})

	// "Pending" tab: ordered + pending
	const statusOrderedQ    = useLabDashboardQuery(buildParams("ordered"),    { enabled: activeTab === "pending" })
	const statusPendingQ    = useLabDashboardQuery(buildParams("pending"),    { enabled: activeTab === "pending" })
	// "In Progress" tab: collected + in_progress + resulted
	const statusCollectedQ  = useLabDashboardQuery(buildParams("collected"),  { enabled: activeTab === "in_progress" })
	const statusInProgressQ = useLabDashboardQuery(buildParams("in_progress"),{ enabled: activeTab === "in_progress" })
	const statusResultedQ   = useLabDashboardQuery(buildParams("resulted"),   { enabled: activeTab === "in_progress" })
	// "Completed" tab: completed + cancelled
	const statusCompletedQ  = useLabDashboardQuery(buildParams("completed"),  { enabled: activeTab === "completed" })
	const statusCancelledQ  = useLabDashboardQuery(buildParams("cancelled"),  { enabled: activeTab === "completed" })

	const pendingOrders     = [...(statusOrderedQ.data?.data ?? []),    ...(statusPendingQ.data?.data ?? [])]
	const pendingTotal      = (statusOrderedQ.data?.total ?? 0)         + (statusPendingQ.data?.total ?? 0)
	const pendingLoading    = statusOrderedQ.isLoading                  || statusPendingQ.isLoading

	const inProgressOrders  = [...(statusCollectedQ.data?.data ?? []),  ...(statusInProgressQ.data?.data ?? []),  ...(statusResultedQ.data?.data ?? [])]
	const inProgressTotal   = (statusCollectedQ.data?.total ?? 0)       + (statusInProgressQ.data?.total ?? 0)    + (statusResultedQ.data?.total ?? 0)
	const inProgressLoading = statusCollectedQ.isLoading                || statusInProgressQ.isLoading             || statusResultedQ.isLoading

	const completedOrders   = [...(statusCompletedQ.data?.data ?? []),  ...(statusCancelledQ.data?.data ?? [])]
	const completedTotal    = (statusCompletedQ.data?.total ?? 0)       + (statusCancelledQ.data?.total ?? 0)
	const completedLoading  = statusCompletedQ.isLoading                || statusCancelledQ.isLoading

	function handleViewResult(order: LabOrder) {
		setSelectedOrder(order)
		setDetailOpen(true)
	}

	// Count critical values across whichever tab data has been fetched
	const criticalCount = [...inProgressOrders, ...completedOrders].filter((o) => o.hasCriticalValues).length

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
					<Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v ?? "all")}>
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
					<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DashboardTab)}>
						<TabsList className="mb-4 mt-2">
							<TabsTrigger value="pending">
								Pending
								{pendingTotal > 0 && (
									<Badge variant="secondary" className="ml-1.5 text-[10px]">
										{pendingTotal}
									</Badge>
								)}
							</TabsTrigger>
							<TabsTrigger value="in_progress">
								In Progress
								{inProgressTotal > 0 && (
									<Badge variant="secondary" className="ml-1.5 text-[10px]">
										{inProgressTotal}
									</Badge>
								)}
							</TabsTrigger>
							<TabsTrigger value="completed">
								Completed
								{completedTotal > 0 && (
									<Badge variant="outline" className="ml-1.5 text-[10px]">
										{completedTotal}
									</Badge>
								)}
							</TabsTrigger>
						</TabsList>

						<TabsContent value="pending">
							<LabOrdersTable
								orders={pendingOrders}
								isLoading={pendingLoading}
								onViewResult={handleViewResult}
							/>
						</TabsContent>

						<TabsContent value="in_progress">
							<LabOrdersTable
								orders={inProgressOrders}
								isLoading={inProgressLoading}
								onViewResult={handleViewResult}
							/>
						</TabsContent>

						<TabsContent value="completed">
							<LabOrdersTable
								orders={completedOrders}
								isLoading={completedLoading}
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

// Exported for use by other components that need to classify a lab order status
export { TAB_STATUSES, STATUS_TAB, type DashboardTab }
