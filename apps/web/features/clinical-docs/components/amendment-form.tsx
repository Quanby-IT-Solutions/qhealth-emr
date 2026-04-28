"use client"

import { useState } from "react"

import { AlertTriangle, FileText } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Label } from "@/core/components/ui/label"
import { ScrollArea } from "@/core/components/ui/scroll-area"
import { Separator } from "@/core/components/ui/separator"
import { Textarea } from "@/core/components/ui/textarea"
import { useCreateAddendumMutation } from "@/features/clinical-docs/api/clinical-docs.hooks"

interface AmendmentFormProps {
	noteId: string
	originalContent: string
	onSuccess: () => void
	onCancel: () => void
}

/**
 * Addendum-only amendment form.
 *
 * Per legal-defensibility requirements, signed notes are immutable: the
 * original signed text is rendered read-only above and the physician adds a
 * new addendum below with a required reason. The original is never modified.
 */
export function AmendmentForm({
	noteId,
	originalContent,
	onSuccess,
	onCancel,
}: AmendmentFormProps) {
	const [reason, setReason] = useState("")
	const [addendumContent, setAddendumContent] = useState("")

	const createAddendum = useCreateAddendumMutation()

	const canSubmit =
		reason.trim().length > 0 && addendumContent.trim().length > 0 && !createAddendum.isPending

	function handleSubmit() {
		if (!canSubmit) return

		createAddendum.mutate(
			{ noteId, content: addendumContent.trim(), reason: reason.trim() },
			{ onSuccess }
		)
	}

	return (
		<div className="space-y-4">
			{/* Original signed note (read-only) */}
			<div className="space-y-2">
				<Label className="flex items-center gap-2">
					<FileText className="size-4" />
					Original Signed Note (read-only)
				</Label>
				<ScrollArea className="bg-muted/40 h-48 rounded-md border">
					<div className="whitespace-pre-wrap p-3 font-mono text-xs">
						{originalContent || "No content"}
					</div>
				</ScrollArea>
				<p className="text-muted-foreground text-xs">
					The original signed text is permanent and cannot be edited. Document any
					corrections or additions below.
				</p>
			</div>

			<Separator />

			{/* Reason for amendment */}
			<div className="space-y-2">
				<Label>
					Reason for Amendment <span className="text-destructive">*</span>
				</Label>
				<Textarea
					rows={2}
					placeholder="e.g. Medication dosage correction, additional findings documented…"
					value={reason}
					onChange={e => setReason(e.target.value)}
				/>
			</div>

			{/* Addendum content */}
			<div className="space-y-2">
				<Label>
					Addendum <span className="text-destructive">*</span>
				</Label>
				<Textarea
					rows={10}
					placeholder="Document the correction or additional information here. This will be appended to the note as a signed addendum."
					value={addendumContent}
					onChange={e => setAddendumContent(e.target.value)}
					className="font-mono text-sm"
				/>
			</div>

			{/* Warning */}
			<div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/50 dark:bg-amber-950/20">
				<AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
				<p className="text-amber-800 dark:text-amber-300 text-sm">
					This addendum will be appended as a signed entry to the original note.
					The original note remains unchanged in the permanent record. The addendum
					must be signed separately after creation.
				</p>
			</div>

			<Separator />

			<div className="flex justify-end gap-2">
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancel
				</Button>
				<Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
					{createAddendum.isPending ? "Submitting…" : "Create Addendum"}
				</Button>
			</div>

			{createAddendum.isError && (
				<p className="text-destructive text-sm">{createAddendum.error.message}</p>
			)}
		</div>
	)
}
