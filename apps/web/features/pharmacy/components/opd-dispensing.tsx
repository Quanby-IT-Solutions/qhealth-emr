"use client"

import { useState } from "react"

import {
	CheckCircle2,
	ChevronRight,
	CreditCard,
	Loader2,
	Package,
	QrCode,
	Search,
	X,
} from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Checkbox } from "@/core/components/ui/checkbox"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Separator } from "@/core/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table"
import { Textarea } from "@/core/components/ui/textarea"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

import {
	type DispenseStep,
	type OpdPrescription,
	type OpdPrescriptionItem,
	useOpdDispenseMutation,
	useOpdPrescriptionQueueQuery,
	useOpdPrescriptionSearchQuery,
} from "../api/pharmacy.hooks"

// ── Step indicator ────────────────────────────────────────────────────────────

interface StepIndicatorProps {
	current: DispenseStep
}

const STEPS: Array<{ key: DispenseStep; label: string; icon: typeof Search }> = [
	{ key: "verify", label: "Rx Verification", icon: Search },
	{ key: "billing", label: "Billing Confirmation", icon: CreditCard },
	{ key: "dispense", label: "Dispense", icon: Package },
]

function StepIndicator({ current }: StepIndicatorProps) {
	const currentIdx = STEPS.findIndex((s) => s.key === current)

	return (
		<div className="flex items-center gap-0">
			{STEPS.map((step, idx) => {
				const Icon = step.icon
				const isActive = step.key === current
				const isDone = idx < currentIdx

				return (
					<div key={step.key} className="flex items-center">
						<div
							className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors ${
								isActive
									? "bg-primary text-primary-foreground"
									: isDone
										? "bg-muted text-muted-foreground"
										: "text-muted-foreground"
							}`}
						>
							{isDone ? (
								<CheckCircle2 className="size-4" />
							) : (
								<Icon className="size-4" />
							)}
							{step.label}
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

// ── Step 1: Rx Verification ───────────────────────────────────────────────────

interface RxVerifyStepProps {
	facilityId: string
	onPrescriptionFound: (rx: OpdPrescription) => void
}

function RxVerifyStep({ facilityId, onPrescriptionFound }: RxVerifyStepProps) {
	const [input, setInput] = useState("")
	const [submitted, setSubmitted] = useState("")

	const queue = useOpdPrescriptionQueueQuery({ facilityId, status: "signed" })
	const { data, isLoading: searchLoading, error, isFetching } = useOpdPrescriptionSearchQuery(submitted)

	function handleSearch() {
		setSubmitted(input.trim())
	}

	function handleClear() {
		setInput("")
		setSubmitted("")
	}

	return (
		<div className="space-y-4">
			{/* Queue list */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Pending Prescriptions</CardTitle>
				</CardHeader>
				<CardContent>
					{queue.isLoading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="text-muted-foreground size-5 animate-spin" />
						</div>
					) : queue.data?.data?.length === 0 ? (
						<p className="text-muted-foreground py-6 text-center text-sm">
							No pending prescriptions at this time.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Patient</TableHead>
									<TableHead>MRN</TableHead>
									<TableHead>Medication</TableHead>
									<TableHead>Prescriber</TableHead>
									<TableHead>Date</TableHead>
									<TableHead>Status</TableHead>
									<TableHead />
								</TableRow>
							</TableHeader>
							<TableBody>
								{queue.data?.data?.map((rx) => (
									<TableRow
										key={rx.id}
										className="cursor-pointer hover:bg-muted/50"
										onClick={() => setSubmitted(rx.patientMrn)}
									>
										<TableCell className="font-medium">{rx.patientName}</TableCell>
										<TableCell className="text-muted-foreground text-sm">{rx.patientMrn}</TableCell>
										<TableCell className="text-sm">{rx.medicationSummary}</TableCell>
										<TableCell className="text-muted-foreground text-sm">
											{rx.prescriberName ?? "—"}
										</TableCell>
										<TableCell className="text-muted-foreground text-sm">
											{new Date(rx.prescribedAt).toLocaleDateString("en-PH")}
										</TableCell>
										<TableCell>
											<Badge
												variant={rx.status === "signed" ? "default" : "secondary"}
												className="text-xs"
											>
												{rx.status}
											</Badge>
										</TableCell>
										<TableCell>
											<Button
												size="sm"
												variant="outline"
												onClick={(e) => {
													e.stopPropagation()
													setSubmitted(rx.patientMrn)
												}}
											>
												Select
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			{/* Manual search */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Step 1 — Scan or Enter Prescription</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-muted-foreground text-sm">
						Scan the QR code on the prescription slip, or manually enter the prescription
						number or patient MRN.
					</p>

					<div className="flex gap-2">
						<div className="relative flex-1">
							<QrCode className="text-muted-foreground absolute left-2.5 top-2.5 size-4" />
							<Input
								className="pl-9"
								placeholder="Rx number, patient MRN, or scan QR…"
								value={input}
								onChange={(e) => setInput(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleSearch()}
							/>
						</div>
						{input && (
							<Button variant="ghost" size="icon" onClick={handleClear}>
								<X className="size-4" />
							</Button>
						)}
						<Button onClick={handleSearch} disabled={!input.trim() || isFetching}>
							{isFetching ? (
								<Loader2 className="mr-1.5 size-4 animate-spin" />
							) : (
								<Search className="mr-1.5 size-4" />
							)}
							Search
						</Button>
					</div>

					{error && (
						<p className="text-sm text-red-600">
							Prescription not found. Please check the number and try again.
						</p>
					)}

					{data && (
						<div className="rounded-md border p-4 space-y-3">
							<div className="flex items-start justify-between">
								<div>
									<p className="font-semibold">{data.patientName}</p>
									<p className="text-muted-foreground text-sm">
										MRN: {data.patientMrn}
										{data.patientDateOfBirth
											? ` · DOB: ${new Date(data.patientDateOfBirth).toLocaleDateString("en-PH")}`
											: ""}
									</p>
								</div>
								<Badge
									variant={
										data.status === "issued" ? "secondary"
											: data.status === "signed" ? "default"
											: "secondary"
									}
								>
									{data.status}
								</Badge>
							</div>

							<Separator />

							<div>
								<p className="text-xs text-muted-foreground mb-1">
									Prescriber: {data.prescriberName ?? "—"} · PRC {data.prescriberPrc}
								</p>
								<p className="text-xs text-muted-foreground">
									Rx #{data.prescriptionNumber} · Prescribed:{" "}
									{new Date(data.prescribedAt).toLocaleDateString("en-PH")}
								</p>
							</div>

							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Medication</TableHead>
										<TableHead className="text-center">Qty</TableHead>
										<TableHead className="text-right">Price</TableHead>
										<TableHead />
									</TableRow>
								</TableHeader>
								<TableBody>
									{data.items.map((item) => (
										<TableRow key={item.id}>
											<TableCell>
												<p className="text-sm font-medium">{item.genericName}</p>
												{item.brandName && (
													<p className="text-muted-foreground text-xs">
														({item.brandName})
													</p>
												)}
												<p className="text-muted-foreground text-xs">
													{item.dose} {item.doseUnit} · {item.route} ·{" "}
													{item.frequency}
												</p>
											</TableCell>
											<TableCell className="text-center text-sm">
												{item.quantity} {item.doseForm}
											</TableCell>
											<TableCell className="text-right text-sm">
												₱{(item.totalPrice ?? 0).toFixed(2)}
											</TableCell>
											<TableCell>
												{item.dispensed && (
													<Badge variant="outline" className="text-xs">
														Dispensed
													</Badge>
												)}
												{item.isControlledSubstance && (
													<Badge variant="outline" className="text-xs">
														CS S{item.pdeaSchedule}
													</Badge>
												)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>

							<div className="flex justify-end">
								<Button
									onClick={() => onPrescriptionFound(data)}
									disabled={data.status === "draft"}
								>
									Proceed to Billing
									<ChevronRight className="ml-1.5 size-4" />
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}

// ── Step 2: Billing Confirmation ──────────────────────────────────────────────

interface BillingStepProps {
	prescription: OpdPrescription
	onConfirm: () => void
	onBack: () => void
}

function BillingStep({ prescription, onConfirm, onBack }: BillingStepProps) {
	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Step 2 — Billing Confirmation</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="rounded-md bg-muted p-4 space-y-2">
						<div className="flex justify-between text-sm">
							<span>Estimated Total</span>
							<span className="font-medium">₱{(prescription.estimatedTotal ?? 0).toFixed(2)}</span>
						</div>
						{prescription.philhealthPin && (
							<div className="flex justify-between text-sm text-green-700">
								<span>PhilHealth Coverage (PIN: {prescription.philhealthPin})</span>
								<span className="font-medium">
									−₱{(prescription.philhealthCoverage ?? 0).toFixed(2)}
								</span>
							</div>
						)}
						<Separator />
						<div className="flex justify-between font-semibold">
							<span>Patient Out-of-Pocket</span>
							<span>₱{(prescription.outOfPocket ?? 0).toFixed(2)}</span>
						</div>
					</div>

					<p className="text-muted-foreground text-sm">
						Please collect payment or confirm PhilHealth billing before dispensing.
					</p>

					<div className="flex gap-3">
						<Button onClick={onConfirm}>
							Confirm Billing & Proceed
							<ChevronRight className="ml-1.5 size-4" />
						</Button>
						<Button variant="outline" onClick={onBack}>
							Back
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

// ── Step 3: Dispense ──────────────────────────────────────────────────────────

interface DispenseStepProps {
	prescription: OpdPrescription
	facilityId: string
	onSuccess: (record: { id: string }) => void
	onBack: () => void
}

function OpdDispenseStep({ prescription, facilityId, onSuccess, onBack }: DispenseStepProps) {
	const dispense = useOpdDispenseMutation()

	const [items, setItems] = useState<
		Array<{
			prescriptionItemId: string
			dispensedQuantity: number
			lotNumber: string
			selected: boolean
		}>
	>(
		prescription.items
			.filter((i) => !i.dispensed)
			.map((i) => ({
				prescriptionItemId: i.id,
				dispensedQuantity: i.quantity,
				lotNumber: "",
				selected: true,
			}))
	)

	const [counselingNotes, setCounselingNotes] = useState("")
	const [education, setEducation] = useState<Set<string>>(new Set())

	const EDUCATION_KEYS = [
		{ key: "purpose", label: "Medication purpose explained" },
		{ key: "dose_instructions", label: "Dosing instructions confirmed" },
		{ key: "side_effects", label: "Side effects discussed" },
		{ key: "storage", label: "Storage requirements communicated" },
	]

	function updateItem(id: string, field: "dispensedQuantity" | "lotNumber", value: string | number) {
		setItems((prev) =>
			prev.map((i) =>
				i.prescriptionItemId === id ? { ...i, [field]: value } : i
			)
		)
	}

	function toggleItem(id: string) {
		setItems((prev) =>
			prev.map((i) =>
				i.prescriptionItemId === id ? { ...i, selected: !i.selected } : i
			)
		)
	}

	function toggleEducation(key: string) {
		setEducation((prev) => {
			const next = new Set(prev)
			if (next.has(key)) next.delete(key)
			else next.add(key)
			return next
		})
	}

	function getPrescriptionItem(id: string): OpdPrescriptionItem | undefined {
		return prescription.items.find((i) => i.id === id)
	}

	function handleDispense() {
		const selected = items.filter((i) => i.selected)
		dispense.mutate(
			{
				prescriptionId: prescription.id,
				facilityId,
				items: selected.map((i) => ({
					prescriptionItemId: i.prescriptionItemId,
					dispensedQuantity: i.dispensedQuantity,
					lotNumber: i.lotNumber || undefined,
				})),
				counselingNotes: counselingNotes || undefined,
				patientEducation: Array.from(education),
			},
			{ onSuccess: (data) => onSuccess(data) }
		)
	}

	const hasSelected = items.some((i) => i.selected)

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Step 3 — Dispense Medications</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-8" />
								<TableHead>Medication</TableHead>
								<TableHead className="text-center">Qty to Dispense</TableHead>
								<TableHead>Lot #</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{items.map((item) => {
								const rxItem = getPrescriptionItem(item.prescriptionItemId)
								return (
									<TableRow key={item.prescriptionItemId}>
										<TableCell>
											<Checkbox
												checked={item.selected}
												onCheckedChange={() => toggleItem(item.prescriptionItemId)}
											/>
										</TableCell>
										<TableCell>
											<p className="text-sm font-medium">
												{rxItem?.genericName}
											</p>
											{rxItem?.brandName && (
												<p className="text-muted-foreground text-xs">
													({rxItem.brandName})
												</p>
											)}
											<p className="text-muted-foreground text-xs">
												{rxItem?.dose} {rxItem?.doseUnit} · {rxItem?.doseForm}
											</p>
										</TableCell>
										<TableCell className="text-center">
											<Input
												type="number"
												min="1"
												className="w-20 text-center"
												value={item.dispensedQuantity}
												onChange={(e) =>
													updateItem(
														item.prescriptionItemId,
														"dispensedQuantity",
														Number(e.target.value)
													)
												}
												disabled={!item.selected}
											/>
										</TableCell>
										<TableCell>
											<Input
												placeholder="Optional"
												className="w-32"
												value={item.lotNumber}
												onChange={(e) =>
													updateItem(
														item.prescriptionItemId,
														"lotNumber",
														e.target.value
													)
												}
												disabled={!item.selected}
											/>
										</TableCell>
									</TableRow>
								)
							})}
						</TableBody>
					</Table>

					<Separator />

					<div>
						<Label htmlFor="opdCounseling" className="mb-1 block text-sm">
							Counseling Notes
						</Label>
						<Textarea
							id="opdCounseling"
							rows={3}
							placeholder="Document what was discussed with the patient…"
							value={counselingNotes}
							onChange={(e) => setCounselingNotes(e.target.value)}
						/>
					</div>

					<div>
						<p className="mb-2 text-sm font-medium">Patient Education</p>
						<div className="space-y-2">
							{EDUCATION_KEYS.map((item) => (
								<div key={item.key} className="flex items-center gap-2">
									<Checkbox
										id={`opd-edu-${item.key}`}
										checked={education.has(item.key)}
										onCheckedChange={() => toggleEducation(item.key)}
									/>
									<Label
										htmlFor={`opd-edu-${item.key}`}
										className="cursor-pointer text-sm font-normal"
									>
										{item.label}
									</Label>
								</div>
							))}
						</div>
					</div>

					<div className="flex gap-3">
						<Button
							onClick={handleDispense}
							disabled={!hasSelected || dispense.isPending}
						>
							{dispense.isPending ? (
								<Loader2 className="mr-1.5 size-4 animate-spin" />
							) : (
								<Package className="mr-1.5 size-4" />
							)}
							Confirm Dispense
						</Button>
						<Button variant="outline" onClick={onBack} disabled={dispense.isPending}>
							Back
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

// ── Success screen ────────────────────────────────────────────────────────────

interface SuccessScreenProps {
	patientName: string
	onReset: () => void
}

function SuccessScreen({ patientName, onReset }: SuccessScreenProps) {
	return (
		<div className="flex flex-col items-center justify-center gap-4 py-16">
			<CheckCircle2 className="size-16 text-green-600" />
			<div className="text-center">
				<p className="text-lg font-semibold">Dispense Complete</p>
				<p className="text-muted-foreground text-sm">
					Medications successfully dispensed to {patientName}.
				</p>
			</div>
			<Button onClick={onReset}>Dispense Another Prescription</Button>
		</div>
	)
}

// ── Main OPD Dispensing component ─────────────────────────────────────────────

export function OpdDispensing() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	const [step, setStep] = useState<DispenseStep>("verify")
	const [prescription, setPrescription] = useState<OpdPrescription | null>(null)
	const [done, setDone] = useState(false)

	function handleReset() {
		setStep("verify")
		setPrescription(null)
		setDone(false)
	}

	if (done && prescription) {
		return <SuccessScreen patientName={prescription.patientName} onReset={handleReset} />
	}

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-semibold">OPD Pharmacy Dispensing</h2>
				<p className="text-muted-foreground text-sm">
					Walk-in prescription verification and dispensing flow
				</p>
			</div>

			<StepIndicator current={step} />

			{step === "verify" && (
				<RxVerifyStep
					facilityId={facilityId}
					onPrescriptionFound={(rx) => {
						setPrescription(rx)
						setStep("billing")
					}}
				/>
			)}

			{step === "billing" && prescription && (
				<BillingStep
					prescription={prescription}
					onConfirm={() => setStep("dispense")}
					onBack={() => setStep("verify")}
				/>
			)}

			{step === "dispense" && prescription && (
				<OpdDispenseStep
					prescription={prescription}
					facilityId={facilityId}
					onSuccess={() => setDone(true)}
					onBack={() => setStep("billing")}
				/>
			)}
		</div>
	)
}
