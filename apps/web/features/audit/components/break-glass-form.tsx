"use client"

import { useCallback, useState } from "react"

import { z } from "zod"

import { BreakGlassReasonCategoryEnum } from "@repo/contracts"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Separator } from "@/core/components/ui/separator"

import { useCreateBreakGlassMutation } from "@/features/audit/api/audit.hooks"

type ReasonCategory = z.infer<typeof BreakGlassReasonCategoryEnum>

const REASON_CATEGORIES: { value: ReasonCategory; label: string }[] = [
	{ value: "life_threatening_emergency", label: "Life-Threatening Emergency" },
	{ value: "covering_for_absent_provider", label: "Covering for Absent Provider" },
	{ value: "administrative_need", label: "Administrative Need" },
	{ value: "other", label: "Other" },
]

interface BreakGlassFormProps {
	patientId: string
	facilityId: string
	entityType: string
	entityId: string
	onSuccess?: () => void
	onCancel?: () => void
}

export function BreakGlassForm({
	patientId,
	facilityId,
	entityType,
	entityId,
	onSuccess,
	onCancel,
}: BreakGlassFormProps) {
	const [reasonCategory, setReasonCategory] = useState<ReasonCategory | "">("")
	const [justification, setJustification] = useState("")
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
			},
			{ onSuccess: () => onSuccess?.() }
		)
	}, [canSubmit, createBreakGlassMutation, facilityId, patientId, reasonCategory, justification, onSuccess])

	return (
		<Card className="mx-auto max-w-lg border-orange-300 dark:border-orange-700">
			<CardHeader className="bg-orange-50 dark:bg-orange-950/30">
				<CardTitle className="text-orange-800 dark:text-orange-200">Emergency Override Access</CardTitle>
				<CardDescription>
					You do not have regular access to this patient&apos;s record. Submit an emergency &quot;Break the
					Glass&quot; request to gain temporary access. This action is logged and will be reviewed.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4 pt-4">
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
