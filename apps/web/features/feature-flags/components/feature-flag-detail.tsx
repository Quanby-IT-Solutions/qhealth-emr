"use client"

import Link from "next/link"
import { useState } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Switch } from "@/core/components/ui/switch"
import {
	useFeatureFlagDetailQuery,
	useUpdateFeatureFlagTargetingMutation,
} from "@/features/feature-flags/api/feature-flags.hooks"

interface FeatureFlagDetailProps {
	flagId: string
}

const ENVIRONMENT_LABELS: Record<string, string> = {
	dev: "Development",
	staging: "Staging",
	prod: "Production",
}

const RISK_LEVEL_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
	high: "destructive",
	moderate: "default",
	low: "secondary",
}

export function FeatureFlagDetail({ flagId }: FeatureFlagDetailProps) {
	const { data: flag, isPending, isError } = useFeatureFlagDetailQuery(flagId)
	const updateTargeting = useUpdateFeatureFlagTargetingMutation()

	// Draft: track toggled target ids
	const [draftToggles, setDraftToggles] = useState<Record<string, boolean>>({})

	if (isPending) {
		return <p className="text-muted-foreground text-sm">Loading…</p>
	}

	if (isError || !flag) {
		return (
			<p className="text-destructive text-sm">
				Failed to load feature flag. It may not exist.
			</p>
		)
	}

	const targets = flag.targets ?? []

	const getTargetEnabled = (targetId: string, current: boolean) =>
		draftToggles[targetId] !== undefined ? draftToggles[targetId] : current

	const toggleTarget = (targetId: string, current: boolean) => {
		setDraftToggles(prev => ({ ...prev, [targetId]: !current }))
	}

	const hasDraft = Object.keys(draftToggles).length > 0

	const handleSave = async () => {
		const mergedTargets = targets.map(t => ({
			environment: t.environment,
			facilityId: t.facilityId,
			roleId: t.roleId,
			enabled: getTargetEnabled(t.id, t.enabled),
		}))

		await updateTargeting.mutateAsync({
			flagId: flag.id,
			targets: mergedTargets,
		})
		setDraftToggles({})
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="space-y-1">
				<div className="text-muted-foreground flex items-center gap-2 text-sm">
					<Link href="/admin/feature-flags" className="hover:underline">
						Feature Flags
					</Link>
					<span>/</span>
					<span>{flag.name}</span>
				</div>
				<div className="flex items-start justify-between gap-4">
					<div className="space-y-1">
						<h1 className="text-2xl font-semibold">{flag.name}</h1>
						{flag.description && (
							<p className="text-muted-foreground text-sm">{flag.description}</p>
						)}
					</div>
					<div className="flex flex-wrap gap-2">
						<Badge variant={RISK_LEVEL_VARIANT[flag.riskLevel]}>{flag.riskLevel} risk</Badge>
						<Badge variant="outline">{flag.group}</Badge>
					</div>
				</div>
			</div>

			{/* Definition card */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Flag definition</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-3 text-sm sm:grid-cols-2">
					<div>
						<p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
							Key
						</p>
						<p className="font-mono">{flag.key}</p>
					</div>
					<div>
						<p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
							Default enabled
						</p>
						<p>{flag.defaultEnabled ? "Yes" : "No"}</p>
					</div>
					{flag.ownerTeam && (
						<div>
							<p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
								Owner team
							</p>
							<p>{flag.ownerTeam}</p>
						</div>
					)}
					<div>
						<p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
							Group
						</p>
						<p className="capitalize">{flag.group.replace("-", " ")}</p>
					</div>
				</CardContent>
			</Card>

			{/* Targeting configuration */}
			<div className="space-y-3">
				<div className="flex items-center justify-between gap-4">
					<div className="space-y-1">
						<h2 className="text-lg font-medium">Targeting overrides</h2>
						<p className="text-muted-foreground text-sm">
							Each row overrides the default for the intersection of non-null dimensions.
							Null means wildcard. Highest specificity tier wins; within a tier, any{" "}
							<em>disabled</em> entry disables the flag.
						</p>
					</div>
					<Button
						onClick={handleSave}
						disabled={!hasDraft || updateTargeting.isPending}
						size="sm"
					>
						{updateTargeting.isPending ? "Saving…" : "Save targeting"}
					</Button>
				</div>

				{targets.length === 0 && (
					<Card className="border-dashed">
						<CardHeader>
							<CardTitle className="text-base">No targeting overrides</CardTitle>
							<CardDescription>
								This flag resolves to its default ({flag.defaultEnabled ? "enabled" : "disabled"}) for all contexts.
							</CardDescription>
						</CardHeader>
					</Card>
				)}

				{targets.length > 0 && (
					<div className="overflow-x-auto rounded-lg border">
						<table className="w-full text-sm">
							<thead>
								<tr className="bg-muted/50 border-b">
									<th className="px-4 py-2 text-left font-medium">Environment</th>
									<th className="px-4 py-2 text-left font-medium">Facility</th>
									<th className="px-4 py-2 text-left font-medium">Role</th>
									<th className="px-4 py-2 text-left font-medium">Enabled</th>
								</tr>
							</thead>
							<tbody>
								{targets.map(target => {
									const enabled = getTargetEnabled(target.id, target.enabled)
									const isDirty = draftToggles[target.id] !== undefined

									return (
										<tr
											key={target.id}
											className={`border-b last:border-0 ${isDirty ? "bg-yellow-50 dark:bg-yellow-950/20" : ""}`}
										>
											<td className="px-4 py-2">
												{target.environment
													? ENVIRONMENT_LABELS[target.environment] ?? target.environment
													: <span className="text-muted-foreground italic">Any</span>}
											</td>
											<td className="px-4 py-2">
												{target.facilityId
													? <span className="font-mono text-xs">{target.facilityId}</span>
													: <span className="text-muted-foreground italic">Any</span>}
											</td>
											<td className="px-4 py-2">
												{target.roleId
													? <span className="font-mono text-xs">{target.roleId}</span>
													: <span className="text-muted-foreground italic">Any</span>}
											</td>
											<td className="px-4 py-2">
												<Switch
													checked={enabled}
													onCheckedChange={() => toggleTarget(target.id, enabled)}
													aria-label="Toggle target"
												/>
											</td>
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	)
}
