"use client"

import { useState } from "react"
import { Check, ChevronRight, Clock, FileText } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Separator } from "@/core/components/ui/separator"
import { Textarea } from "@/core/components/ui/textarea"

// ============================================================================
// Types
// ============================================================================

type RequestStepId = "request" | "payment" | "processing" | "release"
type RequestStepStatus = "pending" | "in_progress" | "completed"

interface RequestStep {
	id: RequestStepId
	label: string
	description: string
	slaSlaTargetDays: number
}

const REQUEST_STEPS: RequestStep[] = [
	{
		id: "request",
		label: "Request",
		description: "Submit the medical records request form",
		slaSlaTargetDays: 1,
	},
	{
		id: "payment",
		label: "Payment",
		description: "Assess and collect applicable fees",
		slaSlaTargetDays: 1,
	},
	{
		id: "processing",
		label: "Processing",
		description: "Records staff processes and prepares documents",
		slaSlaTargetDays: 3,
	},
	{
		id: "release",
		label: "Release",
		description: "Release documents to requesting party",
		slaSlaTargetDays: 1,
	},
]

const RECORD_TYPE_FEES: Record<string, number> = {
	medical_certificate: 200,
	discharge_summary: 300,
	opd_record: 150,
	lab_results: 100,
	imaging_results: 250,
	clinical_abstract: 350,
	complete_chart: 500,
}

const RECORD_TYPE_LABELS: Record<string, string> = {
	medical_certificate: "Medical Certificate",
	discharge_summary: "Discharge Summary",
	opd_record: "OPD Record",
	lab_results: "Laboratory Results",
	imaging_results: "Imaging Results",
	clinical_abstract: "Clinical Abstract",
	complete_chart: "Complete Chart Copy",
}

interface RequestData {
	patientId: string
	patientName: string
	recordType: string
	purpose: string
	requestingParty: string
	relationship: string
}

interface PaymentData {
	amount: number
	method: string
	orNumber: string
	paidAt: string
}

interface ProcessingData {
	assignedTo: string
	estimatedCompletionDate: string
	processNotes: string
}

interface ReleaseData {
	releasedTo: string
	idPresented: string
	releaseNotes: string
	releasedAt: string
}

interface RecordsRequestState {
	request: RequestData
	payment: PaymentData
	processing: ProcessingData
	release: ReleaseData
}

// ============================================================================
// Step Indicator
// ============================================================================

