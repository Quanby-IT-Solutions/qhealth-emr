"use client"

import Link from "next/link"

import { AlertTriangle } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import {
	isMaternalDeathCandidate,
	isNeonatalDeathCandidate,
	useDeathReportStatusQuery,
} from "@/features/death-reporting/api/death-reporting.hooks"

// ============================================================================
// Props
// ============================================================================

interface DeathReportModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	encounterId: string
	patientId: string
	patientSex: string
	patientDateOfBirth: string
}

// ============================================================================
// Component
// ============================================================================

export function DeathReportModal({
	open,
	onOpenChange,
	encounterId,
	patientId,
	patientSex,
	patientDateOfBirth,
}: DeathReportModalProps) {
	const { data: status } = useDeathReportStatusQuery(encounterId)

	const needsFmdrf = isMaternalDeathCandidate(patientSex, patientDateOfBirth)
	const needsFndrf = isNeonatalDeathCandidate(patientDateOfBirth)

	const fmdrfDone = status?.hasFmdrf ?? false
	const fndrfDone = status?.hasFndrf ?? false

	const allDone = (!needsFmdrf || fmdrfDone) && (!needsFndrf || fndrfDone)

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<div className="flex items-center gap-2">
						<AlertTriangle className="size-5 text-destructive" />
						<DialogTitle>Death Reporting Required</DialogTitle>
					</div>
					<DialogDescription>
						Discharge cannot be saved until the required death review form(s) are
						completed and submitted.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3 py-2">
					{needsFmdrf && (
						<div className="flex items-center justify-between rounded-md border p-3">
							<div>
								<p className="text-sm font-medium">FMDRF</p>
								<p className="text-xs text-muted-foreground">
									Facility Maternal Death Review Form
								</p>
							</div>
							{fmdrfDone ? (
								<Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
									Completed
								</Badge>
							) : (
								<Button
									size="sm"
									variant="destructive"
									nativeButton={false}
									render={
										<Link
											href={`/patients/${patientId}/encounters/${encounterId}/death-report?type=fmdrf`}
											onClick={() => onOpenChange(false)}
										/>
									}
								>
									Complete
								</Button>
							)}
						</div>
					)}

					{needsFndrf && (
						<div className="flex items-center justify-between rounded-md border p-3">
							<div>
								<p className="text-sm font-medium">FNDRF</p>
								<p className="text-xs text-muted-foreground">
									Facility Neonatal Death Review Form
								</p>
							</div>
							{fndrfDone ? (
								<Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
									Completed
								</Badge>
							) : (
								<Button
									size="sm"
									variant="destructive"
									nativeButton={false}
									render={
										<Link
											href={`/patients/${patientId}/encounters/${encounterId}/death-report?type=fndrf`}
											onClick={() => onOpenChange(false)}
										/>
									}
								>
									Complete
								</Button>
							)}
						</div>
					)}

					{!needsFmdrf && !needsFndrf && (
						<p className="text-center text-sm text-muted-foreground">
							This patient does not require additional death reporting.
						</p>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Dismiss
					</Button>
					{allDone && (
						<p className="text-xs text-muted-foreground self-center">
							All required forms completed — you may now proceed with discharge.
						</p>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
