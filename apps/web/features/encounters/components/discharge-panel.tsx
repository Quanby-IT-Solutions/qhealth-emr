"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Label } from "@/core/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import {
	useCloseEncounterMutation,
	useDischargeChecklistQuery,
	useDischargeEncounterMutation,
} from "@/features/encounters/api/encounters.hooks"

function checklistStatusColor(status: string) {
	switch (status) {
		case "complete":
			return "default" as const
		case "incomplete":
			return "secondary" as const
		case "not_applicable":
			return "outline" as const
		default:
			return "outline" as const
	}
}

interface DischargePanelProps {
	encounterId: string
	encounterType: string
	patientId: string
}

export function DischargePanel({ encounterId, encounterType, patientId }: DischargePanelProps) {
	const router = useRouter()
	const { data: checklist, isLoading: checklistLoading } = useDischargeChecklistQuery(encounterId)
	const discharge = useDischargeEncounterMutation()
	const close = useCloseEncounterMutation()

	const [disposition, setDisposition] = useState("")

	const isOutpatient = encounterType === "outpatient"

	const handleDischarge = async () => {
		if (isOutpatient) {
			await close.mutateAsync({ encounterId })
		} else {
			if (!disposition) return
			await discharge.mutateAsync({
				encounterId,
				disposition: disposition as "home" | "transfer" | "deceased" | "ama",
			})
		}
		router.push(`/patients/${patientId}`)
	}

	return (
		<div className="space-y-4">
			{/* Checklist */}
			<Card>
				<CardHeader>
					<CardTitle>
						{isOutpatient ? "Close Checklist" : "Discharge Checklist"}
					</CardTitle>
				</CardHeader>
				<CardContent>
					{checklistLoading ? (
						<div className="text-muted-foreground py-4 text-sm">Loading checklist…</div>
					) : checklist ? (
						<div className="space-y-2">
							{checklist.items.map(item => (
								<div
									key={item.key}
									className="flex items-center justify-between rounded-md border p-3"
								>
									<div>
										<div className="text-sm font-medium">{item.label}</div>
										<div className="text-muted-foreground text-xs capitalize">
											{item.category} — {item.responsibleRole}
										</div>
									</div>
									<Badge variant={checklistStatusColor(item.status)}>
										{item.status.replace("_", " ")}
									</Badge>
								</div>
							))}
							{checklist.allComplete && (
								<p className="text-sm text-green-600 dark:text-green-400">
									All checklist items complete.
								</p>
							)}
						</div>
					) : null}
				</CardContent>
			</Card>

			{/* Discharge / Close action */}
			<Card>
				<CardHeader>
					<CardTitle>{isOutpatient ? "Close Encounter" : "Discharge Patient"}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{!isOutpatient && (
						<div className="space-y-1.5">
							<Label>Disposition *</Label>
							<Select value={disposition} onValueChange={v => setDisposition(v ?? "")}>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="home">Discharged to Home</SelectItem>
									<SelectItem value="transfer">Transferred to Another Facility</SelectItem>
									<SelectItem value="deceased">Deceased</SelectItem>
									<SelectItem value="ama">Against Medical Advice</SelectItem>
								</SelectContent>
							</Select>
						</div>
					)}

					<Button
						onClick={handleDischarge}
						disabled={
							!checklist?.allComplete ||
							(!isOutpatient && !disposition) ||
							discharge.isPending ||
							close.isPending
						}
						variant={isOutpatient ? "default" : "destructive"}
					>
						{discharge.isPending || close.isPending
							? "Processing…"
							: isOutpatient
								? "Close Encounter"
								: "Confirm Discharge"}
					</Button>
				</CardContent>
			</Card>
		</div>
	)
}
