"use client"

import { useEffect, useMemo, useState } from "react"
import {
	AlertCircle,
	ArrowLeft,
	CheckCircle2,
	Clock3,
	FlaskConical,
	HeartPulse,
	ListPlus,
	Save,
	ShieldAlert,
} from "lucide-react"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Label } from "@/core/components/ui/label"
import { Separator } from "@/core/components/ui/separator"
import { Textarea } from "@/core/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/components/ui/tooltip"
import {
	useCreateNoteMutation,
	useNoteContextQuery,
	useUpdateNoteMutation,
	type NoteContext,
	type TemplateSection,
} from "@/features/clinical-docs/api/clinical-docs.hooks"

import { NOTE_TYPE_LABELS } from "./template-selector"
import type { AuthoringTemplate } from "./template-selector-page"

interface NoteEditorProps {
	encounterId: string
	facilityId: string
	template: AuthoringTemplate
	onBack: () => void
	onDone: () => void
}

function sectionKeyFromLabel(label: string) {
	return (
		label
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "_")
			.replace(/^_+|_+$/g, "") || "section"
	)
}

function hasSection(sections: TemplateSection[], target: "assessment" | "plan") {
	return sections.some(section => {
		const key = section.key.toLowerCase()
		const label = section.label.toLowerCase()
		return key === target || label === target || key.startsWith(`${target}_`)
	})
}

function ensureRequiredSections(sections: TemplateSection[]) {
	const next = sections.length > 0 ? [...sections] : []
	if (!hasSection(next, "assessment")) {
		next.push({ key: "assessment", label: "Assessment", type: "structured" })
	}
	if (!hasSection(next, "plan")) {
		next.push({ key: "plan", label: "Plan", type: "structured" })
	}
	return next
}

function initialStructuredData(sections: TemplateSection[]) {
	return Object.fromEntries(
		sections.map(section => [section.key, section.defaultContent ?? ""])
	) as Record<string, string>
}

function composeNoteContent(sections: TemplateSection[], data: Record<string, string>) {
	return sections
		.map(section => `## ${section.label}\n\n${data[section.key]?.trim() ?? ""}`)
		.join("\n\n")
}

function findSectionKey(sections: TemplateSection[], preferences: string[]) {
	for (const preference of preferences) {
		const found = sections.find(section => {
			const key = section.key.toLowerCase()
			const label = section.label.toLowerCase()
			return key === preference || key.includes(preference) || label.includes(preference)
		})
		if (found) return found.key
	}
	return sections[0]?.key
}

function formatDateTime(dateStr: string | null | undefined) {
	if (!dateStr) return "-"
	return new Date(dateStr).toLocaleString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

function vitalLine(vitals: NonNullable<NoteContext["latestVitals"]>) {
	const parts = [
		vitals.bpSystolic && vitals.bpDiastolic
			? `BP ${vitals.bpSystolic}/${vitals.bpDiastolic} mmHg`
			: null,
		vitals.heartRate ? `HR ${vitals.heartRate} bpm` : null,
		vitals.respiratoryRate ? `RR ${vitals.respiratoryRate}/min` : null,
		vitals.temperature ? `Temp ${vitals.temperature} C` : null,
		vitals.spo2 ? `SpO2 ${vitals.spo2}%` : null,
		vitals.painScore !== null ? `Pain ${vitals.painScore}/10` : null,
	].filter(Boolean)

	return `Vitals (${formatDateTime(vitals.recordedAt)}): ${parts.join(", ")}`
}

function allergyLine(context: NoteContext) {
	if (context.activeAllergies.length === 0) return "Active allergies: none recorded"
	return `Active allergies: ${context.activeAllergies
		.map(allergy => {
			const details = [allergy.severity, allergy.reactionType].filter(Boolean).join(", ")
			return `${allergy.allergenName}${details ? ` (${details})` : ""}`
		})
		.join("; ")}`
}

function resultItems(results: unknown) {
	if (!results || typeof results !== "object") return []
	const record = results as Record<string, unknown>
	const items = record.items
	if (Array.isArray(items)) {
		return items.flatMap(item => {
			if (!item || typeof item !== "object") return []
			const row = item as Record<string, unknown>
			const name = String(row.testName ?? row.name ?? "").trim()
			const value = row.value !== undefined && row.value !== null ? String(row.value) : ""
			const unit = typeof row.unit === "string" ? row.unit : ""
			const flag = typeof row.flag === "string" && row.flag !== "N" ? ` [${row.flag}]` : ""
			return name && value ? [`${name}: ${value}${unit ? ` ${unit}` : ""}${flag}`] : []
		})
	}

	return Object.entries(record)
		.slice(0, 5)
		.flatMap(([key, value]) =>
			value === null || value === undefined ? [] : [`${key}: ${String(value)}`]
		)
}

function labLine(context: NoteContext) {
	if (context.recentLabs.length === 0) return "Recent labs: none resulted"

	return [
		"Recent labs:",
		...context.recentLabs.slice(0, 5).map(lab => {
			const details = resultItems(lab.results)
			const resultText = details.length > 0 ? details.join(", ") : lab.status
			return `${lab.testName}${lab.panelName ? ` (${lab.panelName})` : ""} - ${resultText}`
		}),
	].join("\n")
}

function InsertButton({
	label,
	disabled,
	onClick,
}: {
	label: string
	disabled?: boolean
	onClick: () => void
}) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						type="button"
						size="icon"
						variant="outline"
						disabled={disabled}
						onClick={onClick}
					/>
				}
			>
				<ListPlus className="size-4" />
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	)
}

