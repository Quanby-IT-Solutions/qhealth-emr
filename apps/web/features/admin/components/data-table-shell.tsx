"use client"

import type { ReactNode } from "react"

import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"

interface DataTableShellProps {
	searchPlaceholder?: string
	searchValue?: string
	onSearchChange?: (value: string) => void
	filterSlot?: ReactNode
	exportSlot?: ReactNode
	children: ReactNode
	totalCount?: number
	page?: number
	pageSize?: number
	onPageChange?: (page: number) => void
}

export function DataTableShell({
	searchPlaceholder = "Search...",
	searchValue,
	onSearchChange,
	filterSlot,
	exportSlot,
	children,
	totalCount,
	page = 1,
	pageSize = 20,
	onPageChange,
}: DataTableShellProps) {
	const totalPages = totalCount !== undefined ? Math.ceil(totalCount / pageSize) : undefined

	return (
		<div className="flex flex-col gap-4">
			{/* Toolbar */}
			<div className="flex flex-wrap items-center gap-2">
				{onSearchChange && (
					<Input
						className="h-8 w-56"
						placeholder={searchPlaceholder}
						value={searchValue ?? ""}
						onChange={e => onSearchChange(e.target.value)}
					/>
				)}
				{filterSlot}
				{exportSlot && <div className="ml-auto">{exportSlot}</div>}
			</div>

			{/* Table content */}
			<div className="rounded-md border">{children}</div>

			{/* Pagination */}
			{totalPages !== undefined && totalPages > 1 && onPageChange && (
				<div className="flex items-center justify-between text-sm">
					<span className="text-muted-foreground">
						{totalCount} result{totalCount !== 1 ? "s" : ""}
					</span>
					<div className="flex items-center gap-1">
						<Button
							variant="outline"
							size="sm"
							onClick={() => onPageChange(page - 1)}
							disabled={page <= 1}
						>
							Previous
						</Button>
						<span className="text-muted-foreground px-2">
							{page} / {totalPages}
						</span>
						<Button
							variant="outline"
							size="sm"
							onClick={() => onPageChange(page + 1)}
							disabled={page >= totalPages}
						>
							Next
						</Button>
					</div>
				</div>
			)}
		</div>
	)
}
