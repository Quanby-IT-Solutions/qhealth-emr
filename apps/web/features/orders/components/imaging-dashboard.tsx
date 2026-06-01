"use client"

import { Fragment, useState } from "react"
import { ChevronUp, Eye, ImageOff } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
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
import { cn } from "@/core/lib/utils"

import { PacsLink } from "./pacs-link"
import { RadiologyReport } from "./radiology-report"

interface ImagingOrderItem {
	id: string
	modality: string
	bodyPart: string
	clinicalIndication: string | null
	indicationIcd10Code: string | null
	indicationIcd10Display: string | null
	priority: string
	status: string
	orderingStaffName: string | null
	scheduledDatetime: string | null
	completedDatetime: string | null
	report: string | null
	structuredResults: unknown
	createdAt: string
}

interface ImagingDashboardProps {
	orders: ImagingOrderItem[]
	isLoading: boolean
	onNewOrder?: () => void
}

type StatusFilter = "pending" | "in_progress" | "completed"
type PriorityFilter = "all" | "routine" | "urgent" | "stat"
type ReportFilter = "all" | "available" | "pending" | "awaiting"

const IN_PROGRESS_STATUSES = new Set(["in_progress", "processing"])
const COMPLETED_STATUSES = new Set(["completed", "cancelled"])
const filterFieldClassName = "flex min-w-0 flex-col gap-1"
const filterLabelClassName = "text-muted-foreground h-4 text-xs font-medium leading-4"
const filterControlClassName = "h-8 w-full rounded-full px-4"
const filterShellClassName = "mx-4 mb-4 rounded-lg border bg-muted/10 px-3 py-4 sm:px-4"
const tableShellClassName = "mx-4 hidden overflow-hidden rounded-lg border bg-background xl:block"
const tableHeaderRowClassName = "bg-muted/30 hover:bg-muted/30"
const tableHeadClassName = "text-muted-foreground h-10 px-4 text-xs font-semibold"
const tableCellClassName = "px-4 py-3 align-top"
const PAGE_SIZE = 10

const statusFilterLabels: Record<StatusFilter, string> = {
	pending: "Pending",
	in_progress: "In Progress",
	completed: "Completed",
}

const priorityFilterLabels: Record<PriorityFilter, string> = {
	all: "All priorities",
	routine: "Routine",
	urgent: "Urgent",
	stat: "Stat",
}

const reportFilterLabels: Record<ReportFilter, string> = {
	all: "All reports",
	available: "Report available",
	pending: "Report pending",
	awaiting: "Awaiting scan",
}

