"use client"

import { useState } from "react"
import { toast } from "sonner"

import {
	AlertTriangle,
	CheckCircle2,
	ClipboardList,
	FileText,
	Lock,
	Pill,
	Printer,
	ShieldCheck,
	X,
} from "lucide-react"

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useEncounterDetailQuery } from "@/features/encounters/api/encounters.hooks"
import {
	useCreatePrescriptionMutation,
	useMedOrderListQuery,
	usePrescriptionListQuery,
	useSignPrescriptionMutation,
} from "@/features/orders/api/orders.hooks"

import { PrescriptionPrintDialog } from "./prescription-print-dialog"

// ============================================================================
// Helpers
// ============================================================================

function formatDate(value: string | Date | null | undefined) {
	if (!value) return "--"
	return new Date(value).toLocaleDateString("en-PH", {
		year: "numeric",
		month: "long",
		day: "numeric",
	})
}

function formatDateTime(value: string | Date | null | undefined) {
	if (!value) return "--"
	return new Date(value).toLocaleString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

function normalizeDate(d: string) {
	const date = new Date(d)
	date.setHours(0, 0, 0, 0)
	return date
}

function isPastDate(d: string | null | undefined) {
	if (!d) return true
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	return normalizeDate(d) < today
}

function mutationErrorMessage(error: unknown, fallback: string) {
	return error instanceof Error ? error.message : fallback
}

function isWithinDays(d: string | null | undefined, days: number) {
	if (!d || isPastDate(d)) return false
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	return normalizeDate(d).getTime() - today.getTime() <= days * 86400000
}

interface PrescriptionContent {
	genericName?: string
	brandName?: string | null
	dose?: string
	doseUnit?: string
	doseForm?: string
	route?: string
	frequency?: string
	durationDays?: number | null
	specialInstructions?: string | null
	isPrn?: boolean
	prnReason?: string | null
	isControlledSubstance?: boolean
	pdeaSchedule?: string | null
	pdeaTrancheNumber?: number | null
	pdeaTrancheTotal?: number | null
	pdeaDispenseDate?: string | null
	pdeaDispensingInstructions?: string | null
}

function parseContent(raw: unknown): PrescriptionContent {
	if (!raw || typeof raw !== "object") return {}
	return raw as PrescriptionContent
}

function isReadyForPrescriptionTranche(order: {
	parentOrderId?: string | null
	pdeaTrancheNumber?: number | null
	pdeaTrancheTotal?: number | null
}) {
	const hasParentOrder = order.parentOrderId !== null && order.parentOrderId !== undefined
	const hasTrancheNumber = order.pdeaTrancheNumber !== null && order.pdeaTrancheNumber !== undefined
	const isMultiTrancheParent =
		!hasParentOrder &&
		!hasTrancheNumber &&
		(order.pdeaTrancheTotal ?? 0) > 1
	if (isMultiTrancheParent) return false

	if (!hasTrancheNumber) return true
	return order.pdeaTrancheNumber === 1
}

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

// ============================================================================
// License Status Badge
// ============================================================================

function LicenseBadge({
	label,
	number,
	expiry,
}: {
	label: string
	number: string | null | undefined
	expiry: string | null | undefined
}) {
	const expired = isPastDate(expiry)
	const expiringSoon = isWithinDays(expiry, 30)

	if (!number)
		return (
			<Badge variant="outline" className="text-muted-foreground gap-1">
				{label}: Not set
			</Badge>
		)
	if (!expiry)
		return (
			<Badge variant="destructive" className="gap-1">
				<AlertTriangle className="size-3" />
				{label} {number} - expiry not recorded
			</Badge>
		)
	if (expired)
		return (
			<Badge variant="destructive" className="gap-1">
				<AlertTriangle className="size-3" />
				{label} {number} — EXPIRED
			</Badge>
		)
	if (expiringSoon)
		return (
			<Badge
				variant="outline"
				className="gap-1 border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
			>
				<AlertTriangle className="size-3" />
				{label} {number} — expires {formatDate(expiry)}
			</Badge>
		)
	return (
		<Badge variant="outline" className="gap-1 border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-900/20 dark:text-green-800">
			<ShieldCheck className="size-3" />
			{label} {number}
		</Badge>
	)
}

// ============================================================================
// FDA-Compliant Prescription Preview Card
// ============================================================================

function PrescriptionCard({
	rx,
	onSign,
	signPending,
}: {
	rx: {
		id: string
		status: string
		prcLicenseNumber: string
		ptrNumber: string
		pdeaS2License: string | null
		prescriberStaffName: string | null
		signedAt: string | null
		prescriptionContent: unknown
		medicationOrderId: string
	}
	onSign?: (id: string) => void
	signPending?: boolean
}) {
	const content = parseContent(rx.prescriptionContent)
	const isSigned = rx.status === "signed" || rx.status === "issued"
	const isControlled = Boolean(content.isControlledSubstance)
	const hasTranche =
		content.pdeaTrancheNumber !== null &&
		content.pdeaTrancheNumber !== undefined &&
		content.pdeaTrancheTotal !== null &&
		content.pdeaTrancheTotal !== undefined &&
		content.pdeaTrancheTotal > 1

	return (
		<div
			className={`rounded-lg border-2 p-4 transition-colors ${
				isSigned ? "border-green-200 bg-green-50/30 dark:border-green-800/50 dark:bg-green-900/10" : "border-border"
			}`}
		>
			{/* Drug Name Header */}
			<div className="mb-3 flex items-start justify-between gap-2">
				<div className="flex items-center gap-2">
					<Pill className="text-primary mt-0.5 size-4 shrink-0" />
					<div>
						<p className="text-base font-semibold leading-tight">
							{content.genericName ?? "--"}
						</p>
						{content.brandName && (
							<p className="text-muted-foreground text-sm">({content.brandName})</p>
						)}
					</div>
				</div>
				<div className="flex shrink-0 flex-col items-end gap-1">
					{isSigned ? (
						<Badge className="gap-1 bg-green-600 text-white">
							<Lock className="size-3" />
							Signed
						</Badge>
					) : (
						<Badge variant="secondary">Draft</Badge>
					)}
					{isControlled && (
						<Badge variant="outline" className="text-xs">
							No Refill
						</Badge>
					)}
					{content.pdeaSchedule && (
						<Badge variant="outline" className="text-xs">
							Schedule {content.pdeaSchedule}
						</Badge>
					)}
					{hasTranche && (
						<Badge variant="outline" className="text-xs">
							Tranche {content.pdeaTrancheNumber} of {content.pdeaTrancheTotal}
						</Badge>
					)}
				</div>
			</div>

			<Separator className="mb-3" />

			{/* Medication Details — FDA format grid */}
			<div className="mb-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
				<div>
					<p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
						Dose / Form
					</p>
					<p>
						{content.dose} {content.doseUnit} — {content.doseForm ?? "--"}
					</p>
				</div>
				<div>
					<p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
						Route
					</p>
					<p>{content.route ?? "--"}</p>
				</div>
				<div>
					<p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
						Frequency
					</p>
					<p>
						{content.frequency ?? "--"}
						{content.isPrn && (
							<span className="text-muted-foreground ml-1 text-xs">
								(PRN{content.prnReason ? `: ${content.prnReason}` : ""})
							</span>
						)}
					</p>
				</div>
				{content.durationDays && (
					<div>
						<p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
							Duration
						</p>
						<p>{content.durationDays} day(s)</p>
					</div>
				)}
				{content.specialInstructions && (
					<div className="col-span-2 sm:col-span-3">
						<p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
							Special Instructions
						</p>
						<p className="text-muted-foreground italic">{content.specialInstructions}</p>
					</div>
				)}
				{isControlled && (
					<div className="col-span-2 sm:col-span-3">
						<p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
							PDEA Dispensing
						</p>
						<p className="text-muted-foreground">
							{content.pdeaDispensingInstructions ??
								(content.pdeaDispenseDate
									? `No Refill. Earliest dispense date: ${content.pdeaDispenseDate}.`
									: "No Refill.")}
						</p>
					</div>
				)}
			</div>

			<Separator className="mb-3" />

			{/* Prescriber Signature Block — FDA required */}
			<div className="flex items-end justify-between gap-4">
				<div className="text-xs">
					<p className="text-muted-foreground mb-0.5 font-semibold uppercase tracking-wide">
						Prescriber
					</p>
					<p className="font-medium">{rx.prescriberStaffName ?? "--"}</p>
					<p className="text-muted-foreground">PRC Lic. No.: {rx.prcLicenseNumber}</p>
					<p className="text-muted-foreground">PTR No.: {rx.ptrNumber}</p>
					{rx.pdeaS2License && (
						<p className="text-muted-foreground">S-2 Lic.: {rx.pdeaS2License}</p>
					)}
				</div>
				<div className="shrink-0 text-right">
					{isSigned ? (
						<div className="text-xs">
							<p className="mb-1 flex items-center justify-end gap-1 text-green-700 dark:text-green-400">
								<CheckCircle2 className="size-3.5" />
								Electronically Signed
							</p>
							<p className="text-muted-foreground">{formatDateTime(rx.signedAt)}</p>
							<p className="text-muted-foreground mt-1 text-[10px]">
								For single dispensing only unless otherwise indicated.
							</p>
						</div>
					) : (
						onSign && (
							<Button
								size="sm"
								onClick={() => onSign(rx.id)}
								disabled={signPending}
								className="gap-1"
							>
								<Lock className="size-3.5" />
								Sign Prescription
							</Button>
						)
					)}
				</div>
			</div>
		</div>
	)
}

// ============================================================================
// Props
// ============================================================================

interface EPrescriptionPageProps {
	encounterId: string
	facilityId: string
	patientId: string
}

// ============================================================================
// Main Component
// ============================================================================

export function EPrescriptionPage({ encounterId, facilityId, patientId }: EPrescriptionPageProps) {
	const [rxPrintOpen, setRxPrintOpen] = useState(false)
	const [showLicenseAlert, setShowLicenseAlert] = useState(true)

	const permSet = usePermissionSet()
	const { data: profile } = useMyProfile()
	const { data: encounter } = useEncounterDetailQuery(encounterId)
	const medOrdersQuery = useMedOrderListQuery({ encounterId })
	const prescriptionsQuery = usePrescriptionListQuery({ encounterId, patientId, page: 1, limit: 100 })

	const createPrescription = useCreatePrescriptionMutation()
	const signPrescription = useSignPrescriptionMutation()
	const canCreateOrders = can(permSet, "orders", "create")
	const canSignOrders = can(permSet, "orders", "sign")

	// Prescriber's license from their staff profile for this facility
	const staffProfile = profile?.staffProfiles?.find(sp => sp.facilityId === facilityId)

	const prcExpired = isPastDate(staffProfile?.prcExpiry)
	const ptrExpired = isPastDate(staffProfile?.ptrExpiry)
	const prcExpiringSoon = isWithinDays(staffProfile?.prcExpiry, 30)
	const ptrExpiringSoon = isWithinDays(staffProfile?.ptrExpiry, 30)

	const hasValidLicense = Boolean(
		staffProfile?.prcLicenseNumber &&
			staffProfile?.ptrNumber &&
			!prcExpired &&
			!ptrExpired
	)

	const licenseAlertMessages: string[] = []
	if (!staffProfile)
		licenseAlertMessages.push(
			"No active staff profile was found for this facility - prescription generation blocked."
		)
	else if (!staffProfile.prcLicenseNumber)
		licenseAlertMessages.push("PRC license number is missing - prescription generation blocked.")
	else if (!staffProfile.prcExpiry)
		licenseAlertMessages.push("PRC license expiry is not recorded - prescription generation blocked.")
	else if (prcExpired)
		licenseAlertMessages.push(
			`PRC license expired ${formatDate(staffProfile?.prcExpiry)} - prescription generation blocked.`
		)
	else if (prcExpiringSoon)
		licenseAlertMessages.push(`PRC license expires ${formatDate(staffProfile?.prcExpiry)}.`)

	if (!staffProfile?.ptrNumber)
		licenseAlertMessages.push("PTR number is missing - prescription generation blocked.")
	else if (!staffProfile.ptrExpiry)
		licenseAlertMessages.push("PTR expiry is not recorded - prescription generation blocked.")
	else if (ptrExpired)
		licenseAlertMessages.push(
			`PTR expired ${formatDate(staffProfile?.ptrExpiry)} - prescription generation blocked.`
		)
	else if (ptrExpiringSoon)
		licenseAlertMessages.push(`PTR expires ${formatDate(staffProfile?.ptrExpiry)}.`)

	const allPrescriptions = prescriptionsQuery.data?.data ?? []
	const prescribedOrderIds = new Set(allPrescriptions.map(rx => rx.medicationOrderId))

	const allMedOrders = medOrdersQuery.data?.data ?? []

	// Orders ready to prescribe: verified or active, not yet prescribed
	const readyToPrescribe = allMedOrders.filter(
		o =>
			(o.status === "verified" || o.status === "active") &&
			!prescribedOrderIds.has(o.id) &&
			isReadyForPrescriptionTranche(o)
	)

	const draftPrescriptions = allPrescriptions.filter(rx => rx.status === "draft")
	const signedPrescriptions = allPrescriptions.filter(
		rx => rx.status === "signed" || rx.status === "issued"
	)

	function handleGenerateRx(medicationOrderId: string) {
		if (!canCreateOrders) return
		if (!hasValidLicense) {
			toast.error("Cannot generate e-Prescription until PRC and PTR credentials are active.")
			return
		}
		createPrescription.mutate(
			{ facilityId, encounterId, medicationOrderId, patientId },
			{
				onSuccess: () => toast.success("e-Prescription draft generated."),
				onError: error =>
					toast.error(
						mutationErrorMessage(error, "Failed to generate e-Prescription.")
					),
			}
		)
	}

	function handleSign(id: string) {
		if (!canSignOrders) return
		if (!hasValidLicense) {
			toast.error("Cannot sign e-Prescription until PRC and PTR credentials are active.")
			return
		}
		signPrescription.mutate(id, {
			onSuccess: () => toast.success("e-Prescription signed."),
			onError: error =>
				toast.error(mutationErrorMessage(error, "Failed to sign e-Prescription.")),
		})
	}

	function handleSignAll() {
		if (!canSignOrders) return
		if (!hasValidLicense) {
			toast.error("Cannot sign e-Prescriptions until PRC and PTR credentials are active.")
			return
		}
		for (const rx of draftPrescriptions) {
			signPrescription.mutate(rx.id, {
				onError: error =>
					toast.error(mutationErrorMessage(error, "Failed to sign e-Prescription.")),
			})
		}
	}

	const isLoading = medOrdersQuery.isLoading || prescriptionsQuery.isLoading

	if (!canSignOrders) {
		return (
			<div className="p-8 text-center">
				<p className="text-muted-foreground text-sm">
					You do not have permission to access e-Prescription.
				</p>
				<p className="text-muted-foreground mt-1 text-xs">
					This workspace is limited to clinicians who can sign prescriptions.
				</p>
			</div>
		)
	}

	return (
		<>
			<div className="space-y-6">
				{/* License Warnings */}
				{showLicenseAlert && canCreateOrders && licenseAlertMessages.length > 0 && (
					<Alert variant={prcExpired || ptrExpired ? "destructive" : "default"}>
						<AlertTriangle className="size-4" />
						<AlertTitle>Prescription License Warning</AlertTitle>
						<AlertDescription>
							{licenseAlertMessages.map((msg, i) => (
								<p key={i}>{msg}</p>
							))}
						</AlertDescription>
						<AlertAction>
							<Button
								variant="ghost"
								size="icon-xs"
								onClick={() => setShowLicenseAlert(false)}
								aria-label="Dismiss"
							>
								<X className="size-3.5" />
							</Button>
						</AlertAction>
					</Alert>
				)}

				{/* Prescriber Header — FDA-required physician identification */}
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-base">
							<FileText className="size-4" />
							e-Prescription — Electronic Prescription System
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex flex-wrap items-start justify-between gap-4">
							{/* Patient info */}
							<div>
								<p className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
									Patient
								</p>
								<p className="font-semibold">{encounter?.patientName ?? "--"}</p>
								<p className="text-muted-foreground text-sm">MRN: {encounter?.patientMrn ?? "--"}</p>
								<p className="text-muted-foreground text-sm">
									Date: {formatDate(encounter?.admissionDatetime)}
								</p>
							</div>

							{/* Prescriber license block */}
							<div>
								<p className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
									Prescriber License
								</p>
								<p className="mb-2 font-semibold">
									{profile?.user?.name ?? "--"}
								</p>
								<div className="flex flex-wrap gap-2">
									<LicenseBadge
										label="PRC"
										number={staffProfile?.prcLicenseNumber}
										expiry={staffProfile?.prcExpiry}
									/>
									<LicenseBadge
										label="PTR"
										number={staffProfile?.ptrNumber}
										expiry={staffProfile?.ptrExpiry}
									/>
									{staffProfile?.pdeaS2License && (
										<LicenseBadge
											label="S-2"
											number={staffProfile.pdeaS2License}
											expiry={staffProfile.pdeaS2Expiry}
										/>
									)}
								</div>
							</div>

							{/* Action: Print/Send */}
							<div className="flex flex-col items-end gap-2">
								<Button
									onClick={() => setRxPrintOpen(true)}
									disabled={signedPrescriptions.length === 0}
									className="gap-2"
								>
									<Printer className="size-4" />
									Print / Send ({signedPrescriptions.length} signed)
								</Button>
								{signedPrescriptions.length === 0 && (
									<p className="text-muted-foreground text-xs">
										Sign at least one prescription to unlock.
									</p>
								)}
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Section: Ready to Prescribe */}
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<h2 className="flex items-center gap-2 font-semibold">
							<ClipboardList className="size-4" />
							Ready to Prescribe
							{readyToPrescribe.length > 0 && (
								<Badge variant="secondary">{readyToPrescribe.length}</Badge>
							)}
						</h2>
					</div>

					{isLoading ? (
						<p className="text-muted-foreground text-sm">Loading orders…</p>
					) : readyToPrescribe.length === 0 ? (
						<Card>
							<CardContent className="text-muted-foreground py-6 text-center text-sm">
								No verified medication orders pending prescription generation.
							</CardContent>
						</Card>
					) : (
						<div className="space-y-2">
							{readyToPrescribe.map(order => (
								<div
									key={order.id}
									className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3"
								>
									<div className="flex items-center gap-3">
										<Pill className="text-muted-foreground size-4 shrink-0" />
										<div>
											<p className="font-medium">
												{order.genericName}
												{order.brandName && (
													<span className="text-muted-foreground ml-1 font-normal text-sm">
														({order.brandName})
													</span>
												)}
											</p>
											<p className="text-muted-foreground text-xs">
												{order.dose} {order.doseUnit} — {order.doseForm} · {order.route} ·{" "}
												{order.frequency}
												{order.durationDays ? ` · ${order.durationDays}d` : ""}
											</p>
										</div>
									</div>
									<Button
										size="sm"
										variant="outline"
										disabled={!canCreateOrders || !hasValidLicense || createPrescription.isPending}
										onClick={() => handleGenerateRx(order.id)}
									>
										Generate Rx
									</Button>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Section: Draft Prescriptions */}
				{draftPrescriptions.length > 0 && (
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<h2 className="flex items-center gap-2 font-semibold">
								Draft Prescriptions
								<Badge variant="secondary">{draftPrescriptions.length}</Badge>
							</h2>
							{draftPrescriptions.length > 1 && (
								<Button
									size="sm"
									disabled={signPrescription.isPending || !hasValidLicense}
									onClick={handleSignAll}
									className="gap-1"
								>
									<Lock className="size-3.5" />
									Sign All ({draftPrescriptions.length})
								</Button>
							)}
						</div>
						<div className="space-y-3">
							{draftPrescriptions.map(rx => (
								<PrescriptionCard
									key={rx.id}
									rx={rx}
									onSign={canSignOrders ? handleSign : undefined}
									signPending={signPrescription.isPending || !hasValidLicense}
								/>
							))}
						</div>
					</div>
				)}

				{/* Section: Signed Prescriptions */}
				{signedPrescriptions.length > 0 && (
					<div className="space-y-3">
						<h2 className="flex items-center gap-2 font-semibold">
							<Lock className="size-4 text-green-600" />
							Signed Prescriptions
							<Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
								{signedPrescriptions.length}
							</Badge>
						</h2>
						<div className="space-y-3">
							{signedPrescriptions.map(rx => (
								<PrescriptionCard key={rx.id} rx={rx} />
							))}
						</div>
					</div>
				)}

				{allPrescriptions.length === 0 && !isLoading && readyToPrescribe.length === 0 && (
					<Card>
						<CardContent className="text-muted-foreground py-12 text-center text-sm">
							No medication orders available for prescribing. Order medications via the Orders tab
							first.
						</CardContent>
					</Card>
				)}
			</div>

			<PrescriptionPrintDialog
				open={rxPrintOpen}
				onOpenChange={setRxPrintOpen}
				encounterId={encounterId}
				patientId={patientId}
			/>
		</>
	)
}
