"use client"

import { useCallback, useState } from "react"
import { Info } from "lucide-react"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Skeleton } from "@/core/components/ui/skeleton"
import { Textarea } from "@/core/components/ui/textarea"

import { EncounterContextBar } from "@/features/billing/components/encounter-context-bar"
import { XmlPreviewPane } from "@/features/billing/components/xml-preview-pane"
import { useGenerateCf4Mutation, useCf4XmlQuery, useFinalizeCf4Mutation } from "../api/cf4.hooks"
import { CF4_SECTIONS } from "../lib/cf4-sections"
import { SourceNoteDrawer } from "./source-note-drawer"

interface Cf4GenerationPageProps {
	encounterId: string
	facilityId: string
	patientId: string
	existingCf4Id?: string
}

/** Multi-line text fields — rendered as <Textarea> instead of <Input> */
const MULTILINE_FIELDS = new Set(["chiefComplaint", "briefHistory", "managementPlan", "procedures", "secondaryDiagnoses"])

export function Cf4GenerationPage({ encounterId, facilityId, patientId, existingCf4Id }: Cf4GenerationPageProps) {
	const [cf4Id, setCf4Id] = useState(existingCf4Id ?? "")
	const [drawerSection, setDrawerSection] = useState<string | null>(null)
	/** Local overrides applied on top of auto-extracted data */
	const [overrides, setOverrides] = useState<Record<string, string>>({})

	const { mutate: generateCf4, isPending: generating, data: preview, error: generateError } = useGenerateCf4Mutation()
	const { data: xmlData, isLoading: xmlLoading } = useCf4XmlQuery(cf4Id)
	const { mutate: finalizeCf4, isPending: finalizing, error: finalizeError } = useFinalizeCf4Mutation()

	const missingFields = preview?.missingFields ?? []
	const baseExtracted = preview?.extractedData ?? null
	/** Merge auto-extracted with user overrides */
	const extractedData: Record<string, unknown> = {
		...((baseExtracted as Record<string, unknown> | null) ?? {}),
		...Object.fromEntries(Object.entries(overrides).filter(([, v]) => v.trim() !== "")),
	}
	const hasValidationIssues = missingFields.filter(f => !(f in overrides && overrides[f]?.trim())).length > 0

	const handleGenerate = useCallback(() => {
		generateCf4(
			{ facilityId, encounterId, patientId },
			{
				onSuccess: (data) => {
					setCf4Id(data.cf4.id)
				},
			}
		)
	}, [generateCf4, facilityId, encounterId, patientId])

	const handleFinalize = useCallback(() => {
		if (!cf4Id) return
		finalizeCf4({ id: cf4Id })
	}, [finalizeCf4, cf4Id])

	const activeSection = drawerSection
		? CF4_SECTIONS.find(s => s.key === drawerSection) ?? null
		: null

	const drawerSources = activeSection?.fields
		.filter(f => f.key in extractedData)
		.map(f => ({
			field: f.key,
			label: f.label,
			source: f.source ?? "encounter",
			value: String(extractedData[f.key] ?? ""),
		})) ?? []

	return (
		<div className="space-y-4">
			<EncounterContextBar />

			<div className="px-4 grid gap-4 lg:grid-cols-2">
				{/* Left pane: editable form */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h1 className="text-lg font-semibold">CF4 Generation</h1>
						<div className="flex gap-2">
							<Button
								onClick={handleGenerate}
								disabled={generating}
								variant="outline"
								size="sm"
							>
								{generating ? "Generating..." : cf4Id ? "Re-generate" : "Generate CF4"}
							</Button>
							{cf4Id && (
								<Button
									onClick={handleFinalize}
									disabled={finalizing || hasValidationIssues}
									size="sm"
								>
									{finalizing ? "Submitting..." : "Submit to PhilHealth"}
								</Button>
							)}
						</div>
					</div>

					{(generateError || finalizeError) && (
						<Alert variant="destructive">
							<AlertDescription>{String(generateError ?? finalizeError)}</AlertDescription>
						</Alert>
					)}

					{cf4Id && (
						<div className="flex items-center gap-2">
							<Badge
								variant={hasValidationIssues ? "destructive" : "default"}
								className="text-xs"
							>
								{hasValidationIssues
									? `Missing fields (${missingFields.length})`
									: "Ready to submit"}
							</Badge>
							{hasValidationIssues && (
								<span className="text-xs text-muted-foreground">
									{missingFields.slice(0, 3).join(", ")}{missingFields.length > 3 ? ` +${missingFields.length - 3} more` : ""}
								</span>
							)}
						</div>
					)}

					{CF4_SECTIONS.map(section => {
						const isComplete = section.fields
							.filter(f => f.required)
							.every(f => f.key in extractedData && String(extractedData[f.key] ?? "").trim() !== "")

						const autoCount = section.fields.filter(
							f => f.key in extractedData && f.source && f.source !== "manual" && !(f.key in overrides)
						).length

						return (
							<Card key={section.key}>
								<CardHeader className="pb-2">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<CardTitle className="text-sm">{section.label}</CardTitle>
											{autoCount > 0 && (
												<Badge variant="secondary" className="text-[10px] h-4 px-1.5">
													{autoCount} auto
												</Badge>
											)}
										</div>
										<div className="flex items-center gap-1.5">
											{cf4Id && (
												<Badge variant={isComplete ? "default" : "secondary"} className="text-xs">
													{isComplete ? "Complete" : "Incomplete"}
												</Badge>
											)}
											{Object.keys(extractedData).length > 0 && (
												<Button
													variant="ghost"
													size="icon"
													className="size-6"
													onClick={() => setDrawerSection(section.key)}
													aria-label={`View auto-extraction sources for ${section.label}`}
												>
													<Info className="size-3" />
												</Button>
											)}
										</div>
									</div>
								</CardHeader>
								<CardContent className="space-y-3">
									{section.fields.map(field => {
										const autoValue = (baseExtracted as Record<string, unknown> | null)?.[field.key]
										const currentValue = overrides[field.key] ?? (autoValue !== undefined ? String(autoValue) : "")
										const isAutoFilled = autoValue !== undefined && !(field.key in overrides)
										const isMultiline = MULTILINE_FIELDS.has(field.key)
										return (
											<div key={field.key} className="space-y-1">
												<div className="flex items-center gap-1.5">
													<Label htmlFor={`cf4-${field.key}`} className="text-xs font-medium">
														{field.label}
													</Label>
													{field.required && (
														<span className="text-destructive text-[10px]">*</span>
													)}
													{isAutoFilled && (
														<Badge variant="outline" className="text-[10px] h-3.5 px-1 py-0 ml-auto">
															auto
														</Badge>
													)}
												</div>
												{isMultiline ? (
													<Textarea
														id={`cf4-${field.key}`}
														value={currentValue}
														onChange={e => setOverrides(prev => ({ ...prev, [field.key]: e.target.value }))}
														placeholder={isAutoFilled ? "Auto-filled — edit to override" : `Enter ${field.label.toLowerCase()}`}
														className="min-h-[80px] text-sm"
														aria-label={field.label}
													/>
												) : (
													<Input
														id={`cf4-${field.key}`}
														value={currentValue}
														onChange={e => setOverrides(prev => ({ ...prev, [field.key]: e.target.value }))}
														placeholder={isAutoFilled ? "Auto-filled — edit to override" : `Enter ${field.label.toLowerCase()}`}
														className="text-sm h-8"
														aria-label={field.label}
													/>
												)}
											</div>
										)
									})}
								</CardContent>
							</Card>
						)
					})}
				</div>

				{/* Right pane: XML preview */}
				<div className="space-y-4">
					<h2 className="text-base font-medium">XML Preview</h2>
					{xmlLoading && cf4Id && <Skeleton className="h-64 w-full" />}
					{xmlData && (
						<XmlPreviewPane
							xml={xmlData.xml}
							title={`CF4 XML — ${xmlData.status}`}
							className="min-h-[400px]"
						/>
					)}
					{!cf4Id && !generating && (
						<div className="rounded-md border border-dashed flex items-center justify-center min-h-[200px] text-sm text-muted-foreground">
							Generate CF4 to see XML preview
						</div>
					)}
				</div>
			</div>

			<SourceNoteDrawer
				open={!!drawerSection}
				onClose={() => setDrawerSection(null)}
				sources={drawerSources}
				sectionLabel={activeSection?.label ?? ""}
			/>
		</div>
	)
}
