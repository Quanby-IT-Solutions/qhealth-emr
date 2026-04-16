"use client"

import { AlertCircle, CheckCircle2, FlaskConical, Loader2, Pill, Stethoscope } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Progress } from "@/core/components/ui/progress"
import { Separator } from "@/core/components/ui/separator"

import { useKonsultaBenefitQuery, useRecordKonsultaVisitMutation } from "../api/billing.hooks"

interface KonsultaTrackerProps {
	encounterId: string
	facilityId: string
	patientId: string
}

interface BenefitRowProps {
	icon: React.ReactNode
	label: string
	used: number
	allowed: number
}

function BenefitRow({ icon, label, used, allowed }: BenefitRowProps) {
	const pct = allowed > 0 ? (used / allowed) * 100 : 0
	const isExhausted = used >= allowed

	return (
		<div className="space-y-1.5">
			<div className="flex items-center justify-between text-sm">
				<span className="flex items-center gap-1.5">
					{icon}
					{label}
				</span>
				<span className={isExhausted ? "font-medium text-red-600" : "font-medium"}>
					{used} / {allowed}
					{isExhausted && (
						<AlertCircle className="ml-1 inline size-3.5 text-red-600" />
					)}
				</span>
			</div>
			<Progress
				value={pct}
				className={isExhausted ? "bg-red-100" : undefined}
			/>
		</div>
	)
}

export function KonsultaTracker({ encounterId, facilityId, patientId }: KonsultaTrackerProps) {
	const { data: benefit, isLoading } = useKonsultaBenefitQuery({ facilityId, patientId })
	const recordVisit = useRecordKonsultaVisitMutation()

	if (isLoading) {
		return (
			<Card>
				<CardContent className="flex h-32 items-center justify-center">
					<Loader2 className="size-5 animate-spin text-muted-foreground" />
				</CardContent>
			</Card>
		)
	}

	if (!benefit) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Konsulta Capitation Benefit</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						No active Konsulta benefit found for this patient. Patient must be enrolled
						in PhilHealth's Konsulta program with an accredited primary care facility.
					</p>
				</CardContent>
			</Card>
		)
	}

	const statusVariant =
		benefit.status === "active"
			? ("default" as const)
			: benefit.status === "exhausted"
				? ("destructive" as const)
				: ("secondary" as const)

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<div>
					<CardTitle>Konsulta Capitation Benefit</CardTitle>
					<p className="text-muted-foreground mt-1 text-sm">
						Benefit period:{" "}
						{new Date(benefit.benefitPeriodStart).toLocaleDateString("en-PH")} –{" "}
						{new Date(benefit.benefitPeriodEnd).toLocaleDateString("en-PH")}
					</p>
				</div>
				<Badge variant={statusVariant}>
					{benefit.status === "active" && <CheckCircle2 className="mr-1 size-3" />}
					{benefit.status}
				</Badge>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="text-sm text-muted-foreground">
					PhilHealth Member ID:{" "}
					<span className="font-medium text-foreground">{benefit.philhealthMemberId}</span>
					{" · "}
					Benefit Year:{" "}
					<span className="font-medium text-foreground">{benefit.benefitYear}</span>
				</div>

				<Separator />

				<div className="space-y-4">
					<BenefitRow
						icon={<Stethoscope className="size-4 text-muted-foreground" />}
						label="Consultations"
						used={benefit.consultationsUsed}
						allowed={benefit.consultationsAllowed}
					/>
					<BenefitRow
						icon={<Pill className="size-4 text-muted-foreground" />}
						label="Medications"
						used={benefit.medicationsUsed}
						allowed={benefit.medicationsAllowed}
					/>
					<BenefitRow
						icon={<FlaskConical className="size-4 text-muted-foreground" />}
						label="Laboratory Packages"
						used={benefit.labUsed}
						allowed={benefit.labAllowed}
					/>
				</div>

				{benefit.status === "active" && (
					<>
						<Separator />
						<div>
							<p className="mb-2 text-sm font-medium">Record Visit Against Konsulta</p>
							<div className="flex flex-wrap gap-2">
								{(
									[
										{ type: "consultation" as const, label: "Consultation", icon: Stethoscope },
										{ type: "medication" as const, label: "Medication", icon: Pill },
										{ type: "laboratory" as const, label: "Lab Package", icon: FlaskConical },
									] as const
								).map(({ type, label, icon: Icon }) => (
									<Button
										key={type}
										size="sm"
										variant="outline"
										disabled={recordVisit.isPending}
										onClick={() =>
											recordVisit.mutate({
												facilityId,
												patientId,
												encounterId,
												visitType: type,
											})
										}
									>
										<Icon className="mr-1.5 size-3.5" />
										Record {label}
									</Button>
								))}
							</div>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	)
}
