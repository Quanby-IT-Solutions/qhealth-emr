"use client"

import { useState } from "react"
import {
	AlertTriangle,
	CheckCircle2,
	Clock,
	Download,
	FileJson,
	Loader2,
	Plus,
	XCircle,
} from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import {
	type FhirExport,
	type FhirExportStatus,
	formatExportStatusLabel,
	getExportStatusColor,
	downloadBundleAsync,
	useExportListQuery,
	useNhdrSystemStatusQuery,
} from "@/features/fhir/api/fhir.hooks"
import { ExportConfigForm } from "@/features/fhir/components/export-config-form"
import { SubmissionTracker } from "@/features/fhir/components/submission-tracker"
import { ValidationReportPanel } from "@/features/fhir/components/validation-report"

// ============================================================================
// Helpers
// ============================================================================

function formatDate(val: string | null | undefined): string {
	if (!val) return "—"
	return new Date(val).toLocaleString("en-PH", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

function ExportStatusBadge({ status }: { status: FhirExportStatus }) {
	const colorClass = getExportStatusColor(status)
	const label = formatExportStatusLabel(status)

	if (status === "failed" || status === "rejected") {
		return <Badge variant="destructive">{label}</Badge>
	}
	if (status === "invalid") {
		return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">{label}</Badge>
	}
	return <Badge className={colorClass}>{label}</Badge>
}

function ExportStatusIcon({ status }: { status: FhirExportStatus }) {
	switch (status) {
		case "pending":
			return <Clock className="size-3.5 text-blue-500" />
		case "processing":
			return <Loader2 className="size-3.5 animate-spin text-blue-500" />
		case "completed":
		case "accepted":
			return <CheckCircle2 className="size-3.5 text-green-500" />
		case "invalid":
			return <AlertTriangle className="size-3.5 text-amber-500" />
		case "submitted":
			return <FileJson className="size-3.5 text-purple-500" />
		case "failed":
		case "rejected":
			return <XCircle className="size-3.5 text-red-500" />
	}
}

// ============================================================================
// Stats row
// ============================================================================

function StatsRow({ exports }: { exports: FhirExport[] }) {
	const total = exports.length
	const completed = exports.filter(e => e.status === "completed" || e.status === "accepted" || e.status === "submitted").length
	const failed = exports.filter(e => e.status === "failed" || e.status === "rejected" || e.status === "invalid").length
	const pending = exports.filter(e => e.status === "pending" || e.status === "processing").length

	return (
		<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
			<Card>
				<CardContent className="pt-4 pb-3">
					<p className="text-2xl font-bold">{total}</p>
					<p className="text-sm text-muted-foreground">Total Exports</p>
				</CardContent>
			</Card>
			<Card>
				<CardContent className="pt-4 pb-3">
					<p className="text-2xl font-bold text-green-600">{completed}</p>
					<p className="text-sm text-muted-foreground">Completed</p>
				</CardContent>
			</Card>
			<Card>
				<CardContent className="pt-4 pb-3">
					<p className="text-2xl font-bold text-blue-600">{pending}</p>
					<p className="text-sm text-muted-foreground">In Progress</p>
				</CardContent>
			</Card>
			<Card>
				<CardContent className="pt-4 pb-3">
					<p className="text-2xl font-bold text-red-600">{failed}</p>
					<p className="text-sm text-muted-foreground">Failed</p>
				</CardContent>
			</Card>
		</div>
	)
}

// ============================================================================
// Export History Table
// ============================================================================

interface ExportHistoryTableProps {
	exports: FhirExport[]
	isLoading: boolean
	error: Error | null
	selectedExportId: string | null
	onSelectExport: (id: string | null) => void
	page: number
	totalPages: number
	onPageChange: (p: number) => void
	downloadingId: string | null
	onDownload: (id: string) => void
	canDownload: boolean
}

function ExportHistoryTable({
	exports,
	isLoading,
	error,
	selectedExportId,
	onSelectExport,
	page,
	totalPages,
	onPageChange,
	downloadingId,
	onDownload,
	canDownload,
}: ExportHistoryTableProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Export History</CardTitle>
			</CardHeader>
			<CardContent className="p-0">
				{error && (
					<div className="p-6 text-sm text-destructive">
						Failed to load export history. The FHIR module may not be enabled on this server.
					</div>
				)}
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Export ID</TableHead>
							<TableHead>Period</TableHead>
							<TableHead>Resource Types</TableHead>
							<TableHead>Resources</TableHead>
							<TableHead>Validated</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Created</TableHead>
							<TableHead>Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading && (
							<TableRow>
								<TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
									Loading…
								</TableCell>
							</TableRow>
						)}
						{!isLoading && exports.length === 0 && (
							<TableRow>
								<TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
									No exports yet. Click "New Export" to get started.
								</TableCell>
							</TableRow>
						)}
						{exports.map(exp => (
							<TableRow
								key={exp.id}
								className={selectedExportId === exp.id ? "bg-muted/60" : ""}
							>
								<TableCell className="font-mono text-xs text-muted-foreground">
									{exp.id.slice(0, 8)}…
								</TableCell>
								<TableCell className="text-xs">
									{exp.dateRangeStart} → {exp.dateRangeEnd}
								</TableCell>
								<TableCell>
									<div className="flex flex-wrap gap-1">
										{exp.resourceTypes.slice(0, 3).map(rt => (
											<Badge key={rt} variant="outline" className="text-xs px-1.5">
												{rt}
											</Badge>
										))}
										{exp.resourceTypes.length > 3 && (
											<Badge variant="outline" className="text-xs px-1.5">
												+{exp.resourceTypes.length - 3}
											</Badge>
										)}
									</div>
								</TableCell>
								<TableCell className="text-sm">
									{exp.exportedResources > 0
										? exp.exportedResources.toLocaleString()
										: exp.totalResources > 0
											? `~${exp.totalResources.toLocaleString()}`
											: "—"}
								</TableCell>
								<TableCell>
									{(exp.status === "completed" || exp.status === "submitted" || exp.status === "accepted") && (
										<Badge variant="outline" className="text-xs">Passed</Badge>
									)}
									{exp.status === "invalid" && (
										<Badge className="bg-amber-100 text-amber-800 text-xs dark:bg-amber-900/30 dark:text-amber-300">Errors</Badge>
									)}
									{(exp.status === "pending" || exp.status === "processing" || exp.status === "failed" || exp.status === "rejected") && (
										<span className="text-xs text-muted-foreground">—</span>
									)}
								</TableCell>
								<TableCell>
									<div className="flex items-center gap-1.5">
										<ExportStatusIcon status={exp.status} />
										<ExportStatusBadge status={exp.status} />
									</div>
								</TableCell>
								<TableCell className="text-xs">{formatDate(exp.createdAt)}</TableCell>
								<TableCell>
									<div className="flex items-center gap-1">
										{(exp.status === "completed" || exp.status === "invalid" || exp.status === "submitted" || exp.status === "accepted") && (
											<Button
												variant="ghost"
												size="sm"
												className="h-7 text-xs"
												onClick={() =>
													onSelectExport(selectedExportId === exp.id ? null : exp.id)
												}
											>
												{selectedExportId === exp.id ? "Hide Report" : "Validation"}
											</Button>
										)}
									{exp.exportUrl && canDownload && (
											<Button
												variant="ghost"
												size="sm"
												className="h-7 text-xs"
												disabled={downloadingId === exp.id}
												onClick={() => onDownload(exp.id)}
											>
												{downloadingId === exp.id
													? <Loader2 className="size-3.5 animate-spin" />
													: <Download className="size-3.5" />}
											</Button>
										)}
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>

				{totalPages > 1 && (
					<div className="flex items-center justify-between p-4">
						<p className="text-sm text-muted-foreground">
							Page {page} of {totalPages}
						</p>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								disabled={page <= 1}
								onClick={() => onPageChange(page - 1)}
							>
								Previous
							</Button>
							<Button
								variant="outline"
								size="sm"
								disabled={page >= totalPages}
								onClick={() => onPageChange(page + 1)}
							>
								Next
							</Button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	)
}

// ============================================================================
// NHDR Status Panel (FHIR-003)
// ============================================================================

function NhdrStatusPanel() {
	const { data, isLoading } = useNhdrSystemStatusQuery()

	if (isLoading || !data) return null

	const isLive = data.nhdrMode === "real"
	const isReady = isLive && data.nhdrConfigured

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="text-base">NHDR Integration Status</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="flex flex-wrap items-center gap-3">
					<div className="flex items-center gap-2">
						<span className="text-sm text-muted-foreground">Mode:</span>
						<Badge
							className={isLive ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"}
						>
							{isLive ? "Live" : "Mock"}
						</Badge>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-sm text-muted-foreground">Configuration:</span>
						{isReady ? (
							<span className="flex items-center gap-1 text-sm text-green-700">
								<CheckCircle2 className="size-4" /> Configured
							</span>
						) : (
							<span className="flex items-center gap-1 text-sm text-yellow-700">
								<AlertTriangle className="size-4" />
								{isLive ? "Incomplete" : "Mock only"}
							</span>
						)}
					</div>
				</div>
				<p className="text-sm text-muted-foreground">{data.nhdrEndpointNote}</p>
				{data.nhdrBaseUrl && (
					<p className="font-mono text-xs text-muted-foreground">
						Endpoint: {data.nhdrBaseUrl}
					</p>
				)}
			</CardContent>
		</Card>
	)
}

// ============================================================================
// Main Dashboard
// ============================================================================

interface FhirExportDashboardProps {
	/** Whether the current user has admin:edit permission (required for mutations). */
	canEdit: boolean
}

export function FhirExportDashboard({ canEdit }: FhirExportDashboardProps) {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles[0]?.facilityId ?? ""

	const [page, setPage] = useState(1)
	const [configOpen, setConfigOpen] = useState(false)
	const [selectedExportId, setSelectedExportId] = useState<string | null>(null)
	const [downloadingId, setDownloadingId] = useState<string | null>(null)

	const { data, isLoading, error } = useExportListQuery(facilityId, page)
	const exports = data?.data ?? []
	const selectedExport = exports.find(e => e.id === selectedExportId) ?? null

	// Find the most recent completed-but-unsubmitted export to surface as CTA
	const pendingSubmissionExport = exports.find(
		e => e.status === "completed" && !e.nhdrSubmissionId,
	) ?? null

	void selectedExport

	async function handleDownload(exportId: string) {
		setDownloadingId(exportId)
		try {
			await downloadBundleAsync(exportId)
		} catch (err) {
			console.error("[FHIR] Bundle download failed:", err)
		} finally {
			setDownloadingId(null)
		}
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold">FHIR Export Dashboard</h1>
					<p className="text-sm text-muted-foreground">
						Export clinical data in FHIR R4 format for NHDR submission and interoperability
					</p>
				</div>
				{canEdit && (
					<Button onClick={() => setConfigOpen(true)}>
						<Plus className="mr-2 size-4" />
						New Export
					</Button>
				)}
			</div>

			{/* NHDR System Status (FHIR-003) */}
			<NhdrStatusPanel />

			{/* Stats */}
			{!isLoading && <StatsRow exports={exports} />}

			{/* Export History Table */}
			<ExportHistoryTable
				exports={exports}
				isLoading={isLoading}
				error={error}
				selectedExportId={selectedExportId}
				onSelectExport={setSelectedExportId}
				page={page}
				totalPages={data?.totalPages ?? 1}
				onPageChange={setPage}
				downloadingId={downloadingId}
				onDownload={exportId => { void handleDownload(exportId) }}
				canDownload={canEdit}
			/>

			{/* Validation Report Panel (shown below table when export is selected) */}
			{selectedExportId && (
				<>
					<Separator />
					<ValidationReportPanel
						exportId={selectedExportId}
						onClose={() => setSelectedExportId(null)}
					/>
				</>
			)}

			{/* NHDR Submission Tracker */}
			<SubmissionTracker facilityId={facilityId} pendingExport={pendingSubmissionExport} canEdit={canEdit} />

			{/* Export Config Dialog */}
			<ExportConfigForm
				facilityId={facilityId}
				open={configOpen}
				onOpenChange={setConfigOpen}
			/>
		</div>
	)
}
