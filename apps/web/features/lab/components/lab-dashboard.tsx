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
import { useWardsQuery } from "@/features/beds/api/beds.hooks"

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
		case "ordered":
			return <Badge variant="outline">Ordered</Badge>
		case "collected":
			return <Badge className="bg-cyan-100 text-cyan-800 hover:bg-cyan-100">Collected</Badge>
		case "in_progress":
			return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">In Progress</Badge>
		case "resulted":
			return <Badge className="bg-violet-100 text-violet-800 hover:bg-violet-100">Resulted</Badge>
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
					<p className="text-xs text-muted-foreground">MRN {order.patientMrn ?? order.patientId?.slice(0, 10) ?? "N/A"}</p>
				</div>
			</TableCell>
			<TableCell>
				{order.wardName
					? `${order.wardName}${order.bedNumber ? ` / ${order.bedNumber}` : ""}`
					: order.encounterId
						? `ENC-${order.encounterId.slice(0, 4).toUpperCase()}`
						: "—"}
			</TableCell>
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

	const dashboardParams = {
		facilityId,
		priority: priorityFilter !== "all" ? priorityFilter as LabOrder["priority"] : undefined,
		limit: 50,
	}

	const labOrdersQuery = useLabDashboardQuery(dashboardParams)

	function handleEnter(order: LabOrder) {
		setSelectedOrder(order)
		setDetailOpen(true)
	}

	const allOrders = (labOrdersQuery.data?.data ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt))

	// If no orders were returned from the API, show empty state (no mock data)

	// Filter orders by priority
	const filteredOrders = priorityFilter === "all" 
		? allOrders 
		: allOrders.filter(order => order.priority === priorityFilter)

	const pendingCount = allOrders.filter(order =>
		order.status === "pending" || order.status === "ordered" || order.status === "collected"
	).length
	const inProgressCount = allOrders.filter(order => order.status === "in_progress").length
	const awaitingValidationCount = allOrders.filter(order =>
		order.status === "resulted" || order.status === "completed"
	).length

	const releasedTodayCount = allOrders.filter((order) => {
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

	const [manualEntryOpen, setManualEntryOpen] = useState(false)
	const [sex, setSex] = useState<"F" | "M">("F")
	const [priority, setPriority] = useState<"STAT" | "Urgent" | "Routine">("Routine")
	type ManualForm = {
		accession: string
		collectedTime: string
		patientName: string
		mrn: string
		age: string
		wardId: string
		panel: string
		physician: string
		notes: string
	}

	const [manualForm, setManualForm] = useState<ManualForm>({
		accession: "",
		collectedTime: "",
		patientName: "",
		mrn: "",
		age: "0",
		wardId: "",
		panel: "CBC",
		physician: "",
		notes: "",
	})
	const [manualErrors, setManualErrors] = useState<Record<string, string>>({})

	const validateManualEntry = () => {
		const errors: Record<string, string> = {}
		if (!manualForm.accession.trim()) errors.accession = "Required"
		if (!manualForm.collectedTime.trim()) errors.collectedTime = "Required"
		if (!manualForm.patientName.trim()) errors.patientName = "Required"
		if (!manualForm.mrn.trim()) errors.mrn = "Required"
		if (!manualForm.age.trim() || parseInt(manualForm.age) < 0) errors.age = "Valid age required"
		if (!manualForm.wardId.trim()) errors.wardId = "Required"
		if (!manualForm.physician.trim()) errors.physician = "Required"
		setManualErrors(errors)
		return Object.keys(errors).length === 0
	}

	const generateAccession = () => {
		const prefix = "L"
		const year = new Date().getFullYear().toString()
		const random = Math.random().toString(36).substring(2, 6).toUpperCase()
		const sequence = Math.floor(Math.random() * 10000).toString().padStart(4, "0").slice(-1)
		setManualForm({ ...manualForm, accession: `${prefix}-${year}-${sequence}${random}` })
	}

	const handleManualSubmit = () => {
		if (!validateManualEntry()) return
		// Submit logic here
		setManualEntryOpen(false)
		setManualForm({
			accession: "",
			collectedTime: "",
			patientName: "",
			mrn: "",
			age: "0",
			wardId: "",
			panel: "CBC",
			physician: "",
			notes: "",
		})
		setManualErrors({})
		setSex("F")
		setPriority("Routine")
	}

	const { data: wardsData } = useWardsQuery(facilityId)

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

					<Dialog open={manualEntryOpen} onOpenChange={setManualEntryOpen}>
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

							<div className="space-y-3 pt-1">

								{/* SPECIMEN */}
								<div>
									<p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-1.5">Specimen</p>
									<div className="grid grid-cols-2 gap-2">
										<div className="space-y-1">
											<label className="text-xs text-muted-foreground">
												Accession # <span className="text-rose-600">*</span>
											</label>
											<div className="flex gap-1.5">
												<div className="flex-1">
													<Input
														value={manualForm.accession}
														onChange={e => setManualForm({ ...manualForm, accession: e.target.value })}
														className={cn("h-8 text-xs", manualErrors.accession && "border-rose-500")}
														placeholder="L-2543-XXXXX"
													/>
													{manualErrors.accession && (
														<p className="text-rose-600 text-xs mt-0.5">{manualErrors.accession}</p>
													)}
												</div>
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={generateAccession}
													className="h-8 px-2.5 text-xs shrink-0"
												>
													Auto
												</Button>
											</div>
										</div>
										<div className="space-y-1">
											<label className="text-xs text-muted-foreground">
												Collected (time) <span className="text-rose-600">*</span>
											</label>
											<Input
												type="time"
												value={manualForm.collectedTime}
												onChange={e => setManualForm({ ...manualForm, collectedTime: e.target.value })}
												className={cn("h-8 text-xs", manualErrors.collectedTime && "border-rose-500")}
											/>
											{manualErrors.collectedTime && (
												<p className="text-rose-600 text-xs mt-0.5">{manualErrors.collectedTime}</p>
											)}
										</div>
									</div>
								</div>

								{/* PATIENT */}
								<div>
									<p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-1.5">Patient</p>
									<div className="space-y-2">
										<div className="grid grid-cols-2 gap-2">
											<div className="space-y-1">
												<label className="text-xs text-muted-foreground">
													Patient name <span className="text-rose-600">*</span>
												</label>
												<Input
													placeholder="Family, Given"
													value={manualForm.patientName}
													onChange={e => setManualForm({ ...manualForm, patientName: e.target.value })}
													className={cn("h-8 text-xs", manualErrors.patientName && "border-rose-500")}
												/>
												{manualErrors.patientName && (
													<p className="text-rose-600 text-xs mt-0.5">{manualErrors.patientName}</p>
												)}
											</div>
											<div className="space-y-1">
												<label className="text-xs text-muted-foreground">
													MRN <span className="text-rose-600">*</span>
												</label>
												<Input
													placeholder="MRN 000000"
													value={manualForm.mrn}
													onChange={e => setManualForm({ ...manualForm, mrn: e.target.value })}
													className={cn("h-8 text-xs", manualErrors.mrn && "border-rose-500")}
												/>
												{manualErrors.mrn && (
													<p className="text-rose-600 text-xs mt-0.5">{manualErrors.mrn}</p>
												)}
											</div>
										</div>
										<div className="grid grid-cols-[72px_120px_1fr] gap-2 items-end">
											<div className="space-y-1">
												<label className="text-xs text-muted-foreground">
													Age <span className="text-rose-600">*</span>
												</label>
												<Input
													value={manualForm.age}
													onChange={e => setManualForm({ ...manualForm, age: e.target.value })}
													type="number"
													className={cn("h-8 text-xs", manualErrors.age && "border-rose-500")}
												/>
												{manualErrors.age && (
													<p className="text-rose-600 text-xs mt-0.5">{manualErrors.age}</p>
												)}
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
												<label className="text-xs text-muted-foreground">
													Ward / Location <span className="text-rose-600">*</span>
												</label>
												<Select value={manualForm.wardId} onValueChange={v => setManualForm(prev => ({ ...prev, wardId: v ?? "" }))}>
													<SelectTrigger className={cn("h-8 text-xs w-full", manualErrors.wardId && "border-rose-500")}>
														<SelectValue placeholder="Select ward">
														{manualForm.wardId ? wardsData?.find(w => w.id === manualForm.wardId)?.name : "Select ward"}
													</SelectValue>
													</SelectTrigger>
													<SelectContent>
														{wardsData?.filter(w => w.isActive).map(ward => (
															<SelectItem key={ward.id} value={ward.id}>
																{ward.name}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												{manualErrors.wardId && (
													<p className="text-rose-600 text-xs mt-0.5">{manualErrors.wardId}</p>
												)}
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
												<Select value={manualForm.panel} onValueChange={v => setManualForm(prev => ({ ...prev, panel: v ?? "CBC" }))}>
													<SelectTrigger className="h-8 text-xs w-full">
														<SelectValue />
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
												<label className="text-xs text-muted-foreground">
													Ordering physician <span className="text-rose-600">*</span>
												</label>
												<Input
													placeholder="Dr. ___"
													value={manualForm.physician}
													onChange={e => setManualForm({ ...manualForm, physician: e.target.value })}
													className={cn("h-8 text-xs", manualErrors.physician && "border-rose-500")}
												/>
												{manualErrors.physician && (
													<p className="text-rose-600 text-xs mt-0.5">{manualErrors.physician}</p>
												)}
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
										value={manualForm.notes}
										onChange={e => setManualForm({ ...manualForm, notes: e.target.value })}
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
											<Button onClick={handleManualSubmit} size="sm" className="h-8 text-xs gap-1.5">
												<ArrowRight className="w-3.5 h-3.5" />
												Create & enter results
											</Button>
										</div>
									</div>
								</DialogFooter>
							</div>
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
						<p className="text-3xl font-semibold text-rose-600">{pendingCount}</p>
						<Clock3 className="size-4 text-rose-500" />
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">In Progress</CardTitle>
					</CardHeader>
					<CardContent className="flex items-end justify-between">
						<p className="text-3xl font-semibold text-blue-600">{inProgressCount}</p>
						<FlaskConical className="size-4 text-blue-500" />
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Awaiting Validation</CardTitle>
					</CardHeader>
					<CardContent className="flex items-end justify-between">
						<p className="text-3xl font-semibold">{awaitingValidationCount}</p>
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
						isLoading={labOrdersQuery.isLoading}
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
