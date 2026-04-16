"use client"

import { useState, useCallback } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import {
	type SlaConfig,
	type SlaWorkflowType,
	DEFAULT_SLA_TARGETS,
	WORKFLOW_LABELS,
	useCreateSlaConfigMutation,
	useDeleteSlaConfigMutation,
	useSlaConfigsQuery,
	useUpdateSlaConfigMutation,
} from "@/features/sla/api/sla.hooks"

// ============================================================================
// Helpers
// ============================================================================

function formatMinutes(minutes: number): string {
	if (minutes < 60) return `${minutes}m`
	const h = Math.floor(minutes / 60)
	const m = minutes % 60
	return m > 0 ? `${h}h ${m}m` : `${h}h`
}

const WORKFLOW_TYPES = Object.keys(WORKFLOW_LABELS) as SlaWorkflowType[]

// ============================================================================
// Config Form Dialog
// ============================================================================

interface ConfigFormState {
	workflowType: SlaWorkflowType
	targetMinutes: string
	warningThresholdPct: string
	description: string
}

const DEFAULT_FORM: ConfigFormState = {
	workflowType: "opd_consultation",
	targetMinutes: "30",
	warningThresholdPct: "80",
	description: "",
}

interface SlaConfigDialogProps {
	facilityId: string
	editing: SlaConfig | null
	open: boolean
	onOpenChange: (open: boolean) => void
}

