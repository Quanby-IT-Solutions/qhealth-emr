"use client"

import { useState } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Label } from "@/core/components/ui/label"
import { Separator } from "@/core/components/ui/separator"
import { Textarea } from "@/core/components/ui/textarea"
import {
	useCreateAddendumMutation,
	useNoteDetailQuery,
	useSignAddendumMutation,
	useSignNoteMutation,
	useUpdateNoteMutation,
} from "@/features/clinical-docs/api/clinical-docs.hooks"

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

interface NoteViewDialogProps {
	noteId: string
	encounterId: string
	patientId: string
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function NoteViewDialog({
	noteId,
	encounterId,
	patientId,
	open,
	onOpenChange,
}: NoteViewDialogProps) {
	const { data: note, isLoading } = useNoteDetailQuery(noteId)

	const [editContent, setEditContent] = useState<string | null>(null)
	const [signOpen, setSignOpen] = useState(false)
	const [addendumOpen, setAddendumOpen] = useState(false)
	const [addendumContent, setAddendumContent] = useState("")
	const [addendumReason, setAddendumReason] = useState("")

	const updateNote = useUpdateNoteMutation()
	const signNote = useSignNoteMutation()
	const createAddendum = useCreateAddendumMutation()
	const signAddendum = useSignAddendumMutation()

	const isEditing = editContent !== null
	const isDraft = note?.status === "draft"
	const isSigned = note?.status === "signed"

	function handleSave() {
		if (!note || editContent === null) return
		updateNote.mutate(
			{ id: note.id, content: editContent },
			{ onSuccess: () => setEditContent(null) }
		)
	}

	function handleSign() {
		if (!note) return
		signNote.mutate(
			{ id: note.id },
			{
				onSuccess: () => {
					setSignOpen(false)
				},
			}
		)
	}

	function handleCreateAddendum() {
		if (!note || !addendumContent.trim()) return
		createAddendum.mutate(
			{
				noteId: note.id,
				content: addendumContent,
				reason: addendumReason || undefined,
			},
			{
				onSuccess: () => {
					setAddendumContent("")
					setAddendumReason("")
					setAddendumOpen(false)
				},
			}
		)
	}

	function handleSignAddendum(addendumId: string) {
		if (!note) return
		signAddendum.mutate({ id: addendumId, noteId: note.id })
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
				{isLoading || !note ? (
					<div className="text-muted-foreground py-8 text-center text-sm">
						Loading note…
					</div>
				) : (
					<>
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2">
								{noteTypeLabel(note.noteType)}
								<Badge
									variant={isSigned ? "default" : "secondary"}
								>
									{isSigned ? "Signed" : "Draft"}
								</Badge>
							</DialogTitle>
							<DialogDescription>
								By {note.authorStaffName ?? "Unknown"} ·{" "}
								{formatDateTime(note.createdAt)}
								{note.signedAt && ` · Signed ${formatDateTime(note.signedAt)}`}
							</DialogDescription>
						</DialogHeader>

						{/* Note Content */}
						<div className="space-y-4 py-4">
							{note.templateName && (
								<div className="text-muted-foreground text-sm">
									Template: {note.templateName}
								</div>
							)}

							{isEditing ? (
								<div className="space-y-2">
									<Label>Content</Label>
									<Textarea
										rows={12}
										value={editContent}
										onChange={e => setEditContent(e.target.value)}
									/>
									<div className="flex gap-2">
										<Button
											size="sm"
											onClick={handleSave}
											disabled={updateNote.isPending}
										>
											{updateNote.isPending ? "Saving…" : "Save Draft"}
										</Button>
										<Button
											size="sm"
											variant="outline"
											onClick={() => setEditContent(null)}
										>
											Cancel
										</Button>
									</div>
								</div>
							) : (
								<div className="bg-muted/50 rounded-md border p-4 whitespace-pre-wrap text-sm">
									{note.content || "No content"}
								</div>
							)}

							{/* Addenda Section */}
							{note.addenda && note.addenda.length > 0 && (
								<>
									<Separator />
									<div className="space-y-3">
										<h4 className="text-sm font-medium">Addenda</h4>
										{note.addenda.map(addendum => (
											<div
												key={addendum.id}
												className="bg-muted/30 space-y-1 rounded border p-3"
											>
												<div className="flex items-center justify-between text-xs">
													<span>
														{addendum.authorStaffName ?? "Unknown"} ·{" "}
														{formatDateTime(addendum.createdAt)}
													</span>
													<Badge
														variant={
															addendum.status === "signed"
																? "default"
																: "secondary"
														}
													>
														{addendum.status === "signed"
															? "Signed"
															: "Draft"}
													</Badge>
												</div>
												{addendum.reason && (
													<div className="text-muted-foreground text-xs">
														Reason: {addendum.reason}
													</div>
												)}
												<div className="whitespace-pre-wrap text-sm">
													{addendum.content}
												</div>
												{addendum.status === "draft" && (
													<Button
														size="sm"
														variant="outline"
														className="mt-1"
														onClick={() =>
															handleSignAddendum(addendum.id)
														}
														disabled={signAddendum.isPending}
													>
														Sign Addendum
													</Button>
												)}
											</div>
										))}
									</div>
								</>
							)}
						</div>

						{/* Actions */}
						<DialogFooter>
							{isDraft && !isEditing && (
								<>
									<Button
										variant="outline"
										onClick={() => setEditContent(note.content)}
									>
										Edit
									</Button>
									<Button onClick={() => setSignOpen(true)}>Sign Note</Button>
								</>
							)}
							{isSigned && (
								<Button
									variant="outline"
									onClick={() => setAddendumOpen(true)}
								>
									Add Addendum
								</Button>
							)}
						</DialogFooter>
					</>
				)}
			</DialogContent>

			{/* Sign Confirmation Dialog */}
			<Dialog open={signOpen} onOpenChange={setSignOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Sign Clinical Note</DialogTitle>
						<DialogDescription>
							Signing this note makes it part of the permanent medical record. It
							cannot be edited after signing. Your identity, timestamp, and IP
							address will be recorded.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setSignOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleSign}
							disabled={signNote.isPending}
						>
							{signNote.isPending ? "Signing…" : "Confirm & Sign"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Add Addendum Dialog */}
			<Dialog
				open={addendumOpen}
				onOpenChange={v => {
					if (!v) {
						setAddendumContent("")
						setAddendumReason("")
					}
					setAddendumOpen(v)
				}}
			>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Add Addendum</DialogTitle>
						<DialogDescription>
							Append an addendum to this signed note. The addendum must be
							separately signed.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label>Addendum Content *</Label>
							<Textarea
								rows={6}
								placeholder="Enter additional documentation…"
								value={addendumContent}
								onChange={e => setAddendumContent(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label>Reason (optional)</Label>
							<Textarea
								rows={2}
								placeholder="Reason for addendum…"
								value={addendumReason}
								onChange={e => setAddendumReason(e.target.value)}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setAddendumContent("")
								setAddendumReason("")
								setAddendumOpen(false)
							}}
						>
							Cancel
						</Button>
						<Button
							onClick={handleCreateAddendum}
							disabled={!addendumContent.trim() || createAddendum.isPending}
						>
							{createAddendum.isPending ? "Adding…" : "Add Addendum"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Dialog>
	)
}
