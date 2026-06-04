"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
	Ban,
	CheckCircle2,
	Clock3,
	ExternalLink,
	FileCheck2,
	ImageOff,
	Maximize2,
	MonitorPlay,
	Pencil,
	Play,
	RotateCcw,
	Search,
	Square,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { ScrollArea } from "@/core/components/ui/scroll-area"
import { Separator } from "@/core/components/ui/separator"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { Textarea } from "@/core/components/ui/textarea"
import { useActiveFacilityId } from "@/core/hooks/use-active-facility"
import { cn } from "@/core/lib/utils"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import {
	useImagingOrderDetailQuery,
	useImagingOrderListQuery,
	useSignImagingReportMutation,
	useUpdateImagingOrderMutation,
	type ImagingOrder,
} from "@/features/orders/api/orders.hooks"

type ReportStatus = "draft" | "signed"
type WorklistTab = "pending" | "in_progress" | "completed"

interface ReportAttachment {
	id: string
	name: string
	size: number
	type: string
	uploadedAt: string
	dataUrl: string
}

interface ReportAmendment {
	amendmentReason?: string
	amendedAt?: string
}

interface StructuredReport {
	technique?: string
	findings?: string
	impression?: string
	recommendations?: string
	pacsUrl?: string
	accessionNumber?: string
	studyUid?: string
	radiologistName?: string
	reportedAt?: string
	draftedAt?: string
	reportStatus?: ReportStatus
	attachments?: ReportAttachment[]
	amendments?: ReportAmendment[]
}

interface RadiologyReportEditorProps {
	order: ImagingOrder
	facilityId: string
	hasEditPermission: boolean
}

const PENDING_STATUSES = new Set(["ordered", "scheduled"])
const ACTIVE_STATUSES = new Set(["in_progress"])
const COMPLETED_STATUSES = new Set(["completed", "cancelled"])
const PACS_FRAME_LOAD_DELAY_MS = 125

function can(
	permissions: Array<{ module: string; action: string }>,
	module: string,
	action: string
) {
	return permissions.some(
		permission => permission.module === module && permission.action === action
	)
}

function parseStructuredResults(raw: unknown): StructuredReport {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
	return raw as StructuredReport
}

function isReportAttachment(value: unknown): value is ReportAttachment {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false
	const attachment = value as Partial<ReportAttachment>
	return (
		typeof attachment.id === "string" &&
		typeof attachment.name === "string" &&
		typeof attachment.size === "number" &&
		typeof attachment.type === "string" &&
		typeof attachment.uploadedAt === "string" &&
		typeof attachment.dataUrl === "string"
	)
}

