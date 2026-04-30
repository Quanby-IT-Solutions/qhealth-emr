"use client"

import { useState } from "react"

import { ArrowRight, Clock3, FlaskConical, ShieldCheck, TriangleAlert } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogTrigger,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
	DialogClose,
} from "@/core/components/ui/dialog"
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
import { env } from "@/env"

import { LabResultDetail } from "./lab-result-detail"
import { Input } from "@/core/components/ui/input"
import { Textarea } from "@/core/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"

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

// Mock orders for local development / storybook
const MOCK_ORDERS: LabOrder[] = [
	{
		id: "mock0001abcd",
		facilityId: "mock-facility",
		encounterId: "enc0001",
		preEncounterId: null,
		patientId: "MRN000001",
		patientName: "Garcia, Maria",
		loincCode: null,
		panelCode: null,
		testName: "CBC",
		panelName: "CBC + Differential",
		priority: "stat",
		status: "pending",
		specimenType: null,
		orderingStaffId: "",
		orderingStaffName: null,
		collectionDatetime: new Date().toISOString(),
		resultedDatetime: null,
		results: null,
		hasCriticalValues: false,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
	{
		id: "mock0002efgh",
		facilityId: "mock-facility",
		encounterId: "enc0002",
		preEncounterId: null,
		patientId: "MRN000002",
		patientName: "Reyes, Juan",
		loincCode: null,
		panelCode: null,
		testName: "BMP",
		panelName: "Basic Metabolic Panel",
		priority: "urgent",
		status: "in_progress",
		specimenType: null,
		orderingStaffId: "",
		orderingStaffName: null,
		collectionDatetime: new Date().toISOString(),
		resultedDatetime: null,
		results: null,
		hasCriticalValues: false,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
	{
		id: "mock0003ijkl",
		facilityId: "mock-facility",
		encounterId: "enc0003",
		preEncounterId: null,
		patientId: "MRN000003",
		patientName: "Dela Cruz, Ana",
		loincCode: null,
		panelCode: null,
		testName: "LFT",
		panelName: "Liver Function Tests",
		priority: "routine",
		status: "completed",
		specimenType: null,
		orderingStaffId: "",
		orderingStaffName: null,
		collectionDatetime: new Date().toISOString(),
		resultedDatetime: new Date().toISOString(),
		results: null,
		hasCriticalValues: false,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
]

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

	let allOrders = [
		...(pendingQuery.data?.data ?? []),
		...(inProgressQuery.data?.data ?? []),
		...(completedQuery.data?.data ?? []),
	].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

	// If no orders were returned from the API, use mock data during development
	if (allOrders.length === 0 && env.NODE_ENV === "development") {
		allOrders = MOCK_ORDERS
	}

	// Filter orders by priority
	const filteredOrders = priorityFilter === "all" 
		? allOrders 
		: allOrders.filter(order => order.priority === priorityFilter)

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

	const [sex, setSex] = useState<"F" | "M">("F")
	const [priority, setPriority] = useState<"STAT" | "Urgent" | "Routine">("Routine")

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

					<Dialog>
						<DialogTrigger>
							<Button size="sm">New manual entry</Button>
						</DialogTrigger>
						<DialogContent className="max-w-lg">
							<DialogHeader className="pb-1">
								<div className="flex items-center gap-2.5">
									<div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
										<FlaskConical className="w-4 h-4 text-blue-500" />
									</div>
									<div>
										<DialogTitle className="text-base font-semibold leading-tight">New Manual Entry</DialogTitle>
										<DialogDescription className="text-xs mt-0.5">
											Register a walk-in or back-loaded specimen, then proceed to result entry.
										</DialogDescription>
									</div>
								</div>
							</DialogHeader>

							<form className="space-y-3 pt-1">

								{/* SPECIMEN */}
								<div>
									<p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-1.5">Specimen</p>
									<div className="grid grid-cols-2 gap-2">
										<div className="space-y-1">
											<label className="text-xs text-muted-foreground">Accession #</label>
											<div className="flex gap-1.5">
												<Input defaultValue="L-2451-XXXX" className="flex-1 h-8 text-xs" />
												<Button type="button" variant="outline" size="sm" className="h-8 px-2.5 text-xs shrink-0">
													Auto
												</Button>
											</div>
										</div>
										<div className="space-y-1">
											<label className="text-xs text-muted-foreground">Collected (time)</label>
											<Input type="time" className="h-8 text-xs" />
										</div>
									</div>
								</div>

								{/* PATIENT */}
								<div>
									<p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-1.5">Patient</p>
									<div className="space-y-2">
										<div className="grid grid-cols-2 gap-2">
											<div className="space-y-1">
												<label className="text-xs text-muted-foreground">Patient name</label>
												<Input placeholder="Family, Given" className="h-8 text-xs" />
											</div>
											<div className="space-y-1">
												<label className="text-xs text-muted-foreground">MRN</label>
												<Input placeholder="MRN 000000" className="h-8 text-xs" />
											</div>
										</div>
										<div className="grid grid-cols-[72px_120px_1fr] gap-2 items-end">
											<div className="space-y-1">
												<label className="text-xs text-muted-foreground">Age</label>
												<Input defaultValue="0" type="number" className="h-8 text-xs" />
											</div>
											<div className="space-y-1">
													<label className="text-xs text-muted-foreground">Sex</label>
													<div className="flex rounded-md border bg-muted/40 p-0.5 gap-0 h-8">
														<button
															type="button"
															onClick={() => setSex("F")}
															className={`flex-1 text-xs font-semibold transition-colors
																${sex === "F"
																	? "bg-blue-500 text-white rounded-l-[9px] rounded-r-none"
																	: "text-muted-foreground hover:text-foreground"}`}>F</button>
														<button
															type="button"
															onClick={() => setSex("M")}
															className={`flex-1 text-xs font-semibold transition-colors
																${sex === "M"
																	? "bg-blue-500 text-white rounded-r-[9px] rounded-l-none"
																	: "text-muted-foreground hover:text-foreground"}`}>M</button>
													</div>
												</div>
											<div className="space-y-1">
												<label className="text-xs text-muted-foreground">Ward / Location</label>
												<Input placeholder="e.g. ICU-3, ER-2, OPD" className="h-8 text-xs" />
											</div>
										</div>
									</div>
								</div>

								{/* ORDER */}
								<div>
									<p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-1.5">Order</p>
									<div className="space-y-2">
										<div className="grid grid-cols-2 gap-2">
											<div className="space-y-1">
												<label className="text-xs text-muted-foreground">Panel / Test</label>
												<Select>
													<SelectTrigger className="h-8 text-xs w-full">
														<SelectValue>CBC + Differential</SelectValue>
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="CBC">CBC + Differential</SelectItem>
														<SelectItem value="BMP">Basic Metabolic Panel</SelectItem>
														<SelectItem value="LFT">Liver Function Tests</SelectItem>
														<SelectItem value="URINAL">Urinalysis</SelectItem>
													</SelectContent>
												</Select>
											</div>
											<div className="space-y-1">
												<label className="text-xs text-muted-foreground">Ordering physician</label>
												<Input placeholder="Dr. ___" className="h-8 text-xs" />
											</div>
										</div>
										<div className="space-y-1">
											<label className="text-xs text-muted-foreground">Priority</label>
											<div className="flex rounded-md border bg-muted/40 p-0.5 gap-0 h-8">
												<button
													type="button"
													onClick={() => setPriority("STAT")}
													className={`flex-1 text-xs font-medium transition-colors
														${priority === "STAT"
															? "bg-blue-500 text-white rounded-l-[9px] rounded-r-none"
															: "text-muted-foreground hover:text-foreground"
														}`}
												>
													STAT
												</button>
												<button
													type="button"
													onClick={() => setPriority("Urgent")}
													className={`flex-1 text-xs font-medium transition-colors
														${priority === "Urgent"
															? "bg-blue-500 text-white rounded-none"
															: "text-muted-foreground hover:text-foreground"
														}`}
												>
													Urgent
												</button>
												<button
													type="button"
													onClick={() => setPriority("Routine")}
													className={`flex-1 text-xs font-medium transition-colors
														${priority === "Routine"
															? "bg-blue-500 text-white rounded-r-[9px] rounded-l-none"
															: "text-muted-foreground hover:text-foreground"
														}`}
												>
													Routine
												</button>
											</div>
										</div>
									</div>
								</div>

								{/* Notes */}
								<div className="space-y-1">
									<label className="text-xs text-muted-foreground">Notes (optional)</label>
									<Textarea
										placeholder="Specimen condition, hemolysis, special instructions..."
										className="resize-none h-14 text-xs"
									/>
								</div>

								<DialogFooter className="pt-2">
									<div className="flex items-center justify-between w-full">
										<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
											<TriangleAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
											<span>All manual entries are audit-logged.</span>
										</div>
										<div className="flex gap-2">
											<DialogClose render={<Button variant="outline" size="sm" className="h-8 text-xs" />}>
												✕ Cancel
											</DialogClose>
											<Button size="sm" className="h-8 text-xs gap-1.5">
												<ArrowRight className="w-3.5 h-3.5" />
												Create & enter results
											</Button>
										</div>
									</div>
								</DialogFooter>
							</form>
						</DialogContent>
					</Dialog>
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
						orders={filteredOrders}
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
