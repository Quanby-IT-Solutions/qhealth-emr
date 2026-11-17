"use client"

import { useState } from "react"
import { ArrowLeft, Save } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	useCreateNoteMutation,
	useUpdateNoteMutation,
} from "@/features/clinical-docs/api/clinical-docs.hooks"

import { FpeReviewStep } from "./fpe-review-step"
import { EMPTY_FPE_DATA, FpeTemplate, type FpeData } from "./fpe-template"
import { getFpeValidation } from "./fpe-validation"

interface FpeEditorFlowProps {
	encounterId: string
	facilityId: string
	patientId?: string
	onBack: () => void
	onDone: () => void
}

export function FpeEditorFlow({
	encounterId,
	facilityId,
	patientId,
	onBack,
	onDone,
}: FpeEditorFlowProps) {
	const [step, setStep] = useState<"fill" | "review">("fill")
	const [fpeData, setFpeData] = useState<FpeData>({ ...EMPTY_FPE_DATA })
	const [noteId, setNoteId] = useState<string | null>(null)
	const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
	const [hasLocalChanges, setHasLocalChanges] = useState(false)

	const createNote = useCreateNoteMutation()
	const updateNote = useUpdateNoteMutation()
	const validation = getFpeValidation(fpeData)
	const isSaving = createNote.isPending || updateNote.isPending
	const hasSavedDraft = !!noteId

	const canSave = validation.canSaveDraft && !isSaving && (!hasSavedDraft || hasLocalChanges)
	const canReview = hasSavedDraft && validation.canReview && !hasLocalChanges && !isSaving

	function handleChange(nextData: FpeData) {
		setFpeData(nextData)
		setHasLocalChanges(true)
	}

	function handleSave() {
		if (!canSave) return

		if (!noteId) {
			createNote.mutate(
				{
					facilityId,
					encounterId,
					noteType: "fpe",
					content: "",
					structuredData: fpeData,
				},
				{
					onSuccess: note => {
						setNoteId(note.id)
						setLastSavedAt(new Date().toISOString())
						setHasLocalChanges(false)
					},
				}
			)
		} else {
			updateNote.mutate(
				{ id: noteId, structuredData: fpeData },
				{
					onSuccess: () => {
						setLastSavedAt(new Date().toISOString())
						setHasLocalChanges(false)
					},
				}
			)
		}
	}

	if (step === "review" && noteId) {
		return (
			<FpeReviewStep
				fpeData={fpeData}
				noteId={noteId}
				facilityId={facilityId}
				onBack={() => setStep("fill")}
				onSuccess={onDone}
			/>
		)
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<Button variant="ghost" size="icon" onClick={onBack}>
						<ArrowLeft className="size-4" />
					</Button>
					<div>
						<div className="flex items-center gap-2">
							<span className="text-base font-semibold">FPE / Konsulta</span>
							<Badge variant="secondary">PhilHealth</Badge>
						</div>
						{lastSavedAt && (
							<p className="text-muted-foreground text-xs">
								{hasLocalChanges ? "Unsaved changes" : "Saved"}{" "}
								{new Date(lastSavedAt).toLocaleTimeString("en-PH", {
									hour: "2-digit",
									minute: "2-digit",
								})}
							</p>
						)}
					</div>
				</div>

				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm" disabled={!canSave} onClick={handleSave}>
						<Save className="mr-1.5 size-3.5" />
						{isSaving ? "Saving..." : hasSavedDraft ? "Save Draft Changes" : "Save Draft"}
					</Button>
					<Button size="sm" disabled={!canReview} onClick={() => setStep("review")}>
						Review &amp; Submit -&gt;
					</Button>
				</div>
			</div>

			<FpeTemplate
				value={fpeData}
				onChange={handleChange}
				validation={validation}
				facilityId={facilityId}
				encounterId={encounterId}
				patientId={patientId}
			/>

			{!validation.canReview && (
				<div className="border-destructive/40 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm">
					Fix these fields before Review &amp; Submit: {validation.allBlockingMessages.join(", ")}
				</div>
			)}

			{validation.canReview && hasLocalChanges && (
				<div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
					Save draft changes before Review &amp; Submit.
				</div>
			)}

			{!noteId && (
				<p className="text-muted-foreground pb-4 text-center text-xs">
					Save a draft first to enable Review &amp; Submit
				</p>
			)}
		</div>
	)
}
