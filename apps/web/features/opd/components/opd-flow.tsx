"use client"

import { useState } from "react"
import { Check, ChevronRight, Clock, Lock } from "lucide-react"

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
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

// ============================================================================
// Permission Helpers
// ============================================================================

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

// ============================================================================
// Types
// ============================================================================

type OpdStepId = "triage" | "registration" | "vitals" | "consultation" | "disposition"
type OpdStepStatus = "pending" | "in_progress" | "completed"

interface RequiredPermission {
	module: string
	action: string
}

interface OpdStep {
	id: OpdStepId
	label: string
	description: string
	slaSlaTargetMinutes: number
	/** Role that typically performs this step */
	responsibleRole: string
	/** Permission required to complete this step */
	requiredPermission: RequiredPermission
}

const OPD_STEPS: OpdStep[] = [
	{
		id: "triage",
		label: "Triage",
		description: "Initial assessment of urgency and primary complaint",
		slaSlaTargetMinutes: 10,
		// OPD clinic triage is done by OPD Nurses, not ED Triage Officers
		responsibleRole: "Nurse",
		requiredPermission: { module: "nursing", action: "edit" },
	},
	{
		id: "registration",
		label: "Registration",
		description: "Patient registration and insurance verification",
		slaSlaTargetMinutes: 15,
		responsibleRole: "Registrar",
		requiredPermission: { module: "adt", action: "create" },
	},
	{
		id: "vitals",
		label: "Vitals",
		description: "Measurement of vital signs by nursing staff",
		slaSlaTargetMinutes: 10,
		responsibleRole: "Nurse",
		requiredPermission: { module: "nursing", action: "edit" },
	},
	{
		id: "consultation",
		label: "Consultation",
		description: "Physician examination and assessment",
		slaSlaTargetMinutes: 30,
		responsibleRole: "Physician",
		requiredPermission: { module: "clinical_docs", action: "create" },
	},
	{
		id: "disposition",
		label: "Disposition",
		description: "Discharge instructions, referral, or admission order",
		slaSlaTargetMinutes: 20,
		responsibleRole: "Physician",
		requiredPermission: { module: "clinical_docs", action: "sign" },
	},
]

interface StepData {
	completedAt: string | null
	notes: string
}

type OpdFlowState = Record<OpdStepId, StepData>

// ============================================================================
// Step Indicator
// ============================================================================

