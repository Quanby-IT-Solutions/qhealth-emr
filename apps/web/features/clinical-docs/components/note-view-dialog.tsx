"use client"

import { useState } from "react"
import { X } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
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
import {
	useIcd10ProblemSearchQuery,
	type Icd10SearchResult,
} from "@/features/problems-allergies/api/problems-allergies.hooks"

import { AmendmentForm } from "./amendment-form"
import { NoteHistory } from "./note-history"
import { NoteSigning } from "./note-signing"

interface DiagnosisEntry {
	code: string
	description: string
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

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {}
}

function readDiagnoses(value: unknown): DiagnosisEntry[] {
	const data = asRecord(value)
	if (Array.isArray(data.diagnoses)) {
		const entries = data.diagnoses.flatMap(item => {
			const diagnosis = asRecord(item)
			const code = typeof diagnosis.code === "string" ? diagnosis.code.trim() : ""
			const description =
				typeof diagnosis.description === "string" ? diagnosis.description.trim() : ""
			if (!code) return []
			return [{ code, description }]
		})
		if (entries.length > 0) return entries
	}

	const selected = asRecord(data.icd10_diagnosis)
	if (typeof selected.icd10Code === "string" && selected.icd10Code.trim()) {
		return [
			{
				code: selected.icd10Code.trim(),
				description:
					typeof selected.icd10Display === "string" ? selected.icd10Display.trim() : "",
			},
		]
	}

	const primary = asRecord(data.primaryDiagnosis)
	if (typeof primary.code === "string" && primary.code.trim()) {
		return [
			{
				code: primary.code.trim(),
				description: typeof primary.description === "string" ? primary.description.trim() : "",
			},
		]
	}

	return []
}

function normalizeDiagnoses(diagnoses: DiagnosisEntry[]) {
	const unique = diagnoses.filter(
		diagnosis =>
			diagnosis.code.trim() &&
			diagnoses.findIndex(item => item.code === diagnosis.code) === diagnoses.indexOf(diagnosis)
	)
	if (unique.length === 0) return []
	return unique
}

function setDiagnoses(value: unknown, diagnoses: DiagnosisEntry[]) {
	const next = { ...asRecord(value) }
	const normalized = normalizeDiagnoses(diagnoses)
	if (normalized.length > 0) {
		next.diagnoses = normalized
		const firstDiagnosis = normalized[0]!
		next.icd10_diagnosis = {
			icd10Code: firstDiagnosis.code,
			icd10Display: firstDiagnosis.description,
		}
	} else {
		delete next.diagnoses
		delete next.icd10_diagnosis
	}
	return next
}

function requiresIcd10BeforeSigning(noteType: string) {
	return noteType === "consultation" || noteType === "fpe"
}

