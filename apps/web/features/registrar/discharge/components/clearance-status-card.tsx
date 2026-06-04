"use client"

import { Badge } from "@/core/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"

interface ClearanceStatus {
	pharmacyCleared: boolean
	pharmacyClearedAt: string | null
	nursingCleared: boolean
	nursingClearedAt: string | null
	billingSignedOff: boolean
	billingSignedOffAt: string | null
	allConfirmed: boolean
}

function formatDatetime(value: string | null) {
	if (!value) return null
	return new Date(value).toLocaleString("en-PH", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

function ClearanceRow({
	label,
	cleared,
	clearedAt,
}: {
	label: string
	cleared: boolean
	clearedAt: string | null
}) {
	return (
		<div className="flex items-center justify-between py-2">
			<span className="text-sm font-medium">{label}</span>
			<div className="flex items-center gap-2">
				{clearedAt && (
					<span className="text-muted-foreground text-xs">{formatDatetime(clearedAt)}</span>
				)}
				<Badge variant={cleared ? "default" : "secondary"}>{cleared ? "Cleared" : "Pending"}</Badge>
			</div>
		</div>
	)
}

export function ClearanceStatusCard({ status }: { status: ClearanceStatus }) {
	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-base">Discharge Clearances</CardTitle>
			</CardHeader>
			<CardContent className="divide-y">
				<ClearanceRow
					label="Pharmacy Clearance"
					cleared={status.pharmacyCleared}
					clearedAt={status.pharmacyClearedAt}
				/>
				<ClearanceRow
					label="Nurse Ward Clearance"
					cleared={status.nursingCleared}
					clearedAt={status.nursingClearedAt}
				/>
				<ClearanceRow
					label="Billing Sign-Off"
					cleared={status.billingSignedOff}
					clearedAt={status.billingSignedOffAt}
				/>
				{status.allConfirmed && (
					<div className="pt-3">
						<Badge className="w-full justify-center">All Clearances Confirmed</Badge>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
