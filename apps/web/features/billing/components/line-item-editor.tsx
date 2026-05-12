"use client"

import { useCallback, useMemo, useState } from "react"

import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table"
import { cn } from "@/core/lib/utils"
import { MoneyInput } from "./money-input"

type SortColumn = "description" | "quantity" | "unitPrice" | "totalAmount"
type SortDir = "asc" | "desc"

export interface LineItem {
	id: string
	description: string
	quantity: number
	unitPrice: number
	totalAmount: number
	overrideReason?: string
}

/** Shape that matches the backend CreateChargeInput contract */
export interface LineItemExport {
	description: string
	quantity: number
	unitPrice: number
	totalAmount: number
	overrideReason?: string
}

interface LineItemEditorProps {
	items: LineItem[]
	onChange: (items: LineItem[]) => void
	/** Called with the exportable JSON shape when items change */
	onExport?: (exported: LineItemExport[]) => void
	/** Callback for item search (debounced by parent) */
	onSearch?: (query: string) => void
	searchResults?: Array<{ id: string; description: string; unitPrice: number }>
	disabled?: boolean
	className?: string
}

function generateId() {
	return Math.random().toString(36).slice(2)
}

function toExport(items: LineItem[]): LineItemExport[] {
	return items.map(({ description, quantity, unitPrice, totalAmount, overrideReason }) => ({
		description,
		quantity,
		unitPrice,
		totalAmount,
		overrideReason,
	}))
}

