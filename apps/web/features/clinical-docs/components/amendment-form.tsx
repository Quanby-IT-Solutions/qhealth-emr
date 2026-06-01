"use client"

import { useState } from "react"
import { AlertTriangle, FileText } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Label } from "@/core/components/ui/label"
import { ScrollArea } from "@/core/components/ui/scroll-area"
import { Separator } from "@/core/components/ui/separator"
import { Textarea } from "@/core/components/ui/textarea"
import {
	useAddAddendumMutation,
	useSignAddendumMutation,
} from "@/features/clinical-docs/api/clinical-docs.hooks"

interface AmendmentFormProps {
	noteId: string
	originalContent: string
	onSuccess: () => void
	onCancel: () => void
}

/**
 * Addendum-only amendment form.
 *
 * Signed notes are immutable: the original signed text is rendered read-only
 * above and the clinician adds a new addendum below. The original is never
 * modified.
 */
export function AmendmentForm({
	noteId,
	originalContent,
	onSuccess,
	onCancel,
}: AmendmentFormProps) {
	const [reason, setReason] = useState("")
	const [addendumContent, setAddendumContent] = useState("")
	const [signFlowError, setSignFlowError] = useState<string | null>(null)

	const addAddendum = useAddAddendumMutation()
	const signAddendum = useSignAddendumMutation()

	const canSubmit =
		reason.trim().length > 0 &&
		addendumContent.trim().length > 0 &&
		!addAddendum.isPending &&
		!signAddendum.isPending

	function getPayload() {
		return { noteId, content: addendumContent.trim(), reason: reason.trim() }
	}

	function handleSaveDraft() {
		if (!canSubmit) return
		setSignFlowError(null)

		addAddendum.mutate(getPayload(), { onSuccess })
	}

	async function handleSignAddendum() {
		if (!canSubmit) return
		setSignFlowError(null)

		try {
			const addendum = await addAddendum.mutateAsync(getPayload())
			await signAddendum.mutateAsync({ id: addendum.id })
			onSuccess()
		} catch (error) {
			setSignFlowError(error instanceof Error ? error.message : "Unable to sign addendum.")
		}
	}

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label className="flex items-center gap-2">
					<FileText className="size-4" />
					Original Signed Note (read-only)
				</Label>
				<ScrollArea className="bg-muted/40 h-48 rounded-md border">
					<div className="p-3 font-mono text-xs whitespace-pre-wrap">
						{originalContent || "No content"}
					</div>
				</ScrollArea>
				<p className="text-muted-foreground text-xs">
					The original signed text is permanent and cannot be edited. Document any corrections or
					additions below.
				</p>
			</div>

			<Separator />

			<div className="space-y-2">
				<Label>
					Amendment Reason <span className="text-destructive">*</span>
				</Label>
				<Textarea
					rows={2}
					placeholder="e.g. Medication dosage correction, additional findings documented..."
					value={reason}
					onChange={e => setReason(e.target.value)}
				/>
			</div>

			<div className="space-y-2">
				<Label>
					Addendum Text <span className="text-destructive">*</span>
				</Label>
				<Textarea
					rows={10}
					placeholder="Document the correction or additional information here."
					value={addendumContent}
					onChange={e => setAddendumContent(e.target.value)}
					className="font-mono text-sm"
				/>
			</div>

			<div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/50 dark:bg-amber-950/20">
				<AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
				<p className="text-sm text-amber-800 dark:text-amber-300">
					The original note remains unchanged in the permanent record. Saving creates a draft
					addendum; signing creates and locks the addendum.
				</p>
			</div>

			<Separator />

			<div className="flex justify-end gap-2">
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancel
				</Button>
				<Button type="button" variant="outline" onClick={handleSaveDraft} disabled={!canSubmit}>
					{addAddendum.isPending && !signAddendum.isPending ? "Saving..." : "Save Addendum"}
				</Button>
				<Button type="button" onClick={handleSignAddendum} disabled={!canSubmit}>
					{addAddendum.isPending || signAddendum.isPending ? "Signing..." : "Sign Addendum"}
				</Button>
			</div>

			{(addAddendum.isError || signAddendum.isError || signFlowError) && (
				<p className="text-destructive text-sm">
					{signFlowError ??
						signAddendum.error?.message ??
						addAddendum.error?.message ??
						"Unable to save addendum."}
				</p>
			)}
		</div>
	)
}
