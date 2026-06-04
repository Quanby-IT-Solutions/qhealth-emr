"use client"

import Link from "next/link"
import { RefreshCw, ShieldCheck } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"
import { cn } from "@/core/lib/utils"
import { useAncillaryQueueQuery } from "@/features/msw/ancillary-clearance/api/clearance.hooks"

const SLA_THRESHOLD_MINUTES = 15

export function AncillaryClearanceClient() {
	const { data: orders, isLoading, error, refetch, dataUpdatedAt } = useAncillaryQueueQuery({})

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-xl font-semibold">Ancillary Service Clearance</h1>
					<p className="text-muted-foreground text-sm">Story 12.11 · Flow L11</p>
				</div>
				<div className="flex items-center gap-2">
					{dataUpdatedAt > 0 && (
						<p className="text-muted-foreground text-xs">
							Last refreshed: {new Date(dataUpdatedAt).toLocaleTimeString()}
						</p>
					)}
					<Button variant="outline" size="sm" className="gap-1.5" onClick={() => void refetch()}>
						<RefreshCw className="size-4" />
						Refresh
					</Button>
				</div>
			</div>

			{isLoading && (
				<div className="space-y-2">
					{[1, 2, 3].map(i => (
						<Skeleton key={i} className="h-20 w-full rounded-lg" />
					))}
				</div>
			)}

			{error && (
				<Card>
					<CardContent className="text-destructive py-8 text-center text-sm">
						Failed to load queue. Please try again.
					</CardContent>
				</Card>
			)}

			{!isLoading && !error && (!orders || orders.length === 0) && (
				<Card>
					<CardContent className="text-muted-foreground py-8 text-center text-sm">
						No orders awaiting clearance.
					</CardContent>
				</Card>
			)}

			{!isLoading && !error && orders && orders.length > 0 && (
				<div className="space-y-2">
					{orders.map(order => (
						<Card key={order.orderId}>
							<CardContent className="flex items-center justify-between py-4">
								<div className="space-y-1">
									<p className="text-sm font-medium">{order.patientName ?? order.orderId}</p>
									<div className="flex items-center gap-2">
										<Badge variant="outline">{order.ancillaryType}</Badge>
										<span
											className={cn(
												"rounded-full px-2 py-0.5 text-xs font-medium",
												order.waitTimeMinutes >= SLA_THRESHOLD_MINUTES
													? "bg-destructive/10 text-destructive"
													: "bg-muted text-muted-foreground"
											)}
										>
											{order.waitTimeMinutes} min wait
											{order.waitTimeMinutes >= SLA_THRESHOLD_MINUTES && " ⚠ SLA exceeded"}
										</span>
									</div>
								</div>
								<Link
									href={`/msw/ancillary-clearance/${order.orderId}?encounterId=${order.encounterId}`}
								>
									<Button size="sm" className="gap-1.5">
										<ShieldCheck className="size-4" />
										Review
									</Button>
								</Link>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	)
}
