"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Skeleton } from "@/core/components/ui/skeleton"
import { KpiTile } from "@/features/admin/components/kpi-tile"
import { useActiveFacilityId } from "@/core/hooks/use-active-facility"

import { useBorDashboardQuery } from "../api/bor.hooks"
import { ExportModal } from "./export-modal"

const TREND_RANGES = [
	{ label: "7d", value: "7d" },
	{ label: "30d", value: "30d" },
	{ label: "90d", value: "90d" },
	{ label: "1y", value: "1y" },
] as const

type TrendRange = (typeof TREND_RANGES)[number]["value"]

function buildPlaceholderTrend(range: TrendRange, currentBor: number) {
	const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365
	const step = Math.max(1, Math.floor(days / 20))
	const result: { date: string; bor: number }[] = []
	const now = Date.now()
	for (let i = days; i >= 0; i -= step) {
		const d = new Date(now - i * 86400000)
		result.push({
			date: d.toLocaleDateString("en-PH", { month: "short", day: "numeric" }),
			bor: Math.max(0, Math.min(100, currentBor + (Math.random() - 0.5) * 10)),
		})
	}
	return result
}

function BorGauge({ pct }: { pct: number }) {
	const color = pct > 95 ? "text-red-600" : pct > 85 ? "text-amber-500" : "text-emerald-600"
	const radius = 40
	const circumference = 2 * Math.PI * radius
	const filled = (Math.min(pct, 100) / 100) * circumference

	return (
		<div className="flex flex-col items-center gap-1">
			<svg width="100" height="60" viewBox="0 0 100 60" className="overflow-visible">
				<path
					d={`M 10 50 A ${radius} ${radius} 0 0 1 90 50`}
					fill="none"
					stroke="currentColor"
					strokeWidth="8"
					className="text-muted"
				/>
				<path
					d={`M 10 50 A ${radius} ${radius} 0 0 1 90 50`}
					fill="none"
					strokeWidth="8"
					strokeDasharray={`${(filled / 2).toFixed(1)} ${(circumference / 2).toFixed(1)}`}
					strokeLinecap="round"
					className={color}
				/>
			</svg>
			<span className={`text-3xl font-bold tabular-nums ${color}`}>{pct.toFixed(1)}%</span>
			<span className="text-xs text-muted-foreground">Bed Occupancy Rate</span>
		</div>
	)
}


export function BorDashboard() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const facilityId = useActiveFacilityId()
	const [exportOpen, setExportOpen] = useState(false)

	const trendRange = (searchParams.get("range") ?? "7d") as TrendRange
	const wardFilter = searchParams.get("ward") ?? "all"

	function setParam(key: string, value: string) {
		const params = new URLSearchParams(searchParams.toString())
		if (value === "all" || value === "7d" && key === "range") {
			params.delete(key)
		} else {
			params.set(key, value)
		}
		router.replace(`?${params.toString()}`, { scroll: false })
	}

	const { data, isLoading, isError } = useBorDashboardQuery(facilityId ?? "", !!facilityId)

	if (!facilityId) return <p className="text-sm text-muted-foreground">No facility selected.</p>
	if (isLoading) return <Skeleton className="h-64 w-full" />
	if (isError) return <p className="text-sm text-destructive">Failed to load BOR data.</p>

	if (!data) {
		return (
			<div className="flex flex-col items-center justify-center py-20 text-center">
				<p className="text-muted-foreground">No BOR data available for the selected filters.</p>
				<p className="text-muted-foreground text-xs mt-1">Try adjusting the date range or ward selection.</p>
			</div>
		)
	}

	const o = data.overall
	const trendData = buildPlaceholderTrend(trendRange, o.borPercentage)
	const displayedWards = wardFilter === "all"
		? data.byWard
		: data.byWard.filter(w => w.wardId === wardFilter)

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center gap-3">
				<Select
					value={wardFilter}
					onValueChange={v => setParam("ward", v ?? "all")}
				>
					<SelectTrigger className="w-44">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Wards</SelectItem>
						{data.byWard.map(w => (
							<SelectItem key={w.wardId} value={w.wardId}>
								{w.wardName}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
					Export
				</Button>
			</div>

			<ExportModal open={exportOpen} onOpenChange={setExportOpen} defaultTitle="BOR Report" />

			<div className="flex justify-center py-4">
				<BorGauge pct={o.borPercentage} />
			</div>

			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
				<KpiTile label="Today's BOR" value={`${o.borPercentage.toFixed(1)}%`} />
				<KpiTile label="7-Day Avg" value="—" />
				<KpiTile label="Available Beds" value={o.availableBeds} />
				<KpiTile label="Occupied" value={o.occupiedBeds} />
				<KpiTile label="Reserved" value={o.reservedBeds} />
				<KpiTile label="Dirty / For Cleaning" value={o.cleaningBeds} />
			</div>

			<Card>
				<CardHeader className="pb-2">
					<div className="flex items-center justify-between">
						<CardTitle className="text-sm">BOR Trend</CardTitle>
						<div className="flex items-center gap-1">
							{TREND_RANGES.map(r => (
								<Button
									key={r.value}
									variant={trendRange === r.value ? "default" : "ghost"}
									size="sm"
									className="h-7 px-2 text-xs"
									onClick={() => setParam("range", r.value)}
								>
									{r.label}
								</Button>
							))}
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<ResponsiveContainer width="100%" height={160}>
						<AreaChart data={trendData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
							<defs>
								<linearGradient id="borGradient" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
									<stop offset="95%" stopColor="#10b981" stopOpacity={0} />
								</linearGradient>
							</defs>
							<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
							<XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
							<YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
							<Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, "BOR"]} />
							<Area
								type="monotone"
								dataKey="bor"
								stroke="#10b981"
								strokeWidth={2}
								fill="url(#borGradient)"
								dot={false}
							/>
						</AreaChart>
					</ResponsiveContainer>
					<p className="text-xs text-muted-foreground mt-1">
						Trend data will reflect live midnight snapshots once ADM-BE-06 is active.
					</p>
				</CardContent>
			</Card>

			{displayedWards.length > 0 && (
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm">By Ward</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{displayedWards.map(ward => (
								<div key={ward.wardId} className="flex items-center justify-between text-sm">
									<span className="font-medium">{ward.wardName}</span>
									<div className="flex items-center gap-4 text-muted-foreground">
										<span>{ward.occupiedBeds}/{ward.totalBeds}</span>
										<span className={`font-medium ${ward.borPercentage > 95 ? "text-red-600" : ward.borPercentage > 85 ? "text-amber-500" : "text-emerald-600"}`}>
											{ward.borPercentage.toFixed(1)}%
										</span>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
