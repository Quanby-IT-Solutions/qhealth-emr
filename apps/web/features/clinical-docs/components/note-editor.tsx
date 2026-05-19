"use client"

import { useEffect, useMemo, useState } from "react"
import {
	AlertCircle,
	ArrowLeft,
	CheckCircle2,
	Clock3,
	FlaskConical,
	HeartPulse,
	Keyboard,
	ListPlus,
	Mic,
	Save,
	ShieldAlert,
	Stethoscope,
	X,
} from "lucide-react"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/core/components/ui/command"
import { Label } from "@/core/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover"
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
import {
	useIcd10ProblemSearchQuery,
	type Icd10SearchResult,
} from "@/features/problems-allergies/api/problems-allergies.hooks"

import { NOTE_TYPE_LABELS } from "./template-selector"
import type { AuthoringTemplate } from "./template-selector-page"

interface NoteEditorProps {
	encounterId: string
	facilityId: string
	template: AuthoringTemplate
	onBack: () => void
	onDone: () => void
}

interface Icd10Diagnosis {
	icd10Code: string
	icd10Display: string
}

type StructuredDataValue = string | Icd10Diagnosis | undefined
type StructuredData = Record<string, StructuredDataValue>
type InsertSource = "vitals" | "allergies" | "labs"

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

function initialStructuredData(sections: TemplateSection[]): StructuredData {
	return Object.fromEntries(
		sections.map(section => [section.key, section.defaultContent ?? ""])
	)
}

function sectionText(data: StructuredData, key: string) {
	const value = data[key]
	return typeof value === "string" ? value : ""
}

