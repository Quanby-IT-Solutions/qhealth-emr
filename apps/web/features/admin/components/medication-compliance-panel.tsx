"use client"

import Link from "next/link"
import {
	AlertCircleFreeIcons,
	ArrowLeft01FreeIcons,
	Medicine01FreeIcons,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { buttonVariants } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Progress } from "@/core/components/ui/progress"
import { Skeleton } from "@/core/components/ui/skeleton"
import { cn } from "@/core/lib/utils"

import { useMedicationComplianceQuery } from "@/features/admin/api/admin-dashboard.hooks"

// ── Compliance Row ─────────────────────────────────────────────────────────────

function ComplianceRow({
	label,
	description,
	pct,
	threshold,
	count,
	total,
}: {
	label: string
	description: string
	pct: number
	threshold: number
	count?: number
	total?: number
}) {
	const isCompliant = pct >= threshold
	return (
		<div className="space-y-1 py-3 border-b last:border-0">
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-2 min-w-0">
					<span className="text-sm font-medium truncate">{label}</span>
					<Badge
						className={cn(
							"text-[10px] px-1.5 flex-shrink-0",
							isCompliant
								? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
								: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
						)}
					>
						{isCompliant ? "Compliant" : "Below threshold"}
					</Badge>
				</div>
				<span className="text-lg font-bold tabular-nums flex-shrink-0">{pct}%</span>
			</div>
			<Progress value={pct} className="h-1.5" />
			<p className="text-xs text-muted-foreground">
				{count !== undefined ? `${count} of ${total} · ` : ""}{description} · Target: ≥{threshold}%
			</p>
		</div>
	)
}

// ── Count Metric ───────────────────────────────────────────────────────────────

function CountMetric({
	label,
	description,
	value,
	isIssue,
}: {
	label: string
	description: string
	value: number
	isIssue?: boolean
}) {
	return (
		<div className="flex items-start justify-between gap-4 py-3 border-b last:border-0">
			<div className="min-w-0 flex-1">
				<span className="text-sm font-medium block">{label}</span>
				<p className="text-xs text-muted-foreground mt-0.5">{description}</p>
			</div>
			<span
				className={cn(
					"text-2xl font-bold tabular-nums flex-shrink-0",
					isIssue ? "text-yellow-600 dark:text-yellow-400" : "text-foreground"
				)}
			>
				{value}
			</span>
		</div>
	)
}

// ── Main Component ────────────────────────────────────────────────────────────

