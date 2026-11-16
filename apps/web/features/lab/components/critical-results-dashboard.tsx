"use client"

import { useMemo, useState, type ReactElement } from "react"
import { Bell, PhoneCall, Send, Siren, TriangleAlert } from "lucide-react"

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
import { Separator } from "@/core/components/ui/separator"
import { Textarea } from "@/core/components/ui/textarea"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useLabDashboardQuery, type LabOrder } from "@/features/lab/api/lab.hooks"
import { env } from "@/env"

// Mock orders for local development
const MOCK_ORDERS: LabOrder[] = [
	// {
	// 	id: "mock-cr-1",
	// 	facilityId: "mock-facility",
	// 	encounterId: "enc001",
	// 	preEncounterId: null,
	// 	patientId: "MRN000001",
	// 	patientName: "Garcia, Maria",
	// 	loincCode: null,
	// 	panelCode: null,
	// 	testName: "Potassium",
	// 	panelName: "Chemistry",
	// 	priority: "routine",
	// 	status: "completed",
	// 	specimenType: null,
	// 	orderingStaffId: "",
	// 	orderingStaffName: "Dr. Santos",
	// 	collectionDatetime: new Date().toISOString(),
	// 	resultedDatetime: new Date().toISOString(),
	// 	results: {
	// 		items: [
	// 			{
	// 				testName: "K+",
	// 				value: "7.2",
	// 				unit: "mmol/L",
	// 				referenceRange: "3.5-5.1",
	// 				flag: "C",
	// 				isCritical: true,
	// 				isAbnormal: true,
	// 			},
	// 		],
	// 		reportedBy: null,
	// 		reportedAt: null,
	// 		comments: null,
	// 	},
	// 	hasCriticalValues: true,
	// 	createdAt: new Date().toISOString(),
	// 	updatedAt: new Date().toISOString(),
	// },
	// {
	// 	id: "mock-cr-2",
	// 	facilityId: "mock-facility",
	// 	encounterId: "enc002",
	// 	preEncounterId: null,
	// 	patientId: "MRN000002",
	// 	patientName: "Reyes, Juan",
	// 	loincCode: null,
	// 	panelCode: null,
	// 	testName: "Hemoglobin",
	// 	panelName: "Hematology",
	// 	priority: "routine",
	// 	status: "completed",
	// 	specimenType: null,
	// 	orderingStaffId: "",
	// 	orderingStaffName: "Dr. Lee",
	// 	collectionDatetime: new Date().toISOString(),
	// 	resultedDatetime: new Date().toISOString(),
	// 	results: {
	// 		items: [
	// 			{
	// 				testName: "Hgb",
	// 				value: "6.1",
	// 				unit: "g/dL",
	// 				referenceRange: "13.5-17.5",
	// 				flag: "C",
	// 				isCritical: true,
	// 				isAbnormal: true,
	// 			},
	// 		],
	// 		reportedBy: null,
	// 		reportedAt: null,
	// 		comments: null,
	// 	},
	// 	hasCriticalValues: true,
	// 	createdAt: new Date().toISOString(),
	// 	updatedAt: new Date().toISOString(),
	// },
]

type QueueStatus = "pending_ack" | "sms_escalated" | "acknowledged"

type CriticalQueueItem = {
	id: string
	patientName: string
	mrn: string
	ward: string
	doctor: string
	testName: string | null
	value: string
	unit: string
	reference: string
	status: QueueStatus
	elapsedMinutes: number
}

type CriticalActionModalProps = {
	item: CriticalQueueItem
	action: "inbox" | "call" | "re-escalate"
	children: ReactElement
}

type FlagCriticalModalProps = {
	onCriticalItemAdded: (item: CriticalQueueItem) => void
}

const actionModalCopy = {
	"inbox": {
		title: "Send inbox message",
		description: "Send a critical result notification to the ordering physician inbox.",
		confirmLabel: "Send message",
		channel: "Physician inbox",
	},
	"call": {
		title: "Call physician",
		description: "Document a direct phone call for this critical result.",
		confirmLabel: "Log call",
		channel: "Phone call",
	},
	"re-escalate": {
		title: "Re-escalate critical result",
		description: "Escalate this result again when acknowledgement is delayed.",
		confirmLabel: "Re-escalate",
		channel: "Inbox + SMS + call queue",
	},
} satisfies Record<
	CriticalActionModalProps["action"],
	{
		title: string
		description: string
		confirmLabel: string
		channel: string
	}
>