function formatFileSize(bytes: number) {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDateTime(value: string | null | undefined) {
	if (!value) return "-"
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return "-"

	return date.toLocaleString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

function formatShortId(value: string) {
	return value.slice(0, 8).toUpperCase()
}

function composeReport({
	technique,
	findings,
	impression,
	recommendations,
}: {
	technique: string
	findings: string
	impression: string
	recommendations: string
}) {
	return [
		technique.trim() ? `Technique:\n${technique.trim()}` : "",
		`Findings:\n${findings.trim()}`,
		`Impression:\n${impression.trim()}`,
		recommendations.trim() ? `Recommendations:\n${recommendations.trim()}` : "",
	]
		.filter(Boolean)
		.join("\n\n")
}

function getSafePacsUrl(raw: string | undefined) {
	if (!raw) return ""

	try {
		const url = new URL(raw)
		return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : ""
	} catch {
		return ""
	}
}

function orderStatusLabel(status: string) {
	return status.replace(/_/g, " ")
}

function orderStatusVariant(status: string) {
	if (status === "cancelled") return "destructive" as const
	if (status === "completed") return "default" as const
	if (status === "in_progress") return "secondary" as const
	return "outline" as const
}

function classifyOrder(order: ImagingOrder): WorklistTab {
	if (COMPLETED_STATUSES.has(order.status)) return "completed"
	if (ACTIVE_STATUSES.has(order.status)) return "in_progress"
	return "pending"
}

function getReportStatus(order: ImagingOrder) {
	const structured = parseStructuredResults(order.structuredResults)
	if (structured.reportStatus === "signed") {
		return { label: "Report released", variant: "default" as const }
	}
	if (structured.reportStatus === "draft") {
		return { label: "Draft", variant: "secondary" as const }
	}
	if (order.status === "completed") {
		return { label: "Report pending", variant: "secondary" as const }
	}
	return { label: "Not recorded", variant: "outline" as const }
}

export default function RadiologyPage() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const orderIdFromUrl = searchParams.get("orderId") ?? searchParams.get("imagingOrderId") ?? ""
	const [selectedOrderId, setSelectedOrderId] = useState(orderIdFromUrl)
	const [, startRouteTransition] = useTransition()
	const facilityId = useActiveFacilityId()
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	const hasViewPermission = can(permissions, "radiology", "view")
	const hasEditPermission = can(permissions, "radiology", "edit")
	const worklistQuery = useImagingOrderListQuery({ facilityId, limit: 100 })
	const imagingOrderQuery = useImagingOrderDetailQuery(selectedOrderId, facilityId)

	useEffect(() => {
		setSelectedOrderId(orderIdFromUrl)
	}, [orderIdFromUrl])

	const handleSelectOrder = useCallback(
		(id: string) => {
			setSelectedOrderId(id)
			startRouteTransition(() => {
				router.push(`/radiology?orderId=${encodeURIComponent(id)}`)
			})
		},
		[router, startRouteTransition]
	)

	const handleCloseOrder = useCallback(() => {
		setSelectedOrderId("")
		startRouteTransition(() => {
			router.replace("/radiology")
		})
	}, [router, startRouteTransition])

	if (!hasViewPermission) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access radiology services.
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Radiology</h1>
				<p className="text-muted-foreground text-sm">
					Review imaging orders, track study progress, open PACS studies, and release reports.
				</p>
			</div>

			<RadiologyWorklist
				orders={worklistQuery.data?.data ?? []}
				selectedOrderId={selectedOrderId}
				isLoading={!facilityId || worklistQuery.isLoading}
				isError={worklistQuery.isError}
				onSelect={handleSelectOrder}
			/>

			<Dialog
				open={Boolean(selectedOrderId)}
				onOpenChange={open => {
					if (!open) handleCloseOrder()
				}}
			>
				<DialogContent
					size="full"
					overlayClassName="supports-backdrop-filter:backdrop-blur-none"
					className="data-closed:zoom-out-100 data-open:zoom-in-100 h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-[min(1500px,calc(100vw-2rem))]"
				>
					<DialogHeader className="bg-background border-b px-4 py-4 pr-14">
						<DialogTitle>Radiology Order Details</DialogTitle>
						<DialogDescription>
							Review the imaging workflow, PACS study, and radiology report.
						</DialogDescription>
					</DialogHeader>

					<ScrollArea className="min-h-0">
						<div className="p-4">
							{imagingOrderQuery.isLoading ? (
								<LoadingOrder />
							) : imagingOrderQuery.isError || !imagingOrderQuery.data ? (
								<OrderLoadError />
							) : facilityId ? (
								<RadiologyReportEditor
									key={imagingOrderQuery.data.updatedAt}
									order={imagingOrderQuery.data}
									facilityId={facilityId}
									hasEditPermission={hasEditPermission}
								/>
							) : (
								<LoadingOrder />
							)}
						</div>
					</ScrollArea>
				</DialogContent>
			</Dialog>
		</div>
	)
}

