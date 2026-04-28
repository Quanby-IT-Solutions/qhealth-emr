"use client"

import { useEffect, useState } from "react"
import { AlertCircle, ShieldAlert } from "lucide-react"

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
import { useCreateHighAlertVerificationMutation } from "@/features/orders/api/orders.hooks"

export interface HighAlertVerificationDraft {
	verifyingStaffId: string
	notes?: string
}

interface HighAlertVerificationDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	medicationOrderId: string
	requestingStaffId: string
	drugName: string
	onVerified: () => void
	onPrepareVerification?: (draft: HighAlertVerificationDraft) => void
}

export function HighAlertVerificationDialog({
	open,
	onOpenChange,
	medicationOrderId,
	requestingStaffId,
	drugName,
	onVerified,
	onPrepareVerification,
}: HighAlertVerificationDialogProps) {
	const createVerification = useCreateHighAlertVerificationMutation()
	const [verifyingStaffId, setVerifyingStaffId] = useState("")
	const [notes, setNotes] = useState("")
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (!open) {
			setVerifyingStaffId("")
			setNotes("")
			setError(null)
		}
	}, [open])

	function handleSubmit() {
		const trimmedStaffId = verifyingStaffId.trim()
		const trimmedNotes = notes.trim()

		setError(null)

		if (!trimmedStaffId) {
			setError("Second clinician staff ID is required.")
			return
		}

		if (trimmedStaffId === requestingStaffId) {
			setError("A clinician cannot co-sign their own high-alert order.")
			return
		}

		const draft = {
			verifyingStaffId: trimmedStaffId,
			notes: trimmedNotes || undefined,
		}

		if (!medicationOrderId) {
			if (!onPrepareVerification) {
				setError("Medication order ID is required to complete dual verification.")
				return
			}

			onPrepareVerification(draft)
			onVerified()
			onOpenChange(false)
			return
		}

		createVerification.mutate(
			{
				medicationOrderId,
				verifyingStaffId: draft.verifyingStaffId,
				notes: draft.notes,
			},
			{
				onSuccess: () => {
					onVerified()
					onOpenChange(false)
				},
				onError: err => {
					setError(err instanceof Error ? err.message : "Failed to verify high-alert order.")
				},
			}
		)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<ShieldAlert className="size-5 text-purple-600" />
						High-Alert Medication - Dual Verification
					</DialogTitle>
					<DialogDescription>
						This medication requires co-signature by a second clinician before the order can be
						completed.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="rounded-md border border-purple-300 bg-purple-50 px-3 py-2 text-sm text-purple-800 dark:border-purple-700 dark:bg-purple-950 dark:text-purple-300">
						Drug: <span className="font-semibold">{drugName}</span>
					</div>

					<div className="space-y-2">
						<Label htmlFor="verifyingStaffId">Second Clinician Staff ID</Label>
						<Input
							id="verifyingStaffId"
							value={verifyingStaffId}
							onChange={e => setVerifyingStaffId(e.target.value)}
							placeholder="Enter staff ID"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="highAlertNotes">Notes (optional)</Label>
						<Textarea
							id="highAlertNotes"
							value={notes}
							onChange={e => setNotes(e.target.value)}
							rows={3}
							placeholder="Optional co-sign notes"
						/>
					</div>

					{error && (
						<div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
							<AlertCircle className="size-4 shrink-0" />
							<span>{error}</span>
						</div>
					)}
				</div>

				<DialogFooter className="gap-2">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={createVerification.isPending}
						className="bg-purple-600 text-white hover:bg-purple-700"
					>
						{createVerification.isPending ? "Verifying..." : "Co-sign & Verify"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
