"use client"

import Link from "next/link"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { ConsentRecordsTab } from "@/features/clinical-docs/components/consent-records-tab"
import { DocumentationTab } from "@/features/clinical-docs/components/documentation-tab"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useEncounterDetailQuery } from "@/features/encounters/api/encounters.hooks"
import { BillingTab } from "@/features/billing/components/billing-tab"
import { CewsEligibilityBadge } from "@/features/billing/components/cews-eligibility-badge"
import { NursingTab } from "@/features/nursing/components/nursing-tab"
import { OrdersTab } from "@/features/orders/components/orders-tab"
import { ProblemsAllergiesTab } from "@/features/problems-allergies/components/problems-allergies-tab"

import { DischargePanel } from "./discharge-panel"
import { TransferForm } from "./transfer-form"

function formatDateTime(dateStr: Date | string | null | undefined) {
	if (!dateStr) return "—"
	return new Date(dateStr).toLocaleString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

function statusVariant(status: string) {
	switch (status) {
		case "active":
			return "default" as const
		case "discharged":
			return "secondary" as const
		case "closed":
			return "outline" as const
		default:
			return "outline" as const
	}
}

interface EncounterDetailProps {
	encounterId: string
	patientId: string
}

export function EncounterDetail({ encounterId, patientId }: EncounterDetailProps) {
	const { data: encounter, isLoading, isError, error } = useEncounterDetailQuery(encounterId)
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	const canWriteNursing = permissions.some(p => p.module === "nursing" && p.action === "create")

	if (isLoading) {
		return (
			<div className="text-muted-foreground flex h-48 items-center justify-center">
				Loading encounter…
			</div>
		)
	}

	if (isError) {
		return (
			<div className="text-destructive flex h-48 items-center justify-center">
				Failed to load encounter: {error.message}
			</div>
		)
	}

	if (!encounter) return null

	const isActive = encounter.status === "active"

	return (
		<div className="space-y-6">
			{/* Patient Banner */}
			<Card>
				<CardContent className="flex flex-wrap items-center gap-x-8 gap-y-2 pt-6">
					<div>
						<p className="text-lg font-semibold">{encounter.patientName}</p>
						<p className="text-muted-foreground text-sm">MRN: {encounter.patientMrn}</p>
					</div>
					<Separator orientation="vertical" className="hidden h-10 sm:block" />
					<div className="text-sm">
						<span className="text-muted-foreground">Type:</span>{" "}
						<span className="capitalize">{encounter.encounterType}</span>
					</div>
					<div className="text-sm">
						<Badge variant={statusVariant(encounter.status)}>
							{encounter.status}
						</Badge>
					</div>
					<CewsEligibilityBadge patientId={patientId} />
					{encounter.wardName && (
						<div className="text-sm">
							<span className="text-muted-foreground">Ward:</span> {encounter.wardName}
						</div>
					)}
					{encounter.bedNumber && (
						<div className="text-sm">
							<span className="text-muted-foreground">Bed:</span> {encounter.bedNumber}
						</div>
					)}
					<div className="text-sm">
						<span className="text-muted-foreground">Admitted:</span>{" "}
						{formatDateTime(encounter.admissionDatetime)}
					</div>
					{encounter.attendingStaffName && (
						<div className="text-sm">
							<span className="text-muted-foreground">Attending:</span>{" "}
							{encounter.attendingStaffName}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Chart Tabs */}
			<Tabs defaultValue="summary">
				<TabsList variant="line">
					<TabsTrigger value="summary">Summary</TabsTrigger>
					<TabsTrigger value="problems-allergies">Problems & Allergies</TabsTrigger>
					<TabsTrigger value="documentation">Documentation</TabsTrigger>
					<TabsTrigger value="orders">Orders</TabsTrigger>
					<TabsTrigger value="nursing">Nursing</TabsTrigger>
					<TabsTrigger value="billing">Billing</TabsTrigger>
					<TabsTrigger value="consents">Consents</TabsTrigger>
					<TabsTrigger value="transfers">Transfers</TabsTrigger>
					{isActive && encounter.encounterType === "inpatient" && (
						<TabsTrigger value="transfer">Transfer Patient</TabsTrigger>
					)}
					{isActive && (
						<TabsTrigger value="discharge">
							{encounter.encounterType === "outpatient" ? "Close" : "Discharge"}
						</TabsTrigger>
					)}
				</TabsList>

				{/* Summary Tab */}
				<TabsContent value="summary">
					<Card>
						<CardHeader>
							<CardTitle>Encounter Summary</CardTitle>
						</CardHeader>
						<CardContent>
							<dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
								<div>
									<dt className="text-muted-foreground">Chief Complaint</dt>
									<dd>{encounter.chiefComplaint ?? "—"}</dd>
								</div>
								<div>
									<dt className="text-muted-foreground">Encounter Type</dt>
									<dd className="capitalize">{encounter.encounterType}</dd>
								</div>
								<div>
									<dt className="text-muted-foreground">Status</dt>
									<dd className="capitalize">{encounter.status}</dd>
								</div>
								<div>
									<dt className="text-muted-foreground">Admission</dt>
									<dd>{formatDateTime(encounter.admissionDatetime)}</dd>
								</div>
								{encounter.dischargeDatetime && (
									<div>
										<dt className="text-muted-foreground">Discharge</dt>
										<dd>{formatDateTime(encounter.dischargeDatetime)}</dd>
									</div>
								)}
								{encounter.disposition && (
									<div>
										<dt className="text-muted-foreground">Disposition</dt>
										<dd className="capitalize">{encounter.disposition}</dd>
									</div>
								)}
								<div>
									<dt className="text-muted-foreground">Admitting Physician</dt>
									<dd>{encounter.admittingStaffName ?? "—"}</dd>
								</div>
								<div>
									<dt className="text-muted-foreground">Attending Physician</dt>
									<dd>{encounter.attendingStaffName ?? "—"}</dd>
								</div>
								<div>
									<dt className="text-muted-foreground">OECB Eligible</dt>
									<dd>{encounter.oecbEligible ? "Yes" : "No"}</dd>
								</div>
							</dl>
						</CardContent>
					</Card>
				</TabsContent>

				{/* Problems & Allergies Tab */}
				<TabsContent value="problems-allergies">
					<ProblemsAllergiesTab
						patientId={patientId}
						facilityId={encounter.facilityId}
						canWrite={false}
					/>
				</TabsContent>

				{/* Documentation Tab */}
				<TabsContent value="documentation">
					<DocumentationTab
						encounterId={encounterId}
						facilityId={encounter.facilityId}
						patientId={patientId}
					/>
				</TabsContent>

				{/* Orders Tab */}
				<TabsContent value="orders">
					<OrdersTab
						encounterId={encounterId}
						facilityId={encounter.facilityId}
						patientId={patientId}
					/>
				</TabsContent>

				{/* Nursing Tab */}
				<TabsContent value="nursing">
					<NursingTab
						encounterId={encounterId}
						facilityId={encounter.facilityId}
						patientId={patientId}
						readOnly={!canWriteNursing}
					/>
				</TabsContent>

				{/* Billing Tab */}
				<TabsContent value="billing">
					<BillingTab
						encounterId={encounterId}
						facilityId={encounter.facilityId}
						patientId={patientId}
					/>
				</TabsContent>

				{/* Consent Records Tab */}
				<TabsContent value="consents">
					<ConsentRecordsTab
						encounterId={encounterId}
						facilityId={encounter.facilityId}
						patientId={patientId}
						canManageConsents={false}
					/>
				</TabsContent>

				{/* Transfer History Tab */}
				<TabsContent value="transfers">
					<Card>
						<CardHeader>
							<CardTitle>Transfer History</CardTitle>
						</CardHeader>
						<CardContent className="p-0">
							{encounter.transfers.length > 0 ? (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>From</TableHead>
											<TableHead>To</TableHead>
											<TableHead>Reason</TableHead>
											<TableHead>Ordered By</TableHead>
											<TableHead>Date</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{encounter.transfers.map(t => (
											<TableRow key={t.id}>
												<TableCell>
													{t.fromWardName ?? "—"} / {t.fromBedNumber ?? "—"}
												</TableCell>
												<TableCell>
													{t.toWardName ?? "—"} / {t.toBedNumber ?? "—"}
												</TableCell>
												<TableCell>{t.transferReason ?? "—"}</TableCell>
												<TableCell>{t.orderingStaffName ?? "—"}</TableCell>
												<TableCell>{formatDateTime(t.transferredAt)}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							) : (
								<div className="text-muted-foreground py-8 text-center text-sm">
									No transfers recorded.
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				{/* Transfer Form Tab */}
				{isActive && encounter.encounterType === "inpatient" && (
					<TabsContent value="transfer">
						<TransferForm encounterId={encounterId} />
					</TabsContent>
				)}

				{/* Discharge / Close Tab */}
				{isActive && (
					<TabsContent value="discharge">
						<DischargePanel
							encounterId={encounterId}
							encounterType={encounter.encounterType}
							patientId={patientId}
							patientSex={encounter.patientSex}
							patientDateOfBirth={encounter.patientDateOfBirth}
						/>
					</TabsContent>
				)}
			</Tabs>

			{/* Back button */}
			<div className="flex gap-3">
				<Button variant="outline" nativeButton={false} render={<Link href={`/patients/${patientId}`} />}>
					Back to Patient
				</Button>
			</div>
		</div>
	)
}
