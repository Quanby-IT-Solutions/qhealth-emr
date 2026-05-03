"use client"

import { useCallback, useState } from "react"
import { Info } from "lucide-react"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"

import { EncounterContextBar } from "@/features/billing/components/encounter-context-bar"
import { XmlPreviewPane } from "@/features/billing/components/xml-preview-pane"
import { useGenerateCf4Mutation, useCf4XmlQuery } from "../api/cf4.hooks"
import { CF4_SECTIONS } from "../lib/cf4-sections"
import { SourceNoteDrawer } from "./source-note-drawer"

interface Cf4GenerationPageProps {
	encounterId: string
	facilityId: string
	patientId: string
	existingCf4Id?: string
}

export function Cf4GenerationPage({ encounterId, facilityId, patientId, existingCf4Id }: Cf4GenerationPageProps) {
	const [cf4Id, setCf4Id] = useState(existingCf4Id ?? "")
	const [drawerSection, setDrawerSection] = useState<string | null>(null)

	const { mutate: generateCf4, isPending: generating, data: preview, error: generateError } = useGenerateCf4Mutation()
	const { data: xmlData, isLoading: xmlLoading } = useCf4XmlQuery(cf4Id)

	const missingFields = preview?.missingFields ?? []
	const hasValidationIssues = missingFields.length > 0
	const extractedData = preview?.extractedData ?? null

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

	const activeSection = drawerSection
		? CF4_SECTIONS.find(s => s.key === drawerSection) ?? null
		: null

	const drawerSources = activeSection?.fields
		.filter(f => extractedData && f.key in extractedData)
		.map(f => ({
			field: f.key,
			label: f.label,
			source: f.source ?? "encounter",
			value: extractedData ? String((extractedData as Record<string, unknown>)[f.key] ?? "") : null,
		})) ?? []

	return (
		<div className="space-y-4">
			<EncounterContextBar />

			<div className="px-4 grid gap-4 lg:grid-cols-2">
				{/* Left pane: form / section summary */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h1 className="text-lg font-semibold">CF4 Generation</h1>
						<Button
							onClick={handleGenerate}
							disabled={generating}
							size="sm"
						>
							{generating ? "Generating..." : cf4Id ? "Re-generate" : "Generate CF4"}
						</Button>
					</div>

					{generateError && (
						<Alert variant="destructive">
							<AlertDescription>{String(generateError)}</AlertDescription>
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
							.every(f => extractedData && f.key in extractedData)

						const autoCount = section.fields.filter(
							f => extractedData && f.key in extractedData && f.source && f.source !== "manual"
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
											{extractedData && (
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
								<CardContent className="text-xs text-muted-foreground">
									{section.fields.map(field => {
										const isAutoFilled = extractedData && field.key in extractedData && field.source && field.source !== "manual"
										return (
											<div key={field.key} className="flex justify-between py-0.5">
												<span>{field.label}</span>
												<div className="flex items-center gap-1.5">
													{isAutoFilled && (
														<Badge variant="outline" className="text-[10px] h-3.5 px-1 py-0">
															auto
														</Badge>
													)}
													{field.required && !isAutoFilled && (
														<span className="text-destructive text-[10px]">required</span>
													)}
												</div>
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
