"use client"

import { useEffect, useState } from "react"

import { type z } from "zod"
import { AlertTriangle, Clock, Shield, ShieldAlert } from "lucide-react"

import { type BreakGlassReasonCategoryEnum } from "@repo/contracts"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Label } from "@/core/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Separator } from "@/core/components/ui/separator"
import { Textarea } from "@/core/components/ui/textarea"

import { type BreakGlassEvent, useCreateBreakGlassMutation } from "@/features/audit/api/audit.hooks"

type ReasonCategory = z.infer<typeof BreakGlassReasonCategoryEnum>

const REASON_CATEGORIES: { value: ReasonCategory; label: string }[] = [
	{ value: "cardiac_arrest", label: "Cardiac Arrest" },
	{ value: "code_blue", label: "Code Blue" },
	{ value: "stroke", label: "Stroke" },
	{ value: "sepsis", label: "Sepsis" },
	{ value: "trauma", label: "Trauma" },
	{ value: "motor_vehicle_accident", label: "Motor Vehicle Accident" },
	{ value: "life_threatening_emergency", label: "Life-Threatening Emergency (Other)" },
	{ value: "covering_for_absent_provider", label: "Covering for Absent Provider" },
	{ value: "administrative_need", label: "Administrative Need" },
	{ value: "other", label: "Other" },
]

const DURATION_OPTIONS: { value: number; label: string }[] = [
	{ value: 1, label: "1 hour" },
	{ value: 2, label: "2 hours" },
	{ value: 4, label: "4 hours (default)" },
	{ value: 8, label: "8 hours" },
	{ value: 12, label: "12 hours" },
	{ value: 24, label: "24 hours" },
]
const MIN_JUSTIFICATION_LENGTH = 50

// ============================================================================
// Countdown display for an active break-glass session
// ============================================================================

export function BreakGlassCountdown({ accessExpiresAt }: { accessExpiresAt: string | Date }) {
	const expiresAt = new Date(accessExpiresAt).getTime()

	const getRemainingMs = () => Math.max(0, expiresAt - Date.now())

	const [remainingMs, setRemainingMs] = useState(() => getRemainingMs())

	useEffect(() => {
		const interval = setInterval(() => {
			const ms = getRemainingMs()
			setRemainingMs(ms)
			if (ms === 0) clearInterval(interval)
		}, 1000)
		return () => clearInterval(interval)
	}, [expiresAt])

	if (remainingMs === 0) {
		return (
			<Badge variant="secondary" className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
				Access expired
			</Badge>
		)
	}

	const totalSeconds = Math.floor(remainingMs / 1000)
	const hours = Math.floor(totalSeconds / 3600)
	const minutes = Math.floor((totalSeconds % 3600) / 60)
	const seconds = totalSeconds % 60

	const isUrgent = remainingMs < 10 * 60 * 1000

	return (
		<Badge
			variant="secondary"
			className={
				isUrgent
					? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
					: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
			}
		>
			⏱ {hours > 0 && `${hours}h `}
			{String(minutes).padStart(2, "0")}m {String(seconds).padStart(2, "0")}s
		</Badge>
	)
}

interface BreakGlassFormProps {
	patientId: string
	facilityId: string
	entityType: string
	entityId: string
	activeEvent?: BreakGlassEvent | null
	onSuccess?: () => void
	onCancel?: () => void
}