function StepIndicator({
	step,
	status,
	index,
	isLast,
}: {
	step: OpdStep
	status: OpdStepStatus
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

function TriageForm({
	data,
	onChange,
}: {
	data: StepData
	onChange: (d: Partial<StepData>) => void
}) {
	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label>Chief Complaint</Label>
					<Input
						placeholder="e.g. Chest pain, fever, headache"
						value={data.notes.split("|")[0] ?? ""}
						onChange={e =>
							onChange({ notes: [e.target.value, data.notes.split("|")[1] ?? ""].join("|") })
						}
					/>
				</div>
				<div className="space-y-2">
					<Label>Triage Category</Label>
					<Select
						value={data.notes.split("|")[1] ?? ""}
						onValueChange={val =>
							onChange({ notes: [data.notes.split("|")[0] ?? "", val].join("|") })
						}
					>
						<SelectTrigger>
							<SelectValue placeholder="Select category" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="immediate">Immediate (Red)</SelectItem>
							<SelectItem value="urgent">Urgent (Orange)</SelectItem>
							<SelectItem value="less_urgent">Less Urgent (Yellow)</SelectItem>
							<SelectItem value="non_urgent">Non-Urgent (Green)</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>
		</div>
	)
}

function RegistrationForm({
	data,
	onChange,
}: {
	data: StepData
	onChange: (d: Partial<StepData>) => void
}) {
	const fields = data.notes.split("|")
	const set = (i: number, val: string) => {
		const updated = [...fields]
		updated[i] = val
		onChange({ notes: updated.join("|") })
	}
	return (
		<div className="grid grid-cols-2 gap-4">
			<div className="space-y-2">
				<Label>Patient MRN</Label>
				<Input placeholder="MRN" value={fields[0] ?? ""} onChange={e => set(0, e.target.value)} />
			</div>
			<div className="space-y-2">
				<Label>PhilHealth Member ID</Label>
				<Input placeholder="PhilHealth ID" value={fields[1] ?? ""} onChange={e => set(1, e.target.value)} />
			</div>
			<div className="space-y-2">
				<Label>Classification</Label>
				<Select value={fields[2] ?? ""} onValueChange={val => set(2, val)}>
					<SelectTrigger>
						<SelectValue placeholder="Select classification" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="private">Private Pay</SelectItem>
						<SelectItem value="philhealth">PhilHealth</SelectItem>
						<SelectItem value="indigent">Indigent / Malasakit</SelectItem>
						<SelectItem value="hmo">HMO</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<div className="space-y-2">
				<Label>Consent Signed</Label>
				<Select value={fields[3] ?? ""} onValueChange={val => set(3, val)}>
					<SelectTrigger>
						<SelectValue placeholder="Select" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="yes">Yes</SelectItem>
						<SelectItem value="no">No</SelectItem>
						<SelectItem value="waiver">Waiver Signed</SelectItem>
					</SelectContent>
				</Select>
			</div>
		</div>
	)
}

function VitalsForm({
	data,
	onChange,
}: {
	data: StepData
	onChange: (d: Partial<StepData>) => void
}) {
	const fields = data.notes.split("|")
	const set = (i: number, val: string) => {
		const updated = [...fields]
		updated[i] = val
		onChange({ notes: updated.join("|") })
	}
	return (
		<div className="grid grid-cols-3 gap-4">
			<div className="space-y-2">
				<Label>Blood Pressure (mmHg)</Label>
				<Input placeholder="e.g. 120/80" value={fields[0] ?? ""} onChange={e => set(0, e.target.value)} />
			</div>
			<div className="space-y-2">
				<Label>Heart Rate (bpm)</Label>
				<Input type="number" placeholder="e.g. 72" value={fields[1] ?? ""} onChange={e => set(1, e.target.value)} />
			</div>
			<div className="space-y-2">
				<Label>Temperature (°C)</Label>
				<Input type="number" step={0.1} placeholder="e.g. 37.0" value={fields[2] ?? ""} onChange={e => set(2, e.target.value)} />
			</div>
			<div className="space-y-2">
				<Label>Respiratory Rate</Label>
				<Input type="number" placeholder="breaths/min" value={fields[3] ?? ""} onChange={e => set(3, e.target.value)} />
			</div>
			<div className="space-y-2">
				<Label>O₂ Saturation (%)</Label>
				<Input type="number" placeholder="e.g. 98" value={fields[4] ?? ""} onChange={e => set(4, e.target.value)} />
			</div>
			<div className="space-y-2">
				<Label>Weight (kg)</Label>
				<Input type="number" step={0.1} placeholder="e.g. 65.5" value={fields[5] ?? ""} onChange={e => set(5, e.target.value)} />
			</div>
		</div>
	)
}

function ConsultationForm({
	data,
	onChange,
}: {
	data: StepData
	onChange: (d: Partial<StepData>) => void
}) {
	const fields = data.notes.split("|")
	const set = (i: number, val: string) => {
		const updated = [...fields]
		updated[i] = val
		onChange({ notes: updated.join("|") })
	}
	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label>Assessment / Diagnosis</Label>
				<Input placeholder="Primary diagnosis" value={fields[0] ?? ""} onChange={e => set(0, e.target.value)} />
			</div>
			<div className="space-y-2">
				<Label>Clinical Notes</Label>
				<Textarea
					rows={4}
					placeholder="SOAP notes, clinical findings…"
					value={fields[1] ?? ""}
					onChange={e => set(1, e.target.value)}
				/>
			</div>
			<div className="space-y-2">
				<Label>Orders Placed</Label>
				<Textarea
					rows={2}
					placeholder="Labs, imaging, medications ordered…"
					value={fields[2] ?? ""}
					onChange={e => set(2, e.target.value)}
				/>
			</div>
		</div>
	)
}

