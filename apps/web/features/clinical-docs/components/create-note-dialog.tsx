"use client"

import { useState } from "react"
import { X } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
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
	useIcd10ProblemSearchQuery,
	type Icd10SearchResult,
} from "@/features/problems-allergies/api/problems-allergies.hooks"

import { requiresTemplate, TemplateSelector, type NoteTypeValue } from "./template-selector"

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

function normalizeDiagnoses(diagnoses: DiagnosisEntry[]) {
	return diagnoses.filter(
		diagnosis =>
			diagnosis.code.trim() &&
			diagnoses.findIndex(item => item.code === diagnosis.code) === diagnoses.indexOf(diagnosis)
	)
}

function Icd10DiagnosisPicker({
	value,
	onChange,
}: {
	value: DiagnosisEntry[]
	onChange: (value: DiagnosisEntry[]) => void
}) {
	const [open, setOpen] = useState(false)
	const [inputValue, setInputValue] = useState("")
	const query = useIcd10ProblemSearchQuery({
		search: inputValue.trim(),
		limit: 10,
		includeEmptySearch: open,
	})
	const results = query.data?.data ?? []

	function selectResult(result: Icd10SearchResult) {
		if (!value.some(diagnosis => diagnosis.code === result.code)) {
			onChange(
				normalizeDiagnoses([
					...value,
					{
						code: result.code,
						description: result.description,
					},
				])
			)
		}
		setInputValue("")
		setOpen(false)
	}

	function removeDiagnosis(code: string) {
		onChange(normalizeDiagnoses(value.filter(diagnosis => diagnosis.code !== code)))
	}

	function closeSearchAfterSelectionChance() {
		window.setTimeout(() => setOpen(false), 100)
	}

	return (
		<div className="space-y-2">
			<div className="flex flex-wrap items-center gap-2">
				<Label>ICD-10 Diagnoses</Label>
				<Badge variant="secondary" className="text-xs">
					Required before signing
				</Badge>
			</div>
			<p className="text-muted-foreground text-xs">
				Search by diagnosis words or ICD-10 code. Drafts may be created without an ICD-10 diagnosis.
			</p>
			<div className="relative z-30">
				<Input
					value={inputValue}
					onChange={event => {
						setInputValue(event.target.value)
						setOpen(true)
					}}
					onFocus={() => setOpen(true)}
					onBlur={closeSearchAfterSelectionChance}
					onKeyDown={event => {
						if (event.key === "Escape") setOpen(false)
						if (event.key === "Enter" && results[0]) {
							event.preventDefault()
							selectResult(results[0])
						}
					}}
					placeholder="Search disease, diagnosis, or ICD-10 code..."
					autoComplete="off"
				/>
				{open && (
					<div className="bg-popover text-popover-foreground ring-foreground/10 absolute z-[100] mt-1 max-h-64 w-full overflow-y-auto rounded-md border p-1 text-sm shadow-md ring-1">
						{query.isFetching ? (
							<div className="text-muted-foreground px-3 py-3">Searching ICD-10...</div>
						) : results.length > 0 ? (
							results.map(result => (
								<button
									key={result.id}
									type="button"
									className="hover:bg-muted focus:bg-muted block w-full rounded-sm px-3 py-2 text-left outline-hidden"
									onMouseDown={event => event.preventDefault()}
									onClick={() => selectResult(result)}
								>
									<span className="block font-mono text-xs font-semibold">{result.code}</span>
									<span className="block">{result.description}</span>
									{result.category && (
										<span className="text-muted-foreground block text-xs">{result.category}</span>
									)}
								</button>
							))
						) : (
							<div className="text-muted-foreground px-3 py-3">No ICD-10 matches</div>
						)}
					</div>
				)}
			</div>
			{value.length > 0 ? (
				<div className="space-y-2">
					{value.map(diagnosis => (
						<div
							key={diagnosis.code}
							className="bg-primary/5 border-primary/20 flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm"
						>
							<div className="min-w-0">
								<span className="font-mono text-xs font-semibold">{diagnosis.code}</span>
								<p className="text-muted-foreground mt-1">{diagnosis.description}</p>
							</div>
							<Button
								type="button"
								size="icon"
								variant="ghost"
								className="size-7 shrink-0"
								aria-label={`Remove ${diagnosis.code}`}
								onClick={() => removeDiagnosis(diagnosis.code)}
							>
								<X className="size-3" />
							</Button>
						</div>
					))}
				</div>
			) : (
				<p className="text-muted-foreground text-xs">
					Add at least one ICD-10 diagnosis before signing this consultation note.
				</p>
			)}
		</div>
	)
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

	function handleTemplateChange(id: string, tpl: SelectedTemplate | null) {
		setTemplateId(id)
		setSelectedTemplate(tpl)
		// Pre-populate content from template sections
		if (tpl) {
			setContent(tpl.sections.map(s => `## ${s.label}\n\n${s.defaultContent ?? ""}`).join("\n\n"))
		} else {
			setContent("")
		}
	}

	function handleSubmit() {
		if (!noteType) return
		const validDiagnoses = normalizeDiagnoses(diagnoses)
		const firstDiagnosis = validDiagnoses[0]
		createNote.mutate(
			{
				facilityId,
				encounterId,
				templateId: templateId || undefined,
				noteType: noteType as NoteTypeValue,
				content,
				structuredData: firstDiagnosis
					? {
							diagnoses: validDiagnoses,
							icd10_diagnosis: {
								icd10Code: firstDiagnosis.code,
								icd10Display: firstDiagnosis.description,
							},
						}
					: undefined,
			},
			{
				onSuccess: () => {
					resetForm()
					onOpenChange(false)
				},
			}
		)
	}

	const canSubmit = !!noteType && !requiresTemplate(noteType, templateId) && !createNote.isPending

	return (
		<Dialog
			open={open}
			onOpenChange={v => {
				if (!v) resetForm()
				onOpenChange(v)
			}}
		>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>Create Clinical Note</DialogTitle>
					<DialogDescription>
						Select a note type and choose a template. Admission Notes, Discharge Summaries, FPE
						notes, and Consultation notes require a template. Consultation notes use the SOAP
						structure (Subjective, Objective, Assessment, Plan).
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
							<Icd10DiagnosisPicker value={diagnoses} onChange={setDiagnoses} />
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
