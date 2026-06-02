"use client"

import { useState } from "react"

import { AlertCircle, CheckCircle, ExternalLink, Plus } from "lucide-react"

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
import { Textarea } from "@/core/components/ui/textarea"

import {
	type CreateNbsReferralInput,
	type NbsReferralStatus,
	type UpdateNbsReferralInput,
	useCreateNbsReferralMutation,
	useNbsReferralsQuery,
	useUpdateNbsReferralMutation,
} from "@/features/nbs/api/nbs.hooks"

// ============================================================================
// Status config
// ============================================================================

const STATUS_CONFIG: Record<
	NbsReferralStatus,
	{ label: string; className: string }
> = {
	pending: {
		label: "Pending",
		className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
	},
	accepted: {
		label: "Accepted",
		className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
	},
	completed: {
		label: "Completed",
		className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
	},
	declined: {
		label: "Declined",
		className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
	},
}

// ============================================================================
// New referral form
// ============================================================================

interface NewReferralFormProps {
	nbsId: string
	encounterId: string
	patientId: string
	onDone: () => void
}

function NewReferralForm({ nbsId, encounterId, patientId, onDone }: NewReferralFormProps) {
	const mutation = useCreateNbsReferralMutation()
	const [referredCondition, setReferredCondition] = useState("")
	const [referralFacility, setReferralFacility] = useState("")
	const [referralDatetime, setReferralDatetime] = useState(
		new Date().toISOString().slice(0, 16)
	)
	const [referralNotes, setReferralNotes] = useState("")

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		const input: CreateNbsReferralInput = {
			nbsId,
			encounterId,
			patientId,
			referredCondition: referredCondition.trim(),
			referralFacility: referralFacility.trim(),
			referralDatetime: new Date(referralDatetime).toISOString(),
			referralNotes: referralNotes.trim() || undefined,
		}
		mutation.mutate(input, { onSuccess: onDone })
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-3 rounded-md border bg-muted/30 p-4">
			<p className="text-sm font-medium">New Referral</p>
			<div className="grid gap-3 sm:grid-cols-2">
				<div className="space-y-1.5">
					<Label htmlFor="referredCondition">
						Condition <span className="text-destructive">*</span>
					</Label>
					<Input
						id="referredCondition"
						placeholder="e.g. Congenital Hypothyroidism (CH)"
						value={referredCondition}
						onChange={(e) => setReferredCondition(e.target.value)}
						required
					/>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="referralFacility">
						Referral Facility <span className="text-destructive">*</span>
					</Label>
					<Input
						id="referralFacility"
						placeholder="Facility name"
						value={referralFacility}
						onChange={(e) => setReferralFacility(e.target.value)}
						required
					/>
				</div>
			</div>
			<div className="grid gap-3 sm:grid-cols-2">
				<div className="space-y-1.5">
					<Label htmlFor="referralDatetime">Date &amp; Time</Label>
					<Input
						id="referralDatetime"
						type="datetime-local"
						value={referralDatetime}
						onChange={(e) => setReferralDatetime(e.target.value)}
						required
					/>
				</div>
			</div>
			<div className="space-y-1.5">
				<Label htmlFor="referralNotes">Notes (optional)</Label>
				<Textarea
					id="referralNotes"
					rows={2}
					placeholder="Additional referral notes…"
					value={referralNotes}
					onChange={(e) => setReferralNotes(e.target.value)}
				/>
			</div>
			{mutation.isError && (
				<div className="flex items-center gap-2 text-sm text-destructive">
					<AlertCircle className="size-4 shrink-0" />
					<span>Failed to save referral.</span>
				</div>
			)}
			<div className="flex gap-2">
				<Button type="submit" size="sm" disabled={mutation.isPending}>
					{mutation.isPending ? "Saving…" : "Save Referral"}
				</Button>
				<Button type="button" size="sm" variant="ghost" onClick={onDone}>
					Cancel
				</Button>
			</div>
		</form>
	)
}