function formatDateTime(dateStr: string | null | undefined): string {
	if (!dateStr) return "--"
	return new Date(dateStr).toLocaleString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

function priorityVariant(priority: string) {
	switch (priority) {
		case "stat":
			return "destructive" as const
		case "urgent":
			return "secondary" as const
		default:
			return "outline" as const
	}
}

function statusVariant(status: string) {
	if (COMPLETED_STATUSES.has(status)) {
		return status === "cancelled" ? ("outline" as const) : ("default" as const)
	}
	if (IN_PROGRESS_STATUSES.has(status)) return "secondary" as const
	return "outline" as const
}

function statusLabel(status: string) {
	return status
		.split("_")
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ")
}

function matchesSearch(search: string, values: Array<string | null | undefined>) {
	const query = search.trim().toLowerCase()
	if (!query) return true
	return values.some(value => value?.toLowerCase().includes(query))
}

function pageCount(total: number) {
	return Math.max(1, Math.ceil(total / PAGE_SIZE))
}

function paginate<T>(items: T[], page: number) {
	const currentPage = Math.min(page, pageCount(items.length))
	const start = (currentPage - 1) * PAGE_SIZE
	return {
		currentPage,
		items: items.slice(start, start + PAGE_SIZE),
		totalPages: pageCount(items.length),
	}
}

function PaginationControls({
	page,
	total,
	onPageChange,
}: {
	page: number
	total: number
	onPageChange: (page: number) => void
}) {
	const totalPages = pageCount(total)
	const currentPage = Math.min(page, totalPages)
	const start = total ? (currentPage - 1) * PAGE_SIZE + 1 : 0
	const end = Math.min(currentPage * PAGE_SIZE, total)

	return (
		<div className="text-muted-foreground flex flex-col gap-2 px-4 pt-3 text-xs sm:flex-row sm:items-center sm:justify-between">
			<span>
				Showing {start}-{end} of {total}
			</span>
			<div className="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					className="h-8 rounded-full px-4"
					disabled={currentPage <= 1}
					onClick={() => onPageChange(currentPage - 1)}
				>
					Previous
				</Button>
				<span>
					Page {currentPage} of {totalPages}
				</span>
				<Button
					variant="outline"
					size="sm"
					className="h-8 rounded-full px-4"
					disabled={currentPage >= totalPages}
					onClick={() => onPageChange(currentPage + 1)}
				>
					Next
				</Button>
			</div>
		</div>
	)
}

interface ReportStatus {
	label: string
	variant: "default" | "secondary" | "outline" | "destructive"
}

function getReportStatus(order: ImagingOrderItem): ReportStatus {
	const structured =
		order.structuredResults && typeof order.structuredResults === "object"
			? (order.structuredResults as {
					reportStatus?: unknown
					findings?: unknown
					impression?: unknown
					recommendations?: unknown
					attachments?: unknown[]
				})
			: null
	const structuredIsReleased = !structured?.reportStatus || structured.reportStatus === "signed"
	const hasStructuredReport =
		structuredIsReleased &&
		(!!structured?.findings ||
			!!structured?.impression ||
			!!structured?.recommendations ||
			!!structured?.attachments?.length)
	const hasReport = !!order.report || hasStructuredReport

	if (hasReport) return { label: "Report Available", variant: "default" }
	if (COMPLETED_STATUSES.has(order.status) && order.status !== "cancelled") {
		return { label: "Report Pending", variant: "secondary" }
	}
	return { label: "Awaiting Scan", variant: "outline" }
}

function reportFilterMatches(order: ImagingOrderItem, filter: ReportFilter) {
	if (filter === "all") return true
	const reportStatus = getReportStatus(order)
	if (filter === "available") return reportStatus.label === "Report Available"
	if (filter === "pending") return reportStatus.label === "Report Pending"
	return reportStatus.label === "Awaiting Scan"
}

function getPacsUrl(structuredResults: unknown): string | null {
	if (!structuredResults || typeof structuredResults !== "object") return null
	const results = structuredResults as Record<string, unknown>
	return typeof results.pacsUrl === "string" ? results.pacsUrl : null
}

function indicationSummary(order: ImagingOrderItem) {
	const diagnosis = [order.indicationIcd10Code, order.indicationIcd10Display]
		.filter(Boolean)
		.join(" - ")
	return {
		clinical: order.clinicalIndication,
		diagnosis: diagnosis || null,
	}
}

function classifyOrder(order: ImagingOrderItem): StatusFilter {
	if (COMPLETED_STATUSES.has(order.status)) return "completed"
	if (IN_PROGRESS_STATUSES.has(order.status)) return "in_progress"
	return "pending"
}

export function ImagingDashboard({ orders, isLoading, onNewOrder }: ImagingDashboardProps) {
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending")
	const [search, setSearch] = useState("")
	const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all")
	const [reportFilter, setReportFilter] = useState<ReportFilter>("all")
	const [expandedId, setExpandedId] = useState<string | null>(null)
	const [page, setPage] = useState(1)

	const filtered = orders.filter(order => {
		const reportStatus = getReportStatus(order)
		const indication = indicationSummary(order)

		return (
			classifyOrder(order) === statusFilter &&
			(priorityFilter === "all" || order.priority === priorityFilter) &&
			reportFilterMatches(order, reportFilter) &&
			matchesSearch(search, [
				order.modality,
				order.bodyPart,
				indication.clinical,
				indication.diagnosis,
				order.priority,
				statusLabel(order.status),
				reportStatus.label,
				order.orderingStaffName,
			])
		)
	})
	const hasFilters =
		search.trim() ||
		statusFilter !== "pending" ||
		priorityFilter !== "all" ||
		reportFilter !== "all"
	const pagedOrders = paginate(filtered, page)

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle>Imaging Orders</CardTitle>
				{onNewOrder ? (
					<Button size="sm" onClick={onNewOrder}>
						New Imaging Order
					</Button>
				) : null}
			</CardHeader>
			<CardContent className="p-0 pb-4">
				<div className={filterShellClassName}>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1.5fr)_minmax(150px,0.8fr)_minmax(150px,0.8fr)_minmax(160px,0.9fr)_auto] lg:items-end">
						<div className={filterFieldClassName}>
							<label className={filterLabelClassName}>Search</label>
							<Input
								value={search}
								onChange={event => setSearch(event.target.value)}
								placeholder="Modality, body part, indication"
								className={filterControlClassName}
							/>
						</div>
						<div className={filterFieldClassName}>
							<label className={filterLabelClassName}>Status</label>
							<Select
								value={statusFilter}
								onValueChange={value => {
									setStatusFilter(value as StatusFilter)
									setExpandedId(null)
								}}
							>
								<SelectTrigger className={filterControlClassName}>
									<SelectValue>{statusFilterLabels[statusFilter]}</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{Object.entries(statusFilterLabels).map(([value, label]) => (
										<SelectItem key={value} value={value}>
											{label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className={filterFieldClassName}>
							<label className={filterLabelClassName}>Priority</label>
							<Select
								value={priorityFilter}
								onValueChange={value => setPriorityFilter(value as PriorityFilter)}
							>
								<SelectTrigger className={filterControlClassName}>
									<SelectValue>{priorityFilterLabels[priorityFilter]}</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{Object.entries(priorityFilterLabels).map(([value, label]) => (
										<SelectItem key={value} value={value}>
											{label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className={filterFieldClassName}>
							<label className={filterLabelClassName}>Report</label>
							<Select
								value={reportFilter}
								onValueChange={value => setReportFilter(value as ReportFilter)}
							>
								<SelectTrigger className={filterControlClassName}>
									<SelectValue>{reportFilterLabels[reportFilter]}</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{Object.entries(reportFilterLabels).map(([value, label]) => (
										<SelectItem key={value} value={value}>
											{label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<Button
							variant="outline"
							size="sm"
							className="h-8 rounded-full px-5"
							disabled={!hasFilters}
							onClick={() => {
								setSearch("")
								setStatusFilter("pending")
								setPriorityFilter("all")
								setReportFilter("all")
								setExpandedId(null)
								setPage(1)
							}}
						>
							Clear
						</Button>
					</div>
				</div>

				{isLoading ? (
					<div className="text-muted-foreground py-8 text-center text-sm">Loading...</div>
				) : filtered.length === 0 ? (
					<div className="flex flex-col items-center gap-2 py-10 text-center">
						<ImageOff className="text-muted-foreground size-8" />
						<p className="text-muted-foreground text-sm">
							No {statusFilterLabels[statusFilter].toLowerCase()} imaging orders.
						</p>
					</div>
				) : (
					<>
						<div className={tableShellClassName}>
							<Table className="table-fixed">
								<TableHeader>
									<TableRow className={tableHeaderRowClassName}>
										<TableHead className={cn(tableHeadClassName, "w-[15%]")}>Exam</TableHead>
										<TableHead className={cn(tableHeadClassName, "w-[25%]")}>Indication</TableHead>
										<TableHead className={cn(tableHeadClassName, "w-[8%]")}>Priority</TableHead>
										<TableHead className={cn(tableHeadClassName, "w-[10%]")}>Status</TableHead>
										<TableHead className={cn(tableHeadClassName, "w-[14%]")}>Report</TableHead>
										<TableHead className={cn(tableHeadClassName, "w-[18%]")}>Ordered</TableHead>
										<TableHead className={cn(tableHeadClassName, "w-[10%] text-right")}>
											Actions
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{pagedOrders.items.map(order => {
										const reportStatus = getReportStatus(order)
										const pacsUrl = getPacsUrl(order.structuredResults)
										const isExpanded = expandedId === order.id
										const indication = indicationSummary(order)

										return (
											<Fragment key={order.id}>
												<TableRow key={order.id}>
													<TableCell
														className={cn(tableCellClassName, "overflow-hidden font-medium")}
													>
														<p className="truncate capitalize" title={order.modality}>
															{order.modality}
														</p>
														<p
															className="text-muted-foreground truncate text-xs"
															title={order.bodyPart}
														>
															{order.bodyPart}
														</p>
													</TableCell>
													<TableCell className={cn(tableCellClassName, "overflow-hidden")}>
														<p
															className="truncate text-sm"
															title={indication.clinical ?? undefined}
														>
															{indication.clinical ?? "--"}
														</p>
														{indication.diagnosis && (
															<p
																className="text-muted-foreground truncate text-xs"
																title={indication.diagnosis}
															>
																{indication.diagnosis}
															</p>
														)}
													</TableCell>
													<TableCell className={cn(tableCellClassName, "overflow-hidden")}>
														<Badge
															variant={priorityVariant(order.priority)}
															className="max-w-full truncate whitespace-nowrap"
														>
															{order.priority}
														</Badge>
													</TableCell>
													<TableCell className={cn(tableCellClassName, "overflow-hidden")}>
														<Badge
															variant={statusVariant(order.status)}
															className="max-w-full truncate whitespace-nowrap"
														>
															{statusLabel(order.status)}
														</Badge>
													</TableCell>
													<TableCell className={cn(tableCellClassName, "overflow-hidden")}>
														<Badge
															variant={reportStatus.variant}
															className="max-w-full truncate whitespace-nowrap"
														>
															{reportStatus.label}
														</Badge>
													</TableCell>
													<TableCell className={cn(tableCellClassName, "overflow-hidden")}>
														<p className="truncate" title={order.orderingStaffName ?? undefined}>
															{order.orderingStaffName ?? "--"}
														</p>
														<p
															className="text-muted-foreground truncate text-xs"
															title={formatDateTime(order.createdAt)}
														>
															{formatDateTime(order.createdAt)}
														</p>
													</TableCell>
													<TableCell className={cn(tableCellClassName, "text-right")}>
														<div className="flex flex-wrap items-center justify-end gap-1">
															{pacsUrl ? (
																<PacsLink
																	orderId={order.id}
																	pacsUrl={pacsUrl}
																	modality={order.modality}
																	bodyPart={order.bodyPart}
																/>
															) : null}
															<Button
																variant="ghost"
																size="icon-sm"
																aria-label={isExpanded ? "Hide report" : "View report"}
																title={isExpanded ? "Hide report" : "View report"}
																onClick={() => setExpandedId(isExpanded ? null : order.id)}
															>
																{isExpanded ? (
																	<ChevronUp className="size-3.5" />
																) : (
																	<Eye className="size-3.5" />
																)}
															</Button>
														</div>
													</TableCell>
												</TableRow>
												{isExpanded && (
													<TableRow key={`${order.id}-report`}>
														<TableCell colSpan={7} className="bg-muted/40 p-0">
															<RadiologyReport
																report={order.report}
																structuredResults={order.structuredResults}
																modality={order.modality}
																bodyPart={order.bodyPart}
																clinicalIndication={order.clinicalIndication}
																indicationIcd10Code={order.indicationIcd10Code}
																indicationIcd10Display={order.indicationIcd10Display}
																completedDatetime={order.completedDatetime}
															/>
														</TableCell>
													</TableRow>
												)}
											</Fragment>
										)
									})}
								</TableBody>
							</Table>
						</div>
						<div className="space-y-3 px-4 xl:hidden">
							{pagedOrders.items.map(order => {
								const reportStatus = getReportStatus(order)
								const pacsUrl = getPacsUrl(order.structuredResults)
								const isExpanded = expandedId === order.id
								const indication = indicationSummary(order)

								return (
									<div key={order.id} className="bg-background rounded-lg border p-4">
										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0">
												<p className="truncate font-semibold capitalize" title={order.modality}>
													{order.modality}
												</p>
												<p
													className="text-muted-foreground truncate text-xs"
													title={order.bodyPart}
												>
													{order.bodyPart}
												</p>
											</div>
											<Badge variant={priorityVariant(order.priority)}>{order.priority}</Badge>
										</div>
										<div className="mt-3 space-y-1 text-sm">
											<p>{indication.clinical ?? "--"}</p>
											{indication.diagnosis && (
												<p className="text-muted-foreground text-xs">{indication.diagnosis}</p>
											)}
											<p className="text-muted-foreground text-xs">
												{order.orderingStaffName ?? "--"} - {formatDateTime(order.createdAt)}
											</p>
										</div>
										<div className="mt-3 flex flex-wrap items-center gap-2">
											<Badge variant={statusVariant(order.status)}>
												{statusLabel(order.status)}
											</Badge>
											<Badge variant={reportStatus.variant}>{reportStatus.label}</Badge>
											<PacsLink
												orderId={order.id}
												pacsUrl={pacsUrl}
												modality={order.modality}
												bodyPart={order.bodyPart}
											/>
											<Button
												variant="ghost"
												size="sm"
												className="gap-1"
												onClick={() => setExpandedId(isExpanded ? null : order.id)}
											>
												{isExpanded ? (
													<>
														<ChevronUp className="size-3.5" />
														Hide Report
													</>
												) : (
													<>
														<Eye className="size-3.5" />
														View Report
													</>
												)}
											</Button>
										</div>
										{isExpanded && (
											<div className="bg-muted/40 mt-3 overflow-hidden rounded-md border">
												<RadiologyReport
													report={order.report}
													structuredResults={order.structuredResults}
													modality={order.modality}
													bodyPart={order.bodyPart}
													clinicalIndication={order.clinicalIndication}
													indicationIcd10Code={order.indicationIcd10Code}
													indicationIcd10Display={order.indicationIcd10Display}
													completedDatetime={order.completedDatetime}
												/>
											</div>
										)}
									</div>
								)
							})}
						</div>
						<PaginationControls
							page={pagedOrders.currentPage}
							total={filtered.length}
							onPageChange={setPage}
						/>
					</>
				)}
			</CardContent>
		</Card>
	)
}
