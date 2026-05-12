"use client"

import { useState } from "react"
import { AlertCircle, CheckCircle, Download, Lock } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Progress } from "@/core/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Switch } from "@/core/components/ui/switch"
import { Label } from "@/core/components/ui/label"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useValidateAhsrQuery, useExportAhsrMutation } from "@/features/surveillance/ahsr/api/ahsr.hooks"

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
				onSuccess: (data) => {
					setResult({ type: data.success ? "success" : "error", message: data.message })
				},
				onError: (err) => {
					setResult({ type: "error", message: err instanceof Error ? err.message : "Export failed." })
				},
			}
		)
	}

	if (profileLoading) {
		return (
			<Card>
				<CardContent className="py-8 text-center text-sm text-muted-foreground">Loading…</CardContent>
			</Card>
		)
	}

	if (!facilityId) {
		return (
			<Card>
				<CardContent className="py-8 text-center text-sm text-muted-foreground">
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
					<p className="text-sm text-muted-foreground">Download DOH-format AHSR report for the selected period.</p>
				</div>
				<Select value={quarter} onValueChange={(v) => setQuarter(v ?? "all")}>
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
				<div className={`flex items-center gap-3 rounded-md border px-4 py-3 ${result.type === "success" ? "border-green-300 bg-green-50 text-green-800" : "border-red-300 bg-red-50 text-red-800"}`}>
					{result.type === "success" ? <CheckCircle className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
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
						<p className="text-sm text-muted-foreground">Checking readiness…</p>
					) : (
						<>
							<div className="flex items-center justify-between text-sm">
								<span className="font-medium">{readiness.toFixed(1)}%</span>
								<span className="text-muted-foreground">Threshold: {READINESS_THRESHOLD}%</span>
							</div>
							<Progress value={readiness} className="h-2" />
							{belowThreshold ? (
								<div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
									<AlertCircle className="size-4 shrink-0 mt-0.5" />
									<div>
										<p className="font-medium">Readiness below threshold</p>
										<p className="text-xs mt-0.5">
											{validation?.total ?? 0} data quality issue{validation?.total !== 1 ? "s" : ""} remain.
											Resolve in Validation before exporting, or use admin override.
										</p>
									</div>
								</div>
							) : (
								<p className="text-xs text-green-700 flex items-center gap-1">
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
							<p className="font-mono text-xs mt-1">{facilityId}</p>
						</div>
						<div>
							<span className="text-muted-foreground">Period</span>
							<p className="font-medium mt-1">
								{currentYear}{quarter !== "all" ? ` — Q${quarter}` : " (Annual)"}
							</p>
						</div>
					</div>

					<div className="flex items-center justify-between rounded-md border p-3">
						<div className="space-y-0.5">
							<Label htmlFor="admin-override" className="text-sm font-medium flex items-center gap-1">
								<Lock className="size-3" />
								Admin Override
							</Label>
							<p className="text-xs text-muted-foreground">Allow export below readiness threshold. This will be recorded.</p>
						</div>
						<Switch
							id="admin-override"
							checked={adminOverride}
							onCheckedChange={setAdminOverride}
						/>
					</div>

					{adminOverride && belowThreshold && (
						<div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
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
								<Lock className="size-4 mr-2" />
								Export Locked — Resolve Issues First
							</>
						) : (
							<>
								<Download className="size-4 mr-2" />
								Export AHSR — {currentYear}{quarter !== "all" ? ` Q${quarter}` : ""}
							</>
						)}
					</Button>

					{!canExport && (
						<p className="text-xs text-center text-muted-foreground">
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
					<ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
						<li>Bed Occupancy Rate (BOR)</li>
						<li>Total Admissions, Discharges, Deaths</li>
						<li>Gross & Net Death Rates</li>
						<li>Top 10 Morbidities</li>
						<li>Top 10 Mortalities</li>
						<li>HAI Incidence Metrics</li>
						<li>AHSR Readiness Score</li>
					</ul>
					<p className="text-xs text-muted-foreground mt-3">Output format matches the DOH AHSR template.</p>
					{validation && (
						<div className="mt-3 flex items-center gap-2">
							<Badge variant="secondary">Snapshot ID</Badge>
							<span className="text-xs text-muted-foreground">Generated on export</span>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
