"use client"

import { useState } from "react"

import {
	useDrugGenericsQuery,
	useFormularyItemsQuery,
	useCreateFormularyItemMutation,
	useDeleteFormularyItemMutation,
	useUpdateFormularyItemMutation,
	useUpdateFormularyClinicalPolicyMutation,
} from "@/features/formulary/api/formulary.hooks"

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

export function FormularyManager({ facilityId, canEdit = false, canDelete = false, canEditFlags = false }: FormularyManagerProps) {
	const [search, setSearch] = useState("")
	const [page, setPage] = useState(1)
	const [showAddForm, setShowAddForm] = useState(false)
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

	return (
		<>
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-4">
				<input
					type="text"
					placeholder="Search formulary items..."
					value={search}
					onChange={e => {
						setSearch(e.target.value)
						setPage(1)
					}}
					className="border-input bg-background ring-offset-background flex h-10 w-full max-w-sm rounded-md border px-3 py-2 text-sm"
				/>
				{canEdit && (
					<button
						onClick={() => setShowAddForm(!showAddForm)}
						className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium"
					>
						{showAddForm ? "Cancel" : "Add to Formulary"}
					</button>
				)}
			</div>

			{showAddForm && (
				<AddFormularyItemForm
					facilityId={facilityId}
					canEditFlags={canEditFlags}
					onSuccess={() => setShowAddForm(false)}
				/>
			)}

			{isLoading ? (
				<p className="text-muted-foreground">Loading formulary items...</p>
			) : items.data.length === 0 ? (
				<p className="text-muted-foreground">No formulary items found.</p>
			) : (
				<div className="rounded-md border">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b">
								<th className="p-3 text-left font-medium">Drug</th>
								<th className="p-3 text-left font-medium">Dose Form</th>
								<th className="p-3 text-left font-medium">Strength</th>
								<th className="p-3 text-left font-medium">Route</th>
								<th className="p-3 text-left font-medium">Status</th>
								<th className="p-3 text-left font-medium">Flags</th>
								<th className="p-3 text-left font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{items.data.map((item: FormularyItemRow) => (
								<tr key={item.id} className="border-b">
									<td className="p-3">{item.genericName}</td>
									<td className="p-3">{item.doseForm}</td>
									<td className="p-3">{item.strength}</td>
									<td className="p-3">{item.route}</td>
									<td className="p-3">
										<span
											className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
												item.isActive
													? "bg-green-100 text-green-700"
													: "bg-gray-100 text-gray-700"
											}`}
										>
											{item.isActive ? "Active" : "Inactive"}
										</span>
									</td>
									<td className="p-3 space-x-1">
										{item.isHighAlert && (
											<span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
												High Alert
											</span>
										)}
										{item.isRestricted && (
											<span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
												Restricted
											</span>
										)}
									</td>
									<td className="p-3 flex gap-2">
										{canEdit && (
											<button
												onClick={() => setEditingItem(item)}
												className="text-primary hover:underline text-sm"
											>
												Edit
											</button>
										)}
										{canDelete && (
											<button
												onClick={() => deleteMutation.mutate({ id: item.id })}
												disabled={deleteMutation.isPending}
												className="text-destructive hover:underline text-sm"
											>
												Remove
											</button>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{items.totalPages > 1 && (
				<div className="flex items-center justify-center gap-2">
					<button
						onClick={() => setPage(p => Math.max(1, p - 1))}
						disabled={page === 1}
						className="border-input bg-background hover:bg-accent inline-flex h-8 items-center rounded-md border px-3 text-sm disabled:opacity-50"
					>
						Previous
					</button>
					<span className="text-muted-foreground text-sm">
						Page {page} of {items.totalPages}
					</span>
					<button
						onClick={() => setPage(p => Math.min(items.totalPages, p + 1))}
						disabled={page === items.totalPages}
						className="border-input bg-background hover:bg-accent inline-flex h-8 items-center rounded-md border px-3 text-sm disabled:opacity-50"
					>
						Next
					</button>
				</div>
			)}
		</div>

		{editingItem && (
			<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
				<div className="bg-background w-full max-w-2xl rounded-lg p-6 shadow-xl">
					<EditFormularyItemForm
						item={editingItem}
						onSuccess={() => setEditingItem(null)}
						onCancel={() => setEditingItem(null)}
						canEditFlags={canEditFlags}
					/>
				</div>
			</div>
		)}
		</>
	)
}

// ---------------------------------------------------------------------------
// Edit Formulary Item Form
// Admin mode (canEditFlags=false): edits master-data fields via item.update
// Pharmacist mode (canEditFlags=true): edits clinical policy fields via item.updateClinicalPolicy
// ---------------------------------------------------------------------------

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
		return (
			<PharmacistEditForm item={item} onSuccess={onSuccess} onCancel={onCancel} />
		)
	}
	return <AdminEditForm item={item} onSuccess={onSuccess} onCancel={onCancel} />
}

// Admin edit: master-data fields (doseForm, strength, route, isActive)
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
		updateMutation.mutate(
			{ id: item.id, doseForm, strength, route, isActive },
			{ onSuccess }
		)
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold">Edit Formulary Item</h3>
				<p className="text-muted-foreground text-sm">{item.genericName}</p>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					<label className="text-sm font-medium">Dose Form</label>
					<input
						type="text"
						value={doseForm}
						onChange={e => setDoseForm(e.target.value)}
						required
						className="border-input bg-background mt-1 flex h-10 w-full rounded-md border px-3 py-2 text-sm"
					/>
				</div>

				<div>
					<label className="text-sm font-medium">Strength</label>
					<input
						type="text"
						value={strength}
						onChange={e => setStrength(e.target.value)}
						required
						className="border-input bg-background mt-1 flex h-10 w-full rounded-md border px-3 py-2 text-sm"
					/>
				</div>

				<div>
					<label className="text-sm font-medium">Route</label>
					<input
						type="text"
						value={route}
						onChange={e => setRoute(e.target.value)}
						required
						className="border-input bg-background mt-1 flex h-10 w-full rounded-md border px-3 py-2 text-sm"
					/>
				</div>

				<div className="flex items-center gap-2 pt-6">
					<input
						type="checkbox"
						id="isActive"
						checked={isActive}
						onChange={e => setIsActive(e.target.checked)}
					/>
					<label htmlFor="isActive" className="text-sm font-medium">Active</label>
				</div>
			</div>

			{/* Clinical policy — read-only display for admin */}
			<div className="rounded-md border border-dashed p-3 space-y-1">
				<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
					Clinical Policy (managed by Pharmacist)
				</p>
				<div className="flex gap-2 flex-wrap">
					{item.isHighAlert && (
						<span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
							High Alert
						</span>
					)}
					{item.isRestricted && (
						<span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
							Restricted
						</span>
					)}
					{!item.isHighAlert && !item.isRestricted && (
						<span className="text-xs text-muted-foreground">No clinical policy flags set</span>
					)}
				</div>
				{item.formularyNotes && (
					<p className="text-xs text-muted-foreground mt-1">{item.formularyNotes}</p>
				)}
			</div>

			{updateMutation.isError && (
				<p className="text-destructive text-sm">
					{(updateMutation.error as Error)?.message ?? "Failed to update formulary item."}
				</p>
			)}

			<div className="flex justify-end gap-2">
				<button
					type="button"
					onClick={onCancel}
					className="border-input bg-background hover:bg-accent inline-flex h-10 items-center rounded-md border px-4 py-2 text-sm font-medium"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={updateMutation.isPending}
					className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
				>
					{updateMutation.isPending ? "Saving..." : "Save Changes"}
				</button>
			</div>
		</form>
	)
}

// Pharmacist edit: clinical policy fields (isHighAlert, isRestricted, notes)
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
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold">Edit Clinical Policy</h3>
				<p className="text-muted-foreground text-sm">
					{item.genericName} — {item.doseForm} {item.strength} ({item.route})
				</p>
			</div>

			<div className="space-y-3">
				<div className="flex items-start gap-3">
					<label className="flex items-center gap-2 text-sm font-medium pt-1 min-w-[120px]">
						<input
							type="checkbox"
							checked={isHighAlert}
							onChange={e => setIsHighAlert(e.target.checked)}
						/>
						<span className="text-red-700">High Alert</span>
					</label>
					<textarea
						value={highAlertNotes}
						onChange={e => setHighAlertNotes(e.target.value)}
						placeholder="High-alert notes (e.g. dosing thresholds, required double-checks)..."
						rows={2}
						disabled={!isHighAlert}
						className="border-input bg-background flex w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
					/>
				</div>

				<div className="flex items-start gap-3">
					<label className="flex items-center gap-2 text-sm font-medium pt-1 min-w-[120px]">
						<input
							type="checkbox"
							checked={isRestricted}
							onChange={e => setIsRestricted(e.target.checked)}
						/>
						<span className="text-yellow-700">Restricted</span>
					</label>
					<textarea
						value={restrictionNotes}
						onChange={e => setRestrictionNotes(e.target.value)}
						placeholder="Restriction notes (e.g. specialist authorisation required)..."
						rows={2}
						disabled={!isRestricted}
						className="border-input bg-background flex w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
					/>
				</div>

				<div>
					<label className="text-sm font-medium">Formulary Notes</label>
					<textarea
						value={formularyNotes}
						onChange={e => setFormularyNotes(e.target.value)}
						placeholder="General notes about this formulary entry..."
						rows={3}
						className="border-input bg-background mt-1 flex w-full rounded-md border px-3 py-2 text-sm"
					/>
				</div>
			</div>

			{updateMutation.isError && (
				<p className="text-destructive text-sm">
					{(updateMutation.error as Error)?.message ?? "Failed to update clinical policy."}
				</p>
			)}

			<div className="flex justify-end gap-2">
				<button
					type="button"
					onClick={onCancel}
					className="border-input bg-background hover:bg-accent inline-flex h-10 items-center rounded-md border px-4 py-2 text-sm font-medium"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={updateMutation.isPending}
					className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
				>
					{updateMutation.isPending ? "Saving..." : "Save Changes"}
				</button>
			</div>
		</form>
	)
}

// ---------------------------------------------------------------------------
// Add Formulary Item Form
// Clinical policy fields (isHighAlert, isRestricted, formularyNotes) are not
// included — admins create master-data only; pharmacists set policy separately.
// ---------------------------------------------------------------------------

function AddFormularyItemForm({
	facilityId,
	canEditFlags: _canEditFlags = false,
	onSuccess,
}: {
	facilityId: string
	canEditFlags?: boolean
	onSuccess: () => void
}) {
	const [drugGenericId, setDrugGenericId] = useState("")
	const [doseForm, setDoseForm] = useState("")
	const [strength, setStrength] = useState("")
	const [route, setRoute] = useState("")

	const { data: genericsData } = useDrugGenericsQuery({ isActive: true, limit: 100 })
	const createMutation = useCreateFormularyItemMutation()

	const generics = (genericsData as { data: { id: string; genericName: string }[] })?.data ?? []

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		createMutation.mutate(
			{ facilityId, drugGenericId, doseForm, strength, route },
			{ onSuccess }
		)
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4 rounded-md border p-4">
			<h3 className="text-lg font-semibold">Add Drug to Formulary</h3>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					<label className="text-sm font-medium">Drug Generic *</label>
					<select
						value={drugGenericId}
						onChange={e => setDrugGenericId(e.target.value)}
						required
						className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
					>
						<option value="">Select a drug...</option>
						{generics.map((g: { id: string; genericName: string }) => (
							<option key={g.id} value={g.id}>
								{g.genericName}
							</option>
						))}
					</select>
				</div>

				<div>
					<label className="text-sm font-medium">Dose Form *</label>
					<input
						type="text"
						value={doseForm}
						onChange={e => setDoseForm(e.target.value)}
						placeholder="e.g. Tablet, Capsule, Syrup"
						required
						className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
					/>
				</div>

				<div>
					<label className="text-sm font-medium">Strength *</label>
					<input
						type="text"
						value={strength}
						onChange={e => setStrength(e.target.value)}
						placeholder="e.g. 500mg, 250mg/5ml"
						required
						className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
					/>
				</div>

				<div>
					<label className="text-sm font-medium">Route *</label>
					<input
						type="text"
						value={route}
						onChange={e => setRoute(e.target.value)}
						placeholder="e.g. Oral, IV, IM"
						required
						className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
					/>
				</div>
			</div>

			{createMutation.isError && (
				<p className="text-destructive text-sm">
					{(createMutation.error as Error)?.message ?? "Failed to add formulary item."}
				</p>
			)}

			<button
				type="submit"
				disabled={createMutation.isPending}
				className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
			>
				{createMutation.isPending ? "Adding..." : "Add to Formulary"}
			</button>
		</form>
	)
}
