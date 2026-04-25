"use client"

import Link from "next/link"
import { startTransition, useState } from "react"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/core/components/ui/alert-dialog"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Checkbox } from "@/core/components/ui/checkbox"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Separator } from "@/core/components/ui/separator"
import { Switch } from "@/core/components/ui/switch"
import { Textarea } from "@/core/components/ui/textarea"
import {
	useCreateFeatureFlagMutation,
	useDeleteFeatureFlagMutation,
	useFeatureFlagsListQuery,
	useUpdateFeatureFlagMutation,
} from "@/features/feature-flags/api/feature-flags.hooks"

type FeatureFlagGroup = "platform-control" | "compliance" | "integration"
type FeatureFlagRiskLevel = "low" | "moderate" | "high"

interface CreateFlagForm {
	key: string
	name: string
	description: string
	group: FeatureFlagGroup
	riskLevel: FeatureFlagRiskLevel
	ownerTeam: string
	defaultEnabled: boolean
}

const INITIAL_CREATE_FORM: CreateFlagForm = {
	key: "",
	name: "",
	description: "",
	group: "platform-control",
	riskLevel: "low",
	ownerTeam: "",
	defaultEnabled: false,
}

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

interface FeatureFlagsPanelProps {
	canEdit: boolean
}

export function FeatureFlagsPanel({ canEdit }: FeatureFlagsPanelProps) {
	const { data, isPending, isError } = useFeatureFlagsListQuery()
	const updateMutation = useUpdateFeatureFlagMutation()
	const createMutation = useCreateFeatureFlagMutation()
	const deleteMutation = useDeleteFeatureFlagMutation()

	// Draft state: map from flagId → override defaultEnabled (FF-003: do NOT auto-clear on data refresh)
	const [draft, setDraft] = useState<Record<string, boolean>>({})

	// Create dialog
	const [createOpen, setCreateOpen] = useState(false)
	const [createForm, setCreateForm] = useState<CreateFlagForm>(INITIAL_CREATE_FORM)

	// Delete confirmation
	const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

	const flags = data?.data ?? []
	const hasDraftChanges = Object.keys(draft).length > 0

	const getEnabled = (flagId: string, defaultEnabled: boolean) =>
		draft[flagId] !== undefined ? draft[flagId] : defaultEnabled

	const toggleFlag = (flagId: string, currentEnabled: boolean) => {
		startTransition(() => {
			setDraft(prev => ({ ...prev, [flagId]: !currentEnabled }))
		})
	}

	// FF-003: Hardened bulk save — preserve draft for failed flags, clear only succeeded
	const handlePersist = async () => {
		const entries = Object.entries(draft)
		if (entries.length === 0) return

		const results = await Promise.allSettled(
			entries.map(([id, defaultEnabled]) => updateMutation.mutateAsync({ id, defaultEnabled }))
		)

		const succeeded = new Set<string>()
		const failed = new Set<string>()
		results.forEach((result, idx) => {
			if (result.status === "fulfilled") {
				succeeded.add(entries[idx]![0])
			} else {
				failed.add(entries[idx]![0])
			}
		})

		// Only remove succeeded flags from draft; preserve failed ones for retry
		setDraft(prev => {
			const next = { ...prev }
			for (const id of succeeded) delete next[id]
			return next
		})

		if (failed.size === 0) {
			toast.success(`${succeeded.size} flag(s) saved.`)
		} else if (succeeded.size === 0) {
			toast.error(`Failed to save ${failed.size} flag(s). Please try again.`)
		} else {
			toast.warning(`${succeeded.size} saved, ${failed.size} failed. Retry remaining changes.`)
		}
	}

	const handleCreate = async () => {
		try {
			await createMutation.mutateAsync({
				key: createForm.key.trim(),
				name: createForm.name.trim(),
				description: createForm.description.trim() || undefined,
				group: createForm.group,
				riskLevel: createForm.riskLevel,
				ownerTeam: createForm.ownerTeam.trim() || undefined,
				defaultEnabled: createForm.defaultEnabled,
			})
			setCreateOpen(false)
			setCreateForm(INITIAL_CREATE_FORM)
			toast.success("Feature flag created.")
		} catch {
			toast.error("Failed to create feature flag.")
		}
	}

	const handleDelete = async () => {
		if (!deleteTarget) return
		try {
			await deleteMutation.mutateAsync({ id: deleteTarget.id })
			setDeleteTarget(null)
			toast.success(`"${deleteTarget.name}" deleted.`)
		} catch {
			toast.error("Failed to delete feature flag.")
		}
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
			<div className="flex items-start justify-between gap-4">
				<div className="space-y-2">
					<h1 className="text-2xl font-semibold">Feature Flags</h1>
					<p className="text-muted-foreground max-w-3xl text-sm">
						Release controls let administrators stage new workflows, protect high-risk
						clinical changes, and phase integrations without editing role definitions.
						Use the detail page to configure per-environment and per-facility targeting.
					</p>
				</div>
				{canEdit && (
					<Button size="sm" onClick={() => setCreateOpen(true)}>
						<Plus className="mr-1.5 size-4" />
						New flag
					</Button>
				)}
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
												<div className="flex items-center gap-2">
													{canEdit && (
														<Switch
															checked={enabled}
															onCheckedChange={() => toggleFlag(flag.id, enabled)}
															aria-label={`Toggle ${flag.name}`}
														/>
													)}
													{!canEdit && (
														<Badge variant={enabled ? "default" : "secondary"}>
															{enabled ? "On" : "Off"}
														</Badge>
													)}
													{canEdit && (
														<Button
															variant="ghost"
															size="icon"
															className="text-destructive hover:text-destructive size-8"
															aria-label={`Delete ${flag.name}`}
															onClick={() => setDeleteTarget({ id: flag.id, name: flag.name })}
														>
															<Trash2 className="size-4" />
														</Button>
													)}
												</div>
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
							{canEdit
								? "Create your first feature flag to start managing staged rollouts."
								: "No feature flags have been configured yet."}
						</CardDescription>
					</CardHeader>
				</Card>
			)}

			{canEdit && (
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
			)}

			{/* Create flag dialog */}
			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>Create feature flag</DialogTitle>
						<DialogDescription>
							Define a new feature gate. The key cannot be changed after creation.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-2">
						<div className="space-y-1.5">
							<Label htmlFor="ff-key">Key <span className="text-destructive">*</span></Label>
							<Input
								id="ff-key"
								placeholder="my-feature-flag"
								value={createForm.key}
								onChange={e => setCreateForm(f => ({ ...f, key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
							/>
							<p className="text-muted-foreground text-xs">
								Lowercase letters, digits, and hyphens only.
							</p>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="ff-name">Name <span className="text-destructive">*</span></Label>
							<Input
								id="ff-name"
								placeholder="My Feature Flag"
								value={createForm.name}
								onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
							/>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="ff-desc">Description</Label>
							<Textarea
								id="ff-desc"
								placeholder="Optional — describe the purpose of this flag."
								rows={2}
								value={createForm.description}
								onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-1.5">
								<Label>Group <span className="text-destructive">*</span></Label>
								<Select
									value={createForm.group}
									onValueChange={v => setCreateForm(f => ({ ...f, group: v as FeatureFlagGroup }))}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="platform-control">Platform Control</SelectItem>
										<SelectItem value="compliance">Compliance</SelectItem>
										<SelectItem value="integration">Integration</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-1.5">
								<Label>Risk level <span className="text-destructive">*</span></Label>
								<Select
									value={createForm.riskLevel}
									onValueChange={v => setCreateForm(f => ({ ...f, riskLevel: v as FeatureFlagRiskLevel }))}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="low">Low</SelectItem>
										<SelectItem value="moderate">Moderate</SelectItem>
										<SelectItem value="high">High</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="ff-owner">Owner team</Label>
							<Input
								id="ff-owner"
								placeholder="e.g. Platform, Clinical, Integrations"
								value={createForm.ownerTeam}
								onChange={e => setCreateForm(f => ({ ...f, ownerTeam: e.target.value }))}
							/>
						</div>

						<div className="flex items-center gap-2">
							<Checkbox
								id="ff-default"
								checked={createForm.defaultEnabled}
								onCheckedChange={v => setCreateForm(f => ({ ...f, defaultEnabled: !!v }))}
							/>
							<Label htmlFor="ff-default" className="cursor-pointer">
								Enabled by default
							</Label>
						</div>
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => { setCreateOpen(false); setCreateForm(INITIAL_CREATE_FORM) }}>
							Cancel
						</Button>
						<Button
							onClick={handleCreate}
							disabled={!createForm.key.trim() || !createForm.name.trim() || createMutation.isPending}
						>
							{createMutation.isPending ? "Creating…" : "Create flag"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete confirmation */}
			<AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete &ldquo;{deleteTarget?.name}&rdquo;?</AlertDialogTitle>
						<AlertDialogDescription>
							This permanently removes the flag definition and all its targeting rules. This action
							cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={handleDelete}
							disabled={deleteMutation.isPending}
						>
							{deleteMutation.isPending ? "Deleting…" : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}