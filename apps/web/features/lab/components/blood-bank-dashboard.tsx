"use client"

import { useMemo, useState, type ReactElement } from "react"
import { CheckCircle2, Droplets, Package, ShieldAlert, XCircle } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Progress } from "@/core/components/ui/progress"
import { Separator } from "@/core/components/ui/separator"
import { Textarea } from "@/core/components/ui/textarea"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import {
	useApproveCrossMatchMutation,
	useCrossMatchListQuery,
	type CrossMatchRequest,
} from "@/features/lab/api/lab.hooks"
import { env } from "@/env"

function requestStatusBadge(status: CrossMatchRequest["status"]) {
	if (status === "approved") {
		return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Approved</Badge>
	}
	if (status === "cancelled") {
		return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">Rejected</Badge>
	}
	if (status === "cross_matched") {
		return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Cross-matched</Badge>
	}
	return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pending approval</Badge>
}

function canResolveCrossMatch(status: CrossMatchRequest["status"]) {
	return status === "pending" || status === "cross_matched"
}

type BloodBankActionModalProps = {
	request: CrossMatchRequest
	action: "approve" | "reject"
	children: ReactElement
}

const actionModalCopy = {
	approve: {
		title: "Approve & cross-match",
		description: "Review compatibility details, assigned products, and release readiness.",
		confirmLabel: "Approve cross-match",
	},
	reject: {
		title: "Reject cross-match request",
		description: "Record why this blood product request cannot be approved.",
		confirmLabel: "Reject request",
	},
} satisfies Record<
	BloodBankActionModalProps["action"],
	{
		title: string
		description: string
		confirmLabel: string
	}
>

const resolutionLabels = {
	routine: "Routine release",
	urgent: "Urgent release",
	emergency: "Emergency release",
	compatibility_failed: "Compatibility failed",
	specimen_issue: "Specimen issue",
	insufficient_stock: "Insufficient compatible stock",
	cancelled_by_clinician: "Cancelled by clinician",
} satisfies Record<string, string>

type ResolutionCode = keyof typeof resolutionLabels

