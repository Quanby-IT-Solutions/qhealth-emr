"use client"

import { useState } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { useNotesQuery } from "@/features/clinical-docs/api/clinical-docs.hooks"

import { CreateNoteDialog } from "./create-note-dialog"
import { NoteViewDialog } from "./note-view-dialog"

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

function noteTypeLabel(type: string) {
	const labels: Record<string, string> = {
		admission: "Admission Note",
		progress: "Progress Note",
		consultation: "Consultation",
		discharge_summary: "Discharge Summary",
		fpe: "FPE / Konsulta",
	}
	return labels[type] ?? type
}

interface DocumentationTabProps {
	encounterId: string
	facilityId: string
	patientId: string
}

export function DocumentationTab({ encounterId, facilityId, patientId }: DocumentationTabProps) {
	const { data, isLoading } = useNotesQuery({ encounterId })
	const [createOpen, setCreateOpen] = useState(false)
	const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)

	const notes = data?.data ?? []

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>Clinical Notes</CardTitle>
					<Button size="sm" onClick={() => setCreateOpen(true)}>
						New Note
					</Button>
				</CardHeader>
				<CardContent className="p-0">
					{isLoading ? (
						<div className="text-muted-foreground py-8 text-center text-sm">
							Loading notes…
						</div>
					) : notes.length > 0 ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Type</TableHead>
									<TableHead>Template</TableHead>
									<TableHead>Author</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Created</TableHead>
									<TableHead>Signed</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{notes.map(note => (
									<TableRow
										key={note.id}
										className="cursor-pointer"
										onClick={() => setSelectedNoteId(note.id)}
									>
										<TableCell>{noteTypeLabel(note.noteType)}</TableCell>
										<TableCell>{note.templateName ?? "—"}</TableCell>
										<TableCell>{note.authorStaffName ?? "—"}</TableCell>
										<TableCell>
											<Badge
												variant={
													note.status === "signed" ? "default" : "secondary"
												}
											>
												{note.status === "signed" ? "Signed" : "Draft"}
											</Badge>
										</TableCell>
										<TableCell>{formatDateTime(note.createdAt)}</TableCell>
										<TableCell>{formatDateTime(note.signedAt)}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					) : (
						<div className="text-muted-foreground py-8 text-center text-sm">
							No clinical notes yet. Click "New Note" to begin documenting.
						</div>
					)}
				</CardContent>
			</Card>

			<CreateNoteDialog
				open={createOpen}
				onOpenChange={setCreateOpen}
				encounterId={encounterId}
				facilityId={facilityId}
			/>

			{selectedNoteId && (
				<NoteViewDialog
					noteId={selectedNoteId}
					encounterId={encounterId}
					patientId={patientId}
					open={!!selectedNoteId}
					onOpenChange={open => {
						if (!open) setSelectedNoteId(null)
					}}
				/>
			)}
		</div>
	)
}
