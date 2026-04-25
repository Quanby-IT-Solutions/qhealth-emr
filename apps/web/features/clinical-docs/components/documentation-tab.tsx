"use client"

import { useState } from "react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { useNotesQuery } from "@/features/clinical-docs/api/clinical-docs.hooks"

import { CreateNoteDialog } from "./create-note-dialog"
import { NoteTimeline } from "./note-timeline"
import { NoteViewDialog } from "./note-view-dialog"

interface DocumentationTabProps {
	encounterId: string
	facilityId: string
	patientId: string
	canWrite?: boolean
}

export function DocumentationTab({ encounterId, facilityId, patientId, canWrite }: DocumentationTabProps) {
	const { data, isLoading } = useNotesQuery({ encounterId })
	const [createOpen, setCreateOpen] = useState(false)
	const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)

	const notes = data?.data ?? []

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>Clinical Notes</CardTitle>
					{canWrite && (
						<Button size="sm" onClick={() => setCreateOpen(true)}>
							New Note
						</Button>
					)}
				</CardHeader>
				<CardContent className="p-0">
					<NoteTimeline
						notes={notes}
						onSelectNote={setSelectedNoteId}
						isLoading={isLoading}
					/>
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
					canWrite={canWrite}
				/>
			)}
		</div>
	)
}
