"use client"

import { BookOpen, ClipboardList, FileBadge, FileCheck2, FileText, Stethoscope } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Separator } from "@/core/components/ui/separator"
import type { ClinicalNoteType } from "@/features/clinical-docs/api/clinical-docs.hooks"

interface ClinicalNote {
	id: string
	noteType: ClinicalNoteType
	templateName: string | null
	status: "draft" | "signed"
	authorStaffName: string | null
	signedAt: string | null
	createdAt: string
	content: string
}

interface NoteTimelineProps {
	notes: ClinicalNote[]
	onSelectNote: (noteId: string) => void
	isLoading?: boolean
}

function noteTypeIcon(type: ClinicalNote["noteType"]) {
	switch (type) {
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

function noteTypeLabel(type: ClinicalNote["noteType"]) {
	const labels: Partial<Record<ClinicalNote["noteType"], string>> = {
		admission: "Admission Note (H&P)",
		progress: "Progress Note",
		consultation: "Consultation",
		discharge_summary: "Discharge Summary",
		fpe: "FPE / Konsulta",
		operative: "Operative Note",
		anesthesia: "Anesthesia Note",
	}
	return labels[type] ?? type
}

function noteTypeColor(type: ClinicalNote["noteType"]) {
	switch (type) {
		case "admission":
			return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
		case "progress":
			return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
		case "consultation":
			return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
		case "discharge_summary":
			return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
		case "fpe":
			return "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
		default:
			return "bg-muted text-muted-foreground"
	}
}

function formatDateTime(dateStr: string | null | undefined) {
	if (!dateStr) return "—"
	return new Date(dateStr).toLocaleString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

function formatDate(dateStr: string) {
	return new Date(dateStr).toLocaleDateString("en-PH", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	})
}

/** Returns a short excerpt (first 120 chars) of the note content. */
function noteExcerpt(content: string) {
	const stripped = content.replace(/^#+\s.*/gm, "").trim()
	return stripped.length > 120 ? `${stripped.slice(0, 120)}…` : stripped
}

/**
 * Chronological timeline of clinical notes.
 * Groups notes by date and shows type icon, author, status badge, and content excerpt.
 */
export function NoteTimeline({ notes, onSelectNote, isLoading }: NoteTimelineProps) {
	if (isLoading) {
		return <div className="text-muted-foreground py-10 text-center text-sm">Loading notes…</div>
	}

	if (notes.length === 0) {
		return (
			<div className="text-muted-foreground py-10 text-center text-sm">
				No clinical notes yet. Click "New Note" to begin documenting.
			</div>
		)
	}

	// Sort chronologically (newest first) and group by date
	const sorted = [...notes].sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
	)

	const groups = sorted.reduce<Record<string, ClinicalNote[]>>((acc, note) => {
		const dateKey = new Date(note.createdAt).toDateString()
		if (!acc[dateKey]) acc[dateKey] = []
		acc[dateKey].push(note)
		return acc
	}, {})

	const dateKeys = Object.keys(groups)

	return (
		<div className="min-w-0 space-y-6 px-3 pb-4 sm:px-4">
			{dateKeys.map((dateKey, groupIdx) => {
				const notesForDate = groups[dateKey] ?? []
				return (
					<div key={dateKey} className="min-w-0 space-y-3">
						{/* Date header */}
						<div className="flex min-w-0 items-center gap-3">
							<span className="text-muted-foreground shrink-0 text-xs font-medium">
								{formatDate(new Date(dateKey).toISOString())}
							</span>
							<Separator className="flex-1" />
						</div>

						{/* Notes for this date */}
						<div className="relative space-y-3 sm:ml-4">
							{/* Vertical connector line */}
							{notesForDate.length > 1 && (
								<div
									className="bg-border absolute top-6 left-3 w-px"
									style={{ height: `calc(100% - 1.5rem)` }}
								/>
							)}

							{notesForDate.map(note => (
								<div key={note.id} className="relative flex min-w-0 gap-3">
									{/* Icon bubble */}
									<div
										className={`relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full ${noteTypeColor(note.noteType)}`}
									>
										{noteTypeIcon(note.noteType)}
									</div>

									{/* Note card */}
									<Button
										type="button"
										variant="outline"
										className="h-auto min-w-0 flex-1 justify-start px-3 py-3 text-left whitespace-normal sm:px-4"
										onClick={() => onSelectNote(note.id)}
									>
										<div className="min-w-0 flex-1 space-y-2">
											<div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
												<span className="min-w-0 text-sm font-medium break-words">
													{noteTypeLabel(note.noteType)}
												</span>
												<div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:justify-end">
													{note.templateName && (
														<Badge
															variant="outline"
															className="max-w-full text-xs whitespace-normal"
														>
															{note.templateName}
														</Badge>
													)}
													<Badge variant={note.status === "signed" ? "default" : "secondary"}>
														{note.status === "signed" ? "Signed" : "Draft"}
													</Badge>
												</div>
											</div>

											<div className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
												<span className="min-w-0 break-words">
													{note.authorStaffName ?? "Unknown author"}
												</span>
												<span>·</span>
												<span>{formatDateTime(note.createdAt)}</span>
												{note.signedAt && (
													<>
														<span>·</span>
														<span className="text-green-600 dark:text-green-400">
															Signed {formatDateTime(note.signedAt)}
														</span>
													</>
												)}
											</div>

											{noteExcerpt(note.content) && (
												<p className="text-muted-foreground line-clamp-3 min-w-0 text-xs break-words">
													{noteExcerpt(note.content)}
												</p>
											)}
										</div>
									</Button>
								</div>
							))}
						</div>

						{groupIdx < dateKeys.length - 1 && <div className="h-2" />}
					</div>
				)
			})}
		</div>
	)
}
