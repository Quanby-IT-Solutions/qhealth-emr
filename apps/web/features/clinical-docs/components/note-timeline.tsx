"use client"

import {
	BookOpen,
	ClipboardList,
	FileBadge,
	FileCheck2,
	FileText,
	Stethoscope,
} from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Separator } from "@/core/components/ui/separator"

interface ClinicalNote {
	id: string
	noteType: "admission" | "progress" | "consultation" | "discharge_summary" | "fpe"
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
	const labels: Record<ClinicalNote["noteType"], string> = {
		admission: "Admission Note (H&P)",
		progress: "Progress Note",
		consultation: "Consultation",
		discharge_summary: "Discharge Summary",
		fpe: "FPE / Konsulta",
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
	return stripped.length > 120 ? stripped.slice(0, 120) + "…" : stripped
}

/**
 * Chronological timeline of clinical notes.
 * Groups notes by date and shows type icon, author, status badge, and content excerpt.
 */
export function NoteTimeline({ notes, onSelectNote, isLoading }: NoteTimelineProps) {
	if (isLoading) {
		return (
			<div className="text-muted-foreground py-10 text-center text-sm">
				Loading notes…
			</div>
		)
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
		<div className="space-y-6">
			{dateKeys.map((dateKey, groupIdx) => (
				<div key={dateKey} className="space-y-3">
					{/* Date header */}
					<div className="flex items-center gap-3">
						<span className="text-muted-foreground text-xs font-medium">
							{formatDate(new Date(dateKey).toISOString())}
						</span>
						<Separator className="flex-1" />
					</div>

					{/* Notes for this date */}
					<div className="relative ml-4 space-y-3">
						{/* Vertical connector line */}
						{groups[dateKey].length > 1 && (
							<div className="bg-border absolute left-3 top-6 w-px"
								style={{ height: `calc(100% - 1.5rem)` }}
							/>
						)}

						{groups[dateKey].map((note, noteIdx) => (
							<div key={note.id} className="relative flex gap-3">
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
									className="h-auto w-full justify-start px-4 py-3 text-left"
									onClick={() => onSelectNote(note.id)}
								>
									<div className="w-full space-y-1">
										<div className="flex items-center justify-between gap-2">
											<span className="text-sm font-medium">
												{noteTypeLabel(note.noteType)}
											</span>
											<div className="flex shrink-0 items-center gap-1.5">
												{note.templateName && (
													<Badge variant="outline" className="text-xs">
														{note.templateName}
													</Badge>
												)}
												<Badge
													variant={
														note.status === "signed" ? "default" : "secondary"
													}
												>
													{note.status === "signed" ? "Signed" : "Draft"}
												</Badge>
											</div>
										</div>

										<div className="text-muted-foreground flex items-center gap-2 text-xs">
											<span>{note.authorStaffName ?? "Unknown author"}</span>
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
											<p className="text-muted-foreground line-clamp-2 text-xs">
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
			))}
		</div>
	)
}
