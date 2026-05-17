"use client"

import { useState } from "react"

import { ChevronDown, ChevronUp, ImageOff } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/core/components/ui/tabs"

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

type StatusTab = "pending" | "in_progress" | "completed"

const IN_PROGRESS_STATUSES = new Set(["in_progress", "processing"])
const COMPLETED_STATUSES = new Set(["completed", "cancelled"])

function formatDateTime(dateStr: string | null | undefined): string {
	if (!dateStr) return "—"
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

interface ReportStatus {
	label: string
	variant: "default" | "secondary" | "outline" | "destructive"
}

function getReportStatus(order: ImagingOrderItem): ReportStatus {
	const hasReport =
		!!order.report ||
		(!!order.structuredResults && typeof order.structuredResults === "object")

	if (hasReport) return { label: "Report Available", variant: "default" }
	if (COMPLETED_STATUSES.has(order.status) && order.status !== "cancelled") {
		return { label: "Report Pending", variant: "secondary" }
	}
	return { label: "Awaiting Scan", variant: "outline" }
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

function classifyOrder(order: ImagingOrderItem): StatusTab {
	if (COMPLETED_STATUSES.has(order.status)) return "completed"
	if (IN_PROGRESS_STATUSES.has(order.status)) return "in_progress"
	return "pending"
}

export function ImagingDashboard({ orders, isLoading, onNewOrder }: ImagingDashboardProps) {
	const [statusTab, setStatusTab] = useState<StatusTab>("pending")
	const [expandedId, setExpandedId] = useState<string | null>(null)

	const pendingCount = orders.filter((o) => classifyOrder(o) === "pending").length
	const inProgressCount = orders.filter((o) => classifyOrder(o) === "in_progress").length

	const filtered = orders.filter((o) => classifyOrder(o) === statusTab)

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
			<CardContent className="p-0">
				{/* Status tabs */}
				<div className="border-b px-4 pb-0 pt-1">
					<Tabs
						value={statusTab}
						onValueChange={(v) => {
							setStatusTab(v as StatusTab)
							setExpandedId(null)
						}}
					>
						<TabsList variant="line">
							<TabsTrigger value="pending">
								Pending
								{pendingCount > 0 && (
									<Badge variant="secondary" className="ml-1.5 text-[10px]">
										{pendingCount}
									</Badge>
								)}
							</TabsTrigger>
							<TabsTrigger value="in_progress">
								In Progress
								{inProgressCount > 0 && (
									<Badge variant="secondary" className="ml-1.5 text-[10px]">
										{inProgressCount}
									</Badge>
								)}
							</TabsTrigger>
							<TabsTrigger value="completed">Completed</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>

				{isLoading ? (
					<div className="text-muted-foreground py-8 text-center text-sm">Loading…</div>
				) : filtered.length === 0 ? (
					<div className="flex flex-col items-center gap-2 py-10 text-center">
						<ImageOff className="text-muted-foreground size-8" />
						<p className="text-muted-foreground text-sm">
							No {statusTab.replace("_", " ")} imaging orders.
						</p>
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Modality</TableHead>
								<TableHead>Body Part</TableHead>
								<TableHead>Indication</TableHead>
								<TableHead>Priority</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Report</TableHead>
								<TableHead>Ordered By</TableHead>
								<TableHead>Date</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filtered.map((order) => {
								const reportStatus = getReportStatus(order)
								const pacsUrl = getPacsUrl(order.structuredResults)
								const isExpanded = expandedId === order.id
								const indication = indicationSummary(order)

								return (
									<>
										<TableRow key={order.id}>
											<TableCell className="font-medium capitalize">
												{order.modality}
											</TableCell>
											<TableCell>{order.bodyPart}</TableCell>
											<TableCell>
												<div className="max-w-[220px]">
													<p className="truncate text-sm">
														{indication.clinical ?? "—"}
													</p>
													{indication.diagnosis && (
														<p className="truncate text-xs text-muted-foreground">
															{indication.diagnosis}
														</p>
													)}
												</div>
											</TableCell>
											<TableCell>
												<Badge variant={priorityVariant(order.priority)}>
													{order.priority}
												</Badge>
											</TableCell>
											<TableCell>
												<Badge variant={statusVariant(order.status)}>
													{order.status.replace(/_/g, " ")}
												</Badge>
											</TableCell>
											<TableCell>
												<Badge variant={reportStatus.variant}>
													{reportStatus.label}
												</Badge>
											</TableCell>
											<TableCell>{order.orderingStaffName ?? "—"}</TableCell>
											<TableCell>
												{formatDateTime(order.createdAt)}
											</TableCell>
											<TableCell className="text-right">
												<div className="flex items-center justify-end gap-2">
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
														onClick={() =>
															setExpandedId(
																isExpanded ? null : order.id,
															)
														}
													>
														{isExpanded ? (
															<>
																<ChevronUp className="size-3.5" />
																Hide Report
															</>
														) : (
															<>
																<ChevronDown className="size-3.5" />
																View Report
															</>
														)}
													</Button>
												</div>
											</TableCell>
										</TableRow>
										{isExpanded && (
											<TableRow key={`${order.id}-report`}>
												<TableCell colSpan={9} className="bg-muted/40 p-0">
													<RadiologyReport
														report={order.report}
														structuredResults={order.structuredResults}
														modality={order.modality}
														bodyPart={order.bodyPart}
														clinicalIndication={
															order.clinicalIndication
														}
														indicationIcd10Code={
															order.indicationIcd10Code
														}
														indicationIcd10Display={
															order.indicationIcd10Display
														}
														completedDatetime={order.completedDatetime}
													/>
												</TableCell>
											</TableRow>
										)}
									</>
								)
							})}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	)
}
