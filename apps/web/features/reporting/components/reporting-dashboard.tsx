"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import {
	useSurveillanceFlagsQuery,
	useReviewFlagMutation,
	usePidsrCasesQuery,
	usePidsrCaseDetailQuery,
	useSubmitPidsrCaseMutation,
	useGenerateWeeklyReportMutation,
	useAhsrMetricsQuery,
	useAhsrDrilldownQuery,
	useExportAhsrMutation,
} from "@/features/reporting/api/reporting.hooks"
import { AhsrDashboard } from "@/features/reporting/components/ahsr-dashboard"
import { HaiReport } from "@/features/reporting/components/hai-report"
import { PidsrDashboard } from "@/features/reporting/components/pidsr-dashboard"
import { ReportExport } from "@/features/reporting/components/report-export"

// ============================================================================
// Helpers
// ============================================================================

function formatDate(d: string | null | undefined) {
	if (!d) return "—"
	return new Date(d).toLocaleDateString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
	})
}

function categoryBadge(cat: string | null) {
	if (cat === "category_1") return <Badge variant="destructive">Cat 1</Badge>
	if (cat === "category_2") return <Badge variant="outline">Cat 2</Badge>
	return <Badge variant="secondary">—</Badge>
}

function statusBadge(status: string) {
	switch (status) {
		case "draft":
			return <Badge variant="outline">Draft</Badge>
		case "submitted":
			return <Badge variant="default">Submitted</Badge>
		default:
			return <Badge variant="secondary">{status}</Badge>
	}
}

// ============================================================================
// Main Dashboard
// ============================================================================

