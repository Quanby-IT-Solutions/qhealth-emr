"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Skeleton } from "@/core/components/ui/skeleton"
import { useDebounce } from "@/core/hooks/use-debounce"
import { EncounterContextBar } from "@/features/billing/components/encounter-context-bar"
import { MoneyInput } from "@/features/billing/components/money-input"

import { useCreateChargeMutation, useServiceCatalogQuery } from "../api/charges.hooks"

interface ServiceItemPageProps {
	encounterId: string
	facilityId: string
	patientId?: string
}

interface CatalogItem {
	id: string
	description: string
	unitPrice: number
}

export function ServiceItemPage({ encounterId, facilityId, patientId }: ServiceItemPageProps) {
	const router = useRouter()
	const [query, setQuery] = useState("")
	const [qty, setQty] = useState(1)
	const [selected, setSelected] = useState<CatalogItem | null>(null)

	const debouncedQuery = useDebounce(query, 300)
	const { data, isLoading, isError } = useServiceCatalogQuery(facilityId, debouncedQuery)
	const { mutate: createCharge, isPending } = useCreateChargeMutation(encounterId)

	const handleAdd = useCallback(() => {
		if (!selected) return
		createCharge(
			{
				facilityId,
				encounterId,
				description: selected.description,
				quantity: qty,
				unitPrice: selected.unitPrice,
			},
			{
				onSuccess: () => router.back(),
			}
		)
	}, [selected, qty, createCharge, facilityId, encounterId, router])

	return (
		<div className="space-y-4">
			<EncounterContextBar />

			<div className="mx-auto max-w-lg space-y-4 p-4">
				<div className="flex items-center gap-2">
					<Button variant="ghost" size="sm" onClick={() => router.back()} aria-label="Go back">
						←
					</Button>
					<h1 className="text-base font-semibold">Add Service Item</h1>
				</div>

				<Input
					value={query}
					onChange={e => {
						setQuery(e.target.value)
						setSelected(null)
					}}
					placeholder="Search service catalog..."
					aria-label="Search for a service"
				/>

				{isLoading && (
					<div className="space-y-2">
						{[...Array(5)].map((_, i) => (
							<Skeleton key={i} className="h-10 w-full" />
						))}
					</div>
				)}

				{isError && (
					<p className="text-destructive py-4 text-center text-sm">
						Failed to load service catalog. Please try again.
					</p>
				)}

				{!isLoading && !isError && data?.items.length === 0 && query && (
					<p className="text-muted-foreground py-4 text-center text-sm">No results for "{query}"</p>
				)}

				{!isLoading && !isError && data && data.items.length > 0 && (
					<ul
						className="divide-y rounded-md border"
						role="listbox"
						aria-label="Service catalog results"
					>
						{data.items.map(item => (
							<li key={item.id}>
								<button
									type="button"
									onClick={() =>
										setSelected({
											id: item.id,
											description: item.description,
											unitPrice: item.unitPrice,
										})
									}
									className={`hover:bg-muted flex w-full justify-between px-3 py-2.5 text-left text-sm transition-colors ${selected?.id === item.id ? "bg-primary/5 font-medium" : ""}`}
									role="option"
									aria-selected={selected?.id === item.id}
								>
									<span>{item.description}</span>
									<span className="text-muted-foreground tabular-nums">
										₱{item.unitPrice.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
									</span>
								</button>
							</li>
						))}
					</ul>
				)}

				{selected && (
					<div className="bg-muted/30 space-y-3 rounded-md border p-4">
						<p className="text-sm font-medium">{selected.description}</p>
						<div className="flex items-center gap-3">
							<label className="text-muted-foreground w-20 shrink-0 text-sm">Quantity</label>
							<MoneyInput
								value={qty}
								onChange={setQty}
								step={1}
								currencySymbol=""
								className="w-24"
								aria-label="Quantity"
							/>
						</div>
						<div className="flex items-center gap-3">
							<span className="text-muted-foreground w-20 shrink-0 text-sm">Unit Price</span>
							<span className="text-sm tabular-nums">
								₱{selected.unitPrice.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
							</span>
						</div>
						<div className="flex items-center gap-3 border-t pt-2">
							<span className="w-20 shrink-0 text-sm font-medium">Total</span>
							<span className="text-sm font-semibold tabular-nums">
								₱{(selected.unitPrice * qty).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
							</span>
						</div>
						<Button onClick={handleAdd} disabled={isPending} className="w-full">
							{isPending ? "Adding..." : "Add to Charges"}
						</Button>
					</div>
				)}
			</div>
		</div>
	)
}