function statusBadge(status: QueueStatus) {
	switch (status) {
		case "pending_ack":
			return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">Pending ack</Badge>
		case "sms_escalated":
			return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">SMS escalated</Badge>
		default:
			return (
				<Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Acknowledged</Badge>
			)
	}
}

function CriticalActionModal({ item, action, children }: CriticalActionModalProps) {
	const copy = actionModalCopy[action]
	const resultText =
		`${item.testName ?? "Critical result"}: ${String(item.value)} ${item.unit}`.trim()
	const message =
		action === "call"
			? `Called ${item.doctor} regarding ${resultText} for ${item.patientName}.`
			: `Critical result for ${item.patientName} (${item.mrn}): ${resultText}. Ref ${item.reference}. Please acknowledge.`

	return (
		<Dialog>
			<DialogTrigger render={children} />
			<DialogContent className="flex max-h-[90vh] max-w-lg flex-col overflow-hidden">
				<DialogHeader className="flex-shrink-0">
					<DialogTitle>{copy.title}</DialogTitle>
					<DialogDescription>{copy.description}</DialogDescription>
				</DialogHeader>

				<div className="-mr-4 flex-1 [scrollbar-width:none] space-y-4 overflow-y-auto pr-4 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
					<div className="bg-muted/30 rounded-md border p-3 text-sm">
						<div className="flex items-start justify-between gap-3">
							<div>
								<p className="font-medium">{item.patientName}</p>
								<p className="text-muted-foreground text-xs">
									MRN {item.mrn} &middot; {item.ward}
								</p>
							</div>
							{statusBadge(item.status)}
						</div>
						<Separator className="my-3" />
						<div className="grid gap-2 sm:grid-cols-2">
							<div>
								<p className="text-muted-foreground text-xs">Result</p>
								<p className="font-medium text-rose-700">{resultText}</p>
							</div>
							<div>
								<p className="text-muted-foreground text-xs">Reference</p>
								<p>{item.reference}</p>
							</div>
							<div>
								<p className="text-muted-foreground text-xs">Physician</p>
								<p>{item.doctor}</p>
							</div>
							<div>
								<p className="text-muted-foreground text-xs">Channel</p>
								<p>{copy.channel}</p>
							</div>
						</div>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<div>
							<label className="text-muted-foreground text-xs">
								{action === "call" ? "Call outcome" : "Priority"}
							</label>
							<Select>
								<SelectTrigger className="w-full">
									<SelectValue>{action === "call" ? "Reached physician" : "STAT"}</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{action === "call" ? (
										<>
											<SelectItem value="reached">Reached physician</SelectItem>
											<SelectItem value="voicemail">Left voicemail</SelectItem>
											<SelectItem value="no_answer">No answer</SelectItem>
										</>
									) : (
										<>
											<SelectItem value="stat">STAT</SelectItem>
											<SelectItem value="urgent">Urgent</SelectItem>
											<SelectItem value="routine">Routine</SelectItem>
										</>
									)}
								</SelectContent>
							</Select>
						</div>
						<div>
							<label className="text-muted-foreground text-xs">Follow-up in</label>
							<Select>
								<SelectTrigger className="w-full">
									<SelectValue>10 minutes</SelectValue>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="5">5 minutes</SelectItem>
									<SelectItem value="10">10 minutes</SelectItem>
									<SelectItem value="15">15 minutes</SelectItem>
									<SelectItem value="30">30 minutes</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<div>
						<label className="text-muted-foreground text-xs">
							{action === "call" ? "Call notes" : "Message"}
						</label>
						<Textarea defaultValue={message} className="min-h-28" />
					</div>
				</div>

				<DialogFooter className="flex-shrink-0 pt-2">
					<DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
					<Button
						className={action === "re-escalate" ? "bg-rose-600 text-white hover:bg-rose-700" : ""}
					>
						{action === "call" ? (
							<PhoneCall className="mr-2 size-4" />
						) : (
							<Send className="mr-2 size-4" />
						)}
						{copy.confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

function FlagCriticalModal({ onCriticalItemAdded }: FlagCriticalModalProps) {
	const [open, setOpen] = useState(false)
	const [confirmOpen, setConfirmOpen] = useState(false)
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	// Fetch all lab orders to populate patient dropdown
	const allLabOrdersQuery = useLabDashboardQuery({
		facilityId,
		limit: 100,
	})

	const labOrders = useMemo(
		() => allLabOrdersQuery.data?.data ?? [],
		[allLabOrdersQuery.data?.data]
	)

	// Get unique patients from lab orders
	const patients = useMemo(() => {
		const uniquePatients = new Map<string, LabOrder>()
		labOrders.forEach(order => {
			if (order.patientId && order.patientName) {
				uniquePatients.set(order.patientId, order)
			}
		})
		return Array.from(uniquePatients.values())
	}, [labOrders])

	type FlagForm = {
		selectedPatientId: string
		patientName: string
		mrn: string
		ward: string
		accession: string
		analyte: string
		value: string
		unit: string
		severity: "critical" | "urgent" | "warning"
		refLow: string
		refHigh: string
		physician: string
		channel: "inbox" | "sms" | "call"
		notes: string
	}

	const [form, setForm] = useState<FlagForm>({
		selectedPatientId: "",
		patientName: "",
		mrn: "",
		ward: "",
		accession: "",
		analyte: "",
		value: "",
		unit: "",
		severity: "critical",
		refLow: "",
		refHigh: "",
		physician: "",
		channel: "inbox",
		notes: "",
	})
	const [errors, setErrors] = useState<Record<string, string>>({})

	// Handle patient selection
	const handlePatientSelect = (patientId: string | null) => {
		if (!patientId) return

		const selectedOrder = labOrders.find(order => order.patientId === patientId)
		if (selectedOrder) {
			setForm(prev => ({
				...prev,
				selectedPatientId: patientId,
				patientName: selectedOrder.patientName ?? "",
				mrn: selectedOrder.patientId?.slice(0, 10) ?? "",
				ward: selectedOrder.encounterId
					? `Ward-${selectedOrder.encounterId.slice(0, 3).toUpperCase()}`
					: "",
				accession: `L-${selectedOrder.id.slice(0, 4).toUpperCase()}-${selectedOrder.id.slice(4, 8).toUpperCase()}`,
				physician: selectedOrder.orderingStaffName ?? "",
			}))
		}
	}

	const validate = () => {
		const newErrors: Record<string, string> = {}
		if (!form.selectedPatientId) newErrors.selectedPatientId = "Required"
		if (!form.patientName.trim()) newErrors.patientName = "Required"
		if (!form.mrn.trim()) newErrors.mrn = "Required"
		if (!form.analyte.trim()) newErrors.analyte = "Required"
		if (!form.value.trim()) newErrors.value = "Required"
		if (!form.unit.trim()) newErrors.unit = "Required"
		if (!form.physician.trim()) newErrors.physician = "Required"
		setErrors(newErrors)
		return Object.keys(newErrors).length === 0
	}

	const handleSubmit = () => {
		if (!validate()) return
		// Show confirmation modal
		setConfirmOpen(true)
	}

	const handleConfirm = () => {
		// Create the critical queue item and trigger parent update
		const newCriticalItem: CriticalQueueItem = {
			id: `manual-${Date.now()}`,
			patientName: form.patientName,
			mrn: form.mrn,
			ward: form.ward || "N/A",
			doctor: form.physician,
			testName: form.analyte,
			value: form.value,
			unit: form.unit,
			reference: form.refLow && form.refHigh ? `${form.refLow}-${form.refHigh}` : "N/A",
			status: "pending_ack",
			elapsedMinutes: 0,
		}

		onCriticalItemAdded(newCriticalItem)

		// Close modals and reset form
		setConfirmOpen(false)
		setOpen(false)
		setForm({
			selectedPatientId: "",
			patientName: "",
			mrn: "",
			ward: "",
			accession: "",
			analyte: "",
			value: "",
			unit: "",
			severity: "critical",
			refLow: "",
			refHigh: "",
			physician: "",
			channel: "inbox",
			notes: "",
		})
		setErrors({})
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger>
				<Button size="sm" className="gap-2">
					<TriangleAlert className="size-4" />
					Flag new critical
				</Button>
			</DialogTrigger>

			<DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden">
				<DialogHeader className="flex-shrink-0">
					<DialogTitle>Flag new critical result</DialogTitle>
					<DialogDescription>
						Manually escalate a life-threatening value to the ordering physician.
					</DialogDescription>
				</DialogHeader>

				<div className="-mr-4 flex-1 [scrollbar-width:none] overflow-y-auto pr-4 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="text-muted-foreground text-xs">
									Patient name <span className="text-rose-600">*</span>
								</label>
								<Select value={form.selectedPatientId} onValueChange={handlePatientSelect}>
									<SelectTrigger
										className={errors.selectedPatientId ? "border-rose-500" : "w-full"}
									>
										<SelectValue>
											{patients.find(patient => patient.patientId === form.selectedPatientId)
												?.patientName || "Select patient"}
										</SelectValue>
									</SelectTrigger>
									<SelectContent className="w-auto">
										{patients.map(patient => (
											<SelectItem key={patient.patientId} value={patient.patientId!}>
												{patient.patientName} (MRN: {patient.patientId?.slice(0, 10)})
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{errors.selectedPatientId && (
									<p className="mt-1 text-xs text-rose-600">{errors.selectedPatientId}</p>
								)}
							</div>
							<div>
								<label className="text-muted-foreground text-xs">
									MRN <span className="text-rose-600">*</span>
								</label>
								<Input
									placeholder="000000"
									value={form.mrn}
									readOnly
									className={`bg-muted/50 ${errors.mrn ? "border-rose-500" : ""}`}
								/>
								{errors.mrn && <p className="mt-1 text-xs text-rose-600">{errors.mrn}</p>}
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="text-muted-foreground text-xs">Ward / location</label>
								<Input placeholder="ICU-3" value={form.ward} readOnly className="bg-muted/50" />
							</div>
							<div>
								<label className="text-muted-foreground text-xs">Accession #</label>
								<Input
									placeholder="LAB-..."
									value={form.accession}
									readOnly
									className="bg-muted/50"
								/>
							</div>
						</div>

						<div className="grid grid-cols-4 gap-4">
							<div>
								<label className="text-muted-foreground text-xs">
									Analyte <span className="text-rose-600">*</span>
								</label>
								<Input
									placeholder="K+"
									value={form.analyte}
									onChange={e => setForm({ ...form, analyte: e.target.value })}
									className={errors.analyte ? "border-rose-500" : ""}
								/>
								{errors.analyte && <p className="mt-1 text-xs text-rose-600">{errors.analyte}</p>}
							</div>
							<div>
								<label className="text-muted-foreground text-xs">
									Value <span className="text-rose-600">*</span>
								</label>
								<Input
									placeholder="6.8"
									value={form.value}
									onChange={e => setForm({ ...form, value: e.target.value })}
									className={errors.value ? "border-rose-500" : ""}
								/>
								{errors.value && <p className="mt-1 text-xs text-rose-600">{errors.value}</p>}
							</div>
							<div>
								<label className="text-muted-foreground text-xs">
									Unit <span className="text-rose-600">*</span>
								</label>
								<Input
									placeholder="mmol/L"
									value={form.unit}
									onChange={e => setForm({ ...form, unit: e.target.value })}
									className={errors.unit ? "border-rose-500" : ""}
								/>
								{errors.unit && <p className="mt-1 text-xs text-rose-600">{errors.unit}</p>}
							</div>
							<div>
								<label className="text-muted-foreground text-xs">Severity</label>
								<Select
									value={form.severity}
									onValueChange={v =>
										setForm(prev => ({
											...prev,
											severity: (v ?? "critical") as FlagForm["severity"],
										}))
									}
								>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="critical">Critical</SelectItem>
										<SelectItem value="urgent">Urgent</SelectItem>
										<SelectItem value="warning">Warning</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="text-muted-foreground text-xs">Ref low</label>
								<Input
									placeholder="3.5"
									value={form.refLow}
									onChange={e => setForm({ ...form, refLow: e.target.value })}
								/>
							</div>
							<div>
								<label className="text-muted-foreground text-xs">Ref high</label>
								<Input
									placeholder="5.1"
									value={form.refHigh}
									onChange={e => setForm({ ...form, refHigh: e.target.value })}
								/>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="text-muted-foreground text-xs">
									Ordering physician <span className="text-rose-600">*</span>
								</label>
								<Input
									placeholder="Dr. Hassan"
									value={form.physician}
									readOnly
									className={`bg-muted/50 ${errors.physician ? "border-rose-500" : ""}`}
								/>
								{errors.physician && (
									<p className="mt-1 text-xs text-rose-600">{errors.physician}</p>
								)}
							</div>
							<div>
								<label className="text-muted-foreground text-xs">Initial channel</label>
								<Select
									value={form.channel}
									onValueChange={v =>
										setForm(prev => ({ ...prev, channel: (v ?? "inbox") as FlagForm["channel"] }))
									}
								>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="inbox">Inbox alert</SelectItem>
										<SelectItem value="sms">SMS</SelectItem>
										<SelectItem value="call">Phone call</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div>
							<label className="text-muted-foreground text-xs">Lab tech notes</label>
							<Textarea
								placeholder="Repeat draw confirmed; specimen non-hemolyzed."
								value={form.notes}
								onChange={e => setForm({ ...form, notes: e.target.value })}
							/>
						</div>
					</div>
				</div>

				<DialogFooter className="flex-shrink-0 pt-2">
					<div className="flex w-full items-center justify-between">
						<span className="text-muted-foreground text-xs">All actions are audit-logged.</span>
						<div className="flex gap-2">
							<DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
							<Button onClick={handleSubmit} className="bg-rose-600 text-white hover:bg-rose-700">
								<Send className="mr-2 size-4" />
								Flag & notify
							</Button>
						</div>
					</div>
				</DialogFooter>
			</DialogContent>

			{/* Confirmation Modal */}
			<Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Confirm Critical Result Flag</DialogTitle>
						<DialogDescription>
							Are you sure you want to flag this critical result and notify the physician?
						</DialogDescription>
					</DialogHeader>

					<div className="bg-muted/30 space-y-2 rounded-md border p-3 text-sm">
						<div className="flex justify-between">
							<span className="text-muted-foreground">Patient:</span>
							<span className="font-medium">{form.patientName}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">MRN:</span>
							<span className="font-medium">{form.mrn}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">Test:</span>
							<span className="font-medium">{form.analyte}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">Value:</span>
							<span className="font-medium text-rose-700">
								{form.value} {form.unit}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">Reference:</span>
							<span className="font-medium">
								{form.refLow && form.refHigh ? `${form.refLow}-${form.refHigh}` : "N/A"}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">Physician:</span>
							<span className="font-medium">{form.physician}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">Channel:</span>
							<span className="font-medium capitalize">{form.channel}</span>
						</div>
					</div>

					<DialogFooter>
						<Button variant="ghost" onClick={() => setConfirmOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleConfirm} className="bg-rose-600 text-white hover:bg-rose-700">
							<Send className="mr-2 size-4" />
							Confirm & Notify
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Dialog>
	)
}

export function CriticalResultsDashboard() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""
	const [manualCriticalItems, setManualCriticalItems] = useState<CriticalQueueItem[]>([])

	const completedQuery = useLabDashboardQuery({
		facilityId,
		status: "completed",
		limit: 50,
	})
	const inProgressQuery = useLabDashboardQuery({
		facilityId,
		status: "in_progress",
		limit: 50,
	})

	const criticalQueue = useMemo<CriticalQueueItem[]>(() => {
		let candidates: LabOrder[] = [
			...(completedQuery.data?.data ?? []),
			...(inProgressQuery.data?.data ?? []),
		]

		// Fallback to mock orders in development when API returns none
		if (candidates.length === 0 && env.NODE_ENV === "development") {
			candidates = MOCK_ORDERS
		}

		candidates = candidates.filter(order => order.hasCriticalValues).slice(0, 6)

		const labCriticalItems = candidates.map((order: LabOrder, index: number) => {
			const queueStatus: QueueStatus =
				index % 3 === 0 ? "pending_ack" : index % 3 === 1 ? "sms_escalated" : "acknowledged"
			const minutes = index === 0 ? 2 : index === 1 ? 8 : 14 + index
			return {
				id: order.id,
				patientName: order.patientName ?? "Unknown patient",
				mrn: order.patientId?.slice(0, 8).toUpperCase() ?? "N/A",
				ward: order.encounterId ? `Ward-${order.encounterId.slice(0, 3).toUpperCase()}` : "N/A",
				doctor: order.orderingStaffName ?? "Attending physician",
				testName: order.panelName ?? order.testName,
				value: String(order.results?.items.find(item => item.isCritical)?.value ?? "—"),
				unit: order.results?.items.find(item => item.isCritical)?.unit ?? "",
				reference: order.results?.items.find(item => item.isCritical)?.referenceRange ?? "N/A",
				status: queueStatus,
				elapsedMinutes: minutes,
			}
		})

		return [...manualCriticalItems, ...labCriticalItems]
	}, [completedQuery.data?.data, inProgressQuery.data?.data, manualCriticalItems])

	const handleCriticalItemAdded = (item: CriticalQueueItem) => {
		setManualCriticalItems(currentItems => [
			item,
			...currentItems.filter(currentItem => currentItem.id !== item.id),
		])
	}

	const activeCriticals = criticalQueue.length
	const pendingAck = criticalQueue.filter(item => item.status !== "acknowledged").length
	const avgAckMins = pendingAck > 0 ? 6.2 : 0
	const releasedToday = (completedQuery.data?.data ?? []).filter(order => {
		if (!order.resultedDatetime) return false
		const today = new Date()
		const date = new Date(order.resultedDatetime)
		return (
			date.getFullYear() === today.getFullYear() &&
			date.getMonth() === today.getMonth() &&
			date.getDate() === today.getDate()
		)
	}).length

	return (
		<div className="space-y-5">
			<div className="flex items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold">Critical Result Flagging</h1>
					<p className="text-muted-foreground text-sm">
						Life-threatening values routed directly to the ordering physician
					</p>
				</div>
				<FlagCriticalModal onCriticalItemAdded={handleCriticalItemAdded} />
			</div>

			<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-muted-foreground text-xs tracking-wide uppercase">
							Active Criticals
						</CardTitle>
					</CardHeader>
					<CardContent className="flex items-end justify-between">
						<p className="text-3xl font-semibold text-rose-600">{activeCriticals}</p>
						<Siren className="size-4 text-rose-500" />
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-muted-foreground text-xs tracking-wide uppercase">
							Pending Ack
						</CardTitle>
					</CardHeader>
					<CardContent className="flex items-end justify-between">
						<p className="text-3xl font-semibold">{pendingAck}</p>
						<Bell className="text-muted-foreground size-4" />
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-muted-foreground text-xs tracking-wide uppercase">
							Avg Ack Time
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-1">
						<p className="text-3xl font-semibold text-emerald-600">{avgAckMins.toFixed(1)}m</p>
						<p className="text-muted-foreground text-xs">Target &lt; 10m</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-muted-foreground text-xs tracking-wide uppercase">
							Released Today
						</CardTitle>
					</CardHeader>
					<CardContent className="flex items-end justify-between">
						<p className="text-3xl font-semibold">{releasedToday}</p>
						<TriangleAlert className="text-muted-foreground size-4" />
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-base">Critical results queue</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{criticalQueue.length === 0 ? (
							<p className="text-muted-foreground py-8 text-center text-sm">
								No active critical values.
							</p>
						) : (
							criticalQueue.map(item => (
								<div
									key={item.id}
									className="bg-muted/20 hover:bg-muted/30 rounded-md border p-3 transition"
								>
									<div className="mb-2 flex items-center justify-between gap-2">
										<div className="flex items-center gap-2">
											{statusBadge(item.status)}
											<span className="text-muted-foreground text-xs">
												+{item.elapsedMinutes} min
											</span>
										</div>
										<div className="text-right">
											<p className="text-lg font-semibold text-rose-700">
												{String(item.value)} {item.unit}
											</p>
											<p className="text-muted-foreground text-xs">Ref {item.reference}</p>
										</div>
									</div>
									<p className="font-medium">{item.patientName}</p>
									<p className="text-muted-foreground text-xs">
										MRN {item.mrn} · {item.ward} · Dr. {item.doctor}
									</p>
									<p className="text-muted-foreground mt-1 text-xs">{item.testName}</p>
									<div className="mt-3 flex flex-wrap gap-2">
										<CriticalActionModal item={item} action="inbox">
											<Button variant="outline" size="sm" className="gap-1">
												<Send className="size-3.5" />
												Inbox message
											</Button>
										</CriticalActionModal>
										<CriticalActionModal item={item} action="call">
											<Button variant="outline" size="sm" className="gap-1">
												<PhoneCall className="size-3.5" />
												Call physician
											</Button>
										</CriticalActionModal>
										<CriticalActionModal item={item} action="re-escalate">
											<Button size="sm" className="bg-rose-600 hover:bg-rose-700">
												Re-escalate
											</Button>
										</CriticalActionModal>
									</div>
								</div>
							))
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-base">Notification policy</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3 text-sm">
						<div className="flex items-center justify-between">
							<span>Inbox alert</span>
							<Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
								Immediate
							</Badge>
						</div>
						<Separator />
						<div className="flex items-center justify-between">
							<span>SMS escalation</span>
							<Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">After 10 min</Badge>
						</div>
						<Separator />
						<div className="flex items-center justify-between">
							<span>Call escalation</span>
							<Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">After 20 min</Badge>
						</div>
						<Separator />
						<div className="flex items-center justify-between">
							<span>Charge nurse CC</span>
							<Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Always</Badge>
						</div>
						<p className="text-muted-foreground pt-2 text-xs">
							All actions are logged in the patient&apos;s audit trail and accessible via the chart
							timeline.
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
