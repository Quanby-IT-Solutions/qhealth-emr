"use client"

import { useState } from "react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { useNotesQuery } from "@/features/clinical-docs/api/clinical-docs.hooks"

import { NoteEditor } from "./note-editor"
import { NoteTimeline } from "./note-timeline"
import { NoteViewDialog } from "./note-view-dialog"
import { TemplateSelectorPage, type AuthoringTemplate } from "./template-selector-page"

interface DocumentationTabProps {
	encounterId: string
	facilityId: string
	patientId: string
	canWrite?: boolean
}

export function DocumentationTab({
	encounterId,
	facilityId,
	patientId,
	canWrite,
}: DocumentationTabProps) {
	const { data, isLoading } = useNotesQuery({ encounterId })
	const [mode, setMode] = useState<"timeline" | "template" | "editor">("timeline")
	const [selectedTemplate, setSelectedTemplate] = useState<AuthoringTemplate | null>(null)
	const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)

	const notes = data?.data ?? []
	const canCreateNote = !!facilityId && !!canWrite

	if (mode === "template") {
		return (
			<TemplateSelectorPage
				facilityId={facilityId}
				onBack={() => setMode("timeline")}
				onSelectTemplate={template => {
					setSelectedTemplate(template)
					setMode("editor")
				}}
			/>
		)
	}

	if (mode === "editor" && selectedTemplate) {
		return (
			<NoteEditor
				key={`${selectedTemplate.id ?? "default"}-${selectedTemplate.category}`}
				encounterId={encounterId}
				facilityId={facilityId}
				template={selectedTemplate}
				onBack={() => {
					setSelectedTemplate(null)
					setMode("template")
				}}
				onDone={() => {
					setSelectedTemplate(null)
					setMode("timeline")
				}}
			/>
		)
	}

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>Clinical Notes</CardTitle>
					{canCreateNote && (
						<Button size="sm" onClick={() => setMode("template")}>
							New Note
						</Button>
					)}
				</CardHeader>
				<CardContent className="p-0">
					<NoteTimeline notes={notes} onSelectNote={setSelectedNoteId} isLoading={isLoading} />
				</CardContent>
			</Card>

			{selectedNoteId && (
				<NoteViewDialog
					noteId={selectedNoteId}
					encounterId={encounterId}
					patientId={patientId}
					open={!!selectedNoteId}
					onOpenChange={open => {
						if (!open) setSelectedNoteId(null)
					}}
					canWrite={canWrite}
				/>
			)}
		</div>
	)
}