export function BreakGlassForm({
	patientId,
	facilityId,
	entityType,
	entityId,
	activeEvent,
	onSuccess,
	onCancel,
}: BreakGlassFormProps) {
	const [reasonCategory, setReasonCategory] = useState<ReasonCategory | "">("")
	const [justification, setJustification] = useState("")
	const [durationHours, setDurationHours] = useState<number | "">("")
	const [acknowledged, setAcknowledged] = useState(false)
	const createBreakGlassMutation = useCreateBreakGlassMutation()

	if (activeEvent) {
		return (
			<div className="space-y-5">
				{/* Active session banner */}
				<div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-800 dark:bg-orange-950/40">
					<div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/50">
						<Shield className="size-4 text-orange-600 dark:text-orange-400" />
					</div>
					<div className="flex-1 min-w-0">
						<p className="text-sm font-semibold text-orange-800 dark:text-orange-200">
							Break-Glass Session Active
						</p>
						<p className="text-xs text-orange-700 dark:text-orange-300 mt-0.5">
							Temporary access expires at{" "}
							<span className="font-medium">
								{new Date(activeEvent.accessExpiresAt as unknown as string).toLocaleString("en-PH", {
									hour: "2-digit",
									minute: "2-digit",
									day: "numeric",
									month: "short",
								})}
							</span>
						</p>
					</div>
					{activeEvent.accessExpiresAt && (
						<BreakGlassCountdown accessExpiresAt={activeEvent.accessExpiresAt as unknown as string} />
					)}
				</div>

				<p className="text-sm text-muted-foreground">
					Your emergency override session is already active for this patient. Temporary read access remains
					available until it expires automatically.
				</p>

				<div className="flex justify-end">
					{onCancel && (
						<Button variant="outline" onClick={onCancel}>
							Close
						</Button>
					)}
				</div>
			</div>
		)
	}

	const canSubmit =
		reasonCategory &&
		durationHours !== "" &&
		justification.trim().length >= MIN_JUSTIFICATION_LENGTH &&
		acknowledged &&
		!createBreakGlassMutation.isPending

	function handleSubmit() {
		if (!canSubmit) return

		createBreakGlassMutation.mutate(
			{
				facilityId,
				patientId,
				reasonCategory: reasonCategory as ReasonCategory,
				justification: justification.trim(),
				durationHours: Number(durationHours),
			},
			{ onSuccess: () => onSuccess?.() }
		)
	}

	return (
		<div className="space-y-6">
			{/* Warning notice */}
			<div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/40">
				<AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
				<p className="text-sm text-amber-800 dark:text-amber-200">
					You do not have regular access to this patient&apos;s record. This action is{" "}
					<span className="font-semibold">logged, audited, and reviewed</span> by the Privacy Officer.
					Unauthorized access may lead to disciplinary action.
				</p>
			</div>

			{/* Form fields */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="reason-category" className="text-sm font-medium">
						Reason Category <span className="text-destructive">*</span>
					</Label>
					<Select value={reasonCategory || null} onValueChange={v => setReasonCategory(v ?? "")}>
						<SelectTrigger id="reason-category" className="w-full">
							<SelectValue placeholder="Select reason…">
								{reasonCategory ? REASON_CATEGORIES.find(c => c.value === reasonCategory)?.label : undefined}
							</SelectValue>
						</SelectTrigger>
						<SelectContent className="w-max min-w-[var(--anchor-width)]">
							{REASON_CATEGORIES.map(cat => (
								<SelectItem key={cat.value} value={cat.value}>
									{cat.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2">
					<Label htmlFor="duration" className="text-sm font-medium flex items-center gap-1.5">
						<Clock className="size-3.5 text-muted-foreground" />
						Access Duration <span className="text-destructive">*</span>
					</Label>
					<Select
						value={durationHours ? String(durationHours) : null}
						onValueChange={v => setDurationHours(Number(v))}
					>
						<SelectTrigger id="duration" className="w-full">
							<SelectValue placeholder="Select duration…">
								{durationHours ? DURATION_OPTIONS.find(o => o.value === durationHours)?.label : undefined}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{DURATION_OPTIONS.map(opt => (
								<SelectItem key={opt.value} value={String(opt.value)}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<p className="text-xs text-muted-foreground">Access expires automatically.</p>
				</div>
			</div>

			<div className="space-y-2">
				<Label htmlFor="justification" className="text-sm font-medium">
					Clinical Justification <span className="text-destructive">*</span>
				</Label>
				<Textarea
					id="justification"
					placeholder={`Describe the clinical necessity for accessing this record (minimum ${MIN_JUSTIFICATION_LENGTH} characters)...`}
					value={justification}
					onChange={e => setJustification(e.target.value)}
					rows={3}
					className="resize-none"
				/>
				<div className="flex items-center justify-between gap-3 text-xs">
					<p className={justification.trim().length < MIN_JUSTIFICATION_LENGTH ? "text-destructive" : "text-muted-foreground"}>
						Minimum {MIN_JUSTIFICATION_LENGTH} characters required.
					</p>
					<p className="text-muted-foreground text-right">
						{justification.trim().length} / {MIN_JUSTIFICATION_LENGTH} characters
					</p>
				</div>
			</div>

			<Separator />

			{/* Acknowledgment */}
			<label
				htmlFor="acknowledge"
				className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
					acknowledged
						? "border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-950/30"
						: "border-border bg-secondary/30 hover:bg-secondary/60"
				}`}
			>
				<input
					id="acknowledge"
					type="checkbox"
					checked={acknowledged}
					onChange={e => setAcknowledged(e.target.checked)}
					className="mt-0.5 size-4 shrink-0 accent-orange-600"
				/>
				<span className="text-sm leading-snug text-foreground">
					I acknowledge that accessing this record will be{" "}
					<span className="font-medium">logged, audited, and reviewed</span> by the Privacy Officer.
					Unauthorized access may lead to disciplinary action.
				</span>
			</label>

			{createBreakGlassMutation.error && (
				<div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
					<AlertTriangle className="mt-0.5 size-4 shrink-0" />
					{String(createBreakGlassMutation.error)}
				</div>
			)}

			<div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
				{onCancel && (
					<Button variant="outline" onClick={onCancel} disabled={createBreakGlassMutation.isPending} className="w-full sm:w-auto">
						Cancel
					</Button>
				)}
				<Button
					variant="destructive"
					onClick={handleSubmit}
					disabled={!canSubmit}
					className="w-full sm:w-auto gap-2"
				>
					<ShieldAlert className="size-4" />
					{createBreakGlassMutation.isPending ? "Requesting Access…" : "Request Emergency Access"}
				</Button>
			</div>
		</div>
	)
}

