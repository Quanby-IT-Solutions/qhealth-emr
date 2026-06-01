"use client"

import { useState } from "react"

import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Search, Shield, Trash2 } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Checkbox } from "@/core/components/ui/checkbox"
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
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/components/ui/tooltip"
import { Textarea } from "@/core/components/ui/textarea"

import {
	useCreateFormularyItemMutation,
	useDeleteFormularyItemMutation,
	useDrugGenericsQuery,
	useFormularyItemsQuery,
	useUpdateFormularyClinicalPolicyMutation,
	useUpdateFormularyItemMutation,
} from "@/features/formulary/api/formulary.hooks"

// ============================================================================
// Types
// ============================================================================

interface FormularyItemRow {
	id: string
	genericName: string
	doseForm: string
	strength: string
	route: string
	isActive: boolean
	isHighAlert: boolean
	highAlertNotes: string | null
	isRestricted: boolean
	restrictionNotes: string | null
	formularyNotes: string | null
}

interface FormularyManagerProps {
	facilityId: string
	canEdit?: boolean
	canDelete?: boolean
	/**
	 * When true the pharmacist-owned clinical policy fields (isHighAlert, isRestricted, notes)
	 * are editable. When false (admin mode) only master-data fields are editable.
	 */
	canEditFlags?: boolean
}

// ============================================================================
// Main component
// ============================================================================

