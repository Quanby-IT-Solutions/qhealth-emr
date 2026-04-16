"use client"

import { useState } from "react"

import { FileText } from "lucide-react"

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
import type { ConsentRecord } from "@/features/clinical-docs/api/clinical-docs.hooks"
import { usePatientConsentsQuery } from "@/features/clinical-docs/api/clinical-docs.hooks"
import { DpaConsentModal } from "@/features/clinical-docs/components/dpa-consent-modal"
import { ConsentRevocation } from "@/features/clinical-docs/components/consent-revocation"

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

const CONSENT_TYPE_LABELS: Record<string, string> = {
	general: "General",
	procedure: "Procedure",
	research: "Research",
	blood_transfusion: "Blood Transfusion",
	surgery: "Surgery",
	dpa: "DPA (Data Privacy)",
}

const RELATIONSHIP_LABELS: Record<string, string> = {
	self: "Self",
	parent: "Parent",
	guardian: "Guardian",
	spouse: "Spouse",
	other: "Other",
}

function consentStatusLabel(consent: ConsentRecord) {
	if (consent.revokedAt) return "Revoked"
	// Consents do not have an expiry currently — show Active
	return "Active"
}

function ConsentStatusBadge({ consent }: { consent: ConsentRecord }) {
	const status = consentStatusLabel(consent)
	if (status === "Revoked") {
		return <Badge variant="destructive">Revoked</Badge>
	}
	return (
		<Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200">
			Active
		</Badge>
	)
}

interface ConsentHistoryProps {
	patientId: string
	facilityId: string
	/** When provided the DPA capture button will know which encounter to attach it to */
	currentEncounterId?: string
}

export function ConsentHistory({ patientId, facilityId, currentEncounterId }: ConsentHistoryProps) {
	const { data, isLoading } = usePatientConsentsQuery({ patientId })
	const [dpaModalOpen, setDpaModalOpen] = useState(false)
	const [revokeTarget, setRevokeTarget] = useState<ConsentRecord | null>(null)

	const consents = data?.data ?? []

	return (
		<>
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div className="flex items-center gap-2">
						<FileText className="size-4 text-muted-foreground" />
						<CardTitle>Consent History</CardTitle>
					</div>
					{currentEncounterId && (
						<Button size="sm" onClick={() => setDpaModalOpen(true)}>
							DPA Consent
						</Button>
					)}
				</CardHeader>
				<CardContent className="p-0">
					{isLoading ? (
						<div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
					) : consents.length === 0 ? (
						<div className="py-8 text-center text-sm text-muted-foreground">
							No consent records found for this patient.
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Type</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Signed By</TableHead>
									<TableHead>Relationship</TableHead>
									<TableHead>Date Signed</TableHead>
									<TableHead>Revoked At</TableHead>
									<TableHead className="w-[80px]" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{consents.map(consent => (
									<TableRow key={consent.id}>
										<TableCell className="text-sm font-medium">
											{CONSENT_TYPE_LABELS[consent.consentType] ?? consent.consentType}
										</TableCell>
										<TableCell>
											<ConsentStatusBadge consent={consent} />
										</TableCell>
										<TableCell className="text-sm">{consent.signedByName}</TableCell>
										<TableCell className="text-sm">
											{RELATIONSHIP_LABELS[consent.relationship] ?? consent.relationship}
										</TableCell>
										<TableCell className="text-sm">{formatDateTime(consent.signedAt)}</TableCell>
										<TableCell className="text-sm">
											{consent.revokedAt ? (
												<span className="text-red-600">{formatDateTime(consent.revokedAt)}</span>
											) : (
												"—"
											)}
										</TableCell>
										<TableCell>
											{!consent.revokedAt && (
												<Button
													variant="outline"
													size="sm"
													onClick={() => setRevokeTarget(consent)}
												>
													Revoke
												</Button>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			{currentEncounterId && (
				<DpaConsentModal
					open={dpaModalOpen}
					onOpenChange={setDpaModalOpen}
					encounterId={currentEncounterId}
					facilityId={facilityId}
					patientId={patientId}
				/>
			)}

			{revokeTarget && (
				<ConsentRevocation
					open={!!revokeTarget}
					onOpenChange={open => { if (!open) setRevokeTarget(null) }}
					consent={revokeTarget}
					patientId={patientId}
				/>
			)}
		</>
	)
}