export function LineItemEditor({
	items,
	onChange,
	onExport,
	onSearch,
	searchResults = [],
	disabled = false,
	className,
}: LineItemEditorProps) {
	const [searchQuery, setSearchQuery] = useState("")
	const [showSearch, setShowSearch] = useState(false)
	const [editingOverride, setEditingOverride] = useState<string | null>(null)
	const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
	const [sortDir, setSortDir] = useState<SortDir>("asc")

	const handleSort = useCallback((col: SortColumn) => {
		setSortColumn(prev => {
			if (prev === col) {
				setSortDir(d => (d === "asc" ? "desc" : "asc"))
				return prev
			}
			setSortDir("asc")
			return col
		})
	}, [])

	const sortedItems = useMemo(() => {
		if (!sortColumn) return items
		const dir = sortDir === "asc" ? 1 : -1
		return [...items].sort((a, b) => {
			const av = a[sortColumn]
			const bv = b[sortColumn]
			if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir
			return String(av).localeCompare(String(bv)) * dir
		})
	}, [items, sortColumn, sortDir])

	const sortIndicator = (col: SortColumn) =>
		sortColumn !== col ? "" : sortDir === "asc" ? " ↑" : " ↓"

	const update = useCallback(
		(updated: LineItem[]) => {
			onChange(updated)
			onExport?.(toExport(updated))
		},
		[onChange, onExport]
	)

	const handleAdd = useCallback(
		(result: { id: string; description: string; unitPrice: number }) => {
			const item: LineItem = {
				id: generateId(),
				description: result.description,
				quantity: 1,
				unitPrice: result.unitPrice,
				totalAmount: result.unitPrice,
			}
			update([...items, item])
			setShowSearch(false)
			setSearchQuery("")
		},
		[items, update]
	)

	const handleRemove = useCallback(
		(id: string) => {
			update(items.filter(i => i.id !== id))
		},
		[items, update]
	)

	const handleFieldChange = useCallback(
		(id: string, field: "quantity" | "unitPrice", value: number) => {
			update(
				items.map(item => {
					if (item.id !== id) return item
					const quantity = field === "quantity" ? value : item.quantity
					const unitPrice = field === "unitPrice" ? value : item.unitPrice
					return { ...item, quantity, unitPrice, totalAmount: quantity * unitPrice }
				})
			)
		},
		[items, update]
	)

	const handleOverrideReason = useCallback(
		(id: string, reason: string) => {
			update(items.map(item => (item.id !== id ? item : { ...item, overrideReason: reason })))
		},
		[items, update]
	)

	const total = items.reduce((sum, item) => sum + item.totalAmount, 0)
	const hasNegative = total < 0

	return (
		<div className={cn("space-y-3", className)}>
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>
								<button
									type="button"
									onClick={() => handleSort("description")}
									className="text-left font-medium hover:text-foreground"
									aria-label={`Sort by description ${sortColumn === "description" ? sortDir : "ascending"}`}
								>
									Description{sortIndicator("description")}
								</button>
							</TableHead>
							<TableHead className="w-24 text-right">
								<button
									type="button"
									onClick={() => handleSort("quantity")}
									className="font-medium hover:text-foreground"
									aria-label={`Sort by quantity ${sortColumn === "quantity" ? sortDir : "ascending"}`}
								>
									Qty{sortIndicator("quantity")}
								</button>
							</TableHead>
							<TableHead className="w-36 text-right">
								<button
									type="button"
									onClick={() => handleSort("unitPrice")}
									className="font-medium hover:text-foreground"
									aria-label={`Sort by unit price ${sortColumn === "unitPrice" ? sortDir : "ascending"}`}
								>
									Unit Price{sortIndicator("unitPrice")}
								</button>
							</TableHead>
							<TableHead className="w-36 text-right">
								<button
									type="button"
									onClick={() => handleSort("totalAmount")}
									className="font-medium hover:text-foreground"
									aria-label={`Sort by total ${sortColumn === "totalAmount" ? sortDir : "ascending"}`}
								>
									Total{sortIndicator("totalAmount")}
								</button>
							</TableHead>
							<TableHead className="w-10" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{items.length === 0 && (
							<TableRow>
								<TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
									No items. Add a line item below.
								</TableCell>
							</TableRow>
						)}
						{sortedItems.map(item => (
							<TableRow key={item.id}>
									<TableCell className="align-top">
										<div className="flex flex-col gap-1">
											<span className="text-sm">{item.description}</span>
											{editingOverride === item.id ? (
												<Input
													value={item.overrideReason ?? ""}
													onChange={e => handleOverrideReason(item.id, e.target.value)}
													onBlur={() => setEditingOverride(null)}
													placeholder="Reason for price override..."
													className="h-7 text-xs"
													autoFocus
													aria-label="Override reason"
												/>
											) : item.overrideReason ? (
												<button
													type="button"
													onClick={() => setEditingOverride(item.id)}
													className="text-left text-xs text-muted-foreground underline decoration-dotted"
												>
													Override: {item.overrideReason}
												</button>
											) : null}
										</div>
									</TableCell>
									<TableCell className="align-top">
										<MoneyInput
											value={item.quantity}
											onChange={v => handleFieldChange(item.id, "quantity", v)}
											step={1}
											currencySymbol=""
											disabled={disabled}
											className="w-20 ml-auto"
											aria-label={`Quantity for ${item.description}`}
										/>
									</TableCell>
									<TableCell className="align-top">
										<div className="flex flex-col gap-1 items-end">
											<MoneyInput
												value={item.unitPrice}
												onChange={v => {
													handleFieldChange(item.id, "unitPrice", v)
													if (!item.overrideReason) {
														setEditingOverride(item.id)
													}
												}}
												disabled={disabled}
												aria-label={`Unit price for ${item.description}`}
											/>
										</div>
									</TableCell>
									<TableCell className="align-top text-right tabular-nums text-sm">
										₱{item.totalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
									</TableCell>
									<TableCell className="align-top">
										<button
											type="button"
											onClick={() => handleRemove(item.id)}
											disabled={disabled}
											className="text-muted-foreground hover:text-destructive disabled:opacity-40"
											aria-label={`Remove ${item.description}`}
										>
											×
										</button>
									</TableCell>
								</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			{/* Total row */}
			<div className="flex justify-end px-2">
				<span
					className={cn(
						"text-sm font-medium tabular-nums",
						hasNegative ? "text-destructive" : ""
					)}
					role="status"
					aria-live="polite"
				>
					Total: ₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
				</span>
			</div>
			{hasNegative && (
				<p className="text-xs text-destructive" role="alert">
					Line item total cannot be negative.
				</p>
			)}

			{/* Add item search */}
			{!disabled && (
				<div className="space-y-2">
					{showSearch ? (
						<div className="rounded-md border p-3 space-y-2">
							<Input
								value={searchQuery}
								onChange={e => {
									setSearchQuery(e.target.value)
									onSearch?.(e.target.value)
								}}
								placeholder="Search service catalog..."
								autoFocus
								aria-label="Search for a service item"
							/>
							{searchResults.length > 0 && (
								<ul className="max-h-48 overflow-y-auto space-y-1" role="listbox" aria-label="Search results">
									{searchResults.map(r => (
										<li key={r.id}>
											<button
												type="button"
												onClick={() => handleAdd(r)}
												className="w-full text-left rounded px-2 py-1.5 text-sm hover:bg-muted flex justify-between"
												role="option"
												aria-selected={false}
											>
												<span>{r.description}</span>
												<span className="text-muted-foreground tabular-nums">
													₱{r.unitPrice.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
												</span>
											</button>
										</li>
									))}
								</ul>
							)}
							<Button
								variant="ghost"
								size="sm"
								className="h-7 text-xs"
								onClick={() => setShowSearch(false)}
							>
								Cancel
							</Button>
						</div>
					) : (
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowSearch(true)}
							className="h-8 text-sm"
						>
							+ Add item
						</Button>
					)}
				</div>
			)}
		</div>
	)
}