function RadiologyWorklist({
	orders,
	selectedOrderId,
	isLoading,
	isError,
	onSelect,
}: {
	orders: ImagingOrder[]
	selectedOrderId: string
	isLoading: boolean
	isError: boolean
	onSelect: (id: string) => void
}) {
	const [tab, setTab] = useState<WorklistTab>("pending")
	const [search, setSearch] = useState("")
	const normalizedSearch = search.trim().toLowerCase()
	const { counts, filtered } = useMemo(() => {
		const nextCounts: Record<WorklistTab, number> = {
			pending: 0,
			in_progress: 0,
			completed: 0,
		}
		const nextFiltered: ImagingOrder[] = []

		for (const order of orders) {
			const orderTab = classifyOrder(order)
			nextCounts[orderTab] += 1

			if (orderTab !== tab) continue
			if (
				normalizedSearch &&
				![order.patientName, order.patientMrn, order.modality, order.bodyPart, order.id].some(
					value => value?.toLowerCase().includes(normalizedSearch)
				)
			) {
				continue
			}

			nextFiltered.push(order)
		}

		return { counts: nextCounts, filtered: nextFiltered }
	}, [normalizedSearch, orders, tab])

	return (
		<Card className="gap-0 py-0">
			<CardHeader className="bg-muted/10 gap-4 border-b py-4">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<CardTitle className="text-base">Radiology Worklist</CardTitle>
					<div className="relative w-full max-w-xs">
						<Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
						<Input
							value={search}
							onChange={event => setSearch(event.target.value)}
							placeholder="Search patient, MRN, or study"
							className="pl-9"
						/>
					</div>
				</div>
				<Tabs value={tab} onValueChange={value => setTab(value as WorklistTab)}>
					<TabsList>
						<TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
						<TabsTrigger value="in_progress">In progress ({counts.in_progress})</TabsTrigger>
						<TabsTrigger value="completed">Completed ({counts.completed})</TabsTrigger>
					</TabsList>
				</Tabs>
			</CardHeader>
			<CardContent className="p-0">
				{isLoading ? (
					<div className="text-muted-foreground p-8 text-center text-sm">Loading worklist...</div>
				) : isError ? (
					<div className="text-destructive p-8 text-center text-sm">
						Unable to load the radiology worklist.
					</div>
				) : filtered.length === 0 ? (
					<div className="text-muted-foreground p-8 text-center text-sm">
						No {tab.replace("_", " ")} imaging orders found.
					</div>
				) : (
					<Table className="min-w-[1040px]">
						<TableHeader className="bg-muted/30">
							<TableRow>
								<TableHead className="h-11 px-4 text-xs font-semibold tracking-wide uppercase">
									Patient
								</TableHead>
								<TableHead className="h-11 px-4 text-xs font-semibold tracking-wide uppercase">
									Study
								</TableHead>
								<TableHead className="h-11 px-4 text-xs font-semibold tracking-wide uppercase">
									Priority
								</TableHead>
								<TableHead className="h-11 px-4 text-xs font-semibold tracking-wide uppercase">
									Order status
								</TableHead>
								<TableHead className="h-11 px-4 text-xs font-semibold tracking-wide uppercase">
									Report
								</TableHead>
								<TableHead className="h-11 px-4 text-xs font-semibold tracking-wide uppercase">
									Ordered
								</TableHead>
								<TableHead className="h-11 px-4 text-right text-xs font-semibold tracking-wide uppercase">
									Action
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filtered.map(order => {
								const reportStatus = getReportStatus(order)

								return (
									<TableRow
										key={order.id}
										className={cn(
											"group cursor-pointer",
											order.id === selectedOrderId ? "bg-muted/60" : "hover:bg-muted/30"
										)}
										onClick={() => onSelect(order.id)}
									>
										<TableCell className="px-4 py-4">
											<div className="font-medium">{order.patientName ?? "Unknown patient"}</div>
											<div className="text-muted-foreground mt-0.5 text-xs">
												MRN {order.patientMrn ?? "-"}
											</div>
										</TableCell>
										<TableCell className="px-4 py-4">
											<div className="font-medium uppercase">{order.modality}</div>
											<div className="text-muted-foreground mt-0.5 text-xs">{order.bodyPart}</div>
										</TableCell>
										<TableCell className="px-4 py-4">
											<Badge
												variant={order.priority === "stat" ? "destructive" : "outline"}
												className="capitalize"
											>
												{order.priority}
											</Badge>
										</TableCell>
										<TableCell className="px-4 py-4">
											<Badge variant={orderStatusVariant(order.status)} className="capitalize">
												{orderStatusLabel(order.status)}
											</Badge>
										</TableCell>
										<TableCell className="px-4 py-4">
											<Badge variant={reportStatus.variant}>{reportStatus.label}</Badge>
										</TableCell>
										<TableCell className="text-muted-foreground px-4 py-4 text-xs">
											{formatDateTime(order.createdAt)}
										</TableCell>
										<TableCell className="px-4 py-4 text-right">
											<Button
												size="sm"
												variant={order.id === selectedOrderId ? "secondary" : "outline"}
												className="group-hover:border-foreground/20"
												onClick={event => {
													event.stopPropagation()
													onSelect(order.id)
												}}
											>
												Open
											</Button>
										</TableCell>
									</TableRow>
								)
							})}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	)
}

function LoadingOrder() {
	return (
		<Card>
			<CardContent className="text-muted-foreground flex min-h-48 items-center justify-center text-sm">
				Loading imaging order...
			</CardContent>
		</Card>
	)
}

function OrderLoadError() {
	return (
		<Card>
			<CardContent className="text-destructive flex min-h-48 items-center justify-center text-sm">
				The selected imaging order could not be loaded.
			</CardContent>
		</Card>
	)
}

function RadiologyReportEditor({
	order,
	facilityId,
	hasEditPermission,
}: RadiologyReportEditorProps) {
	const updateImagingOrder = useUpdateImagingOrderMutation()
	const signImagingReport = useSignImagingReportMutation()
	const structured = useMemo(() => parseStructuredResults(order.structuredResults), [order])
	const [technique, setTechnique] = useState(structured.technique ?? "")
	const [findings, setFindings] = useState(structured.findings ?? "")
	const [impression, setImpression] = useState(structured.impression ?? "")
	const [recommendations, setRecommendations] = useState(structured.recommendations ?? "")
	const [amendmentReason, setAmendmentReason] = useState("")
	const [isAmending, setIsAmending] = useState(false)
	const isReleased = structured.reportStatus === "signed"
	const isCancelled = order.status === "cancelled"
	const canEditReport = hasEditPermission && !isCancelled && (!isReleased || isAmending)
	const canRelease =
		hasEditPermission && order.status === "completed" && (!isReleased || isAmending)
	const isSaving = updateImagingOrder.isPending || signImagingReport.isPending
	const pacsUrl = getSafePacsUrl(structured.pacsUrl)
	const attachments = (structured.attachments ?? []).filter(isReportAttachment)
	const reportStatus = getReportStatus(order)

	function buildStructuredReport(status: ReportStatus): StructuredReport {
		return {
			...structured,
			technique: technique.trim() || undefined,
			findings: findings.trim(),
			impression: impression.trim(),
			recommendations: recommendations.trim() || undefined,
			reportStatus: status,
			draftedAt: status === "draft" ? new Date().toISOString() : structured.draftedAt,
		}
	}

	function resetEditor() {
		setTechnique(structured.technique ?? "")
		setFindings(structured.findings ?? "")
		setImpression(structured.impression ?? "")
		setRecommendations(structured.recommendations ?? "")
		setAmendmentReason("")
		setIsAmending(false)
	}

	function handleLifecycleUpdate(
		input: Parameters<typeof updateImagingOrder.mutate>[0],
		successMessage: string
	) {
		if (!hasEditPermission) return

		updateImagingOrder.mutate(input, {
			onSuccess: () => toast.success(successMessage),
			onError: error => {
				toast.error(error instanceof Error ? error.message : "Unable to update imaging order.")
			},
		})
	}

	function handleSaveDraft() {
		if (!canEditReport || isReleased) return

		handleLifecycleUpdate(
			{
				id: order.id,
				facilityId,
				structuredResults: buildStructuredReport("draft"),
			},
			"Radiology report draft saved."
		)
	}

	function handleRelease() {
		if (!canRelease) return
		if (!findings.trim() || !impression.trim()) {
			toast.error("Findings and impression are required before release.")
			return
		}
		if (isAmending && !amendmentReason.trim()) {
			toast.error("Enter the reason for this amendment before release.")
			return
		}

		signImagingReport.mutate(
			{
				id: order.id,
				facilityId,
				report: composeReport({ technique, findings, impression, recommendations }),
				structuredResults: buildStructuredReport("signed"),
				...(isAmending ? { amendmentReason: amendmentReason.trim() } : {}),
			},
			{
				onSuccess: () => {
					setIsAmending(false)
					setAmendmentReason("")
					toast.success(isAmending ? "Report amendment released." : "Radiology report released.")
				},
				onError: error => {
					toast.error(error instanceof Error ? error.message : "Unable to release report.")
				},
			}
		)
	}

	return (
		<div className="space-y-6">
			<Card>
				<CardContent className="space-y-5">
					<div className="flex flex-wrap items-start justify-between gap-4">
						<div>
							<div className="flex flex-wrap items-center gap-2">
								<h2 className="text-xl font-semibold">
									{order.modality.toUpperCase()} {order.bodyPart}
								</h2>
								<Badge variant={orderStatusVariant(order.status)}>
									{orderStatusLabel(order.status)}
								</Badge>
								<Badge variant={reportStatus.variant}>{reportStatus.label}</Badge>
							</div>
							<p className="text-muted-foreground mt-1 text-sm">
								Accession {structured.accessionNumber ?? formatShortId(order.id)}
							</p>
						</div>
						<div className="flex flex-wrap gap-2">
							{order.status === "ordered" && (
								<Button
									size="sm"
									onClick={() =>
										handleLifecycleUpdate(
											{ id: order.id, facilityId, status: "scheduled" },
											"Imaging order receipt acknowledged."
										)
									}
									disabled={!hasEditPermission || isSaving}
								>
									<CheckCircle2 className="mr-2 size-4" />
									Acknowledge receipt
								</Button>
							)}
							{order.status === "scheduled" && (
								<Button
									size="sm"
									onClick={() =>
										handleLifecycleUpdate(
											{ id: order.id, facilityId, status: "in_progress" },
											"Imaging study started."
										)
									}
									disabled={!hasEditPermission || !order.billingClearedAt || isSaving}
									title={
										order.billingClearedAt
											? "Start imaging study"
											: "Billing clearance is required before the study starts."
									}
								>
									<Play className="mr-2 size-4" />
									Start study
								</Button>
							)}
							{order.status === "in_progress" && (
								<Button
									size="sm"
									onClick={() =>
										handleLifecycleUpdate(
											{
												id: order.id,
												facilityId,
												status: "completed",
												completedDatetime: new Date().toISOString(),
											},
											"Imaging study completed."
										)
									}
									disabled={!hasEditPermission || isSaving}
								>
									<Square className="mr-2 size-4" />
									Complete study
								</Button>
							)}
							{PENDING_STATUSES.has(order.status) || order.status === "in_progress" ? (
								<Button
									size="sm"
									variant="outline"
									onClick={() =>
										handleLifecycleUpdate(
											{ id: order.id, facilityId, status: "cancelled" },
											"Imaging order cancelled."
										)
									}
									disabled={!hasEditPermission || isSaving}
								>
									<Ban className="mr-2 size-4" />
									Cancel
								</Button>
							) : null}
						</div>
					</div>

					<div className="grid gap-4 text-sm md:grid-cols-4">
						<Detail label="Patient" value={order.patientName ?? "Unknown patient"} />
						<Detail label="MRN" value={order.patientMrn ?? "-"} />
						<Detail label="Date of birth" value={order.patientDateOfBirth ?? "-"} />
						<Detail
							label="Encounter"
							value={order.encounterId ? formatShortId(order.encounterId) : "-"}
						/>
						<Detail label="Priority" value={order.priority} />
						<Detail label="Ordered by" value={order.orderingStaffName ?? "-"} />
						<Detail label="Ordered at" value={formatDateTime(order.createdAt)} />
						<Detail label="Study UID" value={structured.studyUid ?? "Not assigned"} />
					</div>

					<Separator />

					<div className="grid gap-3 text-sm md:grid-cols-5">
						<WorkflowCheckpoint
							label="Order received"
							value={order.imagingOrderReceivedAt}
							complete={Boolean(order.imagingOrderReceivedAt)}
						/>
						<WorkflowCheckpoint
							label="Billing clearance"
							value={order.billingClearedAt}
							complete={Boolean(order.billingClearedAt)}
						/>
						<WorkflowCheckpoint
							label="Study started"
							value={order.studyStartedAt}
							complete={Boolean(order.studyStartedAt)}
						/>
						<WorkflowCheckpoint
							label="Study completed"
							value={order.completedDatetime}
							complete={Boolean(order.completedDatetime)}
						/>
						<WorkflowCheckpoint
							label="Report released"
							value={structured.reportedAt}
							complete={isReleased}
						/>
					</div>

					{order.status === "scheduled" && !order.billingClearedAt && (
						<div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
							The study is waiting for billing clearance. Radiology can review the order but cannot
							start acquisition yet.
						</div>
					)}
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
				<div className="space-y-4 xl:col-span-2">
					<Card className="overflow-hidden">
						<div className="bg-background flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
							<div className="flex items-center gap-2.5">
								<MonitorPlay className="text-muted-foreground size-4" />
								<span className="text-sm font-medium">PACS Viewer</span>
								<Badge variant={pacsUrl ? "secondary" : "outline"}>
									{pacsUrl ? "Study linked" : "No study linked"}
								</Badge>
							</div>
							<div className="flex items-center gap-1">
								<Button
									variant="ghost"
									size="icon"
									className="size-8"
									disabled={!pacsUrl}
									onClick={() =>
										window.open(
											`/radiology/pacs-viewer?orderId=${encodeURIComponent(order.id)}`,
											"_blank"
										)
									}
								>
									<Maximize2 className="size-4" />
								</Button>
								<Button
									variant="ghost"
									size="sm"
									className="gap-1.5 text-xs"
									disabled={!pacsUrl}
									onClick={() => window.open(pacsUrl, "_blank", "noopener,noreferrer")}
								>
									<ExternalLink className="size-3.5" />
									Open external
								</Button>
							</div>
						</div>
						<div className="bg-black">
							<PacsFrame orderId={order.id} pacsUrl={pacsUrl} />
						</div>
					</Card>
				</div>

				<div className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">Clinical History</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-muted-foreground text-sm">
								{order.clinicalIndication ?? "No clinical indication recorded."}
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-sm">PACS Integration</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2 text-sm">
							<div className="text-muted-foreground">
								Study links are supplied by the configured PACS integration.
							</div>
							<div className="font-medium">
								{pacsUrl ? "Linked study available" : "Awaiting PACS study link"}
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			<Card>
				<CardHeader className="gap-3">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div>
							<CardTitle className="text-base">Radiology Report</CardTitle>
							<p className="text-muted-foreground mt-1 text-sm">
								{isReleased
									? `Released by ${structured.radiologistName ?? "radiologist"} at ${formatDateTime(
											structured.reportedAt
										)}`
									: "Record a draft after reviewing the PACS study, then release the final report."}
							</p>
						</div>
						<div className="flex flex-wrap gap-2">
							{isReleased && !isAmending && (
								<Button
									variant="outline"
									size="sm"
									onClick={() => setIsAmending(true)}
									disabled={!hasEditPermission || isSaving}
								>
									<Pencil className="mr-2 size-4" />
									Amend report
								</Button>
							)}
							{isAmending && (
								<Button variant="outline" size="sm" onClick={resetEditor} disabled={isSaving}>
									<RotateCcw className="mr-2 size-4" />
									Cancel amendment
								</Button>
							)}
							{!isReleased && (
								<Button
									variant="outline"
									size="sm"
									onClick={handleSaveDraft}
									disabled={!canEditReport || isSaving}
								>
									{updateImagingOrder.isPending ? "Saving..." : "Save draft"}
								</Button>
							)}
							{(!isReleased || isAmending) && (
								<Button size="sm" onClick={handleRelease} disabled={!canRelease || isSaving}>
									<FileCheck2 className="mr-2 size-4" />
									{signImagingReport.isPending
										? "Releasing..."
										: isAmending
											? "Release amendment"
											: "Sign & release"}
								</Button>
							)}
						</div>
					</div>

					{!isReleased && order.status !== "completed" && (
						<div className="text-muted-foreground text-xs">
							Complete the imaging study before signing and releasing the report.
						</div>
					)}
				</CardHeader>
				<CardContent className="space-y-4">
					{isAmending && (
						<div className="space-y-2">
							<Label htmlFor="amendment-reason">Amendment reason</Label>
							<Textarea
								id="amendment-reason"
								value={amendmentReason}
								onChange={event => setAmendmentReason(event.target.value)}
								placeholder="Explain why the released report needs an amendment."
								className="min-h-20"
							/>
						</div>
					)}

					<div className="grid gap-4 lg:grid-cols-2">
						<ReportField
							id="technique"
							label="Technique"
							value={technique}
							onChange={setTechnique}
							disabled={!canEditReport}
							className="min-h-28"
						/>
						<ReportField
							id="findings"
							label="Findings"
							value={findings}
							onChange={setFindings}
							disabled={!canEditReport}
							className="min-h-28"
						/>
						<ReportField
							id="impression"
							label="Impression"
							value={impression}
							onChange={setImpression}
							disabled={!canEditReport}
							className="min-h-24"
						/>
						<ReportField
							id="recommendations"
							label="Recommendations"
							value={recommendations}
							onChange={setRecommendations}
							disabled={!canEditReport}
							className="min-h-24"
						/>
					</div>

					<Separator />

					<div className="space-y-2">
						<div className="text-sm font-medium">Attachments</div>
						{attachments.length === 0 ? (
							<div className="text-muted-foreground rounded-md border p-3 text-sm">
								No report attachments. New files should be stored through the protected PACS or
								document integration.
							</div>
						) : (
							attachments.map(attachment => (
								<div
									key={attachment.id}
									className="flex items-center justify-between gap-3 rounded-md border p-3"
								>
									<div className="min-w-0">
										<div className="truncate text-sm font-medium">{attachment.name}</div>
										<div className="text-muted-foreground text-xs">
											Legacy attachment - {formatFileSize(attachment.size)}
										</div>
									</div>
									<Button
										variant="outline"
										size="sm"
										onClick={() => window.open(attachment.dataUrl, "_blank", "noopener,noreferrer")}
									>
										Open
									</Button>
								</div>
							))
						)}
					</div>

					{structured.amendments && structured.amendments.length > 0 && (
						<>
							<Separator />
							<div className="space-y-2">
								<div className="text-sm font-medium">Amendment history</div>
								{structured.amendments.map((amendment, index) => (
									<div key={`${amendment.amendedAt ?? "amendment"}-${index}`} className="text-sm">
										<span className="text-muted-foreground">
											{formatDateTime(amendment.amendedAt)}
										</span>
										{" - "}
										{amendment.amendmentReason ?? "Reason not recorded"}
									</div>
								))}
							</div>
						</>
					)}
				</CardContent>
			</Card>
		</div>
	)
}

function PacsFrame({ orderId, pacsUrl }: { orderId: string; pacsUrl: string }) {
	const [shouldLoadFrame, setShouldLoadFrame] = useState(false)

	useEffect(() => {
		setShouldLoadFrame(false)

		if (!pacsUrl) return

		const timeoutId = window.setTimeout(() => {
			setShouldLoadFrame(true)
		}, PACS_FRAME_LOAD_DELAY_MS)

		return () => window.clearTimeout(timeoutId)
	}, [orderId, pacsUrl])

	if (!pacsUrl) {
		return (
			<div className="flex h-[548px] flex-col items-center justify-center gap-2 text-zinc-500">
				<ImageOff className="size-8" />
				<div className="font-mono text-xs">NO PACS STUDY LINKED</div>
				<div className="text-xs">The PACS integration has not attached a study URL.</div>
			</div>
		)
	}

	if (!shouldLoadFrame) {
		return (
			<div className="flex h-[548px] flex-col items-center justify-center gap-2 text-zinc-500">
				<MonitorPlay className="size-8" />
				<div className="font-mono text-xs">OPENING PACS STUDY</div>
			</div>
		)
	}

	return (
		<iframe
			title="Embedded PACS viewer"
			src={pacsUrl}
			className="h-[548px] w-full border-0 bg-black"
			loading="lazy"
			referrerPolicy="no-referrer"
			sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
		/>
	)
}

function Detail({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<div className="text-muted-foreground text-xs">{label}</div>
			<div className="truncate font-medium capitalize" title={value}>
				{value}
			</div>
		</div>
	)
}

function WorkflowCheckpoint({
	label,
	value,
	complete,
}: {
	label: string
	value: string | null | undefined
	complete: boolean
}) {
	return (
		<div className="flex gap-2 rounded-md border p-3">
			{complete ? (
				<CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" />
			) : (
				<Clock3 className="text-muted-foreground mt-0.5 size-4 shrink-0" />
			)}
			<div>
				<div className="text-xs font-medium">{label}</div>
				<div className="text-muted-foreground mt-1 text-xs">{formatDateTime(value)}</div>
			</div>
		</div>
	)
}

function ReportField({
	id,
	label,
	value,
	onChange,
	disabled,
	className,
}: {
	id: string
	label: string
	value: string
	onChange: (value: string) => void
	disabled: boolean
	className?: string
}) {
	return (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			<Textarea
				id={id}
				value={value}
				onChange={event => onChange(event.target.value)}
				disabled={disabled}
				className={className}
			/>
		</div>
	)
}
