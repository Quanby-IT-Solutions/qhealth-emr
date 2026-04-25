"use client"

import { useState } from "react"

import {
	useIcd10SearchQuery,
	useLoincSearchQuery,
	useRxnormSearchQuery,
	useRvsSearchQuery,
	useSnomedCtSearchQuery,
} from "@/features/formulary/api/formulary.hooks"

type CodeSetType = "icd10" | "loinc" | "rxnorm" | "rvs" | "snomedCt"

const CODE_SET_LABELS: Record<CodeSetType, string> = {
	icd10: "ICD-10",
	loinc: "LOINC",
	rxnorm: "RxNorm",
	rvs: "RVS",
	snomedCt: "SNOMED CT",
}

export function CodeSetBrowser() {
	const [activeTab, setActiveTab] = useState<CodeSetType>("icd10")
	const [search, setSearch] = useState("")
	const [page, setPage] = useState(1)

	return (
		<div className="space-y-4">
			<div className="flex gap-1 rounded-lg border p-1">
				{(Object.keys(CODE_SET_LABELS) as CodeSetType[]).map(tab => (
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
