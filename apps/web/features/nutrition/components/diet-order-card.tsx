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

	const activeOrders = data?.orders.filter(o => o.status === "active") ?? []
	const latestOrder = activeOrders[0]

	if (isLoading) {
		return compact ? (
			<p className="text-muted-foreground text-xs">Loading diet order…</p>
		) : (
			<Card>
				<CardContent className="text-muted-foreground py-6 text-center text-sm">
					Loading diet orders…
				</CardContent>
			</Card>
		)
	}

	if (!latestOrder) {
		return compact ? (
			<p className="text-muted-foreground text-xs italic">No active diet order</p>
		) : (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-base">
						<Utensils className="text-muted-foreground size-4" />
						Diet Order
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-sm">No active diet order for this encounter.</p>
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
					<Badge variant="outline" className="py-0 text-xs">
						Active
					</Badge>
				</div>
				{latestOrder.texture && (
					<p className="text-muted-foreground text-xs">Texture: {latestOrder.texture}</p>
				)}
				{latestOrder.liquidConsistency && (
					<p className="text-muted-foreground text-xs">Liquid: {latestOrder.liquidConsistency}</p>
				)}
				{latestOrder.calories && (
					<p className="text-muted-foreground text-xs">Target: {latestOrder.calories} kcal/day</p>
				)}
				{latestOrder.restrictions.length > 0 && (
					<p className="text-muted-foreground text-xs">
						Restrictions: {latestOrder.restrictions.join(", ")}
					</p>
				)}
				<p className="text-muted-foreground text-xs">Ordered by {latestOrder.orderedByName}</p>
			</div>
		)
	}

	// ── Full card display ─────────────────────────────────────────────────────
	return (
		<Card>
			<CardHeader className="flex flex-row items-start justify-between">
				<CardTitle className="flex items-center gap-2 text-base">
					<Utensils className="text-muted-foreground size-4" />
					Current Diet Order
				</CardTitle>
				<Badge variant="outline" className="text-xs">
					Active
				</Badge>
			</CardHeader>
			<CardContent className="grid gap-4 sm:grid-cols-2">
				<div>
					<p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
						Diet Type
					</p>
					<p className="text-sm font-medium">{latestOrder.dietType}</p>
				</div>

				{latestOrder.texture && (
					<div>
						<p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
							Texture
						</p>
						<p className="text-sm">{latestOrder.texture}</p>
					</div>
				)}

				{latestOrder.liquidConsistency && (
					<div>
						<p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
							Liquid Consistency
						</p>
						<p className="text-sm">{latestOrder.liquidConsistency}</p>
					</div>
				)}

				{latestOrder.calories && (
					<div>
						<p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
							Caloric Target
						</p>
						<p className="text-sm">{latestOrder.calories} kcal/day</p>
					</div>
				)}

				{latestOrder.restrictions.length > 0 && (
					<div className="sm:col-span-2">
						<p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
							Restrictions
						</p>
						<div className="flex flex-wrap gap-1.5">
							{latestOrder.restrictions.map(r => (
								<span key={r} className="bg-muted rounded-full border px-2.5 py-0.5 text-xs">
									{r}
								</span>
							))}
						</div>
					</div>
				)}

				<div className="mt-1 border-t pt-3 sm:col-span-2">
					<p className="text-muted-foreground text-xs">
						Ordered by <span className="font-medium">{latestOrder.orderedByName}</span> ·{" "}
						{new Date(latestOrder.orderedAt).toLocaleDateString(undefined, {
							day: "numeric",
							month: "short",
							year: "numeric",
							hour: "2-digit",
							minute: "2-digit",
						})}
					</p>
					<p className="text-muted-foreground mt-0.5 text-xs">
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
					<p className="text-muted-foreground text-xs">
						{activeOrders.length - 1} other active{" "}
						{activeOrders.length - 1 === 1 ? "order" : "orders"}
					</p>
				</div>
			)}
		</Card>
	)
}
