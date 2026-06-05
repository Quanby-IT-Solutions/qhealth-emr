"use client"

import { ClipboardList, FileText, Loader2, Video } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"
import { usePatientSummaryQuery } from "@/features/problems-allergies/api/problems-allergies.hooks"
import { useEncounterQuery } from "@/features/telemedicine/api/telemedicine.hooks"

interface TelemedicineEncounterSummaryProps {
	encounterId: string
	onLaunchVideo?: () => void
	onGenerateAbstract?: () => void
}

function Field({ label, value }: { label: string; value?: string | null }) {
	return (
		<div className="min-w-0">
			<p className="text-muted-foreground text-xs">{label}</p>
			<p className="text-sm font-medium">{value || "-"}</p>
		</div>
	)
}

function NoteBlock({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-lg border p-3">
			<p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
				{label}
			</p>
			<p className="text-sm whitespace-pre-wrap">{value || "-"}</p>
		</div>
	)
}

function ChartSnapshot({ patientId }: { patientId: string }) {
	const { data: summary, isLoading } = usePatientSummaryQuery(patientId, {
		enabled: Boolean(patientId),
	})
	const activeProblems = summary?.activeProblems ?? []
	const activeAllergies = summary?.activeAllergies ?? []

	return (
		<div className="grid gap-3 md:grid-cols-2">
			<div className="rounded-lg border p-3">
				<p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
					Active Problems
				</p>
				{isLoading ? (
					<p className="text-muted-foreground text-sm">Loading chart...</p>
				) : activeProblems.length ? (
					<ul className="space-y-1 text-sm">
						{activeProblems.slice(0, 5).map(problem => (
							<li key={problem.id}>
								{problem.description}
								{problem.icd10Code && (
									<span className="text-muted-foreground"> - {problem.icd10Code}</span>
								)}
							</li>
						))}
					</ul>
				) : (
					<p className="text-muted-foreground text-sm">None recorded</p>
				)}
			</div>
			<div className="rounded-lg border p-3">
				<p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
					Active Allergies
				</p>
				{isLoading ? (
					<p className="text-muted-foreground text-sm">Loading chart...</p>
				) : activeAllergies.length ? (
					<ul className="space-y-1 text-sm">
						{activeAllergies.slice(0, 5).map(allergy => (
							<li key={allergy.id}>
								{allergy.allergenName}
								{allergy.severity && (
									<span className="text-muted-foreground"> - {allergy.severity}</span>
								)}
							</li>
						))}
					</ul>
				) : (
					<p className="text-muted-foreground text-sm">None recorded</p>
				)}
			</div>
		</div>
	)
}

export function TelemedicineEncounterSummary({
	encounterId,
	onLaunchVideo,
	onGenerateAbstract,
}: TelemedicineEncounterSummaryProps) {
	const { data: encounter, isLoading } = useEncounterQuery(encounterId)

	return (
		<Card className="min-w-0">
			<CardHeader>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="flex min-w-0 items-center gap-3">
						<div className="bg-primary/10 flex size-10 items-center justify-center rounded-full">
							<ClipboardList className="text-primary size-5" />
						</div>
						<div className="min-w-0">
							<CardTitle className="text-base">Telemedicine Encounter</CardTitle>
							<p className="text-muted-foreground text-xs">
								{encounter?.patientName ?? "Clinical note"}
							</p>
						</div>
					</div>
					{encounter && <Badge variant="outline">{encounter.status}</Badge>}
				</div>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="flex items-center gap-2 py-6 text-sm text-gray-500">
						<Loader2 className="size-4 animate-spin" />
						Loading encounter...
					</div>
				) : !encounter ? (
					<p className="text-muted-foreground py-6 text-center text-sm">
						Encounter details are unavailable.
					</p>
				) : (
					<div className="space-y-5">
						<div className="grid gap-3 md:grid-cols-4">
							<Field label="Patient" value={encounter.patientName} />
							<Field label="Clinician" value={encounter.clinicianName} />
							<Field label="Chief Complaint" value={encounter.chiefComplaint} />
							<Field label="Diagnosis" value={encounter.diagnosis} />
						</div>

						{encounter.encounterType === "linked" && (
							<div className="border-primary/30 bg-primary/5 rounded-md border p-3">
								<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
									Linked In-Person Visit
								</p>
								<p className="text-sm font-medium">
									{encounter.linkedEncounterNumber ?? encounter.linkedEncounterId ?? "Linked visit"}
								</p>
								{encounter.linkedEncounterStatus && (
									<p className="text-muted-foreground text-xs">
										Status: {encounter.linkedEncounterStatus.replace(/_/g, " ")}
									</p>
								)}
							</div>
						)}

						<ChartSnapshot patientId={encounter.patientId} />

						<Separator />

						<div className="grid gap-3 md:grid-cols-2">
							<NoteBlock label="Subjective" value={encounter.subjectiveNotes} />
							<NoteBlock label="Objective" value={encounter.objectiveNotes} />
							<NoteBlock label="Assessment" value={encounter.assessmentNotes} />
							<NoteBlock label="Plan" value={encounter.planNotes} />
						</div>

						<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
							<Button
								type="button"
								variant="outline"
								onClick={onLaunchVideo}
								className="w-full sm:w-auto"
							>
								<Video className="mr-1.5 size-4" />
								Launch Video
							</Button>
							<Button type="button" onClick={onGenerateAbstract} className="w-full sm:w-auto">
								<FileText className="mr-1.5 size-4" />
								Generate Abstract
							</Button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