function Icd10DiagnosisEditField({
	value,
	onChange,
}: {
	value: DiagnosisEntry[]
	onChange: (value: DiagnosisEntry[]) => void
}) {
	const [open, setOpen] = useState(false)
	const [inputValue, setInputValue] = useState("")
	const searchTerm = inputValue.trim()
	const query = useIcd10ProblemSearchQuery({
		search: searchTerm,
		limit: 10,
		includeEmptySearch: open,
	})
	const results = query.data?.data ?? []

	function selectResult(result: Icd10SearchResult) {
		if (!value.some(diagnosis => diagnosis.code === result.code)) {
			onChange(
				normalizeDiagnoses([
					...value,
					{
						code: result.code,
						description: result.description,
					},
				])
			)
		}
		setInputValue("")
		setOpen(false)
	}

	function removeDiagnosis(code: string) {
		onChange(normalizeDiagnoses(value.filter(diagnosis => diagnosis.code !== code)))
	}

	function closeSearchAfterSelectionChance() {
		window.setTimeout(() => setOpen(false), 100)
	}

	return (
		<div className="space-y-2">
			<div className="flex flex-wrap items-center gap-2">
				<Label>ICD-10 Diagnoses</Label>
				<Badge variant="secondary" className="text-xs">
					Required before signing
				</Badge>
			</div>
			<p className="text-muted-foreground text-xs">
				Search by diagnosis words or ICD-10 code. Typing ICD-10 inside the note text will
				not count for signing.
			</p>
			<div className="relative z-30">
				<Input
					value={inputValue}
					onChange={event => {
						const nextValue = event.target.value
						setInputValue(nextValue)
						setOpen(true)
					}}
					onFocus={() => setOpen(true)}
					onBlur={closeSearchAfterSelectionChance}
					onKeyDown={event => {
						if (event.key === "Escape") setOpen(false)
						if (event.key === "Enter" && results[0]) {
							event.preventDefault()
							selectResult(results[0])
						}
					}}
					placeholder="Search disease, diagnosis, or ICD-10 code..."
					autoComplete="off"
				/>
				{open && (
					<div className="bg-popover text-popover-foreground ring-foreground/10 absolute z-[100] mt-1 max-h-64 w-full overflow-y-auto rounded-md border p-1 text-sm shadow-md ring-1">
						{query.isFetching ? (
							<div className="text-muted-foreground px-3 py-3">Searching ICD-10...</div>
						) : results.length > 0 ? (
							results.map(result => (
								<button
									key={result.id}
									type="button"
									className="hover:bg-muted focus:bg-muted block w-full rounded-sm px-3 py-2 text-left outline-hidden"
									onMouseDown={event => event.preventDefault()}
									onClick={() => selectResult(result)}
								>
									<span className="block font-mono text-xs font-semibold">{result.code}</span>
									<span className="block">{result.description}</span>
									{result.category && (
										<span className="text-muted-foreground block text-xs">{result.category}</span>
									)}
								</button>
							))
						) : (
							<div className="text-muted-foreground px-3 py-3">No ICD-10 matches</div>
						)}
					</div>
				)}
			</div>
			{value.length > 0 && (
				<div className="space-y-2">
					{value.map(diagnosis => (
						<div
							key={diagnosis.code}
							className="bg-primary/5 border-primary/20 flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm"
						>
							<div className="min-w-0">
								<span className="font-mono text-xs font-semibold">{diagnosis.code}</span>
								<p className="text-muted-foreground mt-1">{diagnosis.description}</p>
							</div>
							<div className="flex shrink-0 items-center gap-1">
								<Button
									type="button"
									size="icon"
									variant="ghost"
									className="size-7"
									aria-label={`Remove ${diagnosis.code}`}
									onClick={() => removeDiagnosis(diagnosis.code)}
								>
									<X className="size-3" />
								</Button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	)
}

interface NoteViewDialogProps {
	noteId: string
	encounterId?: string
	patientId?: string
	open: boolean
	onOpenChange: (open: boolean) => void
	canWrite?: boolean
}

export function NoteViewDialog({
	noteId,
	encounterId: _encounterId,
	patientId: _patientId,
	open,
	onOpenChange,
	canWrite,
}: NoteViewDialogProps) {
	const { data: note, isLoading } = useNoteDetailQuery(noteId)
	const { data: profile } = useMyProfile()

	const [editContent, setEditContent] = useState<string | null>(null)
	const [editStructuredData, setEditStructuredData] = useState<unknown>(null)
	const [signOpen, setSignOpen] = useState(false)
	const [addendumOpen, setAddendumOpen] = useState(false)
	const [activeTab, setActiveTab] = useState<"content" | "history">("content")

	const updateNote = useUpdateNoteMutation()
	const signAddendum = useSignAddendumMutation()

	const isEditing = editContent !== null
	const isDraft = note?.status === "draft"
	const isSigned = note?.status === "signed"
	const editDiagnoses = readDiagnoses(editStructuredData)
	const noteDiagnoses = readDiagnoses(note?.structuredData)

	const activeStaffProfile =
		profile?.staffProfiles?.find(p => p.roles.some(r => r.id === profile.activeRole?.id)) ??
		undefined
	const staffProfile =
		profile?.staffProfiles?.find(p => p.facilityId === note?.facilityId) ?? activeStaffProfile
	const isAuthor = staffProfile?.id === note?.authorStaffId
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
			{ id: note.id, content: editContent, structuredData: editStructuredData },
			{
				onSuccess: () => {
					setEditContent(null)
					setEditStructuredData(null)
				},
			}
		)
	}

	function startEditing() {
		if (!note) return
		setEditContent(note.content)
		setEditStructuredData(note.structuredData)
	}

	function handleSignAddendum(addendumId: string) {
		if (!note) return
		signAddendum.mutate({ id: addendumId })
	}

	return (
		<Dialog
			open={open}
			onOpenChange={nextOpen => {
				if (!nextOpen) {
					setActiveTab("content")
					setEditContent(null)
					setEditStructuredData(null)
				}
				onOpenChange(nextOpen)
			}}
		>
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

								<Tabs
									value={activeTab}
									onValueChange={value => setActiveTab(value as typeof activeTab)}
								>
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
												{requiresIcd10BeforeSigning(note.noteType) && (
													<>
														<Icd10DiagnosisEditField
															value={editDiagnoses}
															onChange={diagnoses =>
																setEditStructuredData((previous: unknown) =>
																	setDiagnoses(previous, diagnoses)
																)
															}
														/>
														<Separator />
													</>
												)}
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
													<Button
														size="sm"
														variant="outline"
														onClick={() => {
															setEditContent(null)
															setEditStructuredData(null)
														}}
													>
														Cancel
													</Button>
												</div>
											</div>
										) : (
											<div className="space-y-3">
												{noteDiagnoses.length > 0 && (
													<div className="rounded-md border p-3">
														<div className="mb-2 text-sm font-medium">ICD-10 Diagnoses</div>
														<div className="flex flex-wrap gap-1.5">
															{noteDiagnoses.map(diagnosis => (
																<Badge
																	key={diagnosis.code}
																	variant="secondary"
																	className="max-w-full justify-start gap-1.5 whitespace-normal text-left"
																>
																	<span className="font-mono">{diagnosis.code}</span>
																	<span>- {diagnosis.description}</span>
																</Badge>
															))}
														</div>
													</div>
												)}
												<div className="bg-muted/50 rounded-md border p-4 text-sm wrap-break-word whitespace-pre-wrap">
													{note.content || "No content"}
												</div>
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
																<div className="text-sm wrap-break-word whitespace-pre-wrap">
																	{addendum.content}
																</div>
																{addendum.authorStaffId === staffProfile?.id && (
																	<Button
																		size="sm"
																		variant="outline"
																		className="mt-1"
																		onClick={() => handleSignAddendum(addendum.id)}
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
									</TabsContent>

									<TabsContent value="history" className="mt-3">
										<NoteHistory note={note} />
									</TabsContent>
								</Tabs>
							</div>
						)}

						{/* ─── Footer Actions ─── */}
						{!signOpen && !addendumOpen && activeTab === "content" && (
							<div className="flex justify-end gap-2 pt-2">
								{isDraft && !isEditing && canWrite && isAuthor && (
									<>
										<Button variant="outline" onClick={startEditing}>
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
