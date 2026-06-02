"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { useDebounce } from "@/core/hooks/use-debounce"

import { EncounterContextBar } from "@/features/billing/components/encounter-context-bar"
import {
	useChargesQuery,
	useCreateChargeMutation,
	useDeleteChargeMutation,
	useMarkReadyMutation,
	useServiceCatalogQuery,
} from "../api/charges.hooks"
import { computeTotals, type SourceType } from "../lib/charge-utils"
import { AutoPulledTab } from "./auto-pulled-tab"
import { ManualTab } from "./manual-tab"

interface ChargeCapturePageProps {
	encounterId: string
	facilityId: string
	patientId: string
}

const SOURCE_OPTIONS: { label: string; value: SourceType | "all" }[] = [
	{ label: "All Sources", value: "all" },
	{ label: "Medication Order", value: "auto_medication" },
	{ label: "Lab Order", value: "auto_lab" },
	{ label: "Imaging Order", value: "auto_imaging" },
	{ label: "Manual", value: "manual" },
]

export function ChargeCapturePageComponent({ encounterId, facilityId, patientId }: ChargeCapturePageProps) {
	const router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()

	const [confirmOpen, setConfirmOpen] = useState(false)

	// URL-synced filter state
	const filterSource = (searchParams.get("source") ?? "all") as SourceType | "all"
	const filterDateFrom = searchParams.get("from") ?? ""
	const filterDateTo = searchParams.get("to") ?? ""
	const filterText = searchParams.get("q") ?? ""
	const debouncedText = useDebounce(filterText, 300)

	// Catalog search (separate debounce for service item search)
	const [catalogSearch, setCatalogSearch] = useState("")
	const debouncedCatalogSearch = useDebounce(catalogSearch, 300)

	const { data: chargesData, isLoading: chargesLoading } = useChargesQuery(encounterId, facilityId)
	const { mutate: createCharge, isPending: creating } = useCreateChargeMutation(encounterId)
	const { mutate: deleteCharge } = useDeleteChargeMutation()
	const { mutate: markReady, isPending: markingReady } = useMarkReadyMutation()
	const { data: catalogData } = useServiceCatalogQuery(facilityId, debouncedCatalogSearch)

	const allCharges = chargesData?.charges ?? []

	// Apply filters client-side
	const charges = useMemo(() => {
		return allCharges.filter(c => {
			if (filterSource !== "all" && c.sourceType !== filterSource) return false
			if (debouncedText) {
				const needle = debouncedText.toLowerCase()
				if (!c.description.toLowerCase().includes(needle)) return false
			}
			if (filterDateFrom) {
				const d = new Date(c.createdAt)
				if (d < new Date(filterDateFrom)) return false
			}
			if (filterDateTo) {
				const d = new Date(c.createdAt)
				if (d > new Date(`${filterDateTo}T23:59:59`)) return false
			}
			return true
		})
	}, [allCharges, filterSource, debouncedText, filterDateFrom, filterDateTo])

	const total = computeTotals(allCharges)
	const hasCharges = allCharges.length > 0

	const searchResults = catalogData?.items.map(item => ({
		id: item.id,
		description: item.description,
		unitPrice: item.unitPrice,
	})) ?? []

	function updateParam(key: string, value: string) {
		const params = new URLSearchParams(searchParams.toString())
		if (value && value !== "all") {
			params.set(key, value)
		} else {
			params.delete(key)
		}
		router.replace(`${pathname}?${params.toString()}`, { scroll: false })
	}

	const handleAdd = useCallback(
		(item: { description: string; quantity: number; unitPrice: number; totalAmount: number }) => {
			createCharge({
				facilityId,
				encounterId,
				description: item.description,
				quantity: item.quantity,
				unitPrice: item.unitPrice,
			})
		},
		[createCharge, facilityId, encounterId]
	)

	const handleRemove = useCallback(
		(id: string) => deleteCharge({ id }),
		[deleteCharge]
	)

	const handleMarkReady = useCallback(() => {
		markReady(
			{ encounterId, facilityId },
			{
				onSuccess: () => {
					setConfirmOpen(false)
					router.push(`/billing/encounters/${encounterId}/invoice`)
				},
			}
		)
	}, [markReady, encounterId, facilityId, router])

	return (
		<div className="space-y-4">
			<EncounterContextBar />

			<div className="px-4 space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-lg font-semibold">Charge Capture</h1>
						<p className="text-sm text-muted-foreground">Review and add charges for this encounter</p>
					</div>
					<Button
						onClick={() => setConfirmOpen(true)}
						disabled={!hasCharges || markingReady}
						aria-label="Mark charges ready for invoicing"
					>
						Ready for Invoicing
					</Button>
				</div>

				{/* Filter bar */}
				<div className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/30 p-3">
					<div className="flex flex-col gap-1">
						<Label htmlFor="filter-source" className="text-xs">Source</Label>
						<Select
							value={filterSource}
							onValueChange={v => updateParam("source", v ?? "all")}
						>
							<SelectTrigger id="filter-source" className="h-8 w-44 text-xs">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{SOURCE_OPTIONS.map(opt => (
									<SelectItem key={opt.value} value={opt.value} className="text-xs">
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="flex flex-col gap-1">
						<Label htmlFor="filter-from" className="text-xs">From</Label>
						<Input
							id="filter-from"
							type="date"
							value={filterDateFrom}
							onChange={e => updateParam("from", e.target.value)}
							className="h-8 w-36 text-xs"
						/>
					</div>

					<div className="flex flex-col gap-1">
						<Label htmlFor="filter-to" className="text-xs">To</Label>
						<Input
							id="filter-to"
							type="date"
							value={filterDateTo}
							onChange={e => updateParam("to", e.target.value)}
							className="h-8 w-36 text-xs"
						/>
					</div>

					<div className="flex flex-col gap-1 flex-1 min-w-[160px]">
						<Label htmlFor="filter-q" className="text-xs">Search</Label>
						<Input
							id="filter-q"
							placeholder="Filter by description..."
							value={filterText}
							onChange={e => updateParam("q", e.target.value)}
							className="h-8 text-xs"
						/>
					</div>
				</div>

				{chargesData && total < 0 && (
					<Alert variant="destructive">
						<AlertDescription>Total charge amount is negative. Please review line items.</AlertDescription>
					</Alert>
				)}

				<Tabs defaultValue="auto">
					<TabsList>
						<TabsTrigger value="auto">
							Auto-Pulled
							{charges.filter(c => c.sourceType !== "manual").length > 0 && (
								<span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs tabular-nums">
									{charges.filter(c => c.sourceType !== "manual").length}
								</span>
							)}
						</TabsTrigger>
						<TabsTrigger value="manual">Manual</TabsTrigger>
					</TabsList>

					<TabsContent value="auto" className="mt-4">
						<AutoPulledTab
							charges={charges}
							isLoading={chargesLoading}
							encounterId={encounterId}
						/>
					</TabsContent>

					<TabsContent value="manual" className="mt-4">
						<ManualTab
							encounterId={encounterId}
							facilityId={facilityId}
							charges={charges.filter(c => c.sourceType === "manual")}
							searchResults={searchResults}
							onSearch={setCatalogSearch}
							onAdd={handleAdd}
							onRemove={handleRemove}
							disabled={creating}
						/>
					</TabsContent>
				</Tabs>

				<div className="flex justify-end border-t pt-4">
					<p className="text-base font-semibold tabular-nums">
						Total: ₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
					</p>
				</div>
			</div>

			<Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Mark Ready for Invoicing</DialogTitle>
						<DialogDescription>
							This will lock the charges and move the encounter to invoicing. This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-1 rounded-md bg-muted p-3 text-sm">
						<div className="flex justify-between">
							<span className="text-muted-foreground">Charges</span>
							<span>{allCharges.length} item{allCharges.length !== 1 ? "s" : ""}</span>
						</div>
						<div className="flex justify-between font-medium">
							<span>Total</span>
							<span>₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
						<Button onClick={handleMarkReady} disabled={markingReady}>
							{markingReady ? "Processing..." : "Confirm"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
