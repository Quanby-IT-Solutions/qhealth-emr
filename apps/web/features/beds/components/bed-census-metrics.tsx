"use client"

import { TrendingDown, TrendingUp } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Progress } from "@/core/components/ui/progress"
import { Separator } from "@/core/components/ui/separator"

interface CensusWard {
	wardId: string
	wardName: string
	totalBeds: number
	occupiedBeds: number
	borPercentage: string | null
}

interface CensusData {
	date: string
	overall: {
		totalBeds: number
		occupiedBeds: number
		borPercentage: string
	}
	byWard: CensusWard[]
}

interface BedCensusMetricsProps {
	census: CensusData
}

function borColor(bor: number) {
	if (bor >= 90) return "text-red-600 dark:text-red-400"
	if (bor >= 75) return "text-yellow-600 dark:text-yellow-400"
	return "text-green-600 dark:text-green-400"
}

function borBadge(bor: number) {
	if (bor >= 90) return "destructive" as const
	if (bor >= 75) return "secondary" as const
	return "default" as const
}

export function BedCensusMetrics({ census }: BedCensusMetricsProps) {
	const bor = Number(census.overall.borPercentage)
	const available = census.overall.totalBeds - census.overall.occupiedBeds

	// Derived midnight census estimate (occupied beds at midnight — using current occupied as proxy)
	const midnightCensus = census.overall.occupiedBeds

	// Availability forecast: simple projection — flag if BOR trend >= 85%
	const highOccupancy = bor >= 85

	return (
		<div className="space-y-4">
			{/* Top metric cards */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
				<Card>
					<CardContent className="pt-6">
						<p className="text-muted-foreground text-sm">Total Beds</p>
						<p className="text-2xl font-bold">{census.overall.totalBeds}</p>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="pt-6">
						<p className="text-muted-foreground text-sm">Occupied</p>
						<p className="text-2xl font-bold text-red-600 dark:text-red-400">
							{census.overall.occupiedBeds}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="pt-6">
						<p className="text-muted-foreground text-sm">Available</p>
						<p className="text-2xl font-bold text-green-600 dark:text-green-400">{available}</p>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="pt-6">
						<p className="text-muted-foreground text-sm">BOR</p>
						<div className="flex items-center gap-2">
							<p className={`text-2xl font-bold ${borColor(bor)}`}>
								{census.overall.borPercentage}%
							</p>
							<Badge variant={borBadge(bor)} className="text-xs">
								{bor >= 90 ? "Critical" : bor >= 75 ? "High" : "Normal"}
							</Badge>
						</div>
						<Progress value={bor} className="mt-2" />
					</CardContent>
				</Card>

				<Card>
					<CardContent className="pt-6">
						<p className="text-muted-foreground text-sm">Midnight Census</p>
						<p className="text-2xl font-bold">{midnightCensus}</p>
						<p className="text-muted-foreground text-xs">
							as of {new Date(census.date).toLocaleDateString("en-PH")}
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Availability forecast banner */}
			{highOccupancy && (
				<div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 dark:border-yellow-900/50 dark:bg-yellow-900/20">
					<TrendingUp className="size-4 text-yellow-600 dark:text-yellow-400" />
					<p className="text-sm text-yellow-800 dark:text-yellow-300">
						High occupancy forecast — BOR exceeds 85%. Consider early discharge planning or
						diversion protocols.
					</p>
				</div>
			)}

			{!highOccupancy && available > 0 && (
				<div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-900/50 dark:bg-green-900/20">
					<TrendingDown className="size-4 text-green-600 dark:text-green-400" />
					<p className="text-sm text-green-800 dark:text-green-300">
						{available} bed{available !== 1 ? "s" : ""} available facility-wide.
					</p>
				</div>
			)}

			{/* Ward-level breakdown */}
			{census.byWard.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Ward-Level BOR</CardTitle>
					</CardHeader>
					<Separator />
					<CardContent className="pt-4">
						<div className="space-y-3">
							{census.byWard.map(ward => {
								const wardBor = Number(ward.borPercentage ?? 0)
								return (
									<div key={ward.wardId} className="flex items-center gap-4">
										<span className="w-40 truncate text-sm font-medium">{ward.wardName}</span>
										<Progress value={wardBor} className="flex-1" />
										<span className={`w-14 text-right text-sm font-medium ${borColor(wardBor)}`}>
											{ward.borPercentage ?? "—"}%
										</span>
										<span className="text-muted-foreground w-16 text-right text-xs">
											{ward.occupiedBeds}/{ward.totalBeds}
										</span>
									</div>
								)
							})}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
