"use client"

import { useState } from "react"

import {
	useIcd10SearchQuery,
	useLoincSearchQuery,
	useRxnormSearchQuery,
	useRvsSearchQuery,
	useSnomedCtSearchQuery,
	useCodeSetUploadsQuery,
	useRecordCatalogUploadMutation,
	useDeprecatedMappingsQuery,
	useCreateDeprecationMutation,
	useDeleteDeprecationMutation,
	useSetCodeActiveMutation,
	useAdminCatalogSearchQuery,
	useCreateCatalogEntryMutation,
	useUpdateCatalogEntryMutation,
	useDeleteCatalogEntryMutation,
	useCatalogVersionsQuery,
	usePublishCatalogVersionMutation,
} from "@/features/formulary/api/formulary.hooks"

type CodeSetType = "icd10" | "loinc" | "rxnorm" | "rvs" | "snomedCt" | "admin"

const CODE_SET_LABELS: Record<CodeSetType, string> = {
	icd10: "ICD-10",
	loinc: "LOINC",
	rxnorm: "RxNorm",
	rvs: "RVS",
	snomedCt: "SNOMED CT",
	admin: "⚙ Admin",
}

interface CodeSetBrowserProps {
	canEdit?: boolean
}

export function CodeSetBrowser({ canEdit = false }: CodeSetBrowserProps) {
	const [activeTab, setActiveTab] = useState<CodeSetType>("icd10")
	const [search, setSearch] = useState("")
	const [page, setPage] = useState(1)

	const visibleTabs = (Object.keys(CODE_SET_LABELS) as CodeSetType[]).filter(
		tab => tab !== "admin" || canEdit
	)

	return (
		<div className="space-y-4">
			<div className="flex gap-1 rounded-lg border p-1">
				{visibleTabs.map(tab => (
					<button
						key={tab}
						onClick={() => {
							setActiveTab(tab)
							setPage(1)
							setSearch("")
						}}
						className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
							activeTab === tab
								? "bg-primary text-primary-foreground"
								: "hover:bg-muted"
						}`}
					>
						{CODE_SET_LABELS[tab]}
					</button>
				))}
			</div>

			{activeTab !== "admin" && (
			<input
				type="text"
				placeholder={`Search ${CODE_SET_LABELS[activeTab]} codes...`}
				value={search}
				onChange={e => {
					setSearch(e.target.value)
					setPage(1)
				}}
				className="border-input bg-background ring-offset-background flex h-10 w-full max-w-sm rounded-md border px-3 py-2 text-sm"
			/>
		)}

			{activeTab === "icd10" && (
				<Icd10Table search={search} page={page} onPageChange={setPage} />
			)}
			{activeTab === "loinc" && (
				<LoincTable search={search} page={page} onPageChange={setPage} />
			)}
			{activeTab === "rxnorm" && (
				<RxnormTable search={search} page={page} onPageChange={setPage} />
			)}
			{activeTab === "rvs" && (
				<RvsTable search={search} page={page} onPageChange={setPage} />
			)}
			{activeTab === "snomedCt" && (
				<SnomedCtTable search={search} page={page} onPageChange={setPage} />
			)}
			{activeTab === "admin" && canEdit && (
				<CodeSetAdminPanel canEdit={canEdit} />
			)}
		</div>
	)
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

function Pagination({
	page,
	totalPages,
	onPageChange,
}: {
	page: number
	totalPages: number
	onPageChange: (p: number) => void
}) {
	if (totalPages <= 1) return null

	return (
		<div className="flex items-center justify-center gap-2">
			<button
				onClick={() => onPageChange(Math.max(1, page - 1))}
				disabled={page === 1}
				className="border-input bg-background hover:bg-accent inline-flex h-8 items-center rounded-md border px-3 text-sm disabled:opacity-50"
			>
				Previous
			</button>
			<span className="text-muted-foreground text-sm">
				Page {page} of {totalPages}
			</span>
			<button
				onClick={() => onPageChange(Math.min(totalPages, page + 1))}
				disabled={page === totalPages}
				className="border-input bg-background hover:bg-accent inline-flex h-8 items-center rounded-md border px-3 text-sm disabled:opacity-50"
			>
				Next
			</button>
		</div>
	)
}

// ---------------------------------------------------------------------------
// ICD-10 Table
// ---------------------------------------------------------------------------

function Icd10Table({
	search,
	page,
	onPageChange,
}: {
	search: string
	page: number
	onPageChange: (p: number) => void
}) {
	const { data, isLoading } = useIcd10SearchQuery({
		search: search || undefined,
		page,
		limit: 20,
	})

	const result = data as { data: { id: string; code: string; description: string; category: string | null }[]; totalPages: number } | undefined

	if (isLoading) return <p className="text-muted-foreground">Loading...</p>
	if (!result?.data.length) return <p className="text-muted-foreground">No ICD-10 codes found.</p>

	return (
		<>
			<div className="rounded-md border">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b">
							<th className="p-3 text-left font-medium">Code</th>
							<th className="p-3 text-left font-medium">Description</th>
							<th className="p-3 text-left font-medium">Category</th>
						</tr>
					</thead>
					<tbody>
						{result.data.map(code => (
							<tr key={code.id} className="border-b">
								<td className="p-3 font-mono">{code.code}</td>
								<td className="p-3">{code.description}</td>
								<td className="p-3 text-muted-foreground">{code.category ?? "—"}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<Pagination page={page} totalPages={result.totalPages} onPageChange={onPageChange} />
		</>
	)
}

// ---------------------------------------------------------------------------
// LOINC Table
// ---------------------------------------------------------------------------

function LoincTable({
	search,
	page,
	onPageChange,
}: {
	search: string
	page: number
	onPageChange: (p: number) => void
}) {
	const { data, isLoading } = useLoincSearchQuery({
		search: search || undefined,
		page,
		limit: 20,
	})

	const result = data as { data: { id: string; loincNum: string; longCommonName: string | null; component: string | null; system: string | null }[]; totalPages: number } | undefined

	if (isLoading) return <p className="text-muted-foreground">Loading...</p>
	if (!result?.data.length) return <p className="text-muted-foreground">No LOINC codes found.</p>

	return (
		<>
			<div className="rounded-md border">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b">
							<th className="p-3 text-left font-medium">LOINC #</th>
							<th className="p-3 text-left font-medium">Long Common Name</th>
							<th className="p-3 text-left font-medium">Component</th>
							<th className="p-3 text-left font-medium">System</th>
						</tr>
					</thead>
					<tbody>
						{result.data.map(code => (
							<tr key={code.id} className="border-b">
								<td className="p-3 font-mono">{code.loincNum}</td>
								<td className="p-3">{code.longCommonName ?? "—"}</td>
								<td className="p-3">{code.component ?? "—"}</td>
								<td className="p-3 text-muted-foreground">{code.system ?? "—"}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<Pagination page={page} totalPages={result.totalPages} onPageChange={onPageChange} />
		</>
	)
}

// ---------------------------------------------------------------------------
// RxNorm Table
// ---------------------------------------------------------------------------

function RxnormTable({
	search,
	page,
	onPageChange,
}: {
	search: string
	page: number
	onPageChange: (p: number) => void
}) {
	const { data, isLoading } = useRxnormSearchQuery({
		search: search || undefined,
		page,
		limit: 20,
	})

	const result = data as { data: { id: string; rxcui: string; name: string; tty: string | null }[]; totalPages: number } | undefined

	if (isLoading) return <p className="text-muted-foreground">Loading...</p>
	if (!result?.data.length) return <p className="text-muted-foreground">No RxNorm codes found.</p>

	return (
		<>
			<div className="rounded-md border">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b">
							<th className="p-3 text-left font-medium">RxCUI</th>
							<th className="p-3 text-left font-medium">Name</th>
							<th className="p-3 text-left font-medium">Term Type</th>
						</tr>
					</thead>
					<tbody>
						{result.data.map(code => (
							<tr key={code.id} className="border-b">
								<td className="p-3 font-mono">{code.rxcui}</td>
								<td className="p-3">{code.name}</td>
								<td className="p-3 text-muted-foreground">{code.tty ?? "—"}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<Pagination page={page} totalPages={result.totalPages} onPageChange={onPageChange} />
		</>
	)
}

// ---------------------------------------------------------------------------
// RVS Table
// ---------------------------------------------------------------------------

function RvsTable({
	search,
	page,
	onPageChange,
}: {
	search: string
	page: number
	onPageChange: (p: number) => void
}) {
	const { data, isLoading } = useRvsSearchQuery({
		search: search || undefined,
		page,
		limit: 20,
	})

	const result = data as { data: { id: string; rvsCode: string; procedureName: string; category: string | null; rvsValue: string | null }[]; totalPages: number } | undefined

	if (isLoading) return <p className="text-muted-foreground">Loading...</p>
	if (!result?.data.length) return <p className="text-muted-foreground">No RVS codes found.</p>

	return (
		<>
			<div className="rounded-md border">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b">
							<th className="p-3 text-left font-medium">RVS Code</th>
							<th className="p-3 text-left font-medium">Procedure</th>
							<th className="p-3 text-left font-medium">Category</th>
							<th className="p-3 text-left font-medium">RVS Value</th>
						</tr>
					</thead>
					<tbody>
						{result.data.map(code => (
							<tr key={code.id} className="border-b">
								<td className="p-3 font-mono">{code.rvsCode}</td>
								<td className="p-3">{code.procedureName}</td>
								<td className="p-3 text-muted-foreground">{code.category ?? "—"}</td>
								<td className="p-3">{code.rvsValue ?? "—"}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<Pagination page={page} totalPages={result.totalPages} onPageChange={onPageChange} />
		</>
	)
}

// ---------------------------------------------------------------------------
// SNOMED CT Table
// ---------------------------------------------------------------------------

function SnomedCtTable({
	search,
	page,
	onPageChange,
}: {
	search: string
	page: number
	onPageChange: (p: number) => void
}) {
	const { data, isLoading } = useSnomedCtSearchQuery({
		search: search || undefined,
		page,
		limit: 20,
	})

	const result = data as {
		data: {
			id: string
			conceptId: string
			fsn: string
			preferredTerm: string
			semanticTag: string | null
		}[]
		totalPages: number
	} | undefined

	if (isLoading) return <p className="text-muted-foreground">Loading...</p>
	if (!result?.data.length)
		return <p className="text-muted-foreground">No SNOMED CT concepts found.</p>

	return (
		<>
			<div className="rounded-md border">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b">
							<th className="p-3 text-left font-medium">Concept ID</th>
							<th className="p-3 text-left font-medium">Preferred Term</th>
							<th className="p-3 text-left font-medium">Semantic Tag</th>
							<th className="p-3 text-left font-medium">Fully Specified Name</th>
						</tr>
					</thead>
					<tbody>
						{result.data.map(code => (
							<tr key={code.id} className="border-b">
								<td className="p-3 font-mono">{code.conceptId}</td>
								<td className="p-3">{code.preferredTerm}</td>
								<td className="p-3 text-muted-foreground">{code.semanticTag ?? "—"}</td>
								<td className="p-3 text-muted-foreground">{code.fsn}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<Pagination page={page} totalPages={result.totalPages} onPageChange={onPageChange} />
		</>
	)
}

// ---------------------------------------------------------------------------
// Code Set Admin Panel (FORM-001)
// ---------------------------------------------------------------------------

function CodeSetAdminPanel({ canEdit }: { canEdit: boolean }) {
	return (
		<div className="space-y-8">
			<CatalogEntryEditorSection canEdit={canEdit} />
			<PublishVersionSection canEdit={canEdit} />
			<CatalogUploadHistorySection canEdit={canEdit} />
			<DeprecatedCodeMappingsSection canEdit={canEdit} />
		</div>
	)
}

// -------- Catalog Upload History --------

function CatalogUploadHistorySection({ canEdit }: { canEdit: boolean }) {
	const [catalogType, setCatalogType] = useState("")
	const [showForm, setShowForm] = useState(false)

	const { data } = useCodeSetUploadsQuery({ catalogType: catalogType || undefined })
	const uploads = (data as { data: CatalogUploadRow[] } | undefined)?.data ?? []
	const recordMutation = useRecordCatalogUploadMutation()

	const [formCatalogType, setFormCatalogType] = useState("icd10")
	const [version, setVersion] = useState("")
	const [entryCount, setEntryCount] = useState("")
	const [notes, setNotes] = useState("")

	function handleRecord(e: React.FormEvent) {
		e.preventDefault()
		recordMutation.mutate(
			{ catalogType: formCatalogType, version: version || undefined, entryCount: Number(entryCount), notes: notes || undefined },
			{ onSuccess: () => { setShowForm(false); setVersion(""); setEntryCount(""); setNotes("") } }
		)
	}

	return (
		<section className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-base font-semibold">Catalog Upload History</h3>
				{canEdit && (
					<button
						onClick={() => setShowForm(!showForm)}
						className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center rounded-md px-3 text-sm font-medium"
					>
						{showForm ? "Cancel" : "Record Refresh"}
					</button>
				)}
			</div>

			{showForm && (
				<form onSubmit={handleRecord} className="space-y-3 rounded-md border p-4">
					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="text-sm font-medium">Catalog Type</label>
							<select
								value={formCatalogType}
								onChange={e => setFormCatalogType(e.target.value)}
								className="border-input bg-background mt-1 flex h-10 w-full rounded-md border px-3 py-2 text-sm"
							>
								{["icd10", "loinc", "rxnorm", "rvs", "snomed_ct"].map(t => (
									<option key={t} value={t}>{t}</option>
								))}
							</select>
						</div>
						<div>
							<label className="text-sm font-medium">Version</label>
							<input
								type="text"
								value={version}
								onChange={e => setVersion(e.target.value)}
								placeholder="e.g. 2024-Q1"
								className="border-input bg-background mt-1 flex h-10 w-full rounded-md border px-3 py-2 text-sm"
							/>
						</div>
						<div>
							<label className="text-sm font-medium">Entry Count *</label>
							<input
								type="number"
								value={entryCount}
								onChange={e => setEntryCount(e.target.value)}
								required
								min={0}
								className="border-input bg-background mt-1 flex h-10 w-full rounded-md border px-3 py-2 text-sm"
							/>
						</div>
						<div>
							<label className="text-sm font-medium">Notes</label>
							<input
								type="text"
								value={notes}
								onChange={e => setNotes(e.target.value)}
								placeholder="Optional notes..."
								className="border-input bg-background mt-1 flex h-10 w-full rounded-md border px-3 py-2 text-sm"
							/>
						</div>
					</div>
					<button
						type="submit"
						disabled={recordMutation.isPending}
						className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center rounded-md px-3 text-sm font-medium disabled:opacity-50"
					>
						{recordMutation.isPending ? "Recording..." : "Record Upload"}
					</button>
				</form>
			)}

			<div className="flex gap-2">
				<select
					value={catalogType}
					onChange={e => setCatalogType(e.target.value)}
					className="border-input bg-background h-9 rounded-md border px-3 text-sm"
				>
					<option value="">All catalogs</option>
					{["icd10", "loinc", "rxnorm", "rvs", "snomed_ct"].map(t => (
						<option key={t} value={t}>{t}</option>
					))}
				</select>
			</div>

			{uploads.length === 0 ? (
				<p className="text-muted-foreground text-sm">No catalog uploads recorded yet.</p>
			) : (
				<div className="rounded-md border">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b">
								<th className="p-3 text-left font-medium">Catalog</th>
								<th className="p-3 text-left font-medium">Version</th>
								<th className="p-3 text-left font-medium">Entries</th>
								<th className="p-3 text-left font-medium">Status</th>
								<th className="p-3 text-left font-medium">Notes</th>
								<th className="p-3 text-left font-medium">Uploaded At</th>
							</tr>
						</thead>
						<tbody>
							{uploads.map((u: CatalogUploadRow) => (
								<tr key={u.id} className="border-b">
									<td className="p-3 font-mono">{u.catalogType}</td>
									<td className="p-3">{u.version ?? "—"}</td>
									<td className="p-3">{u.entryCount.toLocaleString()}</td>
									<td className="p-3">
										<span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
											{u.status}
										</span>
									</td>
									<td className="p-3 text-muted-foreground">{u.notes ?? "—"}</td>
									<td className="p-3 text-muted-foreground">{new Date(u.createdAt).toLocaleString()}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</section>
	)
}

interface CatalogUploadRow {
	id: string
	catalogType: string
	version: string | null
	entryCount: number
	status: string
	notes: string | null
	createdAt: string
}

// -------- Deprecated Code Mappings --------

function DeprecatedCodeMappingsSection({ canEdit }: { canEdit: boolean }) {
	const [catalogType, setCatalogType] = useState("")
	const [showForm, setShowForm] = useState(false)

	const { data } = useDeprecatedMappingsQuery({ catalogType: catalogType || undefined })
	const mappings = (data as { data: DeprecatedMappingRow[] } | undefined)?.data ?? []

	const createMutation = useCreateDeprecationMutation()
	const deleteMutation = useDeleteDeprecationMutation()
	const setCodeActiveMutation = useSetCodeActiveMutation()

	const [fromCode, setFromCode] = useState("")
	const [toCode, setToCode] = useState("")
	const [notes, setNotes] = useState("")
	const [formCatalogType, setFormCatalogType] = useState("icd10")

	function handleCreate(e: React.FormEvent) {
		e.preventDefault()
		createMutation.mutate(
			{ catalogType: formCatalogType, fromCode, toCode: toCode || undefined, notes: notes || undefined },
			{ onSuccess: () => { setShowForm(false); setFromCode(""); setToCode(""); setNotes("") } }
		)
	}

	const [toggleCodeId, setToggleCodeId] = useState("")
	const [toggleCatalogType, setToggleCatalogType] = useState("icd10")
	const [toggleActive, setToggleActive] = useState(true)

	function handleToggle(e: React.FormEvent) {
		e.preventDefault()
		setCodeActiveMutation.mutate({ codeId: toggleCodeId, catalogType: toggleCatalogType, isActive: toggleActive })
	}

	return (
		<section className="space-y-6">
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h3 className="text-base font-semibold">Deprecated Code Mappings</h3>
					{canEdit && (
						<button
							onClick={() => setShowForm(!showForm)}
							className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center rounded-md px-3 text-sm font-medium"
						>
							{showForm ? "Cancel" : "Add Mapping"}
						</button>
					)}
				</div>

				{showForm && (
					<form onSubmit={handleCreate} className="space-y-3 rounded-md border p-4">
						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="text-sm font-medium">Catalog Type</label>
								<select
									value={formCatalogType}
									onChange={e => setFormCatalogType(e.target.value)}
									className="border-input bg-background mt-1 flex h-10 w-full rounded-md border px-3 py-2 text-sm"
								>
									{["icd10", "loinc", "rxnorm", "rvs", "snomed_ct"].map(t => (
										<option key={t} value={t}>{t}</option>
									))}
								</select>
							</div>
							<div>
								<label className="text-sm font-medium">From Code *</label>
								<input
									type="text"
									value={fromCode}
									onChange={e => setFromCode(e.target.value)}
									required
									placeholder="Deprecated code"
									className="border-input bg-background mt-1 flex h-10 w-full rounded-md border px-3 py-2 text-sm"
								/>
							</div>
							<div>
								<label className="text-sm font-medium">To Code (replacement)</label>
								<input
									type="text"
									value={toCode}
									onChange={e => setToCode(e.target.value)}
									placeholder="New code (optional)"
									className="border-input bg-background mt-1 flex h-10 w-full rounded-md border px-3 py-2 text-sm"
								/>
							</div>
							<div>
								<label className="text-sm font-medium">Notes</label>
								<input
									type="text"
									value={notes}
									onChange={e => setNotes(e.target.value)}
									placeholder="Reason for deprecation..."
									className="border-input bg-background mt-1 flex h-10 w-full rounded-md border px-3 py-2 text-sm"
								/>
							</div>
						</div>
						<button
							type="submit"
							disabled={createMutation.isPending}
							className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center rounded-md px-3 text-sm font-medium disabled:opacity-50"
						>
							{createMutation.isPending ? "Adding..." : "Add Mapping"}
						</button>
					</form>
				)}

				<select
					value={catalogType}
					onChange={e => setCatalogType(e.target.value)}
					className="border-input bg-background h-9 rounded-md border px-3 text-sm"
				>
					<option value="">All catalogs</option>
					{["icd10", "loinc", "rxnorm", "rvs", "snomed_ct"].map(t => (
						<option key={t} value={t}>{t}</option>
					))}
				</select>

				{mappings.length === 0 ? (
					<p className="text-muted-foreground text-sm">No deprecated code mappings configured.</p>
				) : (
					<div className="rounded-md border">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b">
									<th className="p-3 text-left font-medium">Catalog</th>
									<th className="p-3 text-left font-medium">From Code</th>
									<th className="p-3 text-left font-medium">To Code</th>
									<th className="p-3 text-left font-medium">Notes</th>
									<th className="p-3 text-left font-medium">Active</th>
									<th className="p-3 text-left font-medium">Actions</th>
								</tr>
							</thead>
							<tbody>
								{mappings.map((m: DeprecatedMappingRow) => (
									<tr key={m.id} className="border-b">
										<td className="p-3 font-mono">{m.catalogType}</td>
										<td className="p-3 font-mono">{m.fromCode}</td>
										<td className="p-3 font-mono">{m.toCode ?? "—"}</td>
										<td className="p-3 text-muted-foreground">{m.notes ?? "—"}</td>
										<td className="p-3">
											<span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${m.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
												{m.isActive ? "Active" : "Inactive"}
											</span>
										</td>
										<td className="p-3">
											{canEdit && (
												<button
													onClick={() => deleteMutation.mutate({ id: m.id })}
													disabled={deleteMutation.isPending}
													className="text-destructive hover:underline text-sm"
												>
													Delete
												</button>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			<div className="space-y-3 rounded-md border p-4">
				<h4 className="text-sm font-semibold">Toggle Code Active/Inactive</h4>
				<p className="text-muted-foreground text-xs">Use the code&rsquo;s UUID from the catalog to activate or deactivate it.</p>
				<form onSubmit={handleToggle} className="flex flex-wrap gap-3 items-end">
					<div>
						<label className="text-xs font-medium">Catalog</label>
						<select
							value={toggleCatalogType}
							onChange={e => setToggleCatalogType(e.target.value)}
							className="border-input bg-background mt-1 flex h-9 rounded-md border px-3 text-sm"
						>
							{["icd10", "loinc", "rxnorm", "rvs", "snomed_ct"].map(t => (
								<option key={t} value={t}>{t}</option>
							))}
						</select>
					</div>
					<div className="flex-1 min-w-[200px]">
						<label className="text-xs font-medium">Code UUID *</label>
						<input
							type="text"
							value={toggleCodeId}
							onChange={e => setToggleCodeId(e.target.value)}
							required
							placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
							className="border-input bg-background mt-1 flex h-9 w-full rounded-md border px-3 text-sm"
						/>
					</div>
					<div>
						<label className="text-xs font-medium">Set Active</label>
						<select
							value={String(toggleActive)}
							onChange={e => setToggleActive(e.target.value === "true")}
							className="border-input bg-background mt-1 flex h-9 rounded-md border px-3 text-sm"
						>
							<option value="true">Active</option>
							<option value="false">Inactive</option>
						</select>
					</div>
					{canEdit && (
						<button
							type="submit"
							disabled={setCodeActiveMutation.isPending}
							className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center rounded-md px-3 text-sm font-medium disabled:opacity-50"
						>
							{setCodeActiveMutation.isPending ? "Updating..." : "Apply"}
						</button>
					)}
				</form>
				{setCodeActiveMutation.isSuccess && (
					<p className="text-sm text-green-700">Code updated successfully.</p>
				)}
				{setCodeActiveMutation.isError && (
					<p className="text-destructive text-sm">{(setCodeActiveMutation.error as Error)?.message}</p>
				)}
			</div>
		</section>
	)
}

interface DeprecatedMappingRow {
	id: string
	catalogType: string
	fromCode: string
	toCode: string | null
	notes: string | null
	isActive: boolean
}

// ============================================================================
// Catalog Entry Editor — FORM-006
// ============================================================================

type CatalogTypeKey = "icd10" | "loinc" | "rxnorm" | "rvs" | "snomed_ct"

const CATALOG_TYPE_OPTIONS: { value: CatalogTypeKey; label: string }[] = [
	{ value: "icd10", label: "ICD-10" },
	{ value: "loinc", label: "LOINC" },
	{ value: "rxnorm", label: "RxNorm" },
	{ value: "rvs", label: "RVS" },
	{ value: "snomed_ct", label: "SNOMED CT" },
]

interface CatalogEntryRow {
	id: string
	catalogType: string
	isActive: boolean
	createdAt: string
	code?: string | null
	description?: string | null
	loincNum?: string | null
	longCommonName?: string | null
	rxcui?: string | null
	name?: string | null
	tty?: string | null
	rvsCode?: string | null
	procedureName?: string | null
	conceptId?: string | null
	fsn?: string | null
	preferredTerm?: string | null
}

function getEntryLabel(entry: CatalogEntryRow): string {
	if (entry.code) return `${entry.code} — ${entry.description ?? ""}`
	if (entry.loincNum) return `${entry.loincNum} — ${entry.longCommonName ?? ""}`
	if (entry.rxcui) return `${entry.rxcui} — ${entry.name ?? ""}`
	if (entry.rvsCode) return `${entry.rvsCode} — ${entry.procedureName ?? ""}`
	if (entry.conceptId) return `${entry.conceptId} — ${entry.fsn ?? ""}`
	return entry.id
}

function CatalogEntryEditorSection({ canEdit }: { canEdit: boolean }) {
	const [catalogType, setCatalogType] = useState<CatalogTypeKey>("icd10")
	const [search, setSearch] = useState("")
	const [debouncedSearch, setDebouncedSearch] = useState("")
	const [editingEntry, setEditingEntry] = useState<CatalogEntryRow | null>(null)
	const [showAddForm, setShowAddForm] = useState(false)

	// Debounce search
	const handleSearch = (v: string) => {
		setSearch(v)
		clearTimeout((handleSearch as { _t?: ReturnType<typeof setTimeout> })._t)
		;(handleSearch as { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(() => setDebouncedSearch(v), 400)
	}

	const { data, isLoading } = useAdminCatalogSearchQuery(
		{ catalogType, search: debouncedSearch || undefined },
		{ enabled: true }
	)
	const entries = ((data as { data?: CatalogEntryRow[] } | undefined)?.data ?? []) as CatalogEntryRow[]

	const createMutation = useCreateCatalogEntryMutation()
	const updateMutation = useUpdateCatalogEntryMutation()
	const deleteMutation = useDeleteCatalogEntryMutation()

	return (
		<section className="rounded-lg border p-4">
			<h3 className="mb-4 text-base font-semibold">Catalog Entry Editor</h3>

			<div className="mb-4 flex flex-wrap gap-3">
				<select
					value={catalogType}
					onChange={e => {
						setCatalogType(e.target.value as CatalogTypeKey)
						setSearch("")
						setDebouncedSearch("")
					}}
					className="rounded-md border px-3 py-2 text-sm"
				>
					{CATALOG_TYPE_OPTIONS.map(o => (
						<option key={o.value} value={o.value}>{o.label}</option>
					))}
				</select>
				<input
					type="search"
					placeholder="Search entries…"
					value={search}
					onChange={e => handleSearch(e.target.value)}
					className="min-w-[200px] flex-1 rounded-md border px-3 py-2 text-sm"
				/>
				{canEdit && (
					<button
						onClick={() => { setShowAddForm(v => !v); setEditingEntry(null) }}
						className="rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
					>
						+ Add Entry
					</button>
				)}
			</div>

			{/* Add form */}
			{canEdit && showAddForm && (
				<CatalogEntryAddForm
					catalogType={catalogType}
					onSubmit={async (values) => {
						await createMutation.mutateAsync(values as Parameters<typeof createMutation.mutateAsync>[0])
						setShowAddForm(false)
					}}
					isSubmitting={createMutation.isPending}
					error={createMutation.isError ? (createMutation.error as Error)?.message : undefined}
				/>
			)}

			{/* Edit inline form */}
			{canEdit && editingEntry && (
				<CatalogEntryEditForm
					entry={editingEntry}
					onSubmit={async (values) => {
						await updateMutation.mutateAsync(values as Parameters<typeof updateMutation.mutateAsync>[0])
						setEditingEntry(null)
					}}
					onCancel={() => setEditingEntry(null)}
					isSubmitting={updateMutation.isPending}
					error={updateMutation.isError ? (updateMutation.error as Error)?.message : undefined}
				/>
			)}

			{/* Results table */}
			{isLoading ? (
				<p className="text-muted-foreground py-4 text-sm">Loading…</p>
			) : entries.length === 0 ? (
				<p className="text-muted-foreground py-4 text-sm">No entries found.</p>
			) : (
				<div className="overflow-auto">
					<table className="w-full text-sm">
						<thead className="bg-muted/50">
							<tr>
								<th className="p-2 text-left font-medium">Entry</th>
								<th className="p-2 text-left font-medium">Status</th>
								{canEdit && <th className="p-2 text-left font-medium">Actions</th>}
							</tr>
						</thead>
						<tbody>
							{entries.map((entry) => (
								<tr key={entry.id} className="border-t">
									<td className="p-2">{getEntryLabel(entry)}</td>
									<td className="p-2">
										<span className={`rounded px-2 py-0.5 text-xs font-medium ${entry.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
											{entry.isActive ? "Active" : "Inactive"}
										</span>
									</td>
									{canEdit && (
										<td className="p-2">
											<div className="flex gap-2">
												<button
													onClick={() => { setEditingEntry(entry); setShowAddForm(false) }}
													className="text-primary text-xs underline"
												>
													Edit
												</button>
												<button
													onClick={() => {
														if (confirm("Delete this entry? This cannot be undone.")) {
															deleteMutation.mutate({ id: entry.id, catalogType: entry.catalogType as CatalogTypeKey })
														}
													}}
													className="text-destructive text-xs underline"
												>
													Delete
												</button>
											</div>
										</td>
									)}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</section>
	)
}

function CatalogEntryAddForm({
	catalogType,
	onSubmit,
	isSubmitting,
	error,
}: {
	catalogType: CatalogTypeKey
	onSubmit: (values: Record<string, unknown>) => void
	isSubmitting: boolean
	error?: string
}) {
	const [fields, setFields] = useState<Record<string, string>>({})
	const set = (k: string, v: string) => setFields(f => ({ ...f, [k]: v }))

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		onSubmit({ catalogType, ...fields })
	}

	const textField = (key: string, label: string, required = false) => (
		<div key={key} className="flex flex-col gap-1">
			<label className="text-xs font-medium">{label}{required && " *"}</label>
			<input
				type="text"
				value={fields[key] ?? ""}
				onChange={e => set(key, e.target.value)}
				required={required}
				className="rounded-md border px-2 py-1 text-sm"
			/>
		</div>
	)

	const fieldsByType: Record<CatalogTypeKey, React.ReactNode> = {
		icd10: <>{textField("code", "Code", true)}{textField("description", "Description", true)}{textField("category", "Category")}</>,
		loinc: <>{textField("loincNum", "LOINC Num", true)}{textField("longCommonName", "Long Common Name")}{textField("component", "Component")}{textField("property", "Property")}</>,
		rxnorm: <>{textField("rxcui", "RXCUI", true)}{textField("name", "Name", true)}{textField("tty", "TTY")}</>,
		rvs: <>{textField("rvsCode", "RVS Code", true)}{textField("procedureName", "Procedure Name", true)}{textField("category", "Category")}{textField("rvsValue", "RVS Value")}</>,
		snomed_ct: <>{textField("conceptId", "Concept ID", true)}{textField("fsn", "FSN", true)}{textField("preferredTerm", "Preferred Term", true)}{textField("semanticTag", "Semantic Tag")}</>,
	}

	return (
		<form onSubmit={handleSubmit} className="mb-4 rounded-md border bg-muted/20 p-4">
			<p className="mb-3 text-sm font-semibold">Add New {CATALOG_TYPE_OPTIONS.find(o => o.value === catalogType)?.label} Entry</p>
			<div className="grid grid-cols-2 gap-3 md:grid-cols-3">
				{fieldsByType[catalogType]}
			</div>
			{error && <p className="text-destructive mt-2 text-sm">{error}</p>}
			<div className="mt-3 flex gap-2">
				<button type="submit" disabled={isSubmitting} className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
					{isSubmitting ? "Saving…" : "Save Entry"}
				</button>
			</div>
		</form>
	)
}

function CatalogEntryEditForm({
	entry,
	onSubmit,
	onCancel,
	isSubmitting,
	error,
}: {
	entry: CatalogEntryRow
	onSubmit: (values: Record<string, unknown>) => void
	onCancel: () => void
	isSubmitting: boolean
	error?: string
}) {
	const [fields, setFields] = useState<Record<string, string | boolean>>({
		description: entry.description ?? "",
		longCommonName: entry.longCommonName ?? "",
		name: entry.name ?? "",
		procedureName: entry.procedureName ?? "",
		fsn: entry.fsn ?? "",
		preferredTerm: entry.preferredTerm ?? "",
		isActive: entry.isActive,
	})
	const set = (k: string, v: string | boolean) => setFields(f => ({ ...f, [k]: v }))

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		onSubmit({ id: entry.id, catalogType: entry.catalogType, ...fields })
	}

	return (
		<form onSubmit={handleSubmit} className="mb-4 rounded-md border bg-blue-50 p-4">
			<p className="mb-3 text-sm font-semibold">Edit Entry: {getEntryLabel(entry)}</p>
			<div className="grid grid-cols-2 gap-3 md:grid-cols-3">
				{["description", "longCommonName", "name", "procedureName", "fsn", "preferredTerm"].map(k => (
					<div key={k} className="flex flex-col gap-1">
						<label className="text-xs font-medium capitalize">{k}</label>
						<input
							type="text"
							value={(fields[k] as string) ?? ""}
							onChange={e => set(k, e.target.value)}
							className="rounded-md border px-2 py-1 text-sm"
						/>
					</div>
				))}
				<div className="flex items-center gap-2">
					<input type="checkbox" id="isActiveEdit" checked={Boolean(fields["isActive"])} onChange={e => set("isActive", e.target.checked)} />
					<label htmlFor="isActiveEdit" className="text-sm">Active</label>
				</div>
			</div>
			{error && <p className="text-destructive mt-2 text-sm">{error}</p>}
			<div className="mt-3 flex gap-2">
				<button type="submit" disabled={isSubmitting} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
					{isSubmitting ? "Saving…" : "Save Changes"}
				</button>
				<button type="button" onClick={onCancel} className="rounded-md border px-3 py-1.5 text-sm">Cancel</button>
			</div>
		</form>
	)
}

// ============================================================================
// Publish Version Section — FORM-006
// ============================================================================

interface CatalogVersionRow {
	id: string
	catalogType: string
	versionTag: string
	publishedByUserId: string
	publishedAt: string
	entryCount: number
	notes: string | null
}

function PublishVersionSection({ canEdit }: { canEdit: boolean }) {
	const [catalogType, setCatalogType] = useState<CatalogTypeKey>("icd10")
	const [versionTag, setVersionTag] = useState("")
	const [notes, setNotes] = useState("")

	const publishMutation = usePublishCatalogVersionMutation()
	const { data } = useCatalogVersionsQuery({ catalogType, limit: 10 })
	const versions = ((data as { data?: CatalogVersionRow[] } | undefined)?.data ?? []) as CatalogVersionRow[]

	const handlePublish = (e: React.FormEvent) => {
		e.preventDefault()
		publishMutation.mutate(
			{ catalogType, versionTag, notes: notes || undefined },
			{ onSuccess: () => { setVersionTag(""); setNotes("") } }
		)
	}

	return (
		<section className="rounded-lg border p-4">
			<h3 className="mb-4 text-base font-semibold">Publish Catalog Version</h3>

			{canEdit && (
				<form onSubmit={handlePublish} className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
					<div className="flex flex-col gap-1">
						<label className="text-xs font-medium">Catalog Type *</label>
						<select
							value={catalogType}
							onChange={e => setCatalogType(e.target.value as CatalogTypeKey)}
							className="rounded-md border px-3 py-2 text-sm"
						>
							{CATALOG_TYPE_OPTIONS.map(o => (
								<option key={o.value} value={o.value}>{o.label}</option>
							))}
						</select>
					</div>
					<div className="flex flex-col gap-1">
						<label className="text-xs font-medium">Version Tag *</label>
						<input
							type="text"
							value={versionTag}
							onChange={e => setVersionTag(e.target.value)}
							placeholder="e.g. 2024-Q4"
							required
							className="rounded-md border px-3 py-2 text-sm"
						/>
					</div>
					<div className="flex flex-col gap-1 md:col-span-3">
						<label className="text-xs font-medium">Release Notes</label>
						<textarea
							value={notes}
							onChange={e => setNotes(e.target.value)}
							rows={2}
							className="rounded-md border px-3 py-2 text-sm"
						/>
					</div>
					<div>
						<button
							type="submit"
							disabled={publishMutation.isPending || !versionTag}
							className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
						>
							{publishMutation.isPending ? "Publishing…" : "Publish Version"}
						</button>
					</div>
					{publishMutation.isSuccess && <p className="text-sm text-green-700 md:col-span-2">Version published.</p>}
					{publishMutation.isError && <p className="text-destructive text-sm md:col-span-2">{(publishMutation.error as Error)?.message}</p>}
				</form>
			)}

			{/* Version history */}
			<h4 className="mb-2 text-sm font-medium">Recent Versions — {CATALOG_TYPE_OPTIONS.find(o => o.value === catalogType)?.label}</h4>
			{versions.length === 0 ? (
				<p className="text-muted-foreground text-sm">No versions published yet.</p>
			) : (
				<table className="w-full text-sm">
					<thead className="bg-muted/50">
						<tr>
							<th className="p-2 text-left font-medium">Tag</th>
							<th className="p-2 text-left font-medium">Published At</th>
							<th className="p-2 text-left font-medium">Entries</th>
							<th className="p-2 text-left font-medium">Notes</th>
						</tr>
					</thead>
					<tbody>
						{versions.map(v => (
							<tr key={v.id} className="border-t">
								<td className="p-2 font-mono">{v.versionTag}</td>
								<td className="p-2">{new Date(v.publishedAt).toLocaleString()}</td>
								<td className="p-2">{v.entryCount.toLocaleString()}</td>
								<td className="p-2 text-muted-foreground">{v.notes ?? "—"}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</section>
	)
}
