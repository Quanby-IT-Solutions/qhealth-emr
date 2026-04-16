"use client"

import { useCallback, useEffect, useState } from "react"

import { z } from "zod"

import { BreakGlassReasonCategoryEnum } from "@repo/contracts"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Separator } from "@/core/components/ui/separator"

import { useCreateBreakGlassMutation } from "@/features/audit/api/audit.hooks"
import type { BreakGlassEvent } from "@/features/audit/api/audit.hooks"

type ReasonCategory = z.infer<typeof BreakGlassReasonCategoryEnum>

const REASON_CATEGORIES: { value: ReasonCategory; label: string }[] = [
	{ value: "life_threatening_emergency", label: "Life-Threatening Emergency" },
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

// ============================================================================
// Countdown display for an active break-glass session
// ============================================================================

function BreakGlassCountdown({ accessExpiresAt }: { accessExpiresAt: string | Date }) {
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

	const isUrgent = remainingMs < 10 * 60 * 1000 // < 10 minutes

	return (
		<Badge
			variant="secondary"
			className={
				isUrgent
					? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
					: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
			}
		>
			⏱ Remaining:{" "}
			{hours > 0 && `${hours}h `}
			{String(minutes).padStart(2, "0")}m {String(seconds).padStart(2, "0")}s
		</Badge>
	)
}

interface BreakGlassFormProps {
	patientId: string
	facilityId: string
	entityType: string
	entityId: string
	/** If a break-glass session is already active for the current user + patient, pass it here */
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
	const [durationHours, setDurationHours] = useState<number>(4)
	const [acknowledged, setAcknowledged] = useState(false)
	const createBreakGlassMutation = useCreateBreakGlassMutation()

	const canSubmit =
		reasonCategory && justification.trim().length >= 10 && acknowledged && !createBreakGlassMutation.isPending

	const handleSubmit = useCallback(() => {
		if (!canSubmit) return

		createBreakGlassMutation.mutate(
			{
				facilityId,
				patientId,
				reasonCategory: reasonCategory as ReasonCategory,
				justification: justification.trim(),
				durationHours,
			},
			{ onSuccess: () => onSuccess?.() }
		)
	}, [canSubmit, createBreakGlassMutation, facilityId, patientId, reasonCategory, justification, durationHours, onSuccess])

	return (
		<Card className="mx-auto max-w-lg border-orange-300 dark:border-orange-700">
			<CardHeader className="bg-orange-50 dark:bg-orange-950/30">
				<div className="flex items-start justify-between gap-2">
					<div>
						<CardTitle className="text-orange-800 dark:text-orange-200">Emergency Override Access</CardTitle>
						<CardDescription>
							You do not have regular access to this patient&apos;s record. Submit an emergency &quot;Break
							the Glass&quot; request to gain temporary access. This action is logged and will be reviewed.
						</CardDescription>
					</div>
					{activeEvent?.accessExpiresAt && (
						<BreakGlassCountdown accessExpiresAt={activeEvent.accessExpiresAt as unknown as string} />
					)}
				</div>
			</CardHeader>
			<CardContent className="space-y-4 pt-4">
				{activeEvent && (
					<div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800 dark:border-orange-700 dark:bg-orange-950/20 dark:text-orange-200">
						<p className="font-medium">Active Break-Glass Session</p>
						<p className="mt-0.5">
							You currently have an active emergency override session. Access expires at{" "}
							<span className="font-medium">
								{new Date(activeEvent.accessExpiresAt as unknown as string).toLocaleString("en-PH", {
									hour: "2-digit",
									minute: "2-digit",
									day: "numeric",
									month: "short",
								})}
							</span>
							.
						</p>
					</div>
				)}

				<div className="space-y-2">
					<Label htmlFor="reason-category">Reason Category *</Label>
					<Select value={reasonCategory || null} onValueChange={v => setReasonCategory(v ?? "")}>
						<SelectTrigger id="reason-category">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{REASON_CATEGORIES.map(cat => (
								<SelectItem key={cat.value} value={cat.value}>
									{cat.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2">
					<Label htmlFor="justification">Clinical Justification *</Label>
					<Input
						id="justification"
						placeholder="Describe the clinical necessity for accessing this record (min 10 characters)"
						value={justification}
						onChange={e => setJustification(e.target.value)}
					/>
					{justification.length > 0 && justification.length < 10 && (
						<p className="text-xs text-red-500">Minimum 10 characters required.</p>
					)}
				</div>

				<div className="space-y-2">
					<Label htmlFor="duration">Access Duration *</Label>
					<Select
						value={String(durationHours)}
						onValueChange={v => setDurationHours(Number(v))}
					>
						<SelectTrigger id="duration">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{DURATION_OPTIONS.map(opt => (
								<SelectItem key={opt.value} value={String(opt.value)}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<p className="text-xs text-muted-foreground">
						Access will expire automatically after the selected duration.
					</p>
				</div>

				<Separator />

				<div className="flex items-start gap-2">
					<input
						id="acknowledge"
						type="checkbox"
						checked={acknowledged}
						onChange={e => setAcknowledged(e.target.checked)}
						className="mt-1"
					/>
					<Label htmlFor="acknowledge" className="text-sm leading-snug">
						I acknowledge that accessing this record will be logged, audited, and reviewed by the Privacy
						Officer. Unauthorized access may lead to disciplinary action.
					</Label>
				</div>

				{createBreakGlassMutation.error && (
					<div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
						{String(createBreakGlassMutation.error)}
					</div>
				)}

				<div className="flex justify-end gap-2">
					{onCancel && (
						<Button variant="outline" onClick={onCancel} disabled={createBreakGlassMutation.isPending}>
							Cancel
						</Button>
					)}
					<Button
						variant="destructive"
						onClick={handleSubmit}
						disabled={!canSubmit}
					>
						{createBreakGlassMutation.isPending ? "Requesting Access..." : "Request Emergency Access"}
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}

