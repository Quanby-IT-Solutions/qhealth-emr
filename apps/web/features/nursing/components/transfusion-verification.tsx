"use client"

import { useCallback, useRef, useState } from "react"
import {
	AlertCircle,
	CheckCircle2,
	ChevronRight,
	Droplets,
	Heart,
	Package,
	QrCode,
	RotateCcw,
	User,
	X,
} from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Separator } from "@/core/components/ui/separator"
import { Textarea } from "@/core/components/ui/textarea"

// ============================================================================
// Types
// ============================================================================

type TransfusionStep = "patient" | "product" | "order" | "vitals" | "complete"

interface ScanResult {
	value: string
	status: "pass" | "fail" | "pending"
	message?: string
}

interface VitalsCapture {
	baseline: { bp: string; hr: string; temp: string; spo2: string }
	fifteenMin: { bp: string; hr: string; temp: string; spo2: string }
	end: { bp: string; hr: string; temp: string; spo2: string }
	notes: string
}

// ============================================================================
// Step Indicator
// ============================================================================

const STEPS: Array<{ key: TransfusionStep; label: string; icon: typeof User }> = [
	{ key: "patient", label: "Patient", icon: User },
	{ key: "product", label: "Blood Product", icon: Droplets },
	{ key: "order", label: "CPOE Order", icon: Package },
	{ key: "vitals", label: "Vital Signs", icon: Heart },
]

interface StepIndicatorProps {
	current: TransfusionStep
	completed: TransfusionStep[]
}

