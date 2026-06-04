"use client"

import Link from "next/link"
import { ArrowLeft01FreeIcons, CheckmarkCircle01FreeIcons } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button, buttonVariants } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import { cn } from "@/core/lib/utils"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useBedListQuery, useUpdateBedStatusMutation } from "@/features/beds/api/beds.hooks"

function timeSince(dateValue: Date | string | undefined | null): string {
	if (!dateValue) return "—"
	const ms = Date.now() - new Date(dateValue).getTime()
	const mins = Math.floor(ms / 60_000)
	const hours = Math.floor(mins / 60)
	const days = Math.floor(hours / 24)
	if (days > 0) return `${days}d ${hours % 24}h ago`
	if (hours > 0) return `${hours}h ${mins % 60}m ago`
	return `${mins}m ago`
}

export function HousekeepingPanel() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	const { data: bedData, isLoading } = useBedListQuery(
		{ facilityId, status: "dirty" },
		{ enabled: !!facilityId }
	)
	const updateBedStatus = useUpdateBedStatusMutation()

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
				Loading housekeeping queue…
			</div>
		)
	}

	const dirtyBeds = (bedData?.wards ?? []).flatMap(ward =>
		ward.beds
			.filter(bed => bed.status === "dirty")
			.map(bed => ({ ...bed, wardName: ward.name, wardType: ward.wardType }))
	)

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link
					href="/beds"
					className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5")}
				>
					<HugeiconsIcon icon={ArrowLeft01FreeIcons} className="size-4" />
					Bed Management
				</Link>
			</div>

			<div>
				<h1 className="text-xl font-semibold">Housekeeping Queue</h1>
				<p className="text-muted-foreground text-sm">
					Beds marked dirty after discharge — confirm cleaning to return them to the available pool.
				</p>
			</div>

			{dirtyBeds.length === 0 ? (
				<Card>
					<CardContent className="py-12 text-center">
						<HugeiconsIcon
							icon={CheckmarkCircle01FreeIcons}
							className="mx-auto mb-3 size-8 text-green-500"
						/>
						<p className="font-medium text-green-700 dark:text-green-400">All beds are clean</p>
						<p className="text-muted-foreground mt-1 text-sm">
							No beds pending housekeeping at this time.
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="rounded-lg border">
					<table className="w-full text-sm">
						<thead>
							<tr className="bg-muted/50 border-b">
								<th className="px-4 py-3 text-left font-medium">Ward</th>
								<th className="px-4 py-3 text-left font-medium">Bed</th>
								<th className="px-4 py-3 text-left font-medium">Time since discharge</th>
								<th className="px-4 py-3 text-right font-medium">Action</th>
							</tr>
						</thead>
						<tbody>
							{dirtyBeds.map(bed => (
								<tr key={bed.id} className="hover:bg-muted/30 border-b last:border-0">
									<td className="px-4 py-3">
										<span className="font-medium">{bed.wardName}</span>
										<span className="text-muted-foreground ml-2 text-xs capitalize">
											{bed.wardType}
										</span>
									</td>
									<td className="px-4 py-3 font-medium">{bed.bedNumber}</td>
									<td className="text-muted-foreground px-4 py-3">
										{timeSince((bed as { updatedAt?: Date | string }).updatedAt)}
									</td>
									<td className="px-4 py-3 text-right">
										<Button
											size="sm"
											variant="outline"
											className="h-7 px-3 text-xs"
											disabled={updateBedStatus.isPending}
											onClick={() => updateBedStatus.mutate({ id: bed.id, status: "available" })}
										>
											Mark Cleaned
										</Button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
					<div className="text-muted-foreground px-4 py-2 text-xs">
						{dirtyBeds.length} bed{dirtyBeds.length === 1 ? "" : "s"} pending cleaning
					</div>
				</div>
			)}
		</div>
	)
}