// ============================================================================
// Referral row
// ============================================================================

const STATUS_TRANSITIONS: Record<NbsReferralStatus, NbsReferralStatus | null> = {
	pending: "accepted",
	accepted: "completed",
	completed: null,
	declined: null,
}

function ReferralRow({
	referral,
}: {
	referral: {
		id: string
		nbsId: string
		referredCondition: string
		referralFacility: string
		referralDatetime: string
		referralStatus: NbsReferralStatus
		referralNotes: string | null
		performedByName: string
	}
}) {
	const updateMutation = useUpdateNbsReferralMutation()
	const cfg = STATUS_CONFIG[referral.referralStatus]
	const nextStatus = STATUS_TRANSITIONS[referral.referralStatus]

	const advance = () => {
		if (!nextStatus) return
		const input: UpdateNbsReferralInput = {
			id: referral.id,
			referralStatus: nextStatus,
			...(nextStatus === "accepted" ? { acceptedAt: new Date().toISOString() } : {}),
			...(nextStatus === "completed" ? { completedAt: new Date().toISOString() } : {}),
		}
		updateMutation.mutate(input)
	}

	return (
		<div className="rounded-md border bg-card p-3 space-y-2">
			<div className="flex items-start justify-between gap-2">
				<div className="space-y-0.5">
					<p className="text-sm font-medium">{referral.referredCondition}</p>
					<p className="text-xs text-muted-foreground flex items-center gap-1">
						<ExternalLink className="size-3" />
						{referral.referralFacility}
					</p>
				</div>
				<Badge className={cfg.className}>{cfg.label}</Badge>
			</div>
			<div className="flex items-center justify-between gap-2">
				<p className="text-xs text-muted-foreground">
					{new Date(referral.referralDatetime).toLocaleString(undefined, {
						month: "short",
						day: "numeric",
						hour: "2-digit",
						minute: "2-digit",
					})}{" "}
					· by {referral.performedByName}
				</p>
				{nextStatus && (
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="h-7 text-xs"
						disabled={updateMutation.isPending}
						onClick={advance}
					>
						Mark {STATUS_CONFIG[nextStatus].label}
					</Button>
				)}
			</div>
			{referral.referralNotes && (
				<p className="text-xs text-muted-foreground border-t pt-2">
					{referral.referralNotes}
				</p>
			)}
		</div>
	)
}

// ============================================================================
// Main component
// ============================================================================

interface NbsReferralTrackerProps {
	nbsId: string
	encounterId: string
	patientId: string
}

export function NbsReferralTracker({ nbsId, encounterId, patientId }: NbsReferralTrackerProps) {
	const { data: referrals = [], isLoading } = useNbsReferralsQuery(nbsId)
	const [showForm, setShowForm] = useState(false)

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle className="text-sm">Referral Tracking</CardTitle>
				{!showForm && (
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="gap-1.5 h-7 text-xs"
						onClick={() => setShowForm(true)}
					>
						<Plus className="size-3.5" />
						Add Referral
					</Button>
				)}
			</CardHeader>
			<CardContent className="space-y-3">
				{showForm && (
					<NewReferralForm
						nbsId={nbsId}
						encounterId={encounterId}
						patientId={patientId}
						onDone={() => setShowForm(false)}
					/>
				)}

				{isLoading ? (
					<p className="text-sm text-muted-foreground">Loading referrals…</p>
				) : referrals.length === 0 ? (
					<p className="text-sm text-muted-foreground text-center py-4">
						No referrals yet. Referrals are created when NBS results are positive/borderline.
					</p>
				) : (
					<div className="space-y-2">
						{referrals.map((r) => (
							<ReferralRow key={r.id} referral={r} />
						))}
					</div>
				)}

				{referrals.some(
					(r) => r.referralStatus === "completed"
				) && (
					<div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 pt-1">
						<CheckCircle className="size-4 shrink-0" />
						<span>All completed referrals have been followed up.</span>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
