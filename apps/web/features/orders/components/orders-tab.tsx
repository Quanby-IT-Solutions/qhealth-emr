"use client"

import { useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, Printer, X } from "lucide-react"

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
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
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
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
	icd10Display: string | null | undefined,
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
	const trancheChildren = orders.filter(o => o.pdeaTrancheNumber !== null && o.pdeaTrancheNumber > 1)
	const standalone = orders.filter(
		o =>
			o.pdeaTrancheNumber === null ||
			(o.pdeaTrancheNumber === 1 && (o.pdeaTrancheTotal ?? 1) <= 1)
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
	const [statusTab, setStatusTab] = useState<"pending" | "active" | "completed">("active")

	const filtered = orders.filter(o => {
		if (statusTab === "pending") return PENDING_STATUSES.has(o.status)
		if (statusTab === "active") return ACTIVE_STATUSES.has(o.status)
		return COMPLETED_STATUSES.has(o.status)
	})

	const grouped = groupTranches(filtered)

	return (
		<div>
			<div className="border-b px-4 pb-0 pt-3">
				<Tabs value={statusTab} onValueChange={v => setStatusTab(v as typeof statusTab)}>
					<TabsList variant="line">
						<TabsTrigger value="pending">
							Pending
							{orders.filter(o => PENDING_STATUSES.has(o.status)).length > 0 && (
								<Badge variant="secondary" className="ml-1.5 text-[10px]">
									{orders.filter(o => PENDING_STATUSES.has(o.status)).length}
								</Badge>
							)}
						</TabsTrigger>
						<TabsTrigger value="active">
							Active
							{orders.filter(o => ACTIVE_STATUSES.has(o.status)).length > 0 && (
								<Badge variant="default" className="ml-1.5 text-[10px]">
									{orders.filter(o => ACTIVE_STATUSES.has(o.status)).length}
								</Badge>
							)}
						</TabsTrigger>
						<TabsTrigger value="completed">Completed</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>

			{grouped.length === 0 ? (
				<div className="text-muted-foreground py-8 text-center text-sm">
					No {statusTab} medication orders.
				</div>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Drug</TableHead>
							<TableHead>Dose</TableHead>
							<TableHead>Route</TableHead>
							<TableHead>Frequency</TableHead>
							<TableHead>Duration</TableHead>
							<TableHead>PRN</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Ordered By</TableHead>
							<TableHead>Date</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<tbody>
						{grouped.map(({ parent, tranches }) => (
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
					</tbody>
				</Table>
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
	const [createMedOpen, setCreateMedOpen] = useState(false)
	const [createLabOpen, setCreateLabOpen] = useState(false)
	const [createImagingOpen, setCreateImagingOpen] = useState(false)
	const [createOrderSetOpen, setCreateOrderSetOpen] = useState(false)
	const [rxPrintOpen, setRxPrintOpen] = useState(false)
	const [showLicenseAlert, setShowLicenseAlert] = useState(true)

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
	const controlledMedicationOrderIds = new Set(
		(medOrders.data?.data ?? []).filter(order => order.isControlledSubstance).map(order => order.id)
	)
	const allOrders = [
		...(medOrders.data?.data ?? []).map(order => ({
			id: order.id,
			type: "Medication" as const,
			name: order.genericName,
			priority: order.priority ?? "routine",
			status: order.status,
			orderedBy: order.orderingStaffName,
			createdAt: order.createdAt,
		})),
		...(labOrders.data?.data ?? []).map(order => ({
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
	].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

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

			<Tabs defaultValue="all">
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
						<CardContent className="p-0">
							{medOrders.isLoading || labOrders.isLoading || imagingOrders.isLoading ? (
								<div className="text-muted-foreground py-8 text-center text-sm">Loading...</div>
							) : !allOrders.length ? (
								<div className="text-muted-foreground py-8 text-center text-sm">No orders yet.</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Type</TableHead>
											<TableHead>Name</TableHead>
											<TableHead>Priority</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Ordered By</TableHead>
											<TableHead>Date</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{allOrders.map(order => (
											<TableRow key={`${order.type}-${order.id}`}>
												<TableCell>
													<Badge variant={orderTypeVariant(order.type)}>{order.type}</Badge>
												</TableCell>
												<TableCell className="font-medium">{order.name}</TableCell>
												<TableCell>
													<Badge variant={priorityVariant(order.priority)}>{order.priority}</Badge>
												</TableCell>
												<TableCell>
													<Badge variant={medStatusVariant(order.status)}>
														{order.status.replace(/_/g, " ")}
													</Badge>
												</TableCell>
												<TableCell>{order.orderedBy ?? "--"}</TableCell>
												<TableCell>{formatDateTime(order.createdAt)}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
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
							) : !medOrders.data?.data?.length ? (
								<div className="text-muted-foreground py-8 text-center text-sm">
									No medication orders yet.
								</div>
							) : (
								<MedOrdersView
									orders={medOrders.data.data}
									facilityId={facilityId}
									encounterId={encounterId}
									patientId={patientId}
									onDiscontinue={
										canEditOrders ? id => discontinueMed.mutate(id) : undefined
									}
									onGenerateRx={
										canPrescribe ? handleGenerateRx : undefined
									}
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
						<CardContent className="p-0">
							{labOrders.isLoading ? (
								<div className="text-muted-foreground py-8 text-center text-sm">Loading...</div>
							) : !labOrders.data?.data?.length ? (
								<div className="text-muted-foreground py-8 text-center text-sm">
									No lab orders yet.
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Test Name</TableHead>
											<TableHead>Panel</TableHead>
											<TableHead>LOINC Code</TableHead>
											<TableHead>Indication</TableHead>
											<TableHead>Priority</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Ordered By</TableHead>
											<TableHead>Date</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{labOrders.data.data.map(lab => {
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
															"border-destructive bg-destructive/10 border-l-2"
													)}
												>
													<TableCell className="font-medium">{lab.testName}</TableCell>
													<TableCell>{lab.panelName ?? "--"}</TableCell>
													<TableCell>{lab.loincCode ?? "--"}</TableCell>
													<TableCell>
														<div className="max-w-[220px]">
															<p className="truncate text-sm">
																{indication.clinical ?? "--"}
															</p>
															{indication.diagnosis && (
																<p className="truncate text-xs text-muted-foreground">
																	{indication.diagnosis}
																</p>
															)}
														</div>
													</TableCell>
													<TableCell>
														<Badge variant={priorityVariant(lab.priority)}>
															{lab.priority}
														</Badge>
													</TableCell>
													<TableCell>
														<Badge variant={medStatusVariant(lab.status)}>
															{lab.status.replace(/_/g, " ")}
														</Badge>
													</TableCell>
													<TableCell>{lab.orderingStaffName ?? "--"}</TableCell>
													<TableCell>{formatDateTime(lab.createdAt)}</TableCell>
												</TableRow>
											)
										})}
									</TableBody>
								</Table>
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
						<CardContent className="p-0">
							{prescriptionsData.isLoading ? (
								<div className="text-muted-foreground py-8 text-center text-sm">Loading...</div>
							) : !prescriptionsData.data?.data?.length ? (
								<div className="text-muted-foreground py-8 text-center text-sm">
									No prescriptions yet.
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Drug</TableHead>
											<TableHead>PRC #</TableHead>
											<TableHead>PTR #</TableHead>
											<TableHead>S-2 Lic.</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Prescribed By</TableHead>
											<TableHead>Date</TableHead>
											<TableHead className="text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{prescriptionsData.data.data.map(rx => {
											const content = rx.prescriptionContent as Record<string, unknown> | null
											const drugName = (content?.genericName as string) ?? "--"
											const isControlledPrescription =
												controlledMedicationOrderIds.has(rx.medicationOrderId) ||
												Boolean(content?.isControlledSubstance)

											return (
												<TableRow key={rx.id}>
													<TableCell className="font-medium">
														<div className="flex flex-col gap-1">
															<span>{drugName}</span>
															{isControlledPrescription && (
																<Badge variant="outline" className="w-fit">
																	No Refill
																</Badge>
															)}
														</div>
													</TableCell>
													<TableCell>{rx.prcLicenseNumber}</TableCell>
													<TableCell>{rx.ptrNumber}</TableCell>
													<TableCell>{rx.pdeaS2License ?? "--"}</TableCell>
													<TableCell>
														<Badge variant={medStatusVariant(rx.status)}>{rx.status}</Badge>
													</TableCell>
													<TableCell>{rx.prescriberStaffName ?? "--"}</TableCell>
													<TableCell>{formatDateTime(rx.createdAt)}</TableCell>
													<TableCell className="text-right">
														{rx.status === "draft" && canSignOrders && (
															<Button
																variant="outline"
																size="sm"
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
