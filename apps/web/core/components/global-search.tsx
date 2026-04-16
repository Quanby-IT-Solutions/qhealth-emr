"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { Search01FreeIcons } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"

import { cn } from "@/core/lib/utils"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { orpc } from "@/services/orpc/client"

import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog"
import { Input } from "./ui/input"
import { Skeleton } from "./ui/skeleton"

interface GlobalSearchProps {
	className?: string
}

function formatPatientName(first: string, middle: string | null | undefined, last: string) {
	const parts = [last, first]
	if (middle) parts.splice(1, 0, middle)
	return parts.filter(Boolean).join(", ")
}

export function GlobalSearch({ className }: GlobalSearchProps) {
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState("")
	const [debouncedQuery, setDebouncedQuery] = useState("")
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const inputRef = useRef<HTMLInputElement>(null)

	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	// Debounce query
	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => setDebouncedQuery(query), 300)
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current)
		}
	}, [query])

	const { data: searchResults, isLoading } = useQuery(
		orpc.patient.search.queryOptions({
			input: {
				facilityId,
				search: debouncedQuery || undefined,
				page: 1,
				limit: 8,
			},
			enabled: !!facilityId && debouncedQuery.length >= 2,
			staleTime: 30_000,
		}),
	)

	// Keyboard shortcut Cmd/Ctrl+K
	const handleKeyDown = useCallback((e: KeyboardEvent) => {
		if ((e.metaKey || e.ctrlKey) && e.key === "k") {
			e.preventDefault()
			setOpen(prev => !prev)
		}
	}, [])

	useEffect(() => {
		document.addEventListener("keydown", handleKeyDown)
		return () => document.removeEventListener("keydown", handleKeyDown)
	}, [handleKeyDown])

	// Focus input when dialog opens
	useEffect(() => {
		if (open) {
			setTimeout(() => inputRef.current?.focus(), 50)
		} else {
			setQuery("")
			setDebouncedQuery("")
		}
	}, [open])

	const patients = searchResults?.data ?? []

	return (
		<>
			<Button
				variant="outline"
				onClick={() => setOpen(true)}
				className={cn(
					"text-muted-foreground h-9 w-full justify-start gap-2 text-sm font-normal md:w-64 lg:w-80",
					className,
				)}
				aria-label="Open global search"
			>
				<HugeiconsIcon icon={Search01FreeIcons} className="size-4 shrink-0" />
				<span>Search patients…</span>
				<kbd className="bg-muted ml-auto hidden rounded border px-1.5 py-0.5 font-mono text-[10px] md:inline">
					⌘K
				</kbd>
			</Button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="overflow-hidden p-0 sm:max-w-lg">
					<DialogTitle className="sr-only">Global Search</DialogTitle>
					<div className="border-b p-3">
						<div className="relative">
							<HugeiconsIcon
								icon={Search01FreeIcons}
								className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
							/>
							<Input
								ref={inputRef}
								value={query}
								onChange={e => setQuery(e.target.value)}
								placeholder="Search patients by name or MRN…"
								className="border-0 pl-9 shadow-none focus-visible:ring-0"
								autoComplete="off"
							/>
						</div>
					</div>

					<div className="max-h-80 overflow-y-auto">
						{query.length < 2 ? (
							<p className="text-muted-foreground px-4 py-6 text-center text-sm">
								Type at least 2 characters to search
							</p>
						) : isLoading ? (
							<div className="space-y-1 p-3">
								{[...Array(4)].map((_, i) => (
									<Skeleton key={i} className="h-12 w-full rounded-md" />
								))}
							</div>
						) : patients.length === 0 ? (
							<p className="text-muted-foreground px-4 py-6 text-center text-sm">
								No patients found for &quot;{query}&quot;
							</p>
						) : (
							<ul className="divide-y py-1">
								{patients.map(patient => (
									<li key={patient.id}>
										<Link
											href={`/patients/${patient.id}`}
											onClick={() => setOpen(false)}
											className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-accent"
										>
											<div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-full">
												<span className="text-primary text-xs font-semibold">
													{patient.firstName?.[0]}
													{patient.lastName?.[0]}
												</span>
											</div>
											<div className="min-w-0 flex-1">
												<p className="truncate font-medium text-foreground">
													{formatPatientName(
														patient.firstName,
														patient.middleName,
														patient.lastName,
													)}
												</p>
												<p className="text-muted-foreground text-xs">
													MRN: {patient.mrn} ·{" "}
													{patient.dateOfBirth
														? new Date(patient.dateOfBirth).toLocaleDateString("en-PH", {
																year: "numeric",
																month: "short",
																day: "numeric",
															})
														: "—"}
												</p>
											</div>
										</Link>
									</li>
								))}
							</ul>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