export function ReportingDashboard({ canEdit = true, canExport = true }: { canEdit?: boolean; canExport?: boolean }) {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	const router = useRouter()
	const searchParams = useSearchParams()
	const defaultTab = canEdit ? "surveillance" : "ahsr"
	const rawTab = searchParams.get("tab") ?? defaultTab

	// Oversight-only users must not land on operator tabs.
	const oversightTabs = ["ahsr", ...(canExport ? ["export"] : [])]
	const visibleTab = !canEdit && !oversightTabs.includes(rawTab) ? "ahsr" : rawTab

	function handleTabChange(value: string) {
		const params = new URLSearchParams(searchParams.toString())
		const isDefault = value === defaultTab
		if (isDefault) {
			params.delete("tab")
		} else {
			params.set("tab", value)
		}
		router.push(`/reporting${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false })
	}

	if (!facilityId) {
		return (
			<div className="text-muted-foreground flex h-48 items-center justify-center">
				No facility context available.
			</div>
		)
	}

	const heading = canEdit ? "Statutory Reporting" : "Reporting Oversight"
	const description = canEdit
		? "PIDSR surveillance, case management, weekly reports, AHSR metrics, and HAI reporting"
		: "AHSR metrics and oversight reporting. Contact the Reporting Officer for PIDSR operations, weekly reporting, and AHSR exports."

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold">{heading}</h1>
				<p className="text-muted-foreground">{description}</p>
			</div>

			<Tabs value={visibleTab} onValueChange={handleTabChange}>
				<TabsList variant="line">
					{canEdit && <TabsTrigger value="surveillance">Surveillance Flags</TabsTrigger>}
					{canEdit && <TabsTrigger value="pidsr">PIDSR</TabsTrigger>}
					{canEdit && <TabsTrigger value="weekly">Weekly Report</TabsTrigger>}
					<TabsTrigger value="ahsr">AHSR Dashboard</TabsTrigger>
					{canEdit && <TabsTrigger value="hai">HAI Report</TabsTrigger>}
					{canExport && <TabsTrigger value="export">Export</TabsTrigger>}
				</TabsList>

				{canEdit && (
					<TabsContent value="surveillance">
						<SurveillancePanel facilityId={facilityId} />
					</TabsContent>
				)}
				{canEdit && (
					<TabsContent value="pidsr">
						<PidsrDashboard facilityId={facilityId} />
					</TabsContent>
				)}
				{canEdit && (
					<TabsContent value="weekly">
						<WeeklyReportPanel facilityId={facilityId} />
					</TabsContent>
				)}
				<TabsContent value="ahsr">
					<AhsrDashboard facilityId={facilityId} canEdit={canEdit} canExport={canExport} />
				</TabsContent>
				{canEdit && (
					<TabsContent value="hai">
						<HaiReport facilityId={facilityId} />
					</TabsContent>
				)}
				{canExport && (
					<TabsContent value="export">
						<ReportExport facilityId={facilityId} />
					</TabsContent>
				)}
			</Tabs>
		</div>
	)
}

// ============================================================================
// Surveillance Flags Panel
// ============================================================================

function SurveillancePanel({ facilityId }: { facilityId: string }) {
	const [page, setPage] = useState(1)
	const [reviewed, setReviewed] = useState<string>("all")
	const [category, setCategory] = useState<string>("all")

	const { data, isLoading } = useSurveillanceFlagsQuery({
		facilityId,
		page,
		limit: 20,
		isReviewed: reviewed === "all" ? undefined : reviewed === "true",
		category: category === "all" ? undefined : category,
	})

	const reviewMut = useReviewFlagMutation()
	const [reviewOpen, setReviewOpen] = useState(false)
	const [selectedFlagId, setSelectedFlagId] = useState("")
	const [reviewAction, setReviewAction] = useState<"confirm" | "dismiss">("confirm")
	const [dismissReason, setDismissReason] = useState("")

	function openReview(flagId: string) {
		setSelectedFlagId(flagId)
		setReviewAction("confirm")
		setDismissReason("")
		setReviewOpen(true)
	}

	function submitReview() {
		reviewMut.mutate(
			{
				id: selectedFlagId,
				action: reviewAction,
				dismissReason: reviewAction === "dismiss" ? dismissReason : undefined,
			},
			{ onSuccess: () => setReviewOpen(false) }
		)
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle>Surveillance Flags</CardTitle>
					<div className="flex gap-2">
						<Select
							value={reviewed}
							onValueChange={(v) => {
								if (v) setReviewed(v)
							}}
						>
							<SelectTrigger className="w-36">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All</SelectItem>
								<SelectItem value="false">Pending</SelectItem>
								<SelectItem value="true">Reviewed</SelectItem>
							</SelectContent>
						</Select>
						<Select
							value={category}
							onValueChange={(v) => {
								if (v) setCategory(v)
							}}
						>
							<SelectTrigger className="w-36">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Categories</SelectItem>
								<SelectItem value="category_1">Category 1</SelectItem>
								<SelectItem value="category_2">Category 2</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<p className="text-muted-foreground py-8 text-center">Loading flags…</p>
				) : !data?.flags?.length ? (
					<p className="text-muted-foreground py-8 text-center">No surveillance flags found.</p>
				) : (
					<>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Patient</TableHead>
									<TableHead>Category</TableHead>
									<TableHead>Disease</TableHead>
									<TableHead>Flag Type</TableHead>
									<TableHead>Triggered By</TableHead>
									<TableHead>Date</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="text-right">Action</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.flags.map((flag) => (
									<TableRow key={flag.id}>
										<TableCell>
											<div className="font-medium">{flag.patientName ?? "—"}</div>
											<div className="text-muted-foreground text-xs">{flag.patientMrn ?? ""}</div>
										</TableCell>
										<TableCell>{categoryBadge(flag.category)}</TableCell>
										<TableCell>{flag.diseaseName ?? flag.triggerValue}</TableCell>
										<TableCell>
											<Badge variant="secondary">
												{flag.flagType === "icd10_match" ? "ICD-10" : "Keyword"}
											</Badge>
										</TableCell>
										<TableCell className="text-xs">{flag.triggeredBy}</TableCell>
										<TableCell>{formatDate(flag.createdAt)}</TableCell>
										<TableCell>
											{flag.isReviewed ? (
												<Badge variant="default">Reviewed</Badge>
											) : (
												<Badge variant="outline">Pending</Badge>
											)}
										</TableCell>
										<TableCell className="text-right">
											{!flag.isReviewed && (
												<Button size="sm" variant="outline" onClick={() => openReview(flag.id)}>
													Review
												</Button>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>

						{data.totalPages > 1 && (
							<div className="mt-4 flex items-center justify-center gap-2">
								<Button
									size="sm"
									variant="outline"
									disabled={page <= 1}
									onClick={() => setPage((p) => p - 1)}
								>
									Previous
								</Button>
								<span className="text-muted-foreground text-sm">
									Page {data.page} of {data.totalPages}
								</span>
								<Button
									size="sm"
									variant="outline"
									disabled={page >= data.totalPages}
									onClick={() => setPage((p) => p + 1)}
								>
									Next
								</Button>
							</div>
						)}
					</>
				)}
			</CardContent>

			{/* Review Dialog */}
			<Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Review Surveillance Flag</DialogTitle>
						<DialogDescription>
							Confirm to create a PIDSR case, or dismiss with reason.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						<div>
							<Label>Action</Label>
							<Select
								value={reviewAction}
								onValueChange={(v) => {
									if (v) setReviewAction(v as "confirm" | "dismiss")
								}}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="confirm">Confirm — Create PIDSR Case</SelectItem>
									<SelectItem value="dismiss">Dismiss</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{reviewAction === "dismiss" && (
							<div>
								<Label>Dismiss Reason</Label>
								<Input
									value={dismissReason}
									onChange={(e) => setDismissReason(e.target.value)}
									placeholder="e.g., False positive, duplicate, etc."
								/>
							</div>
						)}
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setReviewOpen(false)}>
							Cancel
						</Button>
						<Button onClick={submitReview} disabled={reviewMut.isPending}>
							{reviewMut.isPending ? "Submitting…" : "Submit"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Card>
	)
}

// ============================================================================
// PIDSR Cases Panel
// ============================================================================

function PidsrCasesPanel({ facilityId }: { facilityId: string }) {
	const [page, setPage] = useState(1)
	const [statusFilter, setStatusFilter] = useState("all")
	const [categoryFilter, setCategoryFilter] = useState("all")

	const { data, isLoading } = usePidsrCasesQuery({
		facilityId,
		page,
		limit: 20,
		reportStatus: statusFilter === "all" ? undefined : statusFilter,
		category: categoryFilter === "all" ? undefined : categoryFilter,
	})

	const submitMut = useSubmitPidsrCaseMutation()
	const [detailId, setDetailId] = useState("")
	const [detailOpen, setDetailOpen] = useState(false)

	const { data: caseDetail } = usePidsrCaseDetailQuery(detailId)

	function openDetail(id: string) {
		setDetailId(id)
		setDetailOpen(true)
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle>PIDSR Cases</CardTitle>
					<div className="flex gap-2">
						<Select
							value={statusFilter}
							onValueChange={(v) => {
								if (v) setStatusFilter(v)
							}}
						>
							<SelectTrigger className="w-36">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Statuses</SelectItem>
								<SelectItem value="draft">Draft</SelectItem>
								<SelectItem value="submitted">Submitted</SelectItem>
							</SelectContent>
						</Select>
						<Select
							value={categoryFilter}
							onValueChange={(v) => {
								if (v) setCategoryFilter(v)
							}}
						>
							<SelectTrigger className="w-36">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Categories</SelectItem>
								<SelectItem value="category_1">Category 1</SelectItem>
								<SelectItem value="category_2">Category 2</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<p className="text-muted-foreground py-8 text-center">Loading cases…</p>
				) : !data?.cases?.length ? (
					<p className="text-muted-foreground py-8 text-center">No PIDSR cases found.</p>
				) : (
					<>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Patient</TableHead>
									<TableHead>Disease</TableHead>
									<TableHead>Classification</TableHead>
									<TableHead>Diagnosis Date</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.cases.map((c) => (
									<TableRow key={c.id}>
										<TableCell>
											<div className="font-medium">{c.patientName ?? "—"}</div>
											<div className="text-muted-foreground text-xs">{c.patientMrn ?? ""}</div>
										</TableCell>
										<TableCell>
											<div>{c.diseaseName}</div>
											<div className="text-muted-foreground text-xs">{c.diseaseCode}</div>
										</TableCell>
										<TableCell>
											<Badge variant="secondary">{c.caseClassification}</Badge>
										</TableCell>
										<TableCell>{formatDate(c.diagnosisDate)}</TableCell>
										<TableCell>{statusBadge(c.reportStatus)}</TableCell>
										<TableCell className="text-right">
											<div className="flex justify-end gap-1">
												<Button size="sm" variant="outline" onClick={() => openDetail(c.id)}>
													View
												</Button>
												{c.reportStatus === "draft" && (
													<Button
														size="sm"
														onClick={() => submitMut.mutate({ id: c.id })}
														disabled={submitMut.isPending}
													>
														Submit
													</Button>
												)}
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>

						{data.totalPages > 1 && (
							<div className="mt-4 flex items-center justify-center gap-2">
								<Button
									size="sm"
									variant="outline"
									disabled={page <= 1}
									onClick={() => setPage((p) => p - 1)}
								>
									Previous
								</Button>
								<span className="text-muted-foreground text-sm">
									Page {data.page} of {data.totalPages}
								</span>
								<Button
									size="sm"
									variant="outline"
									disabled={page >= data.totalPages}
									onClick={() => setPage((p) => p + 1)}
								>
									Next
								</Button>
							</div>
						)}
					</>
				)}
			</CardContent>

			{/* Case Detail Dialog */}
			<Dialog open={detailOpen} onOpenChange={setDetailOpen}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>PIDSR Case Detail</DialogTitle>
					</DialogHeader>

					{caseDetail ? (
						<div className="space-y-3 text-sm">
							<div className="grid grid-cols-2 gap-2">
								<div>
									<span className="text-muted-foreground">Patient:</span>{" "}
									{caseDetail.patientName ?? "—"}
								</div>
								<div>
									<span className="text-muted-foreground">MRN:</span>{" "}
									{caseDetail.patientMrn ?? "—"}
								</div>
								<div>
									<span className="text-muted-foreground">Disease:</span>{" "}
									{caseDetail.diseaseName}
								</div>
								<div>
									<span className="text-muted-foreground">ICD-10:</span>{" "}
									{caseDetail.diseaseCode}
								</div>
								<div>
									<span className="text-muted-foreground">Classification:</span>{" "}
									<Badge variant="secondary">{caseDetail.caseClassification}</Badge>
								</div>
								<div>
									<span className="text-muted-foreground">Status:</span>{" "}
									{statusBadge(caseDetail.reportStatus)}
								</div>
								<div>
									<span className="text-muted-foreground">Diagnosis Date:</span>{" "}
									{formatDate(caseDetail.diagnosisDate)}
								</div>
								<div>
									<span className="text-muted-foreground">Onset Date:</span>{" "}
									{formatDate(caseDetail.onsetDate)}
								</div>
								<div>
									<span className="text-muted-foreground">Encounter:</span>{" "}
									{caseDetail.encounterType ?? "—"}
								</div>
								<div>
									<span className="text-muted-foreground">Physician:</span>{" "}
									{caseDetail.attendingPhysician ?? "—"}
								</div>
							</div>
							{caseDetail.chiefComplaint && (
								<div>
									<span className="text-muted-foreground">Chief Complaint:</span>{" "}
									{caseDetail.chiefComplaint}
								</div>
							)}
							{caseDetail.submittedAt && (
								<div>
									<span className="text-muted-foreground">Submitted:</span>{" "}
									{formatDate(caseDetail.submittedAt)}
								</div>
							)}
						</div>
					) : (
						<p className="text-muted-foreground py-4 text-center">Loading…</p>
					)}

					<DialogFooter>
						<Button variant="outline" onClick={() => setDetailOpen(false)}>
							Close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Card>
	)
}

// ============================================================================
// Weekly Report Panel
// ============================================================================

function WeeklyReportPanel({ facilityId }: { facilityId: string }) {
	const [weekStart, setWeekStart] = useState(() => {
		const d = new Date()
		d.setDate(d.getDate() - d.getDay())
		return d.toISOString().slice(0, 10)
	})

	const generateMut = useGenerateWeeklyReportMutation()

	function handleGenerate() {
		generateMut.mutate({ facilityId, weekStartDate: weekStart })
	}

	const report = generateMut.data

	return (
		<Card>
			<CardHeader>
				<CardTitle>Weekly PIDSR Report</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-end gap-4">
					<div className="space-y-1">
						<Label>Week Starting</Label>
						<Input
							type="date"
							value={weekStart}
							onChange={(e) => setWeekStart(e.target.value)}
						/>
					</div>
					<Button onClick={handleGenerate} disabled={generateMut.isPending}>
						{generateMut.isPending ? "Generating…" : "Generate Report"}
					</Button>
				</div>

				{report && (
					<div className="space-y-4">
						<div className="bg-muted rounded-lg p-4">
							<div className="mb-2 flex items-center justify-between">
								<h3 className="font-semibold">
									Week: {formatDate(report.weekStartDate)} — {formatDate(report.weekEndDate)}
								</h3>
								<Badge>{report.status}</Badge>
							</div>
							<div className="grid grid-cols-2 gap-2 text-sm">
								<div>
									<span className="text-muted-foreground">Total Cases:</span> {report.totalCases}
								</div>
								<div>
									<span className="text-muted-foreground">Confirmed:</span>{" "}
									{report.confirmedCases}
								</div>
							</div>
						</div>

						{report.diseaseBreakdown.length > 0 && (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Disease</TableHead>
										<TableHead>ICD-10</TableHead>
										<TableHead className="text-right">Count</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{report.diseaseBreakdown.map((d) => (
										<TableRow key={d.diseaseCode}>
											<TableCell>{d.diseaseName}</TableCell>
											<TableCell className="text-muted-foreground">{d.diseaseCode}</TableCell>
											<TableCell className="text-right font-medium">{d.count}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	)
}

// ============================================================================
// AHSR Panel
// ============================================================================

function AhsrPanel({ facilityId, canEdit = true, canExport = true }: { facilityId: string; canEdit?: boolean; canExport?: boolean }) {
	const currentYear = new Date().getFullYear()
	const [year, setYear] = useState(currentYear)
	const [month, setMonth] = useState<string>("all")

	const { data: metrics, isLoading } = useAhsrMetricsQuery({
		facilityId,
		year,
		month: month === "all" ? undefined : Number(month),
	})

	const exportMut = useExportAhsrMutation()

	const [drillMetric, setDrillMetric] = useState("")
	const [drillIcd, setDrillIcd] = useState<string | undefined>()
	const [drillHai, setDrillHai] = useState<string | undefined>()
	const [drillOpen, setDrillOpen] = useState(false)

	const { data: drilldown } = useAhsrDrilldownQuery(
		{
			facilityId,
			year,
			month: month === "all" ? undefined : Number(month),
			metric: drillMetric,
			icdCode: drillIcd,
			haiType: drillHai,
			limit: 20,
		},
		drillOpen && !!drillMetric
	)

	function openDrilldown(metric: string, icdCode?: string, haiType?: string) {
		setDrillMetric(metric)
		setDrillIcd(icdCode)
		setDrillHai(haiType)
		setDrillOpen(true)
	}

	function handleExport() {
		exportMut.mutate({
			facilityId,
			year,
			month: month === "all" ? undefined : Number(month),
		})
	}

	const months = [
		{ value: "all", label: "Full Year" },
		{ value: "1", label: "January" },
		{ value: "2", label: "February" },
		{ value: "3", label: "March" },
		{ value: "4", label: "April" },
		{ value: "5", label: "May" },
		{ value: "6", label: "June" },
		{ value: "7", label: "July" },
		{ value: "8", label: "August" },
		{ value: "9", label: "September" },
		{ value: "10", label: "October" },
		{ value: "11", label: "November" },
		{ value: "12", label: "December" },
	]

	return (
		<div className="space-y-4">
			{/* Filters */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>AHSR Dashboard</CardTitle>
						<div className="flex gap-2">
							<Select
								value={String(year)}
								onValueChange={(v) => {
									if (v) setYear(Number(v))
								}}
							>
								<SelectTrigger className="w-28">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{[currentYear, currentYear - 1, currentYear - 2].map((y) => (
										<SelectItem key={y} value={String(y)}>
											{y}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select
								value={month}
								onValueChange={(v) => {
									if (v) setMonth(v)
								}}
							>
								<SelectTrigger className="w-36">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{months.map((m) => (
										<SelectItem key={m.value} value={m.value}>
											{m.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						{canExport && (
							<Button variant="outline" onClick={handleExport} disabled={exportMut.isPending}>
								{exportMut.isPending ? "Exporting…" : "Export Snapshot"}
							</Button>
						)}
						</div>
					</div>
				</CardHeader>
			</Card>

			{isLoading ? (
				<p className="text-muted-foreground py-8 text-center">Loading AHSR metrics…</p>
			) : !metrics ? (
				<p className="text-muted-foreground py-8 text-center">No data available.</p>
			) : (
				<>
					{/* Summary Cards */}
					<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
						<SummaryCard
							title="Admissions"
							value={metrics.totalAdmissions}
							onClick={() => openDrilldown("admissions")}
						/>
						<SummaryCard
							title="Discharges"
							value={metrics.totalDischarges}
							onClick={() => openDrilldown("discharges")}
						/>
						<SummaryCard
							title="Deaths"
							value={metrics.totalDeaths}
							onClick={() => openDrilldown("deaths")}
						/>
						<SummaryCard
							title="Bed Occupancy"
							value={metrics.bedOccupancyRate != null ? `${metrics.bedOccupancyRate.toFixed(1)}%` : "—"}
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<Card>
							<CardContent className="pt-4">
								<div className="text-muted-foreground text-sm">Gross Death Rate</div>
								<div className="text-2xl font-bold">
									{metrics.grossDeathRate != null ? `${metrics.grossDeathRate.toFixed(2)}%` : "—"}
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="pt-4">
								<div className="text-muted-foreground text-sm">Net Death Rate</div>
								<div className="text-2xl font-bold">
									{metrics.netDeathRate != null ? `${metrics.netDeathRate.toFixed(2)}%` : "—"}
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Top 10 Morbidities */}
					<Card>
						<CardHeader>
							<CardTitle>Top 10 Morbidities</CardTitle>
						</CardHeader>
						<CardContent>
							{metrics.topMorbidities.length === 0 ? (
								<p className="text-muted-foreground py-4 text-center text-sm">No data</p>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-12">#</TableHead>
											<TableHead>Disease</TableHead>
											<TableHead>ICD-10</TableHead>
											<TableHead className="text-right">Count</TableHead>
											<TableHead className="text-right">%</TableHead>
											{canEdit && <TableHead />}
										</TableRow>
									</TableHeader>
									<TableBody>
										{metrics.topMorbidities.map((m) => (
											<TableRow key={m.icdCode}>
												<TableCell>{m.rank}</TableCell>
												<TableCell>{m.diseaseName}</TableCell>
												<TableCell className="text-muted-foreground">{m.icdCode}</TableCell>
												<TableCell className="text-right">{m.count}</TableCell>
												<TableCell className="text-right">{m.percentage.toFixed(1)}%</TableCell>
												<TableCell className="text-right">
													{canEdit && (
														<Button
															size="sm"
															variant="ghost"
															onClick={() => openDrilldown("morbidity", m.icdCode)}
														>
															Drilldown
														</Button>
													)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>

					{/* Top 10 Mortalities */}
					<Card>
						<CardHeader>
							<CardTitle>Top 10 Mortalities</CardTitle>
						</CardHeader>
						<CardContent>
							{metrics.topMortalities.length === 0 ? (
								<p className="text-muted-foreground py-4 text-center text-sm">No data</p>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-12">#</TableHead>
											<TableHead>Disease</TableHead>
											<TableHead>ICD-10</TableHead>
											<TableHead className="text-right">Count</TableHead>
											<TableHead className="text-right">%</TableHead>
											{canEdit && <TableHead />}
										</TableRow>
									</TableHeader>
									<TableBody>
										{metrics.topMortalities.map((m) => (
											<TableRow key={m.icdCode}>
												<TableCell>{m.rank}</TableCell>
												<TableCell>{m.diseaseName}</TableCell>
												<TableCell className="text-muted-foreground">{m.icdCode}</TableCell>
												<TableCell className="text-right">{m.count}</TableCell>
												<TableCell className="text-right">{m.percentage.toFixed(1)}%</TableCell>
												<TableCell className="text-right">
													{canEdit && (
														<Button
															size="sm"
															variant="ghost"
															onClick={() => openDrilldown("mortality", m.icdCode)}
														>
															Drilldown
														</Button>
													)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>

					{/* HAI Metrics */}
					<Card>
						<CardHeader>
							<CardTitle>Healthcare-Associated Infections</CardTitle>
						</CardHeader>
						<CardContent>
							{metrics.haiMetrics.length === 0 ? (
								<p className="text-muted-foreground py-4 text-center text-sm">No HAI data</p>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>HAI Type</TableHead>
											<TableHead className="text-right">Count</TableHead>
											<TableHead className="text-right">Rate / 1000 Admissions</TableHead>
											{canEdit && <TableHead />}
										</TableRow>
									</TableHeader>
									<TableBody>
										{metrics.haiMetrics.map((h) => (
											<TableRow key={h.haiType}>
												<TableCell className="font-medium uppercase">{h.haiType}</TableCell>
												<TableCell className="text-right">{h.count}</TableCell>
												<TableCell className="text-right">{h.rate.toFixed(2)}</TableCell>
												<TableCell className="text-right">
													{canEdit && (
														<Button
															size="sm"
															variant="ghost"
															onClick={() => openDrilldown("hai", undefined, h.haiType)}
														>
															Drilldown
														</Button>
													)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				</>
			)}

			{/* Drilldown Dialog */}
			<Dialog open={drillOpen} onOpenChange={setDrillOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>
							AHSR Drilldown — {drillMetric}
							{drillIcd ? ` (${drillIcd})` : ""}
							{drillHai ? ` (${drillHai})` : ""}
						</DialogTitle>
					</DialogHeader>

					{drilldown?.encounters?.length ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Patient</TableHead>
									<TableHead>MRN</TableHead>
									<TableHead>Type</TableHead>
									<TableHead>Admitted</TableHead>
									<TableHead>Discharged</TableHead>
									<TableHead>Disposition</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{drilldown.encounters.map((enc) => (
									<TableRow key={enc.encounterId}>
										<TableCell>{enc.patientName}</TableCell>
										<TableCell>{enc.patientMrn}</TableCell>
										<TableCell>{enc.encounterType}</TableCell>
										<TableCell>{formatDate(enc.admissionDate)}</TableCell>
										<TableCell>{formatDate(enc.dischargeDate)}</TableCell>
										<TableCell>{enc.disposition ?? "—"}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					) : (
						<p className="text-muted-foreground py-4 text-center text-sm">No encounters found.</p>
					)}

					<DialogFooter>
						<Button variant="outline" onClick={() => setDrillOpen(false)}>
							Close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}

// ============================================================================
// Summary Card
// ============================================================================

function SummaryCard({
	title,
	value,
	onClick,
}: {
	title: string
	value: string | number
	onClick?: () => void
}) {
	return (
		<Card className={onClick ? "cursor-pointer transition-shadow hover:shadow-md" : ""} onClick={onClick}>
			<CardContent className="pt-4">
				<div className="text-muted-foreground text-sm">{title}</div>
				<div className="text-2xl font-bold">{value}</div>
			</CardContent>
		</Card>
	)
}
