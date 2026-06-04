"use client"

import { useState } from "react"
import { AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Button } from "@/core/components/ui/button"
import { useSubmitFpeMutation } from "@/features/clinical-docs/api/clinical-docs.hooks"

import { FpeTemplate, type FpeData } from "./fpe-template"
import { getFpeValidation } from "./fpe-validation"

interface FpeReviewStepProps {
	fpeData: FpeData
	noteId: string
	facilityId: string
	onBack: () => void
	onSuccess: () => void
}

export function FpeReviewStep({
	fpeData,
	noteId,
	facilityId,
	onBack,
	onSuccess,
}: FpeReviewStepProps) {
	const [done, setDone] = useState(false)
	const submitFpe = useSubmitFpeMutation()

	const validation = getFpeValidation(fpeData)
	const blockingMessages = validation.allBlockingMessages
	const isComplete = validation.canReview
	const isSubmitting = submitFpe.isPending

	function handleSubmit() {
		submitFpe.mutate(
			{ noteId, facilityId },
			{
				onSuccess: () => setDone(true),
			}
		)
	}

	if (done) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
				<CheckCircle2 className="size-12 text-green-500" />
				<h3 className="text-lg font-semibold">FPE Archived</h3>
				<p className="text-muted-foreground max-w-sm text-sm">
					The FPE note has been signed and archived, and the Konsulta capitation activity has been
					recorded.
				</p>
				<Button onClick={onSuccess}>Done</Button>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<Button variant="ghost" size="icon" onClick={onBack} disabled={isSubmitting}>
					<ArrowLeft className="size-4" />
				</Button>
				<div>
					<h2 className="text-base font-semibold">PhilHealth FPE - Review &amp; Submit</h2>
					<p className="text-muted-foreground text-xs">Verify all fields before archiving</p>
				</div>
			</div>

			{isComplete ? (
				<Alert className="border-green-200 bg-green-50 text-green-800">
					<CheckCircle2 className="size-4 text-green-600" />
					<AlertDescription>All required fields are complete.</AlertDescription>
				</Alert>
			) : (
				<Alert variant="destructive">
					<AlertTriangle className="size-4" />
					<AlertDescription>
						<strong>Fix required fields:</strong> {blockingMessages.join(", ")}
					</AlertDescription>
				</Alert>
			)}

			{submitFpe.isError && (
				<Alert variant="destructive">
					<AlertTriangle className="size-4" />
					<AlertDescription>
						{submitFpe.error instanceof Error ? submitFpe.error.message : "Submission failed"}
					</AlertDescription>
				</Alert>
			)}

			<FpeTemplate value={fpeData} readOnly validation={validation} />

			<div className="flex justify-between pt-2 pb-6">
				<Button variant="outline" onClick={onBack} disabled={isSubmitting}>
					Cancel
				</Button>
				<Button onClick={handleSubmit} disabled={!isComplete || isSubmitting}>
					{isSubmitting ? "Submitting..." : "Submit & Archive FPE ->"}
				</Button>
			</div>
		</div>
	)
}
