"use client"

import { useState } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Progress } from "@/core/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Separator } from "@/core/components/ui/separator"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import {
	useBedCensusQuery,
	useBedListQuery,
	useCreateBedMutation,
	useCreateWardMutation,
	useUpdateBedStatusMutation,
} from "@/features/beds/api/beds.hooks"

function bedStatusColor(status: string) {
	switch (status) {
		case "available":
			return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
		case "occupied":
			return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
		case "out_of_service":
			return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
		default:
			return ""
	}
}

function bedStatusLabel(status: string) {
	switch (status) {
		case "available":
			return "Available"
		case "occupied":
			return "Occupied"
		case "out_of_service":
			return "Out of Service"
		default:
			return status
	}
}

export function BedManagement() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	const { data: bedData, isLoading } = useBedListQuery({ facilityId })
	const { data: census } = useBedCensusQuery({ facilityId })
	const createWard = useCreateWardMutation()
	const createBed = useCreateBedMutation()
	const updateBedStatus = useUpdateBedStatusMutation()

	const [newWard, setNewWard] = useState({ name: "", wardType: "general" as string })
	const [newBed, setNewBed] = useState({ wardId: "", bedNumber: "" })

	if (!facilityId) {
		return (
			<div className="text-muted-foreground flex h-48 items-center justify-center">
				No facility context available.
			</div>
		)
	}

	if (isLoading) {
		return (
			<div className="text-muted-foreground flex h-48 items-center justify-center">
				Loading bed management…
			</div>
		)
	}

	const wards = bedData?.wards ?? []

	return (
		<div className="space-y-6">
			{/* Census Summary */}
			{census && (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<Card>
						<CardContent className="pt-6">
							<div className="text-muted-foreground text-sm">Total Beds</div>
							<div className="text-2xl font-bold">{census.overall.totalBeds}</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="text-muted-foreground text-sm">Occupied</div>
							<div className="text-2xl font-bold">{census.overall.occupiedBeds}</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="text-muted-foreground text-sm">Available</div>
							<div className="text-2xl font-bold">
								{census.overall.totalBeds - census.overall.occupiedBeds}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="text-muted-foreground text-sm">BOR (Overall)</div>
							<div className="text-2xl font-bold">{census.overall.borPercentage}%</div>
							<Progress
								value={Number(census.overall.borPercentage)}
								className="mt-2"
							/>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Actions */}
			<div className="flex flex-wrap gap-2">
				<Dialog>
					<DialogTrigger render={<Button size="sm">Add Ward</Button>} />
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Create Ward</DialogTitle>
						</DialogHeader>
						<div className="space-y-4 py-4">
							<div className="space-y-1.5">
								<Label>Ward Name</Label>
								<Input
									value={newWard.name}
									onChange={e => setNewWard(prev => ({ ...prev, name: e.target.value }))}
								/>
							</div>
							<div className="space-y-1.5">
								<Label>Ward Type</Label>
								<Select value={newWard.wardType} onValueChange={v => setNewWard(prev => ({ ...prev, wardType: v ?? "general" }))}>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="general">General</SelectItem>
										<SelectItem value="icu">ICU</SelectItem>
										<SelectItem value="er">ER</SelectItem>
										<SelectItem value="or">OR</SelectItem>
										<SelectItem value="nursery">Nursery</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
						<DialogFooter>
							<DialogClose render={<Button variant="outline">Cancel</Button>} />
							<Button
								disabled={!newWard.name || createWard.isPending}
								onClick={async () => {
									await createWard.mutateAsync({
										facilityId,
										name: newWard.name,
										wardType: newWard.wardType as "general" | "icu" | "er" | "or" | "nursery",
									})
									setNewWard({ name: "", wardType: "general" })
								}}
							>
								Create
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				<Dialog>
					<DialogTrigger render={<Button size="sm" variant="outline">Add Bed</Button>} />
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Add Bed to Ward</DialogTitle>
						</DialogHeader>
						<div className="space-y-4 py-4">
							<div className="space-y-1.5">
								<Label>Ward</Label>
								<Select value={newBed.wardId} onValueChange={v => setNewBed(prev => ({ ...prev, wardId: v ?? "" }))}>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{wards.map(w => (
											<SelectItem key={w.id} value={w.id}>
												{w.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1.5">
								<Label>Bed Number</Label>
								<Input
									value={newBed.bedNumber}
									onChange={e => setNewBed(prev => ({ ...prev, bedNumber: e.target.value }))}
								/>
							</div>
						</div>
						<DialogFooter>
							<DialogClose render={<Button variant="outline">Cancel</Button>} />
							<Button
								disabled={!newBed.wardId || !newBed.bedNumber || createBed.isPending}
								onClick={async () => {
									await createBed.mutateAsync({
										facilityId,
										wardId: newBed.wardId,
										bedNumber: newBed.bedNumber,
									})
									setNewBed({ wardId: "", bedNumber: "" })
								}}
							>
								Create
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>

			{/* Ward-by-Ward Grid */}
			{wards.length === 0 ? (
				<Card>
					<CardContent className="py-12 text-center">
						<p className="text-muted-foreground">No wards configured yet. Add a ward to get started.</p>
					</CardContent>
				</Card>
			) : (
				wards.map(ward => (
					<Card key={ward.id}>
						<CardHeader>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<CardTitle>{ward.name}</CardTitle>
									<Badge variant="outline" className="capitalize">
										{ward.wardType}
									</Badge>
								</div>
								<div className="text-muted-foreground flex gap-4 text-sm">
									<span className="text-green-600 dark:text-green-400">
										{ward.availableCount} available
									</span>
									<span className="text-red-600 dark:text-red-400">
										{ward.occupiedCount} occupied
									</span>
									{ward.outOfServiceCount > 0 && (
										<span className="text-yellow-600 dark:text-yellow-400">
											{ward.outOfServiceCount} OOS
										</span>
									)}
								</div>
							</div>
						</CardHeader>
						<Separator />
						<CardContent className="pt-4">
							{ward.beds.length === 0 ? (
								<p className="text-muted-foreground py-4 text-center text-sm">
									No beds in this ward yet.
								</p>
							) : (
								<div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
									{ward.beds.map(bed => (
										<div
											key={bed.id}
											className={`rounded-lg border p-3 text-sm ${bedStatusColor(bed.status)}`}
										>
											<div className="font-medium">{bed.bedNumber}</div>
											<div className="text-xs">{bedStatusLabel(bed.status)}</div>
											{bed.patientName && (
												<div className="mt-1 truncate text-xs font-medium">
													{bed.patientName}
												</div>
											)}
											{bed.patientMrn && (
												<div className="text-xs opacity-75">MRN: {bed.patientMrn}</div>
											)}
											{bed.status !== "occupied" && (
												<Button
													size="sm"
													variant="ghost"
													className="mt-1 h-6 px-2 text-xs"
													onClick={() =>
														updateBedStatus.mutate({
															id: bed.id,
															status:
																bed.status === "available"
																	? "out_of_service"
																	: "available",
														})
													}
												>
													{bed.status === "available" ? "Mark OOS" : "Mark Available"}
												</Button>
											)}
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				))
			)}

			{/* Per-Ward BOR */}
			{census && census.byWard.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Ward BOR Summary</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{census.byWard.map(w => (
								<div key={w.wardId} className="flex items-center gap-4">
									<span className="w-40 text-sm font-medium">{w.wardName}</span>
									<Progress value={Number(w.borPercentage)} className="flex-1" />
									<span className="text-muted-foreground w-16 text-right text-sm">
										{w.borPercentage}%
									</span>
									<span className="text-muted-foreground text-xs">
										({w.occupiedBeds}/{w.totalBeds})
									</span>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
