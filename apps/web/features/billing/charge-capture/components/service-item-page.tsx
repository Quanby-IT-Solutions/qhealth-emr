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

			<div className="max-w-lg mx-auto space-y-4 p-4">
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
						{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
					</div>
				)}

				{isError && (
					<p className="text-sm text-destructive text-center py-4">Failed to load service catalog. Please try again.</p>
				)}

				{!isLoading && !isError && data?.items.length === 0 && query && (
					<p className="text-sm text-muted-foreground text-center py-4">No results for "{query}"</p>
				)}

				{!isLoading && !isError && data && data.items.length > 0 && (
					<ul className="rounded-md border divide-y" role="listbox" aria-label="Service catalog results">
						{data.items.map(item => (
							<li key={item.id}>
								<button
									type="button"
									onClick={() => setSelected({ id: item.id, description: item.description, unitPrice: item.unitPrice })}
									className={`w-full text-left px-3 py-2.5 text-sm flex justify-between hover:bg-muted transition-colors ${selected?.id === item.id ? "bg-primary/5 font-medium" : ""}`}
									role="option"
									aria-selected={selected?.id === item.id}
								>
									<span>{item.description}</span>
									<span className="tabular-nums text-muted-foreground">
										₱{item.unitPrice.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
									</span>
								</button>
							</li>
						))}
					</ul>
				)}

				{selected && (
					<div className="rounded-md border p-4 space-y-3 bg-muted/30">
						<p className="text-sm font-medium">{selected.description}</p>
						<div className="flex items-center gap-3">
							<label className="text-sm text-muted-foreground w-20 shrink-0">Quantity</label>
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
							<span className="text-sm text-muted-foreground w-20 shrink-0">Unit Price</span>
							<span className="tabular-nums text-sm">
								₱{selected.unitPrice.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
							</span>
						</div>
						<div className="flex items-center gap-3 border-t pt-2">
							<span className="text-sm font-medium w-20 shrink-0">Total</span>
							<span className="tabular-nums text-sm font-semibold">
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
