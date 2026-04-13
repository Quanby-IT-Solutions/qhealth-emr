"use client"

import { useState } from "react"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Textarea } from "@/core/components/ui/textarea"
import { cn } from "@/core/lib/utils"
import {
	useCreateMedOrderMutation,
	useEvaluateCdsMutation,
} from "@/features/orders/api/orders.hooks"

interface CdsAlert {
	type: string
	severity: string
	message: string
	details?: Record<string, unknown>
}

interface CdsResult {
	alerts: CdsAlert[]
	canProceed: boolean
	requiresOverride: boolean
	requiresDoubleVerification: boolean
}

interface CreateMedOrderDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	encounterId: string
	facilityId: string
	patientId: string
	orderingStaffId: string
}

export function CreateMedOrderDialog({
	open,
	onOpenChange,
	encounterId,
	facilityId,
	patientId,
	orderingStaffId,
}: CreateMedOrderDialogProps) {
	const [genericName, setGenericName] = useState("")
	const [brandName, setBrandName] = useState("")
	const [dose, setDose] = useState("")
	const [doseUnit, setDoseUnit] = useState("")
	const [doseForm, setDoseForm] = useState("")
	const [route, setRoute] = useState("")
	const [frequency, setFrequency] = useState("")
	const [durationDays, setDurationDays] = useState("")
	const [specialInstructions, setSpecialInstructions] = useState("")
	const [isPrn, setIsPrn] = useState(false)
	const [prnReason, setPrnReason] = useState("")
	const [isControlledSubstance, setIsControlledSubstance] = useState(false)
	const [pdeaSchedule, setPdeaSchedule] = useState("")

	const [cdsResult, setCdsResult] = useState<CdsResult | null>(null)
	const [overrideReason, setOverrideReason] = useState("")

	const evaluateCds = useEvaluateCdsMutation()
	const createMedOrder = useCreateMedOrderMutation()

	function resetForm() {
		setGenericName("")
		setBrandName("")
		setDose("")
		setDoseUnit("")
		setDoseForm("")
		setRoute("")
		setFrequency("")
		setDurationDays("")
		setSpecialInstructions("")
		setIsPrn(false)
		setPrnReason("")
		setIsControlledSubstance(false)
		setPdeaSchedule("")
		setCdsResult(null)
		setOverrideReason("")
	}

	function handleOpenChange(next: boolean) {
		if (!next) resetForm()
		onOpenChange(next)
	}

	function handleCheckCds() {
		if (!genericName.trim()) return
		evaluateCds.mutate(
			{
				patientId,
				genericName: genericName.trim(),
				isControlledSubstance,
				orderingStaffId,
				facilityId,
			},
			{
				onSuccess: (data) => setCdsResult(data),
			},
		)
	}

	const hasHardBlock = cdsResult?.alerts.some((a) => a.severity === "hard_block") ?? false
	const hasSoftBlock = cdsResult?.alerts.some((a) => a.severity === "soft_block") ?? false
	const needsOverrideReason = hasSoftBlock && !overrideReason.trim()

	const canSubmit =
		genericName.trim() &&
		dose.trim() &&
		doseUnit.trim() &&
		doseForm.trim() &&
		route.trim() &&
		frequency.trim() &&
		!hasHardBlock &&
		!needsOverrideReason

	function handleSubmit() {
		if (!canSubmit) return

		const cdsOverrides = hasSoftBlock
			? { reason: overrideReason.trim(), overriddenAt: new Date().toISOString() }
			: undefined

		createMedOrder.mutate(
			{
				facilityId,
				encounterId,
				genericName: genericName.trim(),
				brandName: brandName.trim() || undefined,
				dose: dose.trim(),
				doseUnit: doseUnit.trim(),
				doseForm: doseForm.trim(),
				route: route.trim(),
				frequency: frequency.trim(),
				durationDays: durationDays ? Number(durationDays) : undefined,
				specialInstructions: specialInstructions.trim() || undefined,
				isPrn,
				prnReason: isPrn ? prnReason.trim() || undefined : undefined,
				isControlledSubstance,
				pdeaSchedule: isControlledSubstance ? pdeaSchedule.trim() || undefined : undefined,
				cdsAlerts: cdsResult?.alerts ?? undefined,
				cdsOverrides,
			},
			{
				onSuccess: () => handleOpenChange(false),
			},
		)
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle>New Medication Order</DialogTitle>
					<DialogDescription>
						Enter the medication details. Check drug safety before submitting.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-4">
					{/* Drug Info */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="genericName">Generic Name *</Label>
							<Input
								id="genericName"
								value={genericName}
								onChange={(e) => setGenericName(e.target.value)}
								placeholder="e.g., Amoxicillin"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="brandName">Brand Name</Label>
							<Input
								id="brandName"
								value={brandName}
								onChange={(e) => setBrandName(e.target.value)}
								placeholder="Optional"
							/>
						</div>
					</div>

					{/* CDS Check */}
					<div className="flex items-end gap-2">
						<Button
							type="button"
							variant="secondary"
							size="sm"
							disabled={!genericName.trim() || evaluateCds.isPending}
							onClick={handleCheckCds}
						>
							{evaluateCds.isPending ? "Checking…" : "Check Drug Safety"}
						</Button>
					</div>

					{/* CDS Alerts */}
					{cdsResult && cdsResult.alerts.length > 0 && (
						<div className="space-y-2">
							{cdsResult.alerts.map((alert, i) => (
								<div
									key={i}
									className={cn(
										"rounded-md border p-3 text-sm",
										alert.severity === "hard_block" &&
											"border-destructive bg-destructive/10 text-destructive",
										alert.severity === "soft_block" &&
											"border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
										alert.severity === "warning" &&
											"border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
										alert.severity === "high_alert" &&
											"border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
									)}
								>
									<p className="font-medium">{alert.message}</p>
								</div>
							))}
						</div>
					)}

					{/* Soft-block override */}
					{hasSoftBlock && !hasHardBlock && (
						<div className="space-y-2">
							<Label htmlFor="overrideReason">Override Reason (required) *</Label>
							<Textarea
								id="overrideReason"
								value={overrideReason}
								onChange={(e) => setOverrideReason(e.target.value)}
								placeholder="Provide a clinical justification to override"
								rows={2}
							/>
						</div>
					)}

					{/* Dosing */}
					<div className="grid grid-cols-3 gap-4">
						<div className="space-y-2">
							<Label htmlFor="dose">Dose *</Label>
							<Input
								id="dose"
								value={dose}
								onChange={(e) => setDose(e.target.value)}
								placeholder="e.g., 500"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="doseUnit">Dose Unit *</Label>
							<Input
								id="doseUnit"
								value={doseUnit}
								onChange={(e) => setDoseUnit(e.target.value)}
								placeholder="e.g., mg"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="doseForm">Dose Form *</Label>
							<Input
								id="doseForm"
								value={doseForm}
								onChange={(e) => setDoseForm(e.target.value)}
								placeholder="e.g., tablet"
							/>
						</div>
					</div>

					{/* Route & Frequency */}
					<div className="grid grid-cols-3 gap-4">
						<div className="space-y-2">
							<Label htmlFor="route">Route *</Label>
							<Input
								id="route"
								value={route}
								onChange={(e) => setRoute(e.target.value)}
								placeholder="e.g., oral"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="frequency">Frequency *</Label>
							<Input
								id="frequency"
								value={frequency}
								onChange={(e) => setFrequency(e.target.value)}
								placeholder="e.g., q8h"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="durationDays">Duration (days)</Label>
							<Input
								id="durationDays"
								type="number"
								min={1}
								value={durationDays}
								onChange={(e) => setDurationDays(e.target.value)}
								placeholder="Optional"
							/>
						</div>
					</div>

					{/* Special Instructions */}
					<div className="space-y-2">
						<Label htmlFor="specialInstructions">Special Instructions</Label>
						<Textarea
							id="specialInstructions"
							value={specialInstructions}
							onChange={(e) => setSpecialInstructions(e.target.value)}
							rows={2}
							placeholder="Optional"
						/>
					</div>

					{/* PRN */}
					<div className="space-y-2">
						<label className="flex items-center gap-2 text-sm font-medium">
							<input
								type="checkbox"
								checked={isPrn}
								onChange={(e) => setIsPrn(e.target.checked)}
								className="size-4 rounded border"
							/>
							PRN (as needed)
						</label>
						{isPrn && (
							<div className="space-y-2 pl-6">
								<Label htmlFor="prnReason">PRN Reason</Label>
								<Input
									id="prnReason"
									value={prnReason}
									onChange={(e) => setPrnReason(e.target.value)}
									placeholder="e.g., for pain"
								/>
							</div>
						)}
					</div>

					{/* Controlled Substance */}
					<div className="space-y-2">
						<label className="flex items-center gap-2 text-sm font-medium">
							<input
								type="checkbox"
								checked={isControlledSubstance}
								onChange={(e) => setIsControlledSubstance(e.target.checked)}
								className="size-4 rounded border"
							/>
							Controlled Substance
						</label>
						{isControlledSubstance && (
							<div className="space-y-2 pl-6">
								<Label htmlFor="pdeaSchedule">PDEA Schedule</Label>
								<Input
									id="pdeaSchedule"
									value={pdeaSchedule}
									onChange={(e) => setPdeaSchedule(e.target.value)}
									placeholder="e.g., S2, S3"
								/>
							</div>
						)}
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => handleOpenChange(false)}>
						Cancel
					</Button>
					<Button
						disabled={!canSubmit || createMedOrder.isPending}
						onClick={handleSubmit}
					>
						{createMedOrder.isPending ? "Creating…" : "Create Order"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
