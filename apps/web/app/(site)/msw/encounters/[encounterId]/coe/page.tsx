"use client"

import { use } from "react"
import Link from "next/link"
import { ArrowLeft, Lock } from "lucide-react"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Button } from "@/core/components/ui/button"
import { CoeIssuance } from "@/features/msw/assessment-coe/components/coe-issuance"
import { EncounterContextBar } from "@/features/msw/components/encounter-context-bar"
import { useMswEvaluationQuery } from "@/features/msw/assessment-coe/api/assessment.hooks"

interface CoePageProps {
	params: Promise<{ encounterId: string }>
}

export default function CoePage({ params }: CoePageProps) {
	const { encounterId } = use(params)
	const { data: evaluation, isLoading } = useMswEvaluationQuery(encounterId)

	const hasEligibilityDecision = evaluation?.evaluationFindings != null
	const coeAlreadyIssued = evaluation?.coeIssued ?? false

	return (
		<div className="space-y-4">
			<EncounterContextBar encounterId={encounterId} />

			<div className="flex items-center gap-3">
				<Link href={`/msw/encounters/${encounterId}/assessment`}>
					<Button variant="ghost" size="sm" className="gap-1.5">
						<ArrowLeft className="size-4" />
						Back to Assessment
					</Button>
				</Link>
			</div>

			<div>
				<h1 className="text-xl font-semibold">
					Certificate of Eligibility (CoE) Issuance
				</h1>
				<p className="text-sm text-muted-foreground">Story 12.8 · Flow L8</p>
			</div>

			{isLoading ? (
				<p className="text-sm text-muted-foreground">Loading…</p>
			) : !evaluation ? (
				<Alert>
					<AlertDescription>
						No assessment found for this encounter.{" "}
						<Link
							href={`/msw/encounters/${encounterId}/assessment`}
							className="underline"
						>
							Complete the assessment first.
						</Link>
					</AlertDescription>
				</Alert>
			) : coeAlreadyIssued ? (
				<Alert>
					<Lock className="size-4" />
					<AlertDescription>
						A CoE has already been issued and the form is locked. Revoke the existing CoE
						to make changes.
					</AlertDescription>
				</Alert>
			) : (
				<>
					{!hasEligibilityDecision && (
						<Alert>
							<AlertDescription>
								An eligibility decision is required before issuing a CoE.{" "}
								<Link
									href={`/msw/encounters/${encounterId}/assessment`}
									className="underline"
								>
									Set eligibility decision.
								</Link>
							</AlertDescription>
						</Alert>
					)}
					<CoeIssuance
						evaluationId={evaluation.id}
						encounterId={encounterId}
					/>
				</>
			)}
		</div>
	)
}
