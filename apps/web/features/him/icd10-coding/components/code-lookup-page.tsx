"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { useDebounce } from "@/core/hooks/use-debounce"
import { EmptyState, ErrorState } from "@/features/admin/components/state-views"
import { TableToolbar } from "@/features/admin/components/table-toolbar"

import {
	useIcd10LookupQuery,
	useTerminologyReplacementCodes,
	useTerminologySystemsQuery,
} from "../api/coding.hooks"

interface CodeLookupSelection {
	code: string
	display: string
}

interface CodeLookupPageProps {
	onSelectCode?: (selection: CodeLookupSelection) => void
}

export function CodeLookupPage({ onSelectCode }: CodeLookupPageProps) {
	const router = useRouter()
	const searchParams = useSearchParams()
	const returnTo = searchParams.get("returnTo") ?? ""

	const [query, setQuery] = useState("")
	const debounced = useDebounce(query, 250)
	const { data: systems } = useTerminologySystemsQuery()
	const { data, isLoading, isError, refetch, error } = useIcd10LookupQuery(debounced)

	const icd10Configured = !!systems?.some(system => system.name.toLowerCase().includes("icd-10"))
	const results = useMemo(() => data?.data ?? [], [data?.data])
	const replacementIds = useMemo(
		() => [
			...new Set(
				results
					.map(row => row.replacedByCodeId)
					.filter((codeId): codeId is string => Boolean(codeId))
			),
		],
		[results]
	)
	const replacementQueries = useTerminologyReplacementCodes(replacementIds)
	const replacementMap = useMemo(
		() =>
			new Map(
				replacementIds.map((codeId, index) => [codeId, replacementQueries[index]?.data ?? null])
			),
		[replacementIds, replacementQueries]
	)

	const handleAdd = (selection: CodeLookupSelection) => {
		if (onSelectCode) {
			onSelectCode(selection)
			return
		}

		if (returnTo) {
			const url = new URL(returnTo, window.location.origin)
			url.searchParams.set("addCode", selection.code)
			url.searchParams.set("addDisplay", selection.display)
			router.push(`${url.pathname}${url.search}`)
		}
	}

	return (
		<div className="max-w-3xl space-y-3 px-4 py-3">
			<TableToolbar
				title="ICD-10 Code Lookup"
				description="Prefix search (e.g. I10) or full-text (e.g. hypertension)."
			/>

			<Input
				value={query}
				onChange={e => setQuery(e.target.value)}
				placeholder="Search ICD-10…"
				autoFocus
				aria-label="Search ICD-10 codes"
				className="h-9"
			/>

			{!icd10Configured && systems && (
				<EmptyState
					title="ICD-10 terminology is not configured"
					description="Add or publish the ICD-10 code system before using HIM coding lookup."
				/>
			)}

			{debounced.trim() === "" && (
				<EmptyState title="Start typing to search" description="Search debounced 250ms." />
			)}

			{isError && <ErrorState error={error} retry={refetch} />}

			{isLoading && debounced.trim().length >= 2 && (
				<p className="text-muted-foreground text-sm">Searching terminology…</p>
			)}

			{debounced.trim() !== "" && results.length === 0 && (
				<EmptyState title={`No matches for "${debounced}"`} />
			)}

			{results.length > 0 && (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-32">Code</TableHead>
							<TableHead>Display</TableHead>
							<TableHead className="w-32 text-right">Action</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{results.map(row => {
							const replacement = row.replacedByCodeId
								? replacementMap.get(row.replacedByCodeId)
								: undefined

							return (
								<TableRow key={row.code}>
									<TableCell className="font-mono text-xs">
										<span className={row.isDeprecated ? "text-muted-foreground line-through" : ""}>
											{row.code}
										</span>
										{row.isDeprecated && (
											<Badge variant="destructive" className="ml-2 text-[10px]">
												deprecated
											</Badge>
										)}
									</TableCell>
									<TableCell className="text-xs">
										{row.displayName}
										{row.isDeprecated && replacement && (
											<button
												type="button"
												onClick={() => {
													if (replacement) {
														handleAdd({ code: replacement.code, display: replacement.displayName })
													}
												}}
												className="text-primary ml-2 text-[10px] underline"
											>
												Use {replacement.code} instead
											</button>
										)}
									</TableCell>
									<TableCell className="text-right">
										<Button
											size="sm"
											variant="ghost"
											onClick={() => handleAdd({ code: row.code, display: row.displayName })}
											disabled={(!returnTo && !onSelectCode) || row.isDeprecated}
										>
											{onSelectCode ? "Use code" : "Add"}
										</Button>
									</TableCell>
								</TableRow>
							)
						})}
					</TableBody>
				</Table>
			)}

			{!returnTo && !onSelectCode && (
				<p className="text-muted-foreground text-xs">
					Open from an encounter coding page to add codes back into the editor.
				</p>
			)}
		</div>
	)
}