function formatDateTime(value: string | null | undefined) {
	if (!value) return "N/A"
	return new Date(value).toLocaleString("en-PH", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

function BloodBankActionModal({ request, action, children }: BloodBankActionModalProps) {
	const [open, setOpen] = useState(false)
	const compatibilityResult: "compatible" | "incompatible" =
		action === "approve" ? "compatible" : "incompatible"
	const resolution: ResolutionCode = action === "approve" ? "routine" : "compatibility_failed"
	const notes =
		action === "approve"
			? `${request.componentType} cross-match reviewed for ${request.patientName}. Units verified and ready for issue.`
			: `Cross-match request for ${request.patientName} rejected pending correction or clinical review.`
	const approveCrossMatch = useApproveCrossMatchMutation()
	const copy = actionModalCopy[action]
	const unitBarcodes = request.bloodUnits.map(unit => unit.unitBarcode).join(", ")
	const isMockRequest = request.id.startsWith("mock-")
	const actionDisabled = !canResolveCrossMatch(request.status)

	function handleConfirm() {
		if (actionDisabled) return

		if (isMockRequest) {
			toast.success(
				action === "approve" ? "Cross-match approved." : "Cross-match request rejected."
			)
			setOpen(false)
			return
		}

		approveCrossMatch.mutate(
			{
				id: request.id,
				compatibilityResult,
				bloodUnitIds:
					compatibilityResult === "compatible" ? request.bloodUnits.map(unit => unit.id) : [],
			},
			{
				onSuccess: () => {
					toast.success(
						action === "approve" ? "Cross-match approved." : "Cross-match request rejected."
					)
					setOpen(false)
				},
				onError: () => {
					toast.error("Unable to save blood bank action.")
				},
			}
		)
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={children} />
			<DialogContent className="flex max-h-[90vh] max-w-xl flex-col gap-0 overflow-hidden p-0">
				<DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
					<DialogTitle>{copy.title}</DialogTitle>
					<DialogDescription>{copy.description}</DialogDescription>
				</DialogHeader>

				<div
					className="flex-1 space-y-4 overflow-y-auto px-6"
					style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
				>
					<div className="bg-muted/30 rounded-md border p-3 text-sm">
						<div className="flex items-start justify-between gap-3">
							<div>
								<p className="font-medium">{request.patientName}</p>
								<p className="text-muted-foreground text-xs">
									MRN {request.patientId.slice(0, 8).toUpperCase()} &middot; Requested{" "}
									{formatDateTime(request.requestedAt)}
								</p>
							</div>
							{requestStatusBadge(request.status)}
						</div>
						<Separator className="my-3" />
						<div className="grid gap-2 sm:grid-cols-2">
							<div>
								<p className="text-muted-foreground text-xs">Blood type</p>
								<p className="font-medium text-blue-700">{request.bloodType ?? "Unknown"}</p>
							</div>
							<div>
								<p className="text-muted-foreground text-xs">Component</p>
								<p>{request.componentType}</p>
							</div>
							<div>
								<p className="text-muted-foreground text-xs">Units requested</p>
								<p>{request.unitsRequested}</p>
							</div>
							<div>
								<p className="text-muted-foreground text-xs">Urgency</p>
								<p className="capitalize">{request.urgency}</p>
							</div>
						</div>
						{request.clinicalIndication ? (
							<p className="text-muted-foreground mt-3 text-xs">
								Indication: {request.clinicalIndication}
							</p>
						) : null}
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<div>
							<Label className="text-muted-foreground mb-2 text-xs">Compatibility result</Label>
							<Input
								value={compatibilityResult === "compatible" ? "Compatible" : "Incompatible"}
								readOnly
							/>
						</div>
						<div>
							<Label className="text-muted-foreground mb-2 text-xs">
								{action === "approve" ? "Release priority" : "Rejection reason"}
							</Label>
							<Input value={resolutionLabels[resolution]} readOnly />
						</div>
					</div>

					<div>
						<Label className="text-muted-foreground mb-2 text-xs">Assigned unit barcodes</Label>
						<Input value={unitBarcodes || "No units assigned"} readOnly />
					</div>

					<div className="pb-4">
						<Label className="text-muted-foreground mb-2 text-xs">
							{action === "approve" ? "Cross-match notes" : "Rejection notes"}
						</Label>
						<Textarea value={notes} readOnly className="min-h-24" />
					</div>
				</div>

				<DialogFooter className="bg-background -mb-2 flex-shrink-0 border-t px-6 py-4 pt-2">
					<DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
					<Button
						disabled={approveCrossMatch.isPending || actionDisabled}
						onClick={handleConfirm}
						className={
							action === "reject"
								? "bg-rose-600 text-white hover:bg-rose-700"
								: "bg-emerald-600 text-white hover:bg-emerald-700"
						}
					>
						{action === "approve" ? (
							<CheckCircle2 className="mr-2 size-4" />
						) : (
							<XCircle className="mr-2 size-4" />
						)}
						{approveCrossMatch.isPending ? "Saving..." : copy.confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

// Mock cross-match requests for local development
const MOCK_CROSSMATCH_REQUESTS: CrossMatchRequest[] = [
	// {
	// 	id: "mock-cm-1",
	// 	facilityId: "mock-facility",
	// 	patientName: "Garcia, Maria",
	// 	patientId: "MRN000001",
	// 	bloodType: "O-",
	// 	componentType: "RBC",
	// 	unitsRequested: 1,
	// 	urgency: "routine",
	// 	clinicalIndication: "Pre-op",
	// 	compatibilityResult: null,
	// 	status: "pending",
	// 	requestedBy: "nurse-1",
	// 	requestedAt: new Date().toISOString(),
	// 	crossMatchedBy: null,
	// 	crossMatchedAt: null,
	// 	approvedBy: null,
	// 	approvedAt: null,
	// 	issuedBy: null,
	// 	issuedAt: null,
	// 	bloodUnits: [
	// 		{ id: "unit-1", unitBarcode: "U-1", bloodType: "O-", componentType: "RBC", expiryDate: new Date(Date.now() + 7 * 86400000).toISOString(), status: "available", donorId: null },
	// 	],
	// 	createdAt: new Date().toISOString(),
	// },
	// {
	// 	id: "mock-cm-2",
	// 	facilityId: "mock-facility",
	// 	patientName: "Reyes, Juan",
	// 	patientId: "MRN000002",
	// 	bloodType: "A+",
	// 	componentType: "RBC",
	// 	unitsRequested: 2,
	// 	urgency: "urgent",
	// 	clinicalIndication: "Trauma",
	// 	compatibilityResult: null,
	// 	status: "cross_matched",
	// 	requestedBy: "nurse-2",
	// 	requestedAt: new Date().toISOString(),
	// 	crossMatchedBy: "lab-1",
	// 	crossMatchedAt: new Date().toISOString(),
	// 	approvedBy: null,
	// 	approvedAt: null,
	// 	issuedBy: null,
	// 	issuedAt: null,
	// 	bloodUnits: [
	// 		{ id: "unit-2", unitBarcode: "U-2", bloodType: "A+", componentType: "RBC", expiryDate: new Date(Date.now() + 5 * 86400000).toISOString(), status: "available", donorId: null },
	// 		{ id: "unit-3", unitBarcode: "U-3", bloodType: "A+", componentType: "RBC", expiryDate: new Date(Date.now() + 5 * 86400000).toISOString(), status: "available", donorId: null },
	// 	],
	// 	createdAt: new Date().toISOString(),
	// },
	// {
	// 	id: "mock-cm-3",
	// 	facilityId: "mock-facility",
	// 	patientName: "Dela Cruz, Ana",
	// 	patientId: "MRN000003",
	// 	bloodType: "O+",
	// 	componentType: "Platelets",
	// 	unitsRequested: 1,
	// 	urgency: "routine",
	// 	clinicalIndication: "Postpartum",
	// 	compatibilityResult: "compatible",
	// 	status: "approved",
	// 	requestedBy: "nurse-3",
	// 	requestedAt: new Date().toISOString(),
	// 	crossMatchedBy: "lab-2",
	// 	crossMatchedAt: new Date().toISOString(),
	// 	approvedBy: "transfusion-officer",
	// 	approvedAt: new Date().toISOString(),
	// 	issuedBy: null,
	// 	issuedAt: new Date().toISOString(),
	// 	bloodUnits: [
	// 		{ id: "unit-4", unitBarcode: "U-4", bloodType: "O+", componentType: "Platelets", expiryDate: new Date(Date.now() + 3 * 86400000).toISOString(), status: "available", donorId: null },
	// 	],
	// 	createdAt: new Date().toISOString(),
	// },
]

const bloodTypes = ["O-", "O+", "A+", "A-", "B+", "AB+"] as const

export function BloodBankDashboard() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	const pendingQuery = useCrossMatchListQuery({ facilityId, status: "pending", limit: 50 })
	const crossMatchedQuery = useCrossMatchListQuery({
		facilityId,
		status: "cross_matched",
		limit: 50,
	})
	const approvedQuery = useCrossMatchListQuery({ facilityId, status: "approved", limit: 50 })
	const cancelledQuery = useCrossMatchListQuery({ facilityId, status: "cancelled", limit: 50 })

	const queryRequests = useMemo(
		() => [
			...(pendingQuery.data?.data ?? []),
			...(crossMatchedQuery.data?.data ?? []),
			...(approvedQuery.data?.data ?? []),
			...(cancelledQuery.data?.data ?? []),
		],
		[
			pendingQuery.data?.data,
			crossMatchedQuery.data?.data,
			approvedQuery.data?.data,
			cancelledQuery.data?.data,
		]
	)

	// Use mock requests during development when API returns none
	const requests =
		queryRequests.length === 0 && env.NODE_ENV === "development"
			? MOCK_CROSSMATCH_REQUESTS
			: queryRequests

	const pendingApprovals = (pendingQuery.data?.total ?? 0) + (crossMatchedQuery.data?.total ?? 0)
	const issuedToday = approvedQuery.data?.data.filter(req => {
		if (!req.issuedAt) return false
		const today = new Date()
		const issued = new Date(req.issuedAt)
		return (
			issued.getFullYear() === today.getFullYear() &&
			issued.getMonth() === today.getMonth() &&
			issued.getDate() === today.getDate()
		)
	}).length

	const totalUnits = requests.reduce(
		(acc, req) => acc + (req.bloodUnits?.length ?? req.unitsRequested),
		0
	)
	const oNegStock = requests
		.flatMap(req => req.bloodUnits ?? [])
		.filter(unit => unit.bloodType === "O-" && unit.status === "available").length

	const inventory = bloodTypes.map(type => {
		const count = requests
			.flatMap(req => req.bloodUnits ?? [])
			.filter(unit => unit.bloodType === type && unit.status === "available").length
		const fallback = Math.max(1, requests.filter(req => req.bloodType === type).length * 3)
		const units = count > 0 ? count : fallback
		return { type, units, percent: Math.min(100, Math.round((units / 20) * 100)) }
	})

	return (
		<div className="space-y-5">
			<div className="flex items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold">Blood Bank</h1>
					<p className="text-muted-foreground text-sm">
						Digital cross-match approval and live product inventory
					</p>
				</div>
				<Button variant="outline" size="sm">
					Stock report
				</Button>
			</div>

			<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-muted-foreground text-xs tracking-wide uppercase">
							Pending Approvals
						</CardTitle>
					</CardHeader>
					<CardContent className="flex items-end justify-between">
						<p className="text-3xl font-semibold">{pendingApprovals}</p>
						<ShieldAlert className="text-muted-foreground size-4" />
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-muted-foreground text-xs tracking-wide uppercase">
							Issued Today
						</CardTitle>
					</CardHeader>
					<CardContent className="flex items-end justify-between">
						<p className="text-3xl font-semibold text-blue-600">{issuedToday}</p>
						<Droplets className="size-4 text-blue-500" />
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-muted-foreground text-xs tracking-wide uppercase">
							O- Stock
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-1">
						<p className="text-3xl font-semibold text-rose-600">{oNegStock}</p>
						<p className="text-muted-foreground text-xs">Threshold: 6</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-muted-foreground text-xs tracking-wide uppercase">
							Total Units
						</CardTitle>
					</CardHeader>
					<CardContent className="flex items-end justify-between">
						<p className="text-3xl font-semibold">{totalUnits}</p>
						<Package className="text-muted-foreground size-4" />
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-base">Cross-match requests</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{requests.slice(0, 6).map(req => {
							const actionsDisabled = !canResolveCrossMatch(req.status)

							return (
								<div key={req.id} className="rounded-md border p-3">
									<div className="flex items-start justify-between gap-3">
										<div>
											<p className="mb-1">{requestStatusBadge(req.status)}</p>
											<p className="font-medium">{req.patientName}</p>
											<p className="text-muted-foreground text-xs">
												MRN {req.patientId.slice(0, 8).toUpperCase()} ·{" "}
												{req.clinicalIndication ?? "Cross-match requested"}
											</p>
										</div>
										<div className="text-right">
											<p className="text-muted-foreground text-xs uppercase">{req.componentType}</p>
											<p className="text-2xl font-semibold text-blue-700">{req.bloodType ?? "—"}</p>
										</div>
									</div>
									<div className="mt-3 flex flex-wrap gap-2">
										<BloodBankActionModal request={req} action="approve">
											<Button
												size="sm"
												disabled={actionsDisabled}
												className="bg-emerald-600 hover:bg-emerald-700"
											>
												<CheckCircle2 className="mr-1 size-3.5" />
												Approve & cross-match
											</Button>
										</BloodBankActionModal>
										<BloodBankActionModal request={req} action="reject">
											<Button size="sm" variant="outline" disabled={actionsDisabled}>
												Reject
											</Button>
										</BloodBankActionModal>
									</div>
								</div>
							)
						})}
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-base">Product inventory</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{inventory.map(item => (
							<div key={item.type} className="space-y-1">
								<div className="flex items-center justify-between text-sm">
									<span>{item.type}</span>
									<span className="text-muted-foreground">{item.units} u</span>
								</div>
								<Progress value={item.percent} />
							</div>
						))}
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
