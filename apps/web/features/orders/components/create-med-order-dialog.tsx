"use client"

import { useState } from "react"
import { AlertCircle, Eye, ShieldAlert } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
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
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import {
	useCreateHighAlertVerificationMutation,
	useCreateMedOrderMutation,
	useEvaluateCdsMutation,
	type CdsEvaluateResponse,
} from "@/features/orders/api/orders.hooks"
import { DrugSearchCombobox } from "@/features/orders/components/drug-search-combobox"
import { useActiveAllergiesQuery } from "@/features/problems-allergies/api/problems-allergies.hooks"

import { AllergyAlertBanner, type AllergyAlertItem } from "./allergy-alert-banner"
import { CdsAlertBanner, type CdsAlertItem } from "./cds-alert-banner"
import {
	HighAlertVerificationDialog,
	type HighAlertVerificationDraft,
} from "./high-alert-verification-dialog"
import { TranchingPreviewModal, type TrancheRow } from "./tranching-preview-modal"

const TRANCHE_THRESHOLD_DAYS = 90

type CdsResult = CdsEvaluateResponse

interface CreateMedOrderDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	encounterId: string
	facilityId: string
	patientId: string
	orderingStaffId: string
}

interface PendingSubmitOptions {
	trancheNumber?: number
	trancheTotal?: number
	trancheDays?: number
}

