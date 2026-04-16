"use client"

import { useEffect, useRef, useState } from "react"

import { Search01FreeIcons } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/core/lib/utils"

import { Input } from "./ui/input"
import { Skeleton } from "./ui/skeleton"

interface Icd10Result {
	code: string
	description: string
}

interface Icd10CodePickerProps {
	value?: string
	onChange: (code: string, description: string) => void
	placeholder?: string
	className?: string
	disabled?: boolean
}

// Static subset of common ICD-10 codes for offline filtering.
// In production, replace with an API call to a full ICD-10 coding service.
const COMMON_ICD10_CODES: Icd10Result[] = [
	{ code: "J00", description: "Acute nasopharyngitis (common cold)" },
	{ code: "J06.9", description: "Acute upper respiratory infection, unspecified" },
	{ code: "J18.9", description: "Pneumonia, unspecified organism" },
	{ code: "A09", description: "Other and unspecified gastroenteritis and colitis" },
	{ code: "I10", description: "Essential (primary) hypertension" },
	{ code: "E11.9", description: "Type 2 diabetes mellitus without complications" },
	{ code: "K29.70", description: "Gastritis, unspecified, without bleeding" },
	{ code: "N39.0", description: "Urinary tract infection, site not specified" },
	{ code: "M54.5", description: "Low back pain" },
	{ code: "R50.9", description: "Fever, unspecified" },
	{ code: "J45.909", description: "Unspecified asthma, uncomplicated" },
	{ code: "I25.10", description: "Atherosclerotic heart disease of native coronary artery" },
	{ code: "Z23", description: "Encounter for immunization" },
	{ code: "O80", description: "Encounter for full-term uncomplicated delivery" },
	{ code: "P07.30", description: "Preterm newborn, unspecified weeks of gestation" },
	{ code: "B34.9", description: "Viral infection, unspecified" },
	{ code: "K92.1", description: "Melena" },
	{ code: "R05", description: "Cough" },
	{ code: "R06.00", description: "Dyspnoea, unspecified" },
	{ code: "R51", description: "Headache" },
]

function searchCodes(query: string): Icd10Result[] {
	const q = query.trim().toLowerCase()
	if (!q) return []
	return COMMON_ICD10_CODES.filter(
		item =>
			item.code.toLowerCase().includes(q) ||
			item.description.toLowerCase().includes(q),
	).slice(0, 10)
}

export function Icd10CodePicker({
	value,
	onChange,
	placeholder = "Search ICD-10 code or diagnosis…",
	className,
	disabled = false,
}: Icd10CodePickerProps) {
	const [query, setQuery] = useState("")
	const [results, setResults] = useState<Icd10Result[]>([])
	const [open, setOpen] = useState(false)
	const [loading, setLoading] = useState(false)
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const containerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		if (!query) {
			setResults([])
			setLoading(false)
			return
		}
		setLoading(true)
		debounceRef.current = setTimeout(() => {
			setResults(searchCodes(query))
			setLoading(false)
		}, 300)
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current)
		}
	}, [query])

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setOpen(false)
			}
		}
		document.addEventListener("mousedown", handleClickOutside)
		return () => document.removeEventListener("mousedown", handleClickOutside)
	}, [])

	const handleSelect = (item: Icd10Result) => {
		onChange(item.code, item.description)
		setQuery(`${item.code} – ${item.description}`)
		setOpen(false)
		setResults([])
	}

	return (
		<div ref={containerRef} className={cn("relative", className)}>
			<div className="relative">
				<HugeiconsIcon
					icon={Search01FreeIcons}
					className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
				/>
				<Input
					value={query}
					onChange={e => {
						setQuery(e.target.value)
						setOpen(true)
					}}
					onFocus={() => setOpen(true)}
					placeholder={placeholder}
					disabled={disabled}
					className="pl-9"
					aria-label="ICD-10 code search"
					aria-expanded={open}
					aria-haspopup="listbox"
					autoComplete="off"
				/>
			</div>
			{value && !open && (
				<p className="text-muted-foreground mt-1 text-xs">
					Selected: <span className="font-mono font-semibold text-foreground">{value}</span>
				</p>
			)}
			{open && (query.length > 0) && (
				<div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
					{loading ? (
						<div className="space-y-1 p-2">
							<Skeleton className="h-8 w-full" />
							<Skeleton className="h-8 w-full" />
							<Skeleton className="h-8 w-4/5" />
						</div>
					) : results.length === 0 ? (
						<p className="text-muted-foreground px-3 py-2 text-sm">No codes found</p>
					) : (
						<ul role="listbox" className="max-h-60 overflow-y-auto py-1">
							{results.map(item => (
								<li
									key={item.code}
									role="option"
									aria-selected={item.code === value}
									className={cn(
										"flex cursor-pointer items-start gap-2 px-3 py-2 text-sm hover:bg-accent",
										item.code === value && "bg-accent",
									)}
									onMouseDown={() => handleSelect(item)}
								>
									<span className="mt-0.5 shrink-0 font-mono text-xs font-semibold text-primary">
										{item.code}
									</span>
									<span className="text-foreground">{item.description}</span>
								</li>
							))}
						</ul>
					)}
				</div>
			)}
		</div>
	)
}
