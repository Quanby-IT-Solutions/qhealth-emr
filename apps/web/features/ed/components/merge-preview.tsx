"use client"

import { CheckCircle2 } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"
import { acuityColor, acuityLabel } from "@/features/ed/lib/acuity-utils"

interface RecordCounts {
	vitalSigns: number
	clinicalNotes: number
	medicationOrders: number
	marEntries: number
	labOrders: number
	imagingOrders: number
	tarEntries: number
	ioEntries: number
}

interface PreEncounterInfo {
	traumaAlias: string
	triageAcuityLevel: number | null
	triageAcuityScale: string | null
	triageStaffName: string | null
}

interface MergePreviewProps {
	patientName: string
	patientMrn: string
	preEncounter: PreEncounterInfo
	clinicalRecordCounts: RecordCounts
}

interface RecordRow {
	label: string
	key: keyof RecordCounts
}

const RECORD_ROWS: RecordRow[] = [
	{ label: "Vital Signs", key: "vitalSigns" },
	{ label: "Clinical Notes", key: "clinicalNotes" },
	{ label: "Medication Orders", key: "medicationOrders" },
	{ label: "MAR Entries", key: "marEntries" },
	{ label: "Lab Orders", key: "labOrders" },
	{ label: "Imaging Orders", key: "imagingOrders" },
	{ label: "TAR Entries", key: "tarEntries" },
	{ label: "I/O Entries", key: "ioEntries" },
]

/**
 * Side-by-side data reconciliation preview before confirming a Trauma Alias → MRN merge.
 */
export function MergePreview({
	patientName,
	patientMrn,
	preEncounter,
	clinicalRecordCounts,
}: MergePreviewProps) {
	const totalRecords = Object.values(clinicalRecordCounts).reduce((a, b) => a + b, 0)

	return (
		<div className="space-y-4">
			{/* Side-by-side patient vs pre-encounter */}
			<div className="grid grid-cols-2 gap-4">
				{/* Registered Patient */}
				<Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm text-blue-700 dark:text-blue-400">
							Registered Patient
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-1 text-sm">
						<p className="font-semibold">{patientName}</p>
						<p className="text-muted-foreground">MRN: {patientMrn}</p>
					</CardContent>
				</Card>

				{/* Pre-Encounter (Trauma Alias) */}
				<Card className="border-orange-200 bg-orange-50/50 dark:border-orange-900/50 dark:bg-orange-950/20">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm text-orange-700 dark:text-orange-400">
							Pre-Encounter (Trauma Alias)
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-1.5 text-sm">
						<p className="font-semibold">{preEncounter.traumaAlias}</p>
						{preEncounter.triageAcuityLevel !== null && (
							<div className="flex items-center gap-1.5">
								<Badge className={`text-xs ${acuityColor(preEncounter.triageAcuityLevel)}`}>
									{preEncounter.triageAcuityLevel}
								</Badge>
								<span className="text-muted-foreground text-xs">
									{acuityLabel(preEncounter.triageAcuityLevel)}
									{preEncounter.triageAcuityScale && (
										<> ({preEncounter.triageAcuityScale.toUpperCase()})</>
									)}
								</span>
							</div>
						)}
						{preEncounter.triageStaffName && (
							<p className="text-muted-foreground text-xs">
								Triage: {preEncounter.triageStaffName}
							</p>
						)}
					</CardContent>
				</Card>
			</div>

			<Separator />

			{/* Clinical records to be transferred */}
			<div>
				<p className="mb-2 text-sm font-medium">
					Clinical Records to Transfer{" "}
					<Badge variant="secondary" className="ml-1">
						{totalRecords} total
					</Badge>
				</p>
				<div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
					{RECORD_ROWS.map(row => {
						const count = clinicalRecordCounts[row.key]
						return (
							<div key={row.key} className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">{row.label}</span>
								<div className="flex items-center gap-1">
									{count > 0 && (
										<CheckCircle2 className="size-3 text-green-500" />
									)}
									<Badge variant={count > 0 ? "default" : "secondary"} className="min-w-[1.75rem] justify-center text-xs">
										{count}
									</Badge>
								</div>
							</div>
						)
					})}
				</div>
			</div>

			{totalRecords === 0 && (
				<p className="text-muted-foreground text-sm">
					No clinical records will be transferred (pre-encounter has no recorded data yet).
				</p>
			)}
		</div>
	)
}
