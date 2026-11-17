"use client"

import { useState } from "react"

import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	useIcd10ProblemSearchQuery,
	type Icd10SearchResult,
} from "@/features/problems-allergies/api/problems-allergies.hooks"

export interface ProblemCodeValue {
	icd10Code: string
	icd10Display: string
}

interface ProblemCodeFieldsProps {
	inputId: string
	value: ProblemCodeValue
	onChange: (value: ProblemCodeValue) => void
	icd10Search: string
	onIcd10SearchChange: (value: string) => void
	onDescriptionSuggestion?: (description: string) => void
	disabledIcd10Codes?: Set<string>
}

export function ProblemCodeFields({
	inputId,
	value,
	onChange,
	icd10Search,
	onIcd10SearchChange,
	onDescriptionSuggestion,
	disabledIcd10Codes = new Set(),
}: ProblemCodeFieldsProps) {
	const [icd10Open, setIcd10Open] = useState(false)
	const icd10Query = useIcd10ProblemSearchQuery({
		search: icd10Search,
		limit: 8,
		includeEmptySearch: icd10Open,
	})
	const icd10Results = icd10Query.data?.data ?? []
	const canShowIcd10Results = icd10Open

	function closeIcd10Search() {
		setIcd10Open(false)
		onIcd10SearchChange("")
	}

	function closeIcd10SearchAfterSelectionChance() {
		window.setTimeout(closeIcd10Search, 100)
	}

	function clearIcd10() {
		onChange({ ...value, icd10Code: "", icd10Display: "" })
		onIcd10SearchChange("")
	}

	function selectIcd10(result: Icd10SearchResult) {
		if (disabledIcd10Codes.has(result.code)) return
		onChange({
			...value,
			icd10Code: result.code,
			icd10Display: result.description,
		})
		onDescriptionSuggestion?.(result.description)
		onIcd10SearchChange("")
		setIcd10Open(false)
	}

	return (
		<div className="grid gap-4">
			<div className="space-y-2">
				<div className="flex items-end justify-between gap-3">
					<div className="space-y-1">
						<Label htmlFor={inputId}>ICD-10 Code</Label>
						<p className="text-muted-foreground text-xs">
							Optional. Select one ICD-10 code when it matches the diagnosis.
						</p>
					</div>
					{value.icd10Code && (
						<span className="text-muted-foreground shrink-0 text-xs">Selected</span>
					)}
				</div>
				<div className="relative">
					<Input
						id={inputId}
						value={icd10Search}
						onChange={event => {
							onIcd10SearchChange(event.target.value)
							setIcd10Open(true)
						}}
						onFocus={() => setIcd10Open(true)}
						onBlur={closeIcd10SearchAfterSelectionChance}
						onKeyDown={event => {
							if (event.key === "Escape") closeIcd10Search()
							const firstSelectable = icd10Results.find(
								result => !disabledIcd10Codes.has(result.code)
							)
							if (event.key === "Enter" && firstSelectable) {
								event.preventDefault()
								selectIcd10(firstSelectable)
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
								icd10Results.map(result => {
									const disabled = disabledIcd10Codes.has(result.code)
									return (
										<button
											key={result.id}
											type="button"
											disabled={disabled}
											className="hover:bg-muted focus:bg-muted disabled:text-muted-foreground block w-full rounded-sm px-3 py-2 text-left outline-hidden disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-transparent"
											onMouseDown={event => event.preventDefault()}
											onClick={() => selectIcd10(result)}
										>
											<span className="flex items-center justify-between gap-2">
												<span className="font-mono text-xs font-semibold">{result.code}</span>
												{disabled && <span className="text-xs">Already active</span>}
											</span>
											<span className="block">{result.description}</span>
											{result.category && (
												<span className="text-muted-foreground block text-xs">
													{result.category}
												</span>
											)}
										</button>
									)
								})
							) : (
								<div className="text-muted-foreground px-3 py-3">
									No ICD-10 matches. Save the diagnosis as text-only if needed.
								</div>
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
		</div>
	)
}
