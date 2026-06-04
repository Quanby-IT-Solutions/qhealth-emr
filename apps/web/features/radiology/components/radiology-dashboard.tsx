"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, ScanSearch } from "lucide-react"

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
import { PacsLink } from "@/features/orders/components/pacs-link"
import { RadiologyReport } from "@/features/orders/components/radiology-report"
import {
	useImagingDashboardQuery,
	type ImagingDashboardOrder,
} from "@/features/radiology/api/radiology.hooks"

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

function formatTAT(orderedAt: string, completedAt: string | null): string {
	if (!completedAt) return "—"
	const diffMs = new Date(completedAt).getTime() - new Date(orderedAt).getTime()
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

function statusBadge(status: string) {
	switch (status) {
		case "ordered":
			return <Badge variant="outline">Ordered</Badge>
		case "scheduled":
			return <Badge variant="secondary">Scheduled</Badge>
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
			return <Badge variant="outline">{status.replace(/_/g, " ")}</Badge>
	}
}

function getPacsUrl(structuredResults: unknown): string | null {
	if (!structuredResults || typeof structuredResults !== "object") return null
	const results = structuredResults as Record<string, unknown>
	return typeof results.pacsUrl === "string" ? results.pacsUrl : null
}

function indicationSummary(order: ImagingDashboardOrder) {
	const diagnosis = [order.indicationIcd10Code, order.indicationIcd10Display]
		.filter(Boolean)
		.join(" - ")
	return {
		clinical: order.clinicalIndication,
		diagnosis: diagnosis || null,
	}
}

type DashboardTab = "pending" | "in_progress" | "completed"

const IN_PROGRESS_STATUSES = new Set(["in_progress"])
const COMPLETED_STATUSES = new Set(["completed", "cancelled"])

function classifyOrder(order: ImagingDashboardOrder): DashboardTab {
	if (COMPLETED_STATUSES.has(order.status)) return "completed"
	if (IN_PROGRESS_STATUSES.has(order.status)) return "in_progress"
	return "pending"
}

// ============================================================================
// Order Row
// ============================================================================

function ImagingOrderRow({
	order,
	isExpanded,
	onToggleExpand,
}: {
	order: ImagingDashboardOrder
	isExpanded: boolean
	onToggleExpand: () => void
}) {
	const pacsUrl = getPacsUrl(order.structuredResults)
	const tab = classifyOrder(order)
	const indication = indicationSummary(order)

	return (
		<>
			<TableRow>
				<TableCell>
					<div>
						<p className="font-medium">{order.patientName ?? "—"}</p>
						{order.patientMrn && (
							<p className="text-muted-foreground text-xs">MRN: {order.patientMrn}</p>
						)}
					</div>
				</TableCell>
				<TableCell className="text-muted-foreground text-xs">
					{order.encounterId ? `${order.encounterId.slice(0, 8)}…` : "—"}
				</TableCell>
				<TableCell className="font-medium uppercase">{order.modality}</TableCell>
				<TableCell>{order.bodyPart}</TableCell>
				<TableCell>
					<div className="max-w-[220px]">
						<p className="truncate text-sm">{indication.clinical ?? "—"}</p>
						{indication.diagnosis && (
							<p className="text-muted-foreground truncate text-xs">{indication.diagnosis}</p>
						)}
					</div>
				</TableCell>
				<TableCell>{priorityBadge(order.priority)}</TableCell>
				<TableCell>{statusBadge(order.status)}</TableCell>
				<TableCell>{order.orderingStaffName ?? "—"}</TableCell>
				<TableCell>{formatDateTime(order.createdAt)}</TableCell>
				{tab === "completed" && (
					<TableCell className="text-muted-foreground text-xs">
						{formatTAT(order.createdAt, order.completedDatetime)}
					</TableCell>
				)}
				<TableCell className="text-right">
					<div className="flex items-center justify-end gap-2">
						<PacsLink
							orderId={order.id}
							pacsUrl={pacsUrl}
							modality={order.modality}
							bodyPart={order.bodyPart}
						/>
						<Button variant="ghost" size="sm" className="gap-1" onClick={onToggleExpand}>
							{isExpanded ? (
								<>
									<ChevronUp className="size-3.5" />
									Hide
								</>
							) : (
								<>
									<ChevronDown className="size-3.5" />
									Report
								</>
							)}
						</Button>
					</div>
				</TableCell>
			</TableRow>
			{isExpanded && (
				<TableRow>
					<TableCell colSpan={tab === "completed" ? 11 : 10} className="bg-muted/40 p-0">
						<RadiologyReport
							report={order.report}
							structuredResults={order.structuredResults}
							modality={order.modality}
							bodyPart={order.bodyPart}
							clinicalIndication={order.clinicalIndication}
							indicationIcd10Code={order.indicationIcd10Code}
							indicationIcd10Display={order.indicationIcd10Display}
							completedDatetime={order.completedDatetime}
						/>
					</TableCell>
				</TableRow>
			)}
		</>
	)
}

// ============================================================================
// Orders Table
// ============================================================================

function ImagingOrdersTable({
	orders,
	isLoading,
	tab,
}: {
	orders: ImagingDashboardOrder[]
	isLoading: boolean
	tab: DashboardTab
}) {
	const [expandedId, setExpandedId] = useState<string | null>(null)

	if (isLoading) {
		return (
			<div className="text-muted-foreground py-12 text-center text-sm">Loading imaging orders…</div>
		)
	}

	if (orders.length === 0) {
		return (
			<div className="flex flex-col items-center gap-2 py-12">
				<ScanSearch className="text-muted-foreground/40 size-8" />
				<p className="text-muted-foreground text-sm">No orders found.</p>
			</div>
		)
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Patient</TableHead>
					<TableHead>Encounter</TableHead>
					<TableHead>Modality</TableHead>
					<TableHead>Body Part</TableHead>
					<TableHead>Indication</TableHead>
					<TableHead>Priority</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Ordering Physician</TableHead>
					<TableHead>Ordered At</TableHead>
					{tab === "completed" && <TableHead>TAT</TableHead>}
					<TableHead className="text-right">Actions</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{orders.map(order => (
					<ImagingOrderRow
						key={order.id}
						order={order}
						isExpanded={expandedId === order.id}
						onToggleExpand={() => setExpandedId(expandedId === order.id ? null : order.id)}
					/>
				))}
			</TableBody>
		</Table>
	)
}

// ============================================================================
// Main Dashboard
// ============================================================================

export function RadiologyDashboard() {
	const facilityId = useActiveFacilityId() ?? ""

	const [priorityFilter, setPriorityFilter] = useState<string>("all")
	const [activeTab, setActiveTab] = useState<"pending" | "in_progress" | "completed">("pending")

	const buildParams = (status: ImagingDashboardOrder["status"]) => ({
		facilityId,
		status,
		priority: priorityFilter !== "all" ? priorityFilter : undefined,
		limit: 50,
	})

	const orderedQuery = useImagingDashboardQuery(buildParams("ordered"), {
		enabled: activeTab === "pending",
	})
	const scheduledQuery = useImagingDashboardQuery(buildParams("scheduled"), {
		enabled: activeTab === "pending",
	})
	const inProgressQuery = useImagingDashboardQuery(buildParams("in_progress"), {
		enabled: activeTab === "in_progress",
	})
	const completedQuery = useImagingDashboardQuery(buildParams("completed"), {
		enabled: activeTab === "completed",
	})

	const pendingOrders = [...(orderedQuery.data?.data ?? []), ...(scheduledQuery.data?.data ?? [])]
	const pendingLoading = orderedQuery.isLoading || scheduledQuery.isLoading
	const inProgressOrders = inProgressQuery.data?.data ?? []
	const completedOrders = completedQuery.data?.data ?? []

	const pendingTotal = (orderedQuery.data?.total ?? 0) + (scheduledQuery.data?.total ?? 0)
	const inProgressTotal = inProgressQuery.data?.total ?? 0

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Imaging Orders</h1>
					<p className="text-muted-foreground text-sm">
						Radiologist worklist — facility-wide imaging order tracking
					</p>
				</div>

				<Select value={priorityFilter} onValueChange={v => setPriorityFilter(v ?? "all")}>
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

			{/* Tabs */}
			<Card>
				<CardHeader className="pb-0">
					<CardTitle className="text-base">Worklist</CardTitle>
				</CardHeader>
				<CardContent className="pt-0">
					<Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
						<TabsList className="mt-2 mb-4">
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
							<TabsTrigger value="completed">Completed</TabsTrigger>
						</TabsList>

						<TabsContent value="pending">
							<ImagingOrdersTable orders={pendingOrders} isLoading={pendingLoading} tab="pending" />
						</TabsContent>

						<TabsContent value="in_progress">
							<ImagingOrdersTable
								orders={inProgressOrders}
								isLoading={inProgressQuery.isLoading}
								tab="in_progress"
							/>
						</TabsContent>

						<TabsContent value="completed">
							<ImagingOrdersTable
								orders={completedOrders}
								isLoading={completedQuery.isLoading}
								tab="completed"
							/>
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>
		</div>
	)
}
