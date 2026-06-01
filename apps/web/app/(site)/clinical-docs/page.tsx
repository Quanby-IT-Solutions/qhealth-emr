"use client"

import { useState } from "react"

import { format } from "date-fns"
import { FileText } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useNotesQuery } from "@/features/clinical-docs/api/clinical-docs.hooks"
import { NoteViewDialog } from "@/features/clinical-docs/components/note-view-dialog"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

function getNotePreview(content: string) {
	const plain = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
	if (!plain) return "No note content available."
	return plain.length > 180 ? `${plain.slice(0, 180)}...` : plain
}

export default function ClinicalDocsPage() {
	const permSet = usePermissionSet()
	const notesQuery = useNotesQuery({ status: "signed" })
	const notes = notesQuery.data?.data ?? []
	const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)

	if (!can(permSet, "clinical_docs", "view")) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to access clinical documents.
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Clinical Documents</h1>
				<p className="text-muted-foreground text-sm">
					Access and review signed clinical documentation for billing purposes
				</p>
			</div>

			{notesQuery.isLoading ? (
				<Card>
					<CardContent className="py-12 text-center text-sm text-muted-foreground">
						Loading clinical documents...
					</CardContent>
				</Card>
			) : notesQuery.isError ? (
				<Card>
					<CardContent className="py-12 text-center text-sm text-destructive">
						Unable to load clinical documents.
					</CardContent>
				</Card>
			) : notes.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-20 text-center">
						<FileText className="text-muted-foreground mb-4 size-12" />
						<p className="font-medium">No signed clinical documents yet</p>
						<p className="text-muted-foreground mt-1 max-w-sm text-sm">
							Signed notes from encounter documentation will appear here for review.
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="space-y-3">
					{notes.map(note => (
						<Card key={note.id}>
							<CardContent className="space-y-2 py-4">
								<div className="flex flex-wrap items-center gap-2">
									<Badge variant="secondary">{note.noteType.replace("_", " ")}</Badge>
									<Badge variant={note.status === "signed" ? "default" : "outline"}>
										{note.status}
									</Badge>
									<span className="text-muted-foreground text-xs">
										{note.signedAt
											? `Signed ${format(new Date(note.signedAt), "MMM d, yyyy h:mm a")}`
											: `Created ${format(new Date(note.createdAt), "MMM d, yyyy h:mm a")}`}
									</span>
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="ml-auto"
										onClick={() => setSelectedNoteId(note.id)}
									>
										View
									</Button>
								</div>
								<div className="space-y-1">
									<p className="text-sm font-medium">
										{note.templateName ?? "Clinical Note"}
									</p>
									{note.patientName && (
										<p className="text-muted-foreground text-xs">Patient: {note.patientName}</p>
									)}
									<p className="text-muted-foreground text-sm">
										{getNotePreview(note.content)}
									</p>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{selectedNoteId && (
				<NoteViewDialog
					noteId={selectedNoteId}
					open={!!selectedNoteId}
					onOpenChange={open => {
						if (!open) setSelectedNoteId(null)
					}}
					canWrite={false}
				/>
			)}
		</div>
	)
}
