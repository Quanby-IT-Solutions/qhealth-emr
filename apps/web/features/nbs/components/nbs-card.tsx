"use client"

import { useState } from "react"

import { Baby, FileSignature, FlaskConical, ShieldCheck } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"

import {
	useCreateNbsScreeningMutation,
	useNbsConsentQuery,
	useNbsScreeningQuery,
} from "@/features/nbs/api/nbs.hooks"
import { NbsConsentDialog } from "@/features/nbs/components/nbs-consent-dialog"
import { NbsReferralTracker } from "@/features/nbs/components/nbs-referral-tracker"
import { NbsScreeningForm } from "@/features/nbs/components/nbs-screening-form"
import { NbsTimeline } from "@/features/nbs/components/nbs-timeline"

// ============================================================================
// Helpers
// ============================================================================

const STATUS_CONFIG: Record<
	string,
	{ label: string; className: string }
> = {
	pending: {
		label: "Pending",
		className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
	},
	collected: {
		label: "Collected",
		className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
	},
	sent: {
		label: "Sent to Lab",
		className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
	},
	resulted: {
		label: "Resulted",
		className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
	},
	positive: {
		label: "Positive",
		className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
	},
	negative: {
		label: "Negative",
		className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
	},
}

// ============================================================================
// Newborn detection
// ============================================================================

/**
 * Returns true if the patient is a newborn (< 30 days old).
 * birthDatetime: ISO string of the patient's date of birth OR birth datetime.
 */
export function isNewborn(dateOfBirth: string): boolean {
	const dob = new Date(dateOfBirth).getTime()
	const ageMs = Date.now() - dob
	const ageDays = ageMs / (1000 * 60 * 60 * 24)
	return ageDays < 30
}

// ============================================================================
// Main component
// ============================================================================

interface NbsCardProps {
	encounterId: string
	patientId: string
	facilityId: string
	patientDateOfBirth: string
	patientName?: string
	readOnly?: boolean
}

export function NbsCard({
	encounterId,
	patientId,
	facilityId,
	patientDateOfBirth,
	patientName,
	readOnly,
}: NbsCardProps) {
	// Only show for newborns
	if (!isNewborn(patientDateOfBirth)) return null

	return (
		<NbsCardInner
			encounterId={encounterId}
			patientId={patientId}
			facilityId={facilityId}
			patientDateOfBirth={patientDateOfBirth}
			patientName={patientName}
			readOnly={readOnly}
		/>
	)
}

function NbsCardInner({
	encounterId,
	patientId,
	facilityId,
	patientDateOfBirth,
	patientName,
	readOnly,
}: NbsCardProps) {
	const { data: screening, isLoading } = useNbsScreeningQuery(encounterId)
	const { data: consent } = useNbsConsentQuery(screening?.id ?? "")
	const createScreeningMutation = useCreateNbsScreeningMutation()

	const [expanded, setExpanded] = useState(false)
	const [consentOpen, setConsentOpen] = useState(false)

	const nbsId = screening?.id ?? ""
	const statusCfg = screening ? STATUS_CONFIG[screening.status] : null

	const handleInitiate = () => {
		createScreeningMutation.mutate(
			{
				encounterId,
				patientId,
				facilityId,
				birthDatetime: patientDateOfBirth,
			},
			{ onSuccess: () => setExpanded(true) }
		)
	}

	return (
		<>
			<Card className="border-blue-200 dark:border-blue-800">
				<CardHeader className="flex flex-row items-start justify-between pb-2">
					<div className="flex items-center gap-2">
						<div className="rounded-md bg-blue-100 p-1.5 dark:bg-blue-900/30">
							<Baby className="size-4 text-blue-600 dark:text-blue-400" />
						</div>
						<CardTitle className="text-sm">Newborn Screening (NBS)</CardTitle>
						{statusCfg && (
							<Badge className={statusCfg.className}>{statusCfg.label}</Badge>
						)}
					</div>
					<div className="flex gap-1.5">
						{screening && (!readOnly || consent) && (
							<>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="gap-1.5 h-7 text-xs"
									onClick={() => setConsentOpen(true)}
								>
									<FileSignature className="size-3.5" />
									{consent ? "View Consent" : "Consent"}
								</Button>
								{consent && (
									<Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-[10px]">
										<ShieldCheck className="size-3 mr-1" />
										{consent.consentType === "waiver" ? "Waived" : "Consented"}
									</Badge>
								)}
							</>
						)}
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-7 text-xs"
							onClick={() => setExpanded((v) => !v)}
						>
							{expanded ? "Collapse" : "Expand"}
						</Button>
					</div>
				</CardHeader>

				<CardContent className="space-y-4">
					{/* Timeline — always visible */}
					{isLoading ? (
						<p className="text-sm text-muted-foreground">Loading…</p>
					) : (
						<NbsTimeline
							birthDatetime={patientDateOfBirth}
							specimenCollectedAt={screening?.specimenCollectedAt}
							specimenSentAt={screening?.specimenSentAt}
							resultReceivedAt={screening?.resultReceivedAt}
						/>
					)}

					{/* Initiate button when no screening record yet */}
					{!readOnly && !screening && !isLoading && (
						<div className="flex items-center gap-3">
							<Button
								type="button"
								size="sm"
								className="gap-1.5"
								disabled={createScreeningMutation.isPending}
								onClick={handleInitiate}
							>
								<FlaskConical className="size-4" />
								{createScreeningMutation.isPending
									? "Initiating…"
									: "Initiate NBS Screening"}
							</Button>
						</div>
					)}

					{/* Expanded content */}
					{expanded && screening && (
						<div className="space-y-4 mt-2">
							<NbsScreeningForm
								encounterId={encounterId}
								patientId={patientId}
								facilityId={facilityId}
								birthDatetime={patientDateOfBirth}
								existing={screening}
							/>

							{/* Referral tracker for positive/borderline results */}
							{(screening.status === "positive" ||
								screening.result_overall === "abnormal" ||
								screening.result_overall === "borderline") && (
								<NbsReferralTracker
									nbsId={nbsId}
									encounterId={encounterId}
									patientId={patientId}
								/>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			{screening && (
				<NbsConsentDialog
					open={consentOpen}
					onOpenChange={setConsentOpen}
					nbsId={nbsId}
					encounterId={encounterId}
					patientId={patientId}
					patientName={patientName}
				/>
			)}
		</>
	)
}
