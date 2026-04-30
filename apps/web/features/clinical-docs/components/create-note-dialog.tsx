"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"

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
import { Separator } from "@/core/components/ui/separator"
import { Textarea } from "@/core/components/ui/textarea"
import { useCreateNoteMutation } from "@/features/clinical-docs/api/clinical-docs.hooks"

import {
	requiresTemplate,
	TemplateSelector,
	type NoteTypeValue,
} from "./template-selector"

interface DiagnosisEntry {
	code: string
	description: string
}

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
	const [diagnoses, setDiagnoses] = useState<DiagnosisEntry[]>([])

	const createNote = useCreateNoteMutation()

	function resetForm() {
		setNoteType("")
		setTemplateId("")
		setSelectedTemplate(null)
		setContent("")
		setDiagnoses([])
	}

	function addDiagnosis() {
		setDiagnoses(prev => [...prev, { code: "", description: "" }])
	}

	function removeDiagnosis(index: number) {
		setDiagnoses(prev => prev.filter((_, i) => i !== index))
	}

	function updateDiagnosis(index: number, field: keyof DiagnosisEntry, value: string) {
		setDiagnoses(prev =>
			prev.map((d, i) => (i === index ? { ...d, [field]: value } : d))
		)
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
		const validDiagnoses = diagnoses.filter(d => d.code.trim() && d.description.trim())
		createNote.mutate(
			{
				facilityId,
				encounterId,
				templateId: templateId || undefined,
				noteType: noteType as NoteTypeValue,
				content,
				structuredData: validDiagnoses.length > 0 ? { diagnoses: validDiagnoses } : undefined,
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
		!createNote.isPending &&
		(noteType !== "consultation" || diagnoses.filter(d => d.code.trim() && d.description.trim()).length > 0)

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
						Summaries, FPE notes, and Consultation notes require a template.
						Consultation notes use the SOAP structure (Subjective, Objective, Assessment, Plan).
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
							setDiagnoses([])
						}}
						onTemplateChange={handleTemplateChange}
					/>

					{noteType === "consultation" && (
					<>
						<Separator />
						<div className="space-y-2">
							<Label>
								ICD-10 Diagnoses <span className="text-destructive">*</span>
							</Label>
							{diagnoses.map((d, i) => (
								<div key={i} className="flex items-center gap-2">
									<Input
										placeholder="Code (e.g. J18.9)"
										value={d.code}
										onChange={e => updateDiagnosis(i, "code", e.target.value)}
										className="w-32 shrink-0"
									/>
									<Input
										placeholder="Description"
										value={d.description}
										onChange={e => updateDiagnosis(i, "description", e.target.value)}
										className="flex-1"
									/>
									<Button
										type="button"
										size="icon"
										variant="ghost"
										className="size-8 shrink-0"
										onClick={() => removeDiagnosis(i)}
									>
										<X className="size-4" />
									</Button>
								</div>
							))}
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={addDiagnosis}
								className="gap-1"
							>
								<Plus className="size-4" />
								Add Diagnosis
							</Button>
							{diagnoses.filter(d => d.code.trim() && d.description.trim()).length === 0 && (
								<p className="text-destructive text-xs">
									At least one ICD-10 diagnosis is required for consultation notes.
								</p>
							)}
						</div>
					</>
				)}

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
