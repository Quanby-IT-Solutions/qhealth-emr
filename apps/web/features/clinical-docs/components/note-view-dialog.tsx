"use client"

import { useState } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Label } from "@/core/components/ui/label"
import { Separator } from "@/core/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { Textarea } from "@/core/components/ui/textarea"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import {
	useNoteDetailQuery,
	useSignAddendumMutation,
	useUpdateNoteMutation,
} from "@/features/clinical-docs/api/clinical-docs.hooks"

import { AmendmentForm } from "./amendment-form"
import { NoteHistory } from "./note-history"
import { NoteSigning } from "./note-signing"

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
	canWrite?: boolean
}

export function NoteViewDialog({
	noteId,
	encounterId,
	patientId,
	open,
	onOpenChange,
	canWrite,
}: NoteViewDialogProps) {
	const { data: note, isLoading } = useNoteDetailQuery(noteId)
	const { data: profile } = useMyProfile()

	const [editContent, setEditContent] = useState<string | null>(null)
	const [signOpen, setSignOpen] = useState(false)
	const [addendumOpen, setAddendumOpen] = useState(false)

	const updateNote = useUpdateNoteMutation()
	const signAddendum = useSignAddendumMutation()

	const isEditing = editContent !== null
	const isDraft = note?.status === "draft"
	const isSigned = note?.status === "signed"

	// Build staff credentials for NoteSigning from the current user's profile
	const staffProfile = profile?.staffProfiles?.[0]
	const staffCredentials = {
		name: profile?.user?.name ?? note?.authorStaffName ?? "Unknown",
		prcLicenseNumber: staffProfile?.prcLicenseNumber ?? null,
		prcExpiry: staffProfile?.prcExpiry ?? null,
		ptrNumber: staffProfile?.ptrNumber ?? null,
		ptrExpiry: staffProfile?.ptrExpiry ?? null,
	}

	function handleSave() {
		if (!note || editContent === null) return
		updateNote.mutate(
			{ id: note.id, content: editContent },
			{ onSuccess: () => setEditContent(null) }
		)
	}

	function handleSignAddendum(addendumId: string) {
		if (!note) return
		signAddendum.mutate({ id: addendumId, noteId: note.id })
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] max-w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-2xl">
				{isLoading || !note ? (
					<div className="text-muted-foreground py-8 text-center text-sm">Loading note…</div>
				) : (
					<>
						<DialogHeader>
							<DialogTitle className="flex flex-wrap items-center gap-2">
								{noteTypeLabel(note.noteType)}
								<Badge variant={isSigned ? "default" : "secondary"}>
									{isSigned ? "Signed" : "Draft"}
								</Badge>
							</DialogTitle>
							<DialogDescription>
								By {note.authorStaffName ?? "Unknown"} · {formatDateTime(note.createdAt)}
								{note.signedAt && ` · Signed ${formatDateTime(note.signedAt)}`}
							</DialogDescription>
						</DialogHeader>

						{/* ─── Sign Note Panel ─── */}
						{signOpen && (
							<div className="bg-muted/20 rounded-lg border p-4">
								<h4 className="mb-4 text-sm font-semibold">Sign Clinical Note</h4>
								<NoteSigning
									noteId={note.id}
									noteType={note.noteType}
									staffCredentials={staffCredentials}
									onSuccess={() => setSignOpen(false)}
									onCancel={() => setSignOpen(false)}
								/>
							</div>
						)}

						{/* ─── Amendment / Addendum Panel ─── */}
						{addendumOpen && (
							<div className="bg-muted/20 rounded-lg border p-4">
								<h4 className="mb-4 text-sm font-semibold">Add Addendum</h4>
								<AmendmentForm
									noteId={note.id}
									originalContent={note.content}
									onSuccess={() => setAddendumOpen(false)}
									onCancel={() => setAddendumOpen(false)}
								/>
							</div>
						)}

						{/* ─── Note Content (hidden while sign/amendment panels are open) ─── */}
						{!signOpen && !addendumOpen && (
							<div className="space-y-4 py-4">
								{note.templateName && (
									<div className="text-muted-foreground text-sm">Template: {note.templateName}</div>
								)}

								<Tabs defaultValue="content">
									<TabsList>
										<TabsTrigger value="content">Content</TabsTrigger>
										<TabsTrigger value="history">
											History
											{note.addenda && note.addenda.length > 0 && (
												<Badge variant="secondary" className="ml-1.5 px-1.5 text-xs">
													{1 + note.addenda.length}
												</Badge>
											)}
										</TabsTrigger>
									</TabsList>

									<TabsContent value="content" className="mt-3 space-y-3">
										{isEditing ? (
											<div className="space-y-2">
												<Label>Content</Label>
												<Textarea
													rows={12}
													value={editContent}
													onChange={e => setEditContent(e.target.value)}
												/>
												<div className="flex gap-2">
													<Button size="sm" onClick={handleSave} disabled={updateNote.isPending}>
														{updateNote.isPending ? "Saving…" : "Save Draft"}
													</Button>
													<Button size="sm" variant="outline" onClick={() => setEditContent(null)}>
														Cancel
													</Button>
												</div>
											</div>
										) : (
											<div className="bg-muted/50 rounded-md border p-4 text-sm break-words whitespace-pre-wrap">
												{note.content || "No content"}
											</div>
										)}

										{/* Quick-action: sign any draft addenda from the content view */}
										{note.addenda && note.addenda.some(a => a.status === "draft") && (
											<>
												<Separator />
												<div className="space-y-2">
													<h4 className="text-sm font-medium">Pending Addenda</h4>
													{note.addenda
														.filter(a => a.status === "draft")
														.map(addendum => (
															<div
																key={addendum.id}
																className="bg-muted/30 space-y-1 rounded border p-3"
															>
																<div className="flex items-center justify-between text-xs">
																	<span>
																		{addendum.authorStaffName ?? "Unknown"} ·{" "}
																		{formatDateTime(addendum.createdAt)}
																	</span>
																	<Badge variant="secondary">Draft</Badge>
																</div>
																{addendum.reason && (
																	<div className="text-muted-foreground text-xs">
																		Reason: {addendum.reason}
																	</div>
																)}
																<div className="text-sm break-words whitespace-pre-wrap">
																	{addendum.content}
																</div>
																<Button
																	size="sm"
																	variant="outline"
																	className="mt-1"
																	onClick={() => handleSignAddendum(addendum.id)}
																	disabled={signAddendum.isPending}
																>
																	Sign Addendum
																</Button>
															</div>
														))}
												</div>
											</>
										)}
									</TabsContent>

									<TabsContent value="history" className="mt-3">
										<NoteHistory note={note} />
									</TabsContent>
								</Tabs>
							</div>
						)}

						{/* ─── Footer Actions ─── */}
						{!signOpen && !addendumOpen && (
							<div className="flex justify-end gap-2 pt-2">
								{isDraft && !isEditing && canWrite && (
									<>
										<Button variant="outline" onClick={() => setEditContent(note.content)}>
											Edit
										</Button>
										<Button onClick={() => setSignOpen(true)}>Sign Note</Button>
									</>
								)}
								{isSigned && canWrite && (
									<Button variant="outline" onClick={() => setAddendumOpen(true)}>
										Add Addendum
									</Button>
								)}
							</div>
						)}
					</>
				)}
			</DialogContent>
		</Dialog>
	)
}