export function MedicationCompliancePanel() {
	const { data, isLoading, isError } = useMedicationComplianceQuery()

	return (
		<div className="space-y-6">
			{/* Back nav */}
			<div className="flex items-center gap-4">
				<Link
					href="/admin"
					className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5")}
				>
					<HugeiconsIcon icon={ArrowLeft01FreeIcons} className="size-4" />
					Admin Dashboard
				</Link>
			</div>

			<div className="flex items-center gap-3">
				<HugeiconsIcon icon={Medicine01FreeIcons} className="size-6 text-muted-foreground" />
				<div>
					<h1 className="text-xl font-semibold">Medication Compliance Oversight</h1>
					<p className="text-sm text-muted-foreground">
						Generics Act (RA 6675), PDEA S-2 tranche compliance, CDS alert verification, PRC/PTR credentials, and high-alert medication safeguards — last 30 days
					</p>
				</div>
			</div>

			{isLoading && (
				<div className="space-y-4">
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={i} className="h-40 w-full rounded-lg" />
					))}
				</div>
			)}

			{isError && (
				<Alert variant="destructive">
					<HugeiconsIcon icon={AlertCircleFreeIcons} className="size-4" />
					<AlertTitle>Failed to load medication compliance data</AlertTitle>
					<AlertDescription>Check your connection and refresh.</AlertDescription>
				</Alert>
			)}

			{data && (
				<div className="space-y-6">
					{/* Generics Act — prescribing mix (AD-006) */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">
								Prescribing Mix — Generics Act (RA 6675)
							</CardTitle>
							<p className="text-xs text-muted-foreground">
								Under RA 6675, all prescriptions must include the generic name. Brand names may be
								added as subordinate information. Both <em>generic-only</em> and{" "}
								<em>generic&nbsp;+&nbsp;brand</em> prescriptions are fully compliant with the Generics
								Act. The figures below show the prescribing mix for informational purposes — not as a
								compliance threshold.
							</p>
						</CardHeader>
						<CardContent>
							<CountMetric
								label="Generic-only orders"
								description={`Orders carrying a generic name with no brand name — ${data.totalOrdersLast30d > 0 ? Math.round((data.genericsPrescribedCount / data.totalOrdersLast30d) * 100) : 100}% of total orders`}
								value={data.genericsPrescribedCount}
							/>
							<CountMetric
								label="Generic + brand name orders"
								description={`Orders carrying both a generic name and a brand name — ${data.totalOrdersLast30d > 0 ? Math.round((data.brandsPrescribedCount / data.totalOrdersLast30d) * 100) : 0}% of total orders. This is compliant per TOR.`}
								value={data.brandsPrescribedCount}
							/>
							<div className="pt-3">
								<p className="text-xs text-muted-foreground">
									<strong>TOR note:</strong> A prescription is non-compliant only if it omits the
									generic name entirely. The system prevents this at the point of order entry, so
									this facility has zero non-compliant Generics Act orders.
								</p>
							</div>
						</CardContent>
					</Card>

					{/* PDEA S-2 Tranche Compliance */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">
								PDEA Schedule-2 Tranche Compliance
							</CardTitle>
							<p className="text-xs text-muted-foreground">
								S-2 controlled substances (opioids, strong analgesics) require a PDEA tranche
								(batch) number and total on the prescription. Missing tranche data = dispensing without
								proper PDEA documentation.
							</p>
						</CardHeader>
						<CardContent>
							<CountMetric
								label="Controlled substance orders"
								description="Orders where isControlledSubstance = true"
								value={data.controlledSubstancesCount}
							/>
							<CountMetric
								label="PDEA Schedule-2 orders"
								description="Orders classified under PDEA S-2 schedule"
								value={data.pdeaS2Count}
							/>
							{data.pdeaS2Count > 0 && (
								<ComplianceRow
									label="S-2 orders with complete tranche data"
									description={`${data.pdeaS2WithTrancheCount} with tranche number+total out of ${data.pdeaS2Count} S-2 orders`}
									pct={data.pdeaS2TrancheCompliancePct}
									threshold={100}
									count={data.pdeaS2WithTrancheCount}
									total={data.pdeaS2Count}
								/>
							)}
							{data.pdeaS2Count === 0 && (
								<p className="text-xs text-muted-foreground py-3">
									No Schedule-2 controlled substance orders in the past 30 days.
								</p>
							)}
						</CardContent>
					</Card>

					{/* CDS Alert Verification */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">
								Clinical Decision Support (CDS) Alert Verification
							</CardTitle>
							<p className="text-xs text-muted-foreground">
								Orders that triggered drug-drug, drug-allergy, or dosing alerts must be verified by the
								prescribing physician before dispensing. Unverified alerts indicate potential patient
								safety gaps.
							</p>
						</CardHeader>
						<CardContent>
							<CountMetric
								label="Orders with CDS alerts"
								description="Orders that triggered at least one automated drug safety alert"
								value={data.ordersWithCdsAlerts}
							/>
							{data.ordersWithCdsAlerts > 0 && (
								<ComplianceRow
									label="CDS alerts acknowledged & verified"
									description={`${data.cdsAlertsVerifiedCount} verified out of ${data.ordersWithCdsAlerts} flagged orders`}
									pct={data.cdsVerificationPct}
									threshold={100}
									count={data.cdsAlertsVerifiedCount}
									total={data.ordersWithCdsAlerts}
								/>
							)}
							{data.ordersWithCdsAlerts === 0 && (
								<p className="text-xs text-muted-foreground py-3">
									No CDS alerts triggered in the past 30 days.
								</p>
							)}
						</CardContent>
					</Card>

					{/* PRC / PTR Prescribing Credentials */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">
								PRC License & PTR Credential Compliance
							</CardTitle>
							<p className="text-xs text-muted-foreground">
								Philippine law requires all electronic prescriptions to carry the prescriber's PRC
								license number and current Professional Tax Receipt (PTR) number. Prescriptions missing
								either credential are non-compliant under the Medical Act (RA 2382).
							</p>
						</CardHeader>
						<CardContent>
							<CountMetric
								label="Prescriptions issued (last 30 days)"
								description="Total signed prescriptions in this period"
								value={data.prescriptionsLast30d}
							/>
							{data.prescriptionsLast30d > 0 && (
								<ComplianceRow
									label="Prescriptions with PRC & PTR on record"
									description={`${data.prescriptionsWithPrcAndPtr} with both credentials recorded out of ${data.prescriptionsLast30d} total — credential presence check`}
									pct={data.prcPtrCompliancePct}
									threshold={100}
									count={data.prescriptionsWithPrcAndPtr}
									total={data.prescriptionsLast30d}
								/>
							)}
							{data.prescriptionsLast30d === 0 && (
								<p className="text-xs text-muted-foreground py-3">
									No prescriptions issued in the past 30 days.
								</p>
							)}
						</CardContent>
					</Card>

					{/* AD-015: Active Credential Validity */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">
								Active PRC, PTR & PDEA S-2 License Validity at Time of Prescribing
							</CardTitle>
							<p className="text-xs text-muted-foreground">
								Credential validity checks whether PRC, PTR, and PDEA S-2 licenses were <em>active
								(non-expired)</em> at the moment each prescription was signed. A credential is
								considered active if its expiry date on the staff profile was after the prescription
								signing timestamp. Prescriptions signed with expired credentials are potential PDEA
								and Medical Act violations.
							</p>
						</CardHeader>
						<CardContent>
							{data.prescriptionsLast30d > 0 ? (
								<>
									<ComplianceRow
										label="PRC license active at time of prescribing"
										description={`${data.prescriptionsWithActivePrc} prescriptions with non-expired PRC out of ${data.prescriptionsLast30d} total`}
										pct={data.prcActiveValidityPct}
										threshold={100}
										count={data.prescriptionsWithActivePrc}
										total={data.prescriptionsLast30d}
									/>
									<ComplianceRow
										label="PTR active at time of prescribing"
										description={`${data.prescriptionsWithActivePtr} prescriptions with non-expired PTR out of ${data.prescriptionsLast30d} total`}
										pct={data.ptrActiveValidityPct}
										threshold={100}
										count={data.prescriptionsWithActivePtr}
										total={data.prescriptionsLast30d}
									/>
									{data.pdeaS2Count > 0 && (
										<ComplianceRow
											label="PDEA S-2 active at time of S-2 prescribing"
											description={`${data.pdeaS2OrdersWithActiveS2} S-2 prescriptions with non-expired PDEA S-2 license out of ${data.pdeaS2Count} S-2 prescriptions with a license on record`}
											pct={data.pdeaS2ActiveLicensePct}
											threshold={100}
											count={data.pdeaS2OrdersWithActiveS2}
											total={data.pdeaS2Count}
										/>
									)}
									{data.expiredCredentialPrescriptionCount > 0 && (
										<div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-2">
											<p className="text-xs font-medium text-destructive">
												{data.expiredCredentialPrescriptionCount} prescription{data.expiredCredentialPrescriptionCount !== 1 ? "s" : ""} issued with at least one expired credential
											</p>
											<p className="text-xs text-muted-foreground mt-0.5">
												Review these prescriptions with the prescribing clinicians and update staff
												profile expiry dates in the RBAC module.
											</p>
										</div>
									)}
								</>
							) : (
								<p className="text-xs text-muted-foreground py-3">
									No prescriptions issued in the past 30 days.
								</p>
							)}
						</CardContent>
					</Card>

					{/* PDEA S-2 License Validation */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">
								PDEA S-2 License Validation on Dangerous Drug Prescriptions
							</CardTitle>
							<p className="text-xs text-muted-foreground">
								Prescriptions for Schedule-2 dangerous drugs must record the prescriber's active PDEA
								S-2 license number. Missing S-2 license evidence on a dangerous-drug prescription is a
								PDEA compliance violation.
							</p>
						</CardHeader>
						<CardContent>
							{data.pdeaS2Count > 0 ? (
								<ComplianceRow
									label="S-2 prescriptions with PDEA S-2 license on record"
									description={`${data.pdeaS2OrdersWithLicense} with S-2 license number recorded out of ${data.pdeaS2Count} S-2 orders (presence check — see Active Validity section above for expiry-based validation)`}
									pct={data.pdeaS2LicensePct}
									threshold={100}
									count={data.pdeaS2OrdersWithLicense}
									total={data.pdeaS2Count}
								/>
							) : (
								<p className="text-xs text-muted-foreground py-3">
									No Schedule-2 dangerous drug orders in the past 30 days.
								</p>
							)}
						</CardContent>
					</Card>

					{/* High-Alert Medication Safeguards */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">
								High-Alert Medication Safeguards
							</CardTitle>
							<p className="text-xs text-muted-foreground">
								High-alert medications (insulin, anticoagulants, concentrated electrolytes, cytotoxics)
								carry heightened risk of patient harm when used in error. The DOH mandates mandatory
								pharmacist verification before dispensing any high-alert drug order.
							</p>
						</CardHeader>
						<CardContent>
							<CountMetric
								label="High-alert drug orders (last 30 days)"
								description="Orders for formulary items flagged as high-alert medications"
								value={data.highAlertOrderCount}
							/>
							{data.highAlertOrderCount > 0 && (
								<ComplianceRow
									label="High-alert orders verified by pharmacist"
									description={`${data.highAlertVerifiedCount} verified out of ${data.highAlertOrderCount} high-alert orders`}
									pct={data.highAlertVerificationPct}
									threshold={100}
									count={data.highAlertVerifiedCount}
									total={data.highAlertOrderCount}
								/>
							)}
							{data.highAlertOrderCount === 0 && (
								<p className="text-xs text-muted-foreground py-3">
									No high-alert medication orders in the past 30 days.
								</p>
							)}
						</CardContent>
					</Card>

					{/* AD-016: Dangerous-Drug Dispensing Rule Compliance */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">
								Dangerous-Drug Dispensing Rule Compliance
							</CardTitle>
							<p className="text-xs text-muted-foreground">
								The TOR requires Schedule IV drugs to be capped at a 90-day supply, S-2 prescriptions
								to be split into 30-day tranches, and all dangerous-drug orders to carry temporal
								dispensing instructions and a "No Refill" inscription. Metrics cover S-2 and S-4
								orders in the past 30 days.
							</p>
						</CardHeader>
						<CardContent>
							<ComplianceRow
								label='Schedule IV 90-day supply cap'
								description='Schedule IV orders where supply does not exceed 90 days'
								pct={data.scheduleIv90DayLimitCompliancePct}
								threshold={100}
							/>
							<ComplianceRow
								label='S-2 30-day tranche splitting'
								description='Schedule II orders issued in ≤30-day supply tranches per PDEA rules'
								pct={data.scheduleIv30DayTrancheSplitCompliancePct}
								threshold={100}
							/>
							<ComplianceRow
								label='Temporal dispensing instruction coverage'
								description='Dangerous-drug orders (S-2 or S-4) with time-based dispensing instructions'
								pct={data.temporalDispensingInstructionPct}
								threshold={100}
							/>
							<ComplianceRow
								label='"No Refill" inscription coverage'
								description='Dangerous-drug orders with the mandatory "No Refill" notation on the prescription'
								pct={data.noRefillInscriptionPct}
								threshold={100}
							/>
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	)
}
