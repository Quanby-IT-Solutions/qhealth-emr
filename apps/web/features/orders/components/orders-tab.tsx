"use client"

import { useState } from "react"

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
									<TableBody>
										{medOrders.data.data.map((med) => (
											<TableRow key={med.id}>
												<TableCell>
													<div className="font-medium">{med.genericName}</div>
													{med.brandName && (
														<div className="text-muted-foreground text-xs">
															{med.brandName}
														</div>
													)}
												</TableCell>
												<TableCell>
													{med.dose} {med.doseUnit}
												</TableCell>
												<TableCell>{med.route}</TableCell>
												<TableCell>{med.frequency}</TableCell>
												<TableCell>
													{med.durationDays ? `${med.durationDays}d` : "—"}
												</TableCell>
												<TableCell>{med.isPrn ? "Yes" : "No"}</TableCell>
												<TableCell>
													<Badge variant={medStatusVariant(med.status)}>
														{med.status.replace(/_/g, " ")}
													</Badge>
												</TableCell>
												<TableCell>{med.orderingStaffName ?? "—"}</TableCell>
												<TableCell>{formatDateTime(med.createdAt)}</TableCell>
												<TableCell className="text-right">
													<div className="flex justify-end gap-1">
														{med.status === "active" && (
															<Button
																variant="outline"
																size="sm"
																disabled={discontinueMed.isPending}
																onClick={() =>
																	discontinueMed.mutate(med.id)
																}
															>
																Discontinue
															</Button>
														)}
														{(med.status === "active" ||
															med.status === "verified") && (
															<Button
																variant="outline"
																size="sm"
																disabled={createPrescription.isPending}
																onClick={() =>
																	createPrescription.mutate({
																		facilityId,
																		encounterId,
																		medicationOrderId: med.id,
																		patientId,
																	})
																}
															>
																Generate Rx
															</Button>
														)}
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
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
					<Card>
						<CardHeader className="flex flex-row items-center justify-between">
							<CardTitle>Imaging Orders</CardTitle>
							<Button size="sm" onClick={() => setCreateImagingOpen(true)}>
								New Imaging Order
							</Button>
						</CardHeader>
						<CardContent className="p-0">
							{imagingOrders.isLoading ? (
								<div className="text-muted-foreground py-8 text-center text-sm">
									Loading…
								</div>
							) : !imagingOrders.data?.data?.length ? (
								<div className="text-muted-foreground py-8 text-center text-sm">
									No imaging orders yet.
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Modality</TableHead>
											<TableHead>Body Part</TableHead>
											<TableHead>Priority</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Ordered By</TableHead>
											<TableHead>Date</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{imagingOrders.data.data.map((img) => (
											<TableRow key={img.id}>
												<TableCell className="font-medium capitalize">
													{img.modality}
												</TableCell>
												<TableCell>{img.bodyPart}</TableCell>
												<TableCell>
													<Badge variant={priorityVariant(img.priority)}>
														{img.priority}
													</Badge>
												</TableCell>
												<TableCell>
													<Badge variant={medStatusVariant(img.status)}>
														{img.status.replace(/_/g, " ")}
													</Badge>
												</TableCell>
												<TableCell>
													{img.orderingStaffName ?? "—"}
												</TableCell>
												<TableCell>
													{formatDateTime(img.createdAt)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
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
