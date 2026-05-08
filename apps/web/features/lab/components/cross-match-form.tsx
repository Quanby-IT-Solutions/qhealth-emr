"use client"

import { useState } from "react"
import { CheckCircle, Droplets, XCircle } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
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
import { Textarea } from "@/core/components/ui/textarea"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import {
	useApproveCrossMatchMutation,
	useCreateCrossMatchMutation,
	useCrossMatchListQuery,
	type BloodType,
	type CrossMatchRequest,
} from "@/features/lab/api/lab.hooks"

// ============================================================================
// Helpers
// ============================================================================

const BLOOD_TYPES: BloodType[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

const COMPONENT_TYPES = [
	"Whole Blood",
	"Packed Red Blood Cells (PRBC)",
	"Fresh Frozen Plasma (FFP)",
	"Platelet Concentrate",
	"Cryoprecipitate",
]

function formatDateTime(d: string | null | undefined) {
	if (!d) return "—"
	return new Date(d).toLocaleString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

function urgencyBadge(urgency: CrossMatchRequest["urgency"]) {
	switch (urgency) {
		case "emergency":
			return <Badge variant="destructive">Emergency</Badge>
		case "urgent":
			return <Badge variant="secondary">Urgent</Badge>
		default:
			return <Badge variant="outline">Routine</Badge>
	}
}

function statusBadge(status: CrossMatchRequest["status"]) {
	switch (status) {
		case "pending":
			return <Badge variant="outline">Pending</Badge>
		case "cross_matched":
			return <Badge variant="secondary">Cross-Matched</Badge>
		case "approved":
			return <Badge variant="default">Approved</Badge>
		case "issued":
			return <Badge variant="default">Issued</Badge>
		case "transfused":
			return (
				<Badge variant="default" className="bg-green-600 text-white hover:bg-green-700">
					Transfused
				</Badge>
			)
		case "cancelled":
			return (
				<Badge variant="outline" className="text-muted-foreground">
					Cancelled
				</Badge>
			)
	}
}

function compatibilityIcon(result: CrossMatchRequest["compatibilityResult"]) {
	switch (result) {
		case "compatible":
			return <CheckCircle className="size-4 text-green-600" />
		case "incompatible":
			return <XCircle className="text-destructive size-4" />
		default:
			return <span className="text-muted-foreground">—</span>
	}
}

// ============================================================================
// New Cross-Match Request Form
// ============================================================================

function NewCrossMatchForm({
	facilityId,
	onSuccess,
	canCreate,
}: {
	facilityId: string
	onSuccess: () => void
	canCreate: boolean
}) {
	const [patientId, setPatientId] = useState("")
	const [bloodType, setBloodType] = useState<BloodType | "">("")
	const [componentType, setComponentType] = useState("")
	const [unitsRequested, setUnitsRequested] = useState("1")
	const [urgency, setUrgency] = useState<CrossMatchRequest["urgency"]>("routine")
	const [clinicalIndication, setClinicalIndication] = useState("")

	const createCrossMatch = useCreateCrossMatchMutation()

	function handleSubmit() {
		if (!patientId.trim() || !componentType || !unitsRequested) return
		createCrossMatch.mutate(
			{
				facilityId,
				patientId: patientId.trim(),
				bloodType: bloodType || undefined,
				componentType,
				unitsRequested: Number(unitsRequested),
				urgency,
				clinicalIndication: clinicalIndication.trim() || undefined,
			},
			{
				onSuccess: () => {
					setPatientId("")
					setBloodType("")
					setComponentType("")
					setUnitsRequested("1")
					setUrgency("routine")
					setClinicalIndication("")
					onSuccess()
				},
			}
		)
	}

	const canSubmit =
		canCreate &&
		patientId.trim() &&
		componentType &&
		Number(unitsRequested) > 0 &&
		!createCrossMatch.isPending

	return (
		<div className="grid gap-4">
			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label>
						Patient ID <span className="text-destructive">*</span>
					</Label>
					<Input
						value={patientId}
						onChange={e => setPatientId(e.target.value)}
						placeholder="Patient MRN / ID"
					/>
				</div>

				<div className="space-y-2">
					<Label>Patient Blood Type (if known)</Label>
					<Select
						value={bloodType || undefined}
						onValueChange={v => v && setBloodType(v as BloodType)}
					>
						<SelectTrigger>
							<SelectValue>{bloodType || "Unknown"}</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{BLOOD_TYPES.map(bt => (
								<SelectItem key={bt} value={bt}>
									{bt}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label>
						Blood Component <span className="text-destructive">*</span>
					</Label>
					<Select value={componentType} onValueChange={v => v && setComponentType(v)}>
						<SelectTrigger>
							<SelectValue>{componentType || "Select component"}</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{COMPONENT_TYPES.map(c => (
								<SelectItem key={c} value={c}>
									{c}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2">
					<Label>
						Units Requested <span className="text-destructive">*</span>
					</Label>
					<Input
						type="number"
						min={1}
						max={20}
						value={unitsRequested}
						onChange={e => setUnitsRequested(e.target.value)}
					/>
				</div>
			</div>

			<div className="space-y-2">
				<Label>Urgency</Label>
				<Select value={urgency} onValueChange={v => setUrgency(v as CrossMatchRequest["urgency"])}>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="routine">Routine</SelectItem>
						<SelectItem value="urgent">Urgent (within 4h)</SelectItem>
						<SelectItem value="emergency">Emergency (ASAP)</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-2">
				<Label>Clinical Indication</Label>
				<Input
					value={clinicalIndication}
					onChange={e => setClinicalIndication(e.target.value)}
					placeholder="e.g., Post-operative hemorrhage, anemia"
				/>
			</div>

			<Button disabled={!canSubmit} onClick={handleSubmit} className="w-full">
				{createCrossMatch.isPending ? "Submitting…" : "Submit Cross-Match Request"}
			</Button>
		</div>
	)
}

// ============================================================================
// Cross-Match List Table
// ============================================================================

function CrossMatchTable({
	requests,
	isLoading,
	onApprove,
	canApprove,
}: {
	requests: CrossMatchRequest[]
	isLoading: boolean
	onApprove: (req: CrossMatchRequest) => void
	canApprove: boolean
}) {
	if (isLoading) {
		return <div className="text-muted-foreground py-12 text-center text-sm">Loading requests…</div>
	}

	if (requests.length === 0) {
		return (
			<div className="flex flex-col items-center gap-2 py-12">
				<Droplets className="text-muted-foreground/40 size-8" />
				<p className="text-muted-foreground text-sm">No requests found.</p>
			</div>
		)
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Patient</TableHead>
					<TableHead>Component</TableHead>
					<TableHead>Units</TableHead>
					<TableHead>Urgency</TableHead>
					<TableHead>Requested</TableHead>
					<TableHead>Compatibility</TableHead>
					<TableHead>Status</TableHead>
					<TableHead />
				</TableRow>
			</TableHeader>
			<TableBody>
				{requests.map(req => (
					<TableRow key={req.id}>
						<TableCell>
							<div>
								<p className="font-medium">{req.patientName}</p>
								{req.bloodType && (
									<p className="text-muted-foreground text-xs">Blood type: {req.bloodType}</p>
								)}
							</div>
						</TableCell>
						<TableCell>{req.componentType}</TableCell>
						<TableCell>{req.unitsRequested}</TableCell>
						<TableCell>{urgencyBadge(req.urgency)}</TableCell>
						<TableCell>{formatDateTime(req.requestedAt)}</TableCell>
						<TableCell>
							<div className="flex items-center gap-1">
								{compatibilityIcon(req.compatibilityResult)}
								{req.compatibilityResult && (
									<span className="text-xs capitalize">{req.compatibilityResult}</span>
								)}
							</div>
						</TableCell>
						<TableCell>{statusBadge(req.status)}</TableCell>
						<TableCell>
							{["pending", "cross_matched"].includes(req.status) && canApprove && (
								<Button variant="outline" size="sm" onClick={() => onApprove(req)}>
									Approve
								</Button>
							)}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	)
}

// ============================================================================
// Approve Dialog
// ============================================================================

function ApproveDialog({
	request,
	open,
	onOpenChange,
}: {
	request: CrossMatchRequest | null
	open: boolean
	onOpenChange: (open: boolean) => void
}) {
	const [compatibilityResult, setCompatibilityResult] = useState<
		"compatible" | "incompatible" | ""
	>("")
	const [bloodUnitIds, setBloodUnitIds] = useState("")
	const [rejectionReason, setRejectionReason] = useState("")
	const approveMutation = useApproveCrossMatchMutation()

	if (!request) return null

	function handleApprove() {
		if (!compatibilityResult || !request) return
		approveMutation.mutate(
			{
				id: request.id,
				compatibilityResult,
				bloodUnitIds:
					compatibilityResult === "compatible"
						? bloodUnitIds
								.split(/[\n,]/)
								.map(id => id.trim())
								.filter(Boolean)
						: [],
				rejectionReason: rejectionReason.trim() || undefined,
			},
			{
				onSuccess: () => {
					setCompatibilityResult("")
					setBloodUnitIds("")
					setRejectionReason("")
					onOpenChange(false)
				},
			}
		)
	}

	const parsedBloodUnitIds = bloodUnitIds
		.split(/[\n,]/)
		.map(id => id.trim())
		.filter(Boolean)
	const canConfirm =
		compatibilityResult === "incompatible" ||
		(compatibilityResult === "compatible" && parsedBloodUnitIds.length >= request.unitsRequested)

	return (
		<div
			role="dialog"
			className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 ${open ? "" : "hidden"}`}
			onClick={e => e.target === e.currentTarget && onOpenChange(false)}
		>
			<div className="bg-background w-full max-w-md rounded-lg border p-6 shadow-xl">
				<h2 className="mb-4 text-lg font-semibold">Approve Cross-Match</h2>
				<div className="space-y-4">
					<div>
						<p className="text-muted-foreground text-sm">Patient</p>
						<p className="font-medium">{request.patientName}</p>
					</div>
					<div>
						<p className="text-muted-foreground text-sm">Component</p>
						<p className="font-medium">
							{request.componentType} × {request.unitsRequested}
						</p>
					</div>
					<div className="space-y-2">
						<Label>
							Compatibility Result <span className="text-destructive">*</span>
						</Label>
						<Select
							value={compatibilityResult || undefined}
							onValueChange={v => v && setCompatibilityResult(v as "compatible" | "incompatible")}
						>
							<SelectTrigger>
								<SelectValue>{compatibilityResult || "Select result"}</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="compatible">Compatible ✓</SelectItem>
								<SelectItem value="incompatible">Incompatible ✗</SelectItem>
							</SelectContent>
						</Select>
					</div>
					{compatibilityResult === "compatible" && (
						<div className="space-y-2">
							<Label>
								Blood Unit IDs <span className="text-destructive">*</span>
							</Label>
							<Textarea
								value={bloodUnitIds}
								onChange={e => setBloodUnitIds(e.target.value)}
								placeholder="One unit UUID per line or comma-separated"
								rows={3}
							/>
							<p className="text-muted-foreground text-xs">
								Enter at least {request.unitsRequested} compatible available unit ID
								{request.unitsRequested === 1 ? "" : "s"}.
							</p>
						</div>
					)}
					{compatibilityResult === "incompatible" && (
						<div className="space-y-2">
							<Label>Rejection Reason</Label>
							<Textarea
								value={rejectionReason}
								onChange={e => setRejectionReason(e.target.value)}
								placeholder="Document the incompatibility reason"
								rows={3}
							/>
						</div>
					)}
					<div className="flex gap-2 pt-2">
						<Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button
							className="flex-1"
							disabled={!canConfirm || approveMutation.isPending}
							onClick={handleApprove}
						>
							{approveMutation.isPending ? "Saving…" : "Confirm Approval"}
						</Button>
					</div>
				</div>
			</div>
		</div>
	)
}

// ============================================================================
// Main Blood Bank / Cross-Match Screen
// ============================================================================

export function CrossMatchForm() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""
	const permissions = profile?.activeRole?.permissions ?? []
	const permSet = new Set(
		permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`)
	)
	const canCreate = permSet.has("laboratory:create")
	const canApprove = permSet.has("laboratory:edit")

	const [approveTarget, setApproveTarget] = useState<CrossMatchRequest | null>(null)
	const [approveOpen, setApproveOpen] = useState(false)

	const pendingQuery = useCrossMatchListQuery({
		facilityId,
		status: "pending",
		limit: 50,
	})
	const activeQuery = useCrossMatchListQuery({
		facilityId,
		status: "cross_matched",
		limit: 50,
	})
	const approvedQuery = useCrossMatchListQuery({
		facilityId,
		status: "approved",
		limit: 50,
	})

	function handleApprove(req: CrossMatchRequest) {
		setApproveTarget(req)
		setApproveOpen(true)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Blood Bank — Cross-Match</h1>
				<p className="text-muted-foreground text-sm">
					Submit and manage blood product cross-match requests
				</p>
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				{/* New Request */}
				<Card className="lg:col-span-1">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<Droplets className="size-4" />
							New Request
						</CardTitle>
					</CardHeader>
					<CardContent>
						<NewCrossMatchForm
							facilityId={facilityId}
							canCreate={canCreate}
							onSuccess={() => {
								pendingQuery.refetch()
							}}
						/>
					</CardContent>
				</Card>

				{/* Request List */}
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle className="text-base">Cross-Match Requests</CardTitle>
					</CardHeader>
					<CardContent>
						<Tabs defaultValue="pending">
							<TabsList className="mb-4">
								<TabsTrigger value="pending">
									Pending
									{(pendingQuery.data?.total ?? 0) > 0 && (
										<Badge variant="secondary" className="ml-1.5 text-[10px]">
											{pendingQuery.data?.total}
										</Badge>
									)}
								</TabsTrigger>
								<TabsTrigger value="cross_matched">
									Cross-Matched
									{(activeQuery.data?.total ?? 0) > 0 && (
										<Badge variant="secondary" className="ml-1.5 text-[10px]">
											{activeQuery.data?.total}
										</Badge>
									)}
								</TabsTrigger>
								<TabsTrigger value="approved">Approved</TabsTrigger>
							</TabsList>

							<TabsContent value="pending">
								<CrossMatchTable
									requests={pendingQuery.data?.data ?? []}
									isLoading={pendingQuery.isLoading}
									onApprove={handleApprove}
									canApprove={canApprove}
								/>
							</TabsContent>
							<TabsContent value="cross_matched">
								<CrossMatchTable
									requests={activeQuery.data?.data ?? []}
									isLoading={activeQuery.isLoading}
									onApprove={handleApprove}
									canApprove={canApprove}
								/>
							</TabsContent>
							<TabsContent value="approved">
								<CrossMatchTable
									requests={approvedQuery.data?.data ?? []}
									isLoading={approvedQuery.isLoading}
									onApprove={handleApprove}
									canApprove={canApprove}
								/>
							</TabsContent>
						</Tabs>
					</CardContent>
				</Card>
			</div>

			<ApproveDialog request={approveTarget} open={approveOpen} onOpenChange={setApproveOpen} />
		</div>
	)
}
