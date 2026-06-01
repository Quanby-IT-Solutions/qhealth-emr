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
import {
	type ConsentRecord,
	useConsentsQuery,
} from "@/features/clinical-docs/api/clinical-docs.hooks"

import { ConsentRevocation } from "./consent-revocation"
import { CreateConsentDialog } from "./create-consent-dialog"

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

function consentTypeLabel(type: string) {
	const labels: Record<string, string> = {
		general: "General Consent",
		procedure: "Procedure Consent",
		research: "Research Consent",
		blood_transfusion: "Blood Transfusion",
		surgery: "Surgery Consent",
	}
	return labels[type] ?? type
}

function relationshipLabel(rel: string) {
	const labels: Record<string, string> = {
		self: "Self",
		parent: "Parent",
		guardian: "Guardian",
		spouse: "Spouse",
		other: "Other",
	}
	return labels[rel] ?? rel
}

interface ConsentRecordsTabProps {
	encounterId: string
	facilityId: string
	patientId: string
	canManageConsents?: boolean
}

export function ConsentRecordsTab({
	encounterId,
	facilityId,
	patientId,
	canManageConsents,
}: ConsentRecordsTabProps) {
	const { data, isLoading } = useConsentsQuery({ encounterId })
	const [createOpen, setCreateOpen] = useState(false)
	const [revokeTarget, setRevokeTarget] = useState<ConsentRecord | null>(null)

	const consents = data?.data ?? []

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>Consent Records</CardTitle>
					{canManageConsents && (
						<Button size="sm" onClick={() => setCreateOpen(true)}>
							Capture Consent
						</Button>
					)}
				</CardHeader>
				<CardContent className="p-0">
					{isLoading ? (
						<div className="text-muted-foreground py-8 text-center text-sm">
							Loading consents…
						</div>
					) : consents.length > 0 ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Type</TableHead>
									<TableHead>Signed By</TableHead>
									<TableHead>Relationship</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Signed At</TableHead>
									<TableHead>Witness</TableHead>
									<TableHead className="w-[80px]" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{consents.map(consent => {
									const isRevoked = !!consent.revokedAt
									return (
										<TableRow key={consent.id}>
											<TableCell>
												{consentTypeLabel(consent.consentType)}
											</TableCell>
											<TableCell>{consent.signedByName}</TableCell>
											<TableCell>
												{relationshipLabel(consent.relationship)}
											</TableCell>
											<TableCell>
												<Badge
													variant={isRevoked ? "destructive" : "default"}
												>
													{isRevoked ? "Revoked" : "Active"}
												</Badge>
											</TableCell>
											<TableCell>
												{formatDateTime(consent.signedAt)}
											</TableCell>
											<TableCell>
												{consent.witnessStaffName ?? "—"}
											</TableCell>
											<TableCell>
											{!isRevoked && canManageConsents && (
													<Button
														size="sm"
														variant="outline"
														onClick={() => setRevokeTarget(consent)}
													>
														Revoke
													</Button>
												)}
											</TableCell>
										</TableRow>
									)
								})}
							</TableBody>
						</Table>
					) : (
						<div className="text-muted-foreground py-8 text-center text-sm">
							No consent records yet. Click "Capture Consent" to record patient
							consent.
						</div>
					)}
				</CardContent>
			</Card>

			<CreateConsentDialog
				open={createOpen}
				onOpenChange={setCreateOpen}
				encounterId={encounterId}
				facilityId={facilityId}
				patientId={patientId}
			/>

			{revokeTarget && (
				<ConsentRevocation
					open={!!revokeTarget}
					onOpenChange={open => {
						if (!open) setRevokeTarget(null)
					}}
					consent={revokeTarget}
					patientId={patientId}
				/>
			)}
		</div>
	)
}
