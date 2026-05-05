"use client"

import { useRouter } from "next/navigation"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"

import { ErrorState, SkeletonRows } from "@/features/admin/components/state-views"
import { useRecordsAuditQuery } from "../api/records.hooks"
import { useMedicalRecordsRequestQuery } from "../api/medical-records.hooks"

interface RecordsRequestDetailPageProps {
	requestId: string
}

export function RecordsRequestDetailPage({ requestId }: RecordsRequestDetailPageProps) {
	const router = useRouter()
	const { data: r, isLoading, isError, refetch, error } = useMedicalRecordsRequestQuery(requestId)
	const { data: auditData } = useRecordsAuditQuery({
		facilityId: r?.facilityId ?? "",
		requestId,
		limit: 50,
	})

	if (isLoading) return <SkeletonRows count={4} className="p-6" />
	if (isError) return <ErrorState error={error} retry={refetch} />
	if (!r) return null

	const releaseDisabled = !r.dpaConsentObtained || !r.paidAt || !r.identityVerified || r.status === "completed"
	const auditEntries = auditData?.entries ?? []
	const dpaEntry = auditEntries.find(entry => entry.action === "dpa_consent")
	const identityEntry = auditEntries.find(entry => entry.action === "identity_proof")
	const physicianSignatureEntry = auditEntries.find(entry => entry.action === "physician_signature")
	const releaseEntry = auditEntries.find(entry => entry.action === "release")

	return (
		<div className="space-y-3 p-4 max-w-2xl">
			<Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">← Back</Button>

			<div>
				<h1 className="text-lg font-semibold capitalize">{r.requestType.replace(/_/g, " ")}</h1>
				<p className="text-xs text-muted-foreground">
					Requested by {r.requestedByName}
					{r.requestedByRelationship ? ` (${r.requestedByRelationship})` : ""}
				</p>
			</div>

			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm">Status</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2 text-sm">
					<Row label="Current" value={<Badge variant={r.status === "completed" ? "default" : "secondary"} className="capitalize">{r.status}</Badge>} />
					<Row label="DPA Consent" value={<Gate ok={r.dpaConsentObtained} />} />
					<Row label="Identity Verified" value={<Gate ok={r.identityVerified} />} />
					<Row label="Payment Cleared" value={<Gate ok={!!r.paidAt} />} />
					{r.releasedAt && <Row label="Released" value={new Date(r.releasedAt).toLocaleString("en-PH")} />}
					{r.purpose && <Row label="Purpose" value={r.purpose} />}
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm">Workflow Evidence</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2 text-sm">
					<Row label="Requested document" value={r.requestType.replace(/_/g, " ")} />
					<Row label="Relationship" value={r.requestedByRelationship?.replace(/_/g, " ") ?? "Unspecified"} />
					<Row label="DPA consent evidence" value={dpaEntry ? formatAuditEntry(dpaEntry.occurredAt) : "Pending capture"} />
					<Row
						label="Identity proof evidence"
						value={identityEntry ? formatAuditEntry(identityEntry.occurredAt, identityEntry.documentTypes?.join(", ") ?? undefined) : "Pending verification"}
					/>
					<Row
						label="Physician signature"
						value={physicianSignatureEntry ? formatAuditEntry(physicianSignatureEntry.occurredAt) : "Not attached"}
					/>
					<Row
						label="Release artifact log"
						value={releaseEntry ? formatAuditEntry(releaseEntry.occurredAt, releaseEntry.documentTypes?.join(", ") ?? undefined) : "Not yet released"}
					/>
				</CardContent>
			</Card>

			<div className="flex gap-2">
				<Button
					onClick={() => router.push(`/him/records-requests/${requestId}/release`)}
					disabled={releaseDisabled}
				>
					{r.status === "completed" ? "Released" : "Process Release"}
				</Button>
				<Button variant="outline" onClick={() => router.push(`/him/records-audit?req=${requestId}`)}>
					View Audit
				</Button>
			</div>
		</div>
	)
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="flex items-center justify-between">
			<span className="text-muted-foreground">{label}</span>
			<span>{value}</span>
		</div>
	)
}

function Gate({ ok }: { ok: boolean }) {
	return (
		<Badge variant={ok ? "default" : "destructive"} className="text-[10px]">
			{ok ? "✓" : "✗"}
		</Badge>
	)
}

function formatAuditEntry(occurredAt: Date | string, detail?: string) {
	const timestamp = new Date(occurredAt).toLocaleString("en-PH")
	return detail ? `${timestamp} • ${detail}` : timestamp
}
