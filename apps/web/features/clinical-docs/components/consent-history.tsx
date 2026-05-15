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
import {
	usePatientConsentsQuery,
	type ConsentRecord,
} from "@/features/clinical-docs/api/clinical-docs.hooks"
import { DpaConsentModal } from "@/features/clinical-docs/components/dpa-consent-modal"
import { ConsentRevocation } from "@/features/clinical-docs/components/consent-revocation"

function formatDateTime(dateStr: string | null | undefined) {
	if (!dateStr) return "--"
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
	canManageConsents?: boolean
}

export function ConsentHistory({
	patientId,
	facilityId,
	currentEncounterId,
	canManageConsents,
}: ConsentHistoryProps) {
	const { data, isLoading } = usePatientConsentsQuery({ patientId })
	const [dpaModalOpen, setDpaModalOpen] = useState(false)
	const [revokeTarget, setRevokeTarget] = useState<ConsentRecord | null>(null)

	const consents = data?.data ?? []

	return (
		<>
			<Card className="overflow-hidden">
				<CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-2">
						<FileText className="size-4 text-muted-foreground" />
						<CardTitle>Consent History</CardTitle>
					</div>
					{currentEncounterId && canManageConsents && (
						<Button size="sm" className="w-full sm:w-fit" onClick={() => setDpaModalOpen(true)}>
							DPA Consent
						</Button>
					)}
				</CardHeader>
				<CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
					{isLoading ? (
						<div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
					) : consents.length === 0 ? (
						<div className="py-8 text-center text-sm text-muted-foreground">
							No consent records found for this patient.
						</div>
					) : (
						<>
							<div className="divide-y rounded-md border md:hidden">
								{consents.map(consent => (
									<div key={consent.id} className="space-y-3 p-4">
										<div className="flex min-w-0 items-start justify-between gap-3">
											<div className="min-w-0">
												<p className="font-medium break-words">
													{CONSENT_TYPE_LABELS[consent.consentType] ?? consent.consentType}
												</p>
												<p className="text-muted-foreground mt-1 text-xs break-words">
													Signed {formatDateTime(consent.signedAt)}
												</p>
											</div>
											<div className="shrink-0">
												<ConsentStatusBadge consent={consent} />
											</div>
										</div>

										<div className="grid gap-3 text-sm sm:grid-cols-2">
											<div className="min-w-0">
												<p className="text-muted-foreground text-xs">Signed By</p>
												<p className="break-words">{consent.signedByName}</p>
											</div>
											<div className="min-w-0">
												<p className="text-muted-foreground text-xs">Relationship</p>
												<p className="break-words">
													{RELATIONSHIP_LABELS[consent.relationship] ?? consent.relationship}
												</p>
											</div>
										</div>

										{consent.revokedAt ? (
											<p className="text-sm text-red-600">
												Revoked {formatDateTime(consent.revokedAt)}
											</p>
										) : canManageConsents ? (
											<Button
												variant="outline"
												size="sm"
												className="w-full"
												onClick={() => setRevokeTarget(consent)}
											>
												Revoke
											</Button>
										) : null}
									</div>
								))}
							</div>

							<div className="hidden rounded-md border md:block">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Type</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Signed By</TableHead>
											<TableHead>Relationship</TableHead>
											<TableHead>Date Signed</TableHead>
											<TableHead>Revoked At</TableHead>
											<TableHead className="w-[96px] text-right" />
										</TableRow>
									</TableHeader>
									<TableBody>
										{consents.map(consent => (
											<TableRow key={consent.id}>
												<TableCell className="max-w-48 text-sm font-medium whitespace-normal">
													<span className="break-words">
														{CONSENT_TYPE_LABELS[consent.consentType] ?? consent.consentType}
													</span>
												</TableCell>
												<TableCell>
													<ConsentStatusBadge consent={consent} />
												</TableCell>
												<TableCell className="max-w-48 text-sm whitespace-normal">
													<span className="break-words">{consent.signedByName}</span>
												</TableCell>
												<TableCell className="text-sm whitespace-normal">
													{RELATIONSHIP_LABELS[consent.relationship] ?? consent.relationship}
												</TableCell>
												<TableCell className="min-w-36 text-sm whitespace-normal">
													{formatDateTime(consent.signedAt)}
												</TableCell>
												<TableCell className="min-w-36 text-sm whitespace-normal">
													{consent.revokedAt ? (
														<span className="text-red-600">{formatDateTime(consent.revokedAt)}</span>
													) : (
														"--"
													)}
												</TableCell>
												<TableCell className="text-right">
													{!consent.revokedAt && canManageConsents && (
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
							</div>
						</>
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
					onOpenChange={open => {
						if (!open) setRevokeTarget(null)
					}}
					consent={revokeTarget}
					patientId={patientId}
				/>
			)}
		</>
	)
}
