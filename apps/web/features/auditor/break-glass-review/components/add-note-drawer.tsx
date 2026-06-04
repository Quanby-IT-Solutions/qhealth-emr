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
import { useAddNoteMutation } from "@/features/auditor/break-glass-review/api/break-glass.hooks"

interface AddNoteDrawerProps {
	open: boolean
	eventId: string
	onClose: () => void
}

export function AddNoteDrawer({ open, eventId, onClose }: AddNoteDrawerProps) {
	const [note, setNote] = useState("")
	const [error, setError] = useState<string | null>(null)
	const mutation = useAddNoteMutation()

	function handleSubmit() {
		setError(null)
		mutation.mutate(
			{ eventId, reason: note.trim() },
			{
				onSuccess: () => {
					setNote("")
					onClose()
				},
				onError: err => setError(err instanceof Error ? err.message : "Failed to add note"),
			}
		)
	}

	function handleClose() {
		setNote("")
		setError(null)
		onClose()
	}

	return (
		<Sheet open={open} onOpenChange={open => !open && handleClose()}>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>Add Note</SheetTitle>
					<SheetDescription>
						Add an informational note to this break-glass event. Minimum 10 characters required.
					</SheetDescription>
				</SheetHeader>

				<div className="space-y-4 px-4 py-6">
					<div className="space-y-2">
						<Label htmlFor="add-note-text">
							Note <span className="text-muted-foreground">(min 10 characters)</span>
						</Label>
						<Textarea
							id="add-note-text"
							placeholder="Enter your note about this event..."
							value={note}
							onChange={e => setNote(e.target.value)}
							rows={5}
						/>
						{note.length > 0 && note.length < 10 && (
							<p className="text-destructive text-xs">
								{10 - note.length} more character(s) required
							</p>
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
					<Button onClick={handleSubmit} disabled={mutation.isPending || note.trim().length < 10}>
						{mutation.isPending ? "Saving..." : "Save Note"}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	)
}
