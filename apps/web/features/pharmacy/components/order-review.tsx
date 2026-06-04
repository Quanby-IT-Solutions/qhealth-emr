"use client"

import { useState } from "react"
import {
	AlertOctagon,
	AlertTriangle,
	ArrowLeft,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Clock,
	Info,
	Loader2,
	ShieldAlert,
	XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Label } from "@/core/components/ui/label"
import { Separator } from "@/core/components/ui/separator"
import { Textarea } from "@/core/components/ui/textarea"

import {
	usePharmacyOrderDetailQuery,
	useVerifyPharmacyOrderMutation,
	type SafetyCheck,
	type SafetySeverity,
} from "../api/pharmacy.hooks"
import { DispenseConfirmation } from "./dispense-confirmation"

// ── Safety alert card ────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<
	SafetySeverity,
	{ icon: typeof AlertOctagon; className: string; label: string }
> = {
	critical: {
		icon: AlertOctagon,
		className: "border-red-300 bg-red-50 text-red-900",
		label: "Critical",
	},
	major: {
		icon: ShieldAlert,
		className: "border-orange-300 bg-orange-50 text-orange-900",
		label: "Major",
	},
	moderate: {
		icon: AlertTriangle,
		className: "border-amber-300 bg-amber-50 text-amber-900",
		label: "Moderate",
	},
	minor: {
		icon: Info,
		className: "border-blue-300 bg-blue-50 text-blue-900",
		label: "Minor",
	},
	info: {
		icon: Info,
		className: "border-slate-300 bg-slate-50 text-slate-900",
		label: "Info",
	},
}

const CHECK_TYPE_LABEL: Record<SafetyCheck["type"], string> = {
	drug_interaction: "Drug-Drug Interaction",
	dose_range: "Dose Range",
	weight_based: "Weight-Based Dosing",
	renal_adjustment: "Renal Adjustment",
	hepatic_adjustment: "Hepatic Adjustment",
	allergy_cross_reactivity: "Allergy Cross-Reactivity",
	black_box_warning: "Black Box Warning",
	duplicate_therapy: "Duplicate Therapy",
	pregnancy_category: "Pregnancy Category",
}

interface SafetyAlertCardProps {
	check: SafetyCheck
}

function SafetyAlertCard({ check }: SafetyAlertCardProps) {
	const [expanded, setExpanded] = useState(check.severity === "critical")
	const config = SEVERITY_CONFIG[check.severity]
	const Icon = config.icon

	return (
		<div className={`rounded-md border p-3 ${config.className}`}>
			<div
				className="flex cursor-pointer items-start justify-between gap-2"
				onClick={() => setExpanded(v => !v)}
			>
				<div className="flex items-start gap-2">
					<Icon className="mt-0.5 size-4 shrink-0" />
					<div>
						<div className="flex items-center gap-2">
							<span className="text-xs font-semibold uppercase">
								{CHECK_TYPE_LABEL[check.type]}
							</span>
							<Badge variant={check.isHardBlock ? "destructive" : "outline"} className="text-xs">
								{config.label}
								{check.isHardBlock ? " — Hard Block" : ""}
							</Badge>
						</div>
						<p className="mt-0.5 text-sm font-medium">{check.title}</p>
					</div>
				</div>
				{expanded ? (
					<ChevronUp className="mt-0.5 size-4 shrink-0" />
				) : (
					<ChevronDown className="mt-0.5 size-4 shrink-0" />
				)}
			</div>

			{expanded && (
				<div className="mt-2 pl-6">
					<p className="text-sm">{check.message}</p>
					{check.details && (
						<ul className="mt-1.5 space-y-0.5 text-xs">
							{check.details.interactingDrug && (
								<li>
									<strong>Interacting drug:</strong> {check.details.interactingDrug}
								</li>
							)}
							{check.details.recommendedDose && (
								<li>
									<strong>Recommended dose:</strong> {check.details.recommendedDose}
								</li>
							)}
							{check.details.actualDose && (
								<li>
									<strong>Ordered dose:</strong> {check.details.actualDose}
								</li>
							)}
							{check.details.adjustedDose && (
								<li>
									<strong>Suggested adjusted dose:</strong> {check.details.adjustedDose}
								</li>
							)}
							{check.details.allergen && (
								<li>
									<strong>Cross-reactive allergen:</strong> {check.details.allergen}
								</li>
							)}
							{check.details.category && (
								<li>
									<strong>Category:</strong> {check.details.category}
								</li>
							)}
						</ul>
					)}
				</div>
			)}
		</div>
	)
}

// ── Order detail card ─────────────────────────────────────────────────────────

