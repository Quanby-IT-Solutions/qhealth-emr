"use client"

import { use, useState } from "react"
import Link from "next/link"
import { ArrowRight, CheckCircle } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Label } from "@/core/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/core/components/ui/radio-group"
import { Textarea } from "@/core/components/ui/textarea"
import { DocumentUploadDrawer } from "@/features/msw/assessment-coe/components/document-upload-drawer"
import { MswEvaluationForm } from "@/features/msw/assessment-coe/components/msw-evaluation-form"
import { EncounterContextBar } from "@/features/msw/components/encounter-context-bar"
import {
	useMswEvaluationQuery,
	useUpsertAssessmentMutation,
} from "@/features/msw/assessment-coe/api/assessment.hooks"

type EligibilityDecision = "malasakit" | "z_benefits" | "indigent" | "not_eligible"

const ELIGIBILITY_OPTIONS: {
	value: EligibilityDecision
	label: string
	description: string
}[] = [
	{
		value: "malasakit",
		label: "Malasakit Center",
		description: "Eligible for Malasakit assistance",
	},
	{
		value: "z_benefits",
		label: "Z-Benefits",
		description: "PhilHealth Z-Benefits coverage",
	},
	{
		value: "indigent",
		label: "Indigent",
		description: "Qualified as indigent patient",
	},
	{
		value: "not_eligible",
		label: "Not Eligible",
		description: "Does not qualify for assistance",
	},
]

interface AssessmentPageProps {
	params: Promise<{ encounterId: string }>
}

export default function AssessmentPage({ params }: AssessmentPageProps) {
	const { encounterId } = use(params)
	const { data: evaluation } = useMswEvaluationQuery(encounterId)
	const upsertMutation = useUpsertAssessmentMutation()

	const storedDecision = (
		evaluation?.evaluationFindings as Record<string, unknown> | null
	)?.eligibilityDecision as EligibilityDecision | undefined

	const [eligibilityDecision, setEligibilityDecision] = useState<EligibilityDecision>(
		storedDecision ?? "not_eligible"
	)
	const [recommendationNotes, setRecommendationNotes] = useState("")
	const [decisionSaved, setDecisionSaved] = useState(false)

	const handleSaveDecision = () => {
		if (!evaluation) return
		upsertMutation.mutate(
			{
				encounterId,
				patientId: evaluation.patientId,
				facilityId: evaluation.facilityId,
				eligibilityDecision,
				recommendationNotes: recommendationNotes || undefined,
			},
			{ onSuccess: () => setDecisionSaved(true) }
		)
	}

	return (
		<div className="space-y-4">
			<EncounterContextBar encounterId={encounterId} />

			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-xl font-semibold">Financial Evaluation & Assessment</h1>
					<p className="text-sm text-muted-foreground">Story 12.8 · Flow L8</p>
				</div>
				<Link href={`/msw/encounters/${encounterId}/coe`}>
					<Button
						variant="outline"
						size="sm"
						className="gap-1.5"
						aria-disabled={!storedDecision && !decisionSaved}
					>
						Proceed to CoE
						<ArrowRight className="size-4" />
					</Button>
				</Link>
			</div>

			<MswEvaluationForm encounterId={encounterId} patientId={evaluation?.patientId ?? ""} facilityId={evaluation?.facilityId} />

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Documents</CardTitle>
				</CardHeader>
				<CardContent>
					<DocumentUploadDrawer />
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Eligibility Decision</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<RadioGroup
						value={eligibilityDecision}
						onValueChange={(v) => {
							setEligibilityDecision(v as EligibilityDecision)
							setDecisionSaved(false)
						}}
					>
						<div className="grid gap-3 sm:grid-cols-2">
							{ELIGIBILITY_OPTIONS.map((opt) => (
								<div
									key={opt.value}
									className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent/50"
								>
									<RadioGroupItem value={opt.value} id={opt.value} className="mt-0.5" />
									<div>
										<Label htmlFor={opt.value} className="cursor-pointer font-medium">
											{opt.label}
										</Label>
										<p className="text-xs text-muted-foreground">{opt.description}</p>
									</div>
								</div>
							))}
						</div>
					</RadioGroup>

					<div className="space-y-1.5">
						<Label htmlFor="recommendationNotes">Recommendation Notes</Label>
						<Textarea
							id="recommendationNotes"
							rows={3}
							placeholder="MSW recommendation and next steps…"
							value={recommendationNotes}
							onChange={(e) => setRecommendationNotes(e.target.value)}
						/>
					</div>

					{upsertMutation.isError && (
						<p className="text-xs text-destructive">
							{(upsertMutation.error as Error).message}
						</p>
					)}

					{decisionSaved && (
						<div className="flex items-center gap-1.5 text-xs text-green-600">
							<CheckCircle className="size-3.5" />
							Eligibility decision saved.
						</div>
					)}

					<Button
						type="button"
						size="sm"
						disabled={!evaluation || upsertMutation.isPending}
						onClick={handleSaveDecision}
					>
						{upsertMutation.isPending ? "Saving…" : "Save Eligibility Decision"}
					</Button>
				</CardContent>
			</Card>
		</div>
	)
}
