"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { TrendingDown, TrendingUp, Minus, FileDown, AlertCircle } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useMmTop10Query, useExportMmPdfMutation } from "../api/mm.hooks"

function RankChange({ change }: { change: number | null }) {
	if (change === null) return <span className="text-muted-foreground">—</span>
	if (change > 0) return <span className="flex items-center gap-1 text-green-600"><TrendingDown className="size-3" />{change}</span>
	if (change < 0) return <span className="flex items-center gap-1 text-destructive"><TrendingUp className="size-3" />{Math.abs(change)}</span>
	return <Minus className="size-3 text-muted-foreground" />
}

const AGE_BAND_OPTIONS = ["<1", "1-4", "5-14", "15-24", "25-44", "45-64", "65+"] as const
type AgeBand = typeof AGE_BAND_OPTIONS[number]

export function MmReportClient() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const type = (searchParams.get("type") ?? "mortality") as "mortality" | "morbidity"
	const quarter = searchParams.get("quarter") ?? "all"
	const sex = searchParams.get("sex") ?? "all"
	const ageBand = searchParams.get("ageBand") ?? "all"
	const currentYear = new Date().getFullYear()
	const [exportResult, setExportResult] = useState<string | null>(null)
	const exportMut = useExportMmPdfMutation()

	function updateParam(key: string, value: string) {
		const params = new URLSearchParams(searchParams.toString())
		value === "all" ? params.delete(key) : params.set(key, value)
		router.replace(`?${params.toString()}`, { scroll: false })
	}

	function setType(value: "mortality" | "morbidity") {
		const params = new URLSearchParams(searchParams.toString())
		value === "mortality" ? params.delete("type") : params.set("type", value)
		router.replace(`?${params.toString()}`, { scroll: false })
	}

	function setQuarter(value: string) { updateParam("quarter", value) }
	function setSex(value: string) { updateParam("sex", value) }
	function setAgeBand(value: string) { updateParam("ageBand", value) }

	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId

	function handleExportPdf() {
		if (!facilityId) return
		setExportResult(null)
		exportMut.mutate(
			{ facilityId, type, year: currentYear, quarter: quarter === "all" ? undefined : (Number(quarter) as 1 | 2 | 3 | 4) },
			{
				onSuccess: (res) => setExportResult(res.message),
				onError: (err) => setExportResult(err instanceof Error ? err.message : "Export failed."),
			}
		)
	}

	const { data, isLoading } = useMmTop10Query({
		facilityId: facilityId ?? "",
		type,
		year: currentYear,
		quarter: quarter === "all" ? undefined : (Number(quarter) as 1 | 2 | 3 | 4),
		sex: sex === "all" ? undefined : (sex as "M" | "F"),
		ageBand: ageBand === "all" ? undefined : (ageBand as AgeBand),
	})

	const items = data?.items ?? []

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-3">
				<TrendingUp className="size-5 text-primary" />
				<div>
					<h1 className="text-xl font-semibold">Mortality & Morbidity Report</h1>
					<p className="text-sm text-muted-foreground">
						Top-10 causes · {currentYear}
					</p>
				</div>
				<div className="ml-auto">
					<Button
						variant="outline"
						size="sm"
						onClick={handleExportPdf}
						disabled={exportMut.isPending || !facilityId || isLoading}
					>
						<FileDown className="size-4 mr-1.5" />
						{exportMut.isPending ? "Exporting…" : "Export PDF"}
					</Button>
				</div>
			</div>

			{exportResult && (
				<div className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm text-muted-foreground">
					<AlertCircle className="size-4 shrink-0" />
					{exportResult}
				</div>
			)}

			<div className="flex flex-wrap items-center gap-3">
				<div className="flex gap-2 border-b">
					{(["mortality", "morbidity"] as const).map((t) => (
						<button
							key={t}
							onClick={() => setType(t)}
							className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${
								type === t
									? "border-primary text-primary"
									: "border-transparent text-muted-foreground hover:text-foreground"
							}`}
						>
							{t}
						</button>
					))}
				</div>
				<Select value={quarter} onValueChange={(v) => setQuarter(v ?? "all")}>
					<SelectTrigger className="w-[140px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Full Year</SelectItem>
						<SelectItem value="1">Q1 (Jan–Mar)</SelectItem>
						<SelectItem value="2">Q2 (Apr–Jun)</SelectItem>
						<SelectItem value="3">Q3 (Jul–Sep)</SelectItem>
						<SelectItem value="4">Q4 (Oct–Dec)</SelectItem>
					</SelectContent>
				</Select>
				<Select value={sex} onValueChange={(v) => setSex(v ?? "all")}>
					<SelectTrigger className="w-[120px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Sex</SelectItem>
						<SelectItem value="M">Male</SelectItem>
						<SelectItem value="F">Female</SelectItem>
					</SelectContent>
				</Select>
				<Select value={ageBand} onValueChange={(v) => setAgeBand(v ?? "all")}>
					<SelectTrigger className="w-[140px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Ages</SelectItem>
						{AGE_BAND_OPTIONS.map((band) => (
							<SelectItem key={band} value={band}>{band} yrs</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{!facilityId ? (
				<Card>
					<CardContent className="py-8 text-center text-sm text-muted-foreground">
						No facility assigned. Contact your administrator.
					</CardContent>
				</Card>
			) : isLoading ? (
				<Card>
					<CardContent className="py-8 text-center text-sm text-muted-foreground">
						Loading top-10 {type} data…
					</CardContent>
				</Card>
			) : items.length === 0 ? (
				<Card>
					<CardContent className="py-8 text-center text-sm text-muted-foreground">
						No {type} data found for the selected period.
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardHeader>
						<CardTitle className="text-sm">
							Top {items.length} {type === "mortality" ? "Causes of Death" : "Morbidity Causes"} — {currentYear}{quarter !== "all" ? ` Q${quarter}` : ""}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-12">Rank</TableHead>
									<TableHead>ICD-10</TableHead>
									<TableHead>Condition</TableHead>
									<TableHead className="text-right">Count</TableHead>
									<TableHead className="text-right">%</TableHead>
									<TableHead className="text-right">vs Prior</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{items.map((item) => (
									<TableRow key={item.icdCode} className="cursor-pointer hover:bg-accent/50">
										<TableCell className="font-bold">{item.rank}</TableCell>
										<TableCell>
											<Link
												href={`/surveillance/mortality-morbidity/${encodeURIComponent(item.icdCode)}`}
												className="hover:underline"
											>
												<Badge variant="outline" className="font-mono text-xs">{item.icdCode}</Badge>
											</Link>
										</TableCell>
										<TableCell className="max-w-[200px] truncate">
											<Link
												href={`/surveillance/mortality-morbidity/${encodeURIComponent(item.icdCode)}`}
												className="hover:underline"
											>
												{item.diseaseName}
											</Link>
										</TableCell>
										<TableCell className="text-right font-medium">{item.count}</TableCell>
										<TableCell className="text-right text-muted-foreground">{item.percentage.toFixed(1)}%</TableCell>
										<TableCell className="text-right"><RankChange change={item.rankChange} /></TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
