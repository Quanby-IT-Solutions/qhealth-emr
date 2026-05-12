"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import { ChevronDown, ChevronRight, Info, Pencil, Plus, Trash2 } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
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
	type SlaWorkflowType,
	DEFAULT_SLA_TARGETS,
	WORKFLOW_LABELS,
} from "@/features/sla/api/sla.hooks"
import type { SlaConfig, SlaStepConfig, SlaStepType } from "@repo/contracts"
import {
	useSlaConfigsOrpcQuery,
	useCreateSlaConfigOrpcMutation,
	useUpdateSlaConfigOrpcMutation,
	useDeleteSlaConfigOrpcMutation,
	useListStepConfigsOrpcQuery,
	useCreateSlaStepConfigOrpcMutation,
	useUpdateSlaStepConfigOrpcMutation,
	useDeleteSlaStepConfigOrpcMutation,
} from "@/features/sla/api/sla-orpc.hooks"

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

// TOR step labels (mirrors SLA_STEP_LABELS in @repo/contracts — kept local to avoid deep imports in UI)
const STEP_LABELS: Record<SlaStepType, string> = {
	opd_triage: "OPD Triage (Flow 1, Step 1)",
	opd_registration: "OPD Registration (Flow 1, Step 2)",
	opd_vitals: "OPD Vital Signs (Flow 1, Step 3)",
	opd_consultation: "OPD Consultation (Flow 1, Step 4)",
	opd_disposition: "OPD Disposition (Flow 1, Step 5)",
	ed_rapid_triage: "ED Rapid Triage (Flow 2, Step 1)",
	ed_registration: "ED Post-Stabilization Registration (Flow 2, Step 3)",
	ed_disposition: "ED Disposition (Flow 2, Step 4)",
	ancillary_order_receipt: "Ancillary Order Receipt (Flow 3, Step 1)",
	ancillary_payment_clearance: "Ancillary Payment Clearance (Flow 3, Step 2)",
	ancillary_procedure: "Ancillary Procedure (Flow 3, Step 3)",
	ancillary_release: "Ancillary Result Release (Flow 3, Step 4)",
	admission_order: "Admission Order (Flow 4, Step 1)",
	admission_bed_assignment: "Bed Assignment (Flow 4, Step 2)",
	admission_financial_orientation: "Financial Orientation (Flow 4, Step 3)",
	admission_physical_transfer: "Physical Transfer (Flow 4, Step 4)",
	discharge_may_go_home: "May Go Home Order (Flow 5, Step 1)",
	discharge_chart_completion: "Chart Completion (Flow 5, Step 2)",
	discharge_clearance: "Clearance & Returns (Flow 5, Step 3)",
	discharge_bill_generation: "Bill Generation (Flow 5, Step 4)",
	discharge_gate_pass: "Gate Pass Release (Flow 5, Step 5)",
	pharmacy_rx_verification: "Rx Verification (Flow 6, Step 1)",
	pharmacy_clearance: "Pharmacy Clearance (Flow 6, Step 2)",
	pharmacy_dispensing: "Dispensing (Flow 6, Step 3)",
	records_request: "Records Request (Flow 7, Step 1)",
	records_payment: "Records Payment (Flow 7, Step 2)",
	records_processing_release: "Processing & Release (Flow 7, Step 3)",
}

// TOR-prescribed default target minutes per step (mirrors SLA_STEP_DEFAULT_TARGETS in @repo/contracts)
const STEP_DEFAULTS: Record<SlaStepType, number> = {
	opd_triage: 5, opd_registration: 10, opd_vitals: 5, opd_consultation: 30, opd_disposition: 2,
	ed_rapid_triage: 3, ed_registration: 10, ed_disposition: 60,
	ancillary_order_receipt: 1, ancillary_payment_clearance: 15, ancillary_procedure: 120, ancillary_release: 1440,
	admission_order: 5, admission_bed_assignment: 15, admission_financial_orientation: 10, admission_physical_transfer: 30,
	discharge_may_go_home: 5, discharge_chart_completion: 240, discharge_clearance: 60, discharge_bill_generation: 60, discharge_gate_pass: 5,
	pharmacy_rx_verification: 5, pharmacy_clearance: 15, pharmacy_dispensing: 10,
	records_request: 5, records_payment: 5, records_processing_release: 30,
}