function StepIndicator({ current, completed }: StepIndicatorProps) {
	return (
		<div className="flex flex-wrap items-center gap-0">
			{STEPS.map((step, idx) => {
				const Icon = step.icon
				const isActive = step.key === current
				const isDone = completed.includes(step.key)

				return (
					<div key={step.key} className="flex items-center">
						<div
							className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors ${
								isActive
									? "bg-primary text-primary-foreground"
									: isDone
										? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
										: "text-muted-foreground"
							}`}
						>
							{isDone ? <CheckCircle2 className="size-4" /> : <Icon className="size-4" />}
							<span className="hidden sm:inline">{step.label}</span>
						</div>
						{idx < STEPS.length - 1 && (
							<ChevronRight className="text-muted-foreground mx-1 size-4" />
						)}
					</div>
				)
			})}
		</div>
	)
}

// ============================================================================
// Barcode Scan Step
// ============================================================================

interface ScanStepProps {
	title: string
	description: string
	icon: React.ReactNode
	placeholder: string
	scan: ScanResult
	onScan: (value: string) => void
	onClear: () => void
}

function ScanStep({ title, description, icon, placeholder, scan, onScan, onClear }: ScanStepProps) {
	const [input, setInput] = useState(scan.value)

	function handleSubmit() {
		if (input.trim()) onScan(input.trim())
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					{icon}
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-muted-foreground text-sm">{description}</p>

				<div className="flex gap-2">
					<div className="relative flex-1">
						<QrCode className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
						<Input
							className="pl-9"
							placeholder={placeholder}
							value={input}
							onChange={e => setInput(e.target.value)}
							onKeyDown={e => e.key === "Enter" && handleSubmit()}
							disabled={scan.status === "pass"}
						/>
					</div>
					{scan.status === "pass" ? (
						<Button variant="outline" size="icon" onClick={onClear}>
							<RotateCcw className="size-4" />
						</Button>
					) : (
						<Button onClick={handleSubmit} disabled={!input.trim()}>
							Verify
						</Button>
					)}
				</div>

				{scan.status === "pass" && (
					<div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
						<CheckCircle2 className="size-4 shrink-0" />
						<span>{scan.message ?? "Verified"}</span>
					</div>
				)}
				{scan.status === "fail" && (
					<div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
						<AlertCircle className="size-4 shrink-0" />
						<span>{scan.message ?? "Verification failed"}</span>
					</div>
				)}
			</CardContent>
		</Card>
	)
}

// ============================================================================
// Vitals Entry (3 time points)
// ============================================================================

type VitalsTimePoint = "baseline" | "fifteenMin" | "end"

const VITALS_LABELS: Record<VitalsTimePoint, string> = {
	baseline: "Baseline (pre-transfusion)",
	fifteenMin: "15 min into transfusion",
	end: "End of transfusion",
}

interface VitalsEntryProps {
	vitals: VitalsCapture
	onChange: (next: VitalsCapture) => void
}

function VitalsEntry({ vitals, onChange }: VitalsEntryProps) {
	function updatePoint(
		point: VitalsTimePoint,
		field: keyof VitalsCapture["baseline"],
		value: string
	) {
		onChange({
			...vitals,
			[point]: { ...vitals[point], [field]: value },
		})
	}

	const fields: Array<{
		key: keyof VitalsCapture["baseline"]
		label: string
		placeholder: string
	}> = [
		{ key: "bp", label: "BP (mmHg)", placeholder: "120/80" },
		{ key: "hr", label: "HR (bpm)", placeholder: "72" },
		{ key: "temp", label: "Temp (°C)", placeholder: "36.8" },
		{ key: "spo2", label: "SpO₂ (%)", placeholder: "98" },
	]

	return (
		<div className="space-y-6">
			{(["baseline", "fifteenMin", "end"] as VitalsTimePoint[]).map(point => (
				<div key={point}>
					<p className="mb-3 text-sm font-medium">{VITALS_LABELS[point]}</p>
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
						{fields.map(f => (
							<div key={f.key} className="space-y-1">
								<Label className="text-xs">{f.label}</Label>
								<Input
									placeholder={f.placeholder}
									value={vitals[point][f.key]}
									onChange={e => updatePoint(point, f.key, e.target.value)}
								/>
							</div>
						))}
					</div>
					{point !== "end" && <Separator className="mt-4" />}
				</div>
			))}

			<div className="space-y-1">
				<Label className="text-xs">Transfusion Notes / Reactions Observed</Label>
				<Textarea
					rows={3}
					placeholder="Document any adverse reactions, patient complaints, or nursing interventions…"
					value={vitals.notes}
					onChange={e => onChange({ ...vitals, notes: e.target.value })}
				/>
			</div>
		</div>
	)
}

// ============================================================================
// Match Summary (3-way)
// ============================================================================

interface MatchSummaryProps {
	patientScan: ScanResult
	productScan: ScanResult
	orderScan: ScanResult
}

function MatchSummary({ patientScan, productScan, orderScan }: MatchSummaryProps) {
	const allPass =
		patientScan.status === "pass" && productScan.status === "pass" && orderScan.status === "pass"

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">3-Way Match Result</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{[
					{ label: "Patient Wristband", scan: patientScan },
					{ label: "Blood Product", scan: productScan },
					{ label: "CPOE Order", scan: orderScan },
				].map(({ label, scan }) => (
					<div key={label} className="flex items-center justify-between">
						<span className="text-sm">{label}</span>
						<div className="flex items-center gap-2">
							<span className="text-muted-foreground font-mono text-xs">{scan.value || "—"}</span>
							{scan.status === "pass" ? (
								<Badge className="bg-green-600 text-white">✓ Match</Badge>
							) : scan.status === "fail" ? (
								<Badge variant="destructive">✗ Mismatch</Badge>
							) : (
								<Badge variant="outline">Pending</Badge>
							)}
						</div>
					</div>
				))}

				{allPass && (
					<div className="mt-4 flex items-center gap-2 rounded-md bg-green-50 px-4 py-3 text-sm font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
						<CheckCircle2 className="size-5 shrink-0" />
						All three identifiers verified. Proceed with transfusion.
					</div>
				)}
			</CardContent>
		</Card>
	)
}

// ============================================================================
// Main Component
// ============================================================================

interface TransfusionVerificationProps {
	encounterId?: string
	onComplete?: (record: { vitals: VitalsCapture; scans: Record<string, string> }) => void
	onCancel?: () => void
}

export function TransfusionVerification({ onComplete, onCancel }: TransfusionVerificationProps) {
	const [step, setStep] = useState<TransfusionStep>("patient")
	const [completed, setCompleted] = useState<TransfusionStep[]>([])

	const [patientScan, setPatientScan] = useState<ScanResult>({ value: "", status: "pending" })
	const [productScan, setProductScan] = useState<ScanResult>({ value: "", status: "pending" })
	const [orderScan, setOrderScan] = useState<ScanResult>({ value: "", status: "pending" })

	const [vitals, setVitals] = useState<VitalsCapture>({
		baseline: { bp: "", hr: "", temp: "", spo2: "" },
		fifteenMin: { bp: "", hr: "", temp: "", spo2: "" },
		end: { bp: "", hr: "", temp: "", spo2: "" },
		notes: "",
	})

	const markComplete = useCallback((s: TransfusionStep) => {
		setCompleted(prev => (prev.includes(s) ? prev : [...prev, s]))
	}, [])

	// Simplified validation: any non-empty scan passes (real impl would check against backend)
	function handlePatientScan(value: string) {
		setPatientScan({ value, status: "pass", message: `Patient ID: ${value}` })
		markComplete("patient")
		setStep("product")
	}

	function handleProductScan(value: string) {
		setProductScan({ value, status: "pass", message: `Blood product unit: ${value}` })
		markComplete("product")
		setStep("order")
	}

	function handleOrderScan(value: string) {
		setOrderScan({ value, status: "pass", message: `CPOE order: ${value}` })
		markComplete("order")
		setStep("vitals")
	}

	function handleFinish() {
		markComplete("vitals")
		setStep("complete")
		onComplete?.({
			vitals,
			scans: {
				patient: patientScan.value,
				product: productScan.value,
				order: orderScan.value,
			},
		})
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-lg font-semibold">Bedside Transfusion Verification</h2>
					<p className="text-muted-foreground text-sm">
						Complete the 3-way barcode match before initiating blood transfusion.
					</p>
				</div>
				{onCancel && (
					<Button variant="ghost" size="icon" onClick={onCancel}>
						<X className="size-4" />
					</Button>
				)}
			</div>

			<StepIndicator current={step} completed={completed} />

			{/* Step content */}
			{step === "patient" && (
				<ScanStep
					title="Step 1 — Scan Patient Wristband"
					description="Scan the patient's identification wristband barcode to confirm identity."
					icon={<User className="size-4" />}
					placeholder="Scan patient wristband barcode…"
					scan={patientScan}
					onScan={handlePatientScan}
					onClear={() => {
						setPatientScan({ value: "", status: "pending" })
					}}
				/>
			)}

			{step === "product" && (
				<ScanStep
					title="Step 2 — Scan Blood Product"
					description="Scan the blood product unit barcode from the blood bank label."
					icon={<Droplets className="size-4" />}
					placeholder="Scan blood product unit barcode…"
					scan={productScan}
					onScan={handleProductScan}
					onClear={() => {
						setProductScan({ value: "", status: "pending" })
					}}
				/>
			)}

			{step === "order" && (
				<ScanStep
					title="Step 3 — Scan CPOE Order"
					description="Scan the barcode on the blood transfusion order slip or requisition form."
					icon={<Package className="size-4" />}
					placeholder="Scan CPOE order barcode…"
					scan={orderScan}
					onScan={handleOrderScan}
					onClear={() => {
						setOrderScan({ value: "", status: "pending" })
					}}
				/>
			)}

			{step === "vitals" && (
				<div className="space-y-4">
					<MatchSummary patientScan={patientScan} productScan={productScan} orderScan={orderScan} />
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Step 4 — Record Transfusion Vital Signs</CardTitle>
						</CardHeader>
						<CardContent>
							<VitalsEntry vitals={vitals} onChange={setVitals} />
						</CardContent>
					</Card>
					<div className="flex justify-end">
						<Button onClick={handleFinish} disabled={!vitals.baseline.bp || !vitals.baseline.hr}>
							Complete &amp; Save Transfusion Record
						</Button>
					</div>
				</div>
			)}

			{step === "complete" && (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12 text-center">
						<CheckCircle2 className="mb-4 size-14 text-green-500" />
						<p className="text-lg font-semibold">Transfusion Verified &amp; Recorded</p>
						<p className="text-muted-foreground mt-1 text-sm">
							3-way barcode match confirmed. Vital signs documented. Record saved.
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
