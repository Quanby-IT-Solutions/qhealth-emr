"use client"

import { Utensils } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"

import { useDietOrdersQuery } from "@/features/nutrition/api/nutrition.hooks"

interface DietOrderCardProps {
	encounterId: string
	/** Compact mode for use inside nursing tab or dense layouts */
	compact?: boolean
}

export function DietOrderCard({ encounterId, compact }: DietOrderCardProps) {
	const { data, isLoading } = useDietOrdersQuery(encounterId)

	const activeOrders = data?.orders.filter((o) => o.status === "active") ?? []
	const latestOrder = activeOrders[0]

	if (isLoading) {
		return compact ? (
			<p className="text-xs text-muted-foreground">Loading diet order…</p>
		) : (
			<Card>
				<CardContent className="py-6 text-center text-sm text-muted-foreground">
					Loading diet orders…
				</CardContent>
			</Card>
		)
	}

	if (!latestOrder) {
		return compact ? (
			<p className="text-xs text-muted-foreground italic">No active diet order</p>
		) : (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-base">
						<Utensils className="size-4 text-muted-foreground" />
						Diet Order
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						No active diet order for this encounter.
					</p>
				</CardContent>
			</Card>
		)
	}

	// ── Compact display (for nursing tab embedding) ──────────────────────────
	if (compact) {
		return (
			<div className="space-y-1 text-sm">
				<div className="flex items-center gap-2">
					<span className="font-medium">{latestOrder.dietType}</span>
					<Badge variant="outline" className="text-xs py-0">
						Active
					</Badge>
				</div>
				{latestOrder.texture && (
					<p className="text-xs text-muted-foreground">Texture: {latestOrder.texture}</p>
				)}
				{latestOrder.liquidConsistency && (
					<p className="text-xs text-muted-foreground">
						Liquid: {latestOrder.liquidConsistency}
					</p>
				)}
				{latestOrder.calories && (
					<p className="text-xs text-muted-foreground">
						Target: {latestOrder.calories} kcal/day
					</p>
				)}
				{latestOrder.restrictions.length > 0 && (
					<p className="text-xs text-muted-foreground">
						Restrictions: {latestOrder.restrictions.join(", ")}
					</p>
				)}
				<p className="text-xs text-muted-foreground">
					Ordered by {latestOrder.orderedByName}
				</p>
			</div>
		)
	}

	// ── Full card display ─────────────────────────────────────────────────────
	return (
		<Card>
			<CardHeader className="flex flex-row items-start justify-between">
				<CardTitle className="flex items-center gap-2 text-base">
					<Utensils className="size-4 text-muted-foreground" />
					Current Diet Order
				</CardTitle>
				<Badge variant="outline" className="text-xs">
					Active
				</Badge>
			</CardHeader>
			<CardContent className="grid gap-4 sm:grid-cols-2">
				<div>
					<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
						Diet Type
					</p>
					<p className="text-sm font-medium">{latestOrder.dietType}</p>
				</div>

				{latestOrder.texture && (
					<div>
						<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
							Texture
						</p>
						<p className="text-sm">{latestOrder.texture}</p>
					</div>
				)}

				{latestOrder.liquidConsistency && (
					<div>
						<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
							Liquid Consistency
						</p>
						<p className="text-sm">{latestOrder.liquidConsistency}</p>
					</div>
				)}

				{latestOrder.calories && (
					<div>
						<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
							Caloric Target
						</p>
						<p className="text-sm">{latestOrder.calories} kcal/day</p>
					</div>
				)}

				{latestOrder.restrictions.length > 0 && (
					<div className="sm:col-span-2">
						<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
							Restrictions
						</p>
						<div className="flex flex-wrap gap-1.5">
							{latestOrder.restrictions.map((r) => (
								<span
									key={r}
									className="rounded-full border bg-muted px-2.5 py-0.5 text-xs"
								>
									{r}
								</span>
							))}
						</div>
					</div>
				)}

				<div className="sm:col-span-2 border-t pt-3 mt-1">
					<p className="text-xs text-muted-foreground">
						Ordered by{" "}
						<span className="font-medium">{latestOrder.orderedByName}</span> ·{" "}
						{new Date(latestOrder.orderedAt).toLocaleDateString(undefined, {
							day: "numeric",
							month: "short",
							year: "numeric",
							hour: "2-digit",
							minute: "2-digit",
						})}
					</p>
					<p className="text-xs text-muted-foreground mt-0.5">
						Effective:{" "}
						{new Date(latestOrder.effectiveDate).toLocaleDateString(undefined, {
							day: "numeric",
							month: "short",
							year: "numeric",
						})}
					</p>
				</div>
			</CardContent>

			{/* Past orders count */}
			{activeOrders.length > 1 && (
				<div className="border-t px-6 py-3">
					<p className="text-xs text-muted-foreground">
						{activeOrders.length - 1} other active{" "}
						{activeOrders.length - 1 === 1 ? "order" : "orders"}
					</p>
				</div>
			)}
		</Card>
	)
}