// TOR flows: groups of steps by flow
const STEP_FLOWS: { label: string; steps: SlaStepType[] }[] = [
	{ label: "Flow 1 — OPD Consultation", steps: ["opd_triage", "opd_registration", "opd_vitals", "opd_consultation", "opd_disposition"] },
	{ label: "Flow 2 — Emergency Department", steps: ["ed_rapid_triage", "ed_registration", "ed_disposition"] },
	{ label: "Flow 3 — Ancillary (Lab / Radiology)", steps: ["ancillary_order_receipt", "ancillary_payment_clearance", "ancillary_procedure", "ancillary_release"] },
	{ label: "Flow 4 — Inpatient Admission", steps: ["admission_order", "admission_bed_assignment", "admission_financial_orientation", "admission_physical_transfer"] },
	{ label: "Flow 5 — Discharge & Billing", steps: ["discharge_may_go_home", "discharge_chart_completion", "discharge_clearance", "discharge_bill_generation", "discharge_gate_pass"] },
	{ label: "Flow 6 — Outpatient Pharmacy", steps: ["pharmacy_rx_verification", "pharmacy_clearance", "pharmacy_dispensing"] },
	{ label: "Flow 7 — Medical Records & Certificates", steps: ["records_request", "records_payment", "records_processing_release"] },
]

// Steps that are defined in the TOR but do not yet have a backend evidence path
// instrumented. These are shown as read-only with an "Unsupported" badge to prevent
// facilities from setting targets that cannot be truthfully measured.
// SLA-012: records_payment is now instrumented via medicalRecordsRequests.paidAt — no longer unsupported.
const UNSUPPORTED_STEPS: Partial<Record<SlaStepType, string>> = {}

// ============================================================================
// Config Form Dialog
// ============================================================================

interface ConfigFormState {
	workflowType: SlaWorkflowType
	targetMinutes: string
	hardCapMinutes: string
	warningThresholdPct: string
	description: string
}