interface OrderDetailProps {
	label: string
	value: string | null | undefined
}

function OrderDetail({ label, value }: OrderDetailProps) {
	if (!value) return null
	return (
		<div>
			<p className="text-muted-foreground mb-0.5 text-xs">{label}</p>
			<p className="text-sm">{value}</p>
		</div>
	)
}

// ── Main component ────────────────────────────────────────────────────────────

interface OrderReviewProps {
	orderId: string
	onBack: () => void
	onDispenseSuccess: () => void
}

export function OrderReview({ orderId, onBack, onDispenseSuccess }: OrderReviewProps) {
	const { data: order, isLoading } = usePharmacyOrderDetailQuery(orderId)
	const verify = useVerifyPharmacyOrderMutation()
	const [rejectionReason, setRejectionReason] = useState("")
	const [overrideNotes, setOverrideNotes] = useState("")
	const [showRejectForm, setShowRejectForm] = useState(false)
	const [showDispense, setShowDispense] = useState(false)

	if (isLoading) {
		return (
			<div className="flex items-center gap-2 p-8">
				<Loader2 className="size-4 animate-spin" />
				Loading order details…
			</div>
		)
	}

	if (!order) {
		return (
			<div className="p-8 text-center">
				<p className="text-muted-foreground text-sm">Order not found.</p>
			</div>
		)
	}

	if (showDispense) {
		return (
			<DispenseConfirmation
				order={order}
				overrideNotes={overrideNotes || undefined}
				onSuccess={() => {
					setShowDispense(false)
					onDispenseSuccess()
				}}
				onCancel={() => setShowDispense(false)}
			/>
		)
	}

	const criticalChecks = order.safetyChecks.filter(c => c.severity === "critical" || c.isHardBlock)
	const hasHardBlock = criticalChecks.some(c => c.isHardBlock)
	const warnChecks = order.safetyChecks.filter(c => c.severity !== "critical" && !c.isHardBlock)
	const requiresOverride = order.safetyChecks.some(c => c.requiresOverride)

	function handleApprove() {
		verify.mutate(
			{
				medicationOrderId: orderId,
				action: "approved",
				overrideNotes: overrideNotes || undefined,
			},
			{
				onSuccess: onDispenseSuccess,
				onError: err => toast.error(err instanceof Error ? err.message : "Failed to verify order"),
			}
		)
	}

	function handleReject() {
		verify.mutate(
			{
				medicationOrderId: orderId,
				action: "rejected",
				rejectionReason,
			},
			{
				onSuccess: onBack,
				onError: err => toast.error(err instanceof Error ? err.message : "Failed to reject order"),
			}
		)
	}

	function handleHold() {
		verify.mutate(
			{
				medicationOrderId: orderId,
				action: "on_hold",
				modificationNotes: overrideNotes || undefined,
			},
			{
				onSuccess: onBack,
				onError: err =>
					toast.error(err instanceof Error ? err.message : "Failed to place order on hold"),
			}
		)
	}

	return (
		<div className="space-y-6">
			{/* Back */}
			<Button variant="ghost" size="sm" onClick={onBack}>
				<ArrowLeft className="mr-1.5 size-4" />
				Back to Queue
			</Button>

			{/* Patient + order header */}
			<Card>
				<CardHeader>
					<div className="flex items-start justify-between">
						<div>
							<CardTitle className="text-base">{order.patientName}</CardTitle>
							<p className="text-muted-foreground text-sm">
								MRN: {order.patientMrn}
								{order.patientWeight ? ` · ${order.patientWeight} kg` : ""}
								{order.patientCreatinine ? ` · CrCl / SCr: ${order.patientCreatinine}` : ""}
							</p>
						</div>
						<div className="flex items-center gap-2">
							{order.isControlledSubstance && (
								<Badge variant="outline">Controlled S{order.pdeaSchedule}</Badge>
							)}
							<Badge
								variant={
									order.priority === "stat"
										? "destructive"
										: order.priority === "urgent"
											? "secondary"
											: "outline"
								}
							>
								{order.priority.toUpperCase()}
							</Badge>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
						<OrderDetail label="Generic Name" value={order.genericName} />
						<OrderDetail label="Brand Name" value={order.brandName} />
						<OrderDetail label="Dose" value={`${order.dose} ${order.doseUnit} ${order.doseForm}`} />
						<OrderDetail label="Route" value={order.route} />
						<OrderDetail label="Frequency" value={order.frequency} />
						<OrderDetail
							label="Duration"
							value={order.durationDays ? `${order.durationDays} days` : null}
						/>
						<OrderDetail label="PRN Reason" value={order.prnReason} />
						<OrderDetail
							label="Tranche"
							value={
								order.pdeaTrancheNumber !== null && order.pdeaTrancheTotal !== null
									? `${order.pdeaTrancheNumber} of ${order.pdeaTrancheTotal}`
									: null
							}
						/>
					</div>
					{order.specialInstructions && (
						<div className="bg-muted mt-3 rounded-md p-2 text-sm">
							<strong>Special Instructions: </strong>
							{order.specialInstructions}
						</div>
					)}
					<Separator className="my-3" />
					<p className="text-muted-foreground text-xs">
						Ordered by: {order.orderingStaffName ?? "Unknown"} · Received:{" "}
						{new Date(order.receivedAt).toLocaleString("en-PH", {
							month: "short",
							day: "numeric",
							hour: "2-digit",
							minute: "2-digit",
						})}
					</p>
				</CardContent>
			</Card>

			{/* Safety checks */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="text-base">Clinical Safety Checks</CardTitle>
						<div className="flex items-center gap-2">
							{hasHardBlock ? (
								<span className="flex items-center gap-1 text-sm text-red-600">
									<XCircle className="size-4" />
									Hard Block — Cannot Dispense
								</span>
							) : order.safetyChecks.length === 0 ? (
								<span className="flex items-center gap-1 text-sm text-green-700">
									<CheckCircle2 className="size-4" />
									No Issues
								</span>
							) : (
								<span className="flex items-center gap-1 text-sm text-amber-700">
									<AlertTriangle className="size-4" />
									{order.safetyChecks.length} issue
									{order.safetyChecks.length > 1 ? "s" : ""}
								</span>
							)}
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-3">
					{order.safetyChecks.length === 0 && (
						<p className="text-muted-foreground text-sm">
							All safety checks passed. No contraindications found.
						</p>
					)}

					{/* Critical first */}
					{criticalChecks.map(c => (
						<SafetyAlertCard key={c.id} check={c} />
					))}
					{/* Warnings */}
					{warnChecks.map(c => (
						<SafetyAlertCard key={c.id} check={c} />
					))}

					{/* Override notes when warnings are present */}
					{!hasHardBlock && requiresOverride && (
						<div className="mt-4">
							<Label htmlFor="overrideNotes" className="mb-1 block text-sm font-medium">
								Override / Clinical Justification
								<span className="text-red-500">*</span>
							</Label>
							<Textarea
								id="overrideNotes"
								placeholder="Document clinical justification for overriding alert(s)…"
								rows={3}
								value={overrideNotes}
								onChange={e => setOverrideNotes(e.target.value)}
							/>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Reject form */}
			{showRejectForm && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base text-red-700">Reject Order</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<Label className="text-sm">Rejection Reason</Label>
						<Textarea
							rows={3}
							placeholder="Enter reason for rejection (required)…"
							value={rejectionReason}
							onChange={e => setRejectionReason(e.target.value)}
						/>
						<div className="flex gap-2">
							<Button
								variant="destructive"
								disabled={!rejectionReason.trim() || verify.isPending}
								onClick={handleReject}
							>
								{verify.isPending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
								Confirm Rejection
							</Button>
							<Button variant="outline" onClick={() => setShowRejectForm(false)}>
								Cancel
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Action bar */}
			{!showRejectForm && (
				<div className="flex flex-wrap items-center gap-3">
					{hasHardBlock ? (
						<>
							<Button
								variant="destructive"
								onClick={() => setShowRejectForm(true)}
								disabled={verify.isPending}
							>
								<XCircle className="mr-1.5 size-4" />
								Reject Order
							</Button>
							<Button variant="outline" onClick={handleHold} disabled={verify.isPending}>
								<Clock className="mr-1.5 size-4" />
								Place On Hold
							</Button>
						</>
					) : (
						<>
							<Button
								onClick={() => setShowDispense(true)}
								disabled={verify.isPending || (requiresOverride && !overrideNotes.trim())}
							>
								<CheckCircle2 className="mr-1.5 size-4" />
								Approve & Dispense
							</Button>
							<Button
								variant="outline"
								onClick={handleApprove}
								disabled={verify.isPending || (requiresOverride && !overrideNotes.trim())}
							>
								Verify Only
							</Button>
							<Button variant="outline" onClick={handleHold} disabled={verify.isPending}>
								<Clock className="mr-1.5 size-4" />
								On Hold
							</Button>
							<Button
								variant="ghost"
								onClick={() => setShowRejectForm(true)}
								disabled={verify.isPending}
							>
								<XCircle className="mr-1.5 size-4 text-red-500" />
								Reject
							</Button>
						</>
					)}
				</div>
			)}
		</div>
	)
}