export function NoteEditor({ encounterId, facilityId, template, onBack, onDone }: NoteEditorProps) {
	const sections = useMemo(() => ensureRequiredSections(template.sections), [template.sections])
	const [structuredData, setStructuredData] = useState<Record<string, string>>(() =>
		initialStructuredData(sections)
	)
	const [noteId, setNoteId] = useState<string | null>(null)
	const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
	const [hasLocalChanges, setHasLocalChanges] = useState(false)

	const noteContext = useNoteContextQuery(encounterId)
	const createNote = useCreateNoteMutation()
	const updateNote = useUpdateNoteMutation()

	const content = useMemo(
		() => composeNoteContent(sections, structuredData),
		[sections, structuredData]
	)
	const assessmentKey = findSectionKey(sections, ["assessment"])
	const planKey = findSectionKey(sections, ["plan", "discharge_plan"])
	const objectiveKey = findSectionKey(sections, ["objective", "physical", "examination"])
	const subjectiveKey = findSectionKey(sections, ["subjective", "chief", "history"])

	const assessmentText = assessmentKey ? structuredData[assessmentKey]?.trim() : ""
	const planText = planKey ? structuredData[planKey]?.trim() : ""
	const canSave = !!assessmentText && !!planText && !createNote.isPending && !updateNote.isPending

	function updateSection(key: string, value: string) {
		setStructuredData(prev => ({ ...prev, [key]: value }))
		setHasLocalChanges(true)
	}

	function insertIntoSection(key: string | undefined, text: string) {
		if (!key) return
		setStructuredData(prev => ({
			...prev,
			[key]: [prev[key]?.trim(), text.trim()].filter(Boolean).join("\n\n"),
		}))
		setHasLocalChanges(true)
	}

	function markSaved() {
		setLastSavedAt(new Date().toISOString())
		setHasLocalChanges(false)
	}

	function handleSave() {
		if (!canSave) return
		if (!noteId) {
			createNote.mutate(
				{
					facilityId,
					encounterId,
					templateId: template.id,
					noteType: template.category,
					content,
					structuredData,
				},
				{
					onSuccess: note => {
						setNoteId(note.id)
						markSaved()
					},
				}
			)
			return
		}

		updateNote.mutate({ id: noteId, content, structuredData }, { onSuccess: markSaved })
	}

	useEffect(() => {
		if (!noteId || !hasLocalChanges || !canSave) return
		const timeout = window.setTimeout(() => {
			updateNote.mutate({ id: noteId, content, structuredData }, { onSuccess: markSaved })
		}, 1200)

		return () => window.clearTimeout(timeout)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [canSave, content, hasLocalChanges, noteId, structuredData])

	const saveError = createNote.error?.message ?? updateNote.error?.message
	const context = noteContext.data

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex min-w-0 items-center gap-3">
					<Button type="button" variant="outline" size="icon" onClick={onBack}>
						<ArrowLeft className="size-4" />
					</Button>
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<h2 className="truncate text-lg font-semibold">{template.name}</h2>
							<Badge variant="outline">{NOTE_TYPE_LABELS[template.category]}</Badge>
							<Badge variant="secondary">Draft</Badge>
						</div>
						<div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
							{lastSavedAt ? (
								<>
									<CheckCircle2 className="size-3.5 text-green-600" />
									<span>Saved {formatDateTime(lastSavedAt)}</span>
								</>
							) : (
								<>
									<Clock3 className="size-3.5" />
									<span>Not saved</span>
								</>
							)}
							{noteId && hasLocalChanges && <span>Autosave pending</span>}
						</div>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{noteId && (
						<Button type="button" variant="outline" onClick={onDone}>
							Done
						</Button>
					)}
					<Button type="button" onClick={handleSave} disabled={!canSave} className="gap-2">
						<Save className="size-4" />
						{noteId ? "Save" : "Save Draft"}
					</Button>
				</div>
			</div>

			{(!assessmentText || !planText) && (
				<Alert variant="destructive">
					<AlertCircle className="size-4" />
					<AlertDescription>
						Assessment and Plan are required before the draft can be saved.
					</AlertDescription>
				</Alert>
			)}

			{saveError && (
				<Alert variant="destructive">
					<AlertCircle className="size-4" />
					<AlertDescription>{saveError}</AlertDescription>
				</Alert>
			)}

			<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
				<div className="space-y-3">
					{sections.map(section => (
						<Card key={section.key} className="rounded-lg">
							<CardHeader className="pb-2">
								<CardTitle className="text-sm">{section.label}</CardTitle>
							</CardHeader>
							<CardContent>
								<Label className="sr-only" htmlFor={`note-section-${section.key}`}>
									{section.label}
								</Label>
								<Textarea
									id={`note-section-${section.key}`}
									value={structuredData[section.key] ?? ""}
									onChange={event => updateSection(section.key, event.target.value)}
									rows={section.key === "assessment" || section.key === "plan" ? 5 : 4}
									className="min-h-28 resize-y"
								/>
							</CardContent>
						</Card>
					))}
				</div>

				<Card className="h-fit rounded-lg xl:sticky xl:top-4">
					<CardHeader>
						<CardTitle className="text-sm">Chart Context</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{noteContext.isLoading ? (
							<p className="text-muted-foreground text-sm">Loading context...</p>
						) : !context ? (
							<p className="text-muted-foreground text-sm">No chart context available.</p>
						) : (
							<>
								<div className="space-y-2">
									<div className="flex items-center justify-between gap-2">
										<div className="flex items-center gap-2 text-sm font-medium">
											<HeartPulse className="size-4 text-red-600" />
											Vitals
										</div>
										<InsertButton
											label="Insert vitals into Objective"
											disabled={!context.latestVitals || !objectiveKey}
											onClick={() =>
												context.latestVitals &&
												insertIntoSection(objectiveKey, vitalLine(context.latestVitals))
											}
										/>
									</div>
									<p className="text-muted-foreground text-sm whitespace-pre-wrap">
										{context.latestVitals
											? vitalLine(context.latestVitals)
											: "No vitals recorded for this encounter."}
									</p>
								</div>

								<Separator />

								<div className="space-y-2">
									<div className="flex items-center justify-between gap-2">
										<div className="flex items-center gap-2 text-sm font-medium">
											<ShieldAlert className="size-4 text-amber-600" />
											Allergies
										</div>
										<InsertButton
											label="Insert allergies into Subjective"
											disabled={!subjectiveKey}
											onClick={() => insertIntoSection(subjectiveKey, allergyLine(context))}
										/>
									</div>
									<div className="flex flex-wrap gap-1.5">
										{context.activeAllergies.length > 0 ? (
											context.activeAllergies.map(allergy => (
												<Badge
													key={allergy.id}
													variant={allergy.severity === "severe" ? "destructive" : "outline"}
												>
													{allergy.allergenName}
												</Badge>
											))
										) : (
											<p className="text-muted-foreground text-sm">No active allergies.</p>
										)}
									</div>
								</div>

								<Separator />

								<div className="space-y-2">
									<div className="flex items-center justify-between gap-2">
										<div className="flex items-center gap-2 text-sm font-medium">
											<FlaskConical className="size-4 text-blue-600" />
											Labs
										</div>
										<InsertButton
											label="Insert labs into Objective"
											disabled={context.recentLabs.length === 0 || !objectiveKey}
											onClick={() => insertIntoSection(objectiveKey, labLine(context))}
										/>
									</div>
									<div className="space-y-2">
										{context.recentLabs.length > 0 ? (
											context.recentLabs.slice(0, 5).map(lab => (
												<div key={lab.id} className="rounded-md border p-2 text-sm">
													<div className="font-medium">{lab.testName}</div>
													<div className="text-muted-foreground text-xs">
														{formatDateTime(lab.resultedDatetime)}
													</div>
												</div>
											))
										) : (
											<p className="text-muted-foreground text-sm">No resulted labs.</p>
										)}
									</div>
								</div>
							</>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
