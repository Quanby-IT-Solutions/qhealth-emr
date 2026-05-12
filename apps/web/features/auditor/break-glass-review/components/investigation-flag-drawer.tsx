"use client"

import { useState } from "react"

import { Button } from "@/core/components/ui/button"
import { Label } from "@/core/components/ui/label"
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/core/components/ui/sheet"
import { Textarea } from "@/core/components/ui/textarea"

import { useFlagMutation } from "@/features/auditor/break-glass-review/api/break-glass.hooks"

interface InvestigationFlagDrawerProps {
	open: boolean
	eventId: string
	onClose: () => void
}

export function InvestigationFlagDrawer({ open, eventId, onClose }: InvestigationFlagDrawerProps) {
	const [reason, setReason] = useState("")
	const [error, setError] = useState<string | null>(null)
	const mutation = useFlagMutation()

	function handleSubmit() {
		setError(null)
		mutation.mutate(
			{ eventId, reason: reason.trim() },
			{
				onSuccess: () => {
					setReason("")
					onClose()
				},
				onError: err => setError(err instanceof Error ? err.message : "Failed to flag event"),
			}
		)
	}

	function handleClose() {
		setReason("")
		setError(null)
		onClose()
	}

	return (
		<Sheet open={open} onOpenChange={open => !open && handleClose()}>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>Flag for Investigation</SheetTitle>
					<SheetDescription>
						Flag this break-glass access as requiring investigation. Provide a detailed reason.
						Minimum 10 characters required.
					</SheetDescription>
				</SheetHeader>

				<div className="space-y-4 px-4 py-6">
					<div className="space-y-2">
						<Label htmlFor="flag-reason">
							Investigation Reason <span className="text-muted-foreground">(min 10 characters)</span>
						</Label>
						<Textarea
							id="flag-reason"
							placeholder="Describe why this access requires investigation..."
							value={reason}
							onChange={e => setReason(e.target.value)}
							rows={5}
						/>
						{reason.length > 0 && reason.length < 10 && (
							<p className="text-xs text-destructive">{10 - reason.length} more character(s) required</p>
						)}
					</div>

					{error && (
						<div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
							{error}
						</div>
					)}
				</div>

				<SheetFooter className="px-4">
					<Button variant="outline" onClick={handleClose} disabled={mutation.isPending}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={handleSubmit}
						disabled={mutation.isPending || reason.trim().length < 10}
					>
						{mutation.isPending ? "Flagging..." : "Flag for Investigation"}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	)
}