const DEFAULT_FORM: ConfigFormState = {
	workflowType: "opd_consultation",
	targetMinutes: "30",
	hardCapMinutes: "",
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
					hardCapMinutes: editing.hardCapMinutes != null ? String(editing.hardCapMinutes) : "",
					warningThresholdPct: String(editing.warningThresholdPct),
					description: editing.description,
				}
			: DEFAULT_FORM
	)
	const [error, setError] = useState<string | null>(null)

	const createMutation = useCreateSlaConfigOrpcMutation()
	const updateMutation = useUpdateSlaConfigOrpcMutation()

	const isPending = createMutation.isPending || updateMutation.isPending

	function setField<K extends keyof ConfigFormState>(key: K, val: ConfigFormState[K]) {
		setForm(prev => ({ ...prev, [key]: val }))
	}

	const handleWorkflowChange = useCallback(
		(wt: string | null) => {
			if (!wt) return
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
		const hardCapMinutes = form.hardCapMinutes ? parseInt(form.hardCapMinutes, 10) : undefined
		const warningThresholdPct = parseInt(form.warningThresholdPct, 10)

		if (!targetMinutes || targetMinutes <= 0) {
			setError("Target minutes must be a positive number.")
			return
		}
		if (hardCapMinutes !== undefined && (isNaN(hardCapMinutes) || hardCapMinutes < targetMinutes)) {
			setError("Hard cap must be greater than or equal to the target.")
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
					hardCapMinutes: hardCapMinutes ?? null,
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
					hardCapMinutes,
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
							<Label htmlFor="hard-cap-minutes">Hard Cap (minutes, optional)</Label>
							<Input
								id="hard-cap-minutes"
								type="number"
								min={1}
								value={form.hardCapMinutes}
								onChange={e => setField("hardCapMinutes", e.target.value)}
								placeholder="e.g. 60"
							/>
							<p className="text-xs text-muted-foreground">Must be ≥ target</p>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
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

	const { data, isLoading, error } = useSlaConfigsOrpcQuery(facilityId)
	const deleteMutation = useDeleteSlaConfigOrpcMutation()

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
			{ id: deleteConfirm.id },
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

			{/* Step Targets Section */}
			<SlaStepTargets facilityId={facilityId} />
		</>
	)
}

// ============================================================================
// Step Config Dialog
// ============================================================================

interface StepConfigFormState {
	targetMinutes: string
	hardCapMinutes: string
	warningThresholdPct: string
	description: string
}

interface SlaStepConfigDialogProps {
	facilityId: string
	stepType: SlaStepType
	editing: SlaStepConfig | null
	open: boolean
	onOpenChange: (open: boolean) => void
}

function SlaStepConfigDialog({ facilityId, stepType, editing, open, onOpenChange }: SlaStepConfigDialogProps) {
	const isEdit = !!editing
	const torDefault = STEP_DEFAULTS[stepType]

	const [form, setForm] = useState<StepConfigFormState>(
		editing
			? {
					targetMinutes: String(editing.targetMinutes),
					hardCapMinutes: editing.hardCapMinutes != null ? String(editing.hardCapMinutes) : "",
					warningThresholdPct: String(editing.warningThresholdPct),
					description: editing.description,
				}
			: {
					targetMinutes: String(torDefault),
					hardCapMinutes: "",
					warningThresholdPct: "80",
					description: "",
				}
	)
	const [error, setError] = useState<string | null>(null)

	const createMutation = useCreateSlaStepConfigOrpcMutation()
	const updateMutation = useUpdateSlaStepConfigOrpcMutation()
	const isPending = createMutation.isPending || updateMutation.isPending

	function setField<K extends keyof StepConfigFormState>(key: K, val: StepConfigFormState[K]) {
		setForm(prev => ({ ...prev, [key]: val }))
	}

	function handleSubmit() {
		setError(null)
		const targetMinutes = parseInt(form.targetMinutes, 10)
		const hardCapMinutes = form.hardCapMinutes ? parseInt(form.hardCapMinutes, 10) : undefined
		const warningThresholdPct = parseInt(form.warningThresholdPct, 10)

		if (!targetMinutes || targetMinutes <= 0) {
			setError("Target minutes must be a positive number.")
			return
		}
		if (hardCapMinutes !== undefined && (isNaN(hardCapMinutes) || hardCapMinutes < targetMinutes)) {
			setError("Hard cap must be greater than or equal to the target.")
			return
		}
		if (!warningThresholdPct || warningThresholdPct <= 0 || warningThresholdPct >= 100) {
			setError("Warning threshold must be between 1 and 99.")
			return
		}

		if (isEdit && editing) {
			updateMutation.mutate(
				{ id: editing.id, targetMinutes, hardCapMinutes: hardCapMinutes ?? null, warningThresholdPct, description: form.description.trim() },
				{
					onSuccess: () => onOpenChange(false),
					onError: err => setError(err instanceof Error ? err.message : "Failed to update"),
				}
			)
		} else {
			createMutation.mutate(
				{ facilityId, stepType, targetMinutes, hardCapMinutes, warningThresholdPct, description: form.description.trim() },
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
					<DialogTitle>{isEdit ? "Edit Step Target" : "Set Step Target"}</DialogTitle>
					<DialogDescription>
						Configure a facility-specific target for{" "}
						<span className="font-medium">{STEP_LABELS[stepType]}</span>.{" "}
						TOR default: {formatMinutes(torDefault)}.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="step-target-minutes">Target (minutes)</Label>
							<Input
								id="step-target-minutes"
								type="number"
								min={1}
								value={form.targetMinutes}
								onChange={e => setField("targetMinutes", e.target.value)}
								placeholder={String(torDefault)}
							/>
							{form.targetMinutes && (
								<p className="text-xs text-muted-foreground">
									= {formatMinutes(parseInt(form.targetMinutes, 10) || 0)}
								</p>
							)}
						</div>
						<div className="space-y-2">
							<Label htmlFor="step-hard-cap">Hard Cap (minutes, optional)</Label>
							<Input
								id="step-hard-cap"
								type="number"
								min={1}
								value={form.hardCapMinutes}
								onChange={e => setField("hardCapMinutes", e.target.value)}
								placeholder="e.g. 60"
							/>
							<p className="text-xs text-muted-foreground">Must be ≥ target</p>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="step-warning-pct">Warning Threshold (%)</Label>
							<Input
								id="step-warning-pct"
								type="number"
								min={1}
								max={99}
								value={form.warningThresholdPct}
								onChange={e => setField("warningThresholdPct", e.target.value)}
								placeholder="80"
							/>
							<p className="text-xs text-muted-foreground">Alert when this % is reached</p>
						</div>
					</div>
					<div className="space-y-2">
						<Label htmlFor="step-description">Description (optional)</Label>
						<Input
							id="step-description"
							value={form.description}
							onChange={e => setField("description", e.target.value)}
							placeholder="e.g. Per Citizen's Charter Annex A"
						/>
					</div>
					{error && <p className="text-sm text-destructive">{error}</p>}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={isPending}>
						{isPending ? "Saving…" : isEdit ? "Update" : "Set Override"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

// ============================================================================
// Step Targets Card
// ============================================================================

function SlaStepTargets({ facilityId }: { facilityId: string }) {
	const { data, isLoading, error } = useListStepConfigsOrpcQuery(facilityId)
	const deleteMutation = useDeleteSlaStepConfigOrpcMutation()
	const updateMutation = useUpdateSlaStepConfigOrpcMutation()

	const [collapsedFlows, setCollapsedFlows] = useState<Set<string>>(new Set())
	const [dialogStep, setDialogStep] = useState<SlaStepType | null>(null)
	const [editingStep, setEditingStep] = useState<SlaStepConfig | null>(null)

	function toggleFlow(label: string) {
		setCollapsedFlows(prev => {
			const next = new Set(prev)
			if (next.has(label)) next.delete(label)
			else next.add(label)
			return next
		})
	}
	const [deleteConfirm, setDeleteConfirm] = useState<SlaStepConfig | null>(null)
	const [deleteError, setDeleteError] = useState<string | null>(null)

	// Bulk-edit mode
	const [bulkEditMode, setBulkEditMode] = useState(false)
	const [selectedStepIds, setSelectedStepIds] = useState<Set<string>>(new Set())
	const [bulkTargetMinutes, setBulkTargetMinutes] = useState("")
	const [bulkWarningPct, setBulkWarningPct] = useState("")

	const configByStep = new Map((data?.data ?? []).map(c => [c.stepType, c]))

	const allConfiguredStepIds = (data?.data ?? []).map(c => c.id)
	const allSelected = allConfiguredStepIds.length > 0 && allConfiguredStepIds.every(id => selectedStepIds.has(id))

	function toggleSelectAll() {
		if (allSelected) {
			setSelectedStepIds(new Set())
		} else {
			setSelectedStepIds(new Set(allConfiguredStepIds))
		}
	}

	function toggleSelectStep(id: string) {
		setSelectedStepIds(prev => {
			const next = new Set(prev)
			if (next.has(id)) {
				next.delete(id)
			} else {
				next.add(id)
			}
			return next
		})
	}

	async function handleBulkApply() {
		const targetMinutes = parseInt(bulkTargetMinutes, 10)
		const warningThresholdPct = parseInt(bulkWarningPct, 10)

		if (!bulkTargetMinutes && !bulkWarningPct) {
			toast.error("Enter at least one value to update.")
			return
		}
		if (bulkTargetMinutes && (!targetMinutes || targetMinutes <= 0)) {
			toast.error("Target minutes must be a positive number.")
			return
		}
		if (bulkWarningPct && (!warningThresholdPct || warningThresholdPct <= 0 || warningThresholdPct >= 100)) {
			toast.error("Warning threshold must be between 1 and 99.")
			return
		}

		const updates = (data?.data ?? []).filter(c => selectedStepIds.has(c.id))
		await Promise.all(
			updates.map(c =>
				updateMutation.mutateAsync({
					id: c.id,
					targetMinutes: bulkTargetMinutes ? targetMinutes : c.targetMinutes,
					hardCapMinutes: c.hardCapMinutes,
					warningThresholdPct: bulkWarningPct ? warningThresholdPct : c.warningThresholdPct,
					description: c.description,
				})
			)
		)
		toast.success(`Updated ${updates.length} step${updates.length !== 1 ? "s" : ""}.`)
		setSelectedStepIds(new Set())
		setBulkTargetMinutes("")
		setBulkWarningPct("")
	}

	function openEditStep(stepType: SlaStepType) {
		const existing = configByStep.get(stepType) ?? null
		setEditingStep(existing)
		setDialogStep(stepType)
	}

	function handleDeleteStep() {
		if (!deleteConfirm) return
		setDeleteError(null)
		deleteMutation.mutate(
			{ id: deleteConfirm.id },
			{
				onSuccess: () => setDeleteConfirm(null),
				onError: err => setDeleteError(err instanceof Error ? err.message : "Failed to delete"),
			}
		)
	}

	return (
		<>
			<Card className="mt-6">
				<CardHeader className="flex flex-row items-start justify-between">
					<div>
						<CardTitle>TOR Step Targets</CardTitle>
						<p className="mt-1 text-sm text-muted-foreground">
							Override the default per-step targets prescribed by the TOR (Section 6, Flows 1–7).
							Steps without an override use the TOR default shown in the table.
						</p>
					</div>
					<Button
						size="sm"
						variant={bulkEditMode ? "default" : "outline"}
						onClick={() => {
							setBulkEditMode(prev => !prev)
							setSelectedStepIds(new Set())
						}}
					>
						{bulkEditMode ? "Exit Bulk Edit" : "Bulk Edit"}
					</Button>
				</CardHeader>
				<CardContent className="p-0">
					{error && (
						<div className="p-6 text-sm text-destructive">
							Failed to load step configurations.
						</div>
					)}

					{STEP_FLOWS.map(flow => (
						<div key={flow.label}>
							<div className="bg-muted/40 px-6 py-2 border-y border-border flex items-center justify-between">
								<p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
									{flow.label}
								</p>
								<button
									type="button"
									onClick={() => toggleFlow(flow.label)}
									className="text-muted-foreground hover:text-foreground"
									aria-label={collapsedFlows.has(flow.label) ? "Expand flow" : "Collapse flow"}
								>
									{collapsedFlows.has(flow.label)
										? <ChevronRight className="size-4" />
										: <ChevronDown className="size-4" />
									}
								</button>
							</div>
							{!collapsedFlows.has(flow.label) && <Table>
								<TableHeader>
									<TableRow>
										{bulkEditMode && (
											<TableHead className="w-10">
												<Checkbox
													checked={allSelected}
													onCheckedChange={toggleSelectAll}
													aria-label="Select all"
												/>
											</TableHead>
										)}
										<TableHead>Step</TableHead>
										<TableHead>TOR Default</TableHead>
										<TableHead>Facility Override</TableHead>
										<TableHead>Warning At</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{flow.steps.map(stepType => {
										const override = configByStep.get(stepType)
										const torDefault = STEP_DEFAULTS[stepType]
										const unsupportedNote = UNSUPPORTED_STEPS[stepType]
										const isUnsupported = !!unsupportedNote
										const isSelected = override ? selectedStepIds.has(override.id) : false
										return (
											<TableRow key={stepType} className={isUnsupported ? "opacity-60" : undefined}>
												{bulkEditMode && (
													<TableCell>
														{override && !isUnsupported ? (
															<Checkbox
																checked={isSelected}
																onCheckedChange={() => toggleSelectStep(override.id)}
																aria-label={`Select ${STEP_LABELS[stepType]}`}
															/>
														) : null}
													</TableCell>
												)}
												<TableCell className="text-sm font-medium">
													<span className="flex items-center gap-1.5">
														{STEP_LABELS[stepType]}
														{isUnsupported && (
															<Badge
																variant="outline"
																className="border-destructive/40 text-destructive text-xs cursor-help"
																title={unsupportedNote}
															>
																Not instrumented
															</Badge>
														)}
													</span>
												</TableCell>
												<TableCell className="text-sm text-muted-foreground">
													{formatMinutes(torDefault)}
												</TableCell>
												<TableCell className="text-sm">
													{isUnsupported ? (
														<span className="italic text-muted-foreground">Not measurable</span>
													) : override ? (
														<span className="font-medium">{formatMinutes(override.targetMinutes)}</span>
													) : (
														<span className="italic text-muted-foreground">Using TOR default</span>
													)}
												</TableCell>
												<TableCell className="text-sm">
													{isUnsupported ? "—" : override ? `${override.warningThresholdPct}%` : "80%"}
												</TableCell>
												<TableCell>
													{isUnsupported ? (
														<Badge variant="outline" className="border-destructive/40 text-destructive text-xs">
															Unsupported
														</Badge>
													) : override ? (
														override.isActive ? (
															<Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
																Override active
															</Badge>
														) : (
															<Badge variant="outline" className="text-muted-foreground">
																Inactive
															</Badge>
														)
													) : (
														<Badge variant="outline" className="text-muted-foreground">
															<Info className="mr-1 size-3" />
															TOR default
														</Badge>
													)}
												</TableCell>
												<TableCell>
													<div className="flex gap-1">
														{!isUnsupported && !isLoading && (
															<Button
																variant="ghost"
																size="icon"
																className="size-7"
																onClick={() => openEditStep(stepType)}
															>
																<Pencil className="size-3.5" />
															</Button>
														)}
														{!isUnsupported && override && (
															<Button
																variant="ghost"
																size="icon"
																className="size-7 text-destructive hover:text-destructive"
																onClick={() => setDeleteConfirm(override)}
															>
																<Trash2 className="size-3.5" />
															</Button>
														)}
													</div>
												</TableCell>
											</TableRow>
										)
									})}
								</TableBody>
							</Table>}
						</div>
					))}
				</CardContent>
			</Card>

			{/* Bulk Update Targets section */}
			{bulkEditMode && selectedStepIds.size > 0 && (
				<Card className="mt-4 border-primary/40">
					<CardHeader>
						<CardTitle className="text-base">
							Bulk Update Targets ({selectedStepIds.size} step{selectedStepIds.size !== 1 ? "s" : ""} selected)
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 gap-4 max-w-md">
							<div className="space-y-2">
								<Label htmlFor="bulk-target-minutes">Target (minutes)</Label>
								<Input
									id="bulk-target-minutes"
									type="number"
									min={1}
									value={bulkTargetMinutes}
									onChange={e => setBulkTargetMinutes(e.target.value)}
									placeholder="Leave blank to keep"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="bulk-warning-pct">Warning Threshold (%)</Label>
								<Input
									id="bulk-warning-pct"
									type="number"
									min={1}
									max={99}
									value={bulkWarningPct}
									onChange={e => setBulkWarningPct(e.target.value)}
									placeholder="Leave blank to keep"
								/>
							</div>
						</div>
						<Button
							className="mt-4"
							onClick={handleBulkApply}
							disabled={updateMutation.isPending}
						>
							{updateMutation.isPending ? "Applying…" : "Apply to Selected"}
						</Button>
					</CardContent>
				</Card>
			)}

			{/* Step Edit Dialog */}
			{dialogStep && (
				<SlaStepConfigDialog
					facilityId={facilityId}
					stepType={dialogStep}
					editing={editingStep}
					open={!!dialogStep}
					onOpenChange={open => {
						if (!open) {
							setDialogStep(null)
							setEditingStep(null)
						}
					}}
				/>
			)}

			{/* Delete Step Override Dialog */}
			<Dialog open={!!deleteConfirm} onOpenChange={open => { if (!open) setDeleteConfirm(null) }}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Remove Step Override</DialogTitle>
						<DialogDescription>
							Remove the facility override for{" "}
							<span className="font-semibold">
								{deleteConfirm ? STEP_LABELS[deleteConfirm.stepType] : ""}
							</span>
							? The step will revert to the TOR default of{" "}
							{deleteConfirm ? formatMinutes(STEP_DEFAULTS[deleteConfirm.stepType]) : ""}.
						</DialogDescription>
					</DialogHeader>
					{deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={deleteMutation.isPending}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleDeleteStep} disabled={deleteMutation.isPending}>
							{deleteMutation.isPending ? "Removing…" : "Remove Override"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