function composeNoteContent(sections: TemplateSection[], data: StructuredData) {
	return sections
		.map(section => `## ${section.label}\n\n${sectionText(data, section.key).trim()}`)
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

function sourcePattern(source: InsertSource) {
	switch (source) {
		case "vitals":
			return /(^|\n\n)Vitals \([^\n]*\): [^\n]*(?=\n\n|$)/m
		case "allergies":
			return /(^|\n\n)Active allergies: [^\n]*(?=\n\n|$)/m
		case "labs":
			return /(^|\n\n)Recent labs:\n[\s\S]*?(?=\n\n|$)/m
	}
}

function upsertSourceBlock(existing: string, source: InsertSource, nextText: string) {
	const current = existing.trim()
	const next = nextText.trim()
	if (!next) return current

	const pattern = sourcePattern(source)
	if (pattern.test(current)) {
		return current.replace(pattern, (_match, prefix: string) => `${prefix}${next}`)
	}

	return [current, next].filter(Boolean).join("\n\n")
}

function hasSourceBlock(existing: string, source: InsertSource, text: string) {
	const current = existing.trim()
	const next = text.trim()
	if (!current || !next) return false
	const match = sourcePattern(source).exec(current)
	if (!match) return false
	return match[0].trim() === next
}

function isIcd10Diagnosis(value: StructuredDataValue): value is Icd10Diagnosis {
	return (
		!!value &&
		typeof value === "object" &&
		"icd10Code" in value &&
		"icd10Display" in value
	)
}

function shouldRenderIcd10Field(template: AuthoringTemplate, sections: TemplateSection[]) {
	if (template.category === "fpe" || template.category === "consultation") return true
	const sectionKeys = new Set(sections.map(section => section.key.toLowerCase()))
	return (
		sectionKeys.has("subjective") &&
		sectionKeys.has("objective") &&
		sectionKeys.has("assessment") &&
		sectionKeys.has("plan")
	)
}

function Icd10DiagnosisField({
	value,
	onChange,
}: {
	value: Icd10Diagnosis | null
	onChange: (value: Icd10Diagnosis | null) => void
}) {
	const [open, setOpen] = useState(false)
	const [inputValue, setInputValue] = useState(
		value ? `${value.icd10Code} - ${value.icd10Display}` : ""
	)
	const searchTerm = inputValue.trim()
	const query = useIcd10ProblemSearchQuery({ search: searchTerm, limit: 10 })
	const results = query.data?.data ?? []

	function selectResult(result: Icd10SearchResult) {
		onChange({ icd10Code: result.code, icd10Display: result.description })
		setInputValue(`${result.code} - ${result.description}`)
		setOpen(false)
	}

	return (
		<Card className="rounded-lg">
			<CardHeader className="pb-2">
				<CardTitle className="text-sm">
					ICD-10 Diagnosis <span className="text-destructive">*</span>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-2">
				<p className="text-muted-foreground text-xs">
					Search by keyword or ICD-10 code, for example pneumonia or J18.
				</p>
				<Popover open={open} onOpenChange={setOpen}>
					<Command shouldFilter={false} className="h-auto w-full overflow-visible bg-transparent p-0">
						<PopoverTrigger render={<div className="w-full" />}>
							<CommandInput
								data-element-id="icd10-search"
								value={inputValue}
								onValueChange={nextValue => {
									setInputValue(nextValue)
									if (value) onChange(null)
									setOpen(nextValue.trim().length >= 2)
								}}
								onFocus={() => setOpen(searchTerm.length >= 2)}
								placeholder="Search ICD-10 codes..."
							/>
						</PopoverTrigger>
						<PopoverContent align="start" className="w-(--anchor-width) p-0">
							<CommandList>
								{query.isFetching ? (
									<div className="text-muted-foreground px-3 py-4 text-sm">Searching ICD-10...</div>
								) : (
									<>
										<CommandEmpty>No ICD-10 matches</CommandEmpty>
										<CommandGroup>
											{results.map(result => (
												<CommandItem
													key={result.id}
													value={result.id}
													onSelect={() => selectResult(result)}
													className="items-start py-2"
												>
													<div className="flex min-w-0 flex-col">
														<span className="font-mono text-xs font-semibold">{result.code}</span>
														<span className="text-sm">{result.description}</span>
														{result.category && (
															<span className="text-muted-foreground text-xs">{result.category}</span>
														)}
													</div>
												</CommandItem>
											))}
										</CommandGroup>
									</>
								)}
							</CommandList>
						</PopoverContent>
					</Command>
				</Popover>
				{value && (
					<Badge variant="secondary" className="gap-1.5">
						<span className="font-mono">{value.icd10Code}</span>
						<span>- {value.icd10Display}</span>
						<button
							type="button"
							aria-label="Clear ICD-10 diagnosis"
							onClick={() => {
								onChange(null)
								setInputValue("")
							}}
							className="text-muted-foreground hover:text-foreground"
						>
							<X className="size-3" />
						</button>
					</Badge>
				)}
			</CardContent>
		</Card>
	)
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
						aria-label={label}
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
	const [structuredData, setStructuredData] = useState<StructuredData>(() =>
		initialStructuredData(sections)
	)
	const [noteId, setNoteId] = useState<string | null>(null)
	const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
	const [hasLocalChanges, setHasLocalChanges] = useState(false)
	const [isDraftCreateLocked, setIsDraftCreateLocked] = useState(false)

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

	const assessmentText = assessmentKey ? sectionText(structuredData, assessmentKey).trim() : ""
	const planText = planKey ? sectionText(structuredData, planKey).trim() : ""
	const missingRequiredSections = [
		!assessmentText ? "Assessment" : null,
		!planText ? "Plan" : null,
	].filter(Boolean)
	const selectedIcd10 = isIcd10Diagnosis(structuredData.icd10_diagnosis)
		? structuredData.icd10_diagnosis
		: null
	const showIcd10Field = shouldRenderIcd10Field(template, sections)
	const isSaving = createNote.isPending || updateNote.isPending
	const isSaveBlocked = isSaving || isDraftCreateLocked
	const hasRequiredSections = missingRequiredSections.length === 0
	const canSave = hasRequiredSections && !isSaveBlocked && (!noteId || hasLocalChanges)

	function updateSection(key: string, value: string) {
		setStructuredData(prev => ({ ...prev, [key]: value }))
		setHasLocalChanges(true)
	}

	function updateIcd10Diagnosis(value: Icd10Diagnosis | null) {
		setStructuredData(prev => {
			const next = { ...prev }
			if (value) {
				next.icd10_diagnosis = value
			} else {
				delete next.icd10_diagnosis
			}
			return next
		})
		setHasLocalChanges(true)
	}

	function sectionHasSourceBlock(key: string | undefined, source: InsertSource, text: string) {
		if (!key) return false
		return hasSourceBlock(sectionText(structuredData, key), source, text)
	}

	function insertIntoSection(key: string | undefined, text: string, source?: InsertSource) {
		if (!key) return
		setStructuredData(prev => ({
			...prev,
			[key]: source
				? upsertSourceBlock(sectionText(prev, key), source, text)
				: [sectionText(prev, key).trim(), text.trim()].filter(Boolean).join("\n\n"),
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
			setIsDraftCreateLocked(true)
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
					onSettled: () => {
						setIsDraftCreateLocked(false)
					},
				}
			)
			return
		}

		updateNote.mutate({ id: noteId, content, structuredData }, { onSuccess: markSaved })
	}

	useEffect(() => {
		if (!noteId || !hasLocalChanges || !hasRequiredSections || isSaving) return
		const timeout = window.setTimeout(() => {
			updateNote.mutate({ id: noteId, content, structuredData }, { onSuccess: markSaved })
		}, 1200)

		return () => window.clearTimeout(timeout)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [content, hasLocalChanges, hasRequiredSections, isSaving, noteId, structuredData])

	const saveError = createNote.error?.message ?? updateNote.error?.message
	const context = noteContext.data
	const saveButtonLabel = isSaving || isDraftCreateLocked
		? "Saving..."
		: noteId
			? hasLocalChanges
				? "Save Changes"
				: "Saved"
			: "Save Draft"
	const saveStatus = saveError
		? saveError
		: isSaving || isDraftCreateLocked
			? "Saving..."
			: hasLocalChanges
				? hasRequiredSections
					? noteId
						? "Unsaved changes - autosave pending"
						: "Unsaved draft"
					: "Unsaved changes - complete required fields to save"
				: lastSavedAt
					? `Saved ${formatDateTime(lastSavedAt)}`
					: "Not saved"
	const latestVitalsText = context?.latestVitals ? vitalLine(context.latestVitals) : ""
	const allergiesText = context ? allergyLine(context) : ""
	const labsText = context ? labLine(context) : ""

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
							{saveError ? (
								<>
									<AlertCircle className="text-destructive size-3.5" />
									<span>{saveStatus}</span>
								</>
							) : isSaving ? (
								<>
									<Clock3 className="size-3.5" />
									<span>{saveStatus}</span>
								</>
							) : lastSavedAt && !hasLocalChanges ? (
								<>
									<CheckCircle2 className="size-3.5 text-green-600" />
									<span>{saveStatus}</span>
								</>
							) : (
								<>
									<Clock3 className="size-3.5" />
									<span>{saveStatus}</span>
								</>
							)}
						</div>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{noteId && (
						<Button type="button" variant="outline" onClick={onDone}>
							Done
						</Button>
					)}
					<Button
						type="button"
						onClick={handleSave}
						disabled={!canSave}
						variant={noteId && !hasLocalChanges && !isSaveBlocked ? "outline" : "default"}
						className="gap-2"
					>
						{noteId && !hasLocalChanges && !isSaveBlocked ? (
							<CheckCircle2 className="size-4" />
						) : (
							<Save className="size-4" />
						)}
						{saveButtonLabel}
					</Button>
				</div>
			</div>

			{missingRequiredSections.length > 0 && (
				<Alert variant="destructive">
					<AlertCircle className="size-4" />
					<AlertDescription>
						Complete {missingRequiredSections.join(" and ")} before saving this draft.
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
						<div key={section.key} className="space-y-3">
							{showIcd10Field && section.key === assessmentKey && (
								<Icd10DiagnosisField value={selectedIcd10} onChange={updateIcd10Diagnosis} />
							)}
							<Card className="rounded-lg">
								<CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
									<CardTitle className="text-sm">
										{section.label}
										{(section.key === assessmentKey || section.key === planKey) && (
											<span className="text-destructive"> *</span>
										)}
									</CardTitle>
									<div className="flex items-center gap-1">
										<Tooltip>
											<TooltipTrigger
												render={
													<Button
														type="button"
														size="icon"
														variant="ghost"
														aria-label={`Voice-to-text for ${section.label} (coming soon)`}
														disabled
													/>
												}
											>
												<Mic className="size-4" />
											</TooltipTrigger>
											<TooltipContent>Voice-to-text — coming soon</TooltipContent>
										</Tooltip>
										<Tooltip>
											<TooltipTrigger
												render={
													<Button
														type="button"
														size="icon"
														variant="ghost"
														aria-label={`Dot-phrases for ${section.label} (coming soon)`}
														disabled
													/>
												}
											>
												<Keyboard className="size-4" />
											</TooltipTrigger>
											<TooltipContent>Dot-phrases (.hpi, .ros…) — coming soon</TooltipContent>
										</Tooltip>
									</div>
								</CardHeader>
								<CardContent>
									<Label className="sr-only" htmlFor={`note-section-${section.key}`}>
										{section.label}
									</Label>
									<Textarea
										id={`note-section-${section.key}`}
										value={sectionText(structuredData, section.key)}
										onChange={event => updateSection(section.key, event.target.value)}
										rows={section.key === "assessment" || section.key === "plan" ? 5 : 4}
										className="min-h-28 resize-y"
									/>
									{section.key === assessmentKey && !assessmentText && (
										<p className="text-destructive mt-2 text-xs">
											Assessment is required before this draft can be saved.
										</p>
									)}
									{section.key === planKey && !planText && (
										<p className="text-destructive mt-2 text-xs">
											Plan is required before this draft can be saved.
										</p>
									)}
								</CardContent>
							</Card>
						</div>
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
											disabled={
												!context.latestVitals ||
												!objectiveKey ||
												sectionHasSourceBlock(objectiveKey, "vitals", latestVitalsText)
											}
											onClick={() =>
												context.latestVitals &&
												insertIntoSection(objectiveKey, latestVitalsText, "vitals")
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

								{showIcd10Field && (
									<>
										<div className="space-y-2">
											<div className="flex items-center gap-2 text-sm font-medium">
												<Stethoscope className="size-4 text-blue-600" />
												ICD-10 Diagnosis
											</div>
											{selectedIcd10 ? (
												<Badge variant="secondary" className="max-w-full justify-start gap-1.5 whitespace-normal text-left">
													<span className="font-mono">{selectedIcd10.icd10Code}</span>
													<span>- {selectedIcd10.icd10Display}</span>
												</Badge>
											) : (
												<p className="text-muted-foreground text-sm">No ICD-10 diagnosis selected.</p>
											)}
										</div>

										<Separator />
									</>
								)}

								<div className="space-y-2">
									<div className="flex items-center justify-between gap-2">
										<div className="flex items-center gap-2 text-sm font-medium">
											<ShieldAlert className="size-4 text-amber-600" />
											Allergies
										</div>
										<InsertButton
											label="Insert allergies into Subjective"
											disabled={
												!subjectiveKey ||
												sectionHasSourceBlock(subjectiveKey, "allergies", allergiesText)
											}
											onClick={() => insertIntoSection(subjectiveKey, allergiesText, "allergies")}
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
											disabled={
												context.recentLabs.length === 0 ||
												!objectiveKey ||
												sectionHasSourceBlock(objectiveKey, "labs", labsText)
											}
											onClick={() => insertIntoSection(objectiveKey, labsText, "labs")}
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
