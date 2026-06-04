"use client"

import { AlertCircle, CheckCircle } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"

import { useMswEvaluationQuery, useTagBenefitsMutation } from "../api/assessment.hooks"

interface BenefitTagConfig {
	key: "konsultaTagged" | "zBenefitsTagged"
	label: string
	description: string
}

const BENEFIT_TAGS: BenefitTagConfig[] = [
	{
		key: "konsultaTagged",
		label: "Konsulta",
		description: "PhilHealth outpatient benefit package",
	},
	{
		key: "zBenefitsTagged",
		label: "Z-Benefits",
		description: "Catastrophic / expensive illness coverage (PhilHealth Z-Benefits)",
	},
]

interface BenefitTagsProps {
	encounterId: string
	patientId: string
}

export function BenefitTags({ encounterId }: BenefitTagsProps) {
	const { data: evaluation, isLoading } = useMswEvaluationQuery(encounterId)
	const tagMutation = useTagBenefitsMutation()

	const konsultaTagged = evaluation?.konsultaTagged ?? false
	const zBenefitsTagged = evaluation?.zBenefitsTagged ?? false

	const toggleTag = (key: "konsultaTagged" | "zBenefitsTagged") => {
		if (!evaluation?.id) return
		tagMutation.mutate({
			evaluationId: evaluation.id,
			konsultaTagged: key === "konsultaTagged" ? !konsultaTagged : konsultaTagged,
			zBenefitsTagged: key === "zBenefitsTagged" ? !zBenefitsTagged : zBenefitsTagged,
		})
	}

	if (isLoading) {
		return (
			<Card>
				<CardContent className="text-muted-foreground py-6 text-center text-sm">
					Loading benefit tags…
				</CardContent>
			</Card>
		)
	}

	if (!evaluation) {
		return (
			<Card>
				<CardContent className="text-muted-foreground py-6 text-center text-sm">
					Complete the financial evaluation first to tag benefits.
				</CardContent>
			</Card>
		)
	}

	const activeCount = [konsultaTagged, zBenefitsTagged].filter(Boolean).length

	return (
		<Card>
			<CardHeader>
				<div className="flex items-start justify-between">
					<div>
						<CardTitle className="text-base">Benefit Tags</CardTitle>
						<p className="text-muted-foreground mt-0.5 text-sm">
							Tag applicable PhilHealth benefit programs. Visible in the billing module.
						</p>
					</div>
					{activeCount > 0 && (
						<span className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-medium">
							{activeCount} active
						</span>
					)}
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				{BENEFIT_TAGS.map(({ key, label, description }) => {
					const isActive = key === "konsultaTagged" ? konsultaTagged : zBenefitsTagged
					return (
						<Button
							key={key}
							type="button"
							variant="ghost"
							onClick={() => toggleTag(key)}
							disabled={tagMutation.isPending}
							className={`h-auto w-full justify-start gap-4 rounded-lg border px-4 py-3 text-left transition-colors ${
								isActive
									? "border-primary bg-primary/5 hover:bg-primary/10"
									: "border-input bg-background hover:bg-accent"
							}`}
						>
							<div
								className={`mt-0.5 size-4 shrink-0 rounded-full border-2 transition-colors ${
									isActive
										? "border-primary bg-primary"
										: "border-muted-foreground/30 bg-transparent"
								}`}
							/>
							<div className="flex flex-col gap-0.5">
								<span
									className={`text-sm font-medium ${isActive ? "text-primary" : "text-foreground"}`}
								>
									{label}
								</span>
								<span className="text-muted-foreground text-xs font-normal">{description}</span>
							</div>
						</Button>
					)
				})}

				{tagMutation.isError && (
					<div className="text-destructive flex items-center gap-2 text-sm">
						<AlertCircle className="size-4 shrink-0" />
						<span>Failed to update tags. Please try again.</span>
					</div>
				)}

				{tagMutation.isSuccess && (
					<div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
						<CheckCircle className="size-4 shrink-0" />
						<span>Benefit tags updated.</span>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
