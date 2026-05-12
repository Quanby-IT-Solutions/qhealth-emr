"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { useMswEvaluationQuery } from "@/features/msw/assessment-coe/api/assessment.hooks"
import { BenefitTags } from "@/features/msw/assessment-coe/components/benefit-tags"
import { CoeIssuance } from "@/features/msw/assessment-coe/components/coe-issuance"
import { MswEvaluationForm } from "@/features/msw/assessment-coe/components/msw-evaluation-form"
import { AnnexPanel } from "@/features/msw/annex-signatures/components/annex-panel"

const FINANCIAL_CLASS_BADGE: Record<string, { label: string; className: string }> = {
	a: { label: "Class A", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
	b: { label: "Class B", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
	c: { label: "Class C", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
	d: { label: "Class D", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
}

interface MswTabProps {
	encounterId: string
	patientId: string
	facilityId: string
}

export function MswTab({ encounterId, patientId, facilityId }: MswTabProps) {
	const { data: evaluation } = useMswEvaluationQuery(encounterId)

	return (
		<div className="space-y-4">
			<Tabs defaultValue="evaluation">
				<TabsList variant="line">
					<TabsTrigger value="evaluation">Evaluation</TabsTrigger>
					<TabsTrigger value="coe">CoE Issuance</TabsTrigger>
					<TabsTrigger value="consent">Consent Forms</TabsTrigger>
					<TabsTrigger value="benefits">Benefit Tags</TabsTrigger>
				</TabsList>

				<div className="mt-4">
					<TabsContent value="evaluation">
						<MswEvaluationForm
							encounterId={encounterId}
							patientId={patientId}
							facilityId={facilityId}
						/>
					</TabsContent>

					<TabsContent value="coe">
						{evaluation ? (
							<CoeIssuance evaluationId={evaluation.id} encounterId={encounterId} />
						) : (
							<p className="py-4 text-center text-sm text-muted-foreground">
								Complete the financial evaluation first to issue a CoE.
							</p>
						)}
					</TabsContent>

					<TabsContent value="consent">
						<div className="space-y-4">
							<AnnexPanel annexType="a" encounterId={encounterId} />
							<AnnexPanel annexType="b" encounterId={encounterId} />
						</div>
					</TabsContent>

					<TabsContent value="benefits">
						<BenefitTags encounterId={encounterId} patientId={patientId} />
					</TabsContent>
				</div>
			</Tabs>
		</div>
	)
}

export { FINANCIAL_CLASS_BADGE }
