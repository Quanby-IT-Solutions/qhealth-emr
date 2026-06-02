"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, PenLine, Printer, X } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { cn } from "@/core/lib/utils"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import {
	useCreatePrescriptionMutation,
	useDiscontinueMedOrderMutation,
	useImagingOrderListQuery,
	useLabOrderListQuery,
	useMedOrderListQuery,
	usePrescriptionListQuery,
	useSignPrescriptionMutation,
} from "@/features/orders/api/orders.hooks"

import { CreateImagingOrderDialog } from "./create-imaging-order-dialog"
import { CreateLabOrderDialog } from "./create-lab-order-dialog"
import { CreateMedOrderDialog } from "./create-med-order-dialog"
import { CreateOrderSetDialog } from "./create-order-set-dialog"
import { ImagingDashboard } from "./imaging-dashboard"
import { OrderGroupRow } from "./order-group-row"
import { PrescriptionPrintDialog } from "./prescription-print-dialog"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(
		permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`)
	)
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

function formatDateTime(dateStr: string | null | undefined) {
	if (!dateStr) return "--"
	return new Date(dateStr).toLocaleString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

function formatDate(dateStr: string | null | undefined) {
	if (!dateStr) return "--"
	return new Date(dateStr).toLocaleDateString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
	})
}

function mutationErrorMessage(error: unknown, fallback: string) {
	return error instanceof Error ? error.message : fallback
}

function medStatusVariant(status: string) {
	switch (status) {
		case "active":
			return "default" as const
		case "pending_verification":
			return "secondary" as const
		case "verified":
			return "secondary" as const
		case "discontinued":
			return "outline" as const
		case "rejected":
			return "destructive" as const
		case "cancelled":
			return "outline" as const
		default:
			return "outline" as const
	}
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

function formatImagingOrderName(modality: string, bodyPart: string) {
	switch (modality) {
		case "xray":
			return `X-Ray - ${bodyPart}`
		case "ct":
			return `CT - ${bodyPart}`
		case "mri":
			return `MRI - ${bodyPart}`
		case "ultrasound":
			return `Ultrasound - ${bodyPart}`
		default:
			return `${modality} - ${bodyPart}`
	}
}

function formatIndication(
	clinicalIndication: string | null | undefined,
	icd10Code: string | null | undefined,
	icd10Display: string | null | undefined
) {
	const diagnosis = [icd10Code, icd10Display].filter(Boolean).join(" - ")
	return {
		clinical: clinicalIndication,
		diagnosis: diagnosis || null,
	}
}

function orderTypeVariant(type: "Medication" | "Lab" | "Imaging") {
	switch (type) {
		case "Medication":
			return "default" as const
		case "Lab":
			return "secondary" as const
		default:
			return "outline" as const
	}
}

function normalizeDate(dateStr: string) {
	const date = new Date(dateStr)
	date.setHours(0, 0, 0, 0)
	return date
}

function isPastDate(dateStr: string | null | undefined) {
	if (!dateStr) return true
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	return normalizeDate(dateStr) < today
}

function isWithinNextDays(dateStr: string | null | undefined, days: number) {
	if (!dateStr || isPastDate(dateStr)) return false
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	const diffMs = normalizeDate(dateStr).getTime() - today.getTime()
	return diffMs <= days * 24 * 60 * 60 * 1000
}

function buildLicenseWarningMessages(orderingStaffProfile: {
	prcExpiry?: string | null
	ptrExpiry?: string | null
}) {
	const messages: string[] = []

	if (orderingStaffProfile.prcExpiry) {
		if (isPastDate(orderingStaffProfile.prcExpiry)) {
			messages.push(
				`Your PRC license expired on ${formatDate(orderingStaffProfile.prcExpiry)}. e-Prescription generation will be blocked until renewed.`
			)
		} else if (isWithinNextDays(orderingStaffProfile.prcExpiry, 30)) {
			messages.push(
				`Your PRC license expires on ${formatDate(orderingStaffProfile.prcExpiry)}. e-Prescription generation will be blocked until renewed.`
			)
		}
	}

	if (orderingStaffProfile.ptrExpiry) {
		if (isPastDate(orderingStaffProfile.ptrExpiry)) {
			messages.push(
				`Your PTR number expired on ${formatDate(orderingStaffProfile.ptrExpiry)}. e-Prescription generation will be blocked until renewed.`
			)
		} else if (isWithinNextDays(orderingStaffProfile.ptrExpiry, 30)) {
			messages.push(
				`Your PTR number expires on ${formatDate(orderingStaffProfile.ptrExpiry)}. e-Prescription generation will be blocked until renewed.`
			)
		}
	}

	return messages
}

const PENDING_STATUSES = new Set(["pending_verification", "pending"])
const ACTIVE_STATUSES = new Set(["active", "verified"])
const COMPLETED_STATUSES = new Set(["discontinued", "completed", "cancelled", "rejected"])
const filterFieldClassName = "flex min-w-0 flex-col gap-1"
const filterLabelClassName = "text-muted-foreground h-4 text-xs font-medium leading-4"
const filterControlClassName = "h-8 w-full rounded-full px-4"
const filterShellClassName = "mx-4 mb-4 rounded-lg border bg-muted/10 px-3 py-4 sm:px-4"
const tableShellClassName = "hidden overflow-hidden rounded-lg border bg-background xl:block"
const tableHeaderRowClassName = "bg-muted/30 hover:bg-muted/30"
const tableHeadClassName = "text-muted-foreground h-10 px-4 text-xs font-semibold"
const tableCellClassName = "px-4 py-3 align-top"
const mobileListClassName = "space-y-3 xl:hidden"
const PAGE_SIZE = 10

type OrderPriorityFilter = "all" | "routine" | "urgent" | "stat"
type DateFilter = "any" | "today" | "last_7_days"

const priorityFilterLabels: Record<OrderPriorityFilter, string> = {
	all: "All priorities",
	routine: "Routine",
	urgent: "Urgent",
	stat: "Stat",
}

const dateFilterLabels: Record<DateFilter, string> = {
	any: "Any date",
	today: "Today",
	last_7_days: "Last 7 days",
}

function statusLabel(status: string) {
	if (!status) return "--"
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

function matchesPriority(priority: string | null | undefined, filter: OrderPriorityFilter) {
	return filter === "all" || priority === filter
}

function matchesDate(createdAt: string | null | undefined, filter: DateFilter) {
	if (filter === "any") return true
	if (!createdAt) return false
	const date = new Date(createdAt)
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	const endOfToday = new Date(today)
	endOfToday.setHours(23, 59, 59, 999)

	if (filter === "today") return date >= today && date <= endOfToday

	const last7Days = new Date(today)
	last7Days.setDate(today.getDate() - 6)
	return date >= last7Days && date <= endOfToday
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
		start: items.length ? start + 1 : 0,
		end: Math.min(start + PAGE_SIZE, items.length),
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

interface MedOrderItem {
	id: string
	genericName: string
	brandName: string | null
	dose: string
	doseUnit: string
	doseForm: string
	route: string
	frequency: string
	durationDays: number | null
	isPrn: boolean
	isControlledSubstance: boolean
	priority?: string | null
	pdeaSchedule: string | null
	pdeaTrancheNumber: number | null
	pdeaTrancheTotal: number | null
	status: string
	orderingStaffName: string | null
	createdAt: string
}

function groupTranches(orders: MedOrderItem[]): Array<{
	parent: MedOrderItem
	tranches: MedOrderItem[]
}> {
	const trancheParents = orders.filter(
		o => o.pdeaTrancheNumber === 1 && (o.pdeaTrancheTotal ?? 0) > 1
	)
	const trancheChildren = orders.filter(
		o => o.pdeaTrancheNumber !== null && o.pdeaTrancheNumber > 1
	)
	const standalone = orders.filter(
		o =>
			o.pdeaTrancheNumber === null || (o.pdeaTrancheNumber === 1 && (o.pdeaTrancheTotal ?? 1) <= 1)
	)

	const grouped = trancheParents.map(parent => ({
		parent,
		tranches: trancheChildren
			.filter(
				c =>
					c.genericName === parent.genericName &&
					c.dose === parent.dose &&
					c.frequency === parent.frequency
			)
			.sort((a, b) => (a.pdeaTrancheNumber ?? 0) - (b.pdeaTrancheNumber ?? 0)),
	}))

	const standaloneGrouped = standalone.map(o => ({ parent: o, tranches: [] as MedOrderItem[] }))

	return [...grouped, ...standaloneGrouped]
}

interface MedOrdersViewProps {
	orders: MedOrderItem[]
	facilityId: string
	encounterId: string
	patientId: string
	onDiscontinue?: (id: string) => void
	onGenerateRx?: (id: string) => void
	discontinuePending: boolean
	createRxPending: boolean
	prescriberHasValidLicense: boolean
}

function MedOrdersView({
	orders,
	onDiscontinue,
	onGenerateRx,
	discontinuePending,
	createRxPending,
	prescriberHasValidLicense,
}: MedOrdersViewProps) {
	const [statusTab, setStatusTab] = useState<"all" | "pending" | "active" | "completed">("all")
	const [search, setSearch] = useState("")
	const [priorityFilter, setPriorityFilter] = useState<OrderPriorityFilter>("all")
	const [dateFilter, setDateFilter] = useState<DateFilter>("any")
	const [page, setPage] = useState(1)

	const filtered = orders.filter(o => {
		const matchesStatus =
			statusTab === "all"
				? true
				: statusTab === "pending"
					? PENDING_STATUSES.has(o.status)
					: statusTab === "active"
						? ACTIVE_STATUSES.has(o.status)
						: COMPLETED_STATUSES.has(o.status)
		return (
			matchesStatus &&
			matchesPriority(o.priority ?? "routine", priorityFilter) &&
			matchesDate(o.createdAt, dateFilter) &&
			matchesSearch(search, [
				o.genericName,
				o.brandName,
				o.dose,
				o.doseUnit,
				o.doseForm,
				o.route,
				o.frequency,
				o.orderingStaffName,
			])
		)
	})

	const grouped = groupTranches(filtered)
	const pagedGroups = paginate(grouped, page)
	const hasFilters =
		search.trim() || priorityFilter !== "all" || dateFilter !== "any" || statusTab !== "all"

	return (
		<div className="px-4 pb-4">
			<div className={cn(filterShellClassName, "mx-0")}>
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1.5fr)_minmax(150px,0.8fr)_minmax(150px,0.8fr)_minmax(150px,0.8fr)_auto] lg:items-end">
					<div className={filterFieldClassName}>
						<label className={filterLabelClassName}>Search</label>
						<Input
							value={search}
							onChange={event => setSearch(event.target.value)}
							placeholder="Drug, route, frequency, clinician"
							className={filterControlClassName}
						/>
					</div>
					<div className={filterFieldClassName}>
						<label className={filterLabelClassName}>Status</label>
						<Select value={statusTab} onValueChange={v => setStatusTab(v as typeof statusTab)}>
							<SelectTrigger className={filterControlClassName}>
								<SelectValue>
									{statusTab === "all" ? "All statuses" : statusLabel(statusTab)}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All statuses</SelectItem>
								<SelectItem value="pending">Pending</SelectItem>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="completed">Completed</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className={filterFieldClassName}>
						<label className={filterLabelClassName}>Priority</label>
						<Select
							value={priorityFilter}
							onValueChange={v => setPriorityFilter(v as OrderPriorityFilter)}
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
						<label className={filterLabelClassName}>Date</label>
						<Select value={dateFilter} onValueChange={v => setDateFilter(v as DateFilter)}>
							<SelectTrigger className={filterControlClassName}>
								<SelectValue>{dateFilterLabels[dateFilter]}</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{Object.entries(dateFilterLabels).map(([value, label]) => (
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
							setStatusTab("all")
							setPriorityFilter("all")
							setDateFilter("any")
							setPage(1)
						}}
					>
						Clear
					</Button>
				</div>
			</div>

			{grouped.length === 0 ? (
				<div className="text-muted-foreground py-8 text-center text-sm">
					{statusTab === "all" ? "No medication orders." : `No ${statusTab} medication orders.`}
				</div>
			) : (
				<>
					<div className={tableShellClassName}>
						<Table className="table-fixed">
							<TableHeader>
								<TableRow className={tableHeaderRowClassName}>
									<TableHead className={cn(tableHeadClassName, "w-[20%]")}>Drug</TableHead>
									<TableHead className={cn(tableHeadClassName, "w-[21%]")}>Order</TableHead>
									<TableHead className={cn(tableHeadClassName, "w-[16%]")}>Status</TableHead>
									<TableHead className={cn(tableHeadClassName, "w-[17%]")}>Ordered By</TableHead>
									<TableHead className={cn(tableHeadClassName, "w-[16%]")}>Date</TableHead>
									<TableHead className={cn(tableHeadClassName, "w-[10%] text-right")}>
										Actions
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{pagedGroups.items.map(({ parent, tranches }) => (
									<OrderGroupRow
										key={parent.id}
										parent={parent}
										tranches={tranches}
										statusBadge={medStatusVariant}
										formatDate={formatDateTime}
										onDiscontinue={onDiscontinue}
										onGenerateRx={onGenerateRx}
										discontinuePending={discontinuePending}
										createRxPending={createRxPending}
										prescriberHasValidLicense={prescriberHasValidLicense}
									/>
								))}
							</TableBody>
						</Table>
					</div>
					<div className={mobileListClassName}>
						{pagedGroups.items.map(({ parent }) => (
							<div key={parent.id} className="bg-background rounded-lg border p-4">
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<p className="font-semibold">{parent.genericName}</p>
										{parent.brandName && (
											<p className="text-muted-foreground text-xs">{parent.brandName}</p>
										)}
									</div>
									<Badge variant={medStatusVariant(parent.status)}>
										{statusLabel(parent.status)}
									</Badge>
								</div>
								<div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
									<p>
										<span className="text-muted-foreground">Dose: </span>
										{parent.dose} {parent.doseUnit}
									</p>
									<p>
										<span className="text-muted-foreground">Route: </span>
										{parent.route}
									</p>
									<p>
										<span className="text-muted-foreground">Frequency: </span>
										{parent.frequency}
									</p>
									<p>
										<span className="text-muted-foreground">Date: </span>
										{formatDateTime(parent.createdAt)}
									</p>
								</div>
							</div>
						))}
					</div>
					<PaginationControls
						page={pagedGroups.currentPage}
						total={grouped.length}
						onPageChange={setPage}
					/>
				</>
			)}
		</div>
	)
}

interface OrdersTabProps {
	encounterId: string
	facilityId: string
	patientId: string
	encounterType?: "inpatient" | "outpatient" | "emergency" | "telemedicine"
}

export function OrdersTab({ encounterId, facilityId, patientId, encounterType }: OrdersTabProps) {
	const [ordersTab, setOrdersTab] = useState<
		"all" | "medications" | "labs" | "imaging" | "prescriptions"
	>("all")
	const [createMedOpen, setCreateMedOpen] = useState(false)
	const [createLabOpen, setCreateLabOpen] = useState(false)
	const [createImagingOpen, setCreateImagingOpen] = useState(false)
	const [createOrderSetOpen, setCreateOrderSetOpen] = useState(false)
	const [rxPrintOpen, setRxPrintOpen] = useState(false)
	const [showLicenseAlert, setShowLicenseAlert] = useState(true)
	const [allSearch, setAllSearch] = useState("")
	const [allTypeFilter, setAllTypeFilter] = useState<"all" | "Medication" | "Lab" | "Imaging">(
		"all"
	)
	const [allPriorityFilter, setAllPriorityFilter] = useState<OrderPriorityFilter>("all")
	const [allStatusFilter, setAllStatusFilter] = useState("all")
	const [allDateFilter, setAllDateFilter] = useState<DateFilter>("any")
	const [labSearch, setLabSearch] = useState("")
	const [labPriorityFilter, setLabPriorityFilter] = useState<OrderPriorityFilter>("all")
	const [labStatusFilter, setLabStatusFilter] = useState("all")
	const [labPanelFilter, setLabPanelFilter] = useState<"all" | "single" | "panel">("all")
	const [labDateFilter, setLabDateFilter] = useState<DateFilter>("any")
	const [rxSearch, setRxSearch] = useState("")
	const [rxStatusFilter, setRxStatusFilter] = useState("all")
	const [rxTypeFilter, setRxTypeFilter] = useState<"all" | "controlled" | "regular">("all")
	const [rxDateFilter, setRxDateFilter] = useState<DateFilter>("any")
	const [allPage, setAllPage] = useState(1)
	const [labPage, setLabPage] = useState(1)
	const [rxPage, setRxPage] = useState(1)

	const permSet = usePermissionSet()
	const { data: profile } = useMyProfile()
	const medOrders = useMedOrderListQuery({ encounterId })
	const labOrders = useLabOrderListQuery({ encounterId })
	const imagingOrders = useImagingOrderListQuery({ encounterId })
	const prescriptionsData = usePrescriptionListQuery({ encounterId })

	const discontinueMed = useDiscontinueMedOrderMutation()
	const createPrescription = useCreatePrescriptionMutation()
	const signPrescription = useSignPrescriptionMutation()
	const canCreateOrders = can(permSet, "orders", "create")
	const canEditOrders = can(permSet, "orders", "edit")
	const canSignOrders = can(permSet, "orders", "sign")
	const canPrescribe = canCreateOrders && canSignOrders
	const orderingStaffProfile =
		profile?.staffProfiles?.find(staffProfile => staffProfile.facilityId === facilityId) ??
		profile?.staffProfiles?.[0]
	const orderingStaffId = orderingStaffProfile?.id ?? ""
	const prescriberHasValidLicense = Boolean(
		orderingStaffProfile?.prcLicenseNumber &&
		orderingStaffProfile?.ptrNumber &&
		orderingStaffProfile?.prcExpiry &&
		orderingStaffProfile?.ptrExpiry &&
		!isPastDate(orderingStaffProfile.prcExpiry) &&
		!isPastDate(orderingStaffProfile.ptrExpiry)
	)
	const licenseWarningMessages = orderingStaffProfile
		? buildLicenseWarningMessages(orderingStaffProfile)
		: []
	const hasExpiredLicenseWarning =
		Boolean(orderingStaffProfile?.prcExpiry && isPastDate(orderingStaffProfile.prcExpiry)) ||
		Boolean(orderingStaffProfile?.ptrExpiry && isPastDate(orderingStaffProfile.ptrExpiry))
	const showPrescriberLicenseWarning = canPrescribe
	const medOrdersData = useMemo(() => medOrders.data?.data ?? [], [medOrders.data?.data])
	const labOrdersData = useMemo(() => labOrders.data?.data ?? [], [labOrders.data?.data])
	const prescriptions = useMemo(
		() => prescriptionsData.data?.data ?? [],
		[prescriptionsData.data?.data]
	)
	const controlledMedicationOrderIds = useMemo(
		() =>
			new Set(medOrdersData.filter(order => order.isControlledSubstance).map(order => order.id)),
		[medOrdersData]
	)
	const medicationOrdersById = useMemo(
		() => new Map(medOrdersData.map(order => [order.id, order])),
		[medOrdersData]
	)
	const allOrders = useMemo(
		() =>
			[
				...medOrdersData.map(order => ({
					id: order.id,
					type: "Medication" as const,
					name: order.genericName,
					priority: order.priority ?? "routine",
					status: order.status,
					orderedBy: order.orderingStaffName,
					createdAt: order.createdAt,
				})),
				...labOrdersData.map(order => ({
					id: order.id,
					type: "Lab" as const,
					name: order.testName,
					priority: order.priority,
					status: order.status,
					orderedBy: order.orderingStaffName,
					createdAt: order.createdAt,
				})),
				...(imagingOrders.data?.data ?? []).map(order => ({
					id: order.id,
					type: "Imaging" as const,
					name: formatImagingOrderName(order.modality, order.bodyPart),
					priority: order.priority,
					status: order.status,
					orderedBy: order.orderingStaffName,
					createdAt: order.createdAt,
				})),
			].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
		[imagingOrders.data?.data, labOrdersData, medOrdersData]
	)
	const allStatusOptions = useMemo(
		() => Array.from(new Set(allOrders.map(order => order.status))).sort(),
		[allOrders]
	)
	const labStatusOptions = useMemo(
		() => Array.from(new Set(labOrdersData.map(order => order.status))).sort(),
		[labOrdersData]
	)
	const rxStatusOptions = useMemo(
		() => Array.from(new Set(prescriptions.map(rx => rx.status))).sort(),
		[prescriptions]
	)
	const filteredAllOrders = useMemo(
		() =>
			allOrders.filter(order => {
				return (
					(allTypeFilter === "all" || order.type === allTypeFilter) &&
					matchesPriority(order.priority, allPriorityFilter) &&
					(allStatusFilter === "all" || order.status === allStatusFilter) &&
					matchesDate(order.createdAt, allDateFilter) &&
					matchesSearch(allSearch, [
						order.type,
						order.name,
						order.priority,
						statusLabel(order.status),
						order.orderedBy,
					])
				)
			}),
		[allDateFilter, allOrders, allPriorityFilter, allSearch, allStatusFilter, allTypeFilter]
	)
	const filteredLabOrders = useMemo(
		() =>
			labOrdersData.filter(lab => {
				const indication = formatIndication(
					lab.clinicalIndication,
					lab.indicationIcd10Code,
					lab.indicationIcd10Display
				)
				const isPanel = Boolean(lab.panelName)
				return (
					matchesPriority(lab.priority, labPriorityFilter) &&
					(labStatusFilter === "all" || lab.status === labStatusFilter) &&
					(labPanelFilter === "all" ||
						(labPanelFilter === "panel" && isPanel) ||
						(labPanelFilter === "single" && !isPanel)) &&
					matchesDate(lab.createdAt, labDateFilter) &&
					matchesSearch(labSearch, [
						lab.testName,
						lab.panelName,
						lab.loincCode,
						indication.clinical,
						indication.diagnosis,
						lab.orderingStaffName,
					])
				)
			}),
		[labDateFilter, labOrdersData, labPanelFilter, labPriorityFilter, labSearch, labStatusFilter]
	)
	const filteredPrescriptions = useMemo(
		() =>
			prescriptions.filter(rx => {
				const content = rx.prescriptionContent as Record<string, unknown> | null
				const contentGenericName =
					typeof content?.genericName === "string" ? content.genericName.trim() : ""
				const drugName =
					contentGenericName || medicationOrdersById.get(rx.medicationOrderId)?.genericName || ""
				const isControlledPrescription =
					controlledMedicationOrderIds.has(rx.medicationOrderId) ||
					Boolean(content?.isControlledSubstance)
				return (
					(rxStatusFilter === "all" || rx.status === rxStatusFilter) &&
					(rxTypeFilter === "all" ||
						(rxTypeFilter === "controlled" && isControlledPrescription) ||
						(rxTypeFilter === "regular" && !isControlledPrescription)) &&
					matchesDate(rx.createdAt, rxDateFilter) &&
					matchesSearch(rxSearch, [
						drugName,
						rx.prcLicenseNumber,
						rx.ptrNumber,
						rx.pdeaS2License,
						statusLabel(rx.status),
						rx.prescriberStaffName,
					])
				)
			}),
		[
			controlledMedicationOrderIds,
			medicationOrdersById,
			prescriptions,
			rxDateFilter,
			rxSearch,
			rxStatusFilter,
			rxTypeFilter,
		]
	)
	const hasAllFilters =
		allSearch.trim() ||
		allTypeFilter !== "all" ||
		allPriorityFilter !== "all" ||
		allStatusFilter !== "all" ||
		allDateFilter !== "any"
	const hasLabFilters =
		labSearch.trim() ||
		labPriorityFilter !== "all" ||
		labStatusFilter !== "all" ||
		labPanelFilter !== "all" ||
		labDateFilter !== "any"
	const hasRxFilters =
		rxSearch.trim() || rxStatusFilter !== "all" || rxTypeFilter !== "all" || rxDateFilter !== "any"
	const pagedAllOrders = paginate(filteredAllOrders, allPage)
	const pagedLabOrders = paginate(filteredLabOrders, labPage)
	const pagedPrescriptions = paginate(filteredPrescriptions, rxPage)

	function handleGenerateRx(medicationOrderId: string) {
		if (!canPrescribe) return
		if (!prescriberHasValidLicense) {
			toast.error("Cannot generate Rx until PRC and PTR credentials are active.")
			return
		}

		const toastId = toast.loading("Generating e-Prescription draft...")
		createPrescription.mutate(
			{
				facilityId,
				encounterId,
				medicationOrderId,
				patientId,
			},
			{
				onSuccess: () => {
					toast.success("e-Prescription draft generated.", { id: toastId })
				},
				onError: error => {
					toast.error(mutationErrorMessage(error, "Failed to generate e-Prescription."), {
						id: toastId,
					})
				},
			}
		)
	}

	return (
		<>
			{showPrescriberLicenseWarning && showLicenseAlert && licenseWarningMessages.length > 0 && (
				<Alert variant={hasExpiredLicenseWarning ? "destructive" : "default"} className="mb-4">
					<AlertTriangle className="size-4" />
					<AlertTitle>Prescription License Warning</AlertTitle>
					<AlertDescription>
						{licenseWarningMessages.map((message, index) => (
							<p key={index}>{message}</p>
						))}
					</AlertDescription>
					<AlertAction>
						<Button
							variant="ghost"
							size="icon-xs"
							onClick={() => setShowLicenseAlert(false)}
							aria-label="Dismiss license warning"
						>
							<X className="size-3.5" />
						</Button>
					</AlertAction>
				</Alert>
			)}

			<Tabs value={ordersTab} onValueChange={v => setOrdersTab(v as typeof ordersTab)}>
				<TabsList variant="line">
					<TabsTrigger value="all">All Orders</TabsTrigger>
					<TabsTrigger value="medications">Medications</TabsTrigger>
					<TabsTrigger value="labs">Labs</TabsTrigger>
					<TabsTrigger value="imaging">Imaging</TabsTrigger>
					<TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
				</TabsList>

				<TabsContent value="all">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between">
							<CardTitle>All Orders</CardTitle>
							{canCreateOrders ? (
								<Button variant="outline" size="sm" onClick={() => setCreateOrderSetOpen(true)}>
									Order Set
								</Button>
							) : null}
						</CardHeader>
						<CardContent className="p-0 pb-4">
							<div className={filterShellClassName}>
								<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.5fr)_minmax(130px,0.75fr)_minmax(150px,0.85fr)_minmax(150px,0.85fr)_minmax(140px,0.75fr)_auto] xl:items-end">
									<div className={filterFieldClassName}>
										<label className={filterLabelClassName}>Search</label>
										<Input
											value={allSearch}
											onChange={event => setAllSearch(event.target.value)}
											placeholder="Order, type, clinician"
											className={filterControlClassName}
										/>
									</div>
									<div className={filterFieldClassName}>
										<label className={filterLabelClassName}>Type</label>
										<Select
											value={allTypeFilter}
											onValueChange={v => setAllTypeFilter(v as typeof allTypeFilter)}
										>
											<SelectTrigger className={filterControlClassName}>
												<SelectValue>
													{allTypeFilter === "all" ? "All types" : allTypeFilter}
												</SelectValue>
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">All types</SelectItem>
												<SelectItem value="Medication">Medication</SelectItem>
												<SelectItem value="Lab">Lab</SelectItem>
												<SelectItem value="Imaging">Imaging</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className={filterFieldClassName}>
										<label className={filterLabelClassName}>Priority</label>
										<Select
											value={allPriorityFilter}
											onValueChange={v => setAllPriorityFilter(v as OrderPriorityFilter)}
										>
											<SelectTrigger className={filterControlClassName}>
												<SelectValue>{priorityFilterLabels[allPriorityFilter]}</SelectValue>
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
										<label className={filterLabelClassName}>Status</label>
										<Select value={allStatusFilter} onValueChange={v => setAllStatusFilter(v ?? "")}>
											<SelectTrigger className={filterControlClassName}>
												<SelectValue>
													{allStatusFilter === "all"
														? "All statuses"
														: statusLabel(allStatusFilter)}
												</SelectValue>
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">All statuses</SelectItem>
												{allStatusOptions.map(status => (
													<SelectItem key={status} value={status}>
														{statusLabel(status)}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div className={filterFieldClassName}>
										<label className={filterLabelClassName}>Date</label>
										<Select
											value={allDateFilter}
											onValueChange={v => setAllDateFilter(v as DateFilter)}
										>
											<SelectTrigger className={filterControlClassName}>
												<SelectValue>{dateFilterLabels[allDateFilter]}</SelectValue>
											</SelectTrigger>
											<SelectContent>
												{Object.entries(dateFilterLabels).map(([value, label]) => (
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
										disabled={!hasAllFilters}
										onClick={() => {
											setAllSearch("")
											setAllTypeFilter("all")
											setAllPriorityFilter("all")
											setAllStatusFilter("all")
											setAllDateFilter("any")
											setAllPage(1)
										}}
									>
										Clear
									</Button>
								</div>
							</div>
							{medOrders.isLoading || labOrders.isLoading || imagingOrders.isLoading ? (
								<div className="text-muted-foreground py-8 text-center text-sm">Loading...</div>
							) : !filteredAllOrders.length ? (
								<div className="text-muted-foreground py-8 text-center text-sm">No orders yet.</div>
							) : (
								<>
									<div className={cn(tableShellClassName, "mx-4")}>
										<Table className="table-fixed">
											<TableHeader>
												<TableRow className={tableHeaderRowClassName}>
													<TableHead className={cn(tableHeadClassName, "w-[10%]")}>Type</TableHead>
													<TableHead className={cn(tableHeadClassName, "w-[24%]")}>Name</TableHead>
													<TableHead className={cn(tableHeadClassName, "w-[12%]")}>
														Priority
													</TableHead>
													<TableHead className={cn(tableHeadClassName, "w-[16%]")}>
														Status
													</TableHead>
													<TableHead className={cn(tableHeadClassName, "w-[18%]")}>
														Ordered By
													</TableHead>
													<TableHead className={cn(tableHeadClassName, "w-[20%]")}>Date</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{pagedAllOrders.items.map(order => (
													<TableRow key={`${order.type}-${order.id}`}>
														<TableCell className={tableCellClassName}>
															<Badge variant={orderTypeVariant(order.type)}>{order.type}</Badge>
														</TableCell>
														<TableCell className={cn(tableCellClassName, "font-medium")}>
															<p className="truncate" title={order.name}>
																{order.name}
															</p>
														</TableCell>
														<TableCell className={tableCellClassName}>
															<Badge variant={priorityVariant(order.priority)}>
																{order.priority}
															</Badge>
														</TableCell>
														<TableCell className={tableCellClassName}>
															<Badge
																variant={medStatusVariant(order.status)}
																className="max-w-full truncate"
															>
																{statusLabel(order.status)}
															</Badge>
														</TableCell>
														<TableCell className={cn(tableCellClassName, "overflow-hidden")}>
															<p className="truncate" title={order.orderedBy ?? undefined}>
																{order.orderedBy ?? "--"}
															</p>
														</TableCell>
														<TableCell className={cn(tableCellClassName, "overflow-hidden")}>
															<p className="truncate" title={formatDateTime(order.createdAt)}>
																{formatDateTime(order.createdAt)}
															</p>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>
									<div className={cn(mobileListClassName, "px-4")}>
										{pagedAllOrders.items.map(order => (
											<div
												key={`${order.type}-${order.id}`}
												className="bg-background rounded-lg border p-4"
											>
												<div className="flex items-start justify-between gap-3">
													<div className="min-w-0">
														<Badge variant={orderTypeVariant(order.type)} className="mb-2">
															{order.type}
														</Badge>
														<p className="truncate font-semibold" title={order.name}>
															{order.name}
														</p>
														<p className="text-muted-foreground mt-1 text-xs">
															{order.orderedBy ?? "--"} - {formatDateTime(order.createdAt)}
														</p>
													</div>
													<div className="flex flex-col items-end gap-1">
														<Badge variant={priorityVariant(order.priority)}>
															{order.priority}
														</Badge>
														<Badge variant={medStatusVariant(order.status)}>
															{statusLabel(order.status)}
														</Badge>
													</div>
												</div>
											</div>
										))}
									</div>
									<PaginationControls
										page={pagedAllOrders.currentPage}
										total={filteredAllOrders.length}
										onPageChange={setAllPage}
									/>
								</>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="medications">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between">
							<CardTitle>Medication Orders</CardTitle>
							{canPrescribe ? (
								<Button size="sm" onClick={() => setCreateMedOpen(true)}>
									New Medication Order
								</Button>
							) : null}
						</CardHeader>
						<CardContent className="p-0">
							{medOrders.isLoading ? (
								<div className="text-muted-foreground py-8 text-center text-sm">Loading...</div>
							) : !medOrdersData.length ? (
								<div className="text-muted-foreground py-8 text-center text-sm">
									No medication orders yet.
								</div>
							) : (
								<MedOrdersView
									orders={medOrdersData}
									facilityId={facilityId}
									encounterId={encounterId}
									patientId={patientId}
									onDiscontinue={canEditOrders ? id => discontinueMed.mutate(id) : undefined}
									onGenerateRx={canPrescribe ? handleGenerateRx : undefined}
									discontinuePending={discontinueMed.isPending}
									createRxPending={createPrescription.isPending}
									prescriberHasValidLicense={prescriberHasValidLicense}
								/>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="labs">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between">
							<CardTitle>Lab Orders</CardTitle>
							{canCreateOrders ? (
								<div className="flex items-center gap-2">
									<Button variant="outline" size="sm" onClick={() => setCreateOrderSetOpen(true)}>
										Order Set
									</Button>
									<Button size="sm" onClick={() => setCreateLabOpen(true)}>
										New Lab Order
									</Button>
								</div>
							) : null}
						</CardHeader>
						<CardContent className="p-0 pb-4">
							<div className={filterShellClassName}>
								<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_minmax(140px,0.75fr)_minmax(150px,0.8fr)_minmax(140px,0.75fr)_minmax(140px,0.75fr)_auto] xl:items-end">
									<div className={filterFieldClassName}>
										<label className={filterLabelClassName}>Search</label>
										<Input
											value={labSearch}
											onChange={event => setLabSearch(event.target.value)}
											placeholder="Test, panel, LOINC, clinician"
											className={filterControlClassName}
										/>
									</div>
									<div className={filterFieldClassName}>
										<label className={filterLabelClassName}>Priority</label>
										<Select
											value={labPriorityFilter}
											onValueChange={v => setLabPriorityFilter(v as OrderPriorityFilter)}
										>
											<SelectTrigger className={filterControlClassName}>
												<SelectValue>{priorityFilterLabels[labPriorityFilter]}</SelectValue>
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
										<label className={filterLabelClassName}>Status</label>
										<Select value={labStatusFilter} onValueChange={v => setLabStatusFilter(v ?? "")}>
											<SelectTrigger className={filterControlClassName}>
												<SelectValue>
													{labStatusFilter === "all"
														? "All statuses"
														: statusLabel(labStatusFilter)}
												</SelectValue>
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">All statuses</SelectItem>
												{labStatusOptions.map(status => (
													<SelectItem key={status} value={status}>
														{statusLabel(status)}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div className={filterFieldClassName}>
										<label className={filterLabelClassName}>Panel</label>
										<Select
											value={labPanelFilter}
											onValueChange={v => setLabPanelFilter(v as typeof labPanelFilter)}
										>
											<SelectTrigger className={filterControlClassName}>
												<SelectValue>
													{labPanelFilter === "all"
														? "All tests"
														: labPanelFilter === "panel"
															? "Panel"
															: "Single test"}
												</SelectValue>
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">All tests</SelectItem>
												<SelectItem value="panel">Panel</SelectItem>
												<SelectItem value="single">Single test</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className={filterFieldClassName}>
										<label className={filterLabelClassName}>Date</label>
										<Select
											value={labDateFilter}
											onValueChange={v => setLabDateFilter(v as DateFilter)}
										>
											<SelectTrigger className={filterControlClassName}>
												<SelectValue>{dateFilterLabels[labDateFilter]}</SelectValue>
											</SelectTrigger>
											<SelectContent>
												{Object.entries(dateFilterLabels).map(([value, label]) => (
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
										disabled={!hasLabFilters}
										onClick={() => {
											setLabSearch("")
											setLabPriorityFilter("all")
											setLabStatusFilter("all")
											setLabPanelFilter("all")
											setLabDateFilter("any")
											setLabPage(1)
										}}
									>
										Clear
									</Button>
								</div>
							</div>
							{labOrders.isLoading ? (
								<div className="text-muted-foreground py-8 text-center text-sm">Loading...</div>
							) : !filteredLabOrders.length ? (
								<div className="text-muted-foreground py-8 text-center text-sm">
									No lab orders yet.
								</div>
							) : (
								<>
									<div className={cn(tableShellClassName, "mx-4")}>
										<Table className="table-fixed">
											<TableHeader>
												<TableRow className={tableHeaderRowClassName}>
													<TableHead className={cn(tableHeadClassName, "w-[22%]")}>Test</TableHead>
													<TableHead className={cn(tableHeadClassName, "w-[14%]")}>
														Catalog
													</TableHead>
													<TableHead className={cn(tableHeadClassName, "w-[24%]")}>
														Indication
													</TableHead>
													<TableHead className={cn(tableHeadClassName, "w-[8%]")}>
														Priority
													</TableHead>
													<TableHead className={cn(tableHeadClassName, "w-[10%]")}>
														Status
													</TableHead>
													<TableHead className={cn(tableHeadClassName, "w-[22%]")}>
														Ordered
													</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{pagedLabOrders.items.map(lab => {
													const indication = formatIndication(
														lab.clinicalIndication,
														lab.indicationIcd10Code,
														lab.indicationIcd10Display
													)

													return (
														<TableRow
															key={lab.id}
															className={cn(
																lab.priority === "stat" &&
																	"border-l-destructive/70 bg-destructive/5 border-l-2"
															)}
														>
															<TableCell
																className={cn(tableCellClassName, "overflow-hidden font-medium")}
															>
																<p className="truncate" title={lab.testName}>
																	{lab.testName}
																</p>
															</TableCell>
															<TableCell className={cn(tableCellClassName, "overflow-hidden")}>
																<p className="truncate" title={lab.loincCode ?? undefined}>
																	{lab.loincCode ?? "--"}
																</p>
																<p
																	className="text-muted-foreground truncate text-xs"
																	title={lab.panelName ?? undefined}
																>
																	{lab.panelName ?? "Single test"}
																</p>
															</TableCell>
															<TableCell className={cn(tableCellClassName, "overflow-hidden")}>
																<div>
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
																</div>
															</TableCell>
															<TableCell className={cn(tableCellClassName, "overflow-hidden")}>
																<Badge
																	variant={priorityVariant(lab.priority)}
																	className="max-w-full truncate whitespace-nowrap"
																>
																	{lab.priority}
																</Badge>
															</TableCell>
															<TableCell className={cn(tableCellClassName, "overflow-hidden")}>
																<Badge
																	variant={medStatusVariant(lab.status)}
																	className="max-w-full truncate whitespace-nowrap"
																>
																	{statusLabel(lab.status)}
																</Badge>
															</TableCell>
															<TableCell className={cn(tableCellClassName, "overflow-hidden")}>
																<p className="truncate" title={lab.orderingStaffName ?? undefined}>
																	{lab.orderingStaffName ?? "--"}
																</p>
																<p
																	className="text-muted-foreground truncate text-xs"
																	title={formatDateTime(lab.createdAt)}
																>
																	{formatDateTime(lab.createdAt)}
																</p>
															</TableCell>
														</TableRow>
													)
												})}
											</TableBody>
										</Table>
									</div>
									<div className={cn(mobileListClassName, "px-4")}>
										{pagedLabOrders.items.map(lab => {
											const indication = formatIndication(
												lab.clinicalIndication,
												lab.indicationIcd10Code,
												lab.indicationIcd10Display
											)
											return (
												<div key={lab.id} className="bg-background rounded-lg border p-4">
													<div className="flex items-start justify-between gap-3">
														<div className="min-w-0">
															<p className="truncate font-semibold" title={lab.testName}>
																{lab.testName}
															</p>
															<p className="text-muted-foreground mt-1 text-xs">
																{lab.loincCode ?? "--"} - {lab.panelName ?? "Single test"}
															</p>
														</div>
														<Badge variant={priorityVariant(lab.priority)}>{lab.priority}</Badge>
													</div>
													<div className="mt-3 space-y-1 text-sm">
														<p>{indication.clinical ?? "--"}</p>
														{indication.diagnosis && (
															<p className="text-muted-foreground text-xs">
																{indication.diagnosis}
															</p>
														)}
														<p className="text-muted-foreground text-xs">
															{lab.orderingStaffName ?? "--"} - {formatDateTime(lab.createdAt)}
														</p>
													</div>
												</div>
											)
										})}
									</div>
									<PaginationControls
										page={pagedLabOrders.currentPage}
										total={filteredLabOrders.length}
										onPageChange={setLabPage}
									/>
								</>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="imaging">
					<ImagingDashboard
						orders={imagingOrders.data?.data ?? []}
						isLoading={imagingOrders.isLoading}
						onNewOrder={canCreateOrders ? () => setCreateImagingOpen(true) : undefined}
					/>
				</TabsContent>

				<TabsContent value="prescriptions">
					<Card>
						<CardHeader>
							<CardTitle>Prescriptions</CardTitle>
						</CardHeader>
						<CardContent className="p-0 pb-4">
							<div className={filterShellClassName}>
								<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1.5fr)_minmax(150px,0.8fr)_minmax(150px,0.8fr)_minmax(140px,0.75fr)_auto] lg:items-end">
									<div className={filterFieldClassName}>
										<label className={filterLabelClassName}>Search</label>
										<Input
											value={rxSearch}
											onChange={event => setRxSearch(event.target.value)}
											placeholder="Drug, PRC, PTR, clinician"
											className={filterControlClassName}
										/>
									</div>
									<div className={filterFieldClassName}>
										<label className={filterLabelClassName}>Status</label>
										<Select value={rxStatusFilter} onValueChange={v => setRxStatusFilter(v ?? "")}>
											<SelectTrigger className={filterControlClassName}>
												<SelectValue>
													{rxStatusFilter === "all" ? "All statuses" : statusLabel(rxStatusFilter)}
												</SelectValue>
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">All statuses</SelectItem>
												{rxStatusOptions.map(status => (
													<SelectItem key={status} value={status}>
														{statusLabel(status)}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div className={filterFieldClassName}>
										<label className={filterLabelClassName}>Type</label>
										<Select
											value={rxTypeFilter}
											onValueChange={v => setRxTypeFilter(v as typeof rxTypeFilter)}
										>
											<SelectTrigger className={filterControlClassName}>
												<SelectValue>
													{rxTypeFilter === "all"
														? "All prescriptions"
														: rxTypeFilter === "controlled"
															? "Controlled"
															: "Regular"}
												</SelectValue>
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">All prescriptions</SelectItem>
												<SelectItem value="controlled">Controlled</SelectItem>
												<SelectItem value="regular">Regular</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className={filterFieldClassName}>
										<label className={filterLabelClassName}>Date</label>
										<Select
											value={rxDateFilter}
											onValueChange={v => setRxDateFilter(v as DateFilter)}
										>
											<SelectTrigger className={filterControlClassName}>
												<SelectValue>{dateFilterLabels[rxDateFilter]}</SelectValue>
											</SelectTrigger>
											<SelectContent>
												{Object.entries(dateFilterLabels).map(([value, label]) => (
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
										disabled={!hasRxFilters}
										onClick={() => {
											setRxSearch("")
											setRxStatusFilter("all")
											setRxTypeFilter("all")
											setRxDateFilter("any")
											setRxPage(1)
										}}
									>
										Clear
									</Button>
								</div>
							</div>
							{prescriptionsData.isLoading ? (
								<div className="text-muted-foreground py-8 text-center text-sm">Loading...</div>
							) : !filteredPrescriptions.length ? (
								<div className="text-muted-foreground py-8 text-center text-sm">
									No prescriptions yet.
								</div>
							) : (
								<>
									<div className={cn(tableShellClassName, "mx-4")}>
										<Table className="table-fixed">
											<TableHeader>
												<TableRow className={tableHeaderRowClassName}>
													<TableHead className={cn(tableHeadClassName, "w-[21%]")}>Drug</TableHead>
													<TableHead className={cn(tableHeadClassName, "w-[21%]")}>
														Licenses
													</TableHead>
													<TableHead className={cn(tableHeadClassName, "w-[12%]")}>
														Status
													</TableHead>
													<TableHead className={cn(tableHeadClassName, "w-[18%]")}>
														Prescribed By
													</TableHead>
													<TableHead className={cn(tableHeadClassName, "w-[16%]")}>Date</TableHead>
													<TableHead className={cn(tableHeadClassName, "w-[12%] text-right")}>
														Actions
													</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{pagedPrescriptions.items.map(rx => {
													const content = rx.prescriptionContent as Record<string, unknown> | null
													const contentGenericName =
														typeof content?.genericName === "string"
															? content.genericName.trim()
															: ""
													const drugName =
														contentGenericName ||
														medicationOrdersById.get(rx.medicationOrderId)?.genericName ||
														"--"
													const isControlledPrescription =
														controlledMedicationOrderIds.has(rx.medicationOrderId) ||
														Boolean(content?.isControlledSubstance)

													return (
														<TableRow key={rx.id}>
															<TableCell
																className={cn(tableCellClassName, "overflow-hidden font-medium")}
															>
																<div className="flex min-w-0 flex-col gap-1">
																	<span className="truncate" title={drugName}>
																		{drugName}
																	</span>
																	{isControlledPrescription && (
																		<Badge variant="outline" className="w-fit">
																			No Refill
																		</Badge>
																	)}
																</div>
															</TableCell>
															<TableCell className={cn(tableCellClassName, "overflow-hidden")}>
																<div className="space-y-0.5 text-sm">
																	<p className="truncate" title={rx.prcLicenseNumber}>
																		PRC {rx.prcLicenseNumber}
																	</p>
																	<p className="truncate" title={rx.ptrNumber}>
																		PTR {rx.ptrNumber}
																	</p>
																	<p
																		className="text-muted-foreground truncate text-xs"
																		title={rx.pdeaS2License ?? undefined}
																	>
																		S-2 {rx.pdeaS2License ?? "--"}
																	</p>
																</div>
															</TableCell>
															<TableCell className={cn(tableCellClassName, "overflow-hidden")}>
																<Badge
																	variant={medStatusVariant(rx.status)}
																	className="max-w-full truncate whitespace-nowrap"
																>
																	{statusLabel(rx.status)}
																</Badge>
															</TableCell>
															<TableCell className={cn(tableCellClassName, "overflow-hidden")}>
																<p className="truncate" title={rx.prescriberStaffName ?? undefined}>
																	{rx.prescriberStaffName ?? "--"}
																</p>
															</TableCell>
															<TableCell className={cn(tableCellClassName, "overflow-hidden")}>
																<p className="truncate" title={formatDateTime(rx.createdAt)}>
																	{formatDateTime(rx.createdAt)}
																</p>
															</TableCell>
															<TableCell className={cn(tableCellClassName, "text-right")}>
																{rx.status === "draft" && canSignOrders && (
																	<Button
																		variant="outline"
																		size="sm"
																		title="Sign prescription"
																		disabled={signPrescription.isPending}
																		onClick={() => signPrescription.mutate(rx.id)}
																	>
																		<PenLine className="mr-1 size-3.5" />
																		Sign
																	</Button>
																)}
																{rx.status === "signed" && canSignOrders && (
																	<Button
																		variant="outline"
																		size="sm"
																		title="Print prescription"
																		onClick={() => setRxPrintOpen(true)}
																	>
																		<Printer className="mr-1 size-3.5" />
																		Print
																	</Button>
																)}
															</TableCell>
														</TableRow>
													)
												})}
											</TableBody>
										</Table>
									</div>
									<div className={cn(mobileListClassName, "px-4")}>
										{pagedPrescriptions.items.map(rx => {
											const content = rx.prescriptionContent as Record<string, unknown> | null
											const contentGenericName =
												typeof content?.genericName === "string" ? content.genericName.trim() : ""
											const drugName =
												contentGenericName ||
												medicationOrdersById.get(rx.medicationOrderId)?.genericName ||
												"--"
											const isControlledPrescription =
												controlledMedicationOrderIds.has(rx.medicationOrderId) ||
												Boolean(content?.isControlledSubstance)

											return (
												<div key={rx.id} className="bg-background rounded-lg border p-4">
													<div className="flex items-start justify-between gap-3">
														<div className="min-w-0">
															<p className="truncate font-semibold" title={drugName}>
																{drugName}
															</p>
															<p className="text-muted-foreground mt-1 text-xs">
																PRC {rx.prcLicenseNumber} - PTR {rx.ptrNumber}
															</p>
														</div>
														<Badge variant={medStatusVariant(rx.status)}>
															{statusLabel(rx.status)}
														</Badge>
													</div>
													<div className="mt-3 flex items-end justify-between gap-3">
														<div className="text-muted-foreground text-xs">
															{isControlledPrescription && <p>No Refill</p>}
															<p>{rx.prescriberStaffName ?? "--"}</p>
															<p>{formatDateTime(rx.createdAt)}</p>
														</div>
														{rx.status === "draft" && canSignOrders && (
															<Button
																variant="outline"
																size="sm"
																aria-label="Sign prescription"
																disabled={signPrescription.isPending}
																onClick={() => signPrescription.mutate(rx.id)}
															>
																Sign
															</Button>
														)}
														{rx.status === "signed" && canSignOrders && (
															<Button
																variant="outline"
																size="sm"
																aria-label="Print prescription"
																onClick={() => setRxPrintOpen(true)}
															>
																<Printer className="mr-1 size-3.5" />
																Print
															</Button>
														)}
													</div>
												</div>
											)
										})}
									</div>
									<PaginationControls
										page={pagedPrescriptions.currentPage}
										total={filteredPrescriptions.length}
										onPageChange={setRxPage}
									/>
								</>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			<CreateMedOrderDialog
				open={createMedOpen}
				onOpenChange={setCreateMedOpen}
				encounterId={encounterId}
				facilityId={facilityId}
				patientId={patientId}
				orderingStaffId={orderingStaffId}
				encounterType={encounterType}
			/>
			<CreateLabOrderDialog
				open={createLabOpen}
				onOpenChange={setCreateLabOpen}
				encounterId={encounterId}
				facilityId={facilityId}
			/>
			<CreateImagingOrderDialog
				open={createImagingOpen}
				onOpenChange={setCreateImagingOpen}
				encounterId={encounterId}
				facilityId={facilityId}
			/>
			<CreateOrderSetDialog
				open={createOrderSetOpen}
				onOpenChange={setCreateOrderSetOpen}
				encounterId={encounterId}
				facilityId={facilityId}
			/>
			<PrescriptionPrintDialog
				open={rxPrintOpen}
				onOpenChange={setRxPrintOpen}
				encounterId={encounterId}
				patientId={patientId}
			/>
		</>
	)
}
