"use client"

import { AlertCircle, CheckCircle } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"

import type { BenefitTag } from "@/features/msw/api/msw.hooks"
import {
	useBenefitTagsQuery,
	useUpdateBenefitTagsMutation,
} from "@/features/msw/api/msw.hooks"

const BENEFIT_TAG_CONFIG: { value: BenefitTag; label: string; description: string }[] = [
	{
		value: "konsulta",
		label: "Konsulta",
		description: "PhilHealth outpatient benefit package",
	},
	{
		value: "z_benefit",
		label: "Z-Benefit",
		description: "Catastrophic/expensive illness coverage",
	},
	{
		value: "malasakit",
		label: "Malasakit Center",
		description: "Multi-agency financial assistance (PhilHealth + PCSO + DSWD + DOH)",
	},
	{
		value: "pcso_assistance",
		label: "PCSO Assistance",
		description: "Philippine Charity Sweepstakes Office medical assistance",
	},
	{
		value: "dswd_assistance",
		label: "DSWD Assistance",
		description: "Department of Social Welfare and Development medical assistance",
	},
	{
		value: "cataract_package",
		label: "Cataract Package",
		description: "PhilHealth outpatient cataract surgery benefit",
	},
	{
		value: "tb_dots",
		label: "TB-DOTS",
		description: "Tuberculosis Directly Observed Treatment Short-Course",
	},
	{
		value: "maternity_care",
		label: "Maternity Care Package",
		description: "PhilHealth normal spontaneous delivery / maternity package",
	},
]

interface BenefitTagsProps {
	encounterId: string
	patientId: string
}

export function BenefitTags({ encounterId, patientId }: BenefitTagsProps) {
	const { data: existing, isLoading } = useBenefitTagsQuery(encounterId)
	const updateMutation = useUpdateBenefitTagsMutation()

	const activeTags = existing?.tags ?? []

	const toggleTag = (tag: BenefitTag) => {
		const newTags = activeTags.includes(tag)
			? activeTags.filter((t) => t !== tag)
			: [...activeTags, tag]

		updateMutation.mutate({ encounterId, patientId, tags: newTags })
	}

	if (isLoading) {
		return (
			<Card>
				<CardContent className="py-6 text-center text-sm text-muted-foreground">
					Loading benefit tags…
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-start justify-between">
					<div>
						<CardTitle className="text-base">Benefit Tags</CardTitle>
						<p className="mt-0.5 text-sm text-muted-foreground">
							Tag applicable benefit programs. Tags are visible in the billing module.
						</p>
					</div>
					{activeTags.length > 0 && (
						<span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
							{activeTags.length} active
						</span>
					)}
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				{BENEFIT_TAG_CONFIG.map(({ value, label, description }) => {
					const isActive = activeTags.includes(value)
					return (
						<Button
							key={value}
							type="button"
							variant="ghost"
							onClick={() => toggleTag(value)}
							disabled={updateMutation.isPending}
							className={`h-auto w-full justify-start gap-4 rounded-lg border px-4 py-3 text-left transition-colors ${
								isActive
									? "border-primary bg-primary/5 hover:bg-primary/10"
									: "border-input bg-background hover:bg-accent"
							}`}
						>
							{/* Toggle indicator */}
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
								<span className="text-xs font-normal text-muted-foreground">
									{description}
								</span>
							</div>
						</Button>
					)
				})}

				{updateMutation.isError && (
					<div className="flex items-center gap-2 text-sm text-destructive">
						<AlertCircle className="size-4 shrink-0" />
						<span>Failed to update tags. Please try again.</span>
					</div>
				)}

				{updateMutation.isSuccess && (
					<div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
						<CheckCircle className="size-4 shrink-0" />
						<span>Benefit tags updated.</span>
					</div>
				)}

				{existing && (
					<p className="pt-1 text-xs text-muted-foreground">
						Last updated by{" "}
						<span className="font-medium">{existing.taggedByName}</span> ·{" "}
						{new Date(existing.updatedAt).toLocaleDateString(undefined, {
							day: "numeric",
							month: "short",
							year: "numeric",
						})}
					</p>
				)}
			</CardContent>
		</Card>
	)
}
