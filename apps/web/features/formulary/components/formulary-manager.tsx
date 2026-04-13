"use client"

import { useState } from "react"

import {
	useDrugGenericsQuery,
	useFormularyItemsQuery,
	useCreateFormularyItemMutation,
	useDeleteFormularyItemMutation,
} from "@/features/formulary/api/formulary.hooks"

interface FormularyManagerProps {
	facilityId: string
}

export function FormularyManager({ facilityId }: FormularyManagerProps) {
	const [search, setSearch] = useState("")
	const [page, setPage] = useState(1)
	const [showAddForm, setShowAddForm] = useState(false)

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
				<button
					onClick={() => setShowAddForm(!showAddForm)}
					className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium"
				>
					{showAddForm ? "Cancel" : "Add to Formulary"}
				</button>
			</div>

			{showAddForm && (
				<AddFormularyItemForm
					facilityId={facilityId}
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
									<td className="p-3">
										<button
											onClick={() => deleteMutation.mutate({ id: item.id })}
											disabled={deleteMutation.isPending}
											className="text-destructive hover:underline text-sm"
										>
											Remove
										</button>
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
	)
}

// ---------------------------------------------------------------------------
// Add Formulary Item Form
// ---------------------------------------------------------------------------

interface FormularyItemRow {
	id: string
	genericName: string
	doseForm: string
	strength: string
	route: string
	isActive: boolean
	isHighAlert: boolean
	isRestricted: boolean
	formularyNotes: string | null
}

function AddFormularyItemForm({
	facilityId,
	onSuccess,
}: {
	facilityId: string
	onSuccess: () => void
}) {
	const [drugGenericId, setDrugGenericId] = useState("")
	const [doseForm, setDoseForm] = useState("")
	const [strength, setStrength] = useState("")
	const [route, setRoute] = useState("")
	const [isHighAlert, setIsHighAlert] = useState(false)
	const [isRestricted, setIsRestricted] = useState(false)
	const [formularyNotes, setFormularyNotes] = useState("")

	const { data: genericsData } = useDrugGenericsQuery({ isActive: true, limit: 100 })
	const createMutation = useCreateFormularyItemMutation()

	const generics = (genericsData as { data: { id: string; genericName: string }[] })?.data ?? []

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		createMutation.mutate(
			{
				facilityId,
				drugGenericId,
				doseForm,
				strength,
				route,
				isHighAlert,
				isRestricted,
				formularyNotes: formularyNotes || undefined,
			},
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

			<div className="flex gap-4">
				<label className="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						checked={isHighAlert}
						onChange={e => setIsHighAlert(e.target.checked)}
					/>
					High Alert
				</label>

				<label className="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						checked={isRestricted}
						onChange={e => setIsRestricted(e.target.checked)}
					/>
					Restricted
				</label>
			</div>

			<div>
				<label className="text-sm font-medium">Formulary Notes</label>
				<textarea
					value={formularyNotes}
					onChange={e => setFormularyNotes(e.target.value)}
					placeholder="Optional notes..."
					rows={3}
					className="border-input bg-background flex w-full rounded-md border px-3 py-2 text-sm"
				/>
			</div>

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
