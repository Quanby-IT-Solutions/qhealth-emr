"use client"

import Link from "next/link"
import { startTransition, useEffect, useState } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"
import { Switch } from "@/core/components/ui/switch"
import { useFeatureFlagsListQuery, useUpdateFeatureFlagMutation } from "@/features/feature-flags/api/feature-flags.hooks"

type FeatureFlagGroup = "platform-control" | "compliance" | "integration"

const FEATURE_FLAG_GROUPS: Array<{ value: FeatureFlagGroup; title: string; description: string }> = [
	{
		value: "platform-control",
		title: "Platform Control",
		description: "Operational feature gates for staged rollout and support workflows.",
	},
	{
		value: "compliance",
		title: "Compliance Controls",
		description: "Toggles that affect regulatory evidence, audit strength, or TOR-mandated safeguards.",
	},
	{
		value: "integration",
		title: "Integration Rollouts",
		description: "Feature gates for external systems and phased partner activation.",
	},
]

export function FeatureFlagsPanel() {
	const { data, isPending, isError } = useFeatureFlagsListQuery()
	const updateMutation = useUpdateFeatureFlagMutation()

	// Draft state: map from flagId → override defaultEnabled
	const [draft, setDraft] = useState<Record<string, boolean>>({})

	// Clear draft when server data reloads (e.g. after a successful save)
	useEffect(() => {
		setDraft({})
	}, [data])

	const flags = data?.data ?? []
	const hasDraftChanges = Object.keys(draft).length > 0

	const getEnabled = (flagId: string, defaultEnabled: boolean) =>
		draft[flagId] !== undefined ? draft[flagId] : defaultEnabled

	const toggleFlag = (flagId: string, currentEnabled: boolean) => {
		startTransition(() => {
			setDraft(prev => ({ ...prev, [flagId]: !currentEnabled }))
		})
	}

	const handlePersist = async () => {
		const mutations = Object.entries(draft).map(([id, defaultEnabled]) =>
			updateMutation.mutateAsync({ id, defaultEnabled })
		)
		await Promise.all(mutations)
		// draft is cleared by the useEffect above when data refreshes
	}

	const serverEnabledCount = flags.filter(f => getEnabled(f.id, f.defaultEnabled)).length
	const highRiskCount = flags.filter(f => f.riskLevel === "high").length

	if (isPending) {
		return (
			<div className="space-y-6">
				<div className="space-y-2">
					<h1 className="text-2xl font-semibold">Feature Flags</h1>
				</div>
				<p className="text-muted-foreground text-sm">Loading feature flags…</p>
			</div>
		)
	}

	if (isError) {
		return (
			<div className="space-y-6">
				<div className="space-y-2">
					<h1 className="text-2xl font-semibold">Feature Flags</h1>
				</div>
				<p className="text-destructive text-sm">Failed to load feature flags. Please refresh.</p>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold">Feature Flags</h1>
				<p className="text-muted-foreground max-w-3xl text-sm">
					Release controls let administrators stage new workflows, protect high-risk
					clinical changes, and phase integrations without editing role definitions.
					Use the detail page to configure per-environment and per-facility targeting.
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>Total flags</CardDescription>
						<CardTitle className="text-3xl">{flags.length}</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>Enabled (default)</CardDescription>
						<CardTitle className="text-3xl">{serverEnabledCount}</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>High-risk controls</CardDescription>
						<CardTitle className="text-3xl">{highRiskCount}</CardTitle>
					</CardHeader>
				</Card>
			</div>

			{FEATURE_FLAG_GROUPS.map(group => {
				const groupFlags = flags.filter(flag => flag.group === group.value)
				if (groupFlags.length === 0) return null

				return (
					<section key={group.value} className="space-y-3">
						<div className="space-y-1">
							<h2 className="text-lg font-medium">{group.title}</h2>
							<p className="text-muted-foreground text-sm">{group.description}</p>
						</div>
						<div className="grid gap-4 xl:grid-cols-2">
							{groupFlags.map(flag => {
								const enabled = getEnabled(flag.id, flag.defaultEnabled)
								const isDirty = draft[flag.id] !== undefined

								return (
									<Card key={flag.id} className={isDirty ? "ring-primary ring-1" : ""}>
										<CardHeader className="gap-3">
											<div className="flex items-start justify-between gap-3">
												<div className="space-y-1">
													<CardTitle className="text-base">{flag.name}</CardTitle>
													{flag.description && (
														<CardDescription>{flag.description}</CardDescription>
													)}
												</div>
												<Switch
													checked={enabled}
													onCheckedChange={() => toggleFlag(flag.id, enabled)}
													aria-label={`Toggle ${flag.name}`}
												/>
											</div>
										</CardHeader>
										<CardContent className="space-y-3">
											<div className="flex flex-wrap gap-2 text-xs">
												{flag.ownerTeam && (
													<Badge variant="outline">Owner: {flag.ownerTeam}</Badge>
												)}
												<Badge variant="outline">Key: {flag.key}</Badge>
												<Badge variant={flag.riskLevel === "high" ? "default" : "secondary"}>
													{flag.riskLevel} risk
												</Badge>
												{isDirty && (
													<Badge variant="destructive">Unsaved</Badge>
												)}
											</div>
											<Separator />
											<div className="flex items-center justify-between gap-3">
												<p className="text-muted-foreground text-sm">
													{enabled
														? "Enabled by default across all contexts."
														: "Disabled by default. Targeting rules may override."}
												</p>
												<Button variant="ghost" size="sm" asChild>
													<Link href={`/admin/feature-flags/${flag.id}`}>
														Configure targeting →
													</Link>
												</Button>
											</div>
										</CardContent>
									</Card>
								)
							})}
						</div>
					</section>
				)
			})}

			{flags.length === 0 && (
				<Card className="border-dashed">
					<CardHeader>
						<CardTitle className="text-base">No feature flags configured</CardTitle>
						<CardDescription>
							Create your first feature flag to start managing staged rollouts.
						</CardDescription>
					</CardHeader>
				</Card>
			)}

			<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
				<p className="text-muted-foreground text-sm">
					{hasDraftChanges
						? `${Object.keys(draft).length} flag(s) have unsaved default-enabled changes.`
						: "Toggle flags above to stage changes, then save."}
				</p>
				<Button
					onClick={handlePersist}
					disabled={!hasDraftChanges || updateMutation.isPending}
				>
					{updateMutation.isPending ? "Saving…" : "Save changes"}
				</Button>
			</div>
		</div>
	)
}