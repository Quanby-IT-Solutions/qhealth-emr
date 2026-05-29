"use client"

import { useMemo, useState } from "react"
import { ArrowRight, Clock3, FlaskConical, ShieldCheck, TriangleAlert } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/core/components/ui/dialog"
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
import { Textarea } from "@/core/components/ui/textarea"
import { cn } from "@/core/lib/utils"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useWardsQuery } from "@/features/beds/api/beds.hooks"
import { useLabDashboardQuery, type LabOrder } from "@/features/lab/api/lab.hooks"
import { usePatientSearchQuery } from "@/features/patients/api/patients.hooks"

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

function formatPatientOptionName(patient: {
	firstName: string
	lastName: string
	middleName: string | null
}) {
	const middleInitial = patient.middleName?.trim() ? ` ${patient.middleName.trim()[0]}.` : ""
	return `${patient.lastName}, ${patient.firstName}${middleInitial}`
}

function calculateAge(dateOfBirth: string) {
	const dateOnly = dateOfBirth.split("T")[0] ?? dateOfBirth
	const [year, month, day] = dateOnly.split("-").map(Number)
	const birthDate = year && month && day ? new Date(year, month - 1, day) : new Date(dateOfBirth)

	if (Number.isNaN(birthDate.getTime())) return ""

	const today = new Date()
	let age = today.getFullYear() - birthDate.getFullYear()
	const hasBirthdayPassed =
		today.getMonth() > birthDate.getMonth() ||
		(today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate())

	if (!hasBirthdayPassed) age -= 1
	return String(Math.max(0, age))
}

