"use client"

import Link from "next/link"
import { ArrowLeft01FreeIcons } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Badge } from "@/core/components/ui/badge"
import { Button, buttonVariants } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { cn } from "@/core/lib/utils"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import {
	useGenerateLcrArtifactMutation,
	useListLcrTrackingQuery,
	useMarkBirthRegistrationPaidMutation,
	useMarkBirthRegistrationReleasedMutation,
	useMarkDeathCertificateRegistrationPaidMutation,
	useMarkDeathCertificateRegistrationReleasedMutation,
	useMarkLcrSubmittedMutation,
} from "@/features/registrar/civil-registry/api/lcr.hooks"

type LcrSubmissionStatus =
	| "not_submitted"
	| "ready"
	| "submitted"
	| "acknowledged"
	| "rejected"
	| "error"

interface LcrTrackingRecord {
	certificateType: "birth" | "death"
	sourceRecordId: string
	facilityId: string
	patientId: string
	encounterId: string | null
	certificateNumber: string | null
	eventDatetime: Date | string
	status: "draft" | "completed" | "submitted"
	requestedAt?: Date | string | null
	paidAt?: Date | string | null
	releasedAt?: Date | string | null
	completedAt: Date | string | null
	submittedAt: Date | string | null
	tracking: {
		pdfStatus: "pending" | "generated" | "failed"
		pdfGeneratedAt: Date | string | null
		xmlStatus: "pending" | "generated" | "failed"
		xmlGeneratedAt: Date | string | null
		submissionStatus: LcrSubmissionStatus
		submittedAt: Date | string | null
		acknowledgementNumber: string | null
		referenceNumber: string | null
		lastSubmissionError: string | null
		lastSubmissionErrorAt: Date | string | null
	} | null
}

function formatDate(value: Date | string | null | undefined): string {
	if (!value) return "—"
	return new Date(value).toLocaleDateString("en-PH", { dateStyle: "medium" })
}

function StatusBadge({ status }: { status: string }) {
	const map: Record<string, string> = {
		draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
		completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
		submitted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
	}
	return (
		<Badge className={cn("px-1.5 text-[10px] font-medium capitalize", map[status] ?? "")}>
			{status}
		</Badge>
	)
}

function ArtifactBadge({ status }: { status: "pending" | "generated" | "failed" }) {
	const map: Record<string, string> = {
		pending: "bg-muted text-muted-foreground",
		generated: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
		failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
	}
	return <Badge className={cn("px-1.5 text-[10px] capitalize", map[status])}>{status}</Badge>
}

function SubmissionBadge({ status }: { status: LcrSubmissionStatus }) {
	const map: Record<string, string> = {
		not_submitted: "bg-muted text-muted-foreground",
		ready: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
		submitted: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
		acknowledged: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
		rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
		error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
	}
	return (
		<Badge className={cn("px-1.5 text-[10px] capitalize", map[status])}>
			{status.replace("_", " ")}
		</Badge>
	)
}

