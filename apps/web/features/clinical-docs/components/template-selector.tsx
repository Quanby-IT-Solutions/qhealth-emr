"use client"

import { AlertCircle, CheckCircle2, FileText } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { useNoteTemplatesQuery } from "@/features/clinical-docs/api/clinical-docs.hooks"

/** Note types that REQUIRE a template to be chosen before creation. */
const TEMPLATE_REQUIRED_TYPES = new Set(["admission", "discharge_summary", "fpe"])

/** Human-readable note type labels. */
export const NOTE_TYPE_LABELS: Record<string, string> = {
	admission: "Admission Note (H&P)",
	progress: "Progress Note",
	consultation: "Consultation",
	discharge_summary: "Discharge Summary",
	fpe: "FPE / Konsulta",
}

export type NoteTypeValue = "admission" | "progress" | "consultation" | "discharge_summary" | "fpe"

interface TemplateSection {
	key: string
	label: string
	type: "rich_text" | "structured"
	defaultContent?: string
}

interface NoteTemplate {
	id: string
	name: string
	category: NoteTypeValue
	sections: TemplateSection[]
	isActive: boolean
}

interface TemplateSelectorProps {
	facilityId: string
	noteType: NoteTypeValue | ""
	templateId: string
	onNoteTypeChange: (type: NoteTypeValue) => void
	onTemplateChange: (templateId: string, template: NoteTemplate | null) => void
}

/**
 * Composite selector for note type + template.
 * H&P (admission), Discharge Summary, and FPE require a template; Progress Notes allow free text.
 */
export function TemplateSelector({
	facilityId,
	noteType,
	templateId,
	onNoteTypeChange,
	onTemplateChange,
}: TemplateSelectorProps) {
	const { data: templatesData } = useNoteTemplatesQuery({
		facilityId,
		category: noteType || undefined,
		isActive: true,
	})
	const templates: NoteTemplate[] = (templatesData?.data ?? []) as NoteTemplate[]

	const isRequired = noteType ? TEMPLATE_REQUIRED_TYPES.has(noteType) : false
	const selectedTemplate = templates.find(t => t.id === templateId) ?? null

	function handleNoteTypeChange(val: string) {
		onNoteTypeChange(val as NoteTypeValue)
		// Clear template when type changes
		onTemplateChange("", null)
	}

	function handleTemplateChange(val: string) {
		const tpl = templates.find(t => t.id === val) ?? null
		onTemplateChange(val ?? "", tpl)
	}

	return (
		<div className="space-y-4">
			{/* Note Type */}
			<div className="space-y-2">
				<Label>
					Note Type <span className="text-destructive">*</span>
				</Label>
				<Select value={noteType} onValueChange={handleNoteTypeChange}>
					<SelectTrigger>
						<SelectValue placeholder="Select note type…" />
					</SelectTrigger>
					<SelectContent>
						{(Object.keys(NOTE_TYPE_LABELS) as NoteTypeValue[]).map(type => (
							<SelectItem key={type} value={type}>
								<span className="flex items-center gap-2">
									{NOTE_TYPE_LABELS[type]}
									{TEMPLATE_REQUIRED_TYPES.has(type) && (
										<Badge variant="secondary" className="text-xs">
											Template required
										</Badge>
									)}
								</span>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Template picker — shown when a note type is selected */}
			{noteType && (
				<div className="space-y-2">
					<div className="flex items-center gap-2">
						<Label>Template</Label>
						{isRequired ? (
							<Badge variant="destructive" className="gap-1 text-xs">
								<AlertCircle className="size-3" />
								Required
							</Badge>
						) : (
							<Badge variant="outline" className="text-xs">
								Optional — free text allowed
							</Badge>
						)}
					</div>

					{templates.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							{isRequired
								? "No templates available for this note type. Please create a template first."
								: "No saved templates. You may enter free text below."}
						</p>
					) : (
						<div className="space-y-2">
							{/* Show template cards for easy visual selection */}
							<div className="grid gap-2">
								{/* "No template" option for non-required types */}
								{!isRequired && (
									<Button
										type="button"
										variant={!templateId ? "default" : "outline"}
										className="h-auto justify-start px-3 py-2 text-left"
										onClick={() => onTemplateChange("", null)}
									>
										<FileText className="mr-2 size-4 shrink-0" />
										<div>
											<p className="text-sm font-medium">Free Text</p>
											<p className="text-muted-foreground text-xs font-normal">
												Write without a structured template
											</p>
										</div>
									</Button>
								)}
								{templates.map(tpl => (
									<Card
										key={tpl.id}
										className={`cursor-pointer transition-colors hover:border-primary ${
											templateId === tpl.id
												? "border-primary bg-primary/5"
												: ""
										}`}
										onClick={() => handleTemplateChange(tpl.id)}
									>
										<CardHeader className="pb-1 pt-3">
											<CardTitle className="flex items-center justify-between text-sm">
												<span className="flex items-center gap-2">
													{templateId === tpl.id ? (
														<CheckCircle2 className="size-4 text-primary" />
													) : (
														<FileText className="size-4 text-muted-foreground" />
													)}
													{tpl.name}
												</span>
												<Badge variant="secondary" className="text-xs">
													{tpl.sections.length} section
													{tpl.sections.length !== 1 ? "s" : ""}
												</Badge>
											</CardTitle>
										</CardHeader>
										{tpl.sections.length > 0 && (
											<CardContent className="pb-3">
												<CardDescription className="text-xs">
													{tpl.sections.map(s => s.label).join(" · ")}
												</CardDescription>
											</CardContent>
										)}
									</Card>
								))}
							</div>
						</div>
					)}
				</div>
			)}

			{/* Validation hint for required types with no template chosen */}
			{noteType && isRequired && !templateId && (
				<p className="text-destructive flex items-center gap-1 text-sm">
					<AlertCircle className="size-4" />
					Please select a template to continue with this note type.
				</p>
			)}
		</div>
	)
}

/**
 * Returns true when the note type requires a template and none is selected.
 */
export function requiresTemplate(noteType: string, templateId: string): boolean {
	return TEMPLATE_REQUIRED_TYPES.has(noteType) && !templateId
}
