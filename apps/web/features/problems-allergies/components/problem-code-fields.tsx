"use client"

import { useState } from "react"

import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	useIcd10ProblemSearchQuery,
	useSnomedCtProblemSearchQuery,
	type Icd10SearchResult,
	type SnomedCtSearchResult,
} from "@/features/problems-allergies/api/problems-allergies.hooks"

export interface ProblemCodeValue {
	icd10Code: string
	icd10Display: string
	snomedCode: string
	snomedDisplay: string
}

interface ProblemCodeFieldsProps {
	value: ProblemCodeValue
	onChange: (value: ProblemCodeValue) => void
	icd10Search: string
	onIcd10SearchChange: (value: string) => void
	snomedSearch: string
	onSnomedSearchChange: (value: string) => void
	onDescriptionSuggestion?: (description: string) => void
}

export function ProblemCodeFields({
	value,
	onChange,
	icd10Search,
	onIcd10SearchChange,
	snomedSearch,
	onSnomedSearchChange,
	onDescriptionSuggestion,
}: ProblemCodeFieldsProps) {
	const [icd10Open, setIcd10Open] = useState(false)
	const [snomedOpen, setSnomedOpen] = useState(false)
	const icd10Query = useIcd10ProblemSearchQuery({
		search: icd10Search,
		limit: 8,
		includeEmptySearch: icd10Open,
	})
	const snomedQuery = useSnomedCtProblemSearchQuery({
		search: snomedSearch,
		limit: 8,
		includeEmptySearch: snomedOpen,
	})
	const icd10Results = icd10Query.data?.data ?? []
	const snomedResults = snomedQuery.data?.data ?? []
	const canShowIcd10Results = icd10Open
	const canShowSnomedResults = snomedOpen

	function closeIcd10Search() {
		setIcd10Open(false)
		onIcd10SearchChange("")
	}

	function closeSnomedSearch() {
		setSnomedOpen(false)
		onSnomedSearchChange("")
	}

	function closeIcd10SearchAfterSelectionChance() {
		window.setTimeout(closeIcd10Search, 100)
	}

	function closeSnomedSearchAfterSelectionChance() {
		window.setTimeout(closeSnomedSearch, 100)
	}

	function clearIcd10() {
		onChange({ ...value, icd10Code: "", icd10Display: "" })
		onIcd10SearchChange("")
	}

	function clearSnomed() {
		onChange({ ...value, snomedCode: "", snomedDisplay: "" })
		onSnomedSearchChange("")
	}

	function selectIcd10(result: Icd10SearchResult) {
		onChange({
			...value,
			icd10Code: result.code,
			icd10Display: result.description,
		})
		onDescriptionSuggestion?.(result.description)
		onIcd10SearchChange("")
		setIcd10Open(false)
	}

	function selectSnomed(result: SnomedCtSearchResult) {
		onChange({
			...value,
			snomedCode: result.conceptId,
			snomedDisplay: result.preferredTerm,
		})
		onDescriptionSuggestion?.(result.preferredTerm)
		onSnomedSearchChange("")
		setSnomedOpen(false)
	}

	return (
		<div className="grid gap-4">
			<div className="space-y-2">
				<div className="flex items-end justify-between gap-3">
					<div className="space-y-1">
						<Label>ICD-10 Code</Label>
						<p className="text-muted-foreground text-xs">Select one ICD-10 code for this problem.</p>
					</div>
					{value.icd10Code && (
						<span className="text-muted-foreground shrink-0 text-xs">Selected</span>
					)}
				</div>
				<div className="relative">
					<Input
						value={icd10Search}
						onChange={event => {
							onIcd10SearchChange(event.target.value)
							setIcd10Open(true)
						}}
						onFocus={() => setIcd10Open(true)}
						onBlur={closeIcd10SearchAfterSelectionChance}
						onKeyDown={event => {
							if (event.key === "Escape") closeIcd10Search()
							if (event.key === "Enter" && icd10Results[0]) {
								event.preventDefault()
								selectIcd10(icd10Results[0])
							}
						}}
						placeholder={
							value.icd10Code
								? "Search to replace selected ICD-10"
								: "Search ICD-10 by code or diagnosis"
						}
						aria-label="Search ICD-10 codes"
						aria-expanded={canShowIcd10Results}
						autoComplete="off"
					/>
					{canShowIcd10Results && (
						<div className="bg-popover text-popover-foreground ring-foreground/10 absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border p-1 text-sm shadow-md ring-1">
							{icd10Query.isFetching ? (
								<div className="text-muted-foreground px-3 py-3">Searching ICD-10...</div>
							) : icd10Results.length ? (
								icd10Results.map(result => (
									<button
										key={result.id}
										type="button"
										className="hover:bg-muted focus:bg-muted block w-full rounded-sm px-3 py-2 text-left outline-hidden"
										onMouseDown={event => event.preventDefault()}
										onClick={() => selectIcd10(result)}
									>
										<span className="block font-mono text-xs font-semibold">{result.code}</span>
										<span className="block">{result.description}</span>
										{result.category && (
											<span className="text-muted-foreground block text-xs">{result.category}</span>
										)}
									</button>
								))
							) : (
								<div className="text-muted-foreground px-3 py-3">No ICD-10 matches</div>
							)}
						</div>
					)}
				</div>
				{value.icd10Code && (
					<div className="bg-primary/5 border-primary/20 flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm">
						<p className="min-w-0">
							<span className="font-mono text-xs font-semibold">{value.icd10Code}</span>
							<span className="text-muted-foreground"> - {value.icd10Display}</span>
						</p>
						<Button
							type="button"
							size="sm"
							variant="ghost"
							className="h-6 shrink-0 px-2 text-xs"
							onClick={clearIcd10}
						>
							Clear
						</Button>
					</div>
				)}
			</div>

			<div className="space-y-2">
				<div className="flex items-end justify-between gap-3">
					<div className="space-y-1">
						<Label>SNOMED CT Code</Label>
						<p className="text-muted-foreground text-xs">Select one SNOMED CT concept for this problem.</p>
					</div>
					{value.snomedCode && (
						<span className="text-muted-foreground shrink-0 text-xs">Selected</span>
					)}
				</div>
				<div className="relative">
					<Input
						value={snomedSearch}
						onChange={event => {
							onSnomedSearchChange(event.target.value)
							setSnomedOpen(true)
						}}
						onFocus={() => setSnomedOpen(true)}
						onBlur={closeSnomedSearchAfterSelectionChance}
						onKeyDown={event => {
							if (event.key === "Escape") closeSnomedSearch()
							if (event.key === "Enter" && snomedResults[0]) {
								event.preventDefault()
								selectSnomed(snomedResults[0])
							}
						}}
						placeholder={
							value.snomedCode
								? "Search to replace selected SNOMED CT"
								: "Search SNOMED CT by code or term"
						}
						aria-label="Search SNOMED CT codes"
						aria-expanded={canShowSnomedResults}
						autoComplete="off"
					/>
					{canShowSnomedResults && (
						<div className="bg-popover text-popover-foreground ring-foreground/10 absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border p-1 text-sm shadow-md ring-1">
							{snomedQuery.isFetching ? (
								<div className="text-muted-foreground px-3 py-3">Searching SNOMED CT...</div>
							) : snomedResults.length ? (
								snomedResults.map(result => (
									<button
										key={result.id}
										type="button"
										className="hover:bg-muted focus:bg-muted block w-full rounded-sm px-3 py-2 text-left outline-hidden"
										onMouseDown={event => event.preventDefault()}
										onClick={() => selectSnomed(result)}
									>
										<span className="block font-mono text-xs font-semibold">
											{result.conceptId}
										</span>
										<span className="block">{result.preferredTerm}</span>
										{result.semanticTag && (
											<span className="text-muted-foreground block text-xs">
												{result.semanticTag}
											</span>
										)}
									</button>
								))
							) : (
								<div className="text-muted-foreground px-3 py-3">No SNOMED CT matches</div>
							)}
						</div>
					)}
				</div>
				{value.snomedCode && (
					<div className="bg-primary/5 border-primary/20 flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm">
						<p className="min-w-0">
							<span className="font-mono text-xs font-semibold">{value.snomedCode}</span>
							<span className="text-muted-foreground"> - {value.snomedDisplay}</span>
						</p>
						<Button
							type="button"
							size="sm"
							variant="ghost"
							className="h-6 shrink-0 px-2 text-xs"
							onClick={clearSnomed}
						>
							Clear
						</Button>
					</div>
				)}
			</div>
		</div>
	)
}