export function FormularyManager({
	facilityId,
	canEdit = false,
	canDelete = false,
	canEditFlags = false,
}: FormularyManagerProps) {
	const [search, setSearch] = useState("")
	const [page, setPage] = useState(1)
	const [sheetMode, setSheetMode] = useState<"add" | "edit" | null>(null)
	const [editingItem, setEditingItem] = useState<FormularyItemRow | null>(null)

	const { data: itemsData, isLoading } = useFormularyItemsQuery({
		facilityId,
		search: search || undefined,
		page,
		limit: 20,
	})

	const deleteMutation = useDeleteFormularyItemMutation()

	const items = (itemsData as { data: FormularyItemRow[]; total: number; totalPages: number }) ?? {
		data: [],
		total: 0,
		totalPages: 0,
	}

	function openAdd() {
		setEditingItem(null)
		setSheetMode("add")
	}

	function openEdit(item: FormularyItemRow) {
		setEditingItem(item)
		setSheetMode("edit")
	}

	function closeSheet() {
		setSheetMode(null)
		setEditingItem(null)
	}

	return (
		<div className="space-y-4">
			{/* Toolbar */}
			<div className="flex flex-wrap items-center gap-3">
				<div className="relative min-w-60 flex-1">
					<Search className="text-muted-foreground absolute left-2.5 top-2.5 size-4" />
					<Input
						placeholder="Search formulary items..."
						className="pl-9"
						value={search}
						onChange={(e) => {
							setSearch(e.target.value)
							setPage(1)
						}}
					/>
				</div>
				{canEdit && (
					<Button onClick={openAdd}>
						<Plus className="mr-1.5 size-4" />
						Add to Formulary
					</Button>
				)}
			</div>

			{/* Table */}
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-base">Drug Formulary</CardTitle>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="flex items-center justify-center py-16">
							<Loader2 className="text-muted-foreground size-6 animate-spin" />
						</div>
					) : items.data.length === 0 ? (
						<div className="text-muted-foreground flex flex-col items-center py-16 text-center">
							<Shield className="mb-3 size-10" />
							<p className="font-medium">No formulary items found</p>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Drug</TableHead>
									<TableHead>Dose Form</TableHead>
									<TableHead>Strength</TableHead>
									<TableHead>Route</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Flags</TableHead>
									{(canEdit || canDelete) && <TableHead />}
								</TableRow>
							</TableHeader>
							<TableBody>
								{items.data.map((item) => (
									<TableRow
										key={item.id}
										className="cursor-pointer hover:bg-muted/50"
										onClick={() => canEdit && openEdit(item)}
									>
										<TableCell className="font-medium">{item.genericName}</TableCell>
										<TableCell className="text-sm">{item.doseForm}</TableCell>
										<TableCell className="text-sm">{item.strength}</TableCell>
										<TableCell className="text-sm">{item.route}</TableCell>
										<TableCell>
											<Badge
												className={
													item.isActive
														? "bg-green-600 text-white"
														: "bg-muted text-muted-foreground"
												}
											>
												{item.isActive ? "Active" : "Inactive"}
											</Badge>
										</TableCell>
										<TableCell className="space-x-1">
											{item.isHighAlert && (
												<Badge variant="destructive" className="text-xs">
													<AlertTriangle className="mr-1 size-3" />
													High Alert
												</Badge>
											)}
											{item.isRestricted && (
												<Badge
													variant="secondary"
													className="border-amber-400 text-xs text-amber-700"
												>
													Restricted
												</Badge>
											)}
										</TableCell>
										{(canEdit || canDelete) && (
											<TableCell>
												<div className="flex gap-1">
													{canEdit && (
														<Tooltip>
															<TooltipTrigger
																className="focus-visible:ring-ring/50 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md p-0 text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1"
																aria-label="Edit"
																onClick={(e) => {
																	e.stopPropagation()
																	openEdit(item)
																}}
															>
																<Pencil className="size-4" />
															</TooltipTrigger>
															<TooltipContent>Edit</TooltipContent>
														</Tooltip>
													)}
													{canDelete && (
														<Tooltip>
															<TooltipTrigger
																className="focus-visible:ring-ring/50 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md p-0 text-sm text-destructive transition-colors hover:bg-accent hover:text-destructive focus-visible:outline-none focus-visible:ring-1"
																aria-label="Remove"
																disabled={deleteMutation.isPending}
																onClick={(e) => {
																	e.stopPropagation()
																	deleteMutation.mutate({ id: item.id })
																}}
															>
																<Trash2 className="size-4" />
															</TooltipTrigger>
															<TooltipContent>Remove</TooltipContent>
														</Tooltip>
													)}
												</div>
											</TableCell>
										)}
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}

					{/* Pagination */}
					{items.totalPages > 1 && (
						<div className="mt-4 flex items-center justify-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								disabled={page === 1}
							>
								<ChevronLeft className="size-4" />
								Previous
							</Button>
							<span className="text-muted-foreground text-sm">
								Page {page} of {items.totalPages}
							</span>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setPage((p) => Math.min(items.totalPages, p + 1))}
								disabled={page === items.totalPages}
							>
								Next
								<ChevronRight className="size-4" />
							</Button>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Add / Edit Modal */}
			<Dialog open={sheetMode !== null} onOpenChange={(open) => !open && closeSheet()}>
				<DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>
							{sheetMode === "add"
								? "Add Drug to Formulary"
								: `Edit — ${editingItem?.genericName}`}
						</DialogTitle>
					</DialogHeader>
					{sheetMode === "add" && (
						<AddFormularyItemForm
							facilityId={facilityId}
							canEditFlags={canEditFlags}
							onSuccess={closeSheet}
							onCancel={closeSheet}
						/>
					)}
					{sheetMode === "edit" && editingItem && (
						<EditFormularyItemForm
							item={editingItem}
							canEditFlags={canEditFlags}
							onSuccess={closeSheet}
							onCancel={closeSheet}
						/>
					)}
				</DialogContent>
			</Dialog>
		</div>
	)
}

// ============================================================================
// Edit form (dispatches to admin vs pharmacist sub-form)
// ============================================================================

function EditFormularyItemForm({
	item,
	onSuccess,
	onCancel,
	canEditFlags = false,
}: {
	item: FormularyItemRow
	onSuccess: () => void
	onCancel: () => void
	canEditFlags?: boolean
}) {
	if (canEditFlags) {
		return <PharmacistEditForm item={item} onSuccess={onSuccess} onCancel={onCancel} />
	}
	return <AdminEditForm item={item} onSuccess={onSuccess} onCancel={onCancel} />
}

// ── Admin edit: master-data fields ────────────────────────────────────────────

function AdminEditForm({
	item,
	onSuccess,
	onCancel,
}: {
	item: FormularyItemRow
	onSuccess: () => void
	onCancel: () => void
}) {
	const [doseForm, setDoseForm] = useState(item.doseForm)
	const [strength, setStrength] = useState(item.strength)
	const [route, setRoute] = useState(item.route)
	const [isActive, setIsActive] = useState(item.isActive)

	const updateMutation = useUpdateFormularyItemMutation()

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		updateMutation.mutate({ id: item.id, doseForm, strength, route, isActive }, { onSuccess })
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-5">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div className="space-y-1.5">
					<Label htmlFor="doseForm">Dose Form</Label>
					<Input
						id="doseForm"
						value={doseForm}
						onChange={(e) => setDoseForm(e.target.value)}
						required
					/>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="strength">Strength</Label>
					<Input
						id="strength"
						value={strength}
						onChange={(e) => setStrength(e.target.value)}
						required
					/>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="route">Route</Label>
					<Input
						id="route"
						value={route}
						onChange={(e) => setRoute(e.target.value)}
						required
					/>
				</div>
				<div className="flex items-center gap-2 pt-6">
					<Checkbox
						id="isActive"
						checked={isActive}
						onCheckedChange={(v) => setIsActive(Boolean(v))}
					/>
					<Label htmlFor="isActive">Active</Label>
				</div>
			</div>

			{/* Clinical policy — read-only for admins */}
			<Separator />
			<div className="space-y-1.5 rounded-md border border-dashed p-3">
				<p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
					Clinical Policy (managed by Pharmacist)
				</p>
				<div className="flex flex-wrap gap-2">
					{item.isHighAlert && (
						<Badge variant="destructive" className="text-xs">High Alert</Badge>
					)}
					{item.isRestricted && (
						<Badge variant="secondary" className="border-amber-400 text-xs text-amber-700">
							Restricted
						</Badge>
					)}
					{!item.isHighAlert && !item.isRestricted && (
						<span className="text-muted-foreground text-xs">No clinical policy flags set</span>
					)}
				</div>
				{item.formularyNotes && (
					<p className="text-muted-foreground mt-1 text-xs">{item.formularyNotes}</p>
				)}
			</div>

			{updateMutation.isError && (
				<p className="text-destructive text-sm">
					{(updateMutation.error as Error)?.message ?? "Failed to update formulary item."}
				</p>
			)}

			<div className="flex justify-end gap-2">
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancel
				</Button>
				<Button type="submit" disabled={updateMutation.isPending}>
					{updateMutation.isPending ? (
						<><Loader2 className="mr-1.5 size-4 animate-spin" />Saving...</>
					) : "Save Changes"}
				</Button>
			</div>
		</form>
	)
}

// ── Pharmacist edit: clinical policy fields ───────────────────────────────────

function PharmacistEditForm({
	item,
	onSuccess,
	onCancel,
}: {
	item: FormularyItemRow
	onSuccess: () => void
	onCancel: () => void
}) {
	const [isHighAlert, setIsHighAlert] = useState(item.isHighAlert)
	const [highAlertNotes, setHighAlertNotes] = useState(item.highAlertNotes ?? "")
	const [isRestricted, setIsRestricted] = useState(item.isRestricted)
	const [restrictionNotes, setRestrictionNotes] = useState(item.restrictionNotes ?? "")
	const [formularyNotes, setFormularyNotes] = useState(item.formularyNotes ?? "")

	const updateMutation = useUpdateFormularyClinicalPolicyMutation()

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		updateMutation.mutate(
			{
				id: item.id,
				isHighAlert,
				highAlertNotes: highAlertNotes || null,
				isRestricted,
				restrictionNotes: restrictionNotes || null,
				formularyNotes: formularyNotes || null,
			},
			{ onSuccess }
		)
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-5">
			<p className="text-muted-foreground text-sm">
				{item.doseForm} {item.strength} · {item.route}
			</p>

		<div className="space-y-3">
			{/* High Alert toggle card */}
			<button
				type="button"
				onClick={() => setIsHighAlert(v => !v)}
				className={`w-full rounded-lg border-2 p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
					isHighAlert
						? "border-red-500 bg-red-500/10"
						: "border-border bg-muted/30 hover:border-red-400 hover:bg-red-500/5"
				}`}
			>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<AlertTriangle className={`size-4 ${isHighAlert ? "text-red-600" : "text-muted-foreground"}`} />
						<span className={`text-sm font-semibold ${isHighAlert ? "text-red-700 dark:text-red-400" : "text-muted-foreground"}`}>
							High Alert
						</span>
					</div>
					<span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
						isHighAlert
							? "bg-red-600 text-white"
							: "bg-muted text-muted-foreground"
					}`}>
						{isHighAlert ? "ON" : "OFF"}
					</span>
				</div>
				<p className="mt-1 text-xs text-muted-foreground">
					Requires double-check verification before dispensing.
				</p>
			</button>
			{isHighAlert && (
				<Textarea
					value={highAlertNotes}
					onChange={(e) => setHighAlertNotes(e.target.value)}
					placeholder="High-alert notes (e.g. dosing thresholds, required double-checks)..."
					rows={2}
					className="border-red-300 focus-visible:ring-red-400"
				/>
			)}

			{/* Restricted toggle card */}
			<button
				type="button"
				onClick={() => setIsRestricted(v => !v)}
				className={`w-full rounded-lg border-2 p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
					isRestricted
						? "border-amber-500 bg-amber-500/10"
						: "border-border bg-muted/30 hover:border-amber-400 hover:bg-amber-500/5"
				}`}
			>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Shield className={`size-4 ${isRestricted ? "text-amber-600" : "text-muted-foreground"}`} />
						<span className={`text-sm font-semibold ${isRestricted ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
							Restricted
						</span>
					</div>
					<span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
						isRestricted
							? "bg-amber-500 text-white"
							: "bg-muted text-muted-foreground"
					}`}>
						{isRestricted ? "ON" : "OFF"}
					</span>
				</div>
				<p className="mt-1 text-xs text-muted-foreground">
					Requires specialist authorisation before prescribing.
				</p>
			</button>
			{isRestricted && (
				<Textarea
					value={restrictionNotes}
					onChange={(e) => setRestrictionNotes(e.target.value)}
					placeholder="Restriction notes (e.g. specialist authorisation required)..."
					rows={2}
					className="border-amber-300 focus-visible:ring-amber-400"
				/>
			)}

			<Separator />

			<div className="space-y-1.5">
				<Label htmlFor="formularyNotes">Formulary Notes</Label>
				<Textarea
					id="formularyNotes"
					value={formularyNotes}
					onChange={(e) => setFormularyNotes(e.target.value)}
					placeholder="General notes about this formulary entry..."
					rows={3}
				/>
			</div>
		</div>

			{updateMutation.isError && (
				<p className="text-destructive text-sm">
					{(updateMutation.error as Error)?.message ?? "Failed to update clinical policy."}
				</p>
			)}

			<div className="flex justify-end gap-2">
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancel
				</Button>
				<Button type="submit" disabled={updateMutation.isPending}>
					{updateMutation.isPending ? (
						<><Loader2 className="mr-1.5 size-4 animate-spin" />Saving...</>
					) : "Save Changes"}
				</Button>
			</div>
		</form>
	)
}

// ============================================================================
// Add form
// ============================================================================

function AddFormularyItemForm({
	facilityId,
	canEditFlags: _canEditFlags = false,
	onSuccess,
	onCancel,
}: {
	facilityId: string
	canEditFlags?: boolean
	onSuccess: () => void
	onCancel: () => void
}) {
	const [drugGenericId, setDrugGenericId] = useState("")
	const [doseForm, setDoseForm] = useState("")
	const [strength, setStrength] = useState("")
	const [route, setRoute] = useState("")

	const { data: genericsData } = useDrugGenericsQuery({ isActive: true, limit: 100 })
	const createMutation = useCreateFormularyItemMutation()

	const generics =
		(genericsData as { data: { id: string; genericName: string }[] })?.data ?? []

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		createMutation.mutate({ facilityId, drugGenericId, doseForm, strength, route }, { onSuccess })
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-5">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div className="space-y-1.5 sm:col-span-2">
					<Label htmlFor="drugGenericId">Drug Generic *</Label>
					<Select value={drugGenericId} onValueChange={(v) => setDrugGenericId(v ?? "")} required>
						<SelectTrigger id="drugGenericId">
							<SelectValue placeholder="Select a drug..." />
						</SelectTrigger>
						<SelectContent>
							{generics.map((g) => (
								<SelectItem key={g.id} value={g.id}>
									{g.genericName}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="addDoseForm">Dose Form *</Label>
					<Input
						id="addDoseForm"
						value={doseForm}
						onChange={(e) => setDoseForm(e.target.value)}
						placeholder="e.g. Tablet, Capsule, Syrup"
						required
					/>
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="addStrength">Strength *</Label>
					<Input
						id="addStrength"
						value={strength}
						onChange={(e) => setStrength(e.target.value)}
						placeholder="e.g. 500mg, 250mg/5ml"
						required
					/>
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="addRoute">Route *</Label>
					<Input
						id="addRoute"
						value={route}
						onChange={(e) => setRoute(e.target.value)}
						placeholder="e.g. Oral, IV, IM"
						required
					/>
				</div>
			</div>

			{createMutation.isError && (
				<p className="text-destructive text-sm">
					{(createMutation.error as Error)?.message ?? "Failed to add formulary item."}
				</p>
			)}

			<div className="flex justify-end gap-2">
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancel
				</Button>
				<Button type="submit" disabled={createMutation.isPending}>
					{createMutation.isPending ? (
						<><Loader2 className="mr-1.5 size-4 animate-spin" />Adding...</>
					) : "Add to Formulary"}
				</Button>
			</div>
		</form>
	)
}