export function LcrTrackingTable() {
	const { data: profile } = useMyProfile()
	const activeStaffProfile =
		profile?.staffProfiles.find(p => p.roles.some(r => r.id === profile.activeRole?.id)) ??
		profile?.staffProfiles?.[0]
	const facilityId = activeStaffProfile?.facilityId ?? ""
	const staffId = activeStaffProfile?.id ?? ""

	const { data, isLoading } = useListLcrTrackingQuery({ facilityId }, { enabled: !!facilityId })
	const markBirthPaid = useMarkBirthRegistrationPaidMutation()
	const markBirthReleased = useMarkBirthRegistrationReleasedMutation()
	const markDeathPaid = useMarkDeathCertificateRegistrationPaidMutation()
	const markDeathReleased = useMarkDeathCertificateRegistrationReleasedMutation()
	const generateArtifact = useGenerateLcrArtifactMutation()
	const markSubmitted = useMarkLcrSubmittedMutation()

	const records = (data?.data ?? []) as LcrTrackingRecord[]

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link
					href="/registrar/civil-registry"
					className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5")}
				>
					<HugeiconsIcon icon={ArrowLeft01FreeIcons} className="size-4" />
					Civil Registry
				</Link>
			</div>

			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-xl font-semibold">LCR Tracking</h1>
					<p className="text-muted-foreground text-sm">
						Birth and death certificate release, artifact generation, and LCR submission tracking
					</p>
				</div>
				<div className="flex gap-2">
					<Link href="/registrar/civil-registry/birth" className={buttonVariants({ size: "sm" })}>
						New Birth Certificate
					</Link>
					<Link
						href="/registrar/civil-registry/death"
						className={buttonVariants({ variant: "outline", size: "sm" })}
					>
						New Death Certificate
					</Link>
				</div>
			</div>

			{isLoading && (
				<div className="space-y-2">
					{Array.from({ length: 4 }).map((_, i) => (
						<Skeleton key={i} className="h-12 w-full rounded" />
					))}
				</div>
			)}

			{!isLoading && records.length === 0 && (
				<Card>
					<CardContent className="py-12 text-center">
						<p className="text-muted-foreground">
							No LCR certificate records found for this facility.
						</p>
					</CardContent>
				</Card>
			)}

			{!isLoading && records.length > 0 && (
				<div className="rounded-lg border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Type</TableHead>
								<TableHead>Certificate #</TableHead>
								<TableHead>Event Date</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Requested</TableHead>
								<TableHead>Payment</TableHead>
								<TableHead>Release</TableHead>
								<TableHead>Artifacts</TableHead>
								<TableHead>Submission</TableHead>
								<TableHead>Last Error</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{records.map(record => {
								const isBirth = record.certificateType === "birth"
								const tracking = record.tracking
								const pdfStatus = tracking?.pdfStatus ?? "pending"
								const xmlStatus = tracking?.xmlStatus ?? "pending"
								const canGenerateArtifacts = !!record.releasedAt
								const canSubmit =
									tracking?.pdfStatus === "generated" && tracking.xmlStatus === "generated"
								const markPaid = isBirth ? markBirthPaid : markDeathPaid
								const markReleased = isBirth ? markBirthReleased : markDeathReleased

								return (
									<TableRow key={`${record.certificateType}-${record.sourceRecordId}`}>
										<TableCell>
											<Badge variant="outline" className="text-[10px]">
												{isBirth ? "Birth" : "Death"}
											</Badge>
										</TableCell>
										<TableCell className="font-medium">
											{record.certificateNumber ?? <span className="text-muted-foreground">—</span>}
										</TableCell>
										<TableCell>{formatDate(record.eventDatetime)}</TableCell>
										<TableCell>
											<StatusBadge status={record.status} />
										</TableCell>
										<TableCell className="text-muted-foreground text-xs">
											{formatDate(record.requestedAt)}
										</TableCell>
										<TableCell className="text-muted-foreground text-xs">
											{record.paidAt ? (
												<span className="text-green-700 dark:text-green-400">
													{formatDate(record.paidAt)}
												</span>
											) : (
												"Unpaid"
											)}
										</TableCell>
										<TableCell className="text-muted-foreground text-xs">
											{record.releasedAt ? (
												<span className="text-green-700 dark:text-green-400">
													{formatDate(record.releasedAt)}
												</span>
											) : (
												"Pending"
											)}
										</TableCell>
										<TableCell>
											<div className="flex gap-1">
												<ArtifactBadge status={pdfStatus} />
												<ArtifactBadge status={xmlStatus} />
											</div>
										</TableCell>
										<TableCell className="text-xs">
											{tracking ? (
												<div className="space-y-1">
													<SubmissionBadge status={tracking.submissionStatus} />
													{(tracking.acknowledgementNumber || tracking.referenceNumber) && (
														<div className="text-muted-foreground">
															{tracking.acknowledgementNumber && (
																<span>Ack {tracking.acknowledgementNumber}</span>
															)}
															{tracking.referenceNumber && (
																<span className="ml-1">Ref {tracking.referenceNumber}</span>
															)}
														</div>
													)}
												</div>
											) : (
												<SubmissionBadge status="not_submitted" />
											)}
										</TableCell>
										<TableCell className="max-w-40 text-xs">
											{tracking?.lastSubmissionError ? (
												<span
													title={tracking.lastSubmissionError}
													className="text-red-700 dark:text-red-400"
												>
													{tracking.lastSubmissionError}
												</span>
											) : (
												<span className="text-muted-foreground">—</span>
											)}
										</TableCell>
										<TableCell className="text-right">
											<div className="flex flex-wrap justify-end gap-1">
												{!record.paidAt && (
													<Button
														size="sm"
														variant="outline"
														className="h-7 px-2 text-xs"
														disabled={markPaid.isPending}
														onClick={() => markPaid.mutate({ id: record.sourceRecordId })}
													>
														Mark Paid
													</Button>
												)}
												{record.paidAt && !record.releasedAt && staffId && (
													<Button
														size="sm"
														variant="outline"
														className="h-7 px-2 text-xs"
														disabled={markReleased.isPending}
														onClick={() =>
															markReleased.mutate({
																id: record.sourceRecordId,
															})
														}
													>
														Mark Released
													</Button>
												)}
												<Button
													size="sm"
													variant="outline"
													className="h-7 px-2 text-xs"
													disabled={
														generateArtifact.isPending ||
														!canGenerateArtifacts ||
														pdfStatus === "generated"
													}
													onClick={() =>
														generateArtifact.mutate({
															certificateType: record.certificateType,
															sourceRecordId: record.sourceRecordId,
															artifactType: "pdf",
														})
													}
												>
													Generate PDF
												</Button>
												<Button
													size="sm"
													variant="outline"
													className="h-7 px-2 text-xs"
													disabled={
														generateArtifact.isPending ||
														!canGenerateArtifacts ||
														xmlStatus === "generated"
													}
													onClick={() =>
														generateArtifact.mutate({
															certificateType: record.certificateType,
															sourceRecordId: record.sourceRecordId,
															artifactType: "xml",
														})
													}
												>
													Generate XML
												</Button>
												<Button
													size="sm"
													variant="outline"
													className="h-7 px-2 text-xs"
													disabled={markSubmitted.isPending || !canSubmit}
													onClick={() =>
														markSubmitted.mutate({
															certificateType: record.certificateType,
															sourceRecordId: record.sourceRecordId,
															submissionStatus: "submitted",
														})
													}
												>
													Mark Submitted
												</Button>
											</div>
										</TableCell>
									</TableRow>
								)
							})}
						</TableBody>
					</Table>
					<div className="text-muted-foreground px-4 py-2 text-xs">
						{data?.total ?? 0} total record{(data?.total ?? 0) === 1 ? "" : "s"}
					</div>
				</div>
			)}
		</div>
	)
}
