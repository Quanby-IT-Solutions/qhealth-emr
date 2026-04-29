"use client"

import { useEffect } from "react"
import { useState } from "react"

import { useQueryClient } from "@tanstack/react-query"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/core/components/ui/dialog"
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
import { useEdQueueQuery } from "@/features/ed/api/ed.hooks"
import { acuityColor, acuityLabel } from "@/features/ed/lib/acuity-utils"
import { orpc } from "@/services/orpc/client"
import { useNotifications } from "@/services/notifications/notification-provider"
import { toast } from "sonner"

import { DischargeInstructionsDialog } from "./discharge-instructions-dialog"
import { DispositionForm } from "./disposition-form"
import { MergeDialog } from "./merge-dialog"
import { PreEncounterForm } from "./pre-encounter-form"
import { TrackingBoard } from "./tracking-board"
import { TraumaAliasBadge } from "./trauma-alias-badge"
import { TriageForm } from "./triage-form"

function queueStatusLabel(status: string) {
	switch (status) {
		case "waiting":
			return "Waiting"
		case "triage":
			return "Triage"
		case "being_seen":
			return "Being Seen"
		case "disposition":
			return "Disposition"
		default:
			return status
	}
}

function queueStatusVariant(status: string) {
	switch (status) {
		case "waiting":
			return "outline" as const
		case "triage":
			return "secondary" as const
		case "being_seen":
			return "default" as const
		case "disposition":
			return "destructive" as const
		default:
			return "outline" as const
	}
}

function formatTime(dateStr: string | Date) {
	return new Date(dateStr).toLocaleTimeString("en-PH", {
		hour: "2-digit",
		minute: "2-digit",
	})
}

