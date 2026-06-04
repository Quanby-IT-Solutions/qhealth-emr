"use client"

import { useState } from "react"

import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Skeleton } from "@/core/components/ui/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"

const CODE_PAGE_SIZE = 100

interface CodeEntry {
	code: string
	display: string
	deprecated: boolean
	mappedTo?: string
}

interface CodeSetPageProps {
	codeSystem: string
}

const CODE_SYSTEM_LABELS: Record<string, string> = {
	icd10: "ICD-10",
	snomed: "SNOMED CT",
	loinc: "LOINC",
	rxnorm: "RxNorm",
	rvs: "RVS",
}

export function CodeSetPage({ codeSystem }: CodeSetPageProps) {
	const [search, setSearch] = useState("")
	const [showDeprecated, setShowDeprecated] = useState(false)
	const [page, setPage] = useState(1)

	// Placeholder — wires to terminology.codes.search when ADM-BE-08 is implemented
	const codes: CodeEntry[] = []
	const isLoading = false

	const systemLabel = CODE_SYSTEM_LABELS[codeSystem] ?? codeSystem

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-3">
				<Input
					placeholder={`Search ${systemLabel} codes...`}
					value={search}
					onChange={e => setSearch(e.target.value)}
					className="max-w-sm"
				/>
				<label className="flex cursor-pointer items-center gap-2 text-sm">
					<input
						type="checkbox"
						checked={showDeprecated}
						onChange={e => setShowDeprecated(e.target.checked)}
						className="rounded"
					/>
					Show deprecated
				</label>
			</div>

			{isLoading && <Skeleton className="h-48 w-full" />}

			{!isLoading && codes.length === 0 && (
				<p className="text-muted-foreground py-8 text-center text-sm">
					No codes loaded yet. Import a CSV or FHIR ValueSet to populate.
				</p>
			)}

			{!isLoading &&
				codes.length > 0 &&
				(() => {
					const filtered = codes
						.filter(c => showDeprecated || !c.deprecated)
						.filter(
							c =>
								!search ||
								c.code.includes(search) ||
								c.display.toLowerCase().includes(search.toLowerCase())
						)
					const totalPages = Math.max(1, Math.ceil(filtered.length / CODE_PAGE_SIZE))
					const visible = filtered.slice((page - 1) * CODE_PAGE_SIZE, page * CODE_PAGE_SIZE)
					return (
						<>
							{filtered.length > CODE_PAGE_SIZE && (
								<p className="text-muted-foreground text-xs">
									Showing {(page - 1) * CODE_PAGE_SIZE + 1}–
									{Math.min(page * CODE_PAGE_SIZE, filtered.length)} of {filtered.length} codes
								</p>
							)}
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Code</TableHead>
										<TableHead>Display</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Mapped to</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{visible.map(code => (
										<TableRow key={code.code}>
											<TableCell className="font-mono text-sm">{code.code}</TableCell>
											<TableCell
												className={code.deprecated ? "text-muted-foreground line-through" : ""}
											>
												{code.display}
											</TableCell>
											<TableCell>
												{code.deprecated ? (
													<span className="text-xs text-amber-600">Deprecated</span>
												) : (
													<span className="text-xs text-emerald-600">Active</span>
												)}
											</TableCell>
											<TableCell className="text-muted-foreground text-sm">
												{code.mappedTo ?? "—"}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
							{totalPages > 1 && (
								<div className="flex items-center justify-between pt-2">
									<p className="text-muted-foreground text-xs">
										Page {page} of {totalPages}
									</p>
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											disabled={page <= 1}
											onClick={() => setPage(p => p - 1)}
										>
											Previous
										</Button>
										<Button
											variant="outline"
											size="sm"
											disabled={page >= totalPages}
											onClick={() => setPage(p => p + 1)}
										>
											Next
										</Button>
									</div>
								</div>
							)}
						</>
					)
				})()}
		</div>
	)
}
