"use client"

import { CheckCircle2, Circle, Clock, Lock } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"

type ApiStatus = "complete" | "incomplete" | "not_applicable"

interface ChecklistItem {
	key: string
	label: string
	category: "clinical" | "billing"
	status: ApiStatus
	responsibleRole: string
}

interface DischargeChecklistProps {
	items: ChecklistItem[]
	encounterType: string
}

type DisplayStatus = "Completed" | "Pending" | "Blocked"

interface Step {
	id: string
	label: string
	keys: string[]
	role: string
}

const INPATIENT_STEPS: Step[] = [
	{
		id: "chart",
		label: "Chart",
		keys: ["discharge_summary_signed", "final_diagnosis_coded", "followup_instructions"],
		role: "Clinician",
	},
	{
		id: "medications",
		label: "Medications",
		keys: ["discharge_medications"],
		role: "Clinician",
	},
	{
		id: "nursing",
		label: "Nursing",
		keys: ["nursing_clearance"],
		role: "Nurse",
	},
	{
		id: "pharmacy",
		label: "Pharmacy",
		keys: ["pharmacy_clearance"],
		role: "Pharmacist",
	},
	{
		id: "billing",
		label: "Billing",
		keys: ["charges_captured", "invoice_generated", "payment_recorded", "billing_sign_off"],
		role: "Biller",
	},
	{
		id: "gate_pass",
		label: "Gate Pass",
		keys: [],
		role: "Security / Billing",
	},
]

const OUTPATIENT_STEPS: Step[] = [
	{
		id: "chart",
		label: "Visit Note",
		keys: ["visit_note_signed", "diagnoses_coded"],
		role: "Clinician",
	},
	{
		id: "billing",
		label: "Billing",
		keys: ["charges_captured"],
		role: "Biller",
	},
	{
		id: "orders",
		label: "Orders / eRx",
		keys: ["orders_finalized"],
		role: "Clinician",
	},
	{
		id: "gate_pass",
		label: "Gate Pass",
		keys: [],
		role: "Security / Billing",
	},
]

function stepDisplayStatus(
	step: Step,
	items: ChecklistItem[],
	isGatePassAvailable: boolean
): DisplayStatus {
	if (step.id === "gate_pass") {
		return isGatePassAvailable ? "Completed" : "Blocked"
	}
	if (step.keys.length === 0) return "Pending"
	const relevantItems = items.filter(i => step.keys.includes(i.key))
	if (relevantItems.length === 0) return "Pending"
	if (relevantItems.every(i => i.status === "complete" || i.status === "not_applicable")) {
		return "Completed"
	}
	return "Pending"
}

function statusBadgeVariant(status: DisplayStatus) {
	switch (status) {
		case "Completed":
			return "default" as const
		case "Blocked":
			return "destructive" as const
		default:
			return "secondary" as const
	}
}

function StepIcon({ status }: { status: DisplayStatus }) {
	switch (status) {
		case "Completed":
			return <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-400" />
		case "Blocked":
			return <Lock className="mt-0.5 size-4 shrink-0 text-destructive" />
		default:
			return <Clock className="text-muted-foreground mt-0.5 size-4 shrink-0" />
	}
}

function ConnectorLine({ completed }: { completed: boolean }) {
	return (
		<div
			className={`mx-[7px] h-4 w-0.5 ${completed ? "bg-green-500" : "bg-border"}`}
		/>
	)
}

export function DischargeChecklist({ items, encounterType }: DischargeChecklistProps) {
	const isOutpatient = encounterType === "outpatient"
	const steps = isOutpatient ? OUTPATIENT_STEPS : INPATIENT_STEPS

	const requiredStepsComplete = steps
		.filter(step => step.id !== "gate_pass")
		.every(step => stepDisplayStatus(step, items, false) === "Completed")

	const stepStatuses = steps.map(step => ({
		step,
		status: stepDisplayStatus(step, items, requiredStepsComplete),
		subItems: items.filter(i => step.keys.includes(i.key)),
	}))

	const allComplete = stepStatuses.every(s => s.status === "Completed")

	return (
		<div className="space-y-1">
			{stepStatuses.map(({ step, status, subItems }, idx) => {
				const isLast = idx === stepStatuses.length - 1

				return (
					<div key={step.id}>
						<div className="flex items-start gap-3">
							{/* Step indicator */}
							<div className="flex flex-col items-center">
								<StepIcon status={status} />
								{!isLast && <ConnectorLine completed={status === "Completed"} />}
							</div>

							{/* Step content */}
							<div className="flex-1 pb-1">
								<div className="flex items-center justify-between gap-2">
									<div>
										<p className="text-sm font-medium">{step.label}</p>
										<p className="text-muted-foreground text-xs">{step.role}</p>
									</div>
									<Badge variant={statusBadgeVariant(status)} className="shrink-0 text-xs">
										{status}
									</Badge>
								</div>

								{/* Sub-item breakdown */}
								{subItems.length > 0 && (
									<div className="mt-1.5 space-y-1 pl-0">
										{subItems.map(item => (
											<div
												key={item.key}
												className="flex items-center gap-1.5 text-xs"
											>
												{item.status === "complete" ? (
													<Circle className="size-2 fill-green-500 text-green-500" />
												) : item.status === "not_applicable" ? (
													<Circle className="size-2 fill-muted text-muted" />
												) : (
													<Circle className="text-muted-foreground size-2" />
												)}
												<span
													className={
														item.status === "complete"
															? "text-muted-foreground line-through"
															: "text-muted-foreground"
													}
												>
													{item.label}
												</span>
											</div>
										))}
									</div>
								)}

								{/* Gate Pass special message */}
								{step.id === "gate_pass" && status === "Blocked" && (
									<p className="mt-1 text-xs text-red-600 dark:text-red-400">
										All discharge checklist items must be completed before Gate Pass is
										issued.
									</p>
								)}
							</div>
						</div>
					</div>
				)
			})}

			{allComplete && (
				<p className="mt-2 text-sm font-medium text-green-600 dark:text-green-400">
					All steps complete - patient is ready for discharge.
				</p>
			)}
		</div>
	)
}
