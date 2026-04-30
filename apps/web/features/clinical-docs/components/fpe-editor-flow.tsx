"use client"

import { useState } from "react"
import { ArrowLeft, Save } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	useCreateNoteMutation,
	useUpdateNoteMutation,
} from "@/features/clinical-docs/api/clinical-docs.hooks"

import { FpeTemplate, EMPTY_FPE_DATA, type FpeData } from "./fpe-template"
import { FpeReviewStep } from "./fpe-review-step"

// ─── Props ───────────────────────────────────────────────────────────────────

interface FpeEditorFlowProps {
	encounterId: string
	facilityId: string
	patientId: string
	onBack: () => void
	onDone: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

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

	const createNote = useCreateNoteMutation()
	const updateNote = useUpdateNoteMutation()

	const canSave =
		!!fpeData.primaryDiagnosis.code.trim() &&
		!createNote.isPending &&
		!updateNote.isPending

	const canReview = !!noteId && !!fpeData.primaryDiagnosis.code.trim()

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
					},
				}
			)
		} else {
			updateNote.mutate(
				{ id: noteId, structuredData: fpeData },
				{
					onSuccess: () => setLastSavedAt(new Date().toISOString()),
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
				patientId={patientId}
				encounterId={encounterId}
				onBack={() => setStep("fill")}
				onSuccess={onDone}
			/>
		)
	}

	return (
		<div className="space-y-4">
			{/* Header */}
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
							<p className="text-xs text-muted-foreground">
								Saved {new Date(lastSavedAt).toLocaleTimeString("en-PH", {
									hour: "2-digit",
									minute: "2-digit",
								})}
							</p>
						)}
					</div>
				</div>

				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={!canSave}
						onClick={handleSave}
					>
						<Save className="size-3.5 mr-1.5" />
						Save Draft
					</Button>
					<Button
						size="sm"
						disabled={!canReview}
						onClick={() => setStep("review")}
					>
						Review &amp; Submit →
					</Button>
				</div>
			</div>

			{/* Editor */}
			<FpeTemplate value={fpeData} onChange={setFpeData} />

			{/* Sticky footer hint */}
			{!noteId && (
				<p className="text-xs text-muted-foreground text-center pb-4">
					Save a draft first to enable Review &amp; Submit
				</p>
			)}
		</div>
	)
}