function DispositionForm({
	data,
	onChange,
}: {
	data: StepData
	onChange: (d: Partial<StepData>) => void
}) {
	const fields = data.notes.split("|")
	const set = (i: number, val: string) => {
		const updated = [...fields]
		updated[i] = val
		onChange({ notes: updated.join("|") })
	}
	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label>Disposition</Label>
				<Select value={fields[0] ?? ""} onValueChange={val => set(0, val)}>
					<SelectTrigger>
						<SelectValue placeholder="Select disposition" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="discharge_home">Discharge to Home</SelectItem>
						<SelectItem value="admit">Admit to Ward</SelectItem>
						<SelectItem value="icu">Transfer to ICU</SelectItem>
						<SelectItem value="referral">Referral to Specialist</SelectItem>
						<SelectItem value="left_without_treatment">Left Without Treatment</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<div className="space-y-2">
				<Label>Discharge / Transfer Instructions</Label>
				<Textarea
					rows={3}
					placeholder="Instructions for patient or receiving ward…"
					value={fields[1] ?? ""}
					onChange={e => set(1, e.target.value)}
				/>
			</div>
			<div className="space-y-2">
				<Label>Follow-Up Date</Label>
				<Input
					type="date"
					value={fields[2] ?? ""}
					onChange={e => set(2, e.target.value)}
				/>
			</div>
		</div>
	)
}

// ============================================================================
// Read-Only Step View (for users without permission to act)
// ============================================================================

function StepReadOnlyView({ step, status }: { step: OpdStep; status: OpdStepStatus }) {
	return (
		<div className="space-y-4">
			<div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
				<Lock className="size-5 text-yellow-600 dark:text-yellow-400" />
				<div>
					<p className="font-medium text-yellow-800 dark:text-yellow-200">
						View Only — {step.responsibleRole} Required
					</p>
					<p className="text-sm text-yellow-700 dark:text-yellow-300">
						This step must be completed by a {step.responsibleRole}. You can view the workflow progress but cannot make changes.
					</p>
				</div>
			</div>
			{status === "pending" && (
				<p className="text-center text-muted-foreground">
					Waiting for previous step to complete...
				</p>
			)}
			{status === "in_progress" && (
				<p className="text-center text-muted-foreground">
					A {step.responsibleRole} needs to complete this step.
				</p>
			)}
		</div>
	)
}

// ============================================================================
// Main OPD Flow Component
// ============================================================================

interface OpdFlowProps {
	encounterId?: string
	patientName?: string
}

