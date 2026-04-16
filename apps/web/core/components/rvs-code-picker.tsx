"use client"

import { useEffect, useRef, useState } from "react"

import { Search01FreeIcons } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/core/lib/utils"

import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Skeleton } from "./ui/skeleton"

interface RvsCode {
	code: string
	description: string
	category: string
	rvu: number
}

interface RvsCodePickerProps {
	value?: string
	onChange: (code: string, description: string, rvu: number) => void
	category?: string
	placeholder?: string
	className?: string
	disabled?: boolean
}

// Common Philippine RVS (Relative Value Scale) procedure codes.
// Replace with API-backed search against the full schedule.
const RVS_CODES: RvsCode[] = [
	// Surgical
	{ code: "47.0", description: "Appendectomy", category: "surgical", rvu: 12.5 },
	{ code: "53.0", description: "Inguinal hernia repair (unilateral)", category: "surgical", rvu: 10.0 },
	{ code: "39.0", description: "Cholecystectomy (open)", category: "surgical", rvu: 14.0 },
	{ code: "39.1", description: "Laparoscopic cholecystectomy", category: "surgical", rvu: 13.0 },
	{ code: "80.0", description: "Caesarean section", category: "ob-gyn", rvu: 18.0 },
	{ code: "12.0", description: "Thyroidectomy (total)", category: "surgical", rvu: 20.0 },
	{ code: "85.4", description: "Mastectomy (radical)", category: "surgical", rvu: 22.5 },
	// Medical procedures
	{ code: "88.72", description: "CT scan (head/brain)", category: "radiology", rvu: 8.0 },
	{ code: "88.74", description: "CT scan (abdomen)", category: "radiology", rvu: 9.5 },
	{ code: "88.92", description: "MRI (brain)", category: "radiology", rvu: 12.0 },
	{ code: "87.44", description: "Chest X-ray (PA/Lateral)", category: "radiology", rvu: 2.5 },
	{ code: "93.64", description: "Coronary angioplasty (PTCA)", category: "cardiology", rvu: 30.0 },
	// Lab
	{ code: "90.59", description: "Complete blood count (CBC)", category: "laboratory", rvu: 1.0 },
	{ code: "90.50", description: "Blood chemistry panel", category: "laboratory", rvu: 1.5 },
	// OB
	{ code: "72.0", description: "Normal spontaneous delivery (NSD)", category: "ob-gyn", rvu: 10.0 },
	{ code: "73.5", description: "Vacuum extraction delivery", category: "ob-gyn", rvu: 12.0 },
]

const CATEGORIES = [
	{ value: "all", label: "All Categories" },
	{ value: "surgical", label: "Surgical" },
	{ value: "ob-gyn", label: "OB-GYN" },
	{ value: "radiology", label: "Radiology" },
	{ value: "cardiology", label: "Cardiology" },
	{ value: "laboratory", label: "Laboratory" },
]

function searchCodes(query: string, cat: string): RvsCode[] {
	const q = query.trim().toLowerCase()
	return RVS_CODES.filter(item => {
		const matchCat = cat === "all" || item.category === cat
		const matchQuery =
			!q ||
			item.code.toLowerCase().includes(q) ||
			item.description.toLowerCase().includes(q)
		return matchCat && matchQuery
	}).slice(0, 12)
}

export function RvsCodePicker({
	value,
	onChange,
	category: initialCategory,
	placeholder = "Search RVS procedure code…",
	className,
	disabled = false,
}: RvsCodePickerProps) {
	const [query, setQuery] = useState("")
	const [selectedCategory, setSelectedCategory] = useState(initialCategory ?? "all")
	const [results, setResults] = useState<RvsCode[]>([])
	const [open, setOpen] = useState(false)
	const [loading, setLoading] = useState(false)
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const containerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		setLoading(true)
		debounceRef.current = setTimeout(() => {
			setResults(searchCodes(query, selectedCategory))
			setLoading(false)
		}, 250)
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current)
		}
	}, [query, selectedCategory])

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setOpen(false)
			}
		}
		document.addEventListener("mousedown", handleClickOutside)
		return () => document.removeEventListener("mousedown", handleClickOutside)
	}, [])

	const handleSelect = (item: RvsCode) => {
		onChange(item.code, item.description, item.rvu)
		setQuery(`${item.code} – ${item.description}`)
		setOpen(false)
	}

	return (
		<div ref={containerRef} className={cn("relative", className)}>
			<div className="flex gap-2">
				<Select
					value={selectedCategory}
					onValueChange={v => {
							setSelectedCategory(v ?? "all")
							setOpen(true)
						}}
					disabled={disabled}
				>
					<SelectTrigger className="w-44 shrink-0">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{CATEGORIES.map(c => (
							<SelectItem key={c.value} value={c.value}>
								{c.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<div className="relative flex-1">
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
						aria-label="RVS code search"
						aria-expanded={open}
						aria-haspopup="listbox"
						autoComplete="off"
					/>
				</div>
			</div>
			{value && !open && (
				<p className="text-muted-foreground mt-1 text-xs">
					Selected: <span className="font-mono font-semibold text-foreground">{value}</span>
				</p>
			)}
			{open && (
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
										"flex cursor-pointer items-start justify-between gap-2 px-3 py-2 text-sm hover:bg-accent",
										item.code === value && "bg-accent",
									)}
									onMouseDown={() => handleSelect(item)}
								>
									<div className="flex items-start gap-2">
										<span className="mt-0.5 shrink-0 font-mono text-xs font-semibold text-primary">
											{item.code}
										</span>
										<span className="text-foreground">{item.description}</span>
									</div>
									<span className="text-muted-foreground shrink-0 text-xs">
										{item.rvu} RVU
									</span>
								</li>
							))}
						</ul>
					)}
				</div>
			)}
		</div>
	)
}
