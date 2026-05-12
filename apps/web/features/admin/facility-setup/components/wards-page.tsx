"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
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
import { useActiveFacilityId } from "@/core/hooks/use-active-facility"

import {
	useCreateBedMutation,
	useCreateWardMutation,
	useListBedsQuery,
	useListWardsQuery,
	useUpdateBedStatusMutation,
} from "../api/wards.hooks"

type BedStatus = "available" | "occupied" | "reserved" | "cleaning" | "out_of_service"
type WardType = "general" | "icu" | "er" | "or" | "nursery"

const STATUS_BADGE: Record<BedStatus, { label: string; className: string }> = {
	available: { label: "Available", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
	occupied: { label: "Occupied", className: "bg-amber-100 text-amber-700 border-amber-200" },
	reserved: { label: "Reserved", className: "bg-blue-100 text-blue-700 border-blue-200" },
	cleaning: { label: "Dirty/For Cleaning", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
	out_of_service: {
		label: "Out of Service",
		className: "bg-zinc-100 text-zinc-600 border-zinc-200",
	},
}

const WARD_TYPES: WardType[] = ["general", "icu", "er", "or", "nursery"]

interface AddWardDialogProps {
	facilityId: string
	open: boolean
	onOpenChange: (open: boolean) => void
}

function AddWardDialog({ facilityId, open, onOpenChange }: AddWardDialogProps) {
	const [name, setName] = useState("")
	const [wardType, setWardType] = useState<WardType>("general")
	const [totalBeds, setTotalBeds] = useState("0")
	const createWard = useCreateWardMutation()

	async function handleSubmit() {
		if (!name.trim()) return
		try {
			await createWard.mutateAsync({
				facilityId,
				name: name.trim(),
				wardType,
				totalBeds: parseInt(totalBeds, 10) || 0,
			})
			toast.success("Ward created.")
			setName("")
			setWardType("general")
			setTotalBeds("0")
			onOpenChange(false)
		} catch {
			toast.error("Failed to create ward.")
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add Ward</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<div className="space-y-1.5">
						<Label htmlFor="ward-name">Ward name *</Label>
						<Input
							id="ward-name"
							placeholder="e.g. General Ward A"
							value={name}
							onChange={e => setName(e.target.value)}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="ward-type">Ward type</Label>
						<Select value={wardType} onValueChange={v => setWardType(v as WardType)}>
							<SelectTrigger id="ward-type">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{WARD_TYPES.map(t => (
									<SelectItem key={t} value={t}>
										{t.toUpperCase()}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="total-beds">Total beds</Label>
						<Input
							id="total-beds"
							type="number"
							min={0}
							value={totalBeds}
							onChange={e => setTotalBeds(e.target.value)}
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={!name.trim() || createWard.isPending}>
						{createWard.isPending ? "Creating..." : "Create Ward"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

interface SetBedStatusDialogProps {
	bedId: string
	bedNumber: string
	currentStatus: BedStatus
	open: boolean
	onOpenChange: (open: boolean) => void
}

function SetBedStatusDialog({
	bedId,
	bedNumber,
	currentStatus,
	open,
	onOpenChange,
}: SetBedStatusDialogProps) {
	const [status, setStatus] = useState<BedStatus>(currentStatus)
	const updateStatus = useUpdateBedStatusMutation()

	async function handleSave() {
		try {
			await updateStatus.mutateAsync({ id: bedId, status })
			toast.success(`Bed ${bedNumber} status updated.`)
			onOpenChange(false)
		} catch {
			toast.error("Failed to update bed status.")
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Set Status - Bed {bedNumber}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<Select value={status} onValueChange={v => setStatus(v as BedStatus)}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{(Object.keys(STATUS_BADGE) as BedStatus[]).map(s => (
								<SelectItem key={s} value={s}>
									{STATUS_BADGE[s].label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleSave} disabled={updateStatus.isPending}>
						{updateStatus.isPending ? "Saving..." : "Save"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

export function WardsPage() {
	const facilityId = useActiveFacilityId()
	const { data: wards, isLoading: wardsLoading } = useListWardsQuery(facilityId ?? "", !!facilityId)
	const { data: bedsData, isLoading: bedsLoading } = useListBedsQuery(
		facilityId ?? "",
		!!facilityId
	)
	const [expandedWards, setExpandedWards] = useState<Set<string>>(new Set())
	const [addWardOpen, setAddWardOpen] = useState(false)
	const [bedStatusDialog, setBedStatusDialog] = useState<{
		bedId: string
		bedNumber: string
		currentStatus: BedStatus
	} | null>(null)

	// Drag-to-reorder state
	const [wardOrder, setWardOrder] = useState<string[]>([])
	const [draggedWardId, setDraggedWardId] = useState<string | null>(null)
	const [dragOverWardId, setDragOverWardId] = useState<string | null>(null)

	// Sync wardOrder when wards data loads or changes
	useEffect(() => {
		if (wards) {
			setWardOrder(wards.map(w => w.id))
		}
	}, [wards])

	if (!facilityId)
		return <p className="text-sm text-muted-foreground">No facility selected.</p>

	if (wardsLoading || bedsLoading)
		return <p className="animate-pulse text-sm text-muted-foreground">Loading wards...</p>

	function toggleWard(wardId: string) {
		setExpandedWards(prev => {
			const next = new Set(prev)
			if (next.has(wardId)) {
				next.delete(wardId)
			} else {
				next.add(wardId)
			}
			return next
		})
	}

	function handleDrop(targetWardId: string) {
		if (!draggedWardId || draggedWardId === targetWardId) return
		setWardOrder(prev => {
			const next = [...prev]
			const fromIdx = next.indexOf(draggedWardId)
			const toIdx = next.indexOf(targetWardId)
			if (fromIdx === -1 || toIdx === -1) return prev
			next.splice(fromIdx, 1)
			next.splice(toIdx, 0, draggedWardId)
			return next
		})
		setDragOverWardId(null)
	}

	function handleSaveOrder() {
		toast.success("Order saved")
	}

	const orderedWards = wardOrder
		.map(id => wards?.find(w => w.id === id))
		.filter(Boolean) as NonNullable<typeof wards>

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-medium">Wards</h2>
				<div className="flex items-center gap-2">
					<Button size="sm" variant="outline" onClick={handleSaveOrder}>
						Save order
					</Button>
					<Button size="sm" onClick={() => setAddWardOpen(true)}>
						Add Ward
					</Button>
				</div>
			</div>

			{!wards || wards.length === 0 ? (
				<p className="py-8 text-center text-sm text-muted-foreground">
					No wards configured for this facility.
				</p>
			) : (
				<div className="space-y-3">
					{orderedWards.map(ward => {
						const wardWithBeds = bedsData?.wards.find(w => w.id === ward.id)
						const beds = wardWithBeds?.beds ?? []
						const isExpanded = expandedWards.has(ward.id)

						const statusCounts = beds.reduce(
							(acc, b) => {
								const s = b.status as BedStatus
								acc[s] = (acc[s] ?? 0) + 1
								return acc
							},
							{} as Partial<Record<BedStatus, number>>
						)

						return (
							<Card
								key={ward.id}
								draggable={true}
								onDragStart={() => setDraggedWardId(ward.id)}
								onDragOver={e => { e.preventDefault(); setDragOverWardId(ward.id) }}
								onDrop={() => handleDrop(ward.id)}
								onDragEnd={() => { setDraggedWardId(null); setDragOverWardId(null) }}
								className={dragOverWardId === ward.id ? "ring-2 ring-primary" : undefined}
							>
								<CardHeader className="pb-2">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<button
												type="button"
												className="text-left"
												onClick={() => toggleWard(ward.id)}
											>
												<CardTitle className="text-base">{ward.name}</CardTitle>
											</button>
											<Badge variant="outline" className="text-xs uppercase">
												{ward.wardType}
											</Badge>
											{!ward.isActive && (
												<Badge variant="secondary" className="text-xs">
													Inactive
												</Badge>
											)}
										</div>
										<div className="flex items-center gap-2">
											<button
												type="button"
												className="text-xs text-muted-foreground underline"
												onClick={() => toggleWard(ward.id)}
											>
												{isExpanded ? "Collapse" : "Expand"}
											</button>
										</div>
									</div>
									<div className="mt-1 flex flex-wrap gap-4 text-sm text-muted-foreground">
										<span>Total beds: {ward.totalBeds}</span>
										{statusCounts.available != null && (
											<span className="text-emerald-600">
												Available: {statusCounts.available}
											</span>
										)}
										{statusCounts.occupied != null && (
											<span className="text-amber-600">
												Occupied: {statusCounts.occupied}
											</span>
										)}
										{statusCounts.reserved != null && (
											<span className="text-blue-600">
												Reserved: {statusCounts.reserved}
											</span>
										)}
										{statusCounts.cleaning != null && (
											<span className="text-yellow-600">
												Dirty/For Cleaning: {statusCounts.cleaning}
											</span>
										)}
										{statusCounts.out_of_service != null && (
											<span className="text-zinc-500">
												Out of service: {statusCounts.out_of_service}
											</span>
										)}
									</div>
								</CardHeader>

								{isExpanded && (
									<CardContent>
										{beds.length === 0 ? (
											<p className="py-4 text-center text-sm text-muted-foreground">
												No beds in this ward.
											</p>
										) : (
											<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
												{beds.map(bed => {
													const info = STATUS_BADGE[bed.status as BedStatus] ?? {
														label: bed.status,
														className: "bg-muted text-muted-foreground",
													}
													return (
														<button
															key={bed.id}
															type="button"
															className="group flex flex-col items-start gap-1 rounded-md border p-2 text-left transition-colors hover:bg-muted/50"
															onClick={() =>
																setBedStatusDialog({
																	bedId: bed.id,
																	bedNumber: bed.bedNumber,
																	currentStatus: bed.status as BedStatus,
																})
															}
														>
															<span className="text-sm font-medium">{bed.bedNumber}</span>
															<span
																className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${info.className}`}
															>
																{info.label}
															</span>
															{bed.patientName && (
																<span className="line-clamp-1 text-[10px] text-muted-foreground">
																	{bed.patientName}
																</span>
															)}
														</button>
													)
												})}
											</div>
										)}
									</CardContent>
								)}
							</Card>
						)
					})}
				</div>
			)}

			<AddWardDialog
				facilityId={facilityId}
				open={addWardOpen}
				onOpenChange={setAddWardOpen}
			/>

			{bedStatusDialog && (
				<SetBedStatusDialog
					bedId={bedStatusDialog.bedId}
					bedNumber={bedStatusDialog.bedNumber}
					currentStatus={bedStatusDialog.currentStatus}
					open={true}
					onOpenChange={open => {
						if (!open) setBedStatusDialog(null)
					}}
				/>
			)}
		</div>
	)
}
