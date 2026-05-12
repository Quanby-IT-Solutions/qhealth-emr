"use client"

import { useState } from "react"
import { AlertTriangle } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Checkbox } from "@/core/components/ui/checkbox"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Label } from "@/core/components/ui/label"
import { Textarea } from "@/core/components/ui/textarea"
import {
	useRevokeConsentWithReasonMutation,
	type ConsentRecord,
} from "@/features/clinical-docs/api/clinical-docs.hooks"

const CONSENT_TYPE_LABELS: Record<string, string> = {
	general: "General",
	procedure: "Procedure",
	research: "Research",
	blood_transfusion: "Blood Transfusion",
	surgery: "Surgery",
	dpa: "DPA (Data Privacy)",
}

interface ConsentRevocationProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	consent: ConsentRecord
	patientId: string
}

export function ConsentRevocation({
	open,
	onOpenChange,
	consent,
	patientId,
}: ConsentRevocationProps) {
	const [reason, setReason] = useState("")
	const [confirmed, setConfirmed] = useState(false)
	const revoke = useRevokeConsentWithReasonMutation()

	function handleClose(nextOpen: boolean) {
		if (!nextOpen) {
			setReason("")
			setConfirmed(false)
		}
		onOpenChange(nextOpen)
	}

	function handleSubmit() {
		if (!confirmed) return
		revoke.mutate(
			{
				id: consent.id,
				patientId,
				encounterId: consent.encounterId ?? undefined,
				reason: reason.trim() || undefined,
			},
			{
				onSuccess: () => handleClose(false),
			}
		)
	}

	const isValid = confirmed && !revoke.isPending

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<div className="flex items-center gap-2">
						<AlertTriangle className="size-5 text-orange-500" />
						<DialogTitle>Revoke Consent</DialogTitle>
					</div>
					<DialogDescription>
						You are about to revoke the{" "}
						<span className="font-medium">
							{CONSENT_TYPE_LABELS[consent.consentType] ?? consent.consentType}
						</span>{" "}
						consent signed by <span className="font-medium">{consent.signedByName}</span>. This
						action cannot be undone.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="space-y-1.5">
						<Label htmlFor="revoke-reason">Reason for Revocation (optional)</Label>
						<Textarea
							id="revoke-reason"
							rows={3}
							placeholder="Describe why this consent is being revoked…"
							value={reason}
							onChange={e => setReason(e.target.value)}
						/>
					</div>

					<div className="flex items-start gap-2">
						<Checkbox
							id="revoke-confirm"
							checked={confirmed}
							onCheckedChange={v => setConfirmed(!!v)}
						/>
						<label htmlFor="revoke-confirm" className="cursor-pointer text-sm leading-snug">
							I confirm that I have the authority to revoke this consent and understand that the
							patient&apos;s data processing rights under RA 10173 will be updated accordingly.
						</label>
					</div>

					{revoke.error && (
						<div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
							{String(revoke.error)}
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => handleClose(false)} disabled={revoke.isPending}>
						Cancel
					</Button>
					<Button variant="destructive" onClick={handleSubmit} disabled={!isValid}>
						{revoke.isPending ? "Revoking…" : "Revoke Consent"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
