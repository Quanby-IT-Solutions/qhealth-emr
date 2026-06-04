"use client"

import { useState } from "react"
import { AlertCircle, CheckCircle, Download, Lock } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Label } from "@/core/components/ui/label"
import { Progress } from "@/core/components/ui/progress"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Switch } from "@/core/components/ui/switch"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import {
	useExportAhsrMutation,
	useValidateAhsrQuery,
} from "@/features/surveillance/ahsr/api/ahsr.hooks"

const READINESS_THRESHOLD = 95

export default function AhsrExportPage() {
	const { data: profile, isLoading: profileLoading } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId
	const currentYear = new Date().getFullYear()
	const [quarter, setQuarter] = useState<string>("all")
	const [adminOverride, setAdminOverride] = useState(false)
	const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null)

	const q = quarter === "all" ? undefined : (Number(quarter) as 1 | 2 | 3 | 4)

	const { data: validation, isLoading: validationLoading } = useValidateAhsrQuery(
		{ facilityId: facilityId ?? "", year: currentYear, quarter: q },
		{ enabled: !!facilityId }
	)
	const exportMut = useExportAhsrMutation()

	const readiness = validation?.readinessPercent ?? 0
	const belowThreshold = readiness < READINESS_THRESHOLD
	const canExport = !belowThreshold || adminOverride

	function handleExport() {
		if (!facilityId || !canExport) return
		setResult(null)
		exportMut.mutate(
			{ facilityId, year: currentYear, month: q ? q * 3 : undefined },
			{
				onSuccess: data => {
					setResult({ type: data.success ? "success" : "error", message: data.message })
				},
				onError: err => {
					setResult({
						type: "error",
						message: err instanceof Error ? err.message : "Export failed.",
					})
				},
			}
		)
	}

	if (profileLoading) {
		return (
			<Card>
				<CardContent className="text-muted-foreground py-8 text-center text-sm">
					Loading…
				</CardContent>
			</Card>
		)
	}

	if (!facilityId) {
		return (
			<Card>
				<CardContent className="text-muted-foreground py-8 text-center text-sm">
					No facility assigned to your profile. Contact your administrator.
				</CardContent>
			</Card>
		)
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-xl font-semibold">AHSR Export</h1>
					<p className="text-muted-foreground text-sm">
						Download DOH-format AHSR report for the selected period.
					</p>
				</div>
				<Select value={quarter} onValueChange={v => setQuarter(v ?? "all")}>
					<SelectTrigger className="w-[140px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Annual</SelectItem>
						<SelectItem value="1">Q1 (Jan–Mar)</SelectItem>
						<SelectItem value="2">Q2 (Apr–Jun)</SelectItem>
						<SelectItem value="3">Q3 (Jul–Sep)</SelectItem>
						<SelectItem value="4">Q4 (Oct–Dec)</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{result && (
				<div
					className={`flex items-center gap-3 rounded-md border px-4 py-3 ${result.type === "success" ? "border-green-300 bg-green-50 text-green-800" : "border-red-300 bg-red-50 text-red-800"}`}
				>
					{result.type === "success" ? (
						<CheckCircle className="size-4 shrink-0" />
					) : (
						<AlertCircle className="size-4 shrink-0" />
					)}
					<span className="text-sm">{result.message}</span>
				</div>
			)}

			{/* Readiness gate */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Data Readiness</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{validationLoading ? (
						<p className="text-muted-foreground text-sm">Checking readiness…</p>
					) : (
						<>
							<div className="flex items-center justify-between text-sm">
								<span className="font-medium">{readiness.toFixed(1)}%</span>
								<span className="text-muted-foreground">Threshold: {READINESS_THRESHOLD}%</span>
							</div>
							<Progress value={readiness} className="h-2" />
							{belowThreshold ? (
								<div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
									<AlertCircle className="mt-0.5 size-4 shrink-0" />
									<div>
										<p className="font-medium">Readiness below threshold</p>
										<p className="mt-0.5 text-xs">
											{validation?.total ?? 0} data quality issue
											{validation?.total !== 1 ? "s" : ""} remain. Resolve in Validation before
											exporting, or use admin override.
										</p>
									</div>
								</div>
							) : (
								<p className="flex items-center gap-1 text-xs text-green-700">
									<CheckCircle className="size-3" />
									Data quality meets the {READINESS_THRESHOLD}% threshold.
								</p>
							)}
						</>
					)}
				</CardContent>
			</Card>

			{/* Export config */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Export Configuration</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span className="text-muted-foreground">Facility ID</span>
							<p className="mt-1 font-mono text-xs">{facilityId}</p>
						</div>
						<div>
							<span className="text-muted-foreground">Period</span>
							<p className="mt-1 font-medium">
								{currentYear}
								{quarter !== "all" ? ` — Q${quarter}` : " (Annual)"}
							</p>
						</div>
					</div>

					<div className="flex items-center justify-between rounded-md border p-3">
						<div className="space-y-0.5">
							<Label
								htmlFor="admin-override"
								className="flex items-center gap-1 text-sm font-medium"
							>
								<Lock className="size-3" />
								Admin Override
							</Label>
							<p className="text-muted-foreground text-xs">
								Allow export below readiness threshold. This will be recorded.
							</p>
						</div>
						<Switch
							id="admin-override"
							checked={adminOverride}
							onCheckedChange={setAdminOverride}
						/>
					</div>

					{adminOverride && belowThreshold && (
						<div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
							<AlertCircle className="size-3 shrink-0" />
							Admin override active — export will proceed with {readiness.toFixed(1)}% readiness.
						</div>
					)}

					<Button
						className="w-full"
						onClick={handleExport}
						disabled={!canExport || exportMut.isPending || validationLoading}
					>
						{exportMut.isPending ? (
							"Exporting…"
						) : !canExport ? (
							<>
								<Lock className="mr-2 size-4" />
								Export Locked — Resolve Issues First
							</>
						) : (
							<>
								<Download className="mr-2 size-4" />
								Export AHSR — {currentYear}
								{quarter !== "all" ? ` Q${quarter}` : ""}
							</>
						)}
					</Button>

					{!canExport && (
						<p className="text-muted-foreground text-center text-xs">
							Go to{" "}
							<a href="/surveillance/ahsr/validate" className="underline underline-offset-2">
								AHSR Validation
							</a>{" "}
							to resolve data quality issues.
						</p>
					)}
				</CardContent>
			</Card>

			{/* Period summary */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">What Gets Exported</CardTitle>
				</CardHeader>
				<CardContent>
					<ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
						<li>Bed Occupancy Rate (BOR)</li>
						<li>Total Admissions, Discharges, Deaths</li>
						<li>Gross & Net Death Rates</li>
						<li>Top 10 Morbidities</li>
						<li>Top 10 Mortalities</li>
						<li>HAI Incidence Metrics</li>
						<li>AHSR Readiness Score</li>
					</ul>
					<p className="text-muted-foreground mt-3 text-xs">
						Output format matches the DOH AHSR template.
					</p>
					{validation && (
						<div className="mt-3 flex items-center gap-2">
							<Badge variant="secondary">Snapshot ID</Badge>
							<span className="text-muted-foreground text-xs">Generated on export</span>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