function normalizeMrn(value: string | null | undefined) {
	return value?.trim().toUpperCase() ?? ""
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
			return (
				<Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
					Awaiting Validation
				</Badge>
			)
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

function LabOrderRow({ order, onEnter }: { order: LabOrder; onEnter: (order: LabOrder) => void }) {
	return (
		<TableRow>
			<TableCell>
				<span className="font-mono text-xs">{formatAccession(order.id)}</span>
			</TableCell>
			<TableCell>
				<div>
					<p className="font-medium">{order.patientName ?? "—"}</p>
					<p className="text-muted-foreground text-xs">
						MRN {order.patientMrn ?? order.patientId?.slice(0, 10) ?? "N/A"}
					</p>
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
			<div className="text-muted-foreground py-12 text-center text-sm">Loading lab orders…</div>
		)
	}

	if (orders.length === 0) {
		return (
			<div className="flex flex-col items-center gap-2 py-12">
				<FlaskConical className="text-muted-foreground/40 size-8" />
				<p className="text-muted-foreground text-sm">No orders found.</p>
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
				{orders.map(order => (
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
		priority: priorityFilter !== "all" ? (priorityFilter as LabOrder["priority"]) : undefined,
		limit: 50,
	}

	const labOrdersQuery = useLabDashboardQuery(dashboardParams)

	function handleEnter(order: LabOrder) {
		setSelectedOrder(order)
		setDetailOpen(true)
	}

	const allOrders = useMemo(
		() =>
			[...(labOrdersQuery.data?.data ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
		[labOrdersQuery.data?.data]
	)

	// If no orders were returned from the API, show empty state (no mock data)

	// Filter orders by priority
	const filteredOrders =
		priorityFilter === "all"
			? allOrders
			: allOrders.filter(order => order.priority === priorityFilter)

	const pendingCount = allOrders.filter(
		order =>
			order.status === "pending" || order.status === "ordered" || order.status === "collected"
	).length
	const inProgressCount = allOrders.filter(order => order.status === "in_progress").length
	const awaitingValidationCount = allOrders.filter(
		order => order.status === "resulted" || order.status === "completed"
	).length

	const releasedTodayCount = allOrders.filter(order => {
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
		patientId: string
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
		patientId: "",
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
		if (!manualForm.patientId.trim()) errors.patientName = "Select a patient"
		if (!manualForm.mrn.trim()) errors.mrn = "Required"
		if (!manualForm.age.trim() || parseInt(manualForm.age) < 0) errors.age = "Valid age required"
		if (!manualForm.wardId.trim()) errors.wardId = "Required"
		if (!manualForm.physician.trim()) errors.physician = "Required"
		setManualErrors(errors)
		return Object.keys(errors).length === 0
	}

	const handleAgeChange = (value: string) => {
		if (manualForm.patientId) return

		if (!value.trim()) {
			setManualForm({ ...manualForm, age: "" })
			return
		}

		const age = Number(value)
		if (Number.isNaN(age)) return

		setManualForm({ ...manualForm, age: String(Math.max(0, Math.floor(age))) })
	}

	const generateAccession = () => {
		const prefix = "L"
		const batchNumber = Math.floor(Math.random() * 10000)
			.toString()
			.padStart(4, "0")
		const random = Math.random().toString(36).substring(2, 7).toUpperCase()
		setManualForm({ ...manualForm, accession: `${prefix}-${batchNumber}-${random}` })
	}

	const handleManualSubmit = () => {
		if (!validateManualEntry()) return
		// Submit logic here
		setManualEntryOpen(false)
		setManualForm({
			patientId: "",
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
	const patientsQuery = usePatientSearchQuery(
		{
			facilityId,
			isActive: true,
			limit: 100,
		},
		{ enabled: Boolean(facilityId) && manualEntryOpen }
	)
	const existingPatientIds = useMemo(
		() => new Set(allOrders.map(order => order.patientId).filter(Boolean)),
		[allOrders]
	)
	const existingPatientMrns = useMemo(
		() => new Set(allOrders.map(order => normalizeMrn(order.patientMrn)).filter(Boolean)),
		[allOrders]
	)
	const availablePatients = useMemo(
		() =>
			(patientsQuery.data?.data ?? []).filter(
				patient =>
					!existingPatientIds.has(patient.id) && !existingPatientMrns.has(normalizeMrn(patient.mrn))
			),
		[existingPatientIds, existingPatientMrns, patientsQuery.data?.data]
	)
	const isPatientAutoFilled = Boolean(manualForm.patientId)
	const isAgeAutoFilled = isPatientAutoFilled

	function handlePatientSelect(patientId: string) {
		const patient = availablePatients.find(candidate => candidate.id === patientId)
		if (!patient) return

		setManualForm({
			...manualForm,
			patientId: patient.id,
			patientName: formatPatientOptionName(patient),
			mrn: patient.mrn,
			age: calculateAge(patient.dateOfBirth),
		})

		if (patient.sex === "female") setSex("F")
		if (patient.sex === "male") setSex("M")

		setManualErrors(currentErrors => {
			const nextErrors = { ...currentErrors }
			delete nextErrors.patientName
			delete nextErrors.mrn
			delete nextErrors.age
			return nextErrors
		})
	}

	return (
		<div className="space-y-5">
			<div className="flex items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold">Lab Result Entry & Validation</h1>
					<p className="text-muted-foreground text-sm">
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
									<div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10">
										<FlaskConical className="h-4 w-4 text-blue-500" />
									</div>
									<div>
										<DialogTitle className="text-base leading-tight font-semibold">
											New Manual Entry
										</DialogTitle>
										<DialogDescription className="mt-0.5 text-xs">
											Register a walk-in or back-loaded specimen, then proceed to result entry.
										</DialogDescription>
									</div>
								</div>
							</DialogHeader>

							<div className="space-y-3 pt-1">
								{/* SPECIMEN */}
								<div>
									<p className="text-muted-foreground mb-1.5 text-[10px] font-semibold tracking-widest uppercase">
										Specimen
									</p>
									<div className="grid grid-cols-2 gap-2">
										<div className="space-y-1">
											<label className="text-muted-foreground text-xs">
												Accession # <span className="text-rose-600">*</span>
											</label>
											<div className="flex gap-1.5">
												<div className="flex-1">
													<Input
														value={manualForm.accession}
														onChange={e =>
															setManualForm({ ...manualForm, accession: e.target.value })
														}
														className={cn(
															"h-8 text-xs",
															manualErrors.accession && "border-rose-500"
														)}
														placeholder="L-2543-XXXXX"
													/>
													{manualErrors.accession && (
														<p className="mt-0.5 text-xs text-rose-600">{manualErrors.accession}</p>
													)}
												</div>
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={generateAccession}
													className="h-8 shrink-0 px-2.5 text-xs"
												>
													Auto
												</Button>
											</div>
										</div>
										<div className="space-y-1">
											<label className="text-muted-foreground text-xs">
												Collected (time) <span className="text-rose-600">*</span>
											</label>
											<Input
												type="time"
												value={manualForm.collectedTime}
												onChange={e =>
													setManualForm({ ...manualForm, collectedTime: e.target.value })
												}
												className={cn(
													"h-8 text-xs",
													manualErrors.collectedTime && "border-rose-500"
												)}
											/>
											{manualErrors.collectedTime && (
												<p className="mt-0.5 text-xs text-rose-600">{manualErrors.collectedTime}</p>
											)}
										</div>
									</div>
								</div>

								{/* PATIENT */}
								<div>
									<p className="text-muted-foreground mb-1.5 text-[10px] font-semibold tracking-widest uppercase">
										Patient
									</p>
									<div className="space-y-2">
										<div className="grid grid-cols-2 gap-2">
											<div className="space-y-1">
												<label className="text-muted-foreground text-xs">
													Patient name <span className="text-rose-600">*</span>
												</label>
												<Select
													value={manualForm.patientId}
													onValueChange={value => {
														if (value) handlePatientSelect(value)
													}}
												>
													<SelectTrigger
														className={cn(
															"h-8 w-full text-xs",
															manualErrors.patientName && "border-rose-500"
														)}
													>
														<span
															data-slot="select-value"
															className={cn(
																"truncate text-left",
																!manualForm.patientName && "text-muted-foreground"
															)}
														>
															{manualForm.patientName
																? `${manualForm.patientName} - MRN ${manualForm.mrn}`
																: patientsQuery.isFetching
																	? "Loading patients..."
																	: "Select patient"}
														</span>
													</SelectTrigger>
													<SelectContent>
														{availablePatients.map(patient => (
															<SelectItem key={patient.id} value={patient.id}>
																{formatPatientOptionName(patient)} - MRN {patient.mrn}
															</SelectItem>
														))}
														{!patientsQuery.isFetching && availablePatients.length === 0 && (
															<SelectItem value="no-patients" disabled>
																No available patients
															</SelectItem>
														)}
													</SelectContent>
												</Select>
												{manualErrors.patientName && (
													<p className="mt-0.5 text-xs text-rose-600">{manualErrors.patientName}</p>
												)}
											</div>
											<div className="space-y-1">
												<label className="text-muted-foreground text-xs">
													MRN <span className="text-rose-600">*</span>
												</label>
												<Input
													placeholder="MRN 000000"
													value={manualForm.mrn}
													onChange={e => {
														if (!isPatientAutoFilled) {
															setManualForm({ ...manualForm, mrn: e.target.value })
														}
													}}
													onFocus={event => {
														if (isPatientAutoFilled) event.currentTarget.blur()
													}}
													onMouseDown={event => {
														if (isPatientAutoFilled) event.preventDefault()
													}}
													readOnly={isPatientAutoFilled}
													aria-readonly={isPatientAutoFilled}
													tabIndex={isPatientAutoFilled ? -1 : undefined}
													title={
														isPatientAutoFilled
															? "MRN is filled from the selected patient record."
															: undefined
													}
													className={cn(
														"h-8 text-xs",
														isPatientAutoFilled &&
															"bg-muted/40 text-muted-foreground cursor-default",
														manualErrors.mrn && "border-rose-500"
													)}
												/>
												{manualErrors.mrn && (
													<p className="mt-0.5 text-xs text-rose-600">{manualErrors.mrn}</p>
												)}
											</div>
										</div>
										<div className="grid grid-cols-[72px_120px_1fr] items-end gap-2">
											<div className="space-y-1">
												<label className="text-muted-foreground text-xs">
													Age <span className="text-rose-600">*</span>
												</label>
												<Input
													value={manualForm.age}
													onChange={e => handleAgeChange(e.target.value)}
													onFocus={event => {
														if (isAgeAutoFilled) event.currentTarget.blur()
													}}
													onKeyDown={e => {
														if (isAgeAutoFilled || ["-", "+", "e", "E"].includes(e.key)) {
															e.preventDefault()
														}
													}}
													onMouseDown={event => {
														if (isAgeAutoFilled) event.preventDefault()
													}}
													type="number"
													min={0}
													readOnly={isAgeAutoFilled}
													aria-readonly={isAgeAutoFilled}
													tabIndex={isAgeAutoFilled ? -1 : undefined}
													title={
														isAgeAutoFilled
															? "Age is calculated from the selected patient's date of birth."
															: undefined
													}
													className={cn(
														"h-8 [appearance:textfield] text-xs [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
														isAgeAutoFilled && "bg-muted/40 text-muted-foreground cursor-default",
														manualErrors.age && "border-rose-500"
													)}
												/>
												{manualErrors.age && (
													<p className="mt-0.5 text-xs text-rose-600">{manualErrors.age}</p>
												)}
											</div>
											<div className="space-y-1">
												<label className="text-muted-foreground text-xs">Sex</label>
												<div className="bg-muted/40 flex h-8 gap-0 rounded-md border p-0.5">
													<button
														type="button"
														onClick={() => {
															if (!isPatientAutoFilled) setSex("F")
														}}
														disabled={isPatientAutoFilled}
														title={
															isPatientAutoFilled
																? "Sex is filled from the selected patient record."
																: undefined
														}
														className={`flex-1 text-xs font-semibold transition-colors ${
															sex === "F"
																? "rounded-l-[9px] rounded-r-none bg-blue-500 text-white"
																: "text-muted-foreground hover:text-foreground"
														} disabled:cursor-default disabled:opacity-100`}
													>
														F
													</button>
													<button
														type="button"
														onClick={() => {
															if (!isPatientAutoFilled) setSex("M")
														}}
														disabled={isPatientAutoFilled}
														title={
															isPatientAutoFilled
																? "Sex is filled from the selected patient record."
																: undefined
														}
														className={`flex-1 text-xs font-semibold transition-colors ${
															sex === "M"
																? "rounded-l-none rounded-r-[9px] bg-blue-500 text-white"
																: "text-muted-foreground hover:text-foreground"
														} disabled:cursor-default disabled:opacity-100`}
													>
														M
													</button>
												</div>
											</div>
											<div className="space-y-1">
												<label className="text-muted-foreground text-xs">
													Ward / Location <span className="text-rose-600">*</span>
												</label>
												<Select
													value={manualForm.wardId}
													onValueChange={v => setManualForm(prev => ({ ...prev, wardId: v ?? "" }))}
												>
													<SelectTrigger
														className={cn(
															"h-8 w-full text-xs",
															manualErrors.wardId && "border-rose-500"
														)}
													>
														<span
															data-slot="select-value"
															className={cn(
																"truncate text-left",
																!manualForm.wardId && "text-muted-foreground"
															)}
														>
															{manualForm.wardId
																? wardsData?.find(w => w.id === manualForm.wardId)?.name
																: "Select ward"}
														</span>
													</SelectTrigger>
													<SelectContent>
														{wardsData
															?.filter(w => w.isActive)
															.map(ward => (
																<SelectItem key={ward.id} value={ward.id}>
																	{ward.name}
																</SelectItem>
															))}
													</SelectContent>
												</Select>
												{manualErrors.wardId && (
													<p className="mt-0.5 text-xs text-rose-600">{manualErrors.wardId}</p>
												)}
											</div>
										</div>
									</div>
								</div>

								{/* ORDER */}
								<div>
									<p className="text-muted-foreground mb-1.5 text-[10px] font-semibold tracking-widest uppercase">
										Order
									</p>
									<div className="space-y-2">
										<div className="grid grid-cols-2 gap-2">
											<div className="space-y-1">
												<label className="text-muted-foreground text-xs">Panel / Test</label>
												<Select
													value={manualForm.panel}
													onValueChange={v =>
														setManualForm(prev => ({ ...prev, panel: v ?? "CBC" }))
													}
												>
													<SelectTrigger className="h-8 w-full text-xs">
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
												<label className="text-muted-foreground text-xs">
													Ordering physician <span className="text-rose-600">*</span>
												</label>
												<Input
													placeholder="Dr. ___"
													value={manualForm.physician}
													onChange={e =>
														setManualForm({ ...manualForm, physician: e.target.value })
													}
													className={cn("h-8 text-xs", manualErrors.physician && "border-rose-500")}
												/>
												{manualErrors.physician && (
													<p className="mt-0.5 text-xs text-rose-600">{manualErrors.physician}</p>
												)}
											</div>
										</div>
										<div className="space-y-1">
											<label className="text-muted-foreground text-xs">Priority</label>
											<div className="bg-muted/40 flex h-8 gap-0 rounded-md border p-0.5">
												<button
													type="button"
													onClick={() => setPriority("STAT")}
													className={`flex-1 text-xs font-medium transition-colors ${
														priority === "STAT"
															? "rounded-l-[9px] rounded-r-none bg-blue-500 text-white"
															: "text-muted-foreground hover:text-foreground"
													}`}
												>
													STAT
												</button>
												<button
													type="button"
													onClick={() => setPriority("Urgent")}
													className={`flex-1 text-xs font-medium transition-colors ${
														priority === "Urgent"
															? "rounded-none bg-blue-500 text-white"
															: "text-muted-foreground hover:text-foreground"
													}`}
												>
													Urgent
												</button>
												<button
													type="button"
													onClick={() => setPriority("Routine")}
													className={`flex-1 text-xs font-medium transition-colors ${
														priority === "Routine"
															? "rounded-l-none rounded-r-[9px] bg-blue-500 text-white"
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
									<label className="text-muted-foreground text-xs">Notes (optional)</label>
									<Textarea
										placeholder="Specimen condition, hemolysis, special instructions..."
										value={manualForm.notes}
										onChange={e => setManualForm({ ...manualForm, notes: e.target.value })}
										className="h-14 resize-none text-xs"
									/>
								</div>

								<DialogFooter className="pt-2">
									<div className="flex w-full items-center justify-between">
										<div className="text-muted-foreground flex items-center gap-1.5 text-xs">
											<TriangleAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" />
											<span>All manual entries are audit-logged.</span>
										</div>
										<div className="flex gap-2">
											<DialogClose
												render={<Button variant="outline" size="sm" className="h-8 text-xs" />}
											>
												✕ Cancel
											</DialogClose>
											<Button
												onClick={handleManualSubmit}
												size="sm"
												className="h-8 gap-1.5 text-xs"
											>
												<ArrowRight className="h-3.5 w-3.5" />
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
						<CardTitle className="text-muted-foreground text-xs tracking-wide uppercase">
							Pending
						</CardTitle>
					</CardHeader>
					<CardContent className="flex items-end justify-between">
						<p className="text-3xl font-semibold text-rose-600">{pendingCount}</p>
						<Clock3 className="size-4 text-rose-500" />
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-muted-foreground text-xs tracking-wide uppercase">
							In Progress
						</CardTitle>
					</CardHeader>
					<CardContent className="flex items-end justify-between">
						<p className="text-3xl font-semibold text-blue-600">{inProgressCount}</p>
						<FlaskConical className="size-4 text-blue-500" />
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-muted-foreground text-xs tracking-wide uppercase">
							Awaiting Validation
						</CardTitle>
					</CardHeader>
					<CardContent className="flex items-end justify-between">
						<p className="text-3xl font-semibold">{awaitingValidationCount}</p>
						<TriangleAlert className="text-muted-foreground size-4" />
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-muted-foreground text-xs tracking-wide uppercase">
							Released Today
						</CardTitle>
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
						<div className="bg-muted/40 inline-flex rounded-md border p-1">
							{filterOptions.map(filter => (
								<button
									key={filter.value}
									type="button"
									onClick={() => setPriorityFilter(filter.value)}
									className={cn(
										"rounded px-3 py-1 text-xs font-medium transition",
										priorityFilter === filter.value
											? "bg-background text-foreground shadow-sm"
											: "text-muted-foreground hover:text-foreground"
									)}
								>
									{filter.label}
								</button>
							))}
						</div>
						<p className="text-muted-foreground text-xs">Updated just now</p>
					</div>
					<LabOrdersTable
						orders={filteredOrders}
						isLoading={labOrdersQuery.isLoading}
						onEnter={handleEnter}
					/>
				</CardContent>
			</Card>

			<LabResultDetail order={selectedOrder} open={detailOpen} onOpenChange={setDetailOpen} />
		</div>
	)
}
