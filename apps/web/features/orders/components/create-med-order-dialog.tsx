"use client"

import { useMemo, useState } from "react"
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Textarea } from "@/core/components/ui/textarea"
import { cn } from "@/core/lib/utils"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import {
	useCheckPdeaLicenseQuery,
	useCreateHighAlertVerificationMutation,
	useCreateMedOrderMutation,
	useCreateTranchedOrdersMutation,
	useEvaluateCdsMutation,
	type CdsEvaluateResponse,
} from "@/features/orders/api/orders.hooks"
import { DrugSearchCombobox } from "@/features/orders/components/drug-search-combobox"

import { AllergyAlertBanner, type AllergyAlertItem } from "./allergy-alert-banner"
import { CdsAlertBanner, type CdsAlertItem } from "./cds-alert-banner"
import {
	HighAlertVerificationDialog,
	type HighAlertVerificationDraft,
} from "./high-alert-verification-dialog"
import { S2ValidationModal } from "./s2-validation-modal"
import { TranchingPreviewModal, type TrancheRow } from "./tranching-preview-modal"

const TRANCHE_THRESHOLD_DAYS = 30
const MAX_CONTROLLED_DAYS = 90

const PDEA_SCHEDULE_OPTIONS = [
	{ value: "S-2", label: "S-2 / List A" },
	{ value: "S-3", label: "S-3" },
	{ value: "S-4", label: "S-4" },
] as const

type CdsResult = CdsEvaluateResponse

const FREQUENCY_OPTIONS = [
	{ value: "stat", label: "STAT (immediately)" },
	{ value: "once", label: "Once" },
	{ value: "q4h", label: "Every 4 hours (q4h)" },
	{ value: "q6h", label: "Every 6 hours (q6h)" },
	{ value: "q8h", label: "Every 8 hours (q8h)" },
	{ value: "q12h", label: "Every 12 hours (q12h)" },
	{ value: "daily", label: "Daily" },
	{ value: "bid", label: "Twice daily (BID)" },
	{ value: "tid", label: "Three times daily (TID)" },
	{ value: "qid", label: "Four times daily (QID)" },
	{ value: "prn", label: "PRN (as needed)" },
] as const

type FrequencyValue = (typeof FREQUENCY_OPTIONS)[number]["value"]

const REPEATING_FREQUENCIES: FrequencyValue[] = ["q4h", "q6h", "q8h", "q12h", "daily", "bid", "tid", "qid"]

function getNextHour(): string {
	const d = new Date()
	d.setMinutes(0, 0, 0)
	d.setHours(d.getHours() + 1)
	return d.toISOString().slice(0, 16)
}

interface CreateMedOrderDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	encounterId: string
	facilityId: string
	patientId: string
	orderingStaffId: string
	encounterType?: "inpatient" | "outpatient" | "emergency" | "telemedicine"
}

interface PendingSubmitOptions {
	trancheNumber?: number
	trancheTotal?: number
	trancheDays?: number
	useTranchedOrders?: boolean
	trancheStartDate?: string
}

function formatDisplayDate(dateStr: string | null | undefined) {
	if (!dateStr) return "--"
	return new Date(dateStr).toLocaleDateString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
	})
}

function isPastDate(dateStr: string | null | undefined) {
	if (!dateStr) return false
	const date = new Date(dateStr)
	date.setHours(0, 0, 0, 0)
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	return date < today
}

