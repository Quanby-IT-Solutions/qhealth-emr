"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, FileDown, AlertCircle, ExternalLink } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useMmConditionQuery, useExportMmPdfMutation } from "@/features/surveillance/mortality-morbidity/api/mm.hooks"

const AGE_BANDS = ["<1", "1-4", "5-14", "15-24", "25-44", "45-64", "65+"] as const

export default function MmDrilldownPage() {
	const params = useParams<{ icdCode: string }>()
	const router = useRouter()
	const icdCode = decodeURIComponent(params.icdCode)

	const { data: profile, isLoading: profileLoading } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId
	const currentYear = new Date().getFullYear()
	const [quarter, setQuarter] = useState<string>("all")
	const [exportResult, setExportResult] = useState<string | null>(null)

	const q = quarter === "all" ? undefined : (Number(quarter) as 1 | 2 | 3 | 4)

	const { data, isLoading, isError } = useMmConditionQuery(
		{ facilityId: facilityId ?? "", icdCode, year: currentYear, quarter: q },
		{ enabled: !!facilityId }
	)

	const exportMut = useExportMmPdfMutation()

	const demographics = data?.demographics ?? []

	function handleExportPdf() {
		if (!facilityId) return
		exportMut.mutate(
			{ facilityId, type: "morbidity", year: currentYear, quarter: q },
			{
				onSuccess: (res) => setExportResult(res.message),
				onError: (err) => setExportResult(err instanceof Error ? err.message : "Export failed."),
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
			<div className="flex items-center gap-3">
				<Button variant="ghost" size="sm" onClick={() => router.back()}>
					<ArrowLeft className="size-4" />
					Back
				</Button>
				<div>
					<h1 className="text-xl font-semibold">
						{data?.diseaseName ?? icdCode}
					</h1>
					<div className="flex items-center gap-2 mt-0.5">
						<Badge variant="outline" className="font-mono text-xs">{icdCode}</Badge>
						{data && (
							<span className="text-sm text-muted-foreground">
								{data.totalCount} case{data.totalCount !== 1 ? "s" : ""}
							</span>
						)}
					</div>
				</div>
				<div className="ml-auto flex items-center gap-2">
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
					<Button variant="outline" size="sm" onClick={handleExportPdf} disabled={exportMut.isPending || !data}>
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

			{isLoading ? (
				<Card>
					<CardContent className="py-8 text-center text-sm text-muted-foreground">
						Loading demographic data…
					</CardContent>
				</Card>
			) : isError ? (
				<Card>
					<CardContent className="py-8 text-center text-sm text-destructive">
						Failed to load condition data. Verify that {icdCode} exists in the selected period.
					</CardContent>
				</Card>
			) : !data || demographics.length === 0 ? (
				<Card>
					<CardContent className="py-8 text-center text-sm text-muted-foreground">
						No cases for {icdCode} in {currentYear}{quarter !== "all" ? ` Q${quarter}` : ""}.
					</CardContent>
				</Card>
			) : (
				<div className="space-y-4">
					{/* Summary row */}
					<div className="grid gap-3 sm:grid-cols-3">
						<Card>
							<CardContent className="flex items-center justify-between p-4">
								<span className="text-sm text-muted-foreground">Total Cases</span>
								<span className="text-2xl font-bold">{data.totalCount}</span>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="flex items-center justify-between p-4">
								<span className="text-sm text-muted-foreground">Male</span>
								<span className="text-2xl font-bold">
									{demographics.reduce((s, d) => s + d.male, 0)}
								</span>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="flex items-center justify-between p-4">
								<span className="text-sm text-muted-foreground">Female</span>
								<span className="text-2xl font-bold">
									{demographics.reduce((s, d) => s + d.female, 0)}
								</span>
							</CardContent>
						</Card>
					</div>

					{/* Demographic breakdown table */}
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">Demographic Breakdown by Age Band</CardTitle>
						</CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Age Band</TableHead>
										<TableHead className="text-right">Male</TableHead>
										<TableHead className="text-right">Female</TableHead>
										<TableHead className="text-right">Unknown</TableHead>
										<TableHead className="text-right">Total</TableHead>
										<TableHead className="text-right">%</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{AGE_BANDS.map((band) => {
										const row = demographics.find((d) => d.ageBand === band)
										const total = row?.total ?? 0
										const pct = data.totalCount > 0 ? ((total / data.totalCount) * 100).toFixed(1) : "0.0"
										return (
											<TableRow key={band}>
												<TableCell className="font-medium">{band}</TableCell>
												<TableCell className="text-right">{row?.male ?? 0}</TableCell>
												<TableCell className="text-right">{row?.female ?? 0}</TableCell>
												<TableCell className="text-right">{row?.unknown ?? 0}</TableCell>
												<TableCell className="text-right font-medium">{total}</TableCell>
												<TableCell className="text-right text-muted-foreground">{pct}%</TableCell>
											</TableRow>
										)
									})}
									<TableRow className="border-t-2 font-bold bg-muted/30">
										<TableCell>Total</TableCell>
										<TableCell className="text-right">{demographics.reduce((s, d) => s + d.male, 0)}</TableCell>
										<TableCell className="text-right">{demographics.reduce((s, d) => s + d.female, 0)}</TableCell>
										<TableCell className="text-right">{demographics.reduce((s, d) => s + d.unknown, 0)}</TableCell>
										<TableCell className="text-right">{data.totalCount}</TableCell>
										<TableCell className="text-right">100%</TableCell>
									</TableRow>
								</TableBody>
							</Table>
						</CardContent>
					</Card>

					{data.encounters && data.encounters.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="text-sm">Source Encounters (read-only, up to 100)</CardTitle>
							</CardHeader>
							<CardContent>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Patient</TableHead>
											<TableHead>MRN</TableHead>
											<TableHead>Admitted</TableHead>
											<TableHead>Discharged</TableHead>
											<TableHead>Disposition</TableHead>
											<TableHead className="w-10"></TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{data.encounters.map((enc) => (
											<TableRow key={enc.encounterId}>
												<TableCell>{enc.patientName ?? "—"}</TableCell>
												<TableCell className="font-mono text-xs">{enc.patientMrn ?? "—"}</TableCell>
												<TableCell className="text-sm">{enc.admissionDate ? new Date(enc.admissionDate).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—"}</TableCell>
												<TableCell className="text-sm">{enc.dischargeDate ? new Date(enc.dischargeDate).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—"}</TableCell>
												<TableCell>{enc.disposition ?? "—"}</TableCell>
												<TableCell>
													<a
														href={`/patients/search?encounterId=${enc.encounterId}`}
														target="_blank"
														rel="noreferrer"
														title="View encounter"
														className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
													>
														<ExternalLink className="size-3" />
													</a>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					)}

					<p className="text-xs text-muted-foreground">
						Period: {currentYear}{quarter !== "all" ? ` Q${quarter}` : " (Annual)"}
						{" · "}Source: finalized ICD-10 codes from signed clinical notes.
					</p>
				</div>
			)}
		</div>
	)
}
