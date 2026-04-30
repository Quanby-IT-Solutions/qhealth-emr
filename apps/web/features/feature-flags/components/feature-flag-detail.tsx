"use client"

import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Switch } from "@/core/components/ui/switch"
import {
	useFeatureFlagDetailQuery,
	useUpdateFeatureFlagTargetingMutation,
} from "@/features/feature-flags/api/feature-flags.hooks"

interface FeatureFlagDetailProps {
	flagId: string
	canEdit: boolean
}

type FeatureFlagEnvironment = "dev" | "staging" | "prod"

interface NewTargetRow {
	environment: FeatureFlagEnvironment | null
	facilityId: string
	roleId: string
	enabled: boolean
}

const INITIAL_NEW_ROW: NewTargetRow = {
	environment: null,
	facilityId: "",
	roleId: "",
	enabled: true,
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

export function FeatureFlagDetail({ flagId, canEdit }: FeatureFlagDetailProps) {
	const { data: flag, isPending, isError } = useFeatureFlagDetailQuery(flagId)
	const updateTargeting = useUpdateFeatureFlagTargetingMutation()

	// Draft: track toggled target ids
	const [draftToggles, setDraftToggles] = useState<Record<string, boolean>>({})
	// Draft: track removed target ids
	const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())
	// Draft: track new rows to add
	const [newRows, setNewRows] = useState<NewTargetRow[]>([])
	// Add-row form visibility
	const [showAddRow, setShowAddRow] = useState(false)
	const [newRowForm, setNewRowForm] = useState<NewTargetRow>(INITIAL_NEW_ROW)

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

	const serverTargets = flag.targets ?? []

	const getTargetEnabled = (targetId: string, current: boolean) =>
		draftToggles[targetId] !== undefined ? draftToggles[targetId] : current

	const toggleTarget = (targetId: string, current: boolean) => {
		setDraftToggles(prev => ({ ...prev, [targetId]: !current }))
	}

	const removeExistingTarget = (targetId: string) => {
		setRemovedIds(prev => new Set([...prev, targetId]))
		// Also remove any toggle draft for the removed row
		setDraftToggles(prev => {
			const next = { ...prev }
			delete next[targetId]
			return next
		})
	}

	const removeNewRow = (idx: number) => {
		setNewRows(prev => prev.filter((_, i) => i !== idx))
	}

	const addNewRow = () => {
		setNewRows(prev => [
			...prev,
			{
				environment: newRowForm.environment,
				facilityId: newRowForm.facilityId.trim(),
				roleId: newRowForm.roleId.trim(),
				enabled: newRowForm.enabled,
			},
		])
		setNewRowForm(INITIAL_NEW_ROW)
		setShowAddRow(false)
	}

	const hasDraft =
		Object.keys(draftToggles).length > 0 || removedIds.size > 0 || newRows.length > 0

	const handleSave = async () => {
		const mergedTargets = [
			...serverTargets
				.filter(t => !removedIds.has(t.id))
				.map(t => ({
					environment: t.environment,
					facilityId: t.facilityId,
					roleId: t.roleId,
					enabled: getTargetEnabled(t.id, t.enabled),
				})),
			...newRows.map(r => ({
				environment: r.environment,
				facilityId: r.facilityId || null,
				roleId: r.roleId || null,
				enabled: r.enabled,
			})),
		]

		try {
			await updateTargeting.mutateAsync({
				flagId: flag.id,
				targets: mergedTargets,
			})
			setDraftToggles({})
			setRemovedIds(new Set())
			setNewRows([])
			toast.success("Targeting rules saved.")
		} catch {
			toast.error("Failed to save targeting rules.")
		}
	}

	// Visible rows = server rows minus removed + new rows pending
	const visibleServerTargets = serverTargets.filter(t => !removedIds.has(t.id))

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
					{canEdit && (
						<div className="flex shrink-0 gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setShowAddRow(v => !v)}
							>
								<Plus className="mr-1.5 size-4" />
								Add row
							</Button>
							<Button
								onClick={handleSave}
								disabled={!hasDraft || updateTargeting.isPending}
								size="sm"
							>
								{updateTargeting.isPending ? "Saving…" : "Save targeting"}
							</Button>
						</div>
					)}
					{!canEdit && (
						<Button
							onClick={handleSave}
							disabled={!hasDraft || updateTargeting.isPending}
							size="sm"
						>
							{updateTargeting.isPending ? "Saving…" : "Save targeting"}
						</Button>
					)}
				</div>

				{/* Add row form */}
				{canEdit && showAddRow && (
					<Card className="border-dashed">
						<CardHeader>
							<CardTitle className="text-sm">New targeting row</CardTitle>
							<CardDescription>
								Leave a field blank to match any value (wildcard).
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-1.5">
								<Label>Environment</Label>
								<Select
									value={newRowForm.environment ?? "any"}
									onValueChange={v =>
										setNewRowForm(f => ({
											...f,
											environment: v === "any" ? null : (v as FeatureFlagEnvironment),
										}))
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Any" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="any">Any (wildcard)</SelectItem>
										<SelectItem value="dev">Development</SelectItem>
										<SelectItem value="staging">Staging</SelectItem>
										<SelectItem value="prod">Production</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="new-row-facility">Facility ID</Label>
								<Input
									id="new-row-facility"
									placeholder="UUID or blank for any"
									value={newRowForm.facilityId}
									onChange={e => setNewRowForm(f => ({ ...f, facilityId: e.target.value }))}
								/>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="new-row-role">Role ID</Label>
								<Input
									id="new-row-role"
									placeholder="UUID or blank for any"
									value={newRowForm.roleId}
									onChange={e => setNewRowForm(f => ({ ...f, roleId: e.target.value }))}
								/>
							</div>

							<div className="flex items-end gap-3">
								<div className="space-y-1.5">
									<Label>Enabled</Label>
									<div className="flex h-9 items-center">
										<Switch
											checked={newRowForm.enabled}
											onCheckedChange={v => setNewRowForm(f => ({ ...f, enabled: v }))}
											aria-label="New row enabled"
										/>
									</div>
								</div>
							</div>

							<div className="flex gap-2 sm:col-span-2">
								<Button size="sm" onClick={addNewRow}>Add row</Button>
								<Button
									size="sm"
									variant="outline"
									onClick={() => { setShowAddRow(false); setNewRowForm(INITIAL_NEW_ROW) }}
								>
									Cancel
								</Button>
							</div>
						</CardContent>
					</Card>
				)}

				{visibleServerTargets.length === 0 && newRows.length === 0 && (
					<Card className="border-dashed">
						<CardHeader>
							<CardTitle className="text-base">No targeting overrides</CardTitle>
							<CardDescription>
								This flag resolves to its default ({flag.defaultEnabled ? "enabled" : "disabled"}) for all contexts.
								{canEdit && ' Use "Add row" to create overrides.'}
							</CardDescription>
						</CardHeader>
					</Card>
				)}

				{(visibleServerTargets.length > 0 || newRows.length > 0) && (
					<div className="overflow-x-auto rounded-lg border">
						<table className="w-full text-sm">
							<thead>
								<tr className="bg-muted/50 border-b">
									<th className="px-4 py-2 text-left font-medium">Environment</th>
									<th className="px-4 py-2 text-left font-medium">Facility</th>
									<th className="px-4 py-2 text-left font-medium">Role</th>
									<th className="px-4 py-2 text-left font-medium">Enabled</th>
									{canEdit && <th className="px-4 py-2 text-left font-medium">Actions</th>}
								</tr>
							</thead>
							<tbody>
								{visibleServerTargets.map(target => {
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
												{canEdit ? (
													<Switch
														checked={enabled}
														onCheckedChange={() => toggleTarget(target.id, enabled)}
														aria-label="Toggle target"
													/>
												) : (
													<Badge variant={enabled ? "default" : "secondary"}>
														{enabled ? "On" : "Off"}
													</Badge>
												)}
											</td>
											{canEdit && (
												<td className="px-4 py-2">
													<Button
														variant="ghost"
														size="icon"
														className="text-destructive hover:text-destructive size-7"
														onClick={() => removeExistingTarget(target.id)}
														aria-label="Remove targeting row"
													>
														<Trash2 className="size-3.5" />
													</Button>
												</td>
											)}
										</tr>
									)
								})}

								{/* Pending new rows */}
								{newRows.map((row, idx) => (
									<tr
										key={`new-${idx}`}
										className="border-b bg-green-50 last:border-0 dark:bg-green-950/20"
									>
										<td className="px-4 py-2">
											{row.environment
												? ENVIRONMENT_LABELS[row.environment] ?? row.environment
												: <span className="text-muted-foreground italic">Any</span>}
										</td>
										<td className="px-4 py-2">
											{row.facilityId
												? <span className="font-mono text-xs">{row.facilityId}</span>
												: <span className="text-muted-foreground italic">Any</span>}
										</td>
										<td className="px-4 py-2">
											{row.roleId
												? <span className="font-mono text-xs">{row.roleId}</span>
												: <span className="text-muted-foreground italic">Any</span>}
										</td>
										<td className="px-4 py-2">
											<Badge variant={row.enabled ? "default" : "secondary"}>
												{row.enabled ? "On" : "Off"}
											</Badge>
											<Badge variant="outline" className="ml-1 text-xs">Pending</Badge>
										</td>
										{canEdit && (
											<td className="px-4 py-2">
												<Button
													variant="ghost"
													size="icon"
													className="text-destructive hover:text-destructive size-7"
													onClick={() => removeNewRow(idx)}
													aria-label="Remove pending row"
												>
													<Trash2 className="size-3.5" />
												</Button>
											</td>
										)}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	)
}