function StepIndicator({
	step,
	status,
	index,
	isLast,
}: {
	step: RequestStep
	status: RequestStepStatus
	index: number
	isLast: boolean
}) {
	const circleClass =
		status === "completed"
			? "bg-green-600 text-white"
			: status === "in_progress"
				? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
				: "bg-muted text-muted-foreground"

	return (
		<div className="flex flex-1 flex-col items-center gap-1">
			<div className="flex w-full items-center">
				{index > 0 && (
					<div
						className={`h-0.5 flex-1 ${status === "completed" || status === "in_progress" ? "bg-primary" : "bg-muted"}`}
					/>
				)}
				<div
					className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${circleClass}`}
				>
					{status === "completed" ? <Check className="size-4" /> : index + 1}
				</div>
				{!isLast && (
					<div className={`h-0.5 flex-1 ${status === "completed" ? "bg-primary" : "bg-muted"}`} />
				)}
			</div>
			<span
				className={`text-center text-xs font-medium ${status === "in_progress" ? "text-primary" : "text-muted-foreground"}`}
			>
				{step.label}
			</span>
		</div>
	)
}

// ============================================================================
// Step Forms
// ============================================================================

function RequestForm({
	data,
	onChange,
}: {
	data: RequestData
	onChange: (d: Partial<RequestData>) => void
}) {
	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label>Patient MRN</Label>
					<Input
						placeholder="Medical Record Number"
						value={data.patientId}
						onChange={e => onChange({ patientId: e.target.value })}
					/>
				</div>
				<div className="space-y-2">
					<Label>Patient Name</Label>
					<Input
						placeholder="Full name"
						value={data.patientName}
						onChange={e => onChange({ patientName: e.target.value })}
					/>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label>Record Type</Label>
					<Select value={data.recordType} onValueChange={val => { if (val) onChange({ recordType: val }) }}>
						<SelectTrigger>
							<SelectValue>{RECORD_TYPE_LABELS[data.recordType] ?? "Select record type"}</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{Object.entries(RECORD_TYPE_LABELS).map(([val, label]) => (
								<SelectItem key={val} value={val}>
									{label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-2">
					<Label>Purpose</Label>
					<Select value={data.purpose} onValueChange={val => { if (val) onChange({ purpose: val }) }}>
						<SelectTrigger>
							<SelectValue>{data.purpose || "Select purpose"}</SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="personal">Personal Use</SelectItem>
							<SelectItem value="insurance">Insurance Claim</SelectItem>
							<SelectItem value="legal">Legal / Court</SelectItem>
							<SelectItem value="transfer">Transfer to Another Facility</SelectItem>
							<SelectItem value="employer">Employer Requirement</SelectItem>
							<SelectItem value="school">School Requirement</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label>Requesting Party</Label>
					<Input
						placeholder="Name of requesting party"
						value={data.requestingParty}
						onChange={e => onChange({ requestingParty: e.target.value })}
					/>
				</div>
				<div className="space-y-2">
					<Label>Relationship to Patient</Label>
					<Select value={data.relationship} onValueChange={val => { if (val) onChange({ relationship: val }) }}>
						<SelectTrigger>
							<SelectValue>{data.relationship || "Select relationship"}</SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="self">Self</SelectItem>
							<SelectItem value="spouse">Spouse</SelectItem>
							<SelectItem value="parent">Parent / Guardian</SelectItem>
							<SelectItem value="child">Child</SelectItem>
							<SelectItem value="sibling">Sibling</SelectItem>
							<SelectItem value="legal_rep">Legal Representative</SelectItem>
							<SelectItem value="authorized">Authorized Third Party</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>
		</div>
	)
}

function PaymentForm({
	data,
	requestData,
	onChange,
}: {
	data: PaymentData
	requestData: RequestData
	onChange: (d: Partial<PaymentData>) => void
}) {
	const baseFee = RECORD_TYPE_FEES[requestData.recordType] ?? 0
	return (
		<div className="space-y-4">
			{baseFee > 0 && (
				<div className="rounded-lg border bg-muted/40 p-4">
					<p className="text-sm font-medium">
						{RECORD_TYPE_LABELS[requestData.recordType] ?? "Record type"}
					</p>
					<p className="text-2xl font-bold">₱ {baseFee.toLocaleString("en-PH")}</p>
					<p className="text-xs text-muted-foreground">Standard fee per Republic Act 10173</p>
				</div>
			)}
			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label>Amount Received (₱)</Label>
					<Input
						type="number"
						step={0.01}
						placeholder="0.00"
						value={data.amount || ""}
						onChange={e => onChange({ amount: parseFloat(e.target.value) || 0 })}
					/>
				</div>
				<div className="space-y-2">
					<Label>Payment Method</Label>
					<Select value={data.method} onValueChange={val => { if (val) onChange({ method: val }) }}>
						<SelectTrigger>
							<SelectValue>{data.method || "Select method"}</SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="cash">Cash</SelectItem>
							<SelectItem value="gcash">GCash</SelectItem>
							<SelectItem value="maya">Maya</SelectItem>
							<SelectItem value="bank_transfer">Bank Transfer</SelectItem>
							<SelectItem value="check">Check</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>
			<div className="space-y-2">
				<Label>Official Receipt Number</Label>
				<Input
					placeholder="OR No."
					value={data.orNumber}
					onChange={e => onChange({ orNumber: e.target.value })}
				/>
			</div>
		</div>
	)
}

function ProcessingForm({
	data,
	onChange,
}: {
	data: ProcessingData
	onChange: (d: Partial<ProcessingData>) => void
}) {
	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label>Assigned Staff</Label>
					<Input
						placeholder="Records staff name"
						value={data.assignedTo}
						onChange={e => onChange({ assignedTo: e.target.value })}
					/>
				</div>
				<div className="space-y-2">
					<Label>Estimated Completion Date</Label>
					<Input
						type="date"
						value={data.estimatedCompletionDate}
						onChange={e => onChange({ estimatedCompletionDate: e.target.value })}
					/>
				</div>
			</div>
			<div className="space-y-2">
				<Label>Processing Notes</Label>
				<Textarea
					rows={3}
					placeholder="Notes on record retrieval, special instructions…"
					value={data.processNotes}
					onChange={e => onChange({ processNotes: e.target.value })}
				/>
			</div>
		</div>
	)
}

function ReleaseForm({
	data,
	onChange,
}: {
	data: ReleaseData
	onChange: (d: Partial<ReleaseData>) => void
}) {
	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label>Released To (Receiving Party)</Label>
					<Input
						placeholder="Name of recipient"
						value={data.releasedTo}
						onChange={e => onChange({ releasedTo: e.target.value })}
					/>
				</div>
				<div className="space-y-2">
					<Label>ID / Document Presented</Label>
					<Input
						placeholder="e.g. PhilSys ID, Driver's License"
						value={data.idPresented}
						onChange={e => onChange({ idPresented: e.target.value })}
					/>
				</div>
			</div>
			<div className="space-y-2">
				<Label>Release Notes / Remarks</Label>
				<Textarea
					rows={2}
					placeholder="Any remarks about this release…"
					value={data.releaseNotes}
					onChange={e => onChange({ releaseNotes: e.target.value })}
				/>
			</div>
			<div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
				By completing this step you confirm that the requesting party has signed the release
				acknowledgement log per hospital policy.
			</div>
		</div>
	)
}

// ============================================================================
// Main Component
// ============================================================================

export function RecordsRequest() {
	const [currentStep, setCurrentStep] = useState<RequestStepId>("request")
	const [stepStatuses, setStepStatuses] = useState<Record<RequestStepId, RequestStepStatus>>({
		request: "in_progress",
		payment: "pending",
		processing: "pending",
		release: "pending",
	})
	const [formData, setFormData] = useState<RecordsRequestState>({
		request: {
			patientId: "",
			patientName: "",
			recordType: "",
			purpose: "",
			requestingParty: "",
			relationship: "",
		},
		payment: { amount: 0, method: "", orNumber: "", paidAt: "" },
		processing: { assignedTo: "", estimatedCompletionDate: "", processNotes: "" },
		release: { releasedTo: "", idPresented: "", releaseNotes: "", releasedAt: "" },
	})
	const [completedAt, setCompletedAt] = useState<Record<RequestStepId, string | null>>({
		request: null,
		payment: null,
		processing: null,
		release: null,
	})
	const [requestNo] = useState<string>(`RQ-${Date.now().toString().slice(-6)}`)

	const currentIdx = REQUEST_STEPS.findIndex(s => s.id === currentStep)
	const currentStepDef = REQUEST_STEPS[currentIdx]!
	const isAllComplete = REQUEST_STEPS.every(s => stepStatuses[s.id] === "completed")

	function handleDataChange<K extends RequestStepId>(updates: Partial<RecordsRequestState[K]>) {
		setFormData(prev => ({
			...prev,
			[currentStep]: { ...prev[currentStep], ...updates },
		}))
	}

	function handleComplete() {
		const now = new Date().toISOString()
		setCompletedAt(prev => ({ ...prev, [currentStep]: now }))
		setStepStatuses(prev => ({ ...prev, [currentStep]: "completed" }))

		const nextIdx = currentIdx + 1
		if (nextIdx < REQUEST_STEPS.length) {
			const next = REQUEST_STEPS[nextIdx]!
			setCurrentStep(next.id)
			setStepStatuses(prev => ({ ...prev, [next.id]: "in_progress" }))
		}
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold">Medical Records Request</h1>
					<p className="text-sm text-muted-foreground">Request No: {requestNo}</p>
				</div>
				<Badge variant={isAllComplete ? "default" : "secondary"}>
					{isAllComplete ? "Released" : `Step ${currentIdx + 1} of ${REQUEST_STEPS.length}`}
				</Badge>
			</div>

			{/* Step Indicator */}
			<Card>
				<CardContent className="flex items-start pt-6 pb-4">
					{REQUEST_STEPS.map((step, idx) => (
						<StepIndicator
							key={step.id}
							step={step}
							status={stepStatuses[step.id]}
							index={idx}
							isLast={idx === REQUEST_STEPS.length - 1}
						/>
					))}
				</CardContent>
			</Card>

			{/* Active Step Form */}
			{!isAllComplete && currentStepDef && (
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle>{currentStepDef.label}</CardTitle>
								<p className="mt-1 text-sm text-muted-foreground">
									{currentStepDef.description}
								</p>
							</div>
							<Badge variant="outline" className="text-xs">
								<Clock className="mr-1 size-3" />
								SLA: {currentStepDef.slaSlaTargetDays}d
							</Badge>
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						{currentStep === "request" && (
							<RequestForm
								data={formData.request}
								onChange={d => handleDataChange<"request">(d)}
							/>
						)}
						{currentStep === "payment" && (
							<PaymentForm
								data={formData.payment}
								requestData={formData.request}
								onChange={d => handleDataChange<"payment">(d)}
							/>
						)}
						{currentStep === "processing" && (
							<ProcessingForm
								data={formData.processing}
								onChange={d => handleDataChange<"processing">(d)}
							/>
						)}
						{currentStep === "release" && (
							<ReleaseForm
								data={formData.release}
								onChange={d => handleDataChange<"release">(d)}
							/>
						)}

						<Separator />

						<div className="flex justify-end">
							<Button onClick={handleComplete}>
								{currentIdx + 1 < REQUEST_STEPS.length ? (
									<>
										Proceed to {REQUEST_STEPS[currentIdx + 1]?.label}
										<ChevronRight className="ml-1 size-4" />
									</>
								) : (
									<>
										<Check className="mr-1 size-4" />
										Mark as Released
									</>
								)}
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Completion Banner */}
			{isAllComplete && (
				<Card>
					<CardContent className="pt-6">
						<div className="flex flex-col items-center gap-3 py-4">
							<div className="flex size-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
								<FileText className="size-7 text-green-600 dark:text-green-400" />
							</div>
							<p className="text-lg font-semibold">Records Released</p>
							<p className="text-sm text-muted-foreground">
								Request {requestNo} has been fully processed and released.
							</p>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Summary Table */}
			<Card>
				<CardHeader>
					<CardTitle>Request Summary</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b text-left">
								<th className="p-3 font-medium">Step</th>
								<th className="p-3 font-medium">SLA Target</th>
								<th className="p-3 font-medium">Status</th>
								<th className="p-3 font-medium">Completed At</th>
							</tr>
						</thead>
						<tbody>
							{REQUEST_STEPS.map(step => (
								<tr key={step.id} className="border-b">
									<td className="p-3 font-medium">{step.label}</td>
									<td className="p-3 text-muted-foreground">{step.slaSlaTargetDays}d</td>
									<td className="p-3">
										{stepStatuses[step.id] === "completed" ? (
											<Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
												Completed
											</Badge>
										) : stepStatuses[step.id] === "in_progress" ? (
											<Badge variant="default">In Progress</Badge>
										) : (
											<Badge variant="outline" className="text-muted-foreground">
												Pending
											</Badge>
										)}
									</td>
									<td className="p-3 text-xs text-muted-foreground">
										{completedAt[step.id]
											? new Date(completedAt[step.id]!).toLocaleDateString("en-PH")
											: "—"}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</CardContent>
			</Card>
		</div>
	)
}