export function OpdFlow({ encounterId, patientName }: OpdFlowProps) {
	const permSet = usePermissionSet()
	const [currentStep, setCurrentStep] = useState<OpdStepId>("triage")
	const [stepStatuses, setStepStatuses] = useState<Record<OpdStepId, OpdStepStatus>>({
		triage: "in_progress",
		registration: "pending",
		vitals: "pending",
		consultation: "pending",
		disposition: "pending",
	})
	const [stepData, setStepData] = useState<OpdFlowState>({
		triage: { completedAt: null, notes: "" },
		registration: { completedAt: null, notes: "" },
		vitals: { completedAt: null, notes: "" },
		consultation: { completedAt: null, notes: "" },
		disposition: { completedAt: null, notes: "" },
	})
	const [startedAt] = useState<string>(new Date().toISOString())

	const currentIdx = OPD_STEPS.findIndex(s => s.id === currentStep)
	const currentStepDef = OPD_STEPS[currentIdx]!

	// Check if user can act on the current step
	const canActOnCurrentStep = currentStepDef
		? can(permSet, currentStepDef.requiredPermission.module, currentStepDef.requiredPermission.action)
		: false

	// Check which steps the user can act on
	const getCanActOnStep = (step: OpdStep) =>
		can(permSet, step.requiredPermission.module, step.requiredPermission.action)

	function handleDataChange(updates: Partial<StepData>) {
		setStepData(prev => ({
			...prev,
			[currentStep]: { ...prev[currentStep], ...updates },
		}))
	}

	function handleComplete() {
		if (!canActOnCurrentStep) return

		const now = new Date().toISOString()
		setStepData(prev => ({
			...prev,
			[currentStep]: { ...prev[currentStep], completedAt: now },
		}))
		setStepStatuses(prev => ({ ...prev, [currentStep]: "completed" }))

		const nextIdx = currentIdx + 1
		if (nextIdx < OPD_STEPS.length) {
			const nextStep = OPD_STEPS[nextIdx]!
			setCurrentStep(nextStep.id)
			setStepStatuses(prev => ({ ...prev, [nextStep.id]: "in_progress" }))
		}
	}

	const isAllComplete = OPD_STEPS.every(s => stepStatuses[s.id] === "completed")
	const elapsedMin = Math.round((Date.now() - Date.parse(startedAt)) / 60_000)

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold">OPD Consultation Flow</h1>
					{patientName && (
						<p className="text-sm text-muted-foreground">Patient: {patientName}</p>
					)}
					{encounterId && (
						<p className="text-xs text-muted-foreground">Encounter: {encounterId}</p>
					)}
				</div>
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Clock className="size-4" />
					Elapsed: {elapsedMin}m
					<Badge variant={isAllComplete ? "default" : "secondary"}>
						{isAllComplete ? "Completed" : `Step ${currentIdx + 1} of ${OPD_STEPS.length}`}
					</Badge>
				</div>
			</div>

			{/* Step Indicator */}
			<Card>
				<CardContent className="flex items-start pt-6 pb-4">
					{OPD_STEPS.map((step, idx) => (
						<StepIndicator
							key={step.id}
							step={step}
							status={stepStatuses[step.id]}
							index={idx}
							isLast={idx === OPD_STEPS.length - 1}
						/>
					))}
				</CardContent>
			</Card>

			{/* Current Step Form */}
			{!isAllComplete && currentStepDef && (
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="flex items-center gap-2">
									{currentStepDef.label}
									{!canActOnCurrentStep && (
										<Lock className="size-4 text-muted-foreground" />
									)}
								</CardTitle>
								<p className="mt-1 text-sm text-muted-foreground">{currentStepDef.description}</p>
								<p className="mt-0.5 text-xs text-muted-foreground">
									Responsible: {currentStepDef.responsibleRole}
								</p>
							</div>
							<Badge variant="outline" className="text-xs">
								<Clock className="mr-1 size-3" />
								SLA: {currentStepDef.slaSlaTargetMinutes}m
							</Badge>
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						{canActOnCurrentStep ? (
							<>
								{currentStep === "triage" && (
									<TriageForm data={stepData.triage} onChange={handleDataChange} />
								)}
								{currentStep === "registration" && (
									<RegistrationForm data={stepData.registration} onChange={handleDataChange} />
								)}
								{currentStep === "vitals" && (
									<VitalsForm data={stepData.vitals} onChange={handleDataChange} />
								)}
								{currentStep === "consultation" && (
									<ConsultationForm data={stepData.consultation} onChange={handleDataChange} />
								)}
								{currentStep === "disposition" && (
									<DispositionForm data={stepData.disposition} onChange={handleDataChange} />
								)}

								<Separator />

								<div className="flex justify-end">
									<Button onClick={handleComplete}>
										{currentIdx + 1 < OPD_STEPS.length ? (
											<>
												Mark Complete & Continue
												<ChevronRight className="ml-1 size-4" />
											</>
										) : (
											<>
												<Check className="mr-1 size-4" />
												Finalize Consultation
											</>
										)}
									</Button>
								</div>
							</>
						) : (
							<StepReadOnlyView step={currentStepDef} status={stepStatuses[currentStep]} />
						)}
					</CardContent>
				</Card>
			)}

			{/* Completion Summary */}
			{isAllComplete && (
				<Card>
					<CardContent className="pt-6">
						<div className="flex flex-col items-center gap-3 py-4">
							<div className="flex size-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
								<Check className="size-7 text-green-600 dark:text-green-400" />
							</div>
							<p className="text-lg font-semibold">OPD Consultation Complete</p>
							<p className="text-sm text-muted-foreground">
								All 5 steps completed. Total time: {elapsedMin}m
							</p>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Step Summary Table */}
			<Card>
				<CardHeader>
					<CardTitle>Step Summary</CardTitle>
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
							{OPD_STEPS.map(step => (
								<tr key={step.id} className="border-b">
									<td className="p-3 font-medium">{step.label}</td>
									<td className="p-3 text-muted-foreground">{step.slaSlaTargetMinutes}m</td>
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
										{stepData[step.id].completedAt
											? new Date(stepData[step.id].completedAt!).toLocaleTimeString("en-PH")
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
