"use client"

import { useState } from "react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { useNotesQuery } from "@/features/clinical-docs/api/clinical-docs.hooks"

import { FpeEditorFlow } from "./fpe-editor-flow"
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
	const [editorBackMode, setEditorBackMode] = useState<"timeline" | "template">("template")

	const notes = data?.data ?? []
	const canCreateNote = !!facilityId && !!canWrite
	const startFpe = () => {
		setSelectedTemplate({
			name: "FPE / Konsulta",
			category: "fpe",
			sections: [],
			isFacilityTemplate: false,
		})
		setEditorBackMode("timeline")
		setMode("editor")
	}

	if (mode === "template") {
		return (
			<TemplateSelectorPage
				facilityId={facilityId}
				onBack={() => setMode("timeline")}
				onSelectTemplate={template => {
					setSelectedTemplate(template)
					setEditorBackMode("template")
					setMode("editor")
				}}
			/>
		)
	}

	if (mode === "editor" && selectedTemplate) {
		if (selectedTemplate.category === "fpe") {
			return (
				<FpeEditorFlow
					key={`fpe-${selectedTemplate.id ?? "default"}`}
					encounterId={encounterId}
					facilityId={facilityId}
					patientId={patientId}
					onBack={() => {
						setSelectedTemplate(null)
						setMode(editorBackMode)
					}}
					onDone={() => {
						setSelectedTemplate(null)
						setMode("timeline")
					}}
				/>
			)
		}

		return (
			<NoteEditor
				key={`${selectedTemplate.id ?? "default"}-${selectedTemplate.category}`}
				encounterId={encounterId}
				facilityId={facilityId}
				template={selectedTemplate}
				onBack={() => {
					setSelectedTemplate(null)
					setMode(editorBackMode)
				}}
				onDone={() => {
					setSelectedTemplate(null)
					setMode("timeline")
				}}
			/>
		)
	}

	return (
		<div className="min-w-0 space-y-4">
			<Card className="min-w-0 overflow-hidden">
				<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
					<CardTitle>Clinical Notes</CardTitle>
					{canCreateNote && (
						<div className="flex flex-wrap items-center gap-2">
							<Button size="sm" variant="outline" onClick={startFpe}>
								New FPE
							</Button>
							<Button size="sm" onClick={() => setMode("template")}>
								New Note
							</Button>
						</div>
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
