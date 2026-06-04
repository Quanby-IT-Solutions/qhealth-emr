"use client"

import { useState } from "react"
import { AlertCircle, ExternalLink } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Progress } from "@/core/components/ui/progress"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useValidateAhsrQuery } from "@/features/surveillance/ahsr/api/ahsr.hooks"

const ISSUE_LABELS: Record<string, string> = {
	missing_icd10: "Missing ICD-10",
	deprecated_code: "Deprecated Code",
	no_finalized_note: "No Finalized Note",
}

function issueTypeBadge(type: string) {
	if (type === "missing_icd10") return <Badge variant="destructive">{ISSUE_LABELS[type]}</Badge>
	if (type === "deprecated_code")
		return (
			<Badge variant="outline" className="border-orange-400 text-orange-600">
				{ISSUE_LABELS[type]}
			</Badge>
		)
	return <Badge variant="secondary">{ISSUE_LABELS[type] ?? type}</Badge>
}

export default function AhsrValidatePage() {
	const { data: profile, isLoading: profileLoading } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId
	const currentYear = new Date().getFullYear()
	const [quarter, setQuarter] = useState<string>("all")
	const [selectedType, setSelectedType] = useState<string | null>(null)

	const q = quarter === "all" ? undefined : (Number(quarter) as 1 | 2 | 3 | 4)

	const { data, isLoading, isError } = useValidateAhsrQuery(
		{ facilityId: facilityId ?? "", year: currentYear, quarter: q },
		{ enabled: !!facilityId }
	)

	const readiness = data?.readinessPercent ?? 0
	const allIssues = data?.issues ?? []
	const issues = selectedType ? allIssues.filter(i => i.issueType === selectedType) : allIssues
	const issuesByType = data?.issuesByType ?? {}

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
					<h1 className="text-xl font-semibold">AHSR Validation</h1>
					<p className="text-muted-foreground text-sm">
						Data quality issues for the current reporting period.
					</p>
				</div>
				<Select value={quarter} onValueChange={v => setQuarter(v ?? "all")}>
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
			</div>

			{/* Readiness tile */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">
						AHSR Readiness — {currentYear}
						{quarter !== "all" ? ` Q${quarter}` : ""}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{isLoading ? (
						<p className="text-muted-foreground text-sm">Calculating readiness…</p>
					) : (
						<>
							<div className="flex items-center justify-between text-sm">
								<span className="font-medium">{readiness.toFixed(1)}%</span>
								<span className="text-muted-foreground">
									{data?.total ?? 0} issue{data?.total !== 1 ? "s" : ""} found
								</span>
							</div>
							<Progress value={readiness} className="h-2" />
							{readiness < 95 && (
								<p className="text-muted-foreground flex items-center gap-1 text-xs">
									<AlertCircle className="size-3 text-amber-500" />
									Readiness below 95% — export disabled until resolved.
								</p>
							)}
						</>
					)}
				</CardContent>
			</Card>

			{/* Issue type breakdown — click to filter */}
			{!isLoading && Object.keys(issuesByType).length > 0 && (
				<div className="grid gap-3 sm:grid-cols-3">
					{Object.entries(issuesByType).map(([type, count]) => {
						const active = selectedType === type
						return (
							<Card
								key={type}
								className={`cursor-pointer transition-shadow hover:shadow-md ${active ? "ring-primary ring-2" : ""}`}
								onClick={() => setSelectedType(active ? null : type)}
							>
								<CardContent className="flex items-center justify-between p-4">
									<div className="space-y-1">
										{issueTypeBadge(type)}
										{active && (
											<p className="text-muted-foreground text-xs">Click to clear filter</p>
										)}
									</div>
									<span className="text-2xl font-bold">{count}</span>
								</CardContent>
							</Card>
						)
					})}
				</div>
			)}

			{/* Issue list */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">
						{selectedType
							? `${ISSUE_LABELS[selectedType] ?? selectedType} — ${issues.length} issue${issues.length !== 1 ? "s" : ""}`
							: "Data Quality Issues"}
					</CardTitle>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<p className="text-muted-foreground py-6 text-center text-sm">Scanning encounters…</p>
					) : isError ? (
						<p className="text-destructive py-6 text-center text-sm">
							Failed to load validation results.
						</p>
					) : issues.length === 0 ? (
						<p className="text-muted-foreground py-6 text-center text-sm">
							No data quality issues found for this period.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Issue Type</TableHead>
									<TableHead>Patient</TableHead>
									<TableHead>MRN</TableHead>
									<TableHead>Detail</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="w-10"></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{issues.map(issue => (
									<TableRow key={issue.id}>
										<TableCell>{issueTypeBadge(issue.issueType)}</TableCell>
										<TableCell>{issue.patientName ?? "—"}</TableCell>
										<TableCell className="font-mono text-xs">{issue.patientMrn ?? "—"}</TableCell>
										<TableCell className="text-muted-foreground max-w-[200px] truncate text-xs">
											{issue.detail ?? "—"}
										</TableCell>
										<TableCell>
											<Badge variant={issue.status === "resolved" ? "default" : "outline"}>
												{issue.status}
											</Badge>
										</TableCell>
										<TableCell>
											{issue.encounterId && (
												<a
													href={`/patients/search?encounterId=${issue.encounterId}`}
													target="_blank"
													rel="noreferrer"
													title="Open in HIM"
													className="text-muted-foreground hover:bg-accent hover:text-foreground inline-flex items-center justify-center rounded-md p-1"
												>
													<ExternalLink className="size-3" />
												</a>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
