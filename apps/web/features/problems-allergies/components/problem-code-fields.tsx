"use client"

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
	const icd10Query = useIcd10ProblemSearchQuery({ search: icd10Search, limit: 8 })
	const snomedQuery = useSnomedCtProblemSearchQuery({ search: snomedSearch, limit: 8 })

	function selectIcd10(result: Icd10SearchResult) {
		onChange({
			...value,
			icd10Code: result.code,
			icd10Display: result.description,
		})
		onDescriptionSuggestion?.(result.description)
		onIcd10SearchChange("")
	}

	function selectSnomed(result: SnomedCtSearchResult) {
		onChange({
			...value,
			snomedCode: result.conceptId,
			snomedDisplay: result.preferredTerm,
		})
		onDescriptionSuggestion?.(result.preferredTerm)
		onSnomedSearchChange("")
	}

	return (
		<div className="grid gap-4 sm:grid-cols-2">
			<div className="space-y-2">
				<Label>ICD-10 Code</Label>
				<Input
					placeholder="Search ICD-10"
					value={icd10Search}
					onChange={event => onIcd10SearchChange(event.target.value)}
				/>
				{value.icd10Code && (
					<div className="bg-muted/40 flex items-start justify-between gap-2 rounded-md border px-3 py-2 text-xs">
						<p>
							<span className="font-mono font-medium">{value.icd10Code}</span>
							<span className="text-muted-foreground"> - {value.icd10Display}</span>
						</p>
						<Button
							type="button"
							size="sm"
							variant="ghost"
							className="h-6 px-2 text-xs"
							onClick={() => onChange({ ...value, icd10Code: "", icd10Display: "" })}
						>
							Clear
						</Button>
					</div>
				)}
				{icd10Query.isFetching && (
					<p className="text-muted-foreground text-xs">Searching ICD-10...</p>
				)}
				{icd10Query.data?.data.length ? (
					<div className="bg-background max-h-44 overflow-y-auto rounded-md border">
						{icd10Query.data.data.map(result => (
							<button
								key={result.id}
								type="button"
								className="hover:bg-muted block w-full px-3 py-2 text-left text-sm"
								onClick={() => selectIcd10(result)}
							>
								<span className="font-mono text-xs">{result.code}</span>
								<span className="text-muted-foreground"> {result.description}</span>
							</button>
						))}
					</div>
				) : null}
			</div>

			<div className="space-y-2">
				<Label>SNOMED CT Code</Label>
				<Input
					placeholder="Search SNOMED CT"
					value={snomedSearch}
					onChange={event => onSnomedSearchChange(event.target.value)}
				/>
				{value.snomedCode && (
					<div className="bg-muted/40 flex items-start justify-between gap-2 rounded-md border px-3 py-2 text-xs">
						<p>
							<span className="font-mono font-medium">{value.snomedCode}</span>
							<span className="text-muted-foreground"> - {value.snomedDisplay}</span>
						</p>
						<Button
							type="button"
							size="sm"
							variant="ghost"
							className="h-6 px-2 text-xs"
							onClick={() => onChange({ ...value, snomedCode: "", snomedDisplay: "" })}
						>
							Clear
						</Button>
					</div>
				)}
				{snomedQuery.isFetching && (
					<p className="text-muted-foreground text-xs">Searching SNOMED CT...</p>
				)}
				{snomedQuery.data?.data.length ? (
					<div className="bg-background max-h-44 overflow-y-auto rounded-md border">
						{snomedQuery.data.data.map(result => (
							<button
								key={result.id}
								type="button"
								className="hover:bg-muted block w-full px-3 py-2 text-left text-sm"
								onClick={() => selectSnomed(result)}
							>
								<span className="font-mono text-xs">{result.conceptId}</span>
								<span className="text-muted-foreground"> {result.preferredTerm}</span>
							</button>
						))}
					</div>
				) : null}
			</div>
		</div>
	)
}