export function CreateMedOrderDialog({
	open,
	onOpenChange,
	encounterId,
	facilityId,
	patientId,
	orderingStaffId,
	encounterType,
}: CreateMedOrderDialogProps) {
	// ── Drug fields ──────────────────────────────────────────────────────────
	const [genericName, setGenericName] = useState("")
	const [formularyItemId, setFormularyItemId] = useState<string | undefined>(undefined)
	const [brandName, setBrandName] = useState("")
	const [dose, setDose] = useState("")
	const [doseUnit, setDoseUnit] = useState("")
	const [doseForm, setDoseForm] = useState("")
	const [route, setRoute] = useState("")
	const [frequency, setFrequency] = useState<FrequencyValue | "">("")
	const [firstDoseAt, setFirstDoseAt] = useState(getNextHour())
	const [durationDays, setDurationDays] = useState("")
	const [specialInstructions, setSpecialInstructions] = useState("")
	const [isPrn, setIsPrn] = useState(false)
	const [prnReason, setPrnReason] = useState("")
	const [isControlledSubstance, setIsControlledSubstance] = useState(false)
	const [pdeaSchedule, setPdeaSchedule] = useState("")

	// ── CDS state ────────────────────────────────────────────────────────────
	const [cdsResult, setCdsResult] = useState<CdsResult | null>(null)
	const [lastCdsCheckSignature, setLastCdsCheckSignature] = useState<string | null>(null)
	const [overrideReasons, setOverrideReasons] = useState<Record<string, string>>({})
	const [overriddenAlerts, setOverriddenAlerts] = useState<Set<string>>(new Set())

	// ── Allergy state ────────────────────────────────────────────────────────
	const [allergyOverrideReasons, setAllergyOverrideReasons] = useState<Record<string, string>>({})
	const [allergyOverriddenAlerts, setAllergyOverriddenAlerts] = useState<Set<string>>(new Set())

	// ── Submit error ─────────────────────────────────────────────────────────
	const [submitError, setSubmitError] = useState<string | null>(null)

	// ── S-2 validation gate ──────────────────────────────────────────────────
	const [s2ValidationOpen, setS2ValidationOpen] = useState(false)

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
	const evaluateCds = useEvaluateCdsMutation()
	const createHighAlertVerification = useCreateHighAlertVerificationMutation()
	const createMedOrder = useCreateMedOrderMutation()
	const createTranchedOrders = useCreateTranchedOrdersMutation()

	// ── PDEA validation ──────────────────────────────────────────────────────
	const staffProfile =
		profile?.staffProfiles?.find(p => p.id === orderingStaffId && p.facilityId === facilityId) ??
		profile?.staffProfiles?.find(p => p.facilityId === facilityId)
	const pdeaLicense = staffProfile?.pdeaS2License ?? null
	const pdeaExpiry = staffProfile?.pdeaS2Expiry ?? null
	const pdeaExpired = isPastDate(pdeaExpiry)
	const pdeaValid = pdeaLicense !== null && pdeaExpiry !== null && !pdeaExpired
	const pdeaLicenseStatus = useCheckPdeaLicenseQuery({
		staffId: orderingStaffId,
		facilityId,
		enabled: isControlledSubstance && !!orderingStaffId && !!facilityId,
	})
	const livePdeaStatus = pdeaLicenseStatus.data
	const hasLivePdeaValidation = !isControlledSubstance || pdeaLicenseStatus.isSuccess
	const livePdeaCanPrescribe = !isControlledSubstance
		? true
		: Boolean(livePdeaStatus?.canPrescribeControlled)

	function handleControlledSubstanceChange(checked: boolean) {
		if (!checked) {
			setIsControlledSubstance(false)
			return
		}
		// Open the S-2 validation gate; actual state set only on modal "Proceed"
		setS2ValidationOpen(true)
	}

	function handleS2Proceed() {
		setIsControlledSubstance(true)
	}

	const cdsCheckSignature = useMemo(
		() =>
			JSON.stringify({
				patientId,
				facilityId,
				orderingStaffId,
				formularyItemId: formularyItemId ?? null,
				genericName: genericName.trim().toLowerCase(),
				isControlledSubstance,
			}),
		[
			patientId,
			facilityId,
			orderingStaffId,
			formularyItemId,
			genericName,
			isControlledSubstance,
		]
	)
	const hasFreshCdsCheck = cdsResult !== null && lastCdsCheckSignature === cdsCheckSignature
	const freshCdsAlerts = hasFreshCdsCheck ? (cdsResult?.alerts ?? []) : []

	// ── CDS helpers ──────────────────────────────────────────────────────────
	const normalizedAlerts: CdsAlertItem[] = freshCdsAlerts
		.filter(a => a.type !== "allergy_hard_block" && a.type !== "allergy_soft_block")
		.map((a, i) => ({
			id: `cds-${i}`,
			severity: a.type === "high_alert" ? "high_alert" : (a.severity as CdsAlertItem["severity"]),
			message: a.message,
		}))

	const hasHardBlock = normalizedAlerts.some(a => a.severity === "hard_block")
	const unoverriddenSoftBlocks = normalizedAlerts.filter(
		a => a.severity === "soft_block" && !overriddenAlerts.has(a.id)
	)
	const allSoftBlocksOverridden = unoverriddenSoftBlocks.length === 0

	// ── Allergy helpers ──────────────────────────────────────────────────────
	const normalizedAllergyAlerts: AllergyAlertItem[] = freshCdsAlerts
		.filter(a => a.type === "allergy_hard_block" || a.type === "allergy_soft_block")
		.map((a, i) => {
			const details = (a.details ?? {}) as {
				allergenName?: string
				severity?: string
				reactionType?: string | null
				matchType?: "exact" | "class"
				allergyClass?: string | null
			}

			return {
				id: `allergy-${i}`,
				blockType: a.severity === "hard_block" ? "hard_block" : "soft_block",
				allergenName: details.allergenName ?? genericName.trim(),
				severity: details.severity ?? "unknown",
				reactionType: details.reactionType ?? null,
				matchType: details.matchType,
				allergyClass: details.allergyClass ?? null,
			}
		})

	const hasAllergyHardBlock = normalizedAllergyAlerts.some(a => a.blockType === "hard_block")
	const unoverriddenAllergySoftBlocks = normalizedAllergyAlerts.filter(
		a => a.blockType === "soft_block" && !allergyOverriddenAlerts.has(a.id)
	)
	const allergyAllSoftBlocksOverridden = unoverriddenAllergySoftBlocks.length === 0

	// ── Tranche helpers ──────────────────────────────────────────────────────
	const durationNum = durationDays ? Number(durationDays) : 0
	const controlledDurationMissing = isControlledSubstance && !durationDays
	const controlledDurationTooLong = isControlledSubstance && durationNum > MAX_CONTROLLED_DAYS
	const needsTranching =
		isControlledSubstance &&
		durationNum > TRANCHE_THRESHOLD_DAYS &&
		durationNum <= MAX_CONTROLLED_DAYS

	// ── Schedule anchor helpers ──────────────────────────────────────────────
	const isRepeatingFrequency = frequency !== "" && REPEATING_FREQUENCIES.includes(frequency as FrequencyValue)
	const needsInpatientFields =
		encounterType === "inpatient" || encounterType === "emergency"
	const durationRequired = isRepeatingFrequency || isControlledSubstance
	const firstDoseRequired = needsInpatientFields

	// ── Submission readiness ─────────────────────────────────────────────────
	const requiresDoubleVerification = hasFreshCdsCheck
		? (cdsResult?.requiresDoubleVerification ?? false)
		: false
	const canProceedToSubmit =
		!!genericName.trim() &&
		!!dose.trim() &&
		!!doseUnit.trim() &&
		!!doseForm.trim() &&
		!!route.trim() &&
		!!frequency &&
		hasFreshCdsCheck &&
		(!durationRequired || !!durationDays) &&
		(!firstDoseRequired || !!firstDoseAt) &&
		!controlledDurationMissing &&
		!controlledDurationTooLong &&
		(!isControlledSubstance || durationNum > 0) &&
		(!isControlledSubstance || !!pdeaSchedule.trim()) &&
		!hasHardBlock &&
		allSoftBlocksOverridden &&
		!hasAllergyHardBlock &&
		allergyAllSoftBlocksOverridden &&
		hasLivePdeaValidation &&
		livePdeaCanPrescribe
	const canSubmit = canProceedToSubmit && (!requiresDoubleVerification || highAlertVerified)

	// ── Handlers ──────────────────────────────────────────────────────────────
	function resetDrugSelectionState() {
		setBrandName("")
		setCdsResult(null)
		setLastCdsCheckSignature(null)
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
		setSubmitError(null)
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
		setFirstDoseAt(getNextHour())
		setDurationDays("")
		setSpecialInstructions("")
		setIsPrn(false)
		setPrnReason("")
		setIsControlledSubstance(false)
		setPdeaSchedule("")
		setCdsResult(null)
		setLastCdsCheckSignature(null)
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
		setSubmitError(null)
	}

	function handleOpenChange(next: boolean) {
		if (!next) resetForm()
		onOpenChange(next)
	}

	function handleCheckCds() {
		if (!genericName.trim() || !orderingStaffId) return
		const nextSignature = cdsCheckSignature
		setCdsResult(null)
		setLastCdsCheckSignature(null)
		setOverrideReasons({})
		setOverriddenAlerts(new Set())
		setAllergyOverrideReasons({})
		setAllergyOverriddenAlerts(new Set())
		setHighAlertVerified(false)
		setPendingHighAlertOrderId(null)
		setPendingHighAlertVerification(null)
		setPendingSubmitOptions(null)
		setHighAlertVerificationError(null)
		setSubmitError(null)
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
					setLastCdsCheckSignature(nextSignature)
					setHighAlertVerified(false)
					setPendingHighAlertVerification(null)
					setPendingSubmitOptions(null)
					setHighAlertVerificationError(null)
				},
				onError: err => {
					setSubmitError(
						err instanceof Error ? err.message : "Failed to run drug safety check"
					)
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

	function handleOrderCreated(orderId: string) {
		if (requiresDoubleVerification && pendingHighAlertVerification) {
			createHighAlertVerification.mutate(
				{
					medicationOrderId: orderId,
					verifyingStaffId: pendingHighAlertVerification.verifyingStaffId,
					coSignerPassword: pendingHighAlertVerification.coSignerPassword,
					notes: pendingHighAlertVerification.notes,
				},
				{
					onSuccess: () => handleOpenChange(false),
					onError: err => {
						setPendingHighAlertOrderId(orderId)
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
	}

	function buildCdsOverrides() {
		const overrides = [
			...[...overriddenAlerts].map(id => ({
				alertId: id,
				reason: overrideReasons[id] ?? "",
				overriddenAt: new Date().toISOString(),
			})),
			...[...allergyOverriddenAlerts].map(id => ({
				alertId: id,
				reason: allergyOverrideReasons[id] ?? "",
				overriddenAt: new Date().toISOString(),
			})),
		].filter(entry => entry.reason.trim().length > 0)

		return overrides.length > 0 ? { overrides } : undefined
	}

	function doSubmit(trancheNumber?: number, trancheTotal?: number, trancheDays?: number) {
		const cdsOverrides = buildCdsOverrides()

		setSubmitError(null)
		createMedOrder.mutate(
			{
				facilityId,
				encounterId,
				patientId,
				formularyItemId,
				genericName: genericName.trim(),
				brandName: brandName.trim() || undefined,
				dose: dose.trim(),
				doseUnit: doseUnit.trim(),
				doseForm: doseForm.trim(),
				route: route.trim(),
				frequency: frequency as FrequencyValue,
				firstDoseAt: firstDoseAt ? new Date(firstDoseAt).toISOString() : undefined,
				durationDays: trancheDays ?? (durationDays ? Number(durationDays) : undefined),
				specialInstructions: specialInstructions.trim() || undefined,
				isPrn,
				prnReason: isPrn ? prnReason.trim() || undefined : undefined,
				isControlledSubstance,
				pdeaSchedule: isControlledSubstance ? pdeaSchedule.trim() || undefined : undefined,
				pdeaTrancheNumber: trancheNumber,
				pdeaTrancheTotal: trancheTotal,
				cdsAlerts: freshCdsAlerts,
				cdsOverrides,
			},
			{
				onSuccess: order => handleOrderCreated(order.id),
				onError: err => setSubmitError(err instanceof Error ? err.message : "Failed to create order"),
			}
		)
	}

	function submitTranchedOrder(startDate?: string) {
		const cdsOverrides = buildCdsOverrides()

		createTranchedOrders.mutate(
			{
				facilityId,
				encounterId,
				patientId,
				formularyItemId,
				genericName: genericName.trim(),
				brandName: brandName.trim() || undefined,
				dose: dose.trim(),
				doseUnit: doseUnit.trim(),
				doseForm: doseForm.trim(),
				route: route.trim(),
				frequency: frequency as FrequencyValue,
				firstDoseAt: firstDoseAt ? new Date(firstDoseAt).toISOString() : undefined,
				durationDays: durationNum,
				specialInstructions: specialInstructions.trim() || undefined,
				isPrn,
				prnReason: isPrn ? prnReason.trim() || undefined : undefined,
				pdeaSchedule: pdeaSchedule.trim(),
				startDate,
				cdsAlerts: freshCdsAlerts,
				cdsOverrides,
			},
			{
				onSuccess: result => handleOrderCreated(result.parentOrder.id),
				onError: err => setSubmitError(err instanceof Error ? err.message : "Failed to create order"),
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
			useTranchedOrders: true,
			trancheStartDate: tranches[0]?.startDate.toISOString().slice(0, 10),
		}

		if (requiresDoubleVerification && !highAlertVerified) {
			setPendingSubmitOptions(options)
			setHighAlertVerifyOpen(true)
			return
		}

		submitTranchedOrder(options.trancheStartDate)
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

		if (submitOptions.useTranchedOrders) {
			submitTranchedOrder(submitOptions.trancheStartDate)
			return
		}

		doSubmit(submitOptions.trancheNumber, submitOptions.trancheTotal, submitOptions.trancheDays)
	}

	return (
		<>
			<Dialog open={open} onOpenChange={handleOpenChange}>
				<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl lg:max-w-4xl">
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
							<div className="flex items-center gap-2">
								<Label htmlFor="genericName">
									Generic Name <span className="text-destructive">*</span>
								</Label>
								<Badge variant="outline" className="border-emerald-400 text-[10px] text-emerald-700 dark:text-emerald-400">
									RA 6675 — Required
								</Badge>
							</div>
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
								Per RA 6675 (Generics Act), orders must specify the generic name. Brand name is optional and subordinate.
							</p>
						</div>

						{/* ── Brand Name (secondary — only after generic entered) */}
						{genericName.trim() && (
							<div className="border-muted-foreground/25 space-y-1 border-l-2 pl-3">
								<Label
									htmlFor="brandName"
									className="text-muted-foreground text-xs font-normal"
								>
									Brand Name (optional)
								</Label>
								<Input
									id="brandName"
									value={brandName}
									onChange={e => setBrandName(e.target.value)}
									placeholder="e.g., Amoxil — leave blank to dispense any generic equivalent"
									className="h-8 text-sm"
									aria-describedby="brand-name-hint"
								/>
								<p id="brand-name-hint" className="text-muted-foreground text-xs">
									Generic name is required by the Generics Act of 1988. Brand name is optional.
								</p>
							</div>
						)}

						{/* ── CDS Check ────────────────────────────────── */}
						<div className="bg-muted/30 space-y-2 rounded-lg border p-3">
							<Button
								type="button"
								className="w-full justify-center font-semibold"
								size="lg"
								disabled={!genericName.trim() || !orderingStaffId || evaluateCds.isPending}
								onClick={handleCheckCds}
							>
								<ShieldAlert className="size-4" />
								{evaluateCds.isPending
									? "Checking…"
									: hasFreshCdsCheck
										? "Re-run Drug Safety Check"
										: "Run Drug Safety Check"}
							</Button>
							{cdsResult ? (
								<p className="text-muted-foreground text-xs">
									{hasFreshCdsCheck
										? cdsResult.alerts.length === 0
											? "✓ Safety check complete - no alerts"
											: `${cdsResult.alerts.length} alert(s) found`
										: "Safety check out of date - re-run before creating the order"}
								</p>
							) : (
								<p className="text-muted-foreground text-xs">
									Run the safety check before creating the order.
								</p>
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

						{submitError && (
							<div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
								<AlertCircle className="size-4 shrink-0" />
								<span>{submitError}</span>
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
								<Select value={frequency} onValueChange={v => setFrequency(v as FrequencyValue)}>
									<SelectTrigger id="frequency" className="w-full">
										<SelectValue>
											{frequency
												? (FREQUENCY_OPTIONS.find(o => o.value === frequency)?.label ?? frequency)
												: "Select frequency…"}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										{FREQUENCY_OPTIONS.map(opt => (
											<SelectItem key={opt.value} value={opt.value}>
												{opt.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="durationDays">
									Duration (days){" "}
									{durationRequired && <span className="text-destructive">*</span>}
								</Label>
								<Input
									id="durationDays"
									type="number"
									min={1}
									value={durationDays}
									onChange={e => setDurationDays(e.target.value)}
									placeholder={durationRequired ? "Required" : "Optional"}
								/>
							</div>
						</div>

						{/* ── First Dose At (inpatient/emergency only) ─── */}
						{needsInpatientFields && (
							<div className="space-y-2">
								<Label htmlFor="firstDoseAt">
									First Dose At <span className="text-destructive">*</span>
								</Label>
								<Input
									id="firstDoseAt"
									type="datetime-local"
									value={firstDoseAt}
									onChange={e => setFirstDoseAt(e.target.value)}
								/>
								<p className="text-muted-foreground text-xs">
									Required for {encounterType} orders. MAR rows generated on pharmacy approval.
								</p>
							</div>
						)}

						{/* ── Tranche preview hint ─────────────────────── */}
						{needsTranching && (
							<div className="flex items-center gap-2 rounded-md border border-blue-300 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-200">
								<Eye className="size-4 shrink-0" />
								<span>
									This order spans more than 30 days. PDEA regulations require dispensing in 30-day
									tranches. Click <strong>Preview Tranches</strong> to review before submitting.
								</span>
							</div>
						)}
						{controlledDurationTooLong && (
							<div className="border-destructive bg-destructive/10 text-destructive flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
								<AlertCircle className="size-4 shrink-0" />
								PDEA controlled substance orders cannot exceed {MAX_CONTROLLED_DAYS} days.
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
							{pdeaLicense !== null && pdeaExpired && (
								<div className="border-destructive bg-destructive/10 text-destructive flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
									<AlertCircle className="size-4 shrink-0" />
									PDEA S-2 license expired ({pdeaExpiry}). Renew your license before ordering
									controlled substances.
								</div>
							)}
							{pdeaLicense !== null && !pdeaExpiry && (
								<div className="border-destructive bg-destructive/10 text-destructive flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
									<AlertCircle className="size-4 shrink-0" />
									PDEA S-2 license expiry is not recorded. Contact administration before
									ordering controlled substances.
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

							{isControlledSubstance && (
								<div
									className={cn(
										"space-y-1 rounded-md border px-3 py-2 text-sm",
										livePdeaStatus?.canPrescribeControlled
											? "border-emerald-300 bg-emerald-50 text-emerald-900"
											: "border-destructive bg-destructive/10 text-destructive"
									)}
								>
									<div className="flex items-center gap-2">
										<Badge
											variant={
												pdeaLicenseStatus.isLoading
													? "secondary"
													: livePdeaStatus?.canPrescribeControlled
														? "default"
														: "destructive"
											}
											className="text-[10px]"
										>
											{pdeaLicenseStatus.isLoading
												? "Validating"
												: livePdeaStatus?.canPrescribeControlled
													? "Valid"
													: "Invalid"}
										</Badge>
										<span className="font-medium">
											S-2 License #{livePdeaStatus?.licenseNumber ?? pdeaLicense ?? "--"}
										</span>
									</div>
									<div className="text-xs">
										Expiry: {formatDisplayDate(livePdeaStatus?.expiryDate ?? pdeaExpiry)}
									</div>
									<div className="text-xs">
										Days Until Expiry:{" "}
										{(livePdeaStatus?.daysUntilExpiry ?? null) !== null
											? livePdeaStatus?.daysUntilExpiry
											: "--"}
									</div>
									{livePdeaStatus?.errorMessage && (
										<div className="text-xs">{livePdeaStatus.errorMessage}</div>
									)}
									{pdeaLicenseStatus.isError && (
										<div className="text-xs">
											{pdeaLicenseStatus.error instanceof Error
												? pdeaLicenseStatus.error.message
												: "Unable to validate PDEA S-2 license right now."}
										</div>
									)}
								</div>
							)}

							{isControlledSubstance && (
								<div className="space-y-2 pl-6">
									<Label htmlFor="pdeaSchedule">PDEA Schedule</Label>
									<Select value={pdeaSchedule} onValueChange={value => setPdeaSchedule(value ?? "")}>
										<SelectTrigger id="pdeaSchedule" className="w-full">
											<SelectValue>
												{PDEA_SCHEDULE_OPTIONS.find(o => o.value === pdeaSchedule)?.label ??
													"Select PDEA schedule..."}
											</SelectValue>
										</SelectTrigger>
										<SelectContent>
											{PDEA_SCHEDULE_OPTIONS.map(option => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
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
									createTranchedOrders.isPending ||
									createHighAlertVerification.isPending
								}
								onClick={() => setTranchingOpen(true)}
							>
								{createTranchedOrders.isPending ? (
									"Creating…"
								) : (
									<>
										<Eye className="mr-1 size-4" />
										Preview Tranches
									</>
								)}
							</Button>
						) : (
							<Button
								disabled={
									!canProceedToSubmit ||
									createMedOrder.isPending ||
									createTranchedOrders.isPending ||
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

			{/* S-2 validation gate modal */}
			<S2ValidationModal
				open={s2ValidationOpen}
				onOpenChange={setS2ValidationOpen}
				staffId={orderingStaffId}
				facilityId={facilityId}
				onProceed={handleS2Proceed}
			/>

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
				facilityId={facilityId}
				drugName={genericName.trim()}
				onPrepareVerification={handleHighAlertPrepared}
				onVerified={handleHighAlertVerified}
			/>
		</>
	)
}
