"use client"

import {
	ArrowLeft,
	BookOpen,
	CheckCircle2,
	ClipboardList,
	FileBadge,
	FileCheck2,
	FileText,
	Stethoscope,
} from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import {
	useNoteTemplatesQuery,
	type NoteTemplate,
	type TemplateSection,
} from "@/features/clinical-docs/api/clinical-docs.hooks"

import { NOTE_TYPE_LABELS, type NoteTypeValue } from "./template-selector"

export interface AuthoringTemplate {
	id?: string
	name: string
	category: NoteTypeValue
	sections: TemplateSection[]
	isFacilityTemplate: boolean
}

interface TemplateSelectorPageProps {
	facilityId: string
	onSelectTemplate: (template: AuthoringTemplate) => void
	onBack?: () => void
}

const CATEGORY_ORDER: NoteTypeValue[] = [
	"consultation",
	"progress",
	"admission",
	"discharge_summary",
	"fpe",
]

const DEFAULT_SECTIONS: Record<NoteTypeValue, TemplateSection[]> = {
	consultation: [
		{ key: "subjective", label: "Subjective", type: "structured" },
		{ key: "objective", label: "Objective", type: "structured" },
		{ key: "assessment", label: "Assessment", type: "structured" },
		{ key: "plan", label: "Plan", type: "structured" },
	],
	progress: [
		{ key: "subjective", label: "Subjective", type: "structured" },
		{ key: "objective", label: "Objective", type: "structured" },
		{ key: "assessment", label: "Assessment", type: "structured" },
		{ key: "plan", label: "Plan", type: "structured" },
	],
	admission: [
		{ key: "chief_complaint", label: "Chief Complaint", type: "structured" },
		{ key: "history_present_illness", label: "History of Present Illness", type: "structured" },
		{ key: "physical_examination", label: "Physical Examination", type: "structured" },
		{ key: "assessment", label: "Assessment", type: "structured" },
		{ key: "plan", label: "Plan", type: "structured" },
	],
	discharge_summary: [
		{ key: "hospital_course", label: "Hospital Course", type: "structured" },
		{ key: "final_diagnoses", label: "Final Diagnoses", type: "structured" },
		{ key: "assessment", label: "Assessment", type: "structured" },
		{ key: "plan", label: "Discharge Plan", type: "structured" },
	],
	fpe: [
		{ key: "screening_findings", label: "Screening Findings", type: "structured" },
		{ key: "risk_factors", label: "Risk Factors", type: "structured" },
		{ key: "assessment", label: "Assessment", type: "structured" },
		{ key: "plan", label: "Plan", type: "structured" },
	],
}

const DEFAULT_NAMES: Record<NoteTypeValue, string> = {
	consultation: "SOAP Note",
	progress: "Progress Note",
	admission: "Admission Note",
	discharge_summary: "Discharge Summary",
	fpe: "FPE / Konsulta",
}

function categoryIcon(category: NoteTypeValue) {
	switch (category) {
		case "admission":
			return <Stethoscope className="size-4" />
		case "progress":
			return <BookOpen className="size-4" />
		case "consultation":
			return <ClipboardList className="size-4" />
		case "discharge_summary":
			return <FileCheck2 className="size-4" />
		case "fpe":
			return <FileBadge className="size-4" />
		default:
			return <FileText className="size-4" />
	}
}

function defaultTemplate(category: NoteTypeValue): AuthoringTemplate {
	return {
		name: DEFAULT_NAMES[category],
		category,
		sections: DEFAULT_SECTIONS[category],
		isFacilityTemplate: false,
	}
}

function mapTemplate(template: NoteTemplate): AuthoringTemplate {
	return {
		id: template.id,
		name: template.name,
		category: template.category as NoteTypeValue,
		sections: template.sections,
		isFacilityTemplate: true,
	}
}

export function TemplateSelectorPage({
	facilityId,
	onSelectTemplate,
	onBack,
}: TemplateSelectorPageProps) {
	const templatesQuery = useNoteTemplatesQuery({
		facilityId,
		isActive: true,
	})

	const templates = (templatesQuery.data?.data ?? []).filter((template): template is NoteTemplate =>
		CATEGORY_ORDER.includes(template.category as NoteTypeValue)
	)

	const templateCards = CATEGORY_ORDER.flatMap(category => {
		const savedTemplates = templates
			.filter(template => template.category === category)
			.map(mapTemplate)

		return savedTemplates.length > 0 ? savedTemplates : [defaultTemplate(category)]
	})

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-3">
				<div className="flex min-w-0 items-center gap-3">
					{onBack && (
						<Button type="button" variant="outline" size="icon" onClick={onBack}>
							<ArrowLeft className="size-4" />
						</Button>
					)}
					<div className="min-w-0">
						<h2 className="text-lg font-semibold">New Clinical Note</h2>
						<p className="text-muted-foreground text-sm">Choose a structured note template.</p>
					</div>
				</div>
				<Badge variant="outline">{templateCards.length} templates</Badge>
			</div>

			{templatesQuery.isLoading ? (
				<div className="text-muted-foreground rounded-md border px-4 py-8 text-center text-sm">
					Loading templates...
				</div>
			) : (
				<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
					{templateCards.map(template => (
						<Card
							key={`${template.id ?? "default"}-${template.category}`}
							className="hover:border-primary hover:bg-muted/30 cursor-pointer rounded-lg transition-colors"
							onClick={() => onSelectTemplate(template)}
						>
							<CardHeader>
								<CardTitle className="flex items-center justify-between gap-3">
									<span className="flex min-w-0 items-center gap-2">
										<span className="text-primary">{categoryIcon(template.category)}</span>
										<span className="truncate">{template.name}</span>
									</span>
									<CheckCircle2 className="text-muted-foreground size-4 shrink-0" />
								</CardTitle>
								<CardDescription className="flex items-center gap-2">
									<span>{NOTE_TYPE_LABELS[template.category]}</span>
									<Badge variant={template.isFacilityTemplate ? "secondary" : "outline"}>
										{template.isFacilityTemplate ? "Facility" : "Default"}
									</Badge>
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="flex flex-wrap gap-1.5">
									{template.sections.map(section => (
										<Badge key={section.key} variant="outline" className="font-normal">
											{section.label}
										</Badge>
									))}
								</div>
								<Button type="button" className="mt-4 w-full">
									Use Template
								</Button>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	)
}
