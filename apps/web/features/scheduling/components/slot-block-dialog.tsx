"use client"

import { useState } from "react"

import type { ClinicSlot } from "@repo/contracts"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/core/components/ui/field"
import { Input } from "@/core/components/ui/input"

interface SlotBlockDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	slot: ClinicSlot | null
	isPending?: boolean
	onConfirm: (reason: string) => void | Promise<void>
}

export function SlotBlockDialog({
	open,
	onOpenChange,
	slot,
	isPending = false,
	onConfirm,
}: SlotBlockDialogProps) {
	const [reason, setReason] = useState(() => slot?.blockReason ?? "")

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Block slot</DialogTitle>
					<DialogDescription>
						{slot
							? `Record why ${slot.slotStartTime} on ${slot.slotDate} is unavailable.`
							: "Record why this slot is unavailable."}
					</DialogDescription>
				</DialogHeader>

				<form
					className="space-y-4"
					onSubmit={event => {
						event.preventDefault()
						void onConfirm(reason.trim())
					}}
				>
					<Field>
						<FieldLabel htmlFor="slot-block-reason">Reason</FieldLabel>
						<Input
							id="slot-block-reason"
							value={reason}
							maxLength={500}
							onChange={event => setReason(event.target.value)}
							placeholder="Holiday, clinician leave, room maintenance"
						/>
						<FieldDescription>
							Optional, but helpful when teammates review blocked dates later.
						</FieldDescription>
					</Field>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending ? "Blocking..." : "Block slot"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
