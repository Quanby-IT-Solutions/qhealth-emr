"use client"

import { useState } from "react"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Label } from "@/core/components/ui/label"
import { Separator } from "@/core/components/ui/separator"
import { Textarea } from "@/core/components/ui/textarea"
import { useCreateNoteMutation } from "@/features/clinical-docs/api/clinical-docs.hooks"

import {
	requiresTemplate,
	TemplateSelector,
	type NoteTypeValue,
} from "./template-selector"

interface SelectedTemplate {
	id: string
	name: string
	sections: Array<{ key: string; label: string; defaultContent?: string }>
}

interface CreateNoteDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	encounterId: string
	facilityId: string
}

export function CreateNoteDialog({
	open,
	onOpenChange,
	encounterId,
	facilityId,
}: CreateNoteDialogProps) {
	const [noteType, setNoteType] = useState<NoteTypeValue | "">("")
	const [templateId, setTemplateId] = useState<string>("")
	const [selectedTemplate, setSelectedTemplate] = useState<SelectedTemplate | null>(null)
	const [content, setContent] = useState("")

	const createNote = useCreateNoteMutation()

	function resetForm() {
		setNoteType("")
		setTemplateId("")
		setSelectedTemplate(null)
		setContent("")
	}

	function handleTemplateChange(id: string, tpl: SelectedTemplate | null) {
		setTemplateId(id)
		setSelectedTemplate(tpl)
		// Pre-populate content from template sections
		if (tpl) {
			setContent(
				tpl.sections
					.map(s => `## ${s.label}\n\n${s.defaultContent ?? ""}`)
					.join("\n\n")
			)
		} else {
			setContent("")
		}
	}

	function handleSubmit() {
		if (!noteType) return
		createNote.mutate(
			{
				facilityId,
				encounterId,
				templateId: templateId || undefined,
				noteType: noteType as NoteTypeValue,
				content,
			},
			{
				onSuccess: () => {
					resetForm()
					onOpenChange(false)
				},
			}
		)
	}

	const canSubmit =
		!!noteType &&
		!requiresTemplate(noteType, templateId) &&
		!createNote.isPending

	return (
		<Dialog
			open={open}
			onOpenChange={v => {
				if (!v) resetForm()
				onOpenChange(v)
			}}
		>
			<DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Create Clinical Note</DialogTitle>
					<DialogDescription>
						Select a note type and choose a template. Admission Notes, Discharge
						Summaries, and FPE notes require a template.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-5 py-4">
					<TemplateSelector
						facilityId={facilityId}
						noteType={noteType}
						templateId={templateId}
						onNoteTypeChange={type => {
							setNoteType(type)
							setTemplateId("")
							setSelectedTemplate(null)
							setContent("")
						}}
						onTemplateChange={handleTemplateChange}
					/>

					{noteType && (
						<>
							<Separator />
							<div className="space-y-2">
								<Label>Note Content</Label>
								<Textarea
									placeholder={
										selectedTemplate
											? "Sections pre-filled from template. Edit as needed…"
											: "Enter note content…"
									}
									rows={8}
									value={content}
									onChange={e => setContent(e.target.value)}
								/>
							</div>
						</>
					)}
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => {
							resetForm()
							onOpenChange(false)
						}}
					>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={!canSubmit}>
						{createNote.isPending ? "Creating…" : "Create Draft"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