export function CreateMedOrderDialog({
	open,
	onOpenChange,
	encounterId,
	facilityId,
	patientId,
	orderingStaffId,
}: CreateMedOrderDialogProps) {
	// ── Drug fields ──────────────────────────────────────────────────────────
	const [genericName, setGenericName] = useState("")
	const [formularyItemId, setFormularyItemId] = useState<string | undefined>(undefined)
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

	// ── CDS state ────────────────────────────────────────────────────────────
	const [cdsResult, setCdsResult] = useState<CdsResult | null>(null)
	const [overrideReasons, setOverrideReasons] = useState<Record<string, string>>({})
	const [overriddenAlerts, setOverriddenAlerts] = useState<Set<string>>(new Set())

	// ── Allergy state ────────────────────────────────────────────────────────
	const [allergyOverrideReasons, setAllergyOverrideReasons] = useState<Record<string, string>>({})
	const [allergyOverriddenAlerts, setAllergyOverriddenAlerts] = useState<Set<string>>(new Set())

	// ── Tranching modal ──────────────────────────────────────────────────────
	const [tranchingOpen, setTranchingOpen] = useState(false)
	const [highAlertVerified, setHighAlertVerified] = useState(false)
	const [highAlertVerifyOpen, setHighAlertVerifyOpen] = useState(false)
	const [pendingHighAlertOrderId, setPendingHighAlertOrderId] = useState<string | null>(null)
	const [pendingHighAlertVerification, setPendingHighAlertVerification] =
		useState<HighAlertVerificationDraft | null>(null)
	const [pendingSubmitOptions, setPendingSubmitOptions] = useState<PendingSubmitOptions | null>(
		null
	)
	const [highAlertVerificationError, setHighAlertVerificationError] = useState<string | null>(null)

	// ── Hooks ────────────────────────────────────────────────────────────────
	const { data: profile } = useMyProfile()
	const { data: activeAllergies } = useActiveAllergiesQuery(patientId)
	const evaluateCds = useEvaluateCdsMutation()
	const createHighAlertVerification = useCreateHighAlertVerificationMutation()
	const createMedOrder = useCreateMedOrderMutation()

	// ── PDEA validation ──────────────────────────────────────────────────────
	const staffProfile =
		profile?.staffProfiles?.find(p => p.id === orderingStaffId) ??
		profile?.staffProfiles?.find(p => p.facilityId === facilityId) ??
		profile?.staffProfiles?.[0]
	const pdeaLicense = staffProfile?.pdeaS2License ?? null
	const pdeaExpiry = staffProfile?.pdeaS2Expiry ?? null
	const pdeaExpired = pdeaExpiry != null ? new Date(pdeaExpiry) < new Date() : false
	const pdeaValid = pdeaLicense != null && !pdeaExpired

	function handleControlledSubstanceChange(checked: boolean) {
		if (checked && !pdeaValid) return
		setIsControlledSubstance(checked)
	}

	// ── CDS helpers ──────────────────────────────────────────────────────────
	const normalizedAlerts: CdsAlertItem[] =
		cdsResult?.alerts.map((a, i) => ({
			id: String(i),
			severity: a.type === "high_alert" ? "high_alert" : (a.severity as CdsAlertItem["severity"]),
			message: a.message,
		})) ?? []

	const hasHardBlock = normalizedAlerts.some(a => a.severity === "hard_block")
	const unoverriddenSoftBlocks = normalizedAlerts.filter(
		a => a.severity === "soft_block" && !overriddenAlerts.has(a.id)
	)
	const allSoftBlocksOverridden = unoverriddenSoftBlocks.length === 0

	// ── Allergy helpers ──────────────────────────────────────────────────────
	const normalizedAllergyAlerts: AllergyAlertItem[] = (activeAllergies?.allergies ?? [])
		.filter(a => a.allergenType === "medication")
		.map((a, i) => ({
			id: `allergy-${i}`,
			blockType: a.severity === "severe" ? "hard_block" : "soft_block",
			allergenName: a.allergenName,
			severity: a.severity,
			reactionType: a.reactionType,
		}))

	const hasAllergyHardBlock = normalizedAllergyAlerts.some(a => a.blockType === "hard_block")
	const unoverriddenAllergySoftBlocks = normalizedAllergyAlerts.filter(
		a => a.blockType === "soft_block" && !allergyOverriddenAlerts.has(a.id)
	)
	const allergyAllSoftBlocksOverridden = unoverriddenAllergySoftBlocks.length === 0

	// ── Tranche helpers ──────────────────────────────────────────────────────
	const durationNum = durationDays ? Number(durationDays) : 0
	const needsTranching = isControlledSubstance && durationNum > TRANCHE_THRESHOLD_DAYS

	// ── Submission readiness ─────────────────────────────────────────────────
	const requiresDoubleVerification = cdsResult?.requiresDoubleVerification ?? false
	const canProceedToSubmit =
		!!genericName.trim() &&
		!!dose.trim() &&
		!!doseUnit.trim() &&
		!!doseForm.trim() &&
		!!route.trim() &&
		!!frequency.trim() &&
		!hasHardBlock &&
		allSoftBlocksOverridden &&
		!hasAllergyHardBlock &&
		allergyAllSoftBlocksOverridden &&
		(!isControlledSubstance || pdeaValid)
	const canSubmit = canProceedToSubmit && (!requiresDoubleVerification || highAlertVerified)

	// ── Handlers ──────────────────────────────────────────────────────────────
	function resetDrugSelectionState() {
		setBrandName("")
		setCdsResult(null)
		setOverrideReasons({})
		setOverriddenAlerts(new Set())
		setHighAlertVerified(false)
		setHighAlertVerifyOpen(false)
		setPendingHighAlertOrderId(null)
		setPendingHighAlertVerification(null)
		setPendingSubmitOptions(null)
		setHighAlertVerificationError(null)
	}

	function resetForm() {
		setGenericName("")
		setFormularyItemId(undefined)
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
		setOverrideReasons({})
		setOverriddenAlerts(new Set())
		setAllergyOverrideReasons({})
		setAllergyOverriddenAlerts(new Set())
		setHighAlertVerified(false)
		setHighAlertVerifyOpen(false)
		setPendingHighAlertOrderId(null)
		setPendingHighAlertVerification(null)
		setPendingSubmitOptions(null)
		setHighAlertVerificationError(null)
	}

	function handleOpenChange(next: boolean) {
		if (!next) resetForm()
		onOpenChange(next)
	}

	function handleCheckCds() {
		if (!genericName.trim() || !orderingStaffId) return
		evaluateCds.mutate(
			{
				patientId,
				formularyItemId,
				genericName: genericName.trim(),
				isControlledSubstance,
				orderingStaffId,
				facilityId,
			},
			{
				onSuccess: data => {
					setCdsResult(data)
					setHighAlertVerified(false)
					setPendingHighAlertVerification(null)
					setPendingSubmitOptions(null)
					setHighAlertVerificationError(null)
				},
			}
		)
	}

	function handleOverride(alertId: string, reason: string) {
		setOverriddenAlerts(prev => new Set([...prev, alertId]))
		setOverrideReasons(prev => ({ ...prev, [alertId]: reason }))
	}

	function handleAllergyOverride(alertId: string, reason: string) {
		setAllergyOverriddenAlerts(prev => new Set([...prev, alertId]))
		setAllergyOverrideReasons(prev => ({ ...prev, [alertId]: reason }))
	}

	function handleHighAlertDialogOpenChange(next: boolean) {
		setHighAlertVerifyOpen(next)

		if (!next) {
			setPendingSubmitOptions(null)
		}
	}

	function doSubmit(trancheNumber?: number, trancheTotal?: number, trancheDays?: number) {
		const cdsOverrides =
			overriddenAlerts.size > 0
				? {
						overrides: [...overriddenAlerts].map(id => ({
							alertId: id,
							reason: overrideReasons[id] ?? "",
							overriddenAt: new Date().toISOString(),
						})),
					}
				: undefined

		createMedOrder.mutate(
			{
				facilityId,
				encounterId,
				formularyItemId,
				genericName: genericName.trim(),
				brandName: brandName.trim() || undefined,
				dose: dose.trim(),
				doseUnit: doseUnit.trim(),
				doseForm: doseForm.trim(),
				route: route.trim(),
				frequency: frequency.trim(),
				durationDays: trancheDays ?? (durationDays ? Number(durationDays) : undefined),
				specialInstructions: specialInstructions.trim() || undefined,
				isPrn,
				prnReason: isPrn ? prnReason.trim() || undefined : undefined,
				isControlledSubstance,
				pdeaSchedule: isControlledSubstance ? pdeaSchedule.trim() || undefined : undefined,
				pdeaTrancheNumber: trancheNumber,
				pdeaTrancheTotal: trancheTotal,
				cdsAlerts: cdsResult?.alerts ?? undefined,
				cdsOverrides,
			},
			{
				onSuccess: order => {
					if (requiresDoubleVerification && pendingHighAlertVerification) {
						createHighAlertVerification.mutate(
							{
								medicationOrderId: order.id,
								verifyingStaffId: pendingHighAlertVerification.verifyingStaffId,
								notes: pendingHighAlertVerification.notes,
							},
							{
								onSuccess: () => handleOpenChange(false),
								onError: err => {
									setPendingHighAlertOrderId(order.id)
									setHighAlertVerified(false)
									setHighAlertVerificationError(
										err instanceof Error
											? err.message
											: "Medication order was created, but high-alert verification still needs completion."
									)
									setHighAlertVerifyOpen(true)
								},
							}
						)
						return
					}

					handleOpenChange(false)
				},
			}
		)
	}

	function handleSubmit() {
		if (pendingHighAlertOrderId) {
			setHighAlertVerifyOpen(true)
			return
		}

		if (!canProceedToSubmit) return
		if (needsTranching) {
			setTranchingOpen(true)
			return
		}

		if (requiresDoubleVerification && !highAlertVerified) {
			setPendingSubmitOptions({})
			setHighAlertVerifyOpen(true)
			return
		}

		if (canSubmit) {
			doSubmit()
		}
	}

	function handleTranchingConfirm(tranches: TrancheRow[]) {
		setTranchingOpen(false)
		const options = {
			trancheNumber: 1,
			trancheTotal: tranches.length,
			trancheDays: 30,
		}

		if (requiresDoubleVerification && !highAlertVerified) {
			setPendingSubmitOptions(options)
			setHighAlertVerifyOpen(true)
			return
		}

		// Submit first tranche; backend handles remaining or user repeats
		doSubmit(options.trancheNumber, options.trancheTotal, options.trancheDays)
	}

	function handleHighAlertPrepared(draft: HighAlertVerificationDraft) {
		setPendingHighAlertVerification(draft)
		setHighAlertVerificationError(null)
	}

	function handleHighAlertVerified() {
		if (pendingHighAlertOrderId) {
			setHighAlertVerified(true)
			setHighAlertVerificationError(null)
			handleOpenChange(false)
			return
		}

		const submitOptions = pendingSubmitOptions ?? {}

		setHighAlertVerified(true)
		setHighAlertVerifyOpen(false)
		setPendingSubmitOptions(null)
		doSubmit(submitOptions.trancheNumber, submitOptions.trancheTotal, submitOptions.trancheDays)
	}

	return (
		<>
			<Dialog open={open} onOpenChange={handleOpenChange}>
				<DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
					<DialogHeader>
						<DialogTitle>New Medication Order</DialogTitle>
						<DialogDescription>
							Generic drug name is required first. Brand name is optional and appears after entering
							the generic name.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						{/* ── Generic Name (primary / required) ─────────── */}
						<div className="space-y-2">
							<Label htmlFor="genericName">
								Generic Name <span className="text-destructive">*</span>
							</Label>
							<DrugSearchCombobox
								id="genericName"
								facilityId={facilityId}
								value={genericName}
								onSelect={item => {
									resetDrugSelectionState()

									if (!item) {
										setFormularyItemId(undefined)
										return
									}

									setGenericName(item.genericName)
									setFormularyItemId(item.id)

									if (!doseForm.trim()) {
										setDoseForm(item.doseForm)
									}

									if (!route.trim()) {
										setRoute(item.route)
									}
								}}
								onRawInput={nextValue => setGenericName(nextValue)}
								placeholder="e.g., Amoxicillin (generic name required)"
								autoFocus
							/>
							<p className="text-muted-foreground text-xs">
								Per RA 6675 (Generics Act), orders must specify the generic name.
							</p>
						</div>

						{/* ── Brand Name (secondary — only after generic entered) */}
						{genericName.trim() && (
							<div className="space-y-2">
								<Label htmlFor="brandName">Brand Name (optional)</Label>
								<Input
									id="brandName"
									value={brandName}
									onChange={e => setBrandName(e.target.value)}
									placeholder="e.g., Amoxil — leave blank to dispense any generic"
								/>
							</div>
						)}

						{/* ── CDS Check ────────────────────────────────── */}
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="secondary"
								size="sm"
								disabled={!genericName.trim() || !orderingStaffId || evaluateCds.isPending}
								onClick={handleCheckCds}
							>
								{evaluateCds.isPending ? "Checking…" : "Check Drug Safety"}
							</Button>
							{cdsResult && (
								<span className="text-muted-foreground text-xs">
									{cdsResult.alerts.length === 0
										? "✓ No alerts"
										: `${cdsResult.alerts.length} alert(s) found`}
								</span>
							)}
						</div>

						{/* ── CDS Alert Banner ─────────────────────────── */}
						{normalizedAlerts.length > 0 && (
							<CdsAlertBanner
								alerts={normalizedAlerts}
								overrideReasons={overrideReasons}
								onOverrideReasonChange={(id, reason) =>
									setOverrideReasons(prev => ({ ...prev, [id]: reason }))
								}
								onOverride={handleOverride}
							/>
						)}

						{/* ── Allergy Alert Banner ──────────────────────── */}
						{requiresDoubleVerification && (
							<div className="flex items-center gap-2 rounded-md border border-purple-300 bg-purple-50 px-3 py-2 text-sm text-purple-800 dark:border-purple-700 dark:bg-purple-950 dark:text-purple-300">
								<ShieldAlert className="size-4 shrink-0 text-purple-600 dark:text-purple-300" />
								<span>
									Dual clinician verification required before submitting.
									{highAlertVerified ? " Co-signature captured." : ""}
								</span>
							</div>
						)}

						{highAlertVerificationError && (
							<div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
								<AlertCircle className="size-4 shrink-0" />
								<span>{highAlertVerificationError}</span>
							</div>
						)}

						{normalizedAllergyAlerts.length > 0 && (
							<AllergyAlertBanner
								alerts={normalizedAllergyAlerts}
								overrideReasons={allergyOverrideReasons}
								onOverrideReasonChange={(id, reason) =>
									setAllergyOverrideReasons(prev => ({ ...prev, [id]: reason }))
								}
								onOverride={handleAllergyOverride}
							/>
						)}

						{/* ── Dosing ───────────────────────────────────── */}
						<div className="grid grid-cols-3 gap-4">
							<div className="space-y-2">
								<Label htmlFor="dose">
									Dose <span className="text-destructive">*</span>
								</Label>
								<Input
									id="dose"
									value={dose}
									onChange={e => setDose(e.target.value)}
									placeholder="e.g., 500"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="doseUnit">
									Dose Unit <span className="text-destructive">*</span>
								</Label>
								<Input
									id="doseUnit"
									value={doseUnit}
									onChange={e => setDoseUnit(e.target.value)}
									placeholder="e.g., mg"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="doseForm">
									Dose Form <span className="text-destructive">*</span>
								</Label>
								<Input
									id="doseForm"
									value={doseForm}
									onChange={e => setDoseForm(e.target.value)}
									placeholder="e.g., tablet"
								/>
							</div>
						</div>

						{/* ── Route & Frequency & Duration ─────────────── */}
						<div className="grid grid-cols-3 gap-4">
							<div className="space-y-2">
								<Label htmlFor="route">
									Route <span className="text-destructive">*</span>
								</Label>
								<Input
									id="route"
									value={route}
									onChange={e => setRoute(e.target.value)}
									placeholder="e.g., oral"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="frequency">
									Frequency <span className="text-destructive">*</span>
								</Label>
								<Input
									id="frequency"
									value={frequency}
									onChange={e => setFrequency(e.target.value)}
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
									onChange={e => setDurationDays(e.target.value)}
									placeholder="Optional"
								/>
							</div>
						</div>

						{/* ── Tranche preview hint ─────────────────────── */}
						{needsTranching && (
							<div className="flex items-center gap-2 rounded-md border border-blue-300 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-200">
								<Eye className="size-4 shrink-0" />
								<span>
									This order spans more than 90 days. PDEA regulations require dispensing in 30-day
									tranches. Click <strong>Preview Tranches</strong> to review before submitting.
								</span>
							</div>
						)}

						{/* ── Special Instructions ─────────────────────── */}
						<div className="space-y-2">
							<Label htmlFor="specialInstructions">Special Instructions</Label>
							<Textarea
								id="specialInstructions"
								value={specialInstructions}
								onChange={e => setSpecialInstructions(e.target.value)}
								rows={2}
								placeholder="Optional"
							/>
						</div>

						{/* ── PRN ──────────────────────────────────────── */}
						<div className="space-y-2">
							<label className="flex items-center gap-2 text-sm font-medium">
								<input
									type="checkbox"
									checked={isPrn}
									onChange={e => setIsPrn(e.target.checked)}
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
										onChange={e => setPrnReason(e.target.value)}
										placeholder="e.g., for pain"
									/>
								</div>
							)}
						</div>

						{/* ── Controlled Substance + PDEA ──────────────── */}
						<div className="space-y-2">
							<label className="flex items-center gap-2 text-sm font-medium">
								<input
									type="checkbox"
									checked={isControlledSubstance}
									onChange={e => handleControlledSubstanceChange(e.target.checked)}
									disabled={!pdeaValid && !isControlledSubstance}
									className="size-4 rounded border"
								/>
								Controlled Substance (PDEA S-2 required)
							</label>

							{/* PDEA license status */}
							{!pdeaLicense && (
								<div className="border-destructive bg-destructive/10 text-destructive flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
									<AlertCircle className="size-4 shrink-0" />
									No PDEA S-2 license on file. Contact administration to add your license before
									ordering controlled substances.
								</div>
							)}
							{pdeaLicense != null && pdeaExpired && (
								<div className="border-destructive bg-destructive/10 text-destructive flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
									<AlertCircle className="size-4 shrink-0" />
									PDEA S-2 license expired ({pdeaExpiry}). Renew your license before ordering
									controlled substances.
								</div>
							)}
							{pdeaValid && (
								<div className="text-muted-foreground flex items-center gap-2 pl-1 text-xs">
									<Badge variant="outline" className="text-[10px]">
										PDEA S-2
									</Badge>
									License #{pdeaLicense}
									{pdeaExpiry && ` · Expires ${pdeaExpiry}`}
								</div>
							)}

							{isControlledSubstance && pdeaValid && (
								<div className="space-y-2 pl-6">
									<Label htmlFor="pdeaSchedule">PDEA Schedule</Label>
									<Input
										id="pdeaSchedule"
										value={pdeaSchedule}
										onChange={e => setPdeaSchedule(e.target.value)}
										placeholder="e.g., S2, S3"
									/>
								</div>
							)}
						</div>
					</div>

					<DialogFooter className="gap-2">
						<Button variant="outline" onClick={() => handleOpenChange(false)}>
							Cancel
						</Button>
						{needsTranching ? (
							<Button
								disabled={
									!canProceedToSubmit ||
									createMedOrder.isPending ||
									createHighAlertVerification.isPending
								}
								onClick={() => setTranchingOpen(true)}
							>
								<Eye className="mr-1 size-4" />
								Preview Tranches
							</Button>
						) : (
							<Button
								disabled={
									!canProceedToSubmit ||
									createMedOrder.isPending ||
									createHighAlertVerification.isPending
								}
								onClick={handleSubmit}
							>
								{createMedOrder.isPending ? "Creating…" : "Create Order"}
							</Button>
						)}
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Tranching preview modal */}
			{needsTranching && (
				<TranchingPreviewModal
					open={tranchingOpen}
					onOpenChange={setTranchingOpen}
					onConfirm={handleTranchingConfirm}
					drugName={genericName.trim()}
					dose={dose.trim()}
					doseUnit={doseUnit.trim()}
					frequency={frequency.trim()}
					durationDays={durationNum}
				/>
			)}

			<HighAlertVerificationDialog
				open={highAlertVerifyOpen}
				onOpenChange={handleHighAlertDialogOpenChange}
				medicationOrderId={pendingHighAlertOrderId ?? ""}
				requestingStaffId={orderingStaffId}
				drugName={genericName.trim()}
				onPrepareVerification={handleHighAlertPrepared}
				onVerified={handleHighAlertVerified}
			/>
		</>
	)
}
