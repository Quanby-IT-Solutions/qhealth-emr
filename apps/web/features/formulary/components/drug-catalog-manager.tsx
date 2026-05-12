"use client"

import { useState } from "react"

import {
	useCreateDrugBrandMutation,
	useCreateDrugGenericMutation,
	useDrugBrandsQuery,
	useDrugGenericsQuery,
	useUpdateDrugBrandMutation,
	useUpdateDrugGenericMutation,
} from "@/features/formulary/api/formulary.hooks"

interface DrugCatalogManagerProps {
	canManage?: boolean
}

interface DrugGenericRow {
	id: string
	genericName: string
	rxnormCode: string | null
	atcCode: string | null
	isActive: boolean
}

interface DrugBrandRow {
	id: string
	drugGenericId: string
	brandName: string
	manufacturer: string | null
	isActive: boolean
}

export function DrugCatalogManager({ canManage = false }: DrugCatalogManagerProps) {
	const [genericSearch, setGenericSearch] = useState("")
	const [genericPage, setGenericPage] = useState(1)
	const [showAddGeneric, setShowAddGeneric] = useState(false)
	const [editingGeneric, setEditingGeneric] = useState<DrugGenericRow | null>(null)
	const [brandSearch, setBrandSearch] = useState("")
	const [brandPage, setBrandPage] = useState(1)
	const [selectedGenericId, setSelectedGenericId] = useState("")
	const [showAddBrand, setShowAddBrand] = useState(false)
	const [editingBrand, setEditingBrand] = useState<DrugBrandRow | null>(null)

	const { data: genericsData, isLoading: isLoadingGenerics } = useDrugGenericsQuery({
		search: genericSearch || undefined,
		page: genericPage,
		limit: 20,
	})
	const { data: genericLookupData } = useDrugGenericsQuery({ limit: 500 })
	const { data: activeGenericOptionsData } = useDrugGenericsQuery({ isActive: true, limit: 100 })
	const { data: brandsData, isLoading: isLoadingBrands } = useDrugBrandsQuery({
		search: brandSearch || undefined,
		drugGenericId: selectedGenericId || undefined,
		page: brandPage,
		limit: 20,
	})

	const generics = (genericsData as { data: DrugGenericRow[]; totalPages: number }) ?? {
		data: [],
		totalPages: 0,
	}
	const genericLookup =
		(genericLookupData as { data: DrugGenericRow[] } | undefined)?.data ?? generics.data
	const activeGenericOptions =
		(activeGenericOptionsData as { data: DrugGenericRow[] } | undefined)?.data ??
		generics.data.filter(generic => generic.isActive)
	const brands = (brandsData as { data: DrugBrandRow[]; totalPages: number }) ?? {
		data: [],
		totalPages: 0,
	}
	const genericNameById = new Map(genericLookup.map(generic => [generic.id, generic.genericName]))

	return (
		<div className="space-y-8">
			<section className="space-y-4">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 className="text-lg font-semibold">Drug Generics</h2>
						<p className="text-muted-foreground text-sm">
							Generic drug names available for formulary entries.
						</p>
					</div>
					{canManage && (
						<button
							type="button"
							onClick={() => setShowAddGeneric(show => !show)}
							className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium"
						>
							{showAddGeneric ? "Cancel" : "Add Generic"}
						</button>
					)}
				</div>

				<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
					<input
						type="text"
						placeholder="Search drug generics..."
						value={genericSearch}
						onChange={e => {
							setGenericSearch(e.target.value)
							setGenericPage(1)
						}}
						className="border-input bg-background ring-offset-background flex h-10 w-full max-w-sm rounded-md border px-3 py-2 text-sm"
					/>
				</div>

				{showAddGeneric && canManage && (
					<AddDrugGenericForm onSuccess={() => setShowAddGeneric(false)} />
				)}

				{isLoadingGenerics ? (
					<p className="text-muted-foreground">Loading drug generics...</p>
				) : generics.data.length === 0 ? (
					<p className="text-muted-foreground">No drug generics found.</p>
				) : (
					<div className="overflow-hidden rounded-md border">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b">
									<th className="p-3 text-left font-medium">Generic Name</th>
									<th className="p-3 text-left font-medium">RxNorm</th>
									<th className="p-3 text-left font-medium">ATC</th>
									<th className="p-3 text-left font-medium">Status</th>
									<th className="p-3 text-left font-medium">Actions</th>
								</tr>
							</thead>
							<tbody>
								{generics.data.map(generic => (
									<tr key={generic.id} className="border-b last:border-b-0">
										<td className="p-3">{generic.genericName}</td>
										<td className="text-muted-foreground p-3">{generic.rxnormCode || "-"}</td>
										<td className="text-muted-foreground p-3">{generic.atcCode || "-"}</td>
										<td className="p-3">
											<StatusBadge isActive={generic.isActive} />
										</td>
										<td className="p-3">
											{canManage && (
												<button
													type="button"
													onClick={() => setEditingGeneric(generic)}
													className="text-primary text-sm hover:underline"
												>
													Edit
												</button>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				<PaginationControls
					page={genericPage}
					totalPages={generics.totalPages}
					onPrevious={() => setGenericPage(page => Math.max(1, page - 1))}
					onNext={() => setGenericPage(page => Math.min(generics.totalPages, page + 1))}
				/>
			</section>

			<section className="space-y-4">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 className="text-lg font-semibold">Drug Brands</h2>
						<p className="text-muted-foreground text-sm">
							Brand names linked to the generic drug catalog.
						</p>
					</div>
					{canManage && (
						<button
							type="button"
							onClick={() => setShowAddBrand(show => !show)}
							className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium"
						>
							{showAddBrand ? "Cancel" : "Add Brand"}
						</button>
					)}
				</div>

				<div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,20rem)_minmax(0,20rem)]">
					<input
						type="text"
						placeholder="Search drug brands..."
						value={brandSearch}
						onChange={e => {
							setBrandSearch(e.target.value)
							setBrandPage(1)
						}}
						className="border-input bg-background ring-offset-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
					/>
					<select
						value={selectedGenericId}
						onChange={e => {
							setSelectedGenericId(e.target.value)
							setBrandPage(1)
						}}
						className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
					>
						<option value="">All generics</option>
						{genericLookup.map(generic => (
							<option key={generic.id} value={generic.id}>
								{generic.genericName}
							</option>
						))}
					</select>
				</div>

				{showAddBrand && canManage && (
					<AddDrugBrandForm
						genericOptions={activeGenericOptions}
						onSuccess={() => setShowAddBrand(false)}
					/>
				)}

				{isLoadingBrands ? (
					<p className="text-muted-foreground">Loading drug brands...</p>
				) : brands.data.length === 0 ? (
					<p className="text-muted-foreground">No drug brands found.</p>
				) : (
					<div className="overflow-hidden rounded-md border">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b">
									<th className="p-3 text-left font-medium">Brand Name</th>
									<th className="p-3 text-left font-medium">Generic</th>
									<th className="p-3 text-left font-medium">Manufacturer</th>
									<th className="p-3 text-left font-medium">Status</th>
									<th className="p-3 text-left font-medium">Actions</th>
								</tr>
							</thead>
							<tbody>
								{brands.data.map(brand => (
									<tr key={brand.id} className="border-b last:border-b-0">
										<td className="p-3">{brand.brandName}</td>
										<td className="text-muted-foreground p-3">
											{genericNameById.get(brand.drugGenericId) ?? "Unknown generic"}
										</td>
										<td className="text-muted-foreground p-3">{brand.manufacturer || "-"}</td>
										<td className="p-3">
											<StatusBadge isActive={brand.isActive} />
										</td>
										<td className="p-3">
											{canManage && (
												<button
													type="button"
													onClick={() => setEditingBrand(brand)}
													className="text-primary text-sm hover:underline"
												>
													Edit
												</button>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				<PaginationControls
					page={brandPage}
					totalPages={brands.totalPages}
					onPrevious={() => setBrandPage(page => Math.max(1, page - 1))}
					onNext={() => setBrandPage(page => Math.min(brands.totalPages, page + 1))}
				/>
			</section>

			{editingGeneric && (
				<Modal>
					<EditDrugGenericForm
						generic={editingGeneric}
						onSuccess={() => setEditingGeneric(null)}
						onCancel={() => setEditingGeneric(null)}
					/>
				</Modal>
			)}

			{editingBrand && (
				<Modal>
					<EditDrugBrandForm
						brand={editingBrand}
						onSuccess={() => setEditingBrand(null)}
						onCancel={() => setEditingBrand(null)}
					/>
				</Modal>
			)}
		</div>
	)
}

function StatusBadge({ isActive }: { isActive: boolean }) {
	return (
		<span
			className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
				isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
			}`}
		>
			{isActive ? "Active" : "Inactive"}
		</span>
	)
}

function PaginationControls({
	page,
	totalPages,
	onPrevious,
	onNext,
}: {
	page: number
	totalPages: number
	onPrevious: () => void
	onNext: () => void
}) {
	if (totalPages <= 1) {
		return null
	}

	return (
		<div className="flex items-center justify-center gap-2">
			<button
				type="button"
				onClick={onPrevious}
				disabled={page === 1}
				className="border-input bg-background hover:bg-accent inline-flex h-8 items-center rounded-md border px-3 text-sm disabled:opacity-50"
			>
				Previous
			</button>
			<span className="text-muted-foreground text-sm">
				Page {page} of {totalPages}
			</span>
			<button
				type="button"
				onClick={onNext}
				disabled={page === totalPages}
				className="border-input bg-background hover:bg-accent inline-flex h-8 items-center rounded-md border px-3 text-sm disabled:opacity-50"
			>
				Next
			</button>
		</div>
	)
}

function Modal({ children }: { children: React.ReactNode }) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="bg-background w-full max-w-2xl rounded-lg p-6 shadow-xl">{children}</div>
		</div>
	)
}

function AddDrugGenericForm({ onSuccess }: { onSuccess: () => void }) {
	const [genericName, setGenericName] = useState("")
	const [rxnormCode, setRxnormCode] = useState("")
	const [atcCode, setAtcCode] = useState("")
	const createMutation = useCreateDrugGenericMutation()

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		createMutation.mutate(
			{
				genericName: genericName.trim(),
				rxnormCode: rxnormCode.trim() || undefined,
				atcCode: atcCode.trim() || undefined,
			},
			{ onSuccess }
		)
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4 rounded-md border p-4">
			<h3 className="text-base font-semibold">Add Drug Generic</h3>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<TextField label="Generic Name *" value={genericName} onChange={setGenericName} required />
				<TextField label="RxNorm Code" value={rxnormCode} onChange={setRxnormCode} />
				<TextField label="ATC Code" value={atcCode} onChange={setAtcCode} />
			</div>
			<MutationError
				mutationError={createMutation.error}
				fallback="Failed to create drug generic."
			/>
			<div className="flex justify-end">
				<SubmitButton isPending={createMutation.isPending}>Add Generic</SubmitButton>
			</div>
		</form>
	)
}

function EditDrugGenericForm({
	generic,
	onSuccess,
	onCancel,
}: {
	generic: DrugGenericRow
	onSuccess: () => void
	onCancel: () => void
}) {
	const [genericName, setGenericName] = useState(generic.genericName)
	const [rxnormCode, setRxnormCode] = useState(generic.rxnormCode ?? "")
	const [atcCode, setAtcCode] = useState(generic.atcCode ?? "")
	const [isActive, setIsActive] = useState(generic.isActive)
	const updateMutation = useUpdateDrugGenericMutation()

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		updateMutation.mutate(
			{
				id: generic.id,
				genericName: genericName.trim(),
				rxnormCode: rxnormCode.trim() || null,
				atcCode: atcCode.trim() || null,
				isActive,
			},
			{ onSuccess }
		)
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<h3 className="text-lg font-semibold">Edit Drug Generic</h3>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<TextField label="Generic Name *" value={genericName} onChange={setGenericName} required />
				<TextField label="RxNorm Code" value={rxnormCode} onChange={setRxnormCode} />
				<TextField label="ATC Code" value={atcCode} onChange={setAtcCode} />
				<ActiveCheckbox checked={isActive} onChange={setIsActive} />
			</div>
			<MutationError
				mutationError={updateMutation.error}
				fallback="Failed to update drug generic."
			/>
			<FormActions onCancel={onCancel} isPending={updateMutation.isPending} />
		</form>
	)
}

function AddDrugBrandForm({
	genericOptions,
	onSuccess,
}: {
	genericOptions: DrugGenericRow[]
	onSuccess: () => void
}) {
	const [drugGenericId, setDrugGenericId] = useState("")
	const [brandName, setBrandName] = useState("")
	const [manufacturer, setManufacturer] = useState("")
	const createMutation = useCreateDrugBrandMutation()

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		createMutation.mutate(
			{
				drugGenericId,
				brandName: brandName.trim(),
				manufacturer: manufacturer.trim() || undefined,
			},
			{ onSuccess }
		)
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4 rounded-md border p-4">
			<h3 className="text-base font-semibold">Add Drug Brand</h3>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<div>
					<label className="text-sm font-medium">Drug Generic *</label>
					<select
						value={drugGenericId}
						onChange={e => setDrugGenericId(e.target.value)}
						required
						className="border-input bg-background mt-1 flex h-10 w-full rounded-md border px-3 py-2 text-sm"
					>
						<option value="">Select a generic...</option>
						{genericOptions.map(generic => (
							<option key={generic.id} value={generic.id}>
								{generic.genericName}
							</option>
						))}
					</select>
				</div>
				<TextField label="Brand Name *" value={brandName} onChange={setBrandName} required />
				<TextField label="Manufacturer" value={manufacturer} onChange={setManufacturer} />
			</div>
			<MutationError mutationError={createMutation.error} fallback="Failed to create drug brand." />
			<div className="flex justify-end">
				<SubmitButton isPending={createMutation.isPending}>Add Brand</SubmitButton>
			</div>
		</form>
	)
}

function EditDrugBrandForm({
	brand,
	onSuccess,
	onCancel,
}: {
	brand: DrugBrandRow
	onSuccess: () => void
	onCancel: () => void
}) {
	const [brandName, setBrandName] = useState(brand.brandName)
	const [manufacturer, setManufacturer] = useState(brand.manufacturer ?? "")
	const [isActive, setIsActive] = useState(brand.isActive)
	const updateMutation = useUpdateDrugBrandMutation()

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		updateMutation.mutate(
			{
				id: brand.id,
				brandName: brandName.trim(),
				manufacturer: manufacturer.trim() || null,
				isActive,
			},
			{ onSuccess }
		)
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<h3 className="text-lg font-semibold">Edit Drug Brand</h3>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<TextField label="Brand Name *" value={brandName} onChange={setBrandName} required />
				<TextField label="Manufacturer" value={manufacturer} onChange={setManufacturer} />
				<ActiveCheckbox checked={isActive} onChange={setIsActive} />
			</div>
			<MutationError mutationError={updateMutation.error} fallback="Failed to update drug brand." />
			<FormActions onCancel={onCancel} isPending={updateMutation.isPending} />
		</form>
	)
}

function TextField({
	label,
	value,
	onChange,
	required = false,
}: {
	label: string
	value: string
	onChange: (value: string) => void
	required?: boolean
}) {
	return (
		<div>
			<label className="text-sm font-medium">{label}</label>
			<input
				type="text"
				value={value}
				onChange={e => onChange(e.target.value)}
				required={required}
				className="border-input bg-background mt-1 flex h-10 w-full rounded-md border px-3 py-2 text-sm"
			/>
		</div>
	)
}

function ActiveCheckbox({
	checked,
	onChange,
}: {
	checked: boolean
	onChange: (checked: boolean) => void
}) {
	return (
		<div className="flex items-center gap-2 pt-6">
			<input
				type="checkbox"
				id="is-active"
				checked={checked}
				onChange={e => onChange(e.target.checked)}
			/>
			<label htmlFor="is-active" className="text-sm font-medium">
				Active
			</label>
		</div>
	)
}

function MutationError({ mutationError, fallback }: { mutationError: unknown; fallback: string }) {
	if (!mutationError) {
		return null
	}

	return <p className="text-destructive text-sm">{(mutationError as Error)?.message ?? fallback}</p>
}

function SubmitButton({ children, isPending }: { children: React.ReactNode; isPending: boolean }) {
	return (
		<button
			type="submit"
			disabled={isPending}
			className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
		>
			{isPending ? "Saving..." : children}
		</button>
	)
}

function FormActions({ onCancel, isPending }: { onCancel: () => void; isPending: boolean }) {
	return (
		<div className="flex justify-end gap-2">
			<button
				type="button"
				onClick={onCancel}
				className="border-input bg-background hover:bg-accent inline-flex h-10 items-center rounded-md border px-4 py-2 text-sm font-medium"
			>
				Cancel
			</button>
			<SubmitButton isPending={isPending}>Save Changes</SubmitButton>
		</div>
	)
}