function SlaConfigDialog({ facilityId, editing, open, onOpenChange }: SlaConfigDialogProps) {
	const isEdit = !!editing
	const [form, setForm] = useState<ConfigFormState>(
		editing
			? {
					workflowType: editing.workflowType,
					targetMinutes: String(editing.targetMinutes),
					warningThresholdPct: String(editing.warningThresholdPct),
					description: editing.description,
				}
			: DEFAULT_FORM
	)
	const [error, setError] = useState<string | null>(null)

	const createMutation = useCreateSlaConfigMutation()
	const updateMutation = useUpdateSlaConfigMutation()

	const isPending = createMutation.isPending || updateMutation.isPending

	function setField<K extends keyof ConfigFormState>(key: K, val: ConfigFormState[K]) {
		setForm(prev => ({ ...prev, [key]: val }))
	}

	const handleWorkflowChange = useCallback(
		(wt: string) => {
			const w = wt as SlaWorkflowType
			setForm(prev => ({
				...prev,
				workflowType: w,
				targetMinutes: String(DEFAULT_SLA_TARGETS[w] ?? 30),
			}))
		},
		[]
	)

	function handleSubmit() {
		setError(null)

		const targetMinutes = parseInt(form.targetMinutes, 10)
		const warningThresholdPct = parseInt(form.warningThresholdPct, 10)

		if (!targetMinutes || targetMinutes <= 0) {
			setError("Target minutes must be a positive number.")
			return
		}
		if (!warningThresholdPct || warningThresholdPct <= 0 || warningThresholdPct >= 100) {
			setError("Warning threshold must be between 1 and 99.")
			return
		}

		if (isEdit && editing) {
			updateMutation.mutate(
				{
					id: editing.id,
					facilityId,
					targetMinutes,
					warningThresholdPct,
					description: form.description.trim(),
				},
				{
					onSuccess: () => onOpenChange(false),
					onError: err => setError(err instanceof Error ? err.message : "Failed to update"),
				}
			)
		} else {
			createMutation.mutate(
				{
					facilityId,
					workflowType: form.workflowType,
					targetMinutes,
					warningThresholdPct,
					description: form.description.trim(),
				},
				{
					onSuccess: () => onOpenChange(false),
					onError: err => setError(err instanceof Error ? err.message : "Failed to create"),
				}
			)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{isEdit ? "Edit SLA Configuration" : "Add SLA Configuration"}</DialogTitle>
					<DialogDescription>
						Configure the target turnaround time and warning threshold for a workflow type.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="space-y-2">
						<Label>Workflow Type</Label>
						<Select
							value={form.workflowType}
							onValueChange={handleWorkflowChange}
							disabled={isEdit}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{WORKFLOW_TYPES.map(wt => (
									<SelectItem key={wt} value={wt}>
										{WORKFLOW_LABELS[wt]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="target-minutes">Target (minutes)</Label>
							<Input
								id="target-minutes"
								type="number"
								min={1}
								value={form.targetMinutes}
								onChange={e => setField("targetMinutes", e.target.value)}
								placeholder="e.g. 30"
							/>
							{form.targetMinutes && (
								<p className="text-xs text-muted-foreground">
									= {formatMinutes(parseInt(form.targetMinutes, 10) || 0)}
								</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="warning-pct">Warning Threshold (%)</Label>
							<Input
								id="warning-pct"
								type="number"
								min={1}
								max={99}
								value={form.warningThresholdPct}
								onChange={e => setField("warningThresholdPct", e.target.value)}
								placeholder="e.g. 80"
							/>
							<p className="text-xs text-muted-foreground">Alert when this % is reached</p>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="sla-description">Description (optional)</Label>
						<Input
							id="sla-description"
							value={form.description}
							onChange={e => setField("description", e.target.value)}
							placeholder="e.g. Per Citizen's Charter Section 4.1"
						/>
					</div>

					{error && (
						<p className="text-sm text-destructive">{error}</p>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={isPending}>
						{isPending ? "Saving…" : isEdit ? "Update" : "Add"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

// ============================================================================
// Main Component
// ============================================================================

export function SlaConfig() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles[0]?.facilityId ?? ""

	const { data, isLoading, error } = useSlaConfigsQuery(facilityId)
	const deleteMutation = useDeleteSlaConfigMutation()

	const [dialogOpen, setDialogOpen] = useState(false)
	const [editingConfig, setEditingConfig] = useState<SlaConfig | null>(null)
	const [deleteConfirm, setDeleteConfirm] = useState<SlaConfig | null>(null)
	const [deleteError, setDeleteError] = useState<string | null>(null)

	function openCreate() {
		setEditingConfig(null)
		setDialogOpen(true)
	}

	function openEdit(config: SlaConfig) {
		setEditingConfig(config)
		setDialogOpen(true)
	}

	function handleDelete() {
		if (!deleteConfirm) return
		setDeleteError(null)
		deleteMutation.mutate(
			{ id: deleteConfirm.id, facilityId },
			{
				onSuccess: () => setDeleteConfirm(null),
				onError: err => setDeleteError(err instanceof Error ? err.message : "Failed to delete"),
			}
		)
	}

	const configs = data?.data ?? []

	return (
		<>
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div>
						<CardTitle>SLA Configuration</CardTitle>
						<p className="mt-1 text-sm text-muted-foreground">
							Set turnaround time targets per workflow type for Citizen's Charter compliance.
						</p>
					</div>
					<Button size="sm" onClick={openCreate}>
						<Plus className="mr-1 size-4" />
						Add SLA
					</Button>
				</CardHeader>
				<CardContent className="p-0">
					{error && (
						<div className="p-6 text-sm text-destructive">
							Failed to load SLA configurations. The SLA module may not be enabled.
						</div>
					)}

					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Workflow Type</TableHead>
									<TableHead>Target</TableHead>
									<TableHead>Warning At</TableHead>
									<TableHead>Description</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{isLoading && (
									<TableRow>
										<TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
											Loading…
										</TableCell>
									</TableRow>
								)}
								{!isLoading && configs.length === 0 && (
									<TableRow>
										<TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
											No SLA targets configured yet. Click "Add SLA" to create one.
										</TableCell>
									</TableRow>
								)}
								{configs.map(config => (
									<TableRow key={config.id}>
										<TableCell className="font-medium text-sm">
											{WORKFLOW_LABELS[config.workflowType]}
										</TableCell>
										<TableCell>{formatMinutes(config.targetMinutes)}</TableCell>
										<TableCell>{config.warningThresholdPct}%</TableCell>
										<TableCell className="max-w-48 truncate text-sm text-muted-foreground">
											{config.description || "—"}
										</TableCell>
										<TableCell>
											{config.isActive ? (
												<Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
													Active
												</Badge>
											) : (
												<Badge variant="outline" className="text-muted-foreground">
													Inactive
												</Badge>
											)}
										</TableCell>
										<TableCell>
											<div className="flex gap-1">
												<Button
													variant="ghost"
													size="icon"
													className="size-7"
													onClick={() => openEdit(config)}
												>
													<Pencil className="size-3.5" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													className="size-7 text-destructive hover:text-destructive"
													onClick={() => setDeleteConfirm(config)}
												>
													<Trash2 className="size-3.5" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>

			{/* Create / Edit Dialog */}
			{dialogOpen && (
				<SlaConfigDialog
					facilityId={facilityId}
					editing={editingConfig}
					open={dialogOpen}
					onOpenChange={open => {
						setDialogOpen(open)
						if (!open) setEditingConfig(null)
					}}
				/>
			)}

			{/* Delete Confirmation Dialog */}
			<Dialog open={!!deleteConfirm} onOpenChange={open => { if (!open) setDeleteConfirm(null) }}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete SLA Configuration</DialogTitle>
						<DialogDescription>
							Remove the SLA target for{" "}
							<span className="font-semibold">
								{deleteConfirm ? WORKFLOW_LABELS[deleteConfirm.workflowType] : ""}
							</span>
							? This cannot be undone.
						</DialogDescription>
					</DialogHeader>
					{deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={deleteMutation.isPending}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
							{deleteMutation.isPending ? "Deleting…" : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
