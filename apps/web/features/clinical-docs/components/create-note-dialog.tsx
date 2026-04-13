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
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Textarea } from "@/core/components/ui/textarea"
import {
	useCreateNoteMutation,
	useNoteTemplatesQuery,
} from "@/features/clinical-docs/api/clinical-docs.hooks"

const NOTE_TYPES = [
	{ value: "admission", label: "Admission Note" },
	{ value: "progress", label: "Progress Note" },
	{ value: "consultation", label: "Consultation" },
	{ value: "discharge_summary", label: "Discharge Summary" },
	{ value: "fpe", label: "FPE / Konsulta" },
] as const

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
	const [noteType, setNoteType] = useState<string>("")
	const [templateId, setTemplateId] = useState<string>("")
	const [content, setContent] = useState("")

	const { data: templatesData } = useNoteTemplatesQuery({
		facilityId,
		category: noteType || undefined,
		isActive: true,
	})
	const templates = templatesData?.data ?? []

	const createNote = useCreateNoteMutation()

	function resetForm() {
		setNoteType("")
		setTemplateId("")
		setContent("")
	}

	function handleSubmit() {
		if (!noteType) return

		const selectedTemplate = templates.find(t => t.id === templateId)
		const initialContent =
			content ||
			(selectedTemplate
				? selectedTemplate.sections
						.map(s => `## ${s.label}\n\n${s.defaultContent ?? ""}`)
						.join("\n\n")
				: "")

		createNote.mutate(
			{
				facilityId,
				encounterId,
				templateId: templateId || undefined,
				noteType: noteType as "admission" | "progress" | "consultation" | "discharge_summary" | "fpe",
				content: initialContent,
			},
			{
				onSuccess: () => {
					resetForm()
					onOpenChange(false)
				},
			}
		)
	}

	return (
		<Dialog
			open={open}
			onOpenChange={v => {
				if (!v) resetForm()
				onOpenChange(v)
			}}
		>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Create Clinical Note</DialogTitle>
					<DialogDescription>
						Select a note type and optionally choose a template to pre-populate the
						note.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label>Note Type *</Label>
						<Select value={noteType} onValueChange={v => setNoteType(v ?? "")}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{NOTE_TYPES.map(t => (
									<SelectItem key={t.value} value={t.value}>
										{t.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{noteType && templates.length > 0 && (
						<div className="space-y-2">
							<Label>Template (optional)</Label>
							<Select
								value={templateId}
								onValueChange={v => setTemplateId(v ?? "")}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{templates.map(t => (
										<SelectItem key={t.id} value={t.id}>
											{t.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					<div className="space-y-2">
						<Label>Initial Content</Label>
						<Textarea
							placeholder="Enter note content or leave blank to use template defaults…"
							rows={6}
							value={content}
							onChange={e => setContent(e.target.value)}
						/>
					</div>
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
					<Button
						onClick={handleSubmit}
						disabled={!noteType || createNote.isPending}
					>
						{createNote.isPending ? "Creating…" : "Create Draft"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