export function EdDashboard() {
	const queryClient = useQueryClient()
	const { onTopic } = useNotifications()
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""
	const staffProfileId = profile?.staffProfiles?.[0]?.id ?? ""

	const { data: queue, isLoading } = useEdQueueQuery(facilityId)

	// Invalidate ED queue when an SSE ed_queue event arrives
	useEffect(() => {
		return onTopic("ed_queue", () => {
			void queryClient.invalidateQueries({ queryKey: orpc.ed.key() })
		})
	}, [onTopic, queryClient])

	const [triageOpen, setTriageOpen] = useState(false)
	const [preEncounterOpen, setPreEncounterOpen] = useState(false)
	const [mergeItem, setMergeItem] = useState<{
		preEncounterId: string
		traumaAlias: string
	} | null>(null)
	const [disposeItem, setDisposeItem] = useState<{
		encounterId: string
		patientName: string
	} | null>(null)
	const [dischargeInstructionsItem, setDischargeInstructionsItem] = useState<{
		encounterId: string
		patientName: string
	} | null>(null)

	if (!facilityId) {
		return (
			<div className="text-muted-foreground flex h-48 items-center justify-center">
				No facility context available.
			</div>
		)
	}

	if (isLoading) {
		return (
			<div className="text-muted-foreground flex h-48 items-center justify-center">
				Loading ED queue…
			</div>
		)
	}

	const items = queue?.items ?? []
	const summary = queue?.summary ?? {
		total: 0,
		waiting: 0,
		triage: 0,
		beingSeen: 0,
		disposition: 0,
		acuity1: 0,
		acuity2: 0,
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Emergency Department</h1>
					<p className="text-muted-foreground text-sm">
						{summary.total} patient{summary.total !== 1 ? "s" : ""} in ED
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Dialog open={triageOpen} onOpenChange={setTriageOpen}>
						<DialogTrigger render={<Button variant="outline">New Triage</Button>} />
						<DialogContent className="max-w-lg">
							<DialogHeader>
								<DialogTitle>New Triage Pre-Encounter</DialogTitle>
							</DialogHeader>
							<TriageForm
								facilityId={facilityId}
								triageStaffId={staffProfileId}
								onSuccess={() => setTriageOpen(false)}
							/>
						</DialogContent>
					</Dialog>
					<Dialog open={preEncounterOpen} onOpenChange={setPreEncounterOpen}>
						<DialogTrigger render={<Button>Fast Track (Pre-Encounter)</Button>} />
						<DialogContent className="max-w-lg">
							<DialogHeader>
								<DialogTitle>Fast Track — Pre-Encounter</DialogTitle>
							</DialogHeader>
							<PreEncounterForm
								facilityId={facilityId}
								triageStaffId={staffProfileId}
								onSuccess={() => setPreEncounterOpen(false)}
							/>
						</DialogContent>
					</Dialog>
				</div>
			</div>

			{/* Summary Cards */}
			<div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-muted-foreground text-sm font-medium">
							Total
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold">{summary.total}</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-muted-foreground text-sm font-medium">
							Waiting
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold">{summary.waiting}</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-muted-foreground text-sm font-medium">
							Triage
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold">{summary.triage}</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-muted-foreground text-sm font-medium">
							Being Seen
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold">{summary.beingSeen}</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-muted-foreground text-sm font-medium">
							Acuity 1
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold text-red-600">{summary.acuity1}</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-muted-foreground text-sm font-medium">
							Acuity 2
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold text-orange-500">{summary.acuity2}</p>
					</CardContent>
				</Card>
			</div>

			{/* Table / Tracking Board Toggle */}
			<Tabs defaultValue="table">
				<TabsList>
					<TabsTrigger value="table">Table View</TabsTrigger>
					<TabsTrigger value="board">Tracking Board</TabsTrigger>
				</TabsList>

				<TabsContent value="table" className="mt-4">
					<Card>
						<CardContent className="p-0">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-16">Acuity</TableHead>
										<TableHead>Patient</TableHead>
										<TableHead>Chief Complaint</TableHead>
										<TableHead>Arrival</TableHead>
										<TableHead className="w-20">Wait</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Location</TableHead>
										<TableHead className="w-36">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{items.length === 0 ? (
										<TableRow>
											<TableCell colSpan={8} className="text-muted-foreground py-8 text-center">
												No patients currently in the ED.
											</TableCell>
										</TableRow>
									) : (
										items.map(item => (
											<TableRow key={`${item.type}-${item.id}`}>
												<TableCell>
													{item.acuityLevel ? (
														<Badge className={acuityColor(item.acuityLevel)}>
															{item.acuityLevel}
														</Badge>
													) : (
														"—"
													)}
												</TableCell>
												<TableCell>
													<div>
														<p className="font-medium">
															{item.type === "pre_encounter"
																? item.traumaAlias ?? "Unknown"
																: item.patientName}
														</p>
														{item.patientMrn && (
															<p className="text-muted-foreground text-xs">
																MRN: {item.patientMrn}
															</p>
														)}
														{item.type === "pre_encounter" && (
															<TraumaAliasBadge
																alias={item.traumaAlias ?? item.id}
																acuityLevel={item.acuityLevel}
															/>
														)}
													</div>
												</TableCell>
												<TableCell className="max-w-48 truncate">
													{item.chiefComplaint ?? "—"}
												</TableCell>
												<TableCell>{formatTime(item.arrivalTime)}</TableCell>
												<TableCell>{item.waitMinutes}m</TableCell>
												<TableCell>
													<Badge variant={queueStatusVariant(item.queueStatus)}>
														{queueStatusLabel(item.queueStatus)}
													</Badge>
												</TableCell>
												<TableCell>
													{item.bedNumber
														? `${item.wardName ?? ""} / ${item.bedNumber}`
														: "—"}
												</TableCell>
												<TableCell>
													<div className="flex gap-1">
														{item.type === "pre_encounter" && (
															<Button
																size="sm"
																variant="outline"
																onClick={() =>
																	setMergeItem({
																		preEncounterId: item.id,
																		traumaAlias: item.traumaAlias ?? item.id,
																	})
																}
															>
																Merge
															</Button>
														)}
														{item.type === "encounter" && (
															<Button
																size="sm"
																variant="outline"
																onClick={() =>
																	setDisposeItem({
																		encounterId: item.id,
																		patientName: item.patientName,
																	})
																}
															>
																Dispose
															</Button>
														)}
													</div>
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="board" className="mt-4">
					<TrackingBoard items={items} facilityId={facilityId} />
				</TabsContent>
			</Tabs>

			{/* Merge Dialog */}
			{mergeItem && (
				<MergeDialog
					preEncounterId={mergeItem.preEncounterId}
					traumaAlias={mergeItem.traumaAlias}
					facilityId={facilityId}
					staffProfileId={staffProfileId}
					open={!!mergeItem}
					onOpenChange={open => {
						if (!open) setMergeItem(null)
					}}
				/>
			)}

			{/* Disposition Dialog */}
			{disposeItem && (
				<Dialog
					open={!!disposeItem}
					onOpenChange={open => {
						if (!open) setDisposeItem(null)
					}}
				>
					<DialogContent className="max-w-lg">
						<DialogHeader>
							<DialogTitle>ED Disposition — {disposeItem.patientName}</DialogTitle>
						</DialogHeader>
						<DispositionForm
							encounterId={disposeItem.encounterId}
							facilityId={facilityId}
							onSuccess={() => setDisposeItem(null)}
							onDischargeSuccess={result => {
								if (result.oecbEligible) {
									toast(
										"Patient tagged as OECB-eligible — routed to PhilHealth outpatient billing track."
									)
								}
								setDischargeInstructionsItem({
									encounterId: result.encounterId,
									patientName: disposeItem.patientName,
								})
							}}
						/>
					</DialogContent>
				</Dialog>
			)}

			{/* Discharge Instructions Dialog */}
			{dischargeInstructionsItem && (
				<DischargeInstructionsDialog
					open={!!dischargeInstructionsItem}
					onOpenChange={open => {
						if (!open) setDischargeInstructionsItem(null)
					}}
					encounterId={dischargeInstructionsItem.encounterId}
				/>
			)}
		</div>
	)
}
