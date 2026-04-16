"use client"

import { useState } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import {
	useDiscontinueMedOrderMutation,
	useCreatePrescriptionMutation,
	useSignPrescriptionMutation,
	useImagingOrderListQuery,
	useLabOrderListQuery,
	useMedOrderListQuery,
	usePrescriptionListQuery,
} from "@/features/orders/api/orders.hooks"

import { CreateImagingOrderDialog } from "./create-imaging-order-dialog"
import { CreateLabOrderDialog } from "./create-lab-order-dialog"
import { CreateMedOrderDialog } from "./create-med-order-dialog"
import { ImagingDashboard } from "./imaging-dashboard"
import { OrderGroupRow } from "./order-group-row"

function formatDateTime(dateStr: string | null | undefined) {
	if (!dateStr) return "—"
	return new Date(dateStr).toLocaleString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
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

// ── Status grouping helpers ─────────────────────────────────────────────────

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

/** Group tranche child orders under their tranche-1 (parent) order.
 *  Orders without pdeaTrancheTotal or with trancheTotal=1 are standalone.
 */
function groupTranches(orders: MedOrderItem[]): Array<{
	parent: MedOrderItem
	tranches: MedOrderItem[]
}> {
	const trancheParents = orders.filter(
		(o) => o.pdeaTrancheNumber === 1 && (o.pdeaTrancheTotal ?? 0) > 1,
	)
	const trancheChildren = orders.filter(
		(o) => o.pdeaTrancheNumber != null && o.pdeaTrancheNumber > 1,
	)
	const standalone = orders.filter(
		(o) =>
			o.pdeaTrancheNumber == null ||
			(o.pdeaTrancheNumber === 1 && (o.pdeaTrancheTotal ?? 1) <= 1),
	)

	const grouped = trancheParents.map((parent) => ({
		parent,
		tranches: trancheChildren
			.filter(
				(c) =>
					c.genericName === parent.genericName &&
					c.dose === parent.dose &&
					c.frequency === parent.frequency,
			)
			.sort((a, b) => (a.pdeaTrancheNumber ?? 0) - (b.pdeaTrancheNumber ?? 0)),
	}))

	const standaloneGrouped = standalone.map((o) => ({ parent: o, tranches: [] as MedOrderItem[] }))

	return [...grouped, ...standaloneGrouped]
}

interface MedOrdersViewProps {
	orders: MedOrderItem[]
	facilityId: string
	encounterId: string
	patientId: string
	onDiscontinue: (id: string) => void
	onGenerateRx: (id: string) => void
	discontinuePending: boolean
	createRxPending: boolean
}

function MedOrdersView({
	orders,
	onDiscontinue,
	onGenerateRx,
	discontinuePending,
	createRxPending,
}: MedOrdersViewProps) {
	const [statusTab, setStatusTab] = useState<"pending" | "active" | "completed">("active")

	const filtered = orders.filter((o) => {
		if (statusTab === "pending") return PENDING_STATUSES.has(o.status)
		if (statusTab === "active") return ACTIVE_STATUSES.has(o.status)
		return COMPLETED_STATUSES.has(o.status)
	})

	const grouped = groupTranches(filtered)

	return (
		<div>
			<div className="border-b px-4 pt-3 pb-0">
				<Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as typeof statusTab)}>
					<TabsList variant="line">
						<TabsTrigger value="pending">
							Pending
							{orders.filter((o) => PENDING_STATUSES.has(o.status)).length > 0 && (
								<Badge variant="secondary" className="ml-1.5 text-[10px]">
									{orders.filter((o) => PENDING_STATUSES.has(o.status)).length}
								</Badge>
							)}
						</TabsTrigger>
						<TabsTrigger value="active">
							Active
							{orders.filter((o) => ACTIVE_STATUSES.has(o.status)).length > 0 && (
								<Badge variant="default" className="ml-1.5 text-[10px]">
									{orders.filter((o) => ACTIVE_STATUSES.has(o.status)).length}
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
}

export function OrdersTab({ encounterId, facilityId, patientId }: OrdersTabProps) {
	const [createMedOpen, setCreateMedOpen] = useState(false)
	const [createLabOpen, setCreateLabOpen] = useState(false)
	const [createImagingOpen, setCreateImagingOpen] = useState(false)

	const medOrders = useMedOrderListQuery({ encounterId })
	const labOrders = useLabOrderListQuery({ encounterId })
	const imagingOrders = useImagingOrderListQuery({ encounterId })
	const prescriptionsData = usePrescriptionListQuery({ encounterId })

	const discontinueMed = useDiscontinueMedOrderMutation()
	const createPrescription = useCreatePrescriptionMutation()
	const signPrescription = useSignPrescriptionMutation()

	return (
		<>
			<Tabs defaultValue="medications">
				<TabsList variant="line">
					<TabsTrigger value="medications">Medications</TabsTrigger>
					<TabsTrigger value="labs">Labs</TabsTrigger>
					<TabsTrigger value="imaging">Imaging</TabsTrigger>
					<TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
				</TabsList>

				{/* ── Medications ────────────────────────────────────── */}
				<TabsContent value="medications">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between">
							<CardTitle>Medication Orders</CardTitle>
							<Button size="sm" onClick={() => setCreateMedOpen(true)}>
								New Medication Order
							</Button>
						</CardHeader>
						<CardContent className="p-0">
							{medOrders.isLoading ? (
								<div className="text-muted-foreground py-8 text-center text-sm">
									Loading…
								</div>
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
									onDiscontinue={(id) => discontinueMed.mutate(id)}
									onGenerateRx={(id) =>
										createPrescription.mutate({
											facilityId,
											encounterId,
											medicationOrderId: id,
											patientId,
										})
									}
									discontinuePending={discontinueMed.isPending}
									createRxPending={createPrescription.isPending}
								/>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				{/* ── Labs ───────────────────────────────────────────── */}
				<TabsContent value="labs">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between">
							<CardTitle>Lab Orders</CardTitle>
							<Button size="sm" onClick={() => setCreateLabOpen(true)}>
								New Lab Order
							</Button>
						</CardHeader>
						<CardContent className="p-0">
							{labOrders.isLoading ? (
								<div className="text-muted-foreground py-8 text-center text-sm">
									Loading…
								</div>
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
											<TableHead>Priority</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Ordered By</TableHead>
											<TableHead>Date</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{labOrders.data.data.map((lab) => (
											<TableRow key={lab.id}>
												<TableCell className="font-medium">
													{lab.testName}
												</TableCell>
												<TableCell>{lab.panelName ?? "—"}</TableCell>
												<TableCell>{lab.loincCode ?? "—"}</TableCell>
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
												<TableCell>
													{lab.orderingStaffName ?? "—"}
												</TableCell>
												<TableCell>
													{formatDateTime(lab.createdAt)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				{/* ── Imaging ───────────────────────────────────────── */}
				<TabsContent value="imaging">
					<ImagingDashboard
						orders={imagingOrders.data?.data ?? []}
						isLoading={imagingOrders.isLoading}
						onNewOrder={() => setCreateImagingOpen(true)}
					/>
				</TabsContent>

				{/* ── Prescriptions ──────────────────────────────────── */}
				<TabsContent value="prescriptions">
					<Card>
						<CardHeader>
							<CardTitle>Prescriptions</CardTitle>
						</CardHeader>
						<CardContent className="p-0">
							{prescriptionsData.isLoading ? (
								<div className="text-muted-foreground py-8 text-center text-sm">
									Loading…
								</div>
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
											<TableHead>Status</TableHead>
											<TableHead>Prescribed By</TableHead>
											<TableHead>Date</TableHead>
											<TableHead className="text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{prescriptionsData.data.data.map((rx) => {
											const content = rx.prescriptionContent as Record<
												string,
												unknown
											> | null
											const drugName =
												(content?.genericName as string) ?? "—"

											return (
												<TableRow key={rx.id}>
													<TableCell className="font-medium">
														{drugName}
													</TableCell>
													<TableCell>{rx.prcLicenseNumber}</TableCell>
													<TableCell>{rx.ptrNumber}</TableCell>
													<TableCell>
														<Badge
															variant={medStatusVariant(rx.status)}
														>
															{rx.status}
														</Badge>
													</TableCell>
													<TableCell>
														{rx.prescriberStaffName ?? "—"}
													</TableCell>
													<TableCell>
														{formatDateTime(rx.createdAt)}
													</TableCell>
													<TableCell className="text-right">
														{rx.status === "draft" && (
															<Button
																variant="outline"
																size="sm"
																disabled={
																	signPrescription.isPending
																}
																onClick={() =>
																	signPrescription.mutate(rx.id)
																}
															>
																Sign
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

			{/* Dialogs */}
			<CreateMedOrderDialog
				open={createMedOpen}
				onOpenChange={setCreateMedOpen}
				encounterId={encounterId}
				facilityId={facilityId}
				patientId={patientId}
				orderingStaffId=""
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
		</>
	)
}